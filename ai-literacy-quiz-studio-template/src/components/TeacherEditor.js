import {validateQuizData} from '../utils/quizValidator.js?v=20260510-inplacegrid1';
import {
  normaliseSurveyData,
  normaliseSurveyQuestion,
  prepareSurveyForSave,
  validateSurveyData
} from '../utils/surveyValidator.js?v=20260510-inplacegrid1';
import {readJson, removeItem, writeJson} from '../utils/storage.js?v=20260510-inplacegrid1';

const QUIZ_DRAFT_KEY = 'teacher-draft';
const SURVEY_DRAFT_KEY = 'teacher-survey-draft';
const PUBLISHED_QUIZ_KEY = 'published-quiz';
const PUBLISHED_SURVEY_KEY = 'published-survey';
const PUBLISHED_QUIZ_META_KEY = 'published-quiz-meta';
const PUBLISHED_SURVEY_META_KEY = 'published-survey-meta';
const PROGRESS_KEY = 'progress';
const SURVEY_RESPONSES_KEY = 'survey-responses';

export class TeacherEditor {
  constructor(root, config = {}) {
    this.root = root;
    this.config = {
      quizUrl: '../src/data/quizData.json',
      surveyUrl: '../src/data/surveyData.json',
      ...config
    };
    this.quizData = null;
    this.surveyData = null;
    this.statusMessage = '';
  }

  async start() {
    try {
      const [quizData, surveyData] = await Promise.all([
        this.loadEditableJson(QUIZ_DRAFT_KEY, this.config.quizUrl, '기본 quizData.json을 불러오지 못했습니다.'),
        this.loadEditableJson(SURVEY_DRAFT_KEY, this.config.surveyUrl, '기본 surveyData.json을 불러오지 못했습니다.')
      ]);
      this.quizData = quizData;
      this.surveyData = normaliseSurveyData(surveyData);
      this.render();
    } catch (error) {
      this.root.innerHTML = `<main class="editor-error">${this.escape(error.message || '편집기를 시작하지 못했습니다.')}</main>`;
    }
  }

  async loadEditableJson(draftKey, url, errorMessage) {
    const draft = readJson(draftKey, null);
    if (draft) return draft;

    const response = await fetch(url, {cache: 'no-store'});
    if (!response.ok) throw new Error(errorMessage);
    return response.json();
  }

  render() {
    const quizValidation = validateQuizData(this.quizData);
    const surveyPayload = prepareSurveyForSave(this.surveyData);
    const surveyValidation = validateSurveyData(surveyPayload);
    const allErrors = [
      ...quizValidation.errors.map((error) => `퀴즈: ${error}`),
      ...surveyValidation.errors.map((error) => `설문: ${error}`)
    ];
    const quizDomains = Array.isArray(this.quizData?.domains) ? this.quizData.domains : [];

    this.root.innerHTML = `
      <header class="editor-header">
        <div>
          <p>AI Literacy VR Quiz Studio</p>
          <h1>교사용 콘텐츠 편집기</h1>
          <span class="editor-subtitle">퀴즈와 설문을 수정한 뒤 VR에 적용할 수 있습니다.</span>
        </div>
        <div class="editor-actions">
          <button data-action="validate">검증</button>
          <button data-action="apply">VR에 적용</button>
          <a class="file-button" href="./index.html?teacherPreview=1&skipintro=true" target="_blank" rel="noreferrer">VR 미리보기</a>
          <button data-action="export-quiz">퀴즈 내보내기</button>
          <label class="file-button">
            퀴즈 가져오기
            <input type="file" accept="application/json,.json" data-action="import-quiz" />
          </label>
          <button data-action="export-survey">설문 내보내기</button>
          <label class="file-button">
            설문 가져오기
            <input type="file" accept="application/json,.json" data-action="import-survey" />
          </label>
          <button data-action="clear-published">적용본 제거</button>
          <button data-action="reset">기본값 복원</button>
        </div>
      </header>

      ${this.statusMessage ? `<section class="validation valid">${this.escape(this.statusMessage)}</section>` : ''}

      <section class="${allErrors.length ? 'validation invalid' : 'validation valid'}">
        ${allErrors.length
          ? allErrors.map((error) => `<p>${this.escape(error)}</p>`).join('')
          : '검증 통과: 퀴즈 22문항과 설문 데이터가 올바릅니다.'}
      </section>

      <main class="editor-shell">
        <section class="editor-section">
          <div class="section-title">
            <div>
              <p>Quiz Data</p>
              <h2>퀴즈 문항 편집</h2>
            </div>
            <strong>${quizValidation.valid ? '검증 통과' : `${quizValidation.errors.length}개 오류`}</strong>
          </div>
          ${quizDomains.length
            ? `<div class="domain-list compact-list">${quizDomains.map((domain, domainIndex) => this.renderDomain(domain, domainIndex)).join('')}</div>`
            : '<section class="domain-card editor-error">퀴즈 데이터에 domains 배열이 없습니다. 퀴즈 JSON을 다시 가져오거나 기본값 복원을 눌러 주세요.</section>'}
        </section>

        <section class="editor-section">
          <div class="section-title">
            <div>
              <p>Survey Data</p>
              <h2>설문조사 편집</h2>
            </div>
            <strong>${surveyValidation.valid ? '검증 통과' : `${surveyValidation.errors.length}개 오류`}</strong>
          </div>
          ${this.renderSurveyEditor()}
        </section>
      </main>
    `;

    this.bindEvents();
  }

  renderDomain(domain, domainIndex) {
    return `
      <section class="domain-card">
        <div class="domain-head">
          <div>
            <p>${this.escape(domain.title)}</p>
            <h2>${this.escape(domain.titleKo)}</h2>
          </div>
          <strong>${domain.questions?.length || 0}/${domain.requiredQuestionCount}문항</strong>
        </div>
        <label>
          영역 설명
          <textarea data-path="quiz.domains.${domainIndex}.description">${this.escape(domain.description)}</textarea>
        </label>
        <div class="question-list">
          ${(domain.questions || []).map((question, questionIndex) => this.renderQuestion(question, domainIndex, questionIndex)).join('')}
        </div>
      </section>
    `;
  }

  renderQuestion(question, domainIndex, questionIndex) {
    const basePath = `quiz.domains.${domainIndex}.questions.${questionIndex}`;
    const choices = Array.isArray(question.choices) ? question.choices : ['', '', '', ''];
    return `
      <article class="question-card">
        <div class="question-head">
          <h3>${this.escape(question.id)} · ${questionIndex + 1}번</h3>
          <select data-path="${basePath}.difficulty">
            ${['easy', 'medium', 'hard'].map((level) => `<option value="${level}" ${question.difficulty === level ? 'selected' : ''}>${level}</option>`).join('')}
          </select>
        </div>
        <label>
          하부 역량
          <textarea data-path="${basePath}.competenceKo">${this.escape(question.competenceKo)}</textarea>
        </label>
        <label>
          문제
          <textarea data-path="${basePath}.question">${this.escape(question.question)}</textarea>
        </label>
        <div class="choice-grid">
          ${choices.slice(0, 4).map((choice, choiceIndex) => `
            <label>
              선택지 ${choiceIndex + 1}
              <input data-path="${basePath}.choices.${choiceIndex}" value="${this.escape(choice)}" />
            </label>
          `).join('')}
        </div>
        <label>
          정답 번호
          <select data-path="${basePath}.answerIndex" data-type="number">
            ${[0, 1, 2, 3].map((answerIndex) => `<option value="${answerIndex}" ${question.answerIndex === answerIndex ? 'selected' : ''}>${answerIndex + 1}번</option>`).join('')}
          </select>
        </label>
        <label>
          정답 피드백
          <textarea data-path="${basePath}.feedbackCorrect">${this.escape(question.feedbackCorrect)}</textarea>
        </label>
        <label>
          오답 피드백
          <textarea data-path="${basePath}.feedbackWrong">${this.escape(question.feedbackWrong)}</textarea>
        </label>
        <label>
          해설
          <textarea data-path="${basePath}.explanation">${this.escape(question.explanation)}</textarea>
        </label>
      </article>
    `;
  }

  renderSurveyEditor() {
    const survey = normaliseSurveyData(this.surveyData);
    this.surveyData = survey;
    return `
      <section class="domain-card survey-editor">
        <div class="domain-head">
          <div>
            <p>surveyData.json</p>
            <h2>${this.escape(survey.title)}</h2>
          </div>
          <strong>${survey.questions.length}문항</strong>
        </div>
        <div class="survey-meta-grid">
          <label>
            설문 제목
            <input data-path="survey.title" value="${this.escape(survey.title)}" />
          </label>
          <label>
            설문 안내문
            <textarea data-path="survey.description">${this.escape(survey.description)}</textarea>
          </label>
        </div>
        <div class="survey-tools">
          <button type="button" data-action="add-survey-question">설문 문항 추가</button>
          <button type="button" data-action="remove-last-survey-question">마지막 문항 삭제</button>
          <button type="button" data-action="publish-survey">설문만 VR에 저장</button>
        </div>
        <p class="editor-note">설문은 유효한 상태일 때 자동으로 VR 적용본에 저장됩니다. 입력 중 검증 오류가 있으면 초안에만 보관됩니다.</p>
        <div class="question-list survey-list">
          ${survey.questions.map((question, questionIndex) => this.renderSurveyQuestion(question, questionIndex)).join('')}
        </div>
      </section>
    `;
  }

  renderSurveyQuestion(question, questionIndex) {
    const basePath = `survey.questions.${questionIndex}`;
    const typeLabel = {
      scale5: '5점 척도',
      single: '단일 선택'
    }[question.type] || '5점 척도';

    return `
      <article class="question-card survey-card">
        <div class="question-head">
          <h3>${this.escape(question.id)} · ${questionIndex + 1}번 설문</h3>
          <strong>${typeLabel}</strong>
        </div>
        <div class="survey-question-grid">
          <label>
            문항 ID
            <input data-path="${basePath}.id" value="${this.escape(question.id)}" />
          </label>
          <label>
            문항 유형
            <select data-path="${basePath}.type" data-rerender="true">
              ${['scale5', 'single'].map((type) => `<option value="${type}" ${question.type === type ? 'selected' : ''}>${this.typeName(type)}</option>`).join('')}
            </select>
          </label>
        </div>
        <label>
          질문
          <textarea data-path="${basePath}.question">${this.escape(question.question)}</textarea>
        </label>
        ${question.type === 'scale5' ? this.renderSurveyScaleLabels(question, basePath) : ''}
        ${question.type === 'single' ? this.renderSurveyChoices(question, basePath) : ''}
      </article>
    `;
  }

  renderSurveyScaleLabels(question, basePath) {
    return `
      <div class="survey-option-grid five-columns">
        ${question.labels.map((label, index) => `
          <label>
            ${index + 1}점 라벨
            <input data-path="${basePath}.labels.${index}" value="${this.escape(label)}" />
          </label>
        `).join('')}
      </div>
    `;
  }

  renderSurveyChoices(question, basePath) {
    return `
      <div class="survey-option-grid">
        ${question.choices.map((choice, index) => `
          <label>
            선택지 ${index + 1}${index > 1 ? ' (선택)' : ''}
            <input data-path="${basePath}.choices.${index}" value="${this.escape(choice)}" />
          </label>
        `).join('')}
      </div>
    `;
  }

  bindEvents() {
    this.root.querySelectorAll('[data-path]').forEach((input) => {
      const eventName = input.tagName === 'SELECT' ? 'change' : 'input';
      input.addEventListener(eventName, () => {
        const value = input.dataset.type === 'number' ? Number(input.value) : input.value;
        this.setByPath(input.dataset.path, value);
        this.writeDraftForPath(input.dataset.path);
        if (input.dataset.path.startsWith('survey.')) {
          this.autoPublishSurvey({silent: true});
        }
        if (input.dataset.rerender === 'true') this.render();
      });
    });

    this.bindAction('validate', () => this.render());
    this.bindAction('apply', () => this.applyToVr());
    this.bindAction('export-quiz', () => this.exportQuizJson());
    this.bindAction('export-survey', () => this.exportSurveyJson());
    this.bindAction('clear-published', () => this.clearPublishedContent());
    this.bindAction('reset', () => this.resetAll());
    this.bindAction('add-survey-question', () => this.addSurveyQuestion());
    this.bindAction('remove-last-survey-question', () => this.removeLastSurveyQuestion());
    this.bindAction('publish-survey', () => {
      const published = this.autoPublishSurvey({silent: false});
      if (!published) {
        const validation = validateSurveyData(prepareSurveyForSave(this.surveyData));
        window.alert(`설문 검증 오류가 있어 VR에 저장하지 않았습니다.\n\n${validation.errors.slice(0, 6).join('\n')}`);
      }
      this.render();
    });

    this.root.querySelector('[data-action="import-quiz"]')?.addEventListener('change', (event) => this.importJson(event, 'quiz'));
    this.root.querySelector('[data-action="import-survey"]')?.addEventListener('change', (event) => this.importJson(event, 'survey'));
  }

  bindAction(action, handler) {
    this.root.querySelector(`[data-action="${action}"]`)?.addEventListener('click', handler);
  }

  setByPath(path, value) {
    const [rootName, ...parts] = path.split('.');
    let target = rootName === 'survey' ? this.surveyData : this.quizData;
    parts.slice(0, -1).forEach((part) => {
      const key = Number.isNaN(Number(part)) ? part : Number(part);
      target = target[key];
    });
    const last = parts[parts.length - 1];
    target[Number.isNaN(Number(last)) ? last : Number(last)] = value;
  }

  writeDraftForPath(path) {
    if (path.startsWith('survey.')) {
      writeJson(SURVEY_DRAFT_KEY, this.surveyData);
      return;
    }
    writeJson(QUIZ_DRAFT_KEY, this.quizData);
  }

  async importJson(event, type) {
    const file = event.target.files[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (type === 'survey') {
        this.surveyData = normaliseSurveyData(parsed);
        writeJson(SURVEY_DRAFT_KEY, this.surveyData);
        this.autoPublishSurvey({silent: false});
      } else {
        this.quizData = parsed;
        writeJson(QUIZ_DRAFT_KEY, this.quizData);
        this.statusMessage = '퀴즈 JSON을 가져왔습니다. 검증 후 VR에 적용해 주세요.';
      }
      this.render();
    } catch {
      window.alert('JSON 파일을 읽지 못했습니다. 파일 형식을 확인해 주세요.');
    } finally {
      event.target.value = '';
    }
  }

  applyToVr() {
    const quizValidation = validateQuizData(this.quizData);
    const surveyPayload = prepareSurveyForSave(this.surveyData);
    const surveyValidation = validateSurveyData(surveyPayload);
    const errors = [...quizValidation.errors.map((error) => `퀴즈: ${error}`), ...surveyValidation.errors.map((error) => `설문: ${error}`)];

    if (errors.length) {
      window.alert(`검증 오류가 있어 VR에 적용하지 않았습니다.\n\n${errors.slice(0, 8).join('\n')}`);
      this.render();
      return;
    }

    writeJson(PUBLISHED_QUIZ_KEY, this.quizData);
    writeJson(PUBLISHED_SURVEY_KEY, surveyPayload);
    writeJson(PUBLISHED_QUIZ_META_KEY, {
      updatedAt: new Date().toISOString(),
      domains: this.quizData.domains.map((domain) => ({
        id: domain.id,
        titleKo: domain.titleKo,
        questions: domain.questions.length
      }))
    });
    writeJson(PUBLISHED_SURVEY_META_KEY, {
      updatedAt: new Date().toISOString(),
      title: surveyPayload.title,
      questions: surveyPayload.questions.length
    });
    removeItem(PROGRESS_KEY);
    removeItem(SURVEY_RESPONSES_KEY);
    this.statusMessage = 'VR에 적용했습니다. VR 미리보기를 새로고침하면 수정한 퀴즈와 설문이 반영됩니다.';
    this.render();
  }

  clearPublishedContent() {
    removeItem(PUBLISHED_QUIZ_KEY);
    removeItem(PUBLISHED_SURVEY_KEY);
    removeItem(PUBLISHED_QUIZ_META_KEY);
    removeItem(PUBLISHED_SURVEY_META_KEY);
    removeItem(PROGRESS_KEY);
    removeItem(SURVEY_RESPONSES_KEY);
    this.statusMessage = 'VR 적용본을 제거했습니다. VR 미리보기는 기본 quizData.json과 surveyData.json을 다시 사용합니다.';
    this.render();
  }

  resetAll() {
    removeItem(QUIZ_DRAFT_KEY);
    removeItem(SURVEY_DRAFT_KEY);
    removeItem(PUBLISHED_QUIZ_KEY);
    removeItem(PUBLISHED_SURVEY_KEY);
    removeItem(PUBLISHED_QUIZ_META_KEY);
    removeItem(PUBLISHED_SURVEY_META_KEY);
    removeItem(PROGRESS_KEY);
    removeItem(SURVEY_RESPONSES_KEY);
    window.location.reload();
  }

  addSurveyQuestion() {
    const nextIndex = this.surveyData.questions.length;
    this.surveyData.questions.push(normaliseSurveyQuestion({
      id: `S-${nextIndex + 1}`,
      type: 'scale5',
      question: '새 설문 문항을 입력하세요.'
    }, nextIndex));
    writeJson(SURVEY_DRAFT_KEY, this.surveyData);
    this.autoPublishSurvey({silent: false});
    this.render();
  }

  removeLastSurveyQuestion() {
    if (this.surveyData.questions.length <= 1) {
      window.alert('설문 문항은 최소 1개 이상 필요합니다.');
      return;
    }
    this.surveyData.questions.pop();
    writeJson(SURVEY_DRAFT_KEY, this.surveyData);
    this.autoPublishSurvey({silent: false});
    this.render();
  }

  autoPublishSurvey({silent = true} = {}) {
    const surveyPayload = prepareSurveyForSave(this.surveyData);
    const validation = validateSurveyData(surveyPayload);
    if (!validation.valid) {
      if (!silent) {
        this.statusMessage = '설문 초안은 저장했지만, 검증 오류가 있어 VR에는 아직 적용하지 않았습니다.';
      }
      return false;
    }

    writeJson(PUBLISHED_SURVEY_KEY, surveyPayload);
    writeJson(PUBLISHED_SURVEY_META_KEY, {
      updatedAt: new Date().toISOString(),
      title: surveyPayload.title,
      questions: surveyPayload.questions.length,
      source: 'teacher-editor-auto'
    });
    removeItem(SURVEY_RESPONSES_KEY);
    if (!silent) {
      this.statusMessage = '설문을 VR에 바로 저장했습니다. VR 미리보기를 새로고침하면 반영됩니다.';
    }
    return true;
  }

  exportQuizJson() {
    const validation = validateQuizData(this.quizData);
    if (!validation.valid && !window.confirm(`퀴즈 검증 오류가 ${validation.errors.length}개 있습니다. 그래도 내보낼까요?`)) return;
    this.downloadJson('quizData.json', this.quizData);
  }

  exportSurveyJson() {
    const surveyPayload = prepareSurveyForSave(this.surveyData);
    const validation = validateSurveyData(surveyPayload);
    if (!validation.valid && !window.confirm(`설문 검증 오류가 ${validation.errors.length}개 있습니다. 그래도 내보낼까요?`)) return;
    this.downloadJson('surveyData.json', surveyPayload);
  }

  downloadJson(filename, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  typeName(type) {
    return {
      scale5: '5점 척도',
      single: '단일 선택'
    }[type] || type;
  }

  escape(value) {
    return String(value ?? '').replace(/[<>&"]/g, (char) => ({
      '<': '&lt;',
      '>': '&gt;',
      '&': '&amp;',
      '"': '&quot;'
    })[char]);
  }
}
