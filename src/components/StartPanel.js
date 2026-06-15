import {createPlane} from './canvasTexture.js?v=20260510-inplacegrid1';
import {bindHoverEffect, bindInteractiveAction} from '../utils/interaction.js?v=20260510-inplacegrid1';

const HERO_FONT = '"Pretendard", "Noto Sans KR", "Apple SD Gothic Neo", sans-serif';

export class StartPanel {
  constructor({theme, onStart}) {
    this.theme = theme || {};
    this.isTransitioning = false;
    this.el = document.createElement('a-entity');
    this.el.id = 'start-panel';
    this.el.setAttribute('position', '0 2.22 -2.02');

    this.contentRoot = document.createElement('a-entity');
    this.contentRoot.id = 'start-hero-root';

    this.titlePlane = createPlane({width: 4.55, height: 0.76, position: '0 0.82 0.74'});
    this.starfieldRoot = this.createDenseStarfieldLandingVisual();
    this.button = createPlane({
      width: 1.18,
      height: 0.34,
      className: 'interactive start-begin-button',
      position: '0 -0.30 0.72'
    });

    bindInteractiveAction(this.button, () => this.start(onStart));
    bindHoverEffect(this.button, {
      activeScale: '1.075 1.075 1',
      onEnter: () => this.renderButton(true),
      onLeave: () => this.renderButton(false)
    });

    this.contentRoot.append(this.starfieldRoot, this.titlePlane, this.button);
    this.el.appendChild(this.contentRoot);
    this.render();
  }

  mount(parent) {
    parent.appendChild(this.el);
  }

  start(onStart) {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.button.classList.remove('interactive');
    this.renderButton(true, '측정 중');
    this.starfieldRoot.setAttribute('animation__visual_expand', 'property: scale; to: 1.08 1.08 1; dur: 340; easing: easeInOutQuad');
    this.starfieldRoot.setAttribute('animation__visual_forward', 'property: position; to: 0 0 0.14; dur: 340; easing: easeInOutQuad');
    this.contentRoot.setAttribute('animation__launch_scale', 'property: scale; to: 1.10 1.10 1.10; dur: 300; easing: easeInOutQuad');
    this.contentRoot.setAttribute('animation__launch_forward', 'property: position; to: 0 0 0.30; dur: 300; easing: easeInOutQuad');
    onStart();
  }

  render() {
    const title = this.theme.heroTitle || this.theme.contentTitle || 'AI 리터러시 측정 퀴즈';
    setTexture(this.titlePlane, createHeroTitleTexture(title));
    this.renderButton(false);
  }

  renderButton(focused = false, label = this.theme.startButtonText || '시작하기') {
    const palette = this.theme.palette || {};
    setTexture(this.button, createBeginTexture({
      label,
      focused,
      accent: palette.sky || '#7dd3fc',
      violet: palette.violet || '#8b5cf6'
    }));
  }

  createDenseStarfieldLandingVisual() {
    const root = document.createElement('a-entity');
    root.id = 'start-dense-starfield';
    root.setAttribute('position', '0 0 0.04');
    return root;
  }

  show() {
    this.isTransitioning = false;
    this.el.setAttribute('visible', 'true');
    this.contentRoot.setAttribute('position', '0 0 0');
    this.contentRoot.setAttribute('scale', '1 1 1');
    this.starfieldRoot.setAttribute('position', '0 0 0.04');
    this.starfieldRoot.setAttribute('scale', '1 1 1');
    this.contentRoot.removeAttribute('animation__launch_scale');
    this.contentRoot.removeAttribute('animation__launch_forward');
    this.starfieldRoot.removeAttribute('animation__visual_expand');
    this.starfieldRoot.removeAttribute('animation__visual_forward');
    this.button.classList.add('interactive');
    this.renderButton(false);
    this.contentRoot.setAttribute('animation__hero_in', 'property: scale; from: 0.96 0.96 0.96; to: 1 1 1; dur: 520; easing: easeOutCubic');
  }

  hide() {
    this.button.classList.remove('interactive');
    this.el.setAttribute('visible', 'false');
  }
}

function setTexture(entity, src) {
  entity.setAttribute('material', {
    shader: 'flat',
    src,
    transparent: true,
    side: 'double'
  });
}

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let mixed = value;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

function createDenseStarfieldTexture({
  seed = 1,
  starCount = 700,
  glow = false,
  streaks = false,
  largeStars = false
} = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = 2200;
  canvas.height = 1200;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const rand = seededRandom(seed);
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  if (glow) {
    ctx.save();
    const core = ctx.createRadialGradient(cx, cy + 52, 10, cx, cy + 52, 560);
    core.addColorStop(0, 'rgba(248, 251, 255, 0.24)');
    core.addColorStop(0.18, 'rgba(125, 211, 252, 0.16)');
    core.addColorStop(0.42, 'rgba(139, 92, 246, 0.085)');
    core.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 52, 700, 330, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    const band = ctx.createLinearGradient(120, cy - 180, canvas.width - 120, cy + 180);
    band.addColorStop(0, 'rgba(37, 99, 235, 0)');
    band.addColorStop(0.26, 'rgba(99, 102, 241, 0.10)');
    band.addColorStop(0.54, 'rgba(248, 251, 255, 0.13)');
    band.addColorStop(0.78, 'rgba(139, 92, 246, 0.10)');
    band.addColorStop(1, 'rgba(37, 99, 235, 0)');
    ctx.translate(cx, cy);
    ctx.rotate(-0.08);
    ctx.fillStyle = band;
    ctx.beginPath();
    ctx.ellipse(0, 18, 930, 116, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  if (streaks) {
    for (let index = 0; index < 52; index += 1) {
      const angle = rand() * Math.PI * 2;
      const dist = 90 + rand() * 720;
      const length = 26 + rand() * 82;
      const x = cx + Math.cos(angle) * dist;
      const y = cy + Math.sin(angle) * dist * 0.56;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      const alpha = 0.08 + rand() * 0.18;
      const gradient = ctx.createLinearGradient(-length / 2, 0, length / 2, 0);
      gradient.addColorStop(0, 'rgba(125, 211, 252, 0)');
      gradient.addColorStop(0.5, `rgba(248, 251, 255, ${alpha})`);
      gradient.addColorStop(1, 'rgba(139, 92, 246, 0)');
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 1 + rand() * 2;
      ctx.beginPath();
      ctx.moveTo(-length / 2, 0);
      ctx.lineTo(length / 2, 0);
      ctx.stroke();
      ctx.restore();
    }
  }

  const colors = ['#ffffff', '#bfefff', '#d9d6ff', '#cab4ff', '#8ec5ff', '#ffe7b0'];
  for (let index = 0; index < starCount; index += 1) {
    const clusterBias = rand();
    const angle = rand() * Math.PI * 2;
    const radius = clusterBias < 0.58 ? Math.pow(rand(), 0.72) * 980 : rand() * 1180;
    const x = clusterBias < 0.58 ? cx + Math.cos(angle) * radius : rand() * canvas.width;
    const y = clusterBias < 0.58 ? cy + Math.sin(angle) * radius * 0.52 : rand() * canvas.height;
    const size = (largeStars ? 1.1 : 0.55) + Math.pow(rand(), 2.6) * (largeStars ? 7.4 : 4.1);
    const color = colors[Math.floor(rand() * colors.length)];
    const alpha = 0.26 + rand() * (largeStars ? 0.64 : 0.54);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowColor = color;
    ctx.shadowBlur = size * (largeStars ? 3.2 : 2.2);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();

    if (size > 3.5 || (largeStars && rand() > 0.88)) {
      ctx.globalAlpha = alpha * 0.58;
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1, size * 0.28);
      ctx.beginPath();
      ctx.moveTo(x - size * 3.4, y);
      ctx.lineTo(x + size * 3.4, y);
      ctx.moveTo(x, y - size * 3.4);
      ctx.lineTo(x, y + size * 3.4);
      ctx.stroke();
    }
    ctx.restore();
  }

  return canvas.toDataURL('image/png');
}

function createHeroTitleTexture(title) {
  const canvas = document.createElement('canvas');
  canvas.width = 2200;
  canvas.height = 360;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const gradient = ctx.createLinearGradient(0, 42, 0, 282);
  gradient.addColorStop(0, '#ff78b7');
  gradient.addColorStop(0.48, '#8b5cf6');
  gradient.addColorStop(1, '#5eead4');

  const titleText = String(title || '').trim();
  const hasKorean = /[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(titleText);
  const fontSize = hasKorean ? 118 : 132;
  const tracking = hasKorean ? 10 : 48;
  const y = hasKorean ? 92 : 78;

  ctx.save();
  ctx.globalAlpha = 0.24;
  ctx.fillStyle = '#ffffff';
  ctx.filter = 'blur(18px)';
  drawTrackingText(ctx, titleText.toUpperCase(), canvas.width / 2, y + 6, fontSize + 6, tracking, '900');
  ctx.restore();

  ctx.save();
  ctx.fillStyle = gradient;
  ctx.shadowColor = 'rgba(125, 211, 252, 0.28)';
  ctx.shadowBlur = 28;
  drawTrackingText(ctx, titleText.toUpperCase(), canvas.width / 2, y, fontSize, tracking, '900');
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.17)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(240, 290);
  ctx.quadraticCurveTo(1100, 214, 1960, 290);
  ctx.stroke();
  ctx.restore();

  return canvas.toDataURL('image/png');
}

function createBeginTexture({label, focused, accent, violet}) {
  const canvas = document.createElement('canvas');
  canvas.width = 780;
  canvas.height = 270;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const rect = {x: 64, y: 44, width: canvas.width - 128, height: 160};
  const gradient = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.height);
  gradient.addColorStop(0, focused ? '#1f2937' : '#17191f');
  gradient.addColorStop(1, focused ? '#05080e' : '#07090d');

  ctx.save();
  ctx.shadowColor = focused ? 'rgba(125, 211, 252, 0.58)' : 'rgba(255, 255, 255, 0.18)';
  ctx.shadowBlur = focused ? 34 : 20;
  ctx.shadowOffsetY = 10;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.82)';
  roundRect(ctx, rect.x, rect.y, rect.width, rect.height, 38);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = gradient;
  roundRect(ctx, rect.x, rect.y, rect.width, rect.height, 38);
  ctx.fill();
  ctx.strokeStyle = focused ? accent : 'rgba(255, 255, 255, 0.76)';
  ctx.lineWidth = focused ? 5 : 4;
  ctx.stroke();

  const sweep = ctx.createLinearGradient(rect.x, 0, rect.x + rect.width, 0);
  sweep.addColorStop(0, violet);
  sweep.addColorStop(0.55, '#ffffff');
  sweep.addColorStop(1, accent);
  ctx.font = `900 ${focused ? 58 : 54}px ${HERO_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = sweep;
  ctx.fillText(String(label || '시작하기').toUpperCase(), canvas.width / 2, rect.y + rect.height / 2 + 4);

  return canvas.toDataURL('image/png');
}

function drawTrackingText(ctx, text, centerX, y, size, tracking, weight) {
  const chars = Array.from(text);
  ctx.font = `${weight} ${size}px ${HERO_FONT}`;
  ctx.textBaseline = 'top';
  const totalWidth = chars.reduce((sum, char) => sum + ctx.measureText(char).width, 0) + tracking * Math.max(0, chars.length - 1);
  let x = centerX - totalWidth / 2;
  chars.forEach((char) => {
    ctx.fillText(char, x, y);
    x += ctx.measureText(char).width + tracking;
  });
}

function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}
