<script>
  import { ui } from '../../stores/app.svelte.js';
  import { closeDeleteConfirmationModal, executeDeletionConfirmed } from '../../actions.svelte.js';
</script>

{#if ui.modals.deleteConfirm && ui.deleteContext}
  <div class="delete-confirmation-modal" id="modal-delete-confirm">
    <div class="delete-confirmation-box">
      <h2 id="delete-modal-heading">{ui.deleteContext.heading}</h2>
      <p id="delete-modal-message">{ui.deleteContext.message}</p>
      <span class="delete-target-meta" id="lbl-delete-target-title">{ui.deleteContext.targetLabel}</span>
      <div class="delete-modal-actions">
        <div class="delete-cancel-lnk" id="btn-cancel-delete-close" onclick={closeDeleteConfirmationModal}>Cancel</div>
        <button class="delete-confirm-btn" id="btn-confirm-delete-execute" onclick={executeDeletionConfirmed}>Delete</button>
      </div>
    </div>
  </div>
{/if}
