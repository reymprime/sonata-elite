<script>
  import { ui, lib } from '../stores/app.svelte.js';

  // A playlist tab appears in the scroll strip while it's being viewed,
  // matching the original's dynamic tab reconstruction.
  const activePlaylist = $derived(
    ui.tab.startsWith('playlist-')
      ? lib.playlists.find((p) => p.id === ui.tab.replace('playlist-', ''))
      : null
  );
</script>

<div class="tabs-scroll" id="dynamic-tabs-container">
  <div class="tab-item" class:active={ui.tab === 'all'} onclick={() => ui.tab = 'all'} id="tab-all">All Tracks</div>
  <div class="tab-item" class:active={ui.tab === 'favorites'} onclick={() => ui.tab = 'favorites'} id="tab-favorites">Favorites</div>
  <div class="tab-item" class:active={ui.tab === 'recent'} onclick={() => ui.tab = 'recent'} id="tab-recent">Recent</div>
  {#if activePlaylist}
    <div class="tab-item active" id="tab-playlist-{activePlaylist.id}">{activePlaylist.name}</div>
  {/if}
</div>
