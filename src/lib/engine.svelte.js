// ============================================================
// SONATA ELITE — DUAL PLAYBACK ENGINE
// YouTube IFrame + hidden HTML5 <audio> for the offline vault,
// sharing one set of transport controls. Every transport action
// branches on the current track's type, exactly like the
// original single-file build.
// ============================================================
import {
  lib, player, ui, sleep, eq,
  currentTrack, isCurrentTrackLocal, getFilteredTrackSubset,
  recordRecentlyPlayed, persistTracks, persistEq, toast, SPEED_STEPS
} from './stores/app.svelte.js';
import { idbGetAudio } from './services/idb.js';
import { syncToCloud } from './services/cloud.js';

export const LOCAL_ART_DATA_URI = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6366f1"/><stop offset="1" stop-color="#a855f7"/></linearGradient></defs><rect width="640" height="640" fill="url(#g)"/><text x="50%" y="57%" font-size="230" text-anchor="middle" fill="rgba(255,255,255,0.92)" font-family="Arial">&#9834;</text></svg>'
);

let ytPlayer = null;
let localAudio = null;      // bound <audio> element, registered by App.svelte
let tickerInterval = null;
let sleepTimerHandle = null;

// --- YOUTUBE IFRAME API ---
export function loadYouTubeApi() {
  if (window.YT && window.YT.Player) { player.ytApiReady = true; return; }
  window.onYouTubeIframeAPIReady = () => { player.ytApiReady = true; };
  const tag = document.createElement('script');
  tag.src = 'https://www.youtube.com/iframe_api';
  document.head.appendChild(tag);
}

// --- LOCAL AUDIO ENGINE ---
export function registerLocalAudio(el) {
  localAudio = el;
  el.addEventListener('ended', () => { if (isCurrentTrackLocal()) handleTrackFinishedPlaying(); });
  el.addEventListener('play', () => { if (isCurrentTrackLocal()) syncTransportUiPlaying(true); });
  el.addEventListener('pause', () => { if (isCurrentTrackLocal() && !el.ended) syncTransportUiPlaying(false); });
  el.addEventListener('error', () => { if (isCurrentTrackLocal()) toast('Offline audio failed to load'); });
}
export function getLocalAudio() {
  return localAudio;
}

// One place to flip every play/pause surface (dock, wave, Now Playing,
// media session) so the two engines can't drift out of sync.
function syncTransportUiPlaying(isPlaying) {
  player.isPlaying = isPlaying;
  updateMediaSessionPlaybackState(isPlaying ? 'playing' : 'paused');
}

// ================================================================
// EQUALIZER — Web Audio 5-band EQ on the offline vault engine.
// YouTube's IFrame audio is cross-origin sealed and can't be routed
// through Web Audio, so the EQ honestly applies to local tracks only.
// The graph is built lazily on first use (AudioContext needs a user
// gesture) and a MediaElementSource can only ever be created once
// per element, so both live behind ensureEqGraph().
// ================================================================
export const EQ_FREQUENCIES = [60, 230, 910, 3600, 14000];
export const EQ_PRESETS = {
  flat:       [0, 0, 0, 0, 0],
  bass:       [7, 5, 1, 0, 1],
  vocal:      [-2, 1, 5, 4, 0],
  treble:     [0, 0, 1, 5, 7],
  electronic: [6, 2, -1, 3, 5],
  rock:       [5, 3, -1, 2, 4]
};

let eqAudioCtx = null;
let eqFilterNodes = null;
export let eqAnalyserNode = null;
export function getAnalyser() { return eqAnalyserNode; }

export function ensureEqGraph() {
  if (!localAudio) return false;
  try {
    if (!eqAudioCtx) {
      eqAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const source = eqAudioCtx.createMediaElementSource(localAudio);
      eqFilterNodes = EQ_FREQUENCIES.map((freq, i) => {
        const f = eqAudioCtx.createBiquadFilter();
        f.type = i === 0 ? 'lowshelf' : i === EQ_FREQUENCIES.length - 1 ? 'highshelf' : 'peaking';
        f.frequency.value = freq;
        if (f.type === 'peaking') f.Q.value = 1;
        f.gain.value = 0;
        return f;
      });
      source.connect(eqFilterNodes[0]);
      for (let i = 0; i < eqFilterNodes.length - 1; i++) {
        eqFilterNodes[i].connect(eqFilterNodes[i + 1]);
      }
      // Analyser taps the post-EQ signal for the live cover visualizer,
      // so the wave shows exactly what the listener hears.
      eqAnalyserNode = eqAudioCtx.createAnalyser();
      eqAnalyserNode.fftSize = 128;
      eqAnalyserNode.smoothingTimeConstant = 0.82;
      eqFilterNodes[eqFilterNodes.length - 1].connect(eqAnalyserNode);
      eqAnalyserNode.connect(eqAudioCtx.destination);
    }
    if (eqAudioCtx.state === 'suspended') eqAudioCtx.resume();
    return true;
  } catch (err) {
    console.error('EQ graph failed:', err);
    return false;
  }
}

export function applyEqGains() {
  if (!eqFilterNodes) return;
  eqFilterNodes.forEach((f, i) => { f.gain.value = eq.enabled ? eq.gains[i] : 0; });
}

export function toggleEqualizer() {
  eq.enabled = !eq.enabled;
  if (eq.enabled && !ensureEqGraph()) {
    eq.enabled = false;
    toast('Equalizer unavailable on this browser');
    return;
  }
  applyEqGains();
  persistEq();
  toast(eq.enabled ? 'Equalizer on' : 'Equalizer off');
}

export function setEqBand(bandIdx, db) {
  eq.gains[bandIdx] = db;
  // Nudging a slider while off implies intent — switch on automatically.
  if (!eq.enabled && ensureEqGraph()) eq.enabled = true;
  applyEqGains();
  persistEq();
}

export function applyEqPreset(name) {
  const preset = EQ_PRESETS[name];
  if (!preset) return;
  eq.gains = [...preset];
  if (!eq.enabled && ensureEqGraph()) eq.enabled = true;
  applyEqGains();
  persistEq();
  toast(`EQ preset: ${name === 'flat' ? 'Flat' : name.charAt(0).toUpperCase() + name.slice(1)}`);
}

export function detectActiveEqPreset() {
  for (const [name, vals] of Object.entries(EQ_PRESETS)) {
    if (vals.every((v, i) => v === eq.gains[i])) return name;
  }
  return null;
}

// --- MEDIA SESSION: powers Sonata's player in the OS notification / lock screen ---
// Best supported on Android Chrome; iOS Safari support is more limited.
export function setupMediaSessionHandlers() {
  if (!('mediaSession' in navigator)) return;

  navigator.mediaSession.setActionHandler('play', () => {
    if (isCurrentTrackLocal()) { if (localAudio && localAudio.src) localAudio.play().catch(() => {}); return; }
    if (ytPlayer) ytPlayer.playVideo();
  });
  navigator.mediaSession.setActionHandler('pause', () => {
    if (isCurrentTrackLocal()) { if (localAudio) localAudio.pause(); return; }
    if (ytPlayer) ytPlayer.pauseVideo();
  });
  navigator.mediaSession.setActionHandler('previoustrack', executePrevTrack);
  navigator.mediaSession.setActionHandler('nexttrack', executeNextTrack);

  try {
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (typeof details.seekTime !== 'number') return;
      if (isCurrentTrackLocal()) { if (localAudio) localAudio.currentTime = details.seekTime; return; }
      if (ytPlayer && ytPlayer.seekTo) ytPlayer.seekTo(details.seekTime, true);
    });
    navigator.mediaSession.setActionHandler('seekbackward', (details) => {
      const step = details.seekOffset || 10;
      if (isCurrentTrackLocal()) { if (localAudio) localAudio.currentTime = Math.max(localAudio.currentTime - step, 0); return; }
      if (ytPlayer && ytPlayer.getCurrentTime) {
        ytPlayer.seekTo(Math.max(ytPlayer.getCurrentTime() - step, 0), true);
      }
    });
    navigator.mediaSession.setActionHandler('seekforward', (details) => {
      const step = details.seekOffset || 10;
      if (isCurrentTrackLocal()) { if (localAudio && localAudio.duration) localAudio.currentTime = Math.min(localAudio.currentTime + step, localAudio.duration); return; }
      if (ytPlayer && ytPlayer.getCurrentTime && ytPlayer.getDuration) {
        ytPlayer.seekTo(Math.min(ytPlayer.getCurrentTime() + step, ytPlayer.getDuration()), true);
      }
    });
    // "Stop" from the notification fully ends the session.
    navigator.mediaSession.setActionHandler('stop', () => {
      if (ytPlayer && ytPlayer.stopVideo) ytPlayer.stopVideo();
      if (localAudio) localAudio.pause();
      updateMediaSessionPlaybackState('none');
    });
  } catch (err) {
    console.warn('Some Media Session seek actions are unsupported on this browser:', err);
  }
}

export function updateMediaSessionMetadata(track) {
  if (!('mediaSession' in navigator) || !track) return;
  if (track.type === 'local') {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: 'Sonata',
      album: 'Offline Vault',
      artwork: [{ src: LOCAL_ART_DATA_URI, sizes: '640x640', type: 'image/svg+xml' }]
    });
    return;
  }
  navigator.mediaSession.metadata = new MediaMetadata({
    title: track.title,
    artist: 'Sonata',
    album: 'YouTube Stream',
    artwork: [
      { src: `https://img.youtube.com/vi/${track.id}/mqdefault.jpg`, sizes: '320x180', type: 'image/jpeg' },
      { src: `https://img.youtube.com/vi/${track.id}/hqdefault.jpg`, sizes: '480x360', type: 'image/jpeg' },
      { src: `https://img.youtube.com/vi/${track.id}/maxresdefault.jpg`, sizes: '1280x720', type: 'image/jpeg' }
    ]
  });
}

function updateMediaSessionPlaybackState(state) {
  if (!('mediaSession' in navigator)) return;
  navigator.mediaSession.playbackState = state;
}

// --- SHUFFLE / REPEAT QUEUE MATH ---

// Builds a randomized traversal order over the current queue. The
// currently-playing track (if any) is pinned to the front so turning
// shuffle on mid-playback doesn't yank you to a different song.
export function rebuildShuffleOrder() {
  const order = player.queue.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  if (player.pointer > -1) {
    const curPos = order.indexOf(player.pointer);
    if (curPos > -1) {
      order.splice(curPos, 1);
      order.unshift(player.pointer);
    }
  }
  player.shuffleOrder = order;
}

// Resolves the queue index to play next/previous, honoring shuffle order.
// `wrapAlways=true` is for manual prev/next taps (always cycle);
// `wrapAlways=false` is for auto-advance on track end, where a finished
// queue with repeat off should stop instead of looping.
export function computeAdjacentIndex(direction, wrapAlways) {
  if (player.queue.length === 0) return -1;

  if (player.shuffle) {
    if (player.shuffleOrder.length !== player.queue.length) rebuildShuffleOrder();
    let pos = player.shuffleOrder.indexOf(player.pointer);
    if (pos === -1) pos = 0;
    pos += direction;
    if (pos < 0) pos = player.shuffleOrder.length - 1;
    if (pos >= player.shuffleOrder.length) {
      if (wrapAlways || player.repeat === 'all') {
        rebuildShuffleOrder();
        pos = 0;
      } else {
        return -1;
      }
    }
    return player.shuffleOrder[pos];
  }

  let idx = player.pointer + direction;
  if (idx < 0) idx = player.queue.length - 1;
  if (idx >= player.queue.length) {
    if (wrapAlways || player.repeat === 'all') {
      idx = 0;
    } else {
      return -1;
    }
  }
  return idx;
}

export function toggleShuffle() {
  player.shuffle = !player.shuffle;
  localStorage.setItem('sonata_shuffle', player.shuffle ? '1' : '0');
  if (player.shuffle) rebuildShuffleOrder();
  toast(player.shuffle ? 'Shuffle on' : 'Shuffle off');
}

export function cycleRepeatMode() {
  player.repeat = player.repeat === 'off' ? 'all' : player.repeat === 'all' ? 'one' : 'off';
  localStorage.setItem('sonata_repeat', player.repeat);
  const labels = { off: 'Repeat off', all: 'Repeat all', one: 'Repeat one song' };
  toast(labels[player.repeat]);
}

// --- CORE PLAYBACK PIPELINE ---
export function executeAudioStreamPipeline(track) {
  if (!track) return;
  clearInterval(tickerInterval);
  recordRecentlyPlayed(track.id);
  player.isPlaying = true;

  updateMediaSessionMetadata(track);
  updateMediaSessionPlaybackState('playing');

  if (track.type === 'local') {
    if (ytPlayer && ytPlayer.stopVideo) { try { ytPlayer.stopVideo(); } catch {} }
    bootstrapLocalAudioPlayback(track.id);
    initTrackTimelineTicker();
  } else {
    if (localAudio && !localAudio.paused) localAudio.pause();
    bootstrapYoutubeIframePlayer(track.id);
  }
}

async function bootstrapLocalAudioPlayback(trackId) {
  if (!localAudio) return;
  // Must run before the first await: AudioContext creation/resume only
  // succeeds inside a user gesture's synchronous call stack.
  ensureEqGraph();
  try {
    const blob = await idbGetAudio(trackId);
    if (!blob) { toast('Offline audio missing from vault'); return; }
    if (localAudio.dataset.objectUrl) URL.revokeObjectURL(localAudio.dataset.objectUrl);
    const url = URL.createObjectURL(blob);
    localAudio.dataset.objectUrl = url;
    localAudio.src = url;
    localAudio.playbackRate = player.speed || 1;
    localAudio.volume = player.volume / 100;
    applyEqGains();
    localAudio.play().catch(() => {});
  } catch (err) {
    console.error(err);
    toast('Could not open offline audio');
  }
}

function bootstrapYoutubeIframePlayer(videoId) {
  if (!player.ytApiReady) { toast('Awaiting Streaming Core...'); return; }
  if (ytPlayer) {
    ytPlayer.loadVideoById(videoId);
    if (ytPlayer.setVolume) ytPlayer.setVolume(player.volume);
  } else {
    ytPlayer = new YT.Player('iframe-target', {
      height: '100%',
      width: '100%',
      videoId,
      playerVars: { autoplay: 1, controls: 0, disablekb: 1, fs: 0, modestbranding: 1, rel: 0 },
      events: {
        onReady: (e) => {
          e.target.setVolume(player.volume);
          e.target.playVideo();
        },
        onStateChange: handleYoutubeStateTransitions
      }
    });
  }
  initTrackTimelineTicker();
}

function handleYoutubeStateTransitions(event) {
  if (event.data === YT.PlayerState.PLAYING) {
    if (ytPlayer.setPlaybackRate && ytPlayer.getPlaybackRate && ytPlayer.getPlaybackRate() !== player.speed) {
      ytPlayer.setPlaybackRate(player.speed);
    }
    // Fresh URL-added tracks carry a "Fetching..." placeholder title until
    // the IFrame hands over the video's real title on first play.
    const realTitle = ytPlayer.getVideoData().title;
    const cur = currentTrack();
    if (realTitle && cur && cur.title.includes('Fetching')) {
      cur.title = realTitle;
      const libMatch = lib.tracks.find((t) => t.id === cur.id);
      if (libMatch) {
        libMatch.title = realTitle;
        persistTracks();
        syncToCloud((cloud) => cloud.updateTrackTitle(libMatch.id, realTitle));
      }
      updateMediaSessionMetadata(cur);
    }
  }

  if (event.data === YT.PlayerState.PLAYING || event.data === YT.PlayerState.PAUSED) {
    syncTransportUiPlaying(event.data === YT.PlayerState.PLAYING);
  }

  if (event.data === YT.PlayerState.ENDED) handleTrackFinishedPlaying();
}

export function handleTrackFinishedPlaying() {
  if (sleep.mode === 'end') {
    clearSleepTimer(false);
    stopPlaybackAtQueueEnd();
    if (sleep.autoClose) {
      executeSleepAutoClose();
    } else {
      toast('Sleep timer ended — playback paused');
    }
    return;
  }
  if (player.repeat === 'one') {
    if (isCurrentTrackLocal()) {
      if (localAudio) { localAudio.currentTime = 0; localAudio.play().catch(() => {}); }
      return;
    }
    if (ytPlayer) {
      ytPlayer.seekTo(0, true);
      ytPlayer.playVideo();
      return;
    }
  }
  const nextIdx = computeAdjacentIndex(1, /* wrapAlways */ false);
  if (nextIdx === -1) {
    stopPlaybackAtQueueEnd();
    return;
  }
  player.pointer = nextIdx;
  executeAudioStreamPipeline(player.queue[player.pointer]);
}

// Called when the auto-advance chain (queue end, repeat off) runs out
// of tracks — pauses cleanly instead of silently doing nothing.
export function stopPlaybackAtQueueEnd() {
  if (ytPlayer && ytPlayer.pauseVideo) ytPlayer.pauseVideo();
  if (localAudio && !localAudio.paused) localAudio.pause();
  clearInterval(tickerInterval);
  syncTransportUiPlaying(false);
  toast('Queue finished');
}

// --- TIMELINE TICKER: one interval feeds every progress surface reactively ---
function initTrackTimelineTicker() {
  clearInterval(tickerInterval);
  tickerInterval = setInterval(() => {
    let currentTime = 0;
    let duration = 0;

    if (isCurrentTrackLocal()) {
      if (localAudio && localAudio.duration && isFinite(localAudio.duration)) {
        currentTime = localAudio.currentTime;
        duration = localAudio.duration;
      } else { duration = 1; }
    } else if (ytPlayer && ytPlayer.getCurrentTime) {
      currentTime = ytPlayer.getCurrentTime();
      duration = ytPlayer.getDuration() || 1;
    }

    player.currentTime = currentTime;
    player.duration = duration;
    sleep.now = Date.now(); // keeps the sleep countdown label live

    if ('mediaSession' in navigator && navigator.mediaSession.setPositionState && duration > 0) {
      try {
        navigator.mediaSession.setPositionState({
          duration,
          playbackRate: player.speed || 1,
          position: Math.min(currentTime, duration)
        });
      } catch {
        // Some browsers briefly throw if values are out of range mid-seek — safe to ignore.
      }
    }
  }, 350);
}

// --- TRANSPORT ---
export function seekToAudioRatioPosition(ratio) {
  if (isCurrentTrackLocal()) {
    if (localAudio && localAudio.duration && isFinite(localAudio.duration)) localAudio.currentTime = localAudio.duration * ratio;
    return;
  }
  if (ytPlayer && ytPlayer.getDuration) {
    ytPlayer.seekTo(ytPlayer.getDuration() * ratio, true);
  }
}

export function seekFromBarEvent(event) {
  const rect = event.currentTarget.getBoundingClientRect();
  const ratio = (event.clientX - rect.left) / rect.width;
  seekToAudioRatioPosition(ratio);
}

export function togglePlaybackState() {
  if (isCurrentTrackLocal()) {
    if (!localAudio || !localAudio.src) return;
    // UI syncing happens in the engine's play/pause event listeners.
    if (localAudio.paused) localAudio.play().catch(() => {}); else localAudio.pause();
    return;
  }
  if (ytPlayer) {
    if (ytPlayer.getPlayerState() === YT.PlayerState.PLAYING) {
      ytPlayer.pauseVideo();
      syncTransportUiPlaying(false);
    } else {
      ytPlayer.playVideo();
      syncTransportUiPlaying(true);
    }
  }
}

export function executeNextTrack() {
  if (player.queue.length <= 1) return;
  const nextIdx = computeAdjacentIndex(1, /* wrapAlways */ true);
  if (nextIdx === -1) return;
  player.pointer = nextIdx;
  executeAudioStreamPipeline(player.queue[player.pointer]);
}

export function executePrevTrack() {
  if (player.queue.length <= 1) return;
  const prevIdx = computeAdjacentIndex(-1, /* wrapAlways */ true);
  if (prevIdx === -1) return;
  player.pointer = prevIdx;
  executeAudioStreamPipeline(player.queue[player.pointer]);
}

export function bootstrapSelectedTrack(trackId) {
  player.queue = getFilteredTrackSubset();
  player.pointer = player.queue.findIndex((t) => t.id === trackId);
  if (player.shuffle) rebuildShuffleOrder();
  executeAudioStreamPipeline(player.queue[player.pointer]);
}

// "Play All" — queues up everything in the currently viewed tab and starts
// from the top.
export function executePlayAllWorkflow() {
  const subset = getFilteredTrackSubset();
  if (subset.length === 0) {
    toast('Nothing to play here yet');
    return;
  }
  player.queue = subset;
  player.pointer = 0;
  if (player.shuffle) rebuildShuffleOrder();
  executeAudioStreamPipeline(player.queue[player.pointer]);
}

export function jumpToQueueIndex(idx) {
  player.pointer = idx;
  executeAudioStreamPipeline(player.queue[idx]);
}

// Stops everything and empties the queue (used after deleting the playing track).
export function haltAndClearQueue() {
  if (ytPlayer && ytPlayer.stopVideo) ytPlayer.stopVideo();
  if (localAudio) localAudio.pause();
  clearInterval(tickerInterval);
  player.isPlaying = false;
  player.currentTime = 0;
  player.duration = 0;
  player.queue = [];
  player.pointer = -1;
  player.shuffleOrder = [];
  updateMediaSessionPlaybackState('none');
  ui.modals.nowPlaying = false;
}

// --- PLAYBACK SPEED ---
export function cyclePlaybackSpeed() {
  const idx = SPEED_STEPS.indexOf(player.speed);
  player.speed = SPEED_STEPS[(idx + 1) % SPEED_STEPS.length];
  localStorage.setItem('sonata_speed', player.speed);
  if (ytPlayer && ytPlayer.setPlaybackRate) ytPlayer.setPlaybackRate(player.speed);
  if (localAudio) localAudio.playbackRate = player.speed;
  toast(`Speed: ${player.speed}x`);
}

// --- VOLUME ---
export function setPlayerVolume(vol) {
  player.volume = Math.max(0, Math.min(100, vol));
  localStorage.setItem('sonata_volume', player.volume);
  if (ytPlayer && ytPlayer.setVolume) ytPlayer.setVolume(player.volume);
  if (localAudio) localAudio.volume = player.volume / 100;
}

export function toggleMute() {
  if (player.volume > 0) {
    player.lastVolumeBeforeMute = player.volume;
    setPlayerVolume(0);
  } else {
    setPlayerVolume(player.lastVolumeBeforeMute || 70);
  }
}

// --- SLEEP TIMER ---
export function selectSleepTimerOption(rawValue) {
  if (rawValue === 'end') {
    clearSleepTimer(false);
    sleep.mode = 'end';
    toast('Sleep timer: stopping at end of this track');
    ui.modals.sleep = false;
    return;
  }
  startSleepTimerSeconds(parseInt(rawValue, 10) * 60);
}

// Seconds-precise core: presets pass minutes*60, the custom field can
// pass any second count (so 0:05 really fires in exactly 5 seconds).
export function startSleepTimerSeconds(totalSeconds) {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 1) return;
  clearSleepTimer(false);
  sleep.mode = totalSeconds / 60; // keeps preset-button highlighting working (10:00 === the "10 min" pill)
  sleep.endsAt = Date.now() + totalSeconds * 1000;
  sleepTimerHandle = setTimeout(fireSleepTimer, totalSeconds * 1000);
  toast(`Sleep timer set: ${formatSleepCountdown(totalSeconds * 1000)}`);
  ui.modals.sleep = false;
}

// Custom typed duration. Three accepted shapes:
//   "5"      → no leading zero, plain number = MINUTES  (5 = 5 min)
//   "05"     → leading zero = SECONDS                   (05 = 5 sec, 090 = 90 sec)
//   "mm:ss"  → explicit clock format still works        (1:30 = 90 sec)
// Range: 1 second up to 12 hours.
export function parseCustomSleepInput(raw) {
  let totalSeconds = 0;
  const clockMatch = raw.match(/^(\d{1,3}):([0-5]?\d)$/);
  if (clockMatch) {
    totalSeconds = parseInt(clockMatch[1], 10) * 60 + parseInt(clockMatch[2], 10);
  } else if (/^0\d{1,4}$/.test(raw)) {
    totalSeconds = parseInt(raw, 10); // leading zero → seconds
  } else if (/^[1-9]\d{0,2}$/.test(raw)) {
    totalSeconds = parseInt(raw, 10) * 60; // plain number → minutes
  }
  if (!totalSeconds || totalSeconds < 1 || totalSeconds > 720 * 60) return null;
  return totalSeconds;
}

export function toggleSleepAutoClose() {
  sleep.autoClose = !sleep.autoClose;
  localStorage.setItem('sonata_sleep_autoclose', sleep.autoClose ? '1' : '0');
  toast(sleep.autoClose
    ? 'Sonata will close itself when the timer ends'
    : 'Auto-close off — timer will only pause music');
}

export function clearSleepTimer(showToast) {
  if (sleepTimerHandle) {
    clearTimeout(sleepTimerHandle);
    sleepTimerHandle = null;
  }
  sleep.mode = null;
  sleep.endsAt = null;
  if (showToast) toast('Sleep timer off');
}

function fireSleepTimer() {
  if (ytPlayer && ytPlayer.pauseVideo) ytPlayer.pauseVideo();
  if (localAudio && !localAudio.paused) localAudio.pause();
  clearSleepTimer(false);
  syncTransportUiPlaying(false);
  if (sleep.autoClose) {
    executeSleepAutoClose();
  } else {
    toast('Sleep timer ended — playback paused');
  }
}

// Attempts to shut the app window after the timer fires. window.close()
// is only honored by the browser in certain contexts (installed PWA
// windows on Android usually allow it; a regular browser tab usually
// doesn't). Playback is fully stopped first, so even when the close is
// refused the outcome is still "music off".
function executeSleepAutoClose() {
  try { if (ytPlayer && ytPlayer.stopVideo) ytPlayer.stopVideo(); } catch {}
  if (localAudio) { localAudio.pause(); localAudio.removeAttribute('src'); }
  updateMediaSessionPlaybackState('none');
  toast('Sleep timer done — closing Sonata…');
  setTimeout(() => {
    window.close();
    // Only runs if the browser refused to close the window.
    setTimeout(() => {
      toast('Browser blocked auto-close — playback stopped instead');
    }, 700);
  }, 1200);
}

export function formatSleepCountdown(msLeft) {
  const totalSec = Math.max(Math.ceil(msLeft / 1000), 0);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`;
  return `${s}s`;
}

// Standardized helpers
export function formatTimeStrings(seconds) {
  if (isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}
