<script>
  import { ui } from '../../stores/app.svelte.js';
</script>

{#if ui.modals.ownerCredit}
  <div class="owner-credit-modal" id="modal-owner-credit" onclick={(e) => e.target.id === 'modal-owner-credit' && (ui.modals.ownerCredit = false)}>
    <div class="owner-credit-box">
      <div class="owner-credit-icon">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l2.9 6.26L21 9.27l-4.5 4.39L17.8 21 12 17.77 6.2 21l1.3-7.34L3 9.27l6.1-1.01L12 2z"></path></svg>
      </div>
      <p class="owner-credit-text">This web app was designed and modified exclusively for its owner:</p>
      <h2 class="owner-credit-name">Reymark Delagao</h2>
      <div class="delete-cancel-lnk" id="btn-close-owner-credit" style="width:100%; flex:none;" onclick={() => ui.modals.ownerCredit = false}>Close</div>
    </div>
  </div>
{/if}
