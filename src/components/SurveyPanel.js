import {applyTexture, createPlane} from './canvasTexture.js?v=20260510-inplacegrid1';
import {bindHoverEffect, bindInteractiveAction} from '../utils/interaction.js?v=20260510-inplacegrid1';

export class SurveyPanel {
  constructor({theme, onAnswer, onBack}) {
    this.theme = theme || {};
    this.onAnswer = onAnswer;
    this.onBack = onBack;
    this.data = null;
    this.responses = null;
    this.index = 0;

    this.el = document.createElement('a-entity');
    this.el.id = 'survey-panel';
    this.el.setAttribute('position', '0 2.28 -2.4');
    this.el.setAttribute('visible', 'false');

    this.main = createPlane({width: 3.32, height: 0.92, position: '0 0.92 0.16'});
    this.optionButtons = Array.from({length: 5}, (_, index) => createPlane({
      width: 0.62,
      height: 0.28,
      className: 'interactive survey-option',
      position: '0 0 0.12'
    }));
    this.nextButton = createPlane({width: 0.78, height: 0.24, className: 'interactive survey-next', position: '0.52 -1.16 0.18'});
    this.backButton = createPlane({width: 0.78, height: 0.24, className: 'interactive survey-back', position: '-0.52 -1.16 0.18'});

    this.optionButtons.forEach((button, index) => {
      bindInteractiveAction(button, () => this.selectOption(index));
      bindHoverEffect(button, {activeScale: '1.04 1.04 1'});
      this.el.appendChild(button);
    });
    bindInteractiveAction(this.nextButton, () => this.goNext());
    bindInteractiveAction(this.backButton, () => this.onBack());
    [this.nextButton, this.backButton].forEach((button) => bindHoverEffect(button, {activeScale: '1.04 1.04 1'}));

    this.el.append(this.main, this.nextButton, this.backButton);
  }

  mount(parent) {
    parent.appendChild(this.el);
  }

  show(data, responses) {
    this.data = normaliseRuntimeSurvey(data);
    this.responses = responses;
    this.index = Math.max(0, this.data.questions.findIndex((question) => responses.answers?.[question.id] === undefined));
    if (this.index < 0) this.index = 0;
    this.el.setAttribute('visible', 'true');
    this.render();
  }

  hide() {
    this.el.setAttribute('visible', 'false');
  }

  updateResponses(responses) {
    this.responses = responses;
    this.render();
  }

  currentQuestion() {
    return this.data?.questions?.[this.index] || null;
  }

  selectOption(optionIndex) {
    const question = this.currentQuestion();
    if (!question) return;
    const value = question.type === 'scale5' ? optionIndex + 1 : question.choices[optionIndex];
    if (value === undefined || value === '') return;
    this.onAnswer(question, value);
  }

  goNext() {
    if (!this.data) return;
    this.index = Math.min(this.data.questions.length - 1, this.index + 1);
    this.render();
  }

  render() {
    const question = this.currentQuestion();
    const palette = this.theme.palette || {};
    const accent = palette.mint || '#14b8a6';
    const answer = question ? this.responses.answers?.[question.id] : null;
    const completeCount = this.data?.questions?.filter((item) => this.responses.answers?.[item.id] !== undefined).length || 0;
    const total = this.data?.questions?.length || 0;
    this.el.dataset.currentQuestionId = question?.id || '';
    this.el.dataset.answered = String(completeCount);
    this.el.dataset.total = String(total);

    applyTexture(this.main, {
      width: 1400,
      height: 500,
      background: '#06111f',
      border: accent,
      accent,
      subtitle: this.data?.title || 'Survey Garden',
      title: question?.question || '설문이 없습니다.',
      body: answer !== null && answer !== undefined ? `현재 응답: ${answer}` : this.data?.description || '',
      footer: `진행 ${completeCount}/${total}`,
      icon: 'SURVEY',
      textColor: '#f8fbff',
      mutedColor: '#bcd4e9',
      glass: false,
      titleSize: 42,
      titleMaxLines: 3,
      bodySize: 26,
      bodyMaxLines: 2,
      footerSize: 23
    });

    this.positionOptionButtons(question);
    this.optionButtons.forEach((button, index) => {
      const label = this.getOptionLabel(question, index);
      button.setAttribute('visible', label ? 'true' : 'false');
      if (!label) return;
      applyTexture(button, {
        variant: 'button',
        width: question?.type === 'scale5' ? 420 : 760,
        height: question?.type === 'scale5' ? 170 : 230,
        background: answer === this.getOptionValue(question, index) ? accent : '#06111f',
        border: accent,
        accent,
        title: label,
        textColor: '#ffffff',
        titleSize: question?.type === 'scale5' ? 24 : 29
      });
    });

    applyTexture(this.backButton, this.buttonTexture('영역 선택으로', '#111827', '#f8fbff', '#64748b', '#94a3b8'));
    applyTexture(this.nextButton, this.buttonTexture(this.index >= total - 1 ? '제출' : '다음 문항', '#0b2034', '#ffffff', accent, accent));
  }

  positionOptionButtons(question) {
    if (question?.type === 'scale5') {
      const positions = [-1.36, -0.68, 0, 0.68, 1.36];
      this.optionButtons.forEach((button, index) => {
        button.setAttribute('width', 0.62);
        button.setAttribute('height', 0.28);
        button.setAttribute('position', `${positions[index]} -0.10 0.34`);
      });
      return;
    }

    const positions = [
      [-0.82, -0.02],
      [0.82, -0.02],
      [-0.82, -0.62],
      [0.82, -0.62],
      [0, -0.92]
    ];
    this.optionButtons.forEach((button, index) => {
      button.setAttribute('width', 1.42);
      button.setAttribute('height', 0.42);
      const [x, y] = positions[index] || positions[4];
      button.setAttribute('position', `${x} ${y} 0.34`);
    });
  }

  getOptionLabel(question, index) {
    if (!question) return '';
    if (question.type === 'scale5') return question.labels?.[index] || `${index + 1}점`;
    if (question.type === 'single') return question.choices?.[index] || '';
    return '';
  }

  getOptionValue(question, index) {
    if (!question) return null;
    if (question.type === 'scale5') return index + 1;
    if (question.type === 'single') return question.choices?.[index] || null;
    return null;
  }

  buttonTexture(title, background, textColor, border = '#9fd7d0', accent = '#14b8a6') {
    return {
      variant: 'button',
      width: 520,
      height: 160,
      background,
      border,
      accent,
      title,
      textColor,
      titleSize: 28
    };
  }
}

function normaliseRuntimeSurvey(data) {
  const fallbackChoices = ['매우 중요하다', '중요하다', '보통이다', '조금 더 생각해 보겠다'];
  const source = data && typeof data === 'object' ? data : {};
  const questions = Array.isArray(source.questions) ? source.questions : [];
  return {
    title: source.title || '학습 설문',
    description: source.description || '알맞은 답을 선택해 주세요.',
    questions: questions.map((question, index) => {
      const isScale = question.type === 'scale5';
      const isLegacyShort = question.type === 'short';
      return {
        id: question.id || `S-${index + 1}`,
        type: isScale ? 'scale5' : 'single',
        question: isLegacyShort
          ? 'AI를 사용할 때 앞으로 가장 신경 쓰고 싶은 점은 무엇인가요?'
          : question.question || '설문 문항을 입력하세요.',
        labels: isScale ? fillList(question.labels, ['전혀 아니다', '아니다', '보통', '그렇다', '매우 그렇다'], 5) : [],
        choices: isScale ? [] : fillList(question.choices, fallbackChoices, 4).filter((choice) => String(choice || '').trim())
      };
    })
  };
}

function fillList(value, fallback, length) {
  const list = Array.isArray(value) ? value.map((item) => String(item ?? '')) : [];
  while (list.length < length) list.push(fallback[list.length] || '');
  return list.slice(0, length);
}
