import {flattenQuestions} from './quizValidator.js';
import {readJson, removeItem, writeJson} from './storage.js';

const PROGRESS_KEY = 'progress';

export function createInitialProgress() {
  return {
    answers: {},
    attempts: {},
    updatedAt: new Date().toISOString()
  };
}

export function loadProgress() {
  return readJson(PROGRESS_KEY, createInitialProgress());
}

export function saveProgress(progress) {
  writeJson(PROGRESS_KEY, {
    ...progress,
    updatedAt: new Date().toISOString()
  });
}

export function resetProgress() {
  removeItem(PROGRESS_KEY);
}

export function resetDomainProgress(progress, domain) {
  const questionIds = new Set(domain.questions.map((question) => question.id));
  const answers = Object.fromEntries(
    Object.entries(progress.answers || {}).filter(([questionId]) => !questionIds.has(questionId))
  );
  const attempts = Object.fromEntries(
    Object.entries(progress.attempts || {}).filter(([questionId]) => !questionIds.has(questionId))
  );
  const nextProgress = {
    ...progress,
    answers,
    attempts
  };
  saveProgress(nextProgress);
  return nextProgress;
}

export function answerQuestion(progress, questionId, selectedIndex) {
  const nextProgress = {
    ...progress,
    attempts: progress.attempts || {},
    answers: {
      ...progress.answers,
      [questionId]: selectedIndex
    }
  };
  saveProgress(nextProgress);
  return nextProgress;
}

export function recordAttempt(progress, questionId) {
  const attempts = progress.attempts || {};
  const nextProgress = {
    ...progress,
    attempts: {
      ...attempts,
      [questionId]: (attempts[questionId] || 0) + 1
    }
  };
  saveProgress(nextProgress);
  return nextProgress;
}

export function getAttemptCount(progress, questionId) {
  return (progress.attempts && progress.attempts[questionId]) || 0;
}

export function getDomainStats(domain, progress) {
  const total = domain.questions.length;
  const answered = domain.questions.filter((question) => progress.answers[question.id] !== undefined).length;
  const correct = domain.questions.filter((question) => progress.answers[question.id] === question.answerIndex).length;

  return {
    total,
    answered,
    correct,
    percent: total ? Math.round((answered / total) * 100) : 0,
    accuracy: answered ? Math.round((correct / answered) * 100) : 0,
    complete: answered === total
  };
}

export function getOverallStats(data, progress) {
  const questions = flattenQuestions(data);
  const total = questions.length;
  const answered = questions.filter((question) => progress.answers[question.id] !== undefined).length;
  const correct = questions.filter((question) => progress.answers[question.id] === question.answerIndex).length;

  return {
    total,
    answered,
    correct,
    percent: total ? Math.round((answered / total) * 100) : 0,
    accuracy: answered ? Math.round((correct / answered) * 100) : 0,
    complete: total > 0 && answered === total
  };
}

export function getNextUnansweredQuestion(domain, progress) {
  return domain.questions.find((question) => progress.answers[question.id] === undefined) || null;
}
