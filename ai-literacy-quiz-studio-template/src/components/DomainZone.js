import {applyTexture, createPlane} from './canvasTexture.js?v=20260510-inplacegrid1';
import {bindInteractiveAction} from '../utils/interaction.js?v=20260510-inplacegrid1';

const DOMAIN_ACCENTS = {
  engaging: '#2563eb',
  creating: '#8b5cf6',
  managing: '#16a34a',
  designing: '#f97316'
};

export function createDomainZone(domain, stats, transform, theme, onStart) {
  const zone = document.createElement('a-entity');
  zone.id = `domain-zone-${domain.id}`;
  zone.dataset.domainId = domain.id;
  zone.setAttribute('position', `${transform.x} ${transform.y} ${transform.z}`);
  zone.setAttribute('rotation', `0 ${transform.ry} 0`);

  const domainTheme = theme.domains?.[domain.id] || {};
  const accent = domainTheme.accent || DOMAIN_ACCENTS[domain.id] || '#2563eb';

  const glow = createPlane({
    width: 1.72,
    height: 1.2,
    position: '0 0 -0.028'
  });
  glow.setAttribute('material', `shader: flat; color: ${accent}; opacity: 0.12; transparent: true; side: double`);

  const panel = createPlane({
    width: 1.55,
    height: 1.02,
    className: 'interactive domain-zone',
    position: '0 0 0.006'
  });

  const startButton = createPlane({
    width: 0.58,
    height: 0.17,
    className: 'interactive domain-start',
    position: '0.36 -0.36 0.018'
  });

  const plinth = document.createElement('a-box');
  plinth.setAttribute('width', '1.48');
  plinth.setAttribute('height', '0.035');
  plinth.setAttribute('depth', '0.045');
  plinth.setAttribute('position', '0 -0.55 0');
  plinth.setAttribute('material', `color: ${accent}; opacity: 0.72; transparent: true; roughness: 0.42`);

  const focus = () => {
    zone.setAttribute('animation__focus', 'property: scale; to: 1.045 1.045 1.045; dur: 140; easing: easeOutQuad');
    glow.setAttribute('material', `shader: flat; color: ${accent}; opacity: 0.24; transparent: true; side: double`);
  };
  const blur = () => {
    zone.setAttribute('animation__focus', 'property: scale; to: 1 1 1; dur: 140; easing: easeOutQuad');
    glow.setAttribute('material', `shader: flat; color: ${accent}; opacity: 0.12; transparent: true; side: double`);
  };

  [panel, startButton].forEach((target) => {
    bindInteractiveAction(target, () => onStart(domain.id));
    target.addEventListener('mouseenter', focus);
    target.addEventListener('mouseleave', blur);
  });

  zone.appendChild(glow);
  zone.appendChild(panel);
  zone.appendChild(startButton);
  zone.appendChild(plinth);
  updateDomainZone(zone, domain, stats, theme);
  return zone;
}

export function updateDomainZone(zone, domain, stats, theme = {}) {
  zone.dataset.answered = String(stats.answered);
  zone.dataset.total = String(stats.total);
  zone.dataset.complete = String(stats.complete);
  const panel = zone.classList?.contains('domain-zone') ? zone : zone.querySelector('.domain-zone');
  const startButton = zone.querySelector ? zone.querySelector('.domain-start') : null;
  const palette = theme.palette || {};
  const tokens = theme.ui || {};
  const domainTheme = theme.domains?.[domain.id] || {};
  const accent = domainTheme.accent || DOMAIN_ACCENTS[domain.id] || '#2563eb';
  const accentSoft = domainTheme.accentSoft || '#e8f2ff';
  const icon = domainTheme.icon || domainTheme.shortLabel || domain.id.toUpperCase();
  const progressText = `${stats.answered}/${stats.total} 완료 · 정답 ${stats.correct}`;
  const footer = stats.complete ? '완료됨 · 복습 가능' : '스테이션 시작';

  applyTexture(panel, {
    width: 900,
    height: 620,
    background: stats.complete ? '#f6fdf9' : palette.surfaceElevated || '#fbfdff',
    border: stats.complete ? '#b8e7cf' : palette.line || '#c9d8e6',
    accent,
    icon,
    subtitle: domain.title,
    title: domain.titleKo,
    body: domain.description,
    footer,
    progress: {
      value: stats.total ? stats.answered / stats.total : 0,
      label: progressText
    },
    chips: [domainTheme.shortLabel || domain.titleKo],
    textColor: '#17324c',
    mutedColor: '#4a6882',
    glass: true,
    tokens,
    titleSize: 44,
    bodySize: 27,
    footerSize: 25
  });

  if (startButton) {
    applyTexture(startButton, {
      variant: 'button',
      width: 430,
      height: 150,
      background: stats.complete ? '#f6fdf9' : accent,
      border: accent,
      accent,
      title: stats.complete ? '복습' : '시작',
      textColor: stats.complete ? '#10243a' : '#ffffff',
      align: 'center',
      radius: 28,
      titleSize: 32,
      tokens
    });
  }
}
