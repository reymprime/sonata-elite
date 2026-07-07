// ============================================================
// SONATA ELITE — CENTRAL STATE (Svelte 5 runes)
// Reactive replacement for the original single-file app's
// module-level variables. Same localStorage keys are kept, so
// upgrading from the old index.html build preserves the user's
// entire library, playlists, prefs, and offline vault.
// ============================================================

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

// --- LIBRARY: tracks / playlists / recently played ---
const initialTracks = (() => {
  let t = loadJSON('sonata_library', null);
  if (!t || t.length === 0) {
    t = [
      { id: 'bMknfKXIFA8', title: 'MAIBA ACTING', type: 'online', favorite: true },
      { id: '7K_ZOdFv7p8', title: 'I Tried Video Editing for 365 days and...', type: 'online', favorite: false }
    ];
    localStorage.setItem('sonata_library', JSON.stringify(t));
  }
  return t;
})();

const initialPlaylists = (() => {
  let p = loadJSON('sonata_playlists', null);
  if (!p) {
    p = [{ id: 'pl-initial-vibe', name: 'Lo-Fi Gaming', tracks: ['bMknfKXIFA8'] }];
    localStorage.setItem('sonata_playlists', JSON.stringify(p));
  }
  return p;
})();

export const lib = $state({
  tracks: initialTracks,
  playlists: initialPlaylists,
  recent: loadJSON('sonata_recent', [])
});

export function persistTracks() {
  localStorage.setItem('sonata_library', JSON.stringify(lib.tracks));
}
export function persistPlaylists() {
  localStorage.setItem('sonata_playlists', JSON.stringify(lib.playlists));
}
export function persistRecent() {
  localStorage.setItem('sonata_recent', JSON.stringify(lib.recent));
}

// --- PLAYER: queue, transport, prefs ---
const SPEED_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
let storedSpeed = parseFloat(localStorage.getItem('sonata_speed')) || 1;
if (!SPEED_STEPS.includes(storedSpeed)) storedSpeed = 1;
let storedVolume = parseInt(localStorage.getItem('sonata_volume'));
if (isNaN(storedVolume)) storedVolume = 100;

export const player = $state({
  queue: [],
  pointer: -1,
  shuffle: localStorage.getItem('sonata_shuffle') === '1',
  repeat: localStorage.getItem('sonata_repeat') || 'off', // 'off' | 'all' | 'one'
  shuffleOrder: [],
  speed: storedSpeed,
  volume: storedVolume,
  lastVolumeBeforeMute: 70,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  ytApiReady: false
});

export { SPEED_STEPS };

export function currentTrack() {
  return player.pointer > -1 ? player.queue[player.pointer] || null : null;
}
export function isCurrentTrackLocal() {
  const t = currentTrack();
  return !!(t && t.type === 'local');
}

// --- SLEEP TIMER ---
export const sleep = $state({
  mode: null,       // null | <minutes number> | 'end'
  endsAt: null,     // epoch ms for the live countdown
  autoClose: localStorage.getItem('sonata_sleep_autoclose') === '1',
  now: Date.now()   // ticked by the timeline so countdowns stay live
});

// --- EQUALIZER ---
let storedGains = loadJSON('sonata_eq_gains', [0, 0, 0, 0, 0]);
if (!Array.isArray(storedGains) || storedGains.length !== 5) storedGains = [0, 0, 0, 0, 0];

export const eq = $state({
  enabled: localStorage.getItem('sonata_eq_on') === '1',
  gains: storedGains
});

export function persistEq() {
  localStorage.setItem('sonata_eq_on', eq.enabled ? '1' : '0');
  localStorage.setItem('sonata_eq_gains', JSON.stringify(eq.gains));
}

// --- UI: tab, search, theme, modals, toast ---
export const ui = $state({
  tab: 'all',
  searchPanelOpen: false,
  librarySearchOpen: false,
  librarySearchQuery: '',
  theme: localStorage.getItem('sonata_theme') || 'deep',
  videoVisible: false,
  online: typeof navigator !== 'undefined' ? navigator.onLine : true,
  modals: {
    settings: false,
    nowPlaying: false,
    sleep: false,
    queue: false,
    eq: false,
    permissions: false,
    ownerCredit: false,
    importConfirm: false,
    deleteConfirm: false,
    rename: false,
    playlistPicker: false,
    playlistsDashboard: false
  },
  volumePanelOpen: false,
  deleteContext: null,           // { type: 'track' | 'playlist', id }
  renameContext: null,           // { playlistId }
  trackTargetedForPlaylist: null,
  pendingImportData: null,
  importSummary: '',
  toast: { msg: '', key: 0 }
});

let toastTimer = null;
export function toast(msg) {
  ui.toast = { msg, key: ui.toast.key + 1 };
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { ui.toast = { msg: '', key: ui.toast.key + 1 }; }, 2500);
}

// Theme color shown in the OS status bar / browser chrome per theme, so it
// never looks like a mismatched dark bar sitting on top of a light page.
const THEME_CHROME_COLOR = {
  deep: '#030014',
  oled: '#000000',
  light: '#f8fafc',
  green: '#01120c'
};

export function applyTheme(themeVal) {
  ui.theme = themeVal;
  if (themeVal === 'deep') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', themeVal);
  }
  localStorage.setItem('sonata_theme', themeVal);
  const meta = document.getElementById('meta-theme-color');
  if (meta) meta.setAttribute('content', THEME_CHROME_COLOR[themeVal] || THEME_CHROME_COLOR.deep);
}

// Single source of truth for "what tracks does the current tab show" —
// reused by rendering, track selection, and Play All so they can never
// drift out of sync with each other.
export function getFilteredTrackSubset() {
  let subset;
  if (ui.tab === 'all') {
    subset = [...lib.tracks];
  } else if (ui.tab === 'favorites') {
    subset = lib.tracks.filter((t) => t.favorite);
  } else if (ui.tab === 'recent') {
    subset = lib.recent.map((id) => lib.tracks.find((t) => t.id === id)).filter(Boolean);
  } else if (ui.tab.startsWith('playlist-')) {
    const pId = ui.tab.replace('playlist-', '');
    const pl = lib.playlists.find((p) => p.id === pId);
    subset = pl ? lib.tracks.filter((track) => pl.tracks.includes(track.id)) : [];
  } else {
    subset = [...lib.tracks];
  }
  if (ui.librarySearchQuery) {
    subset = subset.filter((t) => t.title.toLowerCase().includes(ui.librarySearchQuery));
  }
  return subset;
}

export function sectionTitle() {
  if (ui.tab === 'all') return 'All Tracks';
  if (ui.tab === 'favorites') return 'Favorites Tracks';
  if (ui.tab === 'recent') return 'Recently Played';
  if (ui.tab.startsWith('playlist-')) {
    const id = ui.tab.replace('playlist-', '');
    const pl = lib.playlists.find((p) => p.id === id);
    return pl ? pl.name : 'Playlist View';
  }
  return 'All Tracks';
}

// Keeps a most-recent-first history of played track ids (capped at 50).
export function recordRecentlyPlayed(trackId) {
  lib.recent = [trackId, ...lib.recent.filter((id) => id !== trackId)].slice(0, 50);
  persistRecent();
}
