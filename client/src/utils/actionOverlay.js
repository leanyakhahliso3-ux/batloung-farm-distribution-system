let activeTrigger = null;

export function registerActionOverlayTrigger(trigger) {
  activeTrigger = trigger;
}

export function triggerActionOverlay(label = 'Loading') {
  if (typeof activeTrigger === 'function') {
    activeTrigger(label);
  }
}
