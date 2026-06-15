import {createChoiceButton, setChoiceButtonState} from './ChoiceButton.js?v=20260510-inplacegrid1';
import {applyTexture, createPlane} from './canvasTexture.js?v=20260510-inplacegrid1';
import {bindHoverEffect, bindInteractiveAction} from '../utils/interaction.js?v=20260510-inplacegrid1';

const CHOICE_LAYOUT = [
  {x: -0.66, y: 0.00, z: 0.30, delay: 40},
  {x: 0.66, y: 0.00, z: 0.34, delay: 90},
  {x: -0.66, y: -0.60, z: 0.30, delay: 140},
  {x: 0.66, y: -0.60, z: 0.34, delay: 190}
];

const FEEDBACK_POSITION = '0 -1.08 0.50';
const FEEDBACK_ENTER_FROM = '0 -0.92 0.28';

export class QuizPanel {
  constructor({id = 'quiz-panel', domainId = '', theme, onChoice, onNext, onClose}) {
    this.domainId = domainId;
    this.theme = theme || {};
    this.onChoice = onChoice;
    this.onNext = onNext;
    this.onClose = onClose;
    this.currentQuestion = null;
    this.wrongChoiceIndices = new Set();
    this.state = 'idle';
    this.selectedIndex = null;
    this.choiceLayout = CHOICE_LAYOUT;
    this.feedbackPosition = FEEDBACK_POSITION;
    this.feedbackEnterFrom = FEEDBACK_ENTER_FROM;

    this.el = document.createElement('a-entity');
    this.el.id = id;
    this.el.dataset.domainId = domainId;
    this.el.setAttribute('position', '0 2.28 -2.05');
    this.el.setAttribute('visible', 'false');

    this.questionPlane = createPlane({width: 2.64, height: 0.94, className: 'quiz-question-card', position: '0 0.92 0.16'});
    this.feedbackPlane = createPlane({width: 2.28, height: 0.46, className: 'quiz-feedback', position: FEEDBACK_POSITION});
    this.nextButton = createPlane({
      width: 0.46,
      height: 0.16,
      className: 'interactive quiz-next',
      position: '0.98 -1.08 0.58'
    });
    this.closeButton = createPlane({
      width: 0.42,
      height: 0.22,
      className: 'interactive quiz-close',
      position: '1.08 1.36 0.34'
    });
    this.nextButton._focusHalo = this.createButtonHalo('#2563eb', '0.27 0 0.035', 0.076);
    this.closeButton._focusHalo = this.createButtonHalo('#64748b', '0.15 0 0.035', 0.062);
    this.nextButton.appendChild(this.nextButton._focusHalo);
    this.closeButton.appendChild(this.closeButton._focusHalo);

    this.choiceButtons = [0, 1, 2, 3].map((index) => {
      const button = createChoiceButton(index, (choiceIndex, event) => this.onChoice(choiceIndex, this, event));
      button.setAttribute('width', 1.20);
      button.setAttribute('height', 0.48);
      this.setChoiceTransform(button, index, 'idle');
      return button;
    });

    bindInteractiveAction(this.nextButton, (event) => this.onNext(this, event), {
      shouldHandle: () => this.nextButton.getAttribute('visible') !== false && this.nextButton.getAttribute('visible') !== 'false'
    });
    bindInteractiveAction(this.closeButton, (event) => this.onClose(this, event));
    bindHoverEffect(this.nextButton, {
      activeScale: '1.045 1.045 1',
      onEnter: () => this.showButtonHalo(this.nextButton, true),
      onLeave: () => this.showButtonHalo(this.nextButton, false)
    });
    bindHoverEffect(this.closeButton, {
      activeScale: '1.045 1.045 1',
      onEnter: () => this.showButtonHalo(this.closeButton, true),
      onLeave: () => this.showButtonHalo(this.closeButton, false)
    });
    this.feedbackPlane.setAttribute('visible', 'false');
    this.nextButton.setAttribute('visible', 'false');

    this.el.appendChild(this.questionPlane);
    this.choiceButtons.forEach((button) => this.el.appendChild(button));
    this.el.appendChild(this.feedbackPlane);
    this.el.appendChild(this.nextButton);
    this.el.appendChild(this.closeButton);
  }

  mount(parent) {
    parent.appendChild(this.el);
  }

  createButtonHalo(color, position, radius) {
    const halo = document.createElement('a-ring');
    halo.setAttribute('radius-inner', String(radius));
    halo.setAttribute('radius-outer', String(radius + 0.009));
    halo.setAttribute('segments-theta', '64');
    halo.setAttribute('position', position);
    halo.setAttribute('visible', 'false');
    halo.setAttribute('material', `color: ${color}; shader: flat; transparent: true; opacity: 0.0; side: double`);
    return halo;
  }

  showButtonHalo(button, visible) {
    const halo = button?._focusHalo;
    if (!halo) return;
    halo.setAttribute('visible', visible ? 'true' : 'false');
    halo.setAttribute('material', `color: #2563eb; shader: flat; transparent: true; opacity: ${visible ? 0.72 : 0}; side: double`);
    if (visible) {
      halo.setAttribute('animation__aim', 'property: scale; from: 0.78 0.78 1; to: 1.15 1.15 1; dur: 150; easing: easeOutQuad');
    } else {
      halo.removeAttribute('animation__aim');
      halo.setAttribute('scale', '1 1 1');
    }
  }

  show(question, domain, progressText, transform) {
    this.currentQuestion = question;
    this.el.dataset.questionId = question.id;
    this.el.dataset.answerIndex = String(question.answerIndex);
    this.el.dataset.selectedIndex = '';
    this.el.dataset.panelState = 'idle';
    this.wrongChoiceIndices = new Set();
    this.state = 'idle';
    this.selectedIndex = null;
    if (transform) {
      this.el.setAttribute('position', `${transform.x} ${transform.y} ${transform.z}`);
      this.el.setAttribute('rotation', `0 ${transform.ry} 0`);
      this.applyPanelAnchors(transform);
    }
    this.el.setAttribute('visible', 'true');
    this.el.setAttribute('scale', '0.96 0.96 0.96');
    this.el.setAttribute('animation__open', 'property: scale; to: 1 1 1; dur: 180; easing: easeOutCubic');

    const palette = this.theme.palette || {};
    const tokens = this.theme.ui || {};
    const domainTheme = this.theme.domains?.[domain.id] || {};
    const accent = domainTheme.accent || '#2563eb';
    this.choiceButtons.forEach((button, index) => {
      button.dataset.accent = accent;
      button.dataset.locked = 'false';
      button.setAttribute('visible', 'true');
      button.setAttribute('scale', '0.92 0.92 1');
      this.setChoiceTransform(button, index, 'idle');
      setChoiceButtonState(button, `${index + 1}. ${question.choices[index]}`, 'idle');
      button.setAttribute('animation__choice_in', `property: scale; to: 1 1 1; dur: 220; delay: ${CHOICE_LAYOUT[index].delay}; easing: easeOutCubic`);
    });

    applyTexture(this.questionPlane, {
      width: 1500,
      height: 500,
      background: '#06111f',
      border: accent,
      accent,
      icon: domainTheme.shortLabel || domainTheme.icon || 'AI',
      subtitle: `${domain.titleKo} · ${question.id} · ${question.difficulty || 'level'}`,
      title: question.question,
      body: question.competenceKo,
      footer: progressText,
      chips: ['2회 시도', '상황 판단'],
      textColor: '#f8fbff',
      mutedColor: '#bcd4e9',
      glass: false,
      tokens,
      titleSize: 36,
      titleMinSize: 29,
      titleMaxLines: 3,
      bodySize: 25,
      bodyMinSize: 21,
      bodyMaxLines: 2,
      footerSize: 23,
      footerMaxLines: 1,
      subtitleSize: 26,
      chipSize: 21
    });

    this.feedbackPlane.setAttribute('visible', 'false');
    this.feedbackPlane.setAttribute('position', this.feedbackPosition);
    this.setNextButton('다음', false);
    this.setCloseButton('Hub');
  }

  showComplete(domain, transform) {
    this.currentQuestion = null;
    this.el.dataset.questionId = '';
    this.el.dataset.answerIndex = '';
    this.el.dataset.selectedIndex = '';
    this.el.dataset.panelState = 'complete';
    this.state = 'complete';
    this.selectedIndex = null;
    if (transform) {
      this.el.setAttribute('position', `${transform.x} ${transform.y} ${transform.z}`);
      this.el.setAttribute('rotation', `0 ${transform.ry} 0`);
      this.applyPanelAnchors(transform);
    }
    this.el.setAttribute('visible', 'true');
    this.choiceButtons.forEach((button) => button.setAttribute('visible', 'false'));
    this.feedbackPlane.setAttribute('visible', 'false');
    this.nextButton.setAttribute('visible', 'false');

    const palette = this.theme.palette || {};
    const tokens = this.theme.ui || {};
    const domainTheme = this.theme.domains?.[domain.id] || {};
    const accent = domainTheme.accent || '#2563eb';

    applyTexture(this.questionPlane, {
      width: 1400,
      height: 520,
      background: '#06111f',
      border: accent,
      accent,
      icon: 'OK',
      subtitle: domain.title,
      title: `${domain.titleKo} 완료`,
      body: '이 영역의 모든 문제를 해결했습니다.\n영역 선택 화면으로 돌아가 다른 영역을 계속 풀어 보세요.',
      footer: '완료된 영역 카드를 다시 선택하면 해당 영역을 다시 풀 수 있습니다.',
      textColor: '#f8fbff',
      mutedColor: '#bcd4e9',
      glass: false,
      tokens,
      titleSize: 46,
      bodySize: 30,
      footerSize: 24
    });
    this.setCloseButton('Hub');
  }

  hide() {
    this.clearRuntimeState();
    this.el.setAttribute('visible', 'false');
  }

  clearRuntimeState() {
    this.currentQuestion = null;
    this.state = 'idle';
    this.selectedIndex = null;
    this.wrongChoiceIndices = new Set();
    this.el.dataset.questionId = '';
    this.el.dataset.answerIndex = '';
    this.el.dataset.selectedIndex = '';
    this.el.dataset.panelState = 'idle';
    this.feedbackPlane.setAttribute('visible', 'false');
    this.nextButton.setAttribute('visible', 'false');
    this.choiceButtons.forEach((button) => {
      button.dataset.locked = 'true';
      button.dataset.status = 'idle';
      button.setAttribute('visible', 'false');
    });
  }

  canSelectChoice(choiceIndex) {
    const button = this.choiceButtons[choiceIndex];
    return Boolean(
      this.currentQuestion &&
      this.state !== 'answered' &&
      button &&
      button.dataset.locked !== 'true'
    );
  }

  markChoiceSelected(question, selectedIndex) {
    this.state = 'answering';
    this.selectedIndex = selectedIndex;
    this.el.dataset.panelState = 'answering';
    this.el.dataset.selectedIndex = String(selectedIndex);
    this.choiceButtons.forEach((button, index) => {
      const wasWrong = this.wrongChoiceIndices.has(index);
      if (wasWrong) {
        this.setChoiceTransform(button, index, 'wrong');
        setChoiceButtonState(button, `오답 ${index + 1}. ${question.choices[index]}`, 'wrong');
        return;
      }
      const status = index === selectedIndex ? 'selected' : 'idle';
      this.setChoiceTransform(button, index, status);
      setChoiceButtonState(button, `${index + 1}. ${question.choices[index]}`, status);
    });
  }

  lockWithResult(question, selectedIndex) {
    this.state = 'answered';
    this.selectedIndex = selectedIndex;
    this.el.dataset.panelState = 'answered';
    this.el.dataset.selectedIndex = String(selectedIndex);
    this.choiceButtons.forEach((button, index) => {
      button.dataset.locked = 'true';
      if (index === question.answerIndex) {
        this.setChoiceTransform(button, index, 'correct');
        setChoiceButtonState(button, `정답 ${index + 1}. ${question.choices[index]}`, 'correct');
      } else if (index === selectedIndex) {
        this.setChoiceTransform(button, index, 'wrong');
        setChoiceButtonState(button, `오답 ${index + 1}. ${question.choices[index]}`, 'wrong');
      } else {
        this.setChoiceTransform(button, index, 'idle');
        setChoiceButtonState(button, `${index + 1}. ${question.choices[index]}`, 'idle');
      }
    });
  }

  markWrongAttempt(question, selectedIndex) {
    this.state = 'retry';
    this.selectedIndex = null;
    this.el.dataset.panelState = 'retry';
    this.el.dataset.selectedIndex = String(selectedIndex);
    this.wrongChoiceIndices.add(selectedIndex);
    this.choiceButtons.forEach((button, index) => {
      const wasWrong = this.wrongChoiceIndices.has(index);
      button.dataset.locked = wasWrong ? 'true' : 'false';
      const label = wasWrong ? `오답 ${index + 1}. ${question.choices[index]}` : `${index + 1}. ${question.choices[index]}`;
      this.setChoiceTransform(button, index, wasWrong ? 'wrong' : 'idle');
      setChoiceButtonState(button, label, wasWrong ? 'wrong' : 'idle');
    });
  }

  resetAfterWrongAttempt(question) {
    this.state = 'retry';
    this.selectedIndex = null;
    this.el.dataset.panelState = 'retry';
    this.el.dataset.selectedIndex = '';
    this.wrongChoiceIndices = new Set();
    this.choiceButtons.forEach((button, index) => {
      button.dataset.locked = 'false';
      this.setChoiceTransform(button, index, 'idle');
      setChoiceButtonState(button, `${index + 1}. ${question.choices[index]}`, 'idle');
    });
  }

  clearChoiceMarks(question) {
    this.choiceButtons.forEach((button, index) => {
      button.dataset.locked = 'false';
      this.setChoiceTransform(button, index, 'idle');
      setChoiceButtonState(button, `${index + 1}. ${question.choices[index]}`, 'idle');
    });
  }

  setChoiceTransform(button, index, status = 'idle') {
    const layout = this.choiceLayout[index] || CHOICE_LAYOUT[index] || CHOICE_LAYOUT[0];
    const zLift = status === 'selected' ? 0.18 : status === 'correct' || status === 'wrong' ? 0.12 : 0;
    button.setAttribute('position', `${layout.x} ${layout.y} ${layout.z + zLift}`);
  }

  applyPanelAnchors(transform = {}) {
    this.choiceLayout = Array.isArray(transform.choiceCards)
      ? transform.choiceCards.map((choice, index) => ({
        x: Number(choice?.x ?? choice?.position?.[0] ?? CHOICE_LAYOUT[index]?.x ?? 0),
        y: Number(choice?.y ?? choice?.position?.[1] ?? CHOICE_LAYOUT[index]?.y ?? 0),
        z: Number(choice?.z ?? choice?.position?.[2] ?? CHOICE_LAYOUT[index]?.z ?? 0),
        delay: CHOICE_LAYOUT[index]?.delay || 0
      }))
      : CHOICE_LAYOUT;
    this.feedbackPosition = transform.feedbackPanel?.positionString || FEEDBACK_POSITION;
    this.feedbackEnterFrom = transform.feedbackPanel?.enterFromString || FEEDBACK_ENTER_FROM;
    if (transform.feedbackPanel?.width) this.feedbackPlane.setAttribute('width', transform.feedbackPanel.width);
    if (transform.feedbackPanel?.height) this.feedbackPlane.setAttribute('height', transform.feedbackPanel.height);
    if (transform.nextButton?.positionString) this.nextButton.setAttribute('position', transform.nextButton.positionString);
    if (transform.closeButton?.positionString) this.closeButton.setAttribute('position', transform.closeButton.positionString);
    this.choiceButtons.forEach((button, index) => this.setChoiceTransform(button, index, button.dataset.status || 'idle'));
  }

  setFeedback(message, tone = 'neutral') {
    this.feedbackPlane.setAttribute('visible', 'true');
    this.feedbackPlane.setAttribute('scale', '0.96 0.96 1');
    this.feedbackPlane.setAttribute('animation__feedback', 'property: scale; to: 1 1 1; dur: 160; easing: easeOutCubic');
    this.feedbackPlane.setAttribute('animation__feedback_slide', `property: position; from: ${this.feedbackEnterFrom}; to: ${this.feedbackPosition}; dur: 220; easing: easeOutCubic`);
    const styles = {
      neutral: ['#06111f', '#2563eb', '#7dd3fc', '#f8fbff'],
      correct: ['#061b14', '#21a66b', '#21a66b', '#eafff4'],
      wrong: ['#260b12', '#de4d5a', '#de4d5a', '#fff0f2']
    };
    const [background, border, accent, textColor] = styles[tone] || styles.neutral;
    const title = typeof message === 'string' ? message : message.title;
    const body = typeof message === 'string' ? '' : message.body;
    const footer = typeof message === 'string' ? '' : message.footer;

    applyTexture(this.feedbackPlane, {
      width: 1500,
      height: 360,
      background,
      border,
      accent,
      icon: tone === 'correct' ? 'OK' : tone === 'wrong' ? 'X' : '',
      title,
      body,
      footer,
      textColor,
      align: 'left',
      radius: 30,
      titleSize: 24,
      titleMaxLines: 1,
      bodySize: 17,
      bodyMinSize: 14,
      bodyMaxLines: 2,
      footerSize: 15,
      footerMinSize: 13,
      footerMaxLines: 1,
      glass: false,
      tokens: this.theme.ui || {}
    });
  }

  setNextButton(label, visible) {
    this.nextButton.setAttribute('visible', visible ? 'true' : 'false');
    applyTexture(this.nextButton, {
      variant: 'button',
      width: 360,
      height: 140,
      background: '#0b2034',
      border: '#7dd3fc',
      accent: '#7dd3fc',
      title: label,
      textColor: '#ffffff',
      align: 'center',
      titleSize: 25,
      titleMaxLines: 1,
      tokens: this.theme.ui || {}
    });
  }

  setCloseButton(label = '영역 선택') {
    applyTexture(this.closeButton, {
      variant: 'button',
      width: 360,
      height: 160,
      background: '#111827',
      border: '#64748b',
      accent: '#94a3b8',
      title: label,
      textColor: '#f8fbff',
      align: 'center',
      titleSize: 25,
      tokens: this.theme.ui || {}
    });
  }
}
