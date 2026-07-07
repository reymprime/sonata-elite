<script>
  import { ui } from '../stores/app.svelte.js';
  import { parseAndCommitYoutubeUrl } from '../actions.svelte.js';

  let url = $state('');
  let inputEl = $state(null);

  // Focus the field the moment the panel expands
  $effect(() => {
    if (ui.searchPanelOpen && inputEl) requestAnimationFrame(() => inputEl.focus());
  });

  function commit() {
    if (url.trim() !== '') {
      parseAndCommitYoutubeUrl(url.trim());
      url = '';
    }
  }
</script>

{#if ui.searchPanelOpen}
  <div class="search-expand-card" id="search-expand-panel">
    <div class="search-expand-input-row">
      <input
        type="text"
        id="yt-url-input"
        placeholder="Paste YouTube video or playlist link..."
        bind:value={url}
        bind:this={inputEl}
        onkeydown={(e) => e.key === 'Enter' && commit()}
      >
      <button class="icon-btn" id="btn-trigger-search" style="width:40px; height:40px;" onclick={commit} aria-label="Add link">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
      </button>
    </div>
  </div>
{/if}
