<script>
  import { onMount } from 'svelte';
  import { ui, applyTheme, toast } from './lib/stores/app.svelte.js';
  import {
    loadYouTubeApi, registerLocalAudio, setupMediaSessionHandlers
  } from './lib/engine.svelte.js';
  import { maybeShowPermissionsGate, mergeCloudTracks, mergeCloudPlaylists } from './lib/actions.svelte.js';
  import { initCloud } from './lib/services/cloud.js';

  import Header from './lib/components/Header.svelte';
  import SearchPanel from './lib/components/SearchPanel.svelte';
  import NavCards from './lib/components/NavCards.svelte';
  import Tabs from './lib/components/Tabs.svelte';
  import LibraryView from './lib/components/LibraryView.svelte';
  import Dock from './lib/components/Dock.svelte';
  import Toast from './lib/components/Toast.svelte';

  import NowPlayingModal from './lib/components/modals/NowPlayingModal.svelte';
  import SleepTimerModal from './lib/components/modals/SleepTimerModal.svelte';
  import QueueModal from './lib/components/modals/QueueModal.svelte';
  import SettingsModal from './lib/components/modals/SettingsModal.svelte';
  import EqualizerModal from './lib/components/modals/EqualizerModal.svelte';
  import PermissionsModal from './lib/components/modals/PermissionsModal.svelte';
  import OwnerCreditModal from './lib/components/modals/OwnerCreditModal.svelte';
  import ImportConfirmModal from './lib/components/modals/ImportConfirmModal.svelte';
  import DeleteConfirmModal from './lib/components/modals/DeleteConfirmModal.svelte';
  import RenamePlaylistModal from './lib/components/modals/RenamePlaylistModal.svelte';
  import PlaylistPickerModal from './lib/components/modals/PlaylistPickerModal.svelte';
  import PlaylistsDashboardModal from './lib/components/modals/PlaylistsDashboardModal.svelte';

  let localAudioEl;

  onMount(() => {
    applyTheme(ui.theme);
    registerLocalAudio(localAudioEl);
    setupMediaSessionHandlers();
    loadYouTubeApi();
    maybeShowPermissionsGate();
    initCloud({ onTracks: mergeCloudTracks, onPlaylists: mergeCloudPlaylists });

    // Network status agent
    const applyStatus = () => { ui.online = navigator.onLine; };
    window.addEventListener('online', applyStatus);
    window.addEventListener('offline', applyStatus);

    // Global Escape handling for modals without a focused input to catch the key
    const onKeydown = (e) => {
      if (e.key !== 'Escape') return;
      if (ui.modals.deleteConfirm) { ui.deleteContext = null; ui.modals.deleteConfirm = false; }
      if (ui.modals.nowPlaying) ui.modals.nowPlaying = false;
      if (ui.modals.ownerCredit) ui.modals.ownerCredit = false;
      if (ui.modals.sleep) ui.modals.sleep = false;
      if (ui.modals.queue) ui.modals.queue = false;
      if (ui.modals.importConfirm) { ui.pendingImportData = null; ui.modals.importConfirm = false; }
      if (ui.searchPanelOpen) ui.searchPanelOpen = false;
    };
    document.addEventListener('keydown', onKeydown);

    // Service worker (production builds only — Vite dev server has no sw.js)
    if ('serviceWorker' in navigator && import.meta.env.PROD) {
      navigator.serviceWorker.register('./sw.js').catch((err) => {
        console.warn('Service worker registration failed:', err);
      });
    }

    return () => {
      window.removeEventListener('online', applyStatus);
      window.removeEventListener('offline', applyStatus);
      document.removeEventListener('keydown', onKeydown);
    };
  });
</script>

<div class="app-container">
  <Header />
  <SearchPanel />

  <!-- YouTube engine mount point: the IFrame API replaces the inner div -->
  <div id="youtube-player-container" class:minimized={!ui.videoVisible}>
    <div id="iframe-target"></div>
  </div>

  <!-- Offline vault engine -->
  <audio bind:this={localAudioEl} id="local-audio-engine" preload="auto" class="hidden"></audio>

  <NavCards />
  <Tabs />
  <LibraryView />
</div>

<Dock />

<NowPlayingModal />
<SleepTimerModal />
<QueueModal />
<SettingsModal />
<EqualizerModal />
<PermissionsModal />
<OwnerCreditModal />
<ImportConfirmModal />
<DeleteConfirmModal />
<RenamePlaylistModal />
<PlaylistPickerModal />
<PlaylistsDashboardModal />

<Toast />
