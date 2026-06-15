const STORAGE_PREFIX = 'ai-literacy-vr-quiz';

export function readJson(key, fallbackValue) {
  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}:${key}`);
    return raw ? JSON.parse(raw) : fallbackValue;
  } catch (error) {
    console.warn('저장된 데이터를 읽지 못했습니다.', error);
    return fallbackValue;
  }
}

export function writeJson(key, value) {
  window.localStorage.setItem(`${STORAGE_PREFIX}:${key}`, JSON.stringify(value));
}

export function removeItem(key) {
  window.localStorage.removeItem(`${STORAGE_PREFIX}:${key}`);
}

