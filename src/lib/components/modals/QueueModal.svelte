<script>
  import { ui, player } from '../../stores/app.svelte.js';
  import { computeAdjacentIndex, jumpToQueueIndex } from '../../engine.svelte.js';

  const subtitle = $derived(
    player.queue.length === 0
      ? 'Nothing queued yet'
      : `${player.queue.length} track${player.queue.length === 1 ? '' : 's'} in queue${player.shuffle ? ' · Shuffled' : ''}${player.repeat !== 'off' ? ' · Repeat ' + (player.repeat === 'one' ? '1' : 'All') : ''}`
  );
  const nextIdx = $derived(player.queue.length ? computeAdjacentIndex(1, true) : -1);

  function pick(idx) {
    jumpToQueueIndex(idx);
    ui.modals.queue = false;
  }
</script>

{#if ui.modals.queue}
  <div class="albums-modal" id="modal-queue-view" onclick={(e) => e.target.id === 'modal-queue-view' && (ui.modals.queue = false)}>
    <div class="albums-content">
      <div class="albums-header">
        <div>
          <h3 style="font-weight: 800; font-size: 19px; letter-spacing: -0.5px;">Up Next</h3>
          <p style="font-size: 11px; color: var(--text-muted); margin-top: 2px;" id="queue-view-subtitle">{subtitle}</p>
        </div>
        <button class="icon-btn" id="btn-close-queue-view" style="width:36px; height:36px;" onclick={() => ui.modals.queue = false} aria-label="Close queue">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>
      <div class="albums-list-container" id="queue-view-list">
        {#if player.queue.length === 0}
          <div style="color:var(--text-muted); text-align:center; font-size:13px; padding:25px;">Play a track or hit Play All to build your queue.</div>
        {:else}
          {#each player.queue as track, idx (track.id + '-' + idx)}
            {@const isCurrent = idx === player.pointer}
            {@const isUpNext = !isCurrent && idx === nextIdx}
            <div class="album-item-row" class:queue-current-row={isCurrent} onclick={() => pick(idx)}>
              <img src="https://img.youtube.com/vi/{track.id}/default.jpg" class="album-item-thumb" alt="Cover">
              <div class="album-item-info">
                <div class="album-item-title">{track.title}</div>
                <div class="album-item-author">{isCurrent ? 'Now Playing' : `#${idx + 1} in queue`}</div>
              </div>
              {#if isCurrent}
                <div class="queue-badge-playing">Playing</div>
              {:else if isUpNext}
                <div class="queue-badge-next">Next</div>
              {/if}
            </div>
          {/each}
        {/if}
      </div>
    </div>
  </div>
{/if}
