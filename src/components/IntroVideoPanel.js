import {applyTexture, createPlane} from './canvasTexture.js?v=20260604-videofit3';
import {bindHoverEffect, bindInteractiveAction} from '../utils/interaction.js?v=20260604-videofit3';

export class IntroVideoPanel {
  constructor({theme, videoConfig, onConfirm}) {
    this.theme = theme || {};
    this.videoConfig = normaliseIntroVideo(videoConfig);
    this.onConfirm = onConfirm;
    this.videoAsset = null;
    this.videoAssetUrl = '';
    this.isPlaying = false;

    this.el = document.createElement('a-entity');
    this.el.id = 'intro-video-panel';
    this.el.setAttribute('position', '0 2.48 -3.18');
    this.el.setAttribute('visible', 'false');

    this.panel = createPlane({
      id: 'intro-video-info',
      width: 2.70,
      height: 2.28,
      position: '0 0.06 0.04'
    });

    this.videoPlane = document.createElement('a-video');
    this.videoPlane.id = 'intro-video-player';
    this.videoPlane.classList.add('interactive');
    this.videoPlane.setAttribute('width', '2.30');
    this.videoPlane.setAttribute('height', '1.29');
    this.videoPlane.setAttribute('position', '0 -0.36 0.12');
    this.videoPlane.setAttribute('visible', 'false');

    this.playButton = createPlane({
      id: 'intro-video-play-button',
      width: 0.82,
      height: 0.22,
      className: 'interactive intro-video-play',
      position: '-0.48 -1.30 0.18'
    });
    this.confirmButton = createPlane({
      id: 'intro-video-confirm-button',
      width: 0.92,
      height: 0.22,
      className: 'interactive intro-video-confirm',
      position: '0.50 -1.30 0.18'
    });

    bindInteractiveAction(this.videoPlane, () => this.toggleVideo());
    bindInteractiveAction(this.playButton, () => this.toggleVideo());
    bindInteractiveAction(this.confirmButton, () => this.confirm());
    [this.videoPlane, this.playButton, this.confirmButton].forEach((button) => {
      bindHoverEffect(button, {activeScale: '1.045 1.045 1'});
    });

    this.el.append(this.panel, this.videoPlane, this.playButton, this.confirmButton);
    this.render();
  }

  mount(parent) {
    parent.appendChild(this.el);
  }

  attachVideoAsset(assetsRoot) {
    if (!assetsRoot || !this.videoConfig.url || this.videoAsset) return;
    const video = document.createElement('video');
    video.id = 'intro-video-asset';
    this.videoAssetUrl = this.videoConfig.url;
    video.dataset.src = this.videoAssetUrl;
    video.crossOrigin = 'anonymous';
    video.setAttribute('playsinline', 'true');
    video.setAttribute('webkit-playsinline', 'true');
    video.preload = 'none';
    video.addEventListener('ended', () => {
      this.isPlaying = false;
      this.renderButtons();
    });
    assetsRoot.appendChild(video);
    this.videoAsset = video;
    this.videoPlane.setAttribute('src', '#intro-video-asset');
    this.videoPlane.setAttribute('visible', 'true');
  }

  show() {
    this.el.setAttribute('visible', 'true');
    this.el.setAttribute('scale', '0.96 0.96 0.96');
    this.el.setAttribute('animation__open', 'property: scale; to: 1 1 1; dur: 220; easing: easeOutCubic');
    this.render();
  }

  hide() {
    this.pauseVideo();
    this.el.setAttribute('visible', 'false');
  }

  toggleVideo() {
    if (!this.videoAsset) return;
    if (this.isPlaying) {
      this.pauseVideo();
      return;
    }
    this.loadVideoOnDemand();
    const result = this.videoAsset.play();
    this.isPlaying = true;
    this.renderButtons();
    if (result && typeof result.catch === 'function') {
      result.catch(() => {
        this.isPlaying = false;
        this.renderButtons();
      });
    }
  }

  pauseVideo() {
    if (!this.videoAsset) return;
    this.videoAsset.pause();
    this.isPlaying = false;
    this.renderButtons();
  }

  confirm() {
    this.pauseVideo();
    this.onConfirm?.();
  }

  loadVideoOnDemand() {
    if (!this.videoAsset || this.videoAsset.src || !this.videoAssetUrl) return;
    this.videoAsset.src = this.videoAssetUrl;
    this.videoAsset.load();
  }

  render() {
    const palette = this.theme.palette || {};
    const config = this.videoConfig;
    const accent = config.accent || palette.sky || '#62c6f2';
    const hasVideo = Boolean(config.url);
    applyTexture(this.panel, {
      variant: 'panel',
      width: 1400,
      height: 1180,
      background: '#06111f',
      border: accent,
      accent,
      subtitle: config.kicker || '사전 영상',
      title: config.title || '먼저 영상을 확인하세요',
      body: config.description || '영상을 본 뒤 교실 속 마커를 찾아 문제를 해결합니다.',
      footer: hasVideo
        ? '아래 영상이 끝나면 확인 완료를 눌러 활동을 시작하세요.'
        : '영상 파일을 넣지 않은 경우 확인 완료를 누르면 활동이 시작됩니다.',
      icon: 'VIDEO',
      textColor: '#f8fbff',
      mutedColor: '#bcd4e9',
      titleSize: 46,
      titleMaxLines: 2,
      bodySize: 28,
      bodyMaxLines: 2,
      footerSize: 22,
      tokens: this.theme.ui || {}
    });
    this.videoPlane.setAttribute('visible', hasVideo ? 'true' : 'false');
    this.playButton.setAttribute('visible', hasVideo ? 'true' : 'false');
    this.renderButtons();
  }

  renderButtons() {
    const palette = this.theme.palette || {};
    const accent = this.videoConfig.accent || palette.sky || '#62c6f2';
    applyTexture(this.playButton, {
      variant: 'button',
      width: 540,
      height: 150,
      background: this.isPlaying ? '#172235' : '#0b2034',
      border: accent,
      accent,
      title: this.isPlaying ? '일시정지' : '영상 재생',
      textColor: '#f8fbff',
      titleSize: 27,
      tokens: this.theme.ui || {}
    });
    applyTexture(this.confirmButton, {
      variant: 'button',
      width: 620,
      height: 150,
      background: '#111827',
      border: accent,
      accent,
      title: this.videoConfig.confirmText || '영상 확인 완료',
      textColor: '#f8fbff',
      titleSize: 26,
      tokens: this.theme.ui || {}
    });
  }
}

function normaliseIntroVideo(config = {}) {
  const source = config && typeof config === 'object' ? config : {};
  return {
    enabled: source.enabled !== false,
    type: source.type || 'mp4',
    url: String(source.url || '').trim(),
    title: source.title || '먼저 영상을 확인하세요',
    kicker: source.kicker || '사전 영상',
    description: source.description || '영상을 본 뒤 교실 속 마커를 찾아 문제를 해결합니다.',
    confirmText: source.confirmText || '영상 확인 완료',
    requiredBeforeQuiz: source.requiredBeforeQuiz !== false,
    accent: source.accent || ''
  };
}
