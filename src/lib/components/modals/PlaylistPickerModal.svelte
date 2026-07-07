<script>
  import { ui, lib } from '../../stores/app.svelte.js';
  import { toggleTrackPlaylistMapping, createPlaylist } from '../../actions.svelte.js';

  const targetTrack = $derived(lib.tracks.find((t) => t.id === ui.trackTargetedForPlaylist) || null);
  const subtitle = $derived(targetTrack ? `Mapping: "${targetTrack.title}"` : 'Manage track localization');

  let newName = $state('');

  function close() {
    ui.modals.playlistPicker = false;
    ui.trackTargetedForPlaylist = null;
  }

  function createAndSeed() {
    const created = createPlaylist(newName, ui.trackTargetedForPlaylist);
    if (created) newName = '';
  }
</script>

{#if ui.modals.playlistPicker}
  <div class="settings-modal" id="modal-playlist-orchestrator">
    <div class="playlist-modal-content">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h3 style="font-weight: 800; font-size: 20px; letter-spacing: -0.5px;">Playlist Control</h3>
          <p style="font-size: 12px; color: var(--text-muted); margin-top: 2px;" id="playlist-modal-subtitle">{subtitle}</p>
        </div>
        <button class="icon-btn" id="btn-close-playlists-modal" style="width:36px; height:36px;" onclick={close} aria-label="Close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>

      <div>
        <div class="playlist-group-title">Add to Playlist</div>
        <div class="playlist-selector-list" id="modal-playlists-target-list">
          {#if lib.playlists.length === 0}
            <div style="color:var(--text-muted); font-size:13px; text-align:center; padding:12px;">No active structural playlists configured.</div>
          {:else}
            {#each lib.playlists as p (p.id)}
              {@const holdsTrack = p.tracks.includes(ui.trackTargetedForPlaylist)}
              <div class="playlist-selector-item" onclick={() => toggleTrackPlaylistMapping(p.id, ui.trackTargetedForPlaylist)}>
                <span>{p.name}</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill={holdsTrack ? 'var(--accent-color)' : 'none'} stroke={holdsTrack ? 'var(--accent-color)' : 'var(--text-muted)'} stroke-width="2.5">
                  {#if holdsTrack}
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>
                  {:else}
                    <circle cx="12" cy="12" r="10"></circle>
                  {/if}
                </svg>
              </div>
            {/each}
          {/if}
        </div>
      </div>

      <div style="border-top: 1px solid var(--border-color); padding-top: 16px;">
        <div class="playlist-group-title">Create New Playlist</div>
        <div class="playlist-input-wrapper">
          <input type="text" id="input-new-playlist-name" placeholder="Enter playlist title..." bind:value={newName} onkeydown={(e) => e.key === 'Enter' && createAndSeed()}>
          <button class="playlist-create-btn" id="btn-execute-create-playlist" onclick={createAndSeed}>Create</button>
        </div>
      </div>
    </div>
  </div>
{/if}
