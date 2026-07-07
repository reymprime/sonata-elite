<script>
  import { ui, player, currentTrack } from '../stores/app.svelte.js';
  import {
    bootstrapSelectedTrack, seekFromBarEvent, formatTimeStrings
  } from '../engine.svelte.js';
  import {
    toggleFavoriteAction, triggerTrackDeletionPipeline,
    executeExternalDownloadConverter, removeTrackFromCurrentPlaylist
  } from '../actions.svelte.js';
  import { swipe, dragReorder } from '../gestures.js';

  let { track, isPlaylistView, getContainer, onReorder } = $props();

  let stripEl = $state(null);

  const isActive = $derived(currentTrack()?.id === track.id);
  const progressPct = $derived(player.duration > 0 ? (player.currentTime / player.duration) * 100 : 0);
  const remainingLabel = $derived(
    player.duration > 1 ? '-' + formatTimeStrings(Math.max(player.duration - player.currentTime, 0)) : '0:00'
  );

  function openPlaylistPicker() {
    ui.trackTargetedForPlaylist = track.id;
    ui.modals.playlistPicker = true;
  }
</script>

<div class="track-strip" class:active-strip={isActive} bind:this={stripEl} data-track-id={track.id}>
  <div class="swipe-bg swipe-bg-favorite">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
    <span>{track.favorite ? 'Unfavorite' : 'Favorite'}</span>
  </div>
  <div class="swipe-bg swipe-bg-delete">
    <span>Delete</span>
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
  </div>

  <div
    class="swipe-content"
    use:swipe={{
      onFavorite: () => toggleFavoriteAction(track.id),
      onDelete: () => triggerTrackDeletionPipeline(track.id)
    }}
  >
    <div class="track-main" onclick={() => bootstrapSelectedTrack(track.id)}>
      {#if isPlaylistView}
        <div
          class="drag-handle"
          title="Drag to reorder"
          use:dragReorder={{
            stripEl: () => stripEl,
            trackId: track.id,
            getContainer,
            onReorder
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.6"></circle><circle cx="15" cy="6" r="1.6"></circle><circle cx="9" cy="12" r="1.6"></circle><circle cx="15" cy="12" r="1.6"></circle><circle cx="9" cy="18" r="1.6"></circle><circle cx="15" cy="18" r="1.6"></circle></svg>
        </div>
      {/if}
      <div class="track-details">
        <div class="track-title">{track.title}</div>
        <div class="track-status">{isActive ? 'Now Playing' : (track.type === 'local' ? 'Offline · Ready' : 'Not Playing')}</div>
      </div>
      <div class="track-actions" onclick={(e) => e.stopPropagation()}>
        <button class="strip-control-btn" onclick={openPlaylistPicker} title="Manage Playlists" style="color: var(--accent-color);">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="14" y2="6"></line><line x1="3" y1="11" x2="14" y2="11"></line><line x1="3" y1="16" x2="10" y2="16"></line><circle cx="18.5" cy="17.5" r="4.5"></circle><line x1="18.5" y1="15.5" x2="18.5" y2="19.5"></line><line x1="16.5" y1="17.5" x2="20.5" y2="17.5"></line></svg>
        </button>
        {#if track.type !== 'local'}
          <button class="strip-control-btn" onclick={() => executeExternalDownloadConverter(track.id)} title="Download">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          </button>
        {/if}
        {#if isPlaylistView}
          <button class="strip-control-btn btn-delete" onclick={() => removeTrackFromCurrentPlaylist(track.id)} title="Remove from this playlist">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"></circle><line x1="8" y1="12" x2="16" y2="12"></line></svg>
          </button>
        {/if}
      </div>
    </div>

    {#if isActive}
      <div class="track-progress-container" onclick={(e) => e.stopPropagation()}>
        <div class="track-progress-bar" onclick={seekFromBarEvent}>
          <div class="track-progress-fill" style="width: {progressPct}%"></div>
        </div>
        <span class="track-duration">{remainingLabel}</span>
      </div>
    {/if}
  </div>
</div>
