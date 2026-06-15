import {applyTexture, createPlane} from './canvasTexture.js?v=20260510-inplacegrid1';
import {bindHoverEffect, bindInteractiveAction} from '../utils/interaction.js?v=20260510-inplacegrid1';

export class ResultPanel {
  constructor({theme, onRestart, onBack}) {
    this.theme = theme || {};
    this.el = document.createElement('a-entity');
    this.el.id = 'result-panel';
    this.el.setAttribute('position', '0 2.30 -2.12');
    this.el.setAttribute('visible', 'false');

    this.summaryPlane = createPlane({width: 2.08, height: 1.18, position: '0 0 0'});
    this.backButton = createPlane({
      width: 0.66,
      height: 0.17,
      className: 'interactive',
      position: '0.54 -0.43 0.07'
    });
    bindInteractiveAction(this.backButton, onBack || (() => {}));
    bindHoverEffect(this.backButton, {activeScale: '1.04 1.04 1'});

    this.el.appendChild(this.summaryPlane);
    this.el.appendChild(this.backButton);
  }

  mount(parent) {
    parent.appendChild(this.el);
  }

  show(data, overallStats, domainStats) {
    const palette = this.theme.palette || {};
    const tokens = this.theme.ui || {};
    const rankedDomains = data.domains
      .map((domain) => ({domain, stats: domainStats[domain.id]}))
      .sort((a, b) => b.stats.accuracy - a.stats.accuracy);
    const strength = rankedDomains[0]?.domain.titleKo || '-';
    const growth = rankedDomains[rankedDomains.length - 1]?.domain.titleKo || '-';
    const domainSummary = data.domains.map((domain) => {
      const stats = domainStats[domain.id];
      const label = this.theme.domains?.[domain.id]?.shortLabel || domain.titleKo || domain.title;
      return {
        label,
        title: domain.titleKo,
        answered: stats.answered,
        correct: stats.correct,
        total: stats.total,
        accuracy: stats.accuracy,
        accent: this.theme.domains?.[domain.id]?.accent || palette.sky || '#7dd3fc'
      };
    });

    applyTexture(this.summaryPlane, {
      variant: 'reportGrid',
      width: 1280,
      height: 720,
      background: '#06111f',
      border: palette.violet || '#8b5cf6',
      accent: palette.violet || '#8b5cf6',
      subtitle: 'REPORT',
      title: this.theme.resultTitle || '결과 리포트',
      overall: overallStats,
      domains: domainSummary,
      footer: `강점 ${strength} · 보완 ${growth}`,
      textColor: '#f8fbff',
      mutedColor: '#bcd4e9',
      tokens
    });
    applyTexture(this.backButton, {
      variant: 'button',
      width: 620,
      height: 160,
      background: '#111827',
      border: '#64748b',
      accent: '#94a3b8',
      title: '영역 선택으로',
      textColor: '#f8fbff',
      align: 'center',
      titleSize: 27,
      glass: true,
      tokens
    });

    this.el.setAttribute('visible', 'true');
    this.el.setAttribute('scale', '0.96 0.96 0.96');
    this.el.setAttribute('animation__open', 'property: scale; to: 1 1 1; dur: 180; easing: easeOutCubic');
  }

  hide() {
    this.el.setAttribute('visible', 'false');
  }
}
