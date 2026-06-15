import {applyTexture, createPlane} from './canvasTexture.js?v=20260510-inplacegrid1';
import {bindHoverEffect, bindInteractiveAction} from '../utils/interaction.js?v=20260510-inplacegrid1';

const STATUS_STYLE = {
  idle: {
    background: '#06111f',
    border: '#25435f',
    accent: '#2563eb',
    textColor: '#f8fbff'
  },
  hover: {
    background: '#091a2d',
    border: '#60a5fa',
    accent: '#2563eb',
    textColor: '#f8fbff'
  },
  selected: {
    background: '#0f233a',
    border: '#fbbf24',
    accent: '#fbbf24',
    textColor: '#fff7db'
  },
  correct: {
    background: '#062016',
    border: '#21a66b',
    accent: '#21a66b',
    textColor: '#eafff4'
  },
  wrong: {
    background: '#260b12',
    border: '#de4d5a',
    accent: '#de4d5a',
    textColor: '#fff0f2'
  }
};

function createStatusStyle(status, accent = '#2563eb') {
  if (status === 'correct') {
    return {
      background: '#062016',
      border: '#20a66b',
      accent: '#20a66b',
      textColor: '#eafff4'
    };
  }
  if (status === 'wrong') {
    return {
      background: '#260b12',
      border: '#d94a58',
      accent: '#d94a58',
      textColor: '#fff0f2'
    };
  }
  if (status === 'selected') {
    return {
      background: '#0f233a',
      border: accent,
      accent,
      textColor: '#f8fbff'
    };
  }
  if (status === 'hover') {
    return {
      background: '#091a2d',
      border: accent,
      accent,
      textColor: '#f8fbff'
    };
  }
  return {
    ...STATUS_STYLE.idle,
    accent
  };
}

export function createChoiceButton(index, onSelect) {
  const button = createPlane({
    width: 2.35,
    height: 0.24,
    className: 'interactive choice-button'
  });
  const focusHalo = createChoiceFocusHalo();

  button.dataset.choiceIndex = String(index);
  button.dataset.locked = 'false';
  button._focusHalo = focusHalo;
  button.appendChild(focusHalo);
  bindInteractiveAction(button, (event) => {
    pulseChoiceFocusHalo(button);
    onSelect(index, event);
  });

  bindHoverEffect(button, {
    activeScale: '1.035 1.035 1',
    onEnter: () => {
      if (button.dataset.locked === 'true' || button.dataset.status !== 'idle') return;
      setChoiceButtonState(button, button.dataset.label || '', 'hover');
    },
    onLeave: () => {
      if (button.dataset.locked === 'true' || button.dataset.status !== 'hover') return;
      setChoiceButtonState(button, button.dataset.label || '', 'idle');
    }
  });

  setChoiceButtonState(button, '', 'idle');
  return button;
}

export function setChoiceButtonState(button, label, status = 'idle') {
  const style = createStatusStyle(status, button.dataset.accent || STATUS_STYLE.idle.accent);
  const cleanLabel = normalizeChoiceLabel(label);
  button.dataset.label = label;
  button.dataset.status = status;
  updateChoiceFocusHalo(button, status, style.accent);

  applyTexture(button, {
    variant: 'choice',
    width: 840,
    height: 320,
    background: style.background,
    border: style.border,
    accent: style.accent,
    title: cleanLabel,
    choiceNumber: Number(button.dataset.choiceIndex || 0) + 1,
    status,
    textColor: style.textColor,
    titleSize: 31,
    titleMinSize: 23,
    titleMaxLines: 3
  });
}

function createChoiceFocusHalo() {
  const halo = document.createElement('a-ring');
  halo.setAttribute('radius-inner', '0.074');
  halo.setAttribute('radius-outer', '0.084');
  halo.setAttribute('segments-theta', '72');
  halo.setAttribute('position', '0.63 0 0.035');
  halo.setAttribute('material', 'color: #2563eb; shader: flat; transparent: true; opacity: 0.0; side: double');
  halo.setAttribute('visible', 'false');
  return halo;
}

function updateChoiceFocusHalo(button, status, accent) {
  const halo = button._focusHalo;
  if (!halo) return;
  const visible = ['hover', 'selected', 'correct', 'wrong'].includes(status);
  const opacity = status === 'hover' ? 0.86 : status === 'selected' ? 0.72 : status === 'correct' || status === 'wrong' ? 0.58 : 0;
  halo.setAttribute('visible', visible ? 'true' : 'false');
  halo.setAttribute('material', `color: ${accent}; shader: flat; transparent: true; opacity: ${opacity}; side: double`);
  halo.setAttribute('scale', status === 'hover' ? '1.18 1.18 1' : '1 1 1');
}

function pulseChoiceFocusHalo(button) {
  const halo = button._focusHalo;
  if (!halo) return;
  halo.setAttribute('visible', 'true');
  halo.setAttribute('animation__pulse', 'property: scale; from: 0.86 0.86 1; to: 1.28 1.28 1; dur: 130; easing: easeOutQuad');
}

function normalizeChoiceLabel(label) {
  return String(label || '')
    .replace(/^(정답|오답)\s*/, '')
    .replace(/^\d+\.\s*/, '');
}
