<script>
  import { ui, applyTheme } from '../../stores/app.svelte.js';
  import { exportLibraryBackupFile, handleImportFileSelected } from '../../actions.svelte.js';

  const THEMES = [
    { val: 'deep', label: 'Obsidian' },
    { val: 'oled', label: 'OLED' },
    { val: 'light', label: 'Light' },
    { val: 'green', label: 'Emerald' }
  ];

  let importInput = $state(null);

  function onImportPicked(e) {
    handleImportFileSelected(e.target.files[0]);
    e.target.value = ''; // allow re-selecting the same file later
  }
</script>

{#if ui.modals.settings}
  <div class="settings-modal" id="modal-settings">
    <div class="settings-content">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
        <h3 style="font-weight: 800; letter-spacing: -0.5px; font-size: 20px;">Control Suite</h3>
        <button class="icon-btn" id="btn-close-settings" style="width:36px; height:36px;" onclick={() => ui.modals.settings = false} aria-label="Close settings">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>

      <div class="setting-row">
        <span class="setting-label">Network Status</span>
        <strong id="status-network-indicator" style="font-size: 14px; color: {ui.online ? '#10b981' : '#ef4444'};">
          {ui.online ? 'Online Core Access' : 'Isolated Offline Core'}
        </strong>
      </div>

      <div class="setting-row-vertical">
        <span class="setting-label">Render Engine Theme</span>
        <div class="luxury-theme-track" id="theme-pill-track">
          {#each THEMES as t}
            <div class="luxury-theme-pill" class:active-pill={ui.theme === t.val} onclick={() => applyTheme(t.val)}>{t.label}</div>
          {/each}
        </div>
      </div>

      <div class="setting-row">
        <span class="setting-label">Privacy &amp; Permissions</span>
        <button class="icon-btn" id="btn-open-permissions" style="width:36px; height:36px; color: var(--accent-color);" onclick={() => { ui.modals.settings = false; ui.modals.permissions = true; }} aria-label="Open permissions">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
        </button>
      </div>

      <div class="setting-row-vertical">
        <span class="setting-label">Backup &amp; Restore</span>
        <div style="display:flex; gap:10px;">
          <button class="playlist-create-btn" id="btn-export-library" style="flex:1; background: var(--glass-surface); color: var(--text-main); box-shadow:none; border:1px solid var(--glass-border); display:flex; align-items:center; justify-content:center; gap:6px;" onclick={exportLibraryBackupFile}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Export
          </button>
          <button class="playlist-create-btn" id="btn-trigger-import" style="flex:1; display:flex; align-items:center; justify-content:center; gap:6px;" onclick={() => importInput.click()}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
            Import
          </button>
        </div>
        <input type="file" bind:this={importInput} accept="application/json,.json" class="hidden" onchange={onImportPicked}>
      </div>
    </div>
  </div>
{/if}
