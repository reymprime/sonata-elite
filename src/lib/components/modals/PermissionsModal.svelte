<script>
  import { ui } from '../../stores/app.svelte.js';
  import { grantSonataPermissions, dismissPermissionsGate } from '../../actions.svelte.js';
</script>

{#if ui.modals.permissions}
  <div class="settings-modal" id="modal-permissions">
    <div class="playlist-modal-content perm-shell">
      <div class="perm-hero-icon">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><polyline points="9 12 11 14 15 10"></polyline></svg>
      </div>
      <h3 class="perm-title">Allow Sonata</h3>
      <p class="perm-sub">Sonata asks once for what it needs. Nothing runs without your permission.</p>
      <div class="perm-list">
        <div class="perm-row">
          <div class="perm-ic"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg></div>
          <div class="perm-row-text"><span>Protected storage</span><small>Keeps your library and offline songs safe from system cleanup</small></div>
        </div>
        <div class="perm-row">
          <div class="perm-ic"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg></div>
          <div class="perm-row-text"><span>Media controls</span><small>Lock screen and notification playback controls</small></div>
        </div>
        <div class="perm-row">
          <div class="perm-ic"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg></div>
          <div class="perm-row-text"><span>Timers &amp; auto-close</span><small>Sleep timer may pause music and close the app for you</small></div>
        </div>
      </div>
      <button class="playlist-create-btn perm-allow" id="btn-perm-allow" onclick={grantSonataPermissions}>Allow &amp; Continue</button>
      <div class="delete-cancel-lnk" id="btn-perm-later" style="width:100%; flex:none;" onclick={dismissPermissionsGate}>Not now</div>
    </div>
  </div>
{/if}
