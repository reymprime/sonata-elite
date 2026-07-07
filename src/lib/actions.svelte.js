// ============================================================
// SONATA ELITE — LIBRARY & PLAYLIST ACTIONS
// Everything that mutates tracks/playlists: adding YouTube URLs,
// bulk playlist import via the Data API, favorites, deletion
// cascades, device audio import, backup/restore.
// ============================================================
import {
  lib, player, ui, currentTrack,
  persistTracks, persistPlaylists, persistRecent,
  getFilteredTrackSubset, toast, applyTheme
} from './stores/app.svelte.js';
import { syncToCloud } from './services/cloud.js';
import { idbPutAudio, idbDeleteAudio } from './services/idb.js';
import {
  haltAndClearQueue, rebuildShuffleOrder, setPlayerVolume, getLocalAudio
} from './engine.svelte.js';

// System Configurations Injectors
const YOUTUBE_API_KEY = 'AIzaSyA58g8LJy4f_TiLuv-w61c8vEkq0TJnKhw';

// --- ADD FROM YOUTUBE URL (video or full playlist) ---
export function parseAndCommitYoutubeUrl(url) {
  const playlistMatch = url.match(/[?&]list=([^#&?]+)/);
  if (playlistMatch && playlistMatch[1]) {
    importYoutubePlaylistById(playlistMatch[1]);
    return;
  }

  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/;
  const match = url.match(regExp);
  const videoId = (match && match[2].length === 11) ? match[2] : null;

  if (!videoId) {
    toast('Invalid Link Location');
    return;
  }
  if (lib.tracks.some((t) => t.id === videoId)) {
    toast('Track already inside system library');
    return;
  }

  const newTrack = { id: videoId, title: 'Fetching Premium Video Stream...', type: 'online', favorite: false };
  lib.tracks.push(newTrack);
  persistTracks();
  syncToCloud((cloud) => cloud.saveTrack(newTrack));
  toast('Network stream linked to engine');
}

// Bulk-imports every video in a YouTube playlist by paginating through
// the Data API, skipping anything already in the library.
export async function importYoutubePlaylistById(playlistId) {
  toast('Importing playlist...');
  let addedCount = 0;
  let pageToken = '';

  try {
    do {
      const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}&key=${YOUTUBE_API_KEY}${pageToken ? '&pageToken=' + pageToken : ''}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Playlist fetch failed');
      const data = await response.json();

      (data.items || []).forEach((item) => {
        const snippet = item.snippet;
        const videoId = snippet && snippet.resourceId ? snippet.resourceId.videoId : null;
        if (!videoId || lib.tracks.some((t) => t.id === videoId)) return;
        const newTrack = { id: videoId, title: snippet.title || 'Imported Track', type: 'online', favorite: false };
        lib.tracks.push(newTrack);
        syncToCloud((cloud) => cloud.saveTrack(newTrack));
        addedCount++;
      });

      pageToken = data.nextPageToken || '';
    } while (pageToken);

    persistTracks();
    toast(addedCount > 0 ? `Imported ${addedCount} track${addedCount === 1 ? '' : 's'} from playlist` : 'Playlist tracks were already in your library');
  } catch (err) {
    console.error(err);
    toast("Couldn't import that playlist");
  }
}

// --- FAVORITES ---
export function toggleFavoriteAction(trackId) {
  const target = lib.tracks.find((t) => t.id === trackId);
  if (target) {
    target.favorite = !target.favorite;
    persistTracks();
    syncToCloud((cloud) => cloud.setTrackFavorite(trackId, target.favorite));
    toast(target.favorite ? 'Added to luxury vault' : 'Removed from vault');
  }
}

// --- EXTERNAL DOWNLOAD CONVERTER ---
export function executeExternalDownloadConverter(trackId) {
  const videoUrl = `https://www.youtube.com/watch?v=${trackId}`;
  navigator.clipboard.writeText(videoUrl).catch(() => {});
  // Opened synchronously (no setTimeout) so it stays inside the same
  // user-gesture as the tap — delaying this made mobile browsers treat
  // it as an unsolicited popup and silently block it.
  window.open('https://convertytmp3.org/', '_blank');
  toast('Link copied. Converter opened.');
}

// --- DELETE CONFIRMATION PIPELINE (tracks AND playlists share one modal) ---
export function triggerTrackDeletionPipeline(trackId) {
  const target = lib.tracks.find((t) => t.id === trackId);
  if (!target) return;
  ui.deleteContext = {
    type: 'track',
    id: trackId,
    heading: 'Remove Track',
    message: 'Are you sure you want to permanently detach this asset from your local streaming workspace?',
    targetLabel: target.title
  };
  ui.modals.deleteConfirm = true;
}

export function deletePlaylistWorkflow(playlistId) {
  const playlist = lib.playlists.find((p) => p.id === playlistId);
  if (!playlist) return;
  ui.deleteContext = {
    type: 'playlist',
    id: playlistId,
    heading: 'Delete Playlist',
    message: 'This will permanently retire this playlist from your workspace. Tracks inside it stay safe in your library.',
    targetLabel: playlist.name
  };
  ui.modals.deleteConfirm = true;
}

export function closeDeleteConfirmationModal() {
  ui.deleteContext = null;
  ui.modals.deleteConfirm = false;
}

// Single dispatcher driving the one confirm button.
export function executeDeletionConfirmed() {
  if (!ui.deleteContext) return;
  const { type, id } = ui.deleteContext;
  if (type === 'track') executeTrackDeletion(id);
  else if (type === 'playlist') executePlaylistDeletion(id);
  closeDeleteConfirmationModal();
}

function executeTrackDeletion(trackId) {
  const playing = currentTrack();
  const deletingCurrent = playing && playing.id === trackId;

  lib.tracks = lib.tracks.filter((t) => t.id !== trackId);
  persistTracks();

  if (trackId.startsWith('local-')) {
    idbDeleteAudio(trackId).catch(() => {});
    const la = getLocalAudio();
    if (la && deletingCurrent) la.pause();
  } else {
    syncToCloud((cloud) => cloud.deleteTrack(trackId));
  }

  lib.recent = lib.recent.filter((id) => id !== trackId);
  persistRecent();

  // Cascade deletions safely through normalized playlists
  const affected = lib.playlists.filter((p) => p.tracks.includes(trackId));
  lib.playlists.forEach((p) => {
    p.tracks = p.tracks.filter((id) => id !== trackId);
  });
  persistPlaylists();
  affected.forEach((p) => syncToCloud((cloud) => cloud.savePlaylist(p)));

  toast('Track removed successfully');

  if (deletingCurrent) {
    haltAndClearQueue();
  } else if (playing) {
    // Rebuild the queue over the same view, keeping the playing track's slot.
    player.queue = getFilteredTrackSubset();
    player.pointer = player.queue.findIndex((t) => t.id === playing.id);
    if (player.shuffle) rebuildShuffleOrder();
  }
}

function executePlaylistDeletion(playlistId) {
  const wasViewingThisPlaylist = ui.tab === `playlist-${playlistId}`;
  lib.playlists = lib.playlists.filter((p) => p.id !== playlistId);
  persistPlaylists();
  syncToCloud((cloud) => cloud.deletePlaylist(playlistId));
  toast('Playlist permanently wiped');
  if (wasViewingThisPlaylist) ui.tab = 'all';
}

// --- PLAYLIST CRUD ---
export function createPlaylist(name, seedTrackId = null) {
  const trimmed = name.trim();
  if (!trimmed) { toast('Name context assignment required'); return null; }
  const newPlaylist = {
    id: 'pl-' + Date.now(),
    name: trimmed,
    tracks: seedTrackId ? [seedTrackId] : []
  };
  lib.playlists.push(newPlaylist);
  persistPlaylists();
  syncToCloud((cloud) => cloud.savePlaylist(newPlaylist));
  toast(`Playlist "${trimmed}" initialized`);
  return newPlaylist;
}

export function renamePlaylistWorkflow(playlistId) {
  const playlist = lib.playlists.find((p) => p.id === playlistId);
  if (!playlist) return;
  ui.renameContext = { playlistId, currentName: playlist.name };
  ui.modals.rename = true;
}

export function executeRenameConfirmed(newNameRaw) {
  if (!ui.renameContext) return false;
  const playlist = lib.playlists.find((p) => p.id === ui.renameContext.playlistId);
  if (!playlist) { closeRenameModal(); return true; }

  const newName = newNameRaw.trim();
  if (!newName) { toast("Playlist name can't be empty"); return false; }
  if (newName.length > 60) { toast('Playlist name is too long'); return false; }
  if (newName === playlist.name) { closeRenameModal(); return true; }

  playlist.name = newName;
  persistPlaylists();
  syncToCloud((cloud) => cloud.savePlaylist(playlist));
  toast('Playlist renamed successfully');
  closeRenameModal();
  return true;
}

export function closeRenameModal() {
  ui.renameContext = null;
  ui.modals.rename = false;
}

export function toggleTrackPlaylistMapping(playlistId, trackId) {
  const playlist = lib.playlists.find((p) => p.id === playlistId);
  if (!playlist) return;
  const idx = playlist.tracks.indexOf(trackId);
  if (idx > -1) {
    playlist.tracks.splice(idx, 1);
    toast('Asset detached from playlist');
  } else {
    playlist.tracks.push(trackId);
    toast('Asset dynamically mapped to playlist');
  }
  persistPlaylists();
  syncToCloud((cloud) => cloud.savePlaylist(playlist));
}

// Removes a track from the playlist currently being viewed —
// the track itself stays in the library.
export function removeTrackFromCurrentPlaylist(trackId) {
  if (!ui.tab.startsWith('playlist-')) return;
  const pId = ui.tab.replace('playlist-', '');
  const playlist = lib.playlists.find((p) => p.id === pId);
  if (!playlist) return;
  const idx = playlist.tracks.indexOf(trackId);
  if (idx === -1) return;
  playlist.tracks.splice(idx, 1);
  persistPlaylists();
  syncToCloud((cloud) => cloud.savePlaylist(playlist));
  toast(`Removed from "${playlist.name}"`);
}

// Commits a new visual order after a drag-reorder gesture.
export function finalizePlaylistReorder(playlistId, newOrderIds) {
  const playlist = lib.playlists.find((p) => p.id === playlistId);
  if (!playlist) return;
  // Defensive: keep only ids this playlist actually has, in the new visual order
  const reordered = newOrderIds.filter((id) => playlist.tracks.includes(id));
  if (reordered.length !== playlist.tracks.length) return; // something didn't line up — bail out safely
  playlist.tracks = reordered;
  persistPlaylists();
  syncToCloud((cloud) => cloud.savePlaylist(playlist));
  toast('Playlist order updated');
}

// --- DEVICE AUDIO IMPORT (offline vault) ---
export async function handleLocalAudioImport(fileList) {
  const files = Array.from(fileList || []);
  if (!files.length) return;
  toast(`Importing ${files.length} file${files.length === 1 ? '' : 's'}…`);
  let imported = 0;
  for (const file of files) {
    if (!file.type.startsWith('audio/')) continue;
    const id = 'local-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
    try {
      await idbPutAudio(id, file);
      lib.tracks.push({ id, title: file.name.replace(/\.[^.]+$/, ''), type: 'local', favorite: false });
      imported++;
    } catch (err) {
      console.error('Import failed for', file.name, err);
    }
  }
  if (imported) {
    persistTracks();
    toast(`${imported} song${imported === 1 ? '' : 's'} added to offline vault`);
  } else {
    toast('No audio files were imported');
  }
}

// --- PERMISSIONS GATE ---
// Web apps can't intercept every OS activity like a native permission
// manager, but Sonata asks up front for the real capabilities it uses.
// "Allow" requests persistent storage, which protects the IndexedDB
// offline vault from being evicted under storage pressure.
export function maybeShowPermissionsGate() {
  if (localStorage.getItem('sonata_permissions_ack') === '1') return;
  ui.modals.permissions = true;
}

export async function grantSonataPermissions() {
  localStorage.setItem('sonata_permissions_ack', '1');
  ui.modals.permissions = false;
  let persisted = false;
  try {
    if (navigator.storage && navigator.storage.persist) {
      persisted = await navigator.storage.persist();
    }
  } catch { /* unsupported browser — nothing to do */ }
  toast(persisted ? 'Storage protected — Sonata is all set' : 'Preferences saved');
}

export function dismissPermissionsGate() {
  localStorage.setItem('sonata_permissions_ack', '1');
  ui.modals.permissions = false;
  toast('You can allow permissions later in Settings');
}

// --- BACKUP & RESTORE ---
export function exportLibraryBackupFile() {
  const backup = {
    app: 'Sonata Elite',
    version: 1,
    exportedAt: new Date().toISOString(),
    tracks: lib.tracks,
    playlists: lib.playlists,
    settings: {
      theme: ui.theme,
      shuffle: player.shuffle,
      repeat: player.repeat,
      volume: player.volume,
      speed: player.speed
    }
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const stamp = new Date().toISOString().slice(0, 10);
  const link = document.createElement('a');
  link.href = url;
  link.download = `sonata-backup-${stamp}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  toast('Backup downloaded');
}

export function handleImportFileSelected(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result);
      if (!data || !Array.isArray(data.tracks)) throw new Error('Missing tracks array');
      ui.pendingImportData = data;
      const trackCount = data.tracks.length;
      const playlistCount = Array.isArray(data.playlists) ? data.playlists.length : 0;
      ui.importSummary = `${trackCount} track${trackCount === 1 ? '' : 's'}, ${playlistCount} playlist${playlistCount === 1 ? '' : 's'}`;
      ui.modals.importConfirm = true;
    } catch {
      toast("Couldn't read that file — is it a Sonata backup?");
    }
  };
  reader.readAsText(file);
}

export function closeImportConfirmModal() {
  ui.pendingImportData = null;
  ui.modals.importConfirm = false;
}

export function confirmImportLibrary() {
  const data = ui.pendingImportData;
  if (!data) return;

  lib.tracks = Array.isArray(data.tracks) ? data.tracks : [];
  lib.playlists = Array.isArray(data.playlists) ? data.playlists : [];
  persistTracks();
  persistPlaylists();

  // Clear anything that could silently filter out the freshly-imported
  // tracks and make it look like nothing happened: a leftover search
  // term, or being parked on Recent/a playlist tab that no longer
  // matches the new library.
  lib.recent = [];
  persistRecent();
  ui.librarySearchQuery = '';
  ui.librarySearchOpen = false;

  lib.tracks.forEach((t) => syncToCloud((cloud) => cloud.saveTrack(t)));
  lib.playlists.forEach((p) => syncToCloud((cloud) => cloud.savePlaylist(p)));

  if (data.settings) {
    if (data.settings.theme) applyTheme(data.settings.theme);
    if (typeof data.settings.volume === 'number') setPlayerVolume(data.settings.volume);
  }

  ui.pendingImportData = null;
  ui.modals.importConfirm = false;
  ui.modals.settings = false;
  ui.tab = 'all';
  toast('Library restored from backup');
}

// --- CLOUD MERGE HANDLERS (Firestore snapshots → local state) ---
export function mergeCloudTracks(cloudTracks) {
  if (!Array.isArray(cloudTracks)) return;
  lib.tracks = cloudTracks;
  persistTracks();
}

export function mergeCloudPlaylists(cloudPlaylists) {
  if (!Array.isArray(cloudPlaylists)) return;
  lib.playlists = cloudPlaylists.map((p) => ({
    id: p.id,
    name: p.name,
    tracks: p.trackIds || []
  }));
  persistPlaylists();
}
