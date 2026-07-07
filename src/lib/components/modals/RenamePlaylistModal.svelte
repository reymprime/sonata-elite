<script>
  import { ui } from '../../stores/app.svelte.js';
  import { closeRenameModal, executeRenameConfirmed } from '../../actions.svelte.js';

  let name = $state('');
  let inputEl = $state(null);

  // Prefill with the current name and select it, like the original.
  $effect(() => {
    if (ui.modals.rename && ui.renameContext) {
      name = ui.renameContext.currentName;
      requestAnimationFrame(() => {
        if (inputEl) { inputEl.focus(); inputEl.select(); }
      });
    }
  });

  function save() {
    const ok = executeRenameConfirmed(name);
    if (!ok && inputEl) inputEl.focus();
  }
</script>

{#if ui.modals.rename}
  <div class="delete-confirmation-modal" id="modal-rename-playlist">
    <div class="delete-confirmation-box rename-box">
      <h2>Rename Playlist</h2>
      <p>Choose a new name for this playlist.</p>
      <div class="playlist-input-wrapper" style="margin-top:0;">
        <input
          type="text"
          id="input-rename-playlist-name"
          placeholder="Playlist title..."
          maxlength="60"
          autocomplete="off"
          spellcheck="false"
          bind:value={name}
          bind:this={inputEl}
          onkeydown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') closeRenameModal(); }}
        >
      </div>
      <div class="delete-modal-actions">
        <div class="delete-cancel-lnk" id="btn-cancel-rename-close" onclick={closeRenameModal}>Cancel</div>
        <button class="delete-confirm-btn rename-confirm-btn" id="btn-confirm-rename-execute" onclick={save}>Save</button>
      </div>
    </div>
  </div>
{/if}
