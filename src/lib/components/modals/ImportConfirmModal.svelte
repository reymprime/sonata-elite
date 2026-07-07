<script>
  import { ui } from '../../stores/app.svelte.js';
  import { closeImportConfirmModal, confirmImportLibrary } from '../../actions.svelte.js';
</script>

{#if ui.modals.importConfirm}
  <div class="delete-confirmation-modal" id="modal-import-confirm" onclick={(e) => e.target.id === 'modal-import-confirm' && closeImportConfirmModal()}>
    <div class="delete-confirmation-box">
      <h2>Import Library?</h2>
      <p>This will replace your current tracks and playlists with the backup file's contents. This can't be undone.</p>
      <span class="delete-target-meta" id="import-summary-text">{ui.importSummary}</span>
      <div class="delete-modal-actions">
        <div class="delete-cancel-lnk" id="btn-cancel-import" onclick={closeImportConfirmModal}>Cancel</div>
        <button class="delete-confirm-btn" id="btn-confirm-import" onclick={confirmImportLibrary}>Replace</button>
      </div>
    </div>
  </div>
{/if}
