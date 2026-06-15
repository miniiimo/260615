import {readJson, removeItem, writeJson} from './storage.js?v=20260510-inplacegrid1';

const SURVEY_KEY = 'survey-responses';

export function createInitialSurveyResponses() {
  return {
    answers: {},
    updatedAt: new Date().toISOString()
  };
}

export function loadSurveyResponses() {
  return readJson(SURVEY_KEY, createInitialSurveyResponses());
}

export function saveSurveyAnswer(responses, questionId, value) {
  const nextResponses = {
    ...responses,
    answers: {
      ...(responses.answers || {}),
      [questionId]: value
    },
    updatedAt: new Date().toISOString()
  };
  writeJson(SURVEY_KEY, nextResponses);
  return nextResponses;
}

export function resetSurveyResponses() {
  removeItem(SURVEY_KEY);
}

export function exportSurveyResponses(surveyData, responses) {
  return {
    surveyTitle: surveyData.title,
    exportedAt: new Date().toISOString(),
    responses: surveyData.questions.map((question) => ({
      id: question.id,
      type: question.type,
      question: question.question,
      answer: responses.answers?.[question.id] ?? null
    }))
  };
}
