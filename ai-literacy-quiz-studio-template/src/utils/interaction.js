const ACTIVATION_DEBOUNCE_MS = 180;

function isActuallyVisible(entity) {
  let current = entity;
  while (current) {
    const visibleAttr = current.getAttribute?.('visible');
    if (visibleAttr === false || visibleAttr === 'false') return false;
    if (current.object3D && current.object3D.visible === false) return false;
    current = current.parentElement;
  }
  return true;
}

export function bindInteractiveAction(entity, handler, options = {}) {
  const {
    shouldHandle = () => true,
    stopPropagation = true,
    events = ['click', 'mousedown', 'touchstart']
  } = options;

  const activate = (event) => {
    if (entity.dataset.locked === 'true' || !isActuallyVisible(entity) || !shouldHandle(event)) return;

    const now = performance.now();
    const lastActivatedAt = Number(entity.dataset.lastActivatedAt || 0);
    if (now - lastActivatedAt < ACTIVATION_DEBOUNCE_MS) return;
    entity.dataset.lastActivatedAt = String(now);
    entity.dataset.lastEventType = event.type;

    if (event.cancelable) event.preventDefault();
    if (stopPropagation) event.stopPropagation();
    handler(event);
  };

  events.forEach((eventName) => {
    entity.addEventListener(eventName, activate);
  });

  return activate;
}

export function bindHoverEffect(entity, options = {}) {
  const {
    activeScale = '1.04 1.04 1',
    idleScale = '1 1 1',
    onEnter = () => {},
    onLeave = () => {}
  } = options;

  entity.addEventListener('mouseenter', () => {
    if (entity.dataset.locked === 'true') return;
    entity.setAttribute('animation__hover', `property: scale; to: ${activeScale}; dur: 120; easing: easeOutQuad`);
    onEnter();
  });

  entity.addEventListener('mouseleave', () => {
    if (entity.dataset.locked === 'true') return;
    entity.setAttribute('animation__hover', `property: scale; to: ${idleScale}; dur: 120; easing: easeOutQuad`);
    onLeave();
  });
}
