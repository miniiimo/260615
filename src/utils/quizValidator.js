export const REQUIRED_DOMAIN_COUNTS = {
  engaging: 7,
  creating: 5,
  managing: 5,
  designing: 5
};

export const REQUIRED_DOMAIN_ORDER = ['engaging', 'creating', 'managing', 'designing'];

const REQUIRED_QUESTION_FIELDS = [
  'id',
  'competence',
  'competenceKo',
  'question',
  'choices',
  'answerIndex',
  'feedbackCorrect',
  'feedbackWrong',
  'explanation',
  'difficulty'
];

export function validateQuizData(data) {
  const errors = [];

  if (!data || !Array.isArray(data.domains)) {
    return {
      valid: false,
      errors: ['퀴즈 데이터에 domains 배열이 없습니다.'],
      summary: []
    };
  }

  const seenDomainIds = new Set();
  const summary = [];

  REQUIRED_DOMAIN_ORDER.forEach((domainId) => {
    const domain = data.domains.find((item) => item.id === domainId);
    const expected = REQUIRED_DOMAIN_COUNTS[domainId];

    if (!domain) {
      errors.push(`${domainId} 영역이 없습니다.`);
      return;
    }

    seenDomainIds.add(domainId);

    if (!domain.title || !domain.titleKo || !domain.description) {
      errors.push(`${domain.titleKo || domain.id} 영역의 제목 또는 설명이 비어 있습니다.`);
    }

    if (Number(domain.requiredQuestionCount) !== expected) {
      errors.push(`${domain.titleKo} 영역의 requiredQuestionCount는 반드시 ${expected}이어야 합니다.`);
    }

    if (!Array.isArray(domain.questions)) {
      errors.push(`${domain.titleKo} 영역에 questions 배열이 없습니다.`);
      return;
    }

    if (domain.questions.length !== expected) {
      errors.push(`${domain.titleKo} 영역은 반드시 ${expected}문항이어야 합니다. 현재 ${domain.questions.length}문항입니다.`);
    }

    domain.questions.forEach((question, questionIndex) => {
      const label = `${domain.titleKo} ${questionIndex + 1}번 문항`;

      REQUIRED_QUESTION_FIELDS.forEach((fieldName) => {
        if (question[fieldName] === undefined || question[fieldName] === null || question[fieldName] === '') {
          errors.push(`${label}: ${fieldName} 값이 필요합니다.`);
        }
      });

      if (!Array.isArray(question.choices) || question.choices.length !== 4) {
        errors.push(`${label}: 선택지는 반드시 4개여야 합니다.`);
      } else {
        question.choices.forEach((choice, choiceIndex) => {
          if (!choice || !String(choice).trim()) {
            errors.push(`${label}: ${choiceIndex + 1}번 선택지가 비어 있습니다.`);
          }
        });
      }

      if (!Number.isInteger(question.answerIndex) || question.answerIndex < 0 || question.answerIndex > 3) {
        errors.push(`${label}: answerIndex는 0, 1, 2, 3 중 하나여야 합니다.`);
      }

      if (!['easy', 'medium', 'hard'].includes(question.difficulty)) {
        errors.push(`${label}: difficulty는 easy, medium, hard 중 하나여야 합니다.`);
      }
    });

    summary.push({
      id: domain.id,
      title: domain.title,
      titleKo: domain.titleKo,
      expected,
      actual: domain.questions.length
    });
  });

  data.domains.forEach((domain) => {
    if (!REQUIRED_DOMAIN_COUNTS[domain.id]) {
      errors.push(`${domain.titleKo || domain.id} 영역은 허용된 OECD AI Literacy 4영역에 포함되지 않습니다.`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    summary,
    seenDomainIds
  };
}

export function flattenQuestions(data) {
  return data.domains.flatMap((domain) =>
    domain.questions.map((question) => ({
      ...question,
      domainId: domain.id,
      domainTitle: domain.title,
      domainTitleKo: domain.titleKo
    }))
  );
}

