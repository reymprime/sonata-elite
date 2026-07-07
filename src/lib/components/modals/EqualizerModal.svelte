<script>
  import { ui, eq, isCurrentTrackLocal, player } from '../../stores/app.svelte.js';
  import {
    toggleEqualizer, setEqBand, applyEqPreset, detectActiveEqPreset, EQ_PRESETS
  } from '../../engine.svelte.js';

  const FREQ_LABELS = ['60', '230', '910', '3.6k', '14k'];
  const PRESET_LABELS = {
    flat: 'Flat', bass: 'Bass Boost', vocal: 'Vocal',
    treble: 'Treble', electronic: 'Electronic', rock: 'Rock'
  };

  const contextNote = $derived(
    isCurrentTrackLocal() || player.pointer === -1
      ? 'Shapes offline vault playback'
      : "YouTube streams can't be EQ'd — plays flat. Offline songs get the full effect."
  );
</script>

{#if ui.modals.eq}
  <div class="settings-modal" id="modal-equalizer" onclick={(e) => e.target.id === 'modal-equalizer' && (ui.modals.eq = false)}>
    <div class="playlist-modal-content eq-shell">
      <div class="vault-header">
        <div>
          <h3 style="font-weight: 800; font-size: 20px; letter-spacing: -0.5px;">Equalizer</h3>
          <p style="font-size: 12px; color: var(--text-muted); margin-top: 2px;" id="eq-context-note">{contextNote}</p>
        </div>
        <button class="icon-btn" id="btn-close-eq" style="width:36px; height:36px;" onclick={() => ui.modals.eq = false} aria-label="Close equalizer">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>

      <div
        class="sleep-autoclose-row"
        id="row-eq-enabled"
        class:on={eq.enabled}
        role="switch"
        aria-checked={eq.enabled}
        tabindex="0"
        onclick={toggleEqualizer}
        onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleEqualizer(); } }}
      >
        <div class="sleep-autoclose-label">
          <span>Enable equalizer</span>
          <small>Applies to songs from your offline vault</small>
        </div>
        <div class="lux-switch" id="switch-eq-enabled"><div class="lux-switch-knob"></div></div>
      </div>

      <div class="eq-bands" id="eq-bands-rack" class:eq-rack-off={!eq.enabled}>
        {#each FREQ_LABELS as freq, i}
          <div class="eq-band">
            <span class="eq-db">{(eq.gains[i] > 0 ? '+' : '') + eq.gains[i]}</span>
            <div class="eq-slider-shaft">
              <input type="range" min="-12" max="12" step="1" value={eq.gains[i]} oninput={(e) => setEqBand(i, parseInt(e.target.value, 10))}>
            </div>
            <span class="eq-freq">{freq}</span>
          </div>
        {/each}
      </div>

      <div class="eq-presets" id="eq-presets-row">
        {#each Object.keys(EQ_PRESETS) as preset}
          <button
            class="sleep-timer-option eq-preset"
            class:selected={eq.enabled && detectActiveEqPreset() === preset}
            onclick={() => applyEqPreset(preset)}
          >{PRESET_LABELS[preset]}</button>
        {/each}
      </div>
    </div>
  </div>
{/if}
