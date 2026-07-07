<script>
  import { ui, lib } from '../../stores/app.svelte.js';
  import { createPlaylist, renamePlaylistWorkflow, deletePlaylistWorkflow } from '../../actions.svelte.js';

  const subtitle = $derived(
    lib.playlists.length === 0
      ? 'Your spaces will live here'
      : `${lib.playlists.length} space${lib.playlists.length === 1 ? '' : 's'} · tap one to open it`
  );

  let newName = $state('');

  function openPlaylist(playlistId) {
    ui.modals.playlistsDashboard = false;
    ui.tab = `playlist-${playlistId}`;
  }

  function create() {
    const created = createPlaylist(newName);
    if (created) newName = '';
  }
</script>

{#if ui.modals.playlistsDashboard}
  <div class="settings-modal" id="modal-playlists-dashboard">
    <div class="playlist-modal-content vault-shell">
      <div class="vault-header">
        <div class="vault-header-text">
          <h3 class="vault-title">Playlists Vault</h3>
          <p class="vault-subtitle" id="vault-count-subtitle">{subtitle}</p>
        </div>
        <button class="icon-btn" id="btn-close-playlists-dashboard" style="width:42px; height:42px;" onclick={() => ui.modals.playlistsDashboard = false} aria-label="Close vault">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>

      <div class="vault-list-wrap">
        <div class="playlist-group-title">Your Playlists</div>
        <div class="playlist-selector-list" id="dashboard-playlists-target-list">
          {#if lib.playlists.length === 0}
            <div class="vault-empty">
              <div class="vault-empty-icon">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
              </div>
              <p>No playlists yet.<br>Create your first space below.</p>
            </div>
          {:else}
            {#each lib.playlists as p, idx (p.id)}
              <!-- Each playlist gets a stable color identity: the accent gradient
                   rotated around the hue wheel by its position in the vault. -->
              <div class="vault-card">
                <div class="vault-card-main" onclick={() => openPlaylist(p.id)}>
                  <div class="vault-art" style="--vault-hue: {(idx * 47) % 360}deg;">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
                  </div>
                  <div class="vault-card-info">
                    <span class="vault-card-name">{p.name}</span>
                    <span class="vault-card-count">{p.tracks.length} track{p.tracks.length === 1 ? '' : 's'}</span>
                  </div>
                </div>
                <div class="vault-card-actions" onclick={(e) => e.stopPropagation()}>
                  <button class="strip-control-btn" onclick={() => renamePlaylistWorkflow(p.id)} title="Rename Playlist" style="color: var(--accent-color);">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                  </button>
                  <button class="strip-control-btn btn-delete" onclick={() => deletePlaylistWorkflow(p.id)} title="Delete Playlist">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  </button>
                </div>
              </div>
            {/each}
          {/if}
        </div>
      </div>

      <div class="vault-create-dock">
        <div class="playlist-group-title">Create New Playlist</div>
        <div class="playlist-input-wrapper">
          <input type="text" id="input-dashboard-playlist-name" placeholder="Enter playlist title..." bind:value={newName} onkeydown={(e) => e.key === 'Enter' && create()}>
          <button class="playlist-create-btn" id="btn-dashboard-create-playlist" onclick={create}>Create</button>
        </div>
      </div>
    </div>
  </div>
{/if}
