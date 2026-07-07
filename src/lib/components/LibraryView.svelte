<script>
  import { ui, lib, sectionTitle, getFilteredTrackSubset } from '../stores/app.svelte.js';
  import { executePlayAllWorkflow } from '../engine.svelte.js';
  import { handleLocalAudioImport, finalizePlaylistReorder } from '../actions.svelte.js';
  import TrackStrip from './TrackStrip.svelte';

  let fileInput = $state(null);
  let searchInput = $state(null);
  let listContainer = $state(null);

  const filteredTracks = $derived(getFilteredTrackSubset());
  const isPlaylistView = $derived(ui.tab.startsWith('playlist-'));

  const emptyMessage = $derived(
    ui.librarySearchQuery
      ? `No matches for "${ui.librarySearchQuery}".`
      : ui.tab === 'recent'
        ? 'Nothing played yet — your history shows up here.'
        : 'Index workspace empty.'
  );

  function toggleLibrarySearch() {
    ui.librarySearchOpen = !ui.librarySearchOpen;
    if (ui.librarySearchOpen) {
      requestAnimationFrame(() => searchInput && searchInput.focus());
    } else {
      ui.librarySearchQuery = '';
    }
  }

  async function onFilesPicked(e) {
    await handleLocalAudioImport(e.target.files);
    e.target.value = ''; // allow re-selecting the same file later
  }

  function onReorder(newOrderIds) {
    finalizePlaylistReorder(ui.tab.replace('playlist-', ''), newOrderIds);
  }
</script>

<div>
  <div class="section-header-row">
    <div class="track-section-title" id="section-view-title">{sectionTitle()}</div>
    <div class="header-action-group">
      <button class="icon-btn" id="btn-toggle-library-search" style="width:38px; height:38px;" title="Search your library" onclick={toggleLibrarySearch}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
      </button>
      <button class="icon-btn" id="btn-toggle-video" style="width:38px; height:38px;" title="Show / hide video" onclick={() => ui.videoVisible = !ui.videoVisible}>
        {#if ui.videoVisible}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
        {:else}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
        {/if}
      </button>
      <button class="icon-btn" id="btn-import-local" style="width:38px; height:38px;" title="Import audio from device" onclick={() => fileInput.click()}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle><line x1="3" y1="3" x2="7" y2="3"></line><line x1="5" y1="1" x2="5" y2="5"></line></svg>
      </button>
      <button class="icon-btn" id="btn-open-queue-view" style="width:38px; height:38px;" title="Up Next" onclick={() => ui.modals.queue = true}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="15" y2="18"></line><circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none"></circle><circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none"></circle><circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none"></circle></svg>
      </button>
      <button class="play-all-btn" id="btn-play-all" onclick={executePlayAllWorkflow}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
        Play All
      </button>
    </div>
  </div>

  <input type="file" bind:this={fileInput} accept="audio/*" multiple class="hidden" onchange={onFilesPicked}>

  {#if ui.librarySearchOpen}
    <div class="library-search-row" id="library-search-row">
      <input
        type="text"
        id="library-search-input"
        placeholder="Search your library..."
        autocomplete="off"
        spellcheck="false"
        bind:this={searchInput}
        oninput={(e) => ui.librarySearchQuery = e.target.value.trim().toLowerCase()}
      >
    </div>
  {/if}

  <div class="track-list" id="track-container-list" bind:this={listContainer}>
    {#if filteredTracks.length === 0}
      <div style="color:var(--text-muted); font-size:14px; padding:10px;">{emptyMessage}</div>
    {:else}
      {#each filteredTracks as track (track.id)}
        <TrackStrip {track} {isPlaylistView} getContainer={() => listContainer} {onReorder} />
      {/each}
    {/if}
  </div>
</div>
