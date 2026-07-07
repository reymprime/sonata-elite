// ============================================================
// GESTURES — Svelte `use:` actions.
// Carries over two hard-won fixes from the original build:
//  1. Swipe: pointer capture is only taken AFTER movement passes
//     the deadzone, so a plain tap still clicks the nested
//     track-main instead of being retargeted by capture.
//  2. Drag-reorder: capture lives on the handle (which never
//     moves in the DOM), because moving the strip mid-drag
//     detaches + re-adds the node and browsers silently release
//     capture on detach.
// ============================================================

// --- SWIPE: right to favorite, left to delete ---
export function swipe(content, { onFavorite, onDelete }) {
  const THRESHOLD = 72;
  const MAX_SWIPE = 104;
  const DEADZONE = 8; // ignore tiny jitter so a plain tap isn't mistaken for a swipe
  let startX = 0;
  let deltaX = 0;
  let pointerActive = false; // from pointerdown until release
  let dragging = false;      // only true once real horizontal movement is confirmed
  let capturedId = null;

  function down(e) {
    if (e.target.closest('.strip-control-btn') || e.target.closest('.track-progress-bar') || e.target.closest('.drag-handle')) return;
    pointerActive = true;
    dragging = false;
    startX = e.clientX;
    deltaX = 0;
    capturedId = e.pointerId;
    content.style.transition = 'none';
    // Deliberately NOT capturing the pointer here — see header comment.
  }

  function move(e) {
    if (!pointerActive) return;
    const rawDelta = e.clientX - startX;
    if (!dragging) {
      if (Math.abs(rawDelta) < DEADZONE) return;
      dragging = true;
      try { content.setPointerCapture(capturedId); } catch {}
    }
    deltaX = rawDelta;
    const clamped = Math.max(-MAX_SWIPE, Math.min(MAX_SWIPE, deltaX));
    content.style.transform = `translateX(${clamped}px)`;
  }

  function release() {
    if (!pointerActive) return;
    pointerActive = false;
    content.style.transition = '';
    content.style.transform = 'translateX(0)';
    if (dragging) {
      if (deltaX > THRESHOLD) onFavorite();
      else if (deltaX < -THRESHOLD) onDelete();
    }
    dragging = false;
    deltaX = 0;
  }

  content.addEventListener('pointerdown', down);
  content.addEventListener('pointermove', move);
  content.addEventListener('pointerup', release);
  content.addEventListener('pointercancel', release);

  return {
    destroy() {
      content.removeEventListener('pointerdown', down);
      content.removeEventListener('pointermove', move);
      content.removeEventListener('pointerup', release);
      content.removeEventListener('pointercancel', release);
    }
  };
}

// --- DRAG TO REORDER: only active while viewing a specific playlist ---
// Instead of moving DOM nodes (the vanilla approach), the release handler
// computes the drop index from sibling midpoints and reports the new id
// order — Svelte then re-renders from the reordered array.
export function dragReorder(handle, { stripEl, trackId, getContainer, onReorder }) {
  let state = null;

  function down(e) {
    e.preventDefault();
    e.stopPropagation();
    state = { startY: e.clientY };
    stripEl().classList.add('drag-lifted');
    try { handle.setPointerCapture(e.pointerId); } catch {}
  }

  function move(e) {
    if (!state) return;
    const deltaY = e.clientY - state.startY;
    stripEl().style.transform = `translateY(${deltaY}px) scale(1.02)`;
  }

  function release(e) {
    if (!state) return;
    const el = stripEl();
    el.classList.remove('drag-lifted');
    el.style.transform = '';

    const container = getContainer();
    if (container) {
      const allStrips = Array.from(container.querySelectorAll('.track-strip'));
      const siblings = allStrips.filter((s) => s !== el);
      const pointerY = e.clientY;
      // Build the new visual id order: insert the dragged id before the
      // first sibling whose midpoint is below the pointer.
      const order = [];
      let inserted = false;
      for (const sib of siblings) {
        const rect = sib.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        if (!inserted && pointerY < midY) {
          order.push(trackId);
          inserted = true;
        }
        order.push(sib.dataset.trackId);
      }
      if (!inserted) order.push(trackId);
      onReorder(order);
    }
    state = null;
  }

  handle.addEventListener('pointerdown', down);
  handle.addEventListener('pointermove', move);
  handle.addEventListener('pointerup', release);
  handle.addEventListener('pointercancel', release);

  return {
    destroy() {
      handle.removeEventListener('pointerdown', down);
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', release);
      handle.removeEventListener('pointercancel', release);
    }
  };
}
