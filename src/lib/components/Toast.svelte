<script>
  import { ui } from '../stores/app.svelte.js';
</script>

{#if ui.toast.msg}
  {#key ui.toast.key}
    <div class="toast-container">{ui.toast.msg}</div>
  {/key}
{/if}
