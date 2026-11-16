import { CONFIG, TOWER_TYPES } from './config.js';

// Input reports intentions only. The controller owns validation and all world mutations.
export function bindInput(canvas, root, actions) {
  const pointer = { x: 0, y: 0, inside: false };
  const listeners = [];
  const on = (target, event, handler) => {
    target.addEventListener(event, handler);
    listeners.push(() => target.removeEventListener(event, handler));
  };
  const position = (event) => {
    const bounds = canvas.getBoundingClientRect();
    pointer.x = (event.clientX - bounds.left) * CONFIG.width / bounds.width;
    pointer.y = (event.clientY - bounds.top) * CONFIG.height / bounds.height;
    pointer.inside = pointer.x >= 0 && pointer.x <= CONFIG.width && pointer.y >= 0 && pointer.y <= CONFIG.height;
    actions.pointer?.(pointer);
  };
  on(canvas, 'pointermove', position);
  on(canvas, 'pointerleave', () => { pointer.inside = false; actions.pointer?.(pointer); });
  on(canvas, 'pointerdown', (event) => {
    if (event.button !== 0) return;
    position(event);
    canvas.focus({ preventScroll: true });
    actions.interact(pointer.x, pointer.y);
  });
  on(window, 'keydown', (event) => {
    if (event.target instanceof HTMLElement &&
        (event.target.matches('input, textarea, select') || event.target.isContentEditable)) return;
    // Let native focused buttons handle Enter/Space without a second controller action.
    if (event.target instanceof HTMLButtonElement && ['Enter', 'Space'].includes(event.code)) return;
    const selection = ['Digit1', 'Digit2', 'Digit3'].indexOf(event.code);
    const handled = selection >= 0 || ['Escape', 'KeyP', 'KeyM', 'Space', 'Enter', 'KeyX', 'KeyT'].includes(event.code);
    if (!handled) return;
    event.preventDefault();
    if (event.repeat) return;
    if (selection >= 0) actions.selectTower(TOWER_TYPES[selection]);
    else if (event.code === 'Escape' || event.code === 'KeyP') actions.pause();
    else if (event.code === 'KeyM') actions.mute();
    else if (event.code === 'KeyX') actions.sell?.();
    else if (event.code === 'KeyT') actions.target?.();
    else actions.primary();
  });
  on(root, 'click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button || button.disabled) return;
    const name = button.dataset.action;
    if (name === 'tower') actions.selectTower(button.dataset.tower);
    else actions[name]?.();
  });
  on(window, 'blur', () => actions.pause(true));
  on(document, 'visibilitychange', () => { if (document.hidden) actions.pause(true); });
  return { pointer, destroy() { listeners.forEach((remove) => remove()); } };
}
