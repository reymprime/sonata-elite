<script>
  import { lib, ui } from '../stores/app.svelte.js';
</script>

<div class="hero-cards">
  <div class="nav-card" id="card-trigger-playlists" onclick={() => ui.modals.playlistsDashboard = true}>
    <span class="count-tag" id="cnt-playlists">{lib.playlists.length}</span>
    <span>Playlists</span>
  </div>
</div>
