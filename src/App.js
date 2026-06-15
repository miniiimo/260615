import {applyTexture, createPlane} from './components/canvasTexture.js?v=20260608-homefree1';
import {QuizPanel} from './components/QuizPanel.js?v=20260608-homefree1';
import {ResultPanel} from './components/ResultPanel.js?v=20260608-homefree1';
import {StartPanel} from './components/StartPanel.js?v=20260608-homefree1';
import {SurveyPanel} from './components/SurveyPanel.js?v=20260608-homefree1';
import {IntroVideoPanel} from './components/IntroVideoPanel.js?v=20260608-homefree1';
import {registerGalaxyFloorComponent} from './components/GalaxyFloor.js?v=20260608-homefree1';
import {bindHoverEffect, bindInteractiveAction} from './utils/interaction.js?v=20260608-homefree1';
import {
  REQUIRED_DOMAIN_ORDER,
  validateQuizData
} from './utils/quizValidator.js?v=20260608-homefree1';
import {
  answerQuestion,
  getAttemptCount,
  getDomainStats,
  getNextUnansweredQuestion,
  getOverallStats,
  loadProgress,
  recordAttempt,
  resetDomainProgress,
  resetProgress
} from './utils/scoreManager.js?v=20260608-homefree1';
import {
  loadSurveyResponses,
  resetSurveyResponses,
  saveSurveyAnswer
} from './utils/surveyStorage.js?v=20260608-homefree1';
import {readJson, removeItem, writeJson} from './utils/storage.js?v=20260608-homefree1';

const MAX_ATTEMPTS = 2;
const DEBUG_QUERY_VALUES = new Set(['1', 'true', 'yes', 'debug']);
const TRUE_QUERY_VALUES = new Set(['1', 'true', 'yes', 'on']);
const PUBLISHED_QUIZ_KEY = 'published-quiz';
const PUBLISHED_SURVEY_KEY = 'published-survey';
const INTRO_VIDEO_CONFIRM_KEY = 'intro-video-confirmed-v1';
const MISSION_STATE_KEY = 'ar-mission-state-v1';
const CLASSROOM_ANCHOR_KEY = 'classroom-anchor-v1';
const CLASSROOM_LAYOUT_KEY = 'classroom-panel-layout-v1';
const CLASSROOM_MODE_FLAGS = ['mr', 'ar', 'classroom', 'classroomMode'];
const CLASSROOM_ANCHOR_RESET_FLAGS = ['resetAnchor', 'resetClassroomAnchor'];
const CLASSROOM_PANEL_Y = 2.30;
const CLASSROOM_CAPTURE_RADIUS = 3.58;
const CLASSROOM_PANEL_SEQUENCE = [
  {id: 'engaging', type: 'domain', label: 'Engaging', title: '1번 문제 방'},
  {id: 'creating', type: 'domain', label: 'Creating', title: '2번 문제 방'},
  {id: 'managing', type: 'domain', label: 'Managing', title: '3번 문제 방'},
  {id: 'designing', type: 'domain', label: 'Designing', title: '마지막 탈출 방'},
  {id: 'report', type: 'utility', label: 'Report', title: '결과 리포트'},
  {id: 'framework', type: 'utility', label: 'Result', title: '문제 풀이 결과 보기'},
  {id: 'survey', type: 'utility', label: 'Survey', title: '설문조사'}
];
const DEFAULT_MISSION_ORDER = ['framework', 'engaging', 'creating', 'managing', 'designing', 'report', 'survey'];
const STUDIO_RADIUS = 2.82;
const STATION_ARC_RADIUS = 3.58;
const FRAMEWORK_PANEL_RADIUS = 3.04;
const PANEL_SWIPE_MOUSE_THRESHOLD = 24;
const PANEL_SWIPE_CONTROLLER_THRESHOLD = 0.075;
const PANEL_SWIPE_COOLDOWN_MS = 260;
const FRAMEWORK_SLIDE_SLOT = 2.62;
const FRAMEWORK_SLIDE_THRESHOLD = 0.58;
const FRAMEWORK_SLIDE_COOLDOWN_MS = 260;

function normaliseQueryValue(value) {
  return String(value || '').trim().toLowerCase();
}

function getFirstQueryValue(params, names) {
  const list = Array.isArray(names) ? names : [names];
  for (const name of list) {
    const value = params.get(name);
    if (value !== null && value !== '') return value;
  }
  return '';
}

function hasQueryFlag(params, names) {
  const list = Array.isArray(names) ? names : [names];
  return list.some((name) => {
    if (!params.has(name)) return false;
    const value = params.get(name);
    return value === '' || TRUE_QUERY_VALUES.has(normaliseQueryValue(value));
  });
}

function createFacePose(angle, y = 2.30, radius = STUDIO_RADIUS) {
  const radians = angle * Math.PI / 180;
  const x = Number((Math.sin(radians) * radius).toFixed(3));
  const z = Number((-Math.cos(radians) * radius).toFixed(3));
  const ry = Number((-angle).toFixed(3));
  return {
    angle,
    x,
    y,
    z,
    ry,
    position: `${x} ${y} ${z}`,
    rotation: `0 ${ry} 0`
  };
}

function createImmersiveStarSkyTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  const rand = seededRandomStatic(20260510);
  const width = canvas.width;
  const height = canvas.height;

  ctx.fillStyle = '#020611';
  ctx.fillRect(0, 0, width, height);

  const vignette = ctx.createRadialGradient(width / 2, height * 0.52, 10, width / 2, height * 0.52, width * 0.72);
  vignette.addColorStop(0, 'rgba(20, 38, 74, 0.28)');
  vignette.addColorStop(0.42, 'rgba(7, 16, 35, 0.10)');
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0.34)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);

  drawMilkyBand(ctx, rand, width, height);
  drawSkyStars(ctx, rand, width, height, 8200, false);
  drawSkyStars(ctx, rand, width, height, 1350, true);
  drawDistantDust(ctx, rand, width, height);

  return canvas.toDataURL('image/png');
}

function createTransparentStarCurtainTexture(seed = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = 1700;
  canvas.height = 1200;
  const ctx = canvas.getContext('2d');
  const rand = seededRandomStatic(seed);
  const width = canvas.width;
  const height = canvas.height;
  const cx = width / 2;
  const cy = height / 2;

  ctx.clearRect(0, 0, width, height);

  ctx.save();
  const glow = ctx.createRadialGradient(cx, cy + 70, 20, cx, cy + 70, 610);
  glow.addColorStop(0, 'rgba(248, 251, 255, 0.18)');
  glow.addColorStop(0.28, 'rgba(125, 211, 252, 0.12)');
  glow.addColorStop(0.58, 'rgba(139, 92, 246, 0.055)');
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.ellipse(cx, cy + 70, 760, 360, -0.04, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  const band = ctx.createLinearGradient(0, cy - 120, width, cy + 140);
  band.addColorStop(0, 'rgba(125, 211, 252, 0)');
  band.addColorStop(0.34, 'rgba(199, 210, 254, 0.10)');
  band.addColorStop(0.58, 'rgba(255, 255, 255, 0.13)');
  band.addColorStop(0.78, 'rgba(139, 92, 246, 0.09)');
  band.addColorStop(1, 'rgba(125, 211, 252, 0)');
  ctx.translate(cx, cy);
  ctx.rotate(-0.08 + rand() * 0.16);
  ctx.fillStyle = band;
  ctx.beginPath();
  ctx.ellipse(0, 30, 780, 112, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  for (let index = 0; index < 1450; index += 1) {
    const cluster = rand() < 0.62;
    const angle = rand() * Math.PI * 2;
    const radius = Math.pow(rand(), 0.68) * 790;
    const x = cluster ? cx + Math.cos(angle) * radius : rand() * width;
    const y = cluster ? cy + Math.sin(angle) * radius * 0.50 : rand() * height;
    const size = 0.7 + Math.pow(rand(), 2.5) * 5.4;
    const color = pickSkyColor(rand);
    const alpha = 0.22 + rand() * 0.66;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowColor = color;
    ctx.shadowBlur = size * 3.2;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();

    if (size > 2.7 || rand() > 0.90) {
      ctx.globalAlpha = alpha * 0.52;
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(0.6, size * 0.18);
      ctx.beginPath();
      ctx.moveTo(x - size * 4.1, y);
      ctx.lineTo(x + size * 4.1, y);
      ctx.moveTo(x, y - size * 4.1);
      ctx.lineTo(x, y + size * 4.1);
      ctx.stroke();
    }
    ctx.restore();
  }

  for (let index = 0; index < 32; index += 1) {
    const x = rand() * width;
    const y = height * (0.18 + rand() * 0.64);
    const length = 42 + rand() * 120;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.62 + rand() * 1.24);
    const streak = ctx.createLinearGradient(-length / 2, 0, length / 2, 0);
    streak.addColorStop(0, 'rgba(125, 211, 252, 0)');
    streak.addColorStop(0.5, `rgba(248, 251, 255, ${0.07 + rand() * 0.14})`);
    streak.addColorStop(1, 'rgba(139, 92, 246, 0)');
    ctx.strokeStyle = streak;
    ctx.lineWidth = 1 + rand() * 1.4;
    ctx.beginPath();
    ctx.moveTo(-length / 2, 0);
    ctx.lineTo(length / 2, 0);
    ctx.stroke();
    ctx.restore();
  }

  return canvas.toDataURL('image/png');
}

function drawMilkyBand(ctx, rand, width, height) {
  ctx.save();
  const bandGradient = ctx.createLinearGradient(0, height * 0.30, width, height * 0.72);
  bandGradient.addColorStop(0, 'rgba(37, 99, 235, 0.00)');
  bandGradient.addColorStop(0.20, 'rgba(90, 117, 255, 0.08)');
  bandGradient.addColorStop(0.50, 'rgba(248, 251, 255, 0.14)');
  bandGradient.addColorStop(0.76, 'rgba(139, 92, 246, 0.10)');
  bandGradient.addColorStop(1, 'rgba(37, 99, 235, 0.00)');
  ctx.fillStyle = bandGradient;
  ctx.beginPath();
  ctx.moveTo(0, height * 0.56);
  for (let x = 0; x <= width; x += 32) {
    const y = height * 0.50 + Math.sin(x * 0.006) * 52 + Math.sin(x * 0.017) * 22;
    ctx.lineTo(x, y - 132);
  }
  for (let x = width; x >= 0; x -= 32) {
    const y = height * 0.50 + Math.sin(x * 0.006) * 52 + Math.sin(x * 0.017) * 22;
    ctx.lineTo(x, y + 132);
  }
  ctx.closePath();
  ctx.filter = 'blur(18px)';
  ctx.fill();
  ctx.restore();

  for (let index = 0; index < 2800; index += 1) {
    const x = rand() * width;
    const centerY = height * 0.50 + Math.sin(x * 0.006) * 52 + Math.sin(x * 0.017) * 22;
    const y = centerY + gaussianStatic(rand) * 86;
    const size = 0.45 + Math.pow(rand(), 2.8) * 2.6;
    const alpha = 0.12 + rand() * 0.40;
    const color = pickSkyColor(rand);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowColor = color;
    ctx.shadowBlur = size * 3.2;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawSkyStars(ctx, rand, width, height, count, bright) {
  for (let index = 0; index < count; index += 1) {
    const x = rand() * width;
    const y = rand() * height;
    const color = pickSkyColor(rand);
    const size = bright
      ? 0.9 + Math.pow(rand(), 2.2) * 4.7
      : 0.35 + Math.pow(rand(), 2.8) * 2.3;
    const alpha = bright ? 0.34 + rand() * 0.62 : 0.18 + rand() * 0.48;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowColor = color;
    ctx.shadowBlur = size * (bright ? 4.2 : 2.4);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();

    if (bright && (size > 2.4 || rand() > 0.58)) {
      ctx.globalAlpha = alpha * 0.52;
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(0.6, size * 0.16);
      ctx.beginPath();
      ctx.moveTo(x - size * 4.4, y);
      ctx.lineTo(x + size * 4.4, y);
      ctx.moveTo(x, y - size * 4.4);
      ctx.lineTo(x, y + size * 4.4);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawDistantDust(ctx, rand, width, height) {
  for (let index = 0; index < 90; index += 1) {
    const x = rand() * width;
    const y = height * (0.16 + rand() * 0.68);
    const length = 28 + rand() * 110;
    const alpha = 0.04 + rand() * 0.10;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.55 + rand() * 1.1);
    const gradient = ctx.createLinearGradient(-length / 2, 0, length / 2, 0);
    gradient.addColorStop(0, 'rgba(125, 211, 252, 0)');
    gradient.addColorStop(0.5, `rgba(248, 251, 255, ${alpha})`);
    gradient.addColorStop(1, 'rgba(139, 92, 246, 0)');
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 0.8 + rand() * 1.5;
    ctx.beginPath();
    ctx.moveTo(-length / 2, 0);
    ctx.lineTo(length / 2, 0);
    ctx.stroke();
    ctx.restore();
  }
}

function pickSkyColor(rand) {
  const colors = ['#ffffff', '#dff7ff', '#b9e7ff', '#c8c3ff', '#d9c3ff', '#fff1b8'];
  return colors[Math.floor(rand() * colors.length)];
}

function seededRandomStatic(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let mixed = value;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussianStatic(random) {
  let u = 0;
  let v = 0;
  while (u === 0) u = random();
  while (v === 0) v = random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

const STUDIO_FACES = {
  progress: {...createFacePose(0, 2.30, STATION_ARC_RADIUS), label: 'Progress', zone: '진행률 / 리포트', accentKey: 'navy'},
  framework: {...createFacePose(-42, 2.30, STATION_ARC_RADIUS), label: 'Result', zone: '문제 풀이 결과 보기', accentKey: 'framework'},
  managing: {...createFacePose(-84, 2.30, STATION_ARC_RADIUS), label: 'Managing', zone: '3번 문제 방', accentKey: 'success'},
  engaging: {...createFacePose(-126, 2.30, STATION_ARC_RADIUS), label: 'Engaging', zone: '1번 문제 방', accentKey: 'sky'},
  creating: {...createFacePose(42, 2.30, STATION_ARC_RADIUS), label: 'Creating', zone: '2번 문제 방', accentKey: 'violet'},
  designing: {...createFacePose(84, 2.30, STATION_ARC_RADIUS), label: 'Designing', zone: '마지막 탈출 방', accentKey: 'warning'},
  survey: {...createFacePose(126, 2.30, STATION_ARC_RADIUS), label: 'Survey', zone: '설문조사', accentKey: 'mint'}
};

const STUDIO_FACE_ORDER = ['progress', 'creating', 'designing', 'survey', 'engaging', 'managing', 'framework'];

const SINGLE_QUIZ_TRANSFORM = {
  x: STUDIO_FACES.engaging.x,
  y: 2.28,
  z: STUDIO_FACES.engaging.z,
  ry: STUDIO_FACES.engaging.ry,
  choiceCards = [
    {x: -0.66, y: 0.00, z: 0.34},
    {x: 0.66, y: 0.00, z: 0.36},
    {x: -0.66, y: -0.60, z: 0.34},
    {x: 0.66, y: -0.60, z: 0.36}
  ],
  feedbackPanel: {
    positionString: '0 -1.08 0.58',
    enterFromString: '0 -0.92 0.38',
    width: 2.28,
    height: 0.46
  },
  nextButton: {positionString: '0.98 -1.08 0.72'},
  closeButton: {positionString: '1.08 1.36 0.42'}
};

const SECTION_FOCUS_ROTATION = {
  start: 0,
  domainSelect: 0,
  framework: 0,
  report: STUDIO_FACES.progress.ry,
  survey: STUDIO_FACES.survey.ry
};

const SECTION_POSES = {
  start: {position: '0 2.28 -3.05', rotation: '0 0 0'},
  report: {position: createFacePose(0, 2.34, 3.34).position, rotation: createFacePose(0).rotation},
  survey: {position: STUDIO_FACES.survey.position, rotation: STUDIO_FACES.survey.rotation}
};

const DEFAULT_THEME = {
  contentTitle: '우리 반 AI 로봇의 비밀',
  heroTitle: '우리 반 AI 로봇의 비밀',
  heroSubtitle: '',
  schoolName: '',
  subtitle: '',
  startGuide: '',
  startButtonText: '시작하기',
  resultTitle: '결과 리포트',
  palette: {
    surface: '#eef6fb',
    surfaceElevated: '#f8fbff',
    navy: '#102235',
    ink: '#10243a',
    muted: '#506b84',
    line: '#b9cde0',
    sky: '#62c6f2',
    violet: '#8b5cf6',
    mint: '#5eead4',
    success: '#21a66b',
    danger: '#de4d5a',
    warning: '#f59e0b'
  },
  ui: {
    radius: 42,
    borderWidth: 2,
    shadow: 'rgba(8, 22, 38, 0.16)',
    panelStyle: 'cleanFlat'
  },
  domains: {
    engaging: {accent: '#2563eb', icon: 'AI', shortLabel: '1번 방'},
    creating: {accent: '#8b5cf6', icon: 'CREATE', shortLabel: '2번 방'},
    managing: {accent: '#16a34a', icon: 'GUIDE', shortLabel: '3번 방'},
    designing: {accent: '#f97316', icon: 'BUILD', shortLabel: '마지막 방'}
  },
  introVideo: {
    enabled: false,
    type: 'mp4',
    url: '',
    title: '먼저 영상을 확인하세요',
    kicker: '사전 영상',
    description: '영상을 본 뒤 교실 속 마커를 찾아 문제를 해결합니다.',
    confirmText: '영상 확인 완료',
    requiredBeforeQuiz: true
  },
  arMission: {
    enabled: true,
    sequential: true,
    markerMode: true,
    order: DEFAULT_MISSION_ORDER
  }
};

export class VRQuizApp {
  constructor(root, config = {}) {
    this.root = root;
    this.config = {
      quizUrl: '../src/data/quizData.json',
      themeUrl: '../src/data/themeConfig.json',
      surveyUrl: '../src/data/surveyData.json',
      classroomLayoutUrl: '../src/data/classroomLayout.json',
      ...config
    };

    this.data = null;
    this.theme = DEFAULT_THEME;
    this.surveyData = null;
    this.progress = loadProgress();
    this.surveyResponses = loadSurveyResponses();
    this.appMode = 'start';
    this.activeDomain = null;
    this.quizPanels = new Map();
    this.domainCards = new Map();
    this.domainCardButtons = new Map();
    this.progressMarkers = [];
    this.domainFocusIndex = 0;
    this.lastWheelNavigationAt = 0;
    this.panelSwipeState = null;
    this.lastPanelSwipeAt = 0;
    this.frameworkDetailFocusIndex = 0;
    this.frameworkCarouselStickDirection = 0;
    this.lastFrameworkCarouselAt = 0;
    this.classroomHotspots = [];
    this.classroomHotspotRoots = new Map();
    this.classroomLayout = null;
    this.classroomLayoutFile = null;
    this.classroomPlacementIndex = 0;
    this.savedClassroomAnchor = null;
    this.introVideoConfirmed = false;
    this.missionState = readJson(MISSION_STATE_KEY, {completed: {}});
    this.pendingPointAfterIntro = null;
    const params = new URLSearchParams(window.location.search);
    this.queryParams = params;
    this.runtimeMode = normaliseQueryValue(getFirstQueryValue(params, ['mode', 'studioMode'])) || 'student';
    this.routeOptions = this.parseRouteOptions(params);
    this.debug = Boolean(config.debug) || DEBUG_QUERY_VALUES.has(String(params.get('debug') || '').toLowerCase()) || params.has('debug');
  }

  async start() {
    this.setLoading('문제 풀이 결과 보기 프로그램을 불러오는 중입니다.');

    try {
      const [quizData, themeData, surveyData, classroomLayoutData] = await Promise.all([
        this.loadQuizData(),
        this.loadOptionalJson(this.config.themeUrl, {}),
        this.loadSurveyData(),
        this.loadOptionalJson(this.config.classroomLayoutUrl, null)
      ]);
      this.data = quizData;
      this.theme = this.deepMerge(DEFAULT_THEME, themeData || {});
      this.surveyData = surveyData;
      this.classroomLayoutFile = this.normaliseClassroomLayout(classroomLayoutData);

      const validation = validateQuizData(this.data);
      if (!validation.valid) throw new Error(validation.errors.join('\n'));

      this.applyStartupStorageFlags();
      registerGalaxyFloorComponent();
      registerXrVisibilityComponents();
      this.renderScene();
      this.bindXrSessionUiState();
      this.configureRendererQuality();
      this.renderStudioEnvironment();
      this.renderStudioUi();
      this.renderClassroomPlacementUi();
      this.configureClassroomMode();
      this.bindKeyboardControls();
      this.bindWheelControls();
      this.bindPanelSwipeControls();
      this.bindFrameworkCarouselControls();
      this.exposeRuntimeApi();
      this.applyInitialRoute();
    } catch (error) {
      this.setError(error.message || '앱을 시작하지 못했습니다.');
    }
  }

  parseRouteOptions(params) {
    const view = normaliseQueryValue(getFirstQueryValue(params, ['view', 'screen', 'debugstate']));
    const domain = normaliseQueryValue(getFirstQueryValue(params, ['domain', 'startDomain']));
    return {
      view,
      domain,
      teacherPreview: hasQueryFlag(params, 'teacherPreview') || this.runtimeMode === 'teacher',
      skipIntro: hasQueryFlag(params, ['skipintro', 'skipIntro', 'skipStart']),
      resetAll: hasQueryFlag(params, ['reset', 'resetAll']),
      resetProgress: hasQueryFlag(params, 'resetProgress'),
      resetSurvey: hasQueryFlag(params, 'resetSurvey'),
      resetVideo: hasQueryFlag(params, ['resetVideo', 'resetIntroVideo']),
      skipVideo: hasQueryFlag(params, ['skipVideo', 'videoDone']),
      point: normaliseQueryValue(getFirstQueryValue(params, ['point', 'marker', 'mission'])),
      classroomMode: hasQueryFlag(params, CLASSROOM_MODE_FLAGS),
      placementMode: hasQueryFlag(params, ['placement', 'place', 'setAnchor']),
      resetClassroomAnchor: hasQueryFlag(params, CLASSROOM_ANCHOR_RESET_FLAGS)
    };
  }

  applyStartupStorageFlags() {
    if (this.routeOptions.resetAll || this.routeOptions.resetProgress) {
      resetProgress();
      this.progress = loadProgress();
    }
    if (this.routeOptions.resetAll || this.routeOptions.resetSurvey) {
      resetSurveyResponses();
      this.surveyResponses = loadSurveyResponses();
    }
    removeItem(INTRO_VIDEO_CONFIRM_KEY);
    if (this.routeOptions.resetAll || this.routeOptions.resetVideo) {
      this.introVideoConfirmed = false;
    }
    if (this.routeOptions.resetAll) {
      removeItem(MISSION_STATE_KEY);
      this.missionState = {completed: {}};
    }
  }

  applyInitialRoute() {
    const view = this.routeOptions.view || this.runtimeMode;
    const domainId = this.routeOptions.domain;
    const pointId = this.routeOptions.point;
    const hasDomainRoute = domainId && this.findDomain(domainId);
    this.scene.dataset.runtimeMode = this.runtimeMode;

    if (pointId && this.isKnownPoint(pointId)) {
      this.pendingPointAfterIntro = pointId;
      if (this.shouldRequireIntroVideo()) {
        this.debugLog('initial-route-intro-video-before-point', {pointId});
        this.showIntroVideo();
        return;
      }
      this.openPoint(pointId);
      return;
    }

    if (this.shouldRequireIntroVideo() && (this.routeOptions.skipIntro || this.routeOptions.teacherPreview || hasDomainRoute || ['domains', 'domainselect', 'select', 'hub', 'teacher', 'preview'].includes(view))) {
      this.debugLog('initial-route-intro-video-gate', {view, domainId});
      this.pendingPointAfterIntro = hasDomainRoute ? domainId : null;
      this.showIntroVideo();
      return;
    }

    if (this.routeOptions.classroomMode && (this.routeOptions.placementMode || !this.savedClassroomAnchor)) {
      this.debugLog('initial-route-classroom-placement', {
        placementMode: this.routeOptions.placementMode,
        hasSavedAnchor: Boolean(this.savedClassroomAnchor)
      });
      this.showClassroomPlacement();
      return;
    }

    if (this.routeOptions.classroomMode && !this.hasCompleteClassroomLayout()) {
      this.debugLog('initial-route-classroom-panel-placement', {
        hasSavedAnchor: Boolean(this.savedClassroomAnchor),
        placed: Object.keys(this.classroomLayout?.placements || {}).length
      });
      this.showClassroomPanelPlacement();
      return;
    }

    if (hasDomainRoute) {
      this.debugLog('initial-route-domain', {domainId, view});
      this.openPoint(domainId);
      return;
    }

    if (['report', 'result', 'results', 'victory'].includes(view)) {
      this.debugLog('initial-route-report', {view});
      this.showReport();
      return;
    }

    if (['survey', 'reflection'].includes(view)) {
      this.debugLog('initial-route-survey', {view});
      this.showSurvey();
      return;
    }

    if (['framework', 'oecd', 'literacy'].includes(view)) {
      this.debugLog('initial-route-framework', {view});
      this.showFrameworkInfo();
      return;
    }

    if (
      ['domains', 'domainselect', 'select', 'hub', 'teacher', 'preview'].includes(view) ||
      this.routeOptions.skipIntro ||
      this.routeOptions.teacherPreview
    ) {
      this.debugLog('initial-route-domain-select', {
        view,
        teacherPreview: this.routeOptions.teacherPreview,
        skipIntro: this.routeOptions.skipIntro
      });
      this.showDomainSelect();
      return;
    }

    this.debugLog('initial-route-start', {view});
    this.showStart();
  }

  async loadQuizData() {
    const publishedQuiz = readJson(PUBLISHED_QUIZ_KEY, null);
    if (publishedQuiz) {
      this.debugLog('load-published-quiz', {source: 'localStorage'});
      return publishedQuiz;
    }
    return this.loadJson(this.config.quizUrl, 'src/data/quizData.json 파일을 읽지 못했습니다.');
  }

  async loadSurveyData() {
    const publishedSurvey = readJson(PUBLISHED_SURVEY_KEY, null);
    if (publishedSurvey) {
      this.debugLog('load-published-survey', {source: 'localStorage'});
      return publishedSurvey;
    }
    return this.loadOptionalJson(this.config.surveyUrl, {title: '설문', description: '', questions: []});
  }

  async loadJson(url, errorMessage) {
    const response = await fetch(url, {cache: 'no-store'});
    if (!response.ok) throw new Error(errorMessage);
    return response.json();
  }

  async loadOptionalJson(url, fallback) {
    try {
      const response = await fetch(url, {cache: 'no-store'});
      if (!response.ok) return fallback;
      return response.json();
    } catch {
      return fallback;
    }
  }

  renderScene() {
    this.root.innerHTML = `
      <a-scene
        id="vr-scene"
        background="color: #020611; transparent: true"
        renderer="antialias: true; colorManagement: true; alpha: true"
        cursor="rayOrigin: mouse"
        raycaster="objects: .interactive; far: 14; interval: 60"
        fog="type: exponential; color: #020611; density: 0.004"
        xr-mode-ui="enabled: true; XRMode: xr; enterVRButton: #enter-vr-button; enterARButton: #enter-ar-button"
        webxr="optionalFeatures: local-floor, bounded-floor, hand-tracking, hit-test"
      >
        <a-assets id="scene-assets"></a-assets>
        <a-sky id="studio-sky" color="#ffffff" src="bg.jpg" hide-on-enter-ar></a-sky>
        <a-entity id="studio-root">
          <a-entity id="environment-root" hide-on-enter-ar></a-entity>
          <a-entity id="classroom-anchor-root"></a-entity>
        </a-entity>

        <a-entity light="type: ambient; intensity: 0.72; color: #edf7ff"></a-entity>
        <a-entity light="type: hemisphere; intensity: 0.64; color: #dff5ff; groundColor: #030712"></a-entity>
        <a-entity light="type: directional; intensity: 0.48; color: #f4fbff" position="-2 7 5"></a-entity>
        <a-entity light="type: point; intensity: 0.34; color: #7dd3fc; distance: 12" position="0 3.2 -2.2"></a-entity>
        <a-entity light="type: point; intensity: 0.18; color: #8b5cf6; distance: 10" position="-2.8 2.6 0.2"></a-entity>
        <a-entity light="type: point; intensity: 0.18; color: #5eead4; distance: 10" position="2.8 2.6 0.2"></a-entity>

        <a-entity id="cameraRig" position="0 1.6 0" rotation="0 0 0">
          <a-camera id="camera" look-controls position="0 0 0">
            <a-cursor
              fuse="false"
              raycaster="objects: .interactive; far: 14; interval: 60"
              material="color: #18364f; shader: flat"
              geometry="primitive: ring; radiusInner: 0.008; radiusOuter: 0.014"
            ></a-cursor>
          </a-camera>
          <a-entity
            id="rightHand"
            laser-controls="hand: right"
            cursor="rayOrigin: entity; fuse: false"
            raycaster="objects: .interactive; far: 14; interval: 60"
            line="color: #2dd4bf; opacity: 0.9"
          ></a-entity>
          <a-entity
            id="leftHand"
            laser-controls="hand: left"
            cursor="rayOrigin: entity; fuse: false"
            raycaster="objects: .interactive; far: 14; interval: 60"
            line="color: #93c5fd; opacity: 0.8"
          ></a-entity>
        </a-entity>
      </a-scene>
    `;

    this.scene = this.root.querySelector('#vr-scene');
    this.studioRoot = this.root.querySelector('#studio-root');
    this.environmentRoot = this.root.querySelector('#environment-root');
    this.classroomRoot = this.root.querySelector('#classroom-anchor-root');
    this.assetsRoot = this.root.querySelector('#scene-assets');
    this.sky = this.root.querySelector('#studio-sky');
    this.cameraRig = this.root.querySelector('#cameraRig');
    this.camera = this.root.querySelector('#camera');
    this.rightHand = this.root.querySelector('#rightHand');
    this.leftHand = this.root.querySelector('#leftHand');
    this.scene.dataset.debug = String(this.debug);
  }

  bindXrSessionUiState() {
    if (!this.scene) return;
    const vrButton = document.querySelector('#enter-vr-button');
    const arButton = document.querySelector('#enter-ar-button');

    vrButton?.addEventListener('click', () => {
      document.body.dataset.xrRequestedMode = 'vr';
    });
    arButton?.addEventListener('click', () => {
      document.body.dataset.xrRequestedMode = 'ar';
    });

    const syncButtonSupport = () => {
      [
        {button: vrButton, mode: 'vr'},
        {button: arButton, mode: 'ar'}
      ].forEach(({button, mode}) => {
        if (!button) return;
        const supported = !button.classList.contains('a-hidden');
        const label = button.querySelector('.xr-entry-label');
        if (label) {
          if (!label.dataset.defaultText) label.dataset.defaultText = label.textContent;
          label.textContent = supported ? label.dataset.defaultText : `${mode.toUpperCase()} 미지원`;
        }
        button.disabled = !supported;
        button.dataset.xrSupported = String(supported);
        button.setAttribute('aria-disabled', String(!supported));
        button.title = supported
          ? `${mode.toUpperCase()} 모드로 진입합니다.`
          : `이 브라우저 또는 기기에서는 ${mode.toUpperCase()} 모드 진입을 지원하지 않습니다.`;
      });
    };

    [vrButton, arButton].filter(Boolean).forEach((button) => {
      const observer = new MutationObserver(syncButtonSupport);
      observer.observe(button, {attributes: true, attributeFilter: ['class']});
    });
    window.setTimeout(syncButtonSupport, 300);
    window.setTimeout(syncButtonSupport, 1200);

    this.scene.addEventListener('enter-vr', () => {
      const mode = this.scene.is('ar-mode') ? 'ar' : 'vr';
      document.body.dataset.xrSession = 'active';
      document.body.dataset.xrMode = mode;
      this.scene.dataset.xrMode = mode;
      this.debugLog('xr-session-enter', {mode});
    });

    this.scene.addEventListener('exit-vr', () => {
      delete document.body.dataset.xrSession;
      delete document.body.dataset.xrMode;
      delete this.scene.dataset.xrMode;
      this.debugLog('xr-session-exit');
    });
  }

  configureRendererQuality() {
    const applyQuality = () => {
      const renderer = this.scene?.renderer;
      if (!renderer) return false;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      return true;
    };

    if (!applyQuality()) {
      this.scene?.addEventListener('renderstart', applyQuality, {once: true});
      window.requestAnimationFrame(applyQuality);
    }
  }

  isClassroomModeActive() {
    return Boolean(this.routeOptions?.classroomMode);
  }

  configureClassroomMode() {
    if (!this.isClassroomModeActive()) {
      this.setGroupVisible(this.classroomRoot, true);
      return;
    }

    if (this.routeOptions.resetClassroomAnchor) {
      localStorage.removeItem(CLASSROOM_ANCHOR_KEY);
      localStorage.removeItem(CLASSROOM_LAYOUT_KEY);
    }

    const canUseLayoutFile = !this.routeOptions.resetClassroomAnchor && !this.routeOptions.placementMode;
    const localLayout = this.loadClassroomLayout();
    const fileLayout = canUseLayoutFile ? this.classroomLayoutFile : null;

    this.savedClassroomAnchor = this.loadClassroomAnchor() || fileLayout?.anchor || null;
    this.classroomLayout = this.hasAnyClassroomPlacement(localLayout) ? localLayout : fileLayout || localLayout;
    this.scene.dataset.classroomMode = 'true';
    this.sky?.setAttribute('visible', 'false');
    this.setGroupVisible(this.environmentRoot, false);

    if (this.savedClassroomAnchor) {
      this.applyClassroomAnchor(this.savedClassroomAnchor, false);
      this.applyClassroomLayout();
      this.setGroupVisible(this.classroomRoot, true);
    } else {
      this.setGroupVisible(this.classroomRoot, false);
    }
  }

  loadClassroomAnchor() {
    try {
      const raw = localStorage.getItem(CLASSROOM_ANCHOR_KEY);
      if (!raw) return null;
      const anchor = JSON.parse(raw);
      if (!anchor?.position || !anchor?.rotation) return null;
      return anchor;
    } catch {
      return null;
    }
  }

  saveClassroomAnchor(anchor) {
    localStorage.setItem(CLASSROOM_ANCHOR_KEY, JSON.stringify(anchor));
    this.savedClassroomAnchor = anchor;
  }

  loadClassroomLayout() {
    try {
      const raw = localStorage.getItem(CLASSROOM_LAYOUT_KEY);
      if (!raw) return {version: 1, placements: {}};
      const layout = JSON.parse(raw);
      if (!layout?.placements) return {version: 1, placements: {}};
      return layout;
    } catch {
      return {version: 1, placements: {}};
    }
  }

  saveClassroomLayout() {
    if (!this.classroomLayout) this.classroomLayout = {version: 1, placements: {}};
    this.classroomLayout.updatedAt = new Date().toISOString();
    localStorage.setItem(CLASSROOM_LAYOUT_KEY, JSON.stringify(this.classroomLayout));
  }

  normaliseClassroomLayout(layout) {
    if (!layout || typeof layout !== 'object') return null;
    const placements = layout.placements && typeof layout.placements === 'object' ? layout.placements : {};
    const anchor = layout.anchor?.position && layout.anchor?.rotation ? layout.anchor : null;
    if (!anchor && Object.keys(placements).length === 0) return null;
    return {
      version: Number(layout.version || 1),
      anchor,
      placements
    };
  }

  hasAnyClassroomPlacement(layout) {
    return Object.keys(layout?.placements || {}).length > 0;
  }

  buildClassroomLayoutExport() {
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      anchor: this.savedClassroomAnchor || this.loadClassroomAnchor(),
      placements: this.classroomLayout?.placements || {}
    };
  }

  downloadClassroomLayout() {
    const blob = new Blob(
      [JSON.stringify(this.buildClassroomLayoutExport(), null, 2)],
      {type: 'application/json;charset=utf-8'}
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'classroomLayout.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    this.showNotice('classroomLayout.json 파일을 다운로드했습니다. GitHub의 src/data 폴더에 업로드하세요.');
  }

  hasCompleteClassroomLayout() {
    const placements = this.classroomLayout?.placements || {};
    return CLASSROOM_PANEL_SEQUENCE.every((item) => placements[item.id]);
  }

  applyClassroomAnchor(anchor, animate = false) {
    if (!this.classroomRoot || !anchor?.position || !anchor?.rotation) return;
    const position = `${anchor.position.x} ${anchor.position.y} ${anchor.position.z}`;
    const rotation = `${anchor.rotation.x} ${anchor.rotation.y} ${anchor.rotation.z}`;
    this.classroomRoot.removeAttribute('animation__anchor_place');
    this.classroomRoot.setAttribute('rotation', rotation);
    if (animate) {
      this.classroomRoot.setAttribute('position', position);
      this.classroomRoot.setAttribute('scale', '0.94 0.94 0.94');
      this.classroomRoot.setAttribute('animation__anchor_place', 'property: scale; to: 1 1 1; dur: 260; easing: easeOutCubic');
      return;
    }
    this.classroomRoot.setAttribute('position', position);
    this.classroomRoot.setAttribute('scale', '1 1 1');
  }

  getCameraYawDegrees() {
    const THREE = window.AFRAME?.THREE || window.THREE;
    if (!THREE || !this.camera?.object3D) return 0;
    const direction = new THREE.Vector3();
    this.camera.object3D.getWorldDirection(direction);
    direction.y = 0;
    if (direction.lengthSq() < 0.0001) return 0;
    direction.normalize();
    return THREE.MathUtils.radToDeg(Math.atan2(-direction.x, -direction.z));
  }

  getCameraFloorPosition() {
    const THREE = window.AFRAME?.THREE || window.THREE;
    if (!THREE || !this.camera?.object3D) return {x: 0, y: 0, z: 0};
    const position = new THREE.Vector3();
    this.camera.object3D.getWorldPosition(position);
    return {
      x: Number(position.x.toFixed(3)),
      y: 0,
      z: Number(position.z.toFixed(3))
    };
  }

  setClassroomAnchorFromView() {
    const yaw = Number(this.getCameraYawDegrees().toFixed(3));
    const anchor = {
      version: 1,
      savedAt: new Date().toISOString(),
      position: this.getCameraFloorPosition(),
      rotation: {x: 0, y: yaw, z: 0}
    };
    this.saveClassroomAnchor(anchor);
    this.applyClassroomAnchor(anchor, true);
    this.setGroupVisible(this.classroomRoot, true);
    this.setGroupVisible(this.placementRoot, false);
    this.classroomLayout = {version: 1, placements: {}};
    localStorage.removeItem(CLASSROOM_LAYOUT_KEY);
    this.showClassroomPanelPlacement();
    this.debugLog('classroom-anchor-saved', anchor);
  }

  resetClassroomAnchor() {
    localStorage.removeItem(CLASSROOM_ANCHOR_KEY);
    localStorage.removeItem(CLASSROOM_LAYOUT_KEY);
    this.savedClassroomAnchor = null;
    this.classroomLayout = {version: 1, placements: {}};
    this.setGroupVisible(this.classroomRoot, false);
    this.showClassroomPlacement();
  }

  resetClassroomLayout() {
    localStorage.removeItem(CLASSROOM_LAYOUT_KEY);
    this.classroomLayout = {version: 1, placements: {}};
    this.showClassroomPanelPlacement();
  }

  getNextClassroomPlacementIndex() {
    const placements = this.classroomLayout?.placements || {};
    const index = CLASSROOM_PANEL_SEQUENCE.findIndex((item) => !placements[item.id]);
    return index === -1 ? CLASSROOM_PANEL_SEQUENCE.length : index;
  }

  applyClassroomLayout() {
    const placements = this.classroomLayout?.placements || {};
    CLASSROOM_PANEL_SEQUENCE.forEach((item) => {
      const root = this.classroomHotspotRoots?.get(item.id);
      const pose = placements[item.id];
      if (!root) return;
      if (!pose) {
        this.setGroupVisible(root, false);
        return;
      }
      this.applyPoseToElement(root, pose);
      this.setGroupVisible(root, true);
    });
  }

  applyPoseToElement(entity, pose) {
    if (!entity || !pose?.position || !pose?.rotation) return;
    entity.setAttribute('position', `${pose.position.x} ${pose.position.y} ${pose.position.z}`);
    entity.setAttribute('rotation', `${pose.rotation.x} ${pose.rotation.y} ${pose.rotation.z}`);
  }

  getClassroomPose(panelId, fallbackFaceId = panelId) {
    return this.classroomLayout?.placements?.[panelId] || null;
  }

  getDefaultClassroomPose(faceId) {
    const face = STUDIO_FACES[faceId] || STUDIO_FACES.engaging;
    return {
      position: {x: face.x, y: CLASSROOM_PANEL_Y, z: face.z},
      rotation: {x: 0, y: face.ry, z: 0}
    };
  }

  applyClassroomPanelPose(entity, panelId, fallbackFaceId = panelId) {
    if (!entity || !this.isClassroomModeActive()) return false;
    const pose = this.getClassroomPose(panelId, fallbackFaceId) || this.getDefaultClassroomPose(fallbackFaceId);
    this.applyPoseToElement(entity, pose);
    return true;
  }

  getPoseFromPlacementEvent(event = null) {
    const THREE = window.AFRAME?.THREE || window.THREE;
    const fallback = () => {
      const yaw = this.getCameraYawDegrees();
      const radians = yaw * Math.PI / 180;
      const x = Math.sin(radians) * CLASSROOM_CAPTURE_RADIUS;
      const z = -Math.cos(radians) * CLASSROOM_CAPTURE_RADIUS;
      return this.createLocalPanelPose(x, z);
    };

    const intersectionPoint = event?.detail?.intersection?.point || event?.detail?.intersections?.[0]?.point;
    if (!THREE || !intersectionPoint || !this.classroomRoot?.object3D) return fallback();

    const local = new THREE.Vector3(intersectionPoint.x, intersectionPoint.y, intersectionPoint.z);
    this.classroomRoot.object3D.worldToLocal(local);
    return this.createLocalPanelPose(local.x, local.z);
  }

  createLocalPanelPose(x, z) {
    const distance = Math.hypot(x, z) || CLASSROOM_CAPTURE_RADIUS;
    const scale = CLASSROOM_CAPTURE_RADIUS / distance;
    const px = Number((x * scale).toFixed(3));
    const pz = Number((z * scale).toFixed(3));
    const angle = Math.atan2(px, -pz) * 180 / Math.PI;
    return {
      position: {x: px, y: CLASSROOM_PANEL_Y, z: pz},
      rotation: {x: 0, y: Number((-angle).toFixed(3)), z: 0}
    };
  }

  placeNextClassroomPanel(event = null) {
    if (!this.classroomLayout) this.classroomLayout = {version: 1, placements: {}};
    const target = CLASSROOM_PANEL_SEQUENCE[this.classroomPlacementIndex];
    if (!target) return;

    const pose = this.getPoseFromPlacementEvent(event);
    this.classroomLayout.placements[target.id] = pose;
    this.saveClassroomLayout();
    this.applyClassroomLayout();
    this.debugLog('classroom-panel-placed', {id: target.id, pose});

    this.classroomPlacementIndex = this.getNextClassroomPlacementIndex();
    if (this.classroomPlacementIndex >= CLASSROOM_PANEL_SEQUENCE.length) {
      this.setGroupVisible(this.classroomPlacementCapture, false);
      this.updateClassroomPanelPlacementGuide();
      this.setGroupVisible(this.classroomLayoutDownloadButton, true);
      this.setGroupVisible(this.classroomPlacementDoneButton, true);
      this.showNotice('모든 패널 배치가 끝났습니다. 배치 파일을 다운로드해 GitHub에 업로드하세요.');
      return;
    }
    this.updateClassroomPanelPlacementGuide();
  }

  showClassroomPanelPlacement() {
    this.appMode = 'panelPlacement';
    this.activeDomain = null;
    this.scene.dataset.appMode = this.appMode;
    this.hideAllOverlays();
    this.setGroupVisible(this.classroomRoot, true);
    this.classroomPlacementIndex = this.getNextClassroomPlacementIndex();
    if (this.classroomPlacementIndex >= CLASSROOM_PANEL_SEQUENCE.length) {
      this.applyClassroomLayout();
      this.setGroupVisible(this.classroomHotspotRoot, true);
      this.setClassroomHotspotsInteractive(false);
      this.updateClassroomPanelPlacementGuide();
      this.setGroupVisible(this.classroomPanelPlacementRoot, true);
      this.setGroupVisible(this.classroomPlacementCapture, false);
      this.setGroupVisible(this.classroomLayoutDownloadButton, true);
      this.setGroupVisible(this.classroomPlacementDoneButton, true);
      this.updateHomeButtonVisibility();
      return;
    }
    this.applyClassroomLayout();
    this.setGroupVisible(this.classroomHotspotRoot, true);
    this.setClassroomHotspotsInteractive(false);
    this.updateClassroomPanelPlacementGuide();
    this.setGroupVisible(this.classroomPanelPlacementRoot, true);
    this.setGroupVisible(this.classroomLayoutDownloadButton, false);
    this.setGroupVisible(this.classroomPlacementDoneButton, false);
    this.setGroupVisible(this.classroomPlacementCapture, true);
    this.debugLog('mode-classroom-panel-placement', {index: this.classroomPlacementIndex});
    this.updateHomeButtonVisibility();
  }

  setClassroomHotspotsInteractive(interactive) {
    this.classroomHotspots.forEach((hotspot) => {
      if (!hotspot) return;
      if (interactive) {
        hotspot.classList.add('interactive');
        delete hotspot.dataset.hiddenInteractive;
        return;
      }
      hotspot.classList.remove('interactive');
      hotspot.dataset.hiddenInteractive = 'true';
    });
  }

  updateClassroomPanelPlacementGuide() {
    if (!this.classroomPanelPlacementPlane) return;
    const target = CLASSROOM_PANEL_SEQUENCE[this.classroomPlacementIndex];
    const placedCount = Math.min(this.classroomPlacementIndex, CLASSROOM_PANEL_SEQUENCE.length);
    const body = target
      ? `${target.title} 패널을 놓을 위치를 바라보고 클릭하세요.`
      : '모든 패널 배치가 끝났습니다.';
    const footer = target
      ? '클릭할 때마다 다음 패널로 넘어갑니다.'
      : '다운로드한 파일을 GitHub의 src/data/classroomLayout.json에 업로드하세요.';
    applyTexture(this.classroomPanelPlacementPlane, {
      variant: 'panel',
      width: 980,
      height: 430,
      background: '#071827',
      border: target ? this.getFaceAccent(target.id) : '#7dd3fc',
      accent: target ? this.getFaceAccent(target.id) : '#7dd3fc',
      title: target ? `${target.label} 배치` : '배치 완료',
      subtitle: `${placedCount}/${CLASSROOM_PANEL_SEQUENCE.length}`,
      body,
      footer,
      textColor: '#f8fbff',
      mutedColor: '#c6d8e8',
      titleSize: 46,
      bodySize: 30,
      bodyMaxLines: 2,
      tokens: this.theme.ui || {}
    });
  }

  renderStudioEnvironment() {
    // 도서관 그래픽 데코레이션을 위해 원래 우주 환경 오브젝트 렌더링은 전부 비워둡니다.
  }

  applyImmersiveSkyTexture() {
    if (!this.sky) return;
    this.sky.setAttribute('radius', '48');
    this.sky.setAttribute('material', {
      shader: 'flat',
      src: createImmersiveStarSkyTexture(),
      side: 'back'
    });
  }

  renderGalaxyFloor() {
    const galaxy = document.createElement('a-entity');
    galaxy.id = 'galaxy-floor';
    galaxy.setAttribute('position', '0 0.018 -1.55');
    galaxy.setAttribute(
      'galaxy-floor',
      'count: 7600; radius: 6.4; branches: 5; speed: 0.055; size: 0.032; maxPointSize: 11; opacity: 0.58; coreStrength: 0; coreGlow: 0; pointCore: 0.16; thickness: 0.018; swirl: 2.8; colorInside: #8fb8ff; colorMid: #8b5cf6; colorOutside: #24135f'
    );
    this.environmentRoot.appendChild(galaxy);
  }

  renderSkyGalaxy() {
    const halo = document.createElement('a-entity');
    halo.id = 'sky-galaxy-halo';
    halo.setAttribute('position', '0 4.55 -0.35');

    const galaxy = document.createElement('a-entity');
    galaxy.id = 'sky-galaxy';
    galaxy.setAttribute('position', '0 0 0');
    galaxy.setAttribute(
      'galaxy-floor',
      'count: 12000; radius: 5.2; branches: 5; speed: 0.08; size: 0.066; maxPointSize: 22; opacity: 0.96; coreStrength: 0.4; coreGlow: 1; pointCore: 0.38; thickness: 0.032; swirl: 2.8; colorInside: #ffb06f; colorMid: #f4a0d8; colorOutside: #311599'
    );
    halo.appendChild(galaxy);
    this.environmentRoot.appendChild(halo);
  }

  renderSpaceBackground() {
    const space = document.createElement('a-entity');
    space.id = 'space-background';

    const rand = this.seededRandom(20260508);
    const colors = ['#ffffff', '#e0f2fe', '#bfdbfe', '#ddd6fe', '#ccfbf1', '#fef3c7', '#f5d0fe'];
    const starCount = 980;

    for (let index = 0; index < starCount; index += 1) {
      const theta = rand() * Math.PI * 2;
      const radius = 7 + rand() * 24;
      const y = -2.2 + rand() * 12.8;
      const x = Math.cos(theta) * radius;
      const z = Math.sin(theta) * radius;
      const bright = rand() > 0.78;
      const tiny = rand() < 0.50;
      const star = document.createElement('a-sphere');
      const size = bright
        ? 0.018 + rand() * 0.034
        : tiny
          ? 0.006 + rand() * 0.008
          : 0.01 + rand() * 0.012;
      const opacity = bright ? 0.78 + rand() * 0.22 : 0.48 + rand() * 0.42;
      star.setAttribute('radius', size.toFixed(3));
      star.setAttribute('position', `${x.toFixed(2)} ${y.toFixed(2)} ${z.toFixed(2)}`);
      star.setAttribute('segments-width', '6');
      star.setAttribute('segments-height', '4');
      star.setAttribute(
        'material',
        `color: ${colors[Math.floor(rand() * colors.length)]}; shader: flat; transparent: true; opacity: ${opacity.toFixed(2)}`
      );
      space.appendChild(star);
    }

    this.environmentRoot.appendChild(space);
  }

  renderImmersiveStarParticles() {
    const THREE = window.AFRAME?.THREE || window.THREE;
    if (!THREE) return;

    const rand = this.seededRandom(20260510);
    const count = 24000;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const alphas = new Float32Array(count);
    const palette = [
      new THREE.Color('#ffffff'),
      new THREE.Color('#dff7ff'),
      new THREE.Color('#a8d8ff'),
      new THREE.Color('#c8c3ff'),
      new THREE.Color('#d9c3ff'),
      new THREE.Color('#fff1b8')
    ];

    for (let index = 0; index < count; index += 1) {
      const theta = rand() * Math.PI * 2;
      const phi = Math.acos((rand() * 2) - 1);
      const radius = 9 + Math.pow(rand(), 0.62) * 29;
      const bandBias = rand() < 0.52;
      const bandY = bandBias ? gaussianStatic(rand) * 3.3 : 0;
      const x = Math.sin(phi) * Math.cos(theta) * radius;
      const y = (Math.cos(phi) * radius * 0.58) + 2.0 + bandY;
      const z = Math.sin(phi) * Math.sin(theta) * radius;
      const color = palette[Math.floor(rand() * palette.length)].clone();
      const bright = rand() > 0.82;
      const sparkle = rand() > 0.945;

      positions[index * 3] = x;
      positions[index * 3 + 1] = y;
      positions[index * 3 + 2] = z;
      colors[index * 3] = color.r;
      colors[index * 3 + 1] = color.g;
      colors[index * 3 + 2] = color.b;
      sizes[index] = sparkle
        ? 0.20 + rand() * 0.20
        : bright
          ? 0.080 + rand() * 0.095
          : 0.022 + rand() * 0.048;
      alphas[index] = sparkle
        ? 0.85 + rand() * 0.15
        : bright
          ? 0.62 + rand() * 0.34
          : 0.24 + rand() * 0.40;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));

    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uPixelRatio: {value: Math.min(window.devicePixelRatio || 1, 2)},
        uMaxPointSize: {value: 18}
      },
      vertexShader: `
        uniform float uPixelRatio;
        uniform float uMaxPointSize;
        attribute float aSize;
        attribute float aAlpha;
        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          vec4 modelPosition = modelMatrix * vec4(position, 1.0);
          vec4 viewPosition = viewMatrix * modelPosition;
          gl_Position = projectionMatrix * viewPosition;

          float perspective = 120.0 / max(0.45, -viewPosition.z);
          gl_PointSize = clamp(aSize * perspective * uPixelRatio, 1.0, uMaxPointSize);
          vColor = color;
          vAlpha = aAlpha;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          vec2 uv = gl_PointCoord - vec2(0.5);
          float d = length(uv);
          float glow = smoothstep(0.5, 0.0, d);
          float core = smoothstep(0.12, 0.0, d);
          float cross = 0.0;
          cross += smoothstep(0.018, 0.0, abs(uv.x)) * smoothstep(0.48, 0.0, abs(uv.y));
          cross += smoothstep(0.018, 0.0, abs(uv.y)) * smoothstep(0.48, 0.0, abs(uv.x));
          float alpha = (pow(glow, 1.55) + core * 0.52 + cross * 0.18) * vAlpha;
          if (alpha < 0.01) discard;
          gl_FragColor = vec4(vColor + core * 0.32, alpha);
        }
      `
    });

    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;

    const entity = document.createElement('a-entity');
    entity.id = 'immersive-star-particles';
    entity.setObject3D('mesh', points);
    entity.setAttribute('animation__slow_star_drift', 'property: rotation; to: 0 360 0; dur: 180000; easing: linear; loop: true');
    this.environmentRoot.appendChild(entity);
  }

  renderPanoramicNebulaBand() {
    const THREE = window.AFRAME?.THREE || window.THREE;
    if (!THREE) return;

    const rand = this.seededRandom(20260511);
    const count = 32000;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const alphas = new Float32Array(count);
    const palette = [
      new THREE.Color('#ffffff'),
      new THREE.Color('#e6f8ff'),
      new THREE.Color('#a9ddff'),
      new THREE.Color('#c8b7ff'),
      new THREE.Color('#9d7bff'),
      new THREE.Color('#ffe7a3')
    ];