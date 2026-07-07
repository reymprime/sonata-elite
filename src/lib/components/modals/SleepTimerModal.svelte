<script>
  import { ui, sleep } from '../../stores/app.svelte.js';
  import {
    selectSleepTimerOption, startSleepTimerSeconds, parseCustomSleepInput,
    toggleSleepAutoClose, clearSleepTimer, formatSleepCountdown
  } from '../../engine.svelte.js';
  import { toast } from '../../stores/app.svelte.js';

  const OPTIONS = [
    { value: '10', label: '10 min' },
    { value: '15', label: '15 min' },
    { value: '30', label: '30 min' },
    { value: '45', label: '45 min' },
    { value: '60', label: '60 min' },
    { value: 'end', label: 'End of track' }
  ];

  let customValue = $state('');

  // Live countdown — sleep.now is ticked by the timeline interval, plus a
  // local 1s tick so the countdown stays live even when nothing is playing.
  let localNow = $state(Date.now());
  $effect(() => {
    if (!ui.modals.sleep) return;
    const t = setInterval(() => { localNow = Date.now(); }, 1000);
    return () => clearInterval(t);
  });

  const statusText = $derived.by(() => {
    void sleep.now; // subscribe to the engine tick as well
    if (sleep.mode === 'end') return 'Music will stop when the current track finishes.';
    if (sleep.endsAt) return `Music stops in ${formatSleepCountdown(sleep.endsAt - localNow)}.`;
    return 'Music will pause automatically once the timer runs out.';
  });

  function isSelected(val) {
    return (sleep.mode === 'end' && val === 'end') || (sleep.mode === parseInt(val, 10));
  }

  function applyCustom() {
    const totalSeconds = parseCustomSleepInput(customValue.trim());
    if (totalSeconds === null) {
      toast('Try: 5 = 5 min, 05 = 5 sec, or mm:ss');
      return;
    }
    customValue = '';
    startSleepTimerSeconds(totalSeconds);
  }
</script>

{#if ui.modals.sleep}
  <div class="delete-confirmation-modal" id="modal-sleep-timer" onclick={(e) => e.target.id === 'modal-sleep-timer' && (ui.modals.sleep = false)}>
    <div class="delete-confirmation-box rename-box">
      <h2>Sleep Timer</h2>
      <p id="sleep-timer-status">{statusText}</p>
      <div class="sleep-timer-grid" id="sleep-timer-options">
        {#each OPTIONS as opt}
          <button class="sleep-timer-option" class:selected={isSelected(opt.value)} onclick={() => selectSleepTimerOption(opt.value)}>{opt.label}</button>
        {/each}
      </div>
      <div class="sleep-custom-row">
        <input
          type="text"
          id="sleep-custom-minutes"
          inputmode="numeric"
          maxlength="6"
          placeholder="5 = 5 min · 05 = 5 sec · 1:30"
          bind:value={customValue}
          oninput={(e) => customValue = e.target.value.replace(/[^\d:]/g, '')}
          onkeydown={(e) => e.key === 'Enter' && applyCustom()}
        >
        <button class="sleep-custom-set-btn" id="btn-set-custom-sleep" onclick={applyCustom}>Set</button>
      </div>
      <div
        class="sleep-autoclose-row"
        id="row-sleep-autoclose"
        class:on={sleep.autoClose}
        role="switch"
        aria-checked={sleep.autoClose}
        tabindex="0"
        onclick={toggleSleepAutoClose}
        onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSleepAutoClose(); } }}
      >
        <div class="sleep-autoclose-label">
          <span>Close app when timer ends</span>
          <small>Sonata pauses, then closes itself</small>
        </div>
        <div class="lux-switch" id="switch-sleep-autoclose"><div class="lux-switch-knob"></div></div>
      </div>
      <div class="delete-modal-actions">
        <div class="delete-cancel-lnk" id="btn-cancel-sleep-timer" onclick={() => ui.modals.sleep = false}>Close</div>
        <button class="delete-confirm-btn rename-confirm-btn" id="btn-clear-sleep-timer" onclick={() => clearSleepTimer(true)}>Turn Off</button>
      </div>
    </div>
  </div>
{/if}
