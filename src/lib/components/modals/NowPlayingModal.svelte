<script>
  import { ui, player, sleep, eq, currentTrack, isCurrentTrackLocal } from '../../stores/app.svelte.js';
  import {
    togglePlaybackState, executeNextTrack, executePrevTrack, seekFromBarEvent,
    formatTimeStrings, toggleShuffle, cycleRepeatMode, cyclePlaybackSpeed,
    setPlayerVolume, toggleMute, getAnalyser, getLocalAudio
  } from '../../engine.svelte.js';

  const track = $derived(currentTrack());
  const isLocal = $derived(track?.type === 'local');
  const progressPct = $derived(player.duration > 0 ? (player.currentTime / player.duration) * 100 : 0);

  let artSrc = $state('');
  $effect(() => {
    if (track && !isLocal) artSrc = `https://img.youtube.com/vi/${track.id}/maxresdefault.jpg`;
  });
  function onArtError() {
    // maxres isn't rendered for every video — fall back to hqdefault once.
    if (artSrc.includes('maxresdefault')) artSrc = artSrc.replace('maxresdefault', 'hqdefault');
  }

  // ---- LIVE WAVE COVER (offline tracks) ----
  // Replaces the static offline cover with the track's real spectrum:
  // mirrored rounded bars fed by the analyser, colored from the live
  // CSS accent so every theme (light/dark/OLED/emerald) matches itself.
  let canvasEl = $state(null);
  let rafId = null;

  function readWaveThemeColors() {
    const styles = getComputedStyle(document.documentElement);
    const accent = (styles.getPropertyValue('--accent-rgb') || '99, 102, 241').trim();
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    return { accent, isLight };
  }

  function drawFrame() {
    rafId = null;
    const canvas = canvasEl;
    if (!canvas || !ui.modals.nowPlaying || !isCurrentTrackLocal()) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const { accent, isLight } = readWaveThemeColors();
    const la = getLocalAudio();
    const playing = la && !la.paused;
    const analyser = getAnalyser();

    const barCount = 28;
    const gap = 3;
    const barW = (w - gap * (barCount + 1)) / barCount;
    const mid = h / 2;
    let levels;

    if (analyser && playing) {
      const bins = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(bins);
      // Center-out mapping: the middle bars carry the lowest frequencies
      // (the beat), rising symmetrically to the highs at both edges —
      // so every kick visibly blooms from the center outward.
      const half = (barCount - 1) / 2;
      levels = Array.from({ length: barCount }, (_, i) => {
        const dist = Math.abs(i - half) / half; // 0 at center → 1 at edges
        const v = bins[Math.floor(dist * bins.length * 0.72)] / 255;
        return Math.max(v * v, 0.04); // perceptual curve, tiny floor
      });
    } else {
      // Idle/paused: a calm ripple radiating from the center outward
      const t = Date.now() / 900;
      const half = (barCount - 1) / 2;
      levels = Array.from({ length: barCount }, (_, i) => {
        const dist = Math.abs(i - half);
        return 0.05 + 0.045 * Math.abs(Math.sin(t - dist * 0.5));
      });
    }

    ctx.lineCap = 'round';
    for (let i = 0; i < barCount; i++) {
      const x = gap + i * (barW + gap) + barW / 2;
      const len = Math.max(levels[i] * (h * 0.42), 2);
      const grad = ctx.createLinearGradient(0, mid - len, 0, mid + len);
      grad.addColorStop(0, `rgba(${accent}, ${isLight ? 0.9 : 1})`);
      grad.addColorStop(0.5, `rgba(${accent}, ${isLight ? 0.55 : 0.65})`);
      grad.addColorStop(1, `rgba(${accent}, ${isLight ? 0.9 : 1})`);
      ctx.strokeStyle = grad;
      ctx.lineWidth = barW;
      ctx.shadowColor = `rgba(${accent}, ${isLight ? 0.25 : 0.55})`;
      ctx.shadowBlur = playing ? 10 : 4;
      ctx.beginPath();
      ctx.moveTo(x, mid - len);
      ctx.lineTo(x, mid + len);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;

    rafId = requestAnimationFrame(drawFrame);
  }

  // Start/stop the wave loop reactively: only while the modal is open AND
  // the current track is from the offline vault.
  $effect(() => {
    const shouldRun = ui.modals.nowPlaying && isLocal && canvasEl;
    if (shouldRun && rafId === null) {
      rafId = requestAnimationFrame(drawFrame);
    }
    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    };
  });

  function close() {
    ui.modals.nowPlaying = false;
    ui.volumePanelOpen = false;
  }
</script>

{#if ui.modals.nowPlaying && track}
  <div class="now-playing-modal" id="modal-now-playing" onclick={(e) => e.target.id === 'modal-now-playing' && close()}>
    <div class="now-playing-card">
      <div class="now-playing-scroll">
        <div class="now-playing-handle" id="np-handle" onclick={close}></div>
        <div class="now-playing-art-wrap">
          {#if isLocal}
            <canvas bind:this={canvasEl} id="np-wave-canvas" class="np-wave-canvas"></canvas>
          {:else}
            <img id="np-art" class="now-playing-art" src={artSrc} alt="Album Art" onerror={onArtError}>
          {/if}
        </div>
        <div class="now-playing-meta">
          <div class="now-playing-title" id="np-title">{track.title}</div>
        </div>
        <div class="now-playing-progress-row">
          <div class="track-progress-bar" id="np-progress-wrapper" onclick={seekFromBarEvent}>
            <div class="track-progress-fill" id="np-progress-fill" style="width: {progressPct}%"></div>
          </div>
          <div class="now-playing-time-row">
            <span id="np-time-current">{formatTimeStrings(player.currentTime)}</span>
            <span id="np-time-duration">{formatTimeStrings(player.duration)}</span>
          </div>
        </div>
        <div class="now-playing-controls">
          <button class="strip-control-btn np-toggle-btn" id="np-btn-shuffle" title="Shuffle" class:toggle-active={player.shuffle} onclick={toggleShuffle}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 3 21 3 21 8"></polyline><line x1="4" y1="20" x2="21" y2="3"></line><polyline points="21 16 21 21 16 21"></polyline><line x1="15" y1="15" x2="21" y2="21"></line><line x1="4" y1="4" x2="9" y2="9"></line></svg>
          </button>
          <button class="strip-control-btn" id="np-btn-prev" onclick={executePrevTrack} aria-label="Previous track">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><polygon points="19 20 9 12 19 4 19 20"></polygon><line x1="5" y1="4" x2="5" y2="20" stroke="currentColor" stroke-width="2"></line></svg>
          </button>
          <button class="strip-control-btn dock-play-ring now-playing-play-ring" id="np-btn-play" onclick={togglePlaybackState} aria-label="Play or pause">
            {#if player.isPlaying}
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
            {:else}
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
            {/if}
          </button>
          <button class="strip-control-btn" id="np-btn-next" onclick={executeNextTrack} aria-label="Next track">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 4 15 12 5 20 5 4"></polygon><line x1="19" y1="4" x2="19" y2="20" stroke="currentColor" stroke-width="2"></line></svg>
          </button>
          <button class="strip-control-btn np-toggle-btn" id="np-btn-repeat" title="Repeat"
            class:toggle-active={player.repeat !== 'off'}
            class:repeat-one-mode={player.repeat === 'one'}
            onclick={cycleRepeatMode}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg>
          </button>
        </div>

        <div class="np-extra-row">
          <button class="np-extra-btn" id="np-btn-speed" title="Playback speed" class:toggle-active={player.speed !== 1} onclick={cyclePlaybackSpeed}>{player.speed}x</button>
          <button class="np-extra-btn" id="np-btn-volume" title="Volume" class:toggle-active={player.volume === 0} onclick={() => ui.volumePanelOpen = !ui.volumePanelOpen}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" id="np-volume-icon">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
              {#if player.volume === 0}
                <line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line>
              {:else}
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
              {/if}
            </svg>
          </button>
          <button class="np-extra-btn" id="np-btn-sleep" title="Sleep timer" class:toggle-active={!!sleep.mode} onclick={() => ui.modals.sleep = true}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
          </button>
          <button class="np-extra-btn" id="np-btn-eq" title="Equalizer" class:toggle-active={eq.enabled} onclick={() => ui.modals.eq = true}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="4" y1="21" x2="4" y2="14"></line><line x1="4" y1="10" x2="4" y2="3"></line><line x1="12" y1="21" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="3"></line><line x1="20" y1="21" x2="20" y2="16"></line><line x1="20" y1="12" x2="20" y2="3"></line><line x1="1" y1="14" x2="7" y2="14"></line><line x1="9" y1="8" x2="15" y2="8"></line><line x1="17" y1="16" x2="23" y2="16"></line></svg>
          </button>
        </div>

        {#if ui.volumePanelOpen}
          <div class="np-volume-panel" id="np-volume-panel">
            <button class="strip-control-btn" id="np-btn-mute" style="width:36px; height:36px; flex-shrink:0;" onclick={toggleMute} aria-label="Mute or unmute">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" id="np-mute-icon">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                {#if player.volume === 0}
                  <line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line>
                {:else}
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                {/if}
              </svg>
            </button>
            <input type="range" id="np-volume-slider" min="0" max="100" value={player.volume} oninput={(e) => setPlayerVolume(parseInt(e.target.value, 10))}>
            <span class="np-volume-label" id="np-volume-label">{player.volume}</span>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}
