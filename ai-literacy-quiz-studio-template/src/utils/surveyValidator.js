export const SURVEY_TYPES = ['scale5', 'single'];

const DEFAULT_SCALE_LABELS = ['전혀 아니다', '아니다', '보통', '그렇다', '매우 그렇다'];
const DEFAULT_SINGLE_CHOICES = ['출처와 사실 확인', '개인정보 보호', 'AI 결과 다시 검토', '내 생각 함께 담기', ''];

export function validateSurveyData(data) {
  const errors = [];

  if (!data || typeof data !== 'object') {
    return {valid: false, errors: ['설문 데이터가 JSON 객체 형식이 아닙니다.']};
  }

  if (!String(data.title || '').trim()) {
    errors.push('설문 제목이 비어 있습니다.');
  }

  if (!Array.isArray(data.questions) || data.questions.length === 0) {
    errors.push('설문 문항이 1개 이상 필요합니다.');
    return {valid: false, errors};
  }

  data.questions.forEach((question, index) => {
    const label = `${index + 1}번 설문`;
    if (!String(question.id || '').trim()) {
      errors.push(`${label}: id가 비어 있습니다.`);
    }
    if (!SURVEY_TYPES.includes(question.type)) {
      errors.push(`${label}: type은 scale5 또는 single이어야 합니다.`);
    }
    if (!String(question.question || '').trim()) {
      errors.push(`${label}: 질문 내용이 비어 있습니다.`);
    }

    if (question.type === 'scale5') {
      const labels = Array.isArray(question.labels) ? question.labels : [];
      if (labels.length !== 5 || labels.some((item) => !String(item || '').trim())) {
        errors.push(`${label}: 5점 척도는 라벨 5개가 모두 필요합니다.`);
      }
    }

    if (question.type === 'single') {
      const choices = Array.isArray(question.choices) ? question.choices.filter((item) => String(item || '').trim()) : [];
      if (choices.length < 2) {
        errors.push(`${label}: 단일 선택 문항은 선택지가 2개 이상 필요합니다.`);
      }
    }
  });

  return {valid: errors.length === 0, errors};
}

export function normaliseSurveyData(data) {
  const source = data && typeof data === 'object' ? data : {};
  return {
    title: String(source.title || 'AI Literacy 학습 설문'),
    description: String(source.description || '학습을 마친 뒤 생각을 간단히 남겨 주세요.'),
    questions: Array.isArray(source.questions) && source.questions.length
      ? source.questions.map((question, index) => normaliseSurveyQuestion(question, index))
      : [normaliseSurveyQuestion({id: 'S-1', type: 'scale5', question: '오늘 활동이 AI 이해에 도움이 되었나요?'}, 0)]
  };
}

export function normaliseSurveyQuestion(question = {}, index = 0) {
  const type = question.type === 'short' ? 'single' : SURVEY_TYPES.includes(question.type) ? question.type : 'scale5';
  const labels = fillList(question.labels, DEFAULT_SCALE_LABELS, 5);
  const choices = fillList(question.choices, DEFAULT_SINGLE_CHOICES, 5);

  return {
    id: String(question.id || `S-${index + 1}`),
    type,
    question: String(question.question || ''),
    labels,
    choices
  };
}

export function prepareSurveyForSave(data) {
  const normalised = normaliseSurveyData(data);
  return {
    title: normalised.title,
    description: normalised.description,
    questions: normalised.questions.map((question) => {
      const base = {
        id: question.id,
        type: question.type,
        question: question.question
      };
      if (question.type === 'scale5') {
        base.labels = question.labels.slice(0, 5);
      }
      if (question.type === 'single') {
        base.choices = question.choices.filter((choice) => String(choice || '').trim());
      }
      return base;
    })
  };
}

function fillList(value, fallback, length) {
  const list = Array.isArray(value) ? value.map((item) => String(item ?? '')) : [];
  while (list.length < length) list.push(fallback[list.length] || '');
  return list.slice(0, length);
}
