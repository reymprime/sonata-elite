<script>
  import { ui, player, currentTrack, toast } from '../stores/app.svelte.js';
  import {
    togglePlaybackState, executeNextTrack, executePrevTrack,
    seekFromBarEvent, formatTimeStrings
  } from '../engine.svelte.js';

  const progressPct = $derived(player.duration > 0 ? (player.currentTime / player.duration) * 100 : 0);
  const timeLabel = $derived(formatTimeStrings(player.currentTime) + ' / ' + formatTimeStrings(player.duration));

  function openNowPlaying() {
    if (player.pointer === -1 || !currentTrack()) {
      toast('Nothing is playing yet');
      return;
    }
    ui.modals.nowPlaying = true;
  }
</script>

<div class="bottom-dock" id="master-dock">
  <div class="track-progress-container">
    <div class="track-progress-bar" id="dock-progress-wrapper" onclick={seekFromBarEvent}>
      <div class="track-progress-fill" id="dock-progress-fill" style="width: {progressPct}%"></div>
    </div>
    <span class="track-duration" id="dock-duration-display">{timeLabel}</span>
  </div>
  <div class="dock-main">
    <div class="dock-meta" id="dock-meta-trigger" onclick={openNowPlaying}>
      <div class="wave-container" id="dock-wave" class:playing={player.isPlaying}>
        <div class="wave-bar"></div><div class="wave-bar"></div><div class="wave-bar"></div>
      </div>
      <div style="overflow: hidden;">
        <div class="track-title" id="dock-title-text" style="font-size: 15px;">{currentTrack()?.title ?? 'Select a Track'}</div>
      </div>
    </div>
    <div class="dock-controls">
      <button class="strip-control-btn" id="dock-btn-prev" onclick={executePrevTrack} aria-label="Previous track">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><polygon points="19 20 9 12 19 4 19 20"></polygon><line x1="5" y1="4" x2="5" y2="20" stroke="currentColor" stroke-width="2"></line></svg>
      </button>
      <button class="strip-control-btn dock-play-ring" id="dock-btn-play" onclick={togglePlaybackState} aria-label="Play or pause">
        {#if player.isPlaying}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
        {:else}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
        {/if}
      </button>
      <button class="strip-control-btn" id="dock-btn-next" onclick={executeNextTrack} aria-label="Next track">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 4 15 12 5 20 5 4"></polygon><line x1="19" y1="4" x2="19" y2="20" stroke="currentColor" stroke-width="2"></line></svg>
      </button>
    </div>
  </div>
</div>
