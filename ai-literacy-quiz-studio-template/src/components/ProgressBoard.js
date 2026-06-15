import {applyTexture, createPlane} from './canvasTexture.js?v=20260510-inplacegrid1';
import {bindHoverEffect, bindInteractiveAction} from '../utils/interaction.js?v=20260510-inplacegrid1';

export function createProgressBoard({onRestart} = {}) {
  const board = document.createElement('a-entity');
  board.id = 'progress-board';
  board.setAttribute('position', '0 2.42 -1.48');
  board.setAttribute('scale', '0.9 0.9 0.9');

  const main = createPlane({
    id: 'progress-board-main',
    width: 2.32,
    height: 0.58,
    position: '0 0 0.02'
  });

  const restartButton = createPlane({
    id: 'progress-restart',
    width: 0.44,
    height: 0.13,
    className: 'interactive',
    position: '0.88 -0.43 0.05'
  });
  if (onRestart) {
    bindInteractiveAction(restartButton, onRestart);
    bindHoverEffect(restartButton, {activeScale: '1.04 1.04 1'});
  }

  board.appendChild(main);
  board.appendChild(restartButton);
  updateProgressBoard(board, {
    answered: 0,
    total: 22,
    correct: 0,
    accuracy: 0,
    percent: 0
  });
  return board;
}

export function updateProgressBoard(board, stats, theme = {}, domainStats = []) {
  board.dataset.answered = String(stats.answered);
  board.dataset.total = String(stats.total);
  board.dataset.complete = String(Boolean(stats.complete));
  const palette = theme.palette || {};
  const tokens = theme.ui || {};
  const main = board.id === 'progress-board-main' ? board : board.querySelector('#progress-board-main');

  applyTexture(main, {
    width: 1280,
    height: 360,
    background: '#ffffff',
    border: palette.line || '#d7e2ec',
    accent: palette.sky || '#7dd3fc',
    subtitle: theme.schoolName || 'AI Literacy School',
    title: 'Hub Plaza',
    body: stats.complete ? '모든 미션을 완료했습니다. Report Center로 이동하세요.' : '포털을 선택해 학습 공간으로 이동하세요.',
    footer: `전체 진행 ${stats.answered}/${stats.total} · 정답률 ${stats.accuracy}%`,
    textColor: palette.ink || '#153047',
    mutedColor: palette.muted || '#46627a',
    align: 'center',
    glass: false,
    tokens,
    titleSize: 42,
    bodySize: 24,
    footerSize: 20,
    progress: {
      value: stats.total ? stats.answered / stats.total : 0,
      label: `${stats.percent}%`
    }
  });

  const restartButton = board.querySelector('#progress-restart');
  if (restartButton) {
    applyTexture(restartButton, {
      variant: 'button',
      width: 360,
      height: 120,
      background: palette.navy || '#143e63',
      border: palette.sky || '#65b8df',
      accent: palette.violet || '#8b5cf6',
      title: '다시 풀기',
      textColor: '#ffffff',
      align: 'center',
      radius: 26,
      titleSize: 23,
      glass: false,
      tokens
    });
  }
}
