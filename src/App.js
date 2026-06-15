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
  {id: 'engaging', type: 'domain', label: 'Engaging', title: 'AI와 상호작용하기'},
  {id: 'creating', type: 'domain', label: 'Creating', title: 'AI로 창작하기'},
  {id: 'managing', type: 'domain', label: 'Managing', title: 'AI 관리하기'},
  {id: 'designing', type: 'domain', label: 'Designing', title: 'AI 설계하기'},
  {id: 'report', type: 'utility', label: 'Report', title: '결과 리포트'},
  {id: 'framework', type: 'utility', label: '로봇의 비밀', title: '우리 반 AI 로봇의 비밀'},
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

function registerXrVisibilityComponents() {
  const AFRAME = window.AFRAME;
  if (!AFRAME || AFRAME.components?.['hide-on-enter-ar']) return;

  AFRAME.registerComponent('hide-on-enter-ar', {
    init() {
      this.updateVisibility = () => {
        const isAr = Boolean(this.el.sceneEl?.is?.('ar-mode'));
        if (isAr) {
          this.previousObjectVisible = this.el.object3D.visible;
          this.previousVisibleAttr = this.el.getAttribute('visible');
          this.el.object3D.visible = false;
          this.el.setAttribute('visible', 'false');
          return;
        }
        this.el.object3D.visible = this.previousObjectVisible !== false;
        if (this.previousVisibleAttr !== null && this.previousVisibleAttr !== undefined) {
          this.el.setAttribute('visible', this.previousVisibleAttr);
        } else {
          this.el.setAttribute('visible', 'true');
        }
      };
      this.el.sceneEl?.addEventListener('enter-vr', this.updateVisibility);
      this.el.sceneEl?.addEventListener('exit-vr', this.updateVisibility);
    },
    remove() {
      this.el.sceneEl?.removeEventListener('enter-vr', this.updateVisibility);
      this.el.sceneEl?.removeEventListener('exit-vr', this.updateVisibility);
    }
  });
}

const STUDIO_FACES = {
  progress: {...createFacePose(0, 2.30, STATION_ARC_RADIUS), label: 'Progress', zone: '진행률 / 리포트', accentKey: 'navy'},
  framework: {...createFacePose(-42, 2.30, STATION_ARC_RADIUS), label: '로봇의 비밀', zone: '우리 반 AI 로봇의 비밀', accentKey: 'framework'},
  managing: {...createFacePose(-84, 2.30, STATION_ARC_RADIUS), label: 'Managing', zone: 'AI 관리하기', accentKey: 'success'},
  engaging: {...createFacePose(-126, 2.30, STATION_ARC_RADIUS), label: 'Engaging', zone: 'AI와 상호작용하기', accentKey: 'sky'},
  creating: {...createFacePose(42, 2.30, STATION_ARC_RADIUS), label: 'Creating', zone: 'AI로 창작하기', accentKey: 'violet'},
  designing: {...createFacePose(84, 2.30, STATION_ARC_RADIUS), label: 'Designing', zone: 'AI 설계하기', accentKey: 'warning'},
  survey: {...createFacePose(126, 2.30, STATION_ARC_RADIUS), label: 'Survey', zone: '설문조사', accentKey: 'mint'}
};

const STUDIO_FACE_ORDER = ['progress', 'creating', 'designing', 'survey', 'engaging', 'managing', 'framework'];

const SINGLE_QUIZ_TRANSFORM = {
  x: STUDIO_FACES.engaging.x,
  y: 2.28,
  z: STUDIO_FACES.engaging.z,
  ry: STUDIO_FACES.engaging.ry,
  choiceCards: [
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
    engaging: {accent: '#2563eb', icon: 'AI', shortLabel: '인식'},
    creating: {accent: '#8b5cf6', icon: 'CREATE', shortLabel: '창작'},
    managing: {accent: '#16a34a', icon: 'GUIDE', shortLabel: '관리'},
    designing: {accent: '#f97316', icon: 'BUILD', shortLabel: '설계'}
  },
  introVideo: {
    enabled: true,
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
    sequential: false,
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
    this.setLoading('우리 반 AI 로봇의 비밀 프로그램을 불러오는 중입니다.');

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
    // 우주 배경 삭제 및 도서관 테마 적용 완료
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

    for (let index = 0; index < count; index += 1) {
      const theta = rand() * Math.PI * 2;
      const inCoreBand = rand() < 0.76;
      const radius = inCoreBand
        ? 6.4 + Math.pow(rand(), 0.52) * 7.0 + gaussianStatic(rand) * 0.48
        : 8.8 + Math.pow(rand(), 0.72) * 13.6 + gaussianStatic(rand) * 1.12;
      const wave = Math.sin(theta * 1.8 + 0.9) * 0.38 + Math.sin(theta * 4.2 - 0.35) * 0.18;
      const y = 1.36 + wave + gaussianStatic(rand) * (inCoreBand ? 0.46 : 1.06);
      const color = palette[Math.floor(rand() * palette.length)].clone();
      const bright = rand() > 0.83;
      const sparkle = rand() > 0.965;

      positions[index * 3] = Math.cos(theta) * radius;
      positions[index * 3 + 1] = y;
      positions[index * 3 + 2] = Math.sin(theta) * radius;
      colors[index * 3] = color.r;
      colors[index * 3 + 1] = color.g;
      colors[index * 3 + 2] = color.b;
      sizes[index] = sparkle
        ? 0.16 + rand() * 0.15
        : bright
          ? 0.065 + rand() * 0.075
          : 0.018 + rand() * 0.035;
      alphas[index] = sparkle
        ? 0.74 + rand() * 0.22
        : bright
          ? 0.48 + rand() * 0.30
          : 0.14 + rand() * 0.24;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));

    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uPixelRatio: {value: Math.min(window.devicePixelRatio || 1, 2)},
        uMaxPointSize: {value: 20}
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

          float perspective = 118.0 / max(0.45, -viewPosition.z);
          gl_PointSize = clamp(aSize * perspective * uPixelRatio, 0.9, uMaxPointSize);
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
          float core = smoothstep(0.13, 0.0, d);
          float cross = 0.0;
          cross += smoothstep(0.014, 0.0, abs(uv.x)) * smoothstep(0.45, 0.0, abs(uv.y));
          cross += smoothstep(0.014, 0.0, abs(uv.y)) * smoothstep(0.45, 0.0, abs(uv.x));
          float alpha = (pow(glow, 1.45) + core * 0.46 + cross * 0.20) * vAlpha;
          if (alpha < 0.01) discard;
          gl_FragColor = vec4(vColor + core * 0.22, alpha);
        }
      `
    });

    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;

    const entity = document.createElement('a-entity');
    entity.id = 'panoramic-nebula-band';
    entity.setObject3D('mesh', points);
    entity.setAttribute('animation__nebula_drift', 'property: rotation; to: 0 -360 0; dur: 260000; easing: linear; loop: true');
    this.environmentRoot.appendChild(entity);
  }

  seededRandom(seed) {
    let value = seed >>> 0;
    return () => {
      value += 0x6D2B79F5;
      let mixed = value;
      mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
      mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
      return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
    };
  }

  renderStudioShell() {
    const palette = this.theme.palette || {};
    const shell = document.createElement('a-entity');
    shell.id = 'studio-shell';

    STUDIO_FACE_ORDER.forEach((faceId) => {
      const face = STUDIO_FACES[faceId];
      const accent = this.getFaceAccent(faceId);
      const backdrop = createPlane({
        id: `studio-wall-${faceId}`,
        width: 2.38,
        height: 2.22,
        position: createFacePose(face.angle, 1.78, 3.34).position,
        rotation: face.rotation
      });
      backdrop.setAttribute('material', 'color: #edf5fa; shader: flat; side: double; transparent: true; opacity: 0.38');

      const base = createPlane({
        id: `studio-wall-base-${faceId}`,
        width: 2.10,
        height: 0.035,
        position: '0 -1.00 0.012'
      });
      base.setAttribute('material', `color: ${accent}; shader: flat; transparent: true; opacity: 0.76`);

      const rail = createPlane({
        id: `studio-wall-rail-${faceId}`,
        width: 0.026,
        height: 1.58,
        position: '-1.03 0.05 0.016'
      });
      rail.setAttribute('material', `color: ${accent}; shader: flat; transparent: true; opacity: 0.64`);

      const labelPlate = createPlane({
        id: `studio-wall-label-${faceId}`,
        width: 0.34,
        height: 0.035,
        position: '0 -1.08 0.018'
      });
      labelPlate.setAttribute('material', `color: ${palette.navy || '#102235'}; shader: flat; transparent: true; opacity: 0.18`);

      backdrop.append(base, rail, labelPlate);
      shell.appendChild(backdrop);
    });

    const ceilingRing = document.createElement('a-torus');
    ceilingRing.id = 'studio-ceiling-ring';
    ceilingRing.setAttribute('radius', '2.82');
    ceilingRing.setAttribute('radius-tubular', '0.006');
    ceilingRing.setAttribute('segments-radial', '132');
    ceilingRing.setAttribute('segments-tubular', '8');
    ceilingRing.setAttribute('rotation', '90 0 0');
    ceilingRing.setAttribute('position', '0 2.82 0');
    ceilingRing.setAttribute('material', 'color: #9eb7cc; shader: flat; transparent: true; opacity: 0.34');
    shell.appendChild(ceilingRing);

    this.classroomRoot.appendChild(shell);
  }

  renderStudioUi() {
    this.startPanel = new StartPanel({
      theme: {
        ...this.theme,
        contentTitle: this.theme.contentTitle || '우리 반 AI 로봇의 비밀',
        heroTitle: this.theme.heroTitle || this.theme.contentTitle || '우리 반 AI 로봇의 비밀',
        subtitle: this.theme.subtitle || '',
        startButtonText: this.theme.startButtonText || '시작하기'
      },
      onStart: () => this.withRuntimeGuard('영역 선택 시작', () => this.startIntroTransition())
    });
    this.startPanel.mount(this.classroomRoot);
    this.startPanel.el.setAttribute('position', SECTION_POSES.start.position);
    this.startPanel.el.setAttribute('rotation', SECTION_POSES.start.rotation);

    this.introVideoPanel = new IntroVideoPanel({
      theme: this.theme,
      videoConfig: this.theme.introVideo,
      onConfirm: () => this.withRuntimeGuard('사전 영상 확인 완료', () => this.confirmIntroVideo())
    });
    this.introVideoPanel.mount(this.classroomRoot);
    this.introVideoPanel.attachVideoAsset(this.assetsRoot);

    this.domainSelectRoot = document.createElement('a-entity');
    this.domainSelectRoot.id = 'domain-select-ui';
    this.domainSelectRoot.setAttribute('visible', 'false');
    this.classroomRoot.appendChild(this.domainSelectRoot);
    this.createDomainSelectUi();

    this.resultPanel = new ResultPanel({
      theme: this.theme,
      onRestart: () => this.withRuntimeGuard('전체 다시 풀기', () => this.restart()),
      onBack: () => this.withRuntimeGuard('영역 선택으로 돌아가기', () => this.showDomainSelect())
    });
    this.resultPanel.mount(this.classroomRoot);
    this.resultPanel.el.setAttribute('position', SECTION_POSES.report.position);
    this.resultPanel.el.setAttribute('rotation', SECTION_POSES.report.rotation);

    this.surveyPanel = new SurveyPanel({
      theme: this.theme,
      onAnswer: (question, value) => this.withRuntimeGuard('설문 응답 저장', () => this.saveSurveyAnswer(question, value)),
      onBack: () => this.withRuntimeGuard('영역 선택으로 돌아가기', () => this.showDomainSelect())
    });
    this.surveyPanel.mount(this.classroomRoot);
    this.surveyPanel.el.setAttribute('position', SECTION_POSES.survey.position);
    this.surveyPanel.el.setAttribute('rotation', SECTION_POSES.survey.rotation);

    REQUIRED_DOMAIN_ORDER.forEach((domainId) => {
      const quizPanel = new QuizPanel({
        id: `quiz-panel-${domainId}`,
        domainId,
        theme: this.theme,
        onChoice: (choiceIndex, panel, event) => this.withRuntimeGuard('선택지 선택', () => this.selectChoice(choiceIndex, panel, event)),
        onNext: (panel) => this.withRuntimeGuard('다음 문제', () => this.goNext(panel)),
        onClose: () => this.withRuntimeGuard('영역 선택으로 돌아가기', () => this.closeQuiz())
    });
      quizPanel.mount(this.classroomRoot);
      this.quizPanels.set(domainId, quizPanel);
    });

    this.renderHomeButton();
  }

  renderHomeButton() {
    if (!this.camera) return;
    const accent = this.theme.palette?.cyan || '#38bdf8';
    this.homeButton = createPlane({
      id: 'home-button',
      width: 0.58,
      height: 0.17,
      className: 'interactive home-button',
      position: '-0.72 -0.54 -1.18',
      rotation: '0 0 0'
    });
    applyTexture(this.homeButton, {
      variant: 'button',
      width: 520,
      height: 150,
      background: '#06111f',
      border: accent,
      accent,
      title: '처음으로',
      textColor: '#f8fbff',
      titleSize: 29,
      tokens: this.theme.ui || {}
    });
    bindInteractiveAction(this.homeButton, () => this.withRuntimeGuard('처음으로 돌아가기', () => this.returnToStart()));
    bindHoverEffect(this.homeButton, {activeScale: '1.055 1.055 1'});
    this.setGroupVisible(this.homeButton, false);
    this.camera.appendChild(this.homeButton);
  }

  renderClassroomPlacementUi() {
    if (!this.camera) return;
    const palette = this.theme.palette || {};
    const accent = palette.mint || '#5eead4';

    this.placementRoot = document.createElement('a-entity');
    this.placementRoot.id = 'classroom-placement-ui';
    this.placementRoot.setAttribute('position', '0 0.28 -2.05');
    this.placementRoot.setAttribute('visible', 'false');

    this.placementPanel = createPlane({
      id: 'classroom-placement-panel',
      width: 1.82,
      height: 0.92,
      position: '0 0.14 0'
    });
    applyTexture(this.placementPanel, {
      variant: 'panel',
      width: 1100,
      height: 560,
      background: '#071827',
      border: '#7dd3fc',
      accent,
      title: '교실 기준점 설정',
      subtitle: '칠판 또는 수업 기준 방향을 바라보세요',
      body: '기준점 설정을 누르면 현재 위치와 바라보는 방향을 기준으로 작은 퀴즈 핫스팟들이 나타납니다.',
      footer: '교실이 바뀌면 다시 설정하면 됩니다.',
      textColor: '#f8fbff',
      mutedColor: '#c6d8e8',
      titleSize: 54,
      bodySize: 30,
      bodyMaxLines: 3,
      tokens: this.theme.ui || {}
    });

    this.placementButton = createPlane({
      id: 'classroom-placement-button',
      width: 0.86,
      height: 0.24,
      className: 'interactive classroom-placement-button',
      position: '0 -0.44 0.08'
    });
    applyTexture(this.placementButton, {
      variant: 'button',
      width: 620,
      height: 170,
      background: '#102235',
      border: '#7dd3fc',
      accent,
      title: '기준점 설정',
      textColor: '#f8fbff',
      titleSize: 30,
      tokens: this.theme.ui || {}
    });
    bindInteractiveAction(this.placementButton, () => this.withRuntimeGuard('교실 기준점 설정', () => this.setClassroomAnchorFromView()));
    bindHoverEffect(this.placementButton, {activeScale: '1.06 1.06 1'});

    this.placementRoot.append(this.placementPanel, this.placementButton);
    this.camera.appendChild(this.placementRoot);

    this.classroomPanelPlacementRoot = document.createElement('a-entity');
    this.classroomPanelPlacementRoot.id = 'classroom-panel-placement-ui';
    this.classroomPanelPlacementRoot.setAttribute('position', '0 0.46 -2.10');
    this.classroomPanelPlacementRoot.setAttribute('visible', 'false');

    this.classroomPanelPlacementPlane = createPlane({
      id: 'classroom-panel-placement-guide',
      width: 1.78,
      height: 0.78,
      position: '0 0 0'
    });

    this.classroomLayoutDownloadButton = createPlane({
      id: 'classroom-layout-download-button',
      width: 0.84,
      height: 0.22,
      className: 'interactive classroom-layout-download-button',
      position: '-0.46 -0.55 0.08'
    });
    applyTexture(this.classroomLayoutDownloadButton, {
      variant: 'button',
      width: 620,
      height: 170,
      background: '#102235',
      border: '#7dd3fc',
      accent: '#7dd3fc',
      title: '배치 파일 다운로드',
      textColor: '#f8fbff',
      titleSize: 28,
      tokens: this.theme.ui || {}
    });
    bindInteractiveAction(this.classroomLayoutDownloadButton, () => this.withRuntimeGuard('배치 파일 다운로드', () => this.downloadClassroomLayout()));
    bindHoverEffect(this.classroomLayoutDownloadButton, {activeScale: '1.05 1.05 1'});

    this.classroomPlacementDoneButton = createPlane({
      id: 'classroom-placement-done-button',
      width: 0.66,
      height: 0.22,
      className: 'interactive classroom-placement-done-button',
      position: '0.48 -0.55 0.08'
    });
    applyTexture(this.classroomPlacementDoneButton, {
      variant: 'button',
      width: 520,
      height: 170,
      background: '#102235',
      border: '#94a3b8',
      accent: '#94a3b8',
      title: '활동 화면',
      textColor: '#f8fbff',
      titleSize: 28,
      tokens: this.theme.ui || {}
    });
    bindInteractiveAction(this.classroomPlacementDoneButton, () => this.withRuntimeGuard('활동 화면으로 이동', () => this.showDomainSelect()));
    bindHoverEffect(this.classroomPlacementDoneButton, {activeScale: '1.05 1.05 1'});
    this.setGroupVisible(this.classroomLayoutDownloadButton, false);
    this.setGroupVisible(this.classroomPlacementDoneButton, false);

    this.classroomPanelPlacementRoot.append(
      this.classroomPanelPlacementPlane,
      this.classroomLayoutDownloadButton,
      this.classroomPlacementDoneButton
    );
    this.camera.appendChild(this.classroomPanelPlacementRoot);

    this.classroomPlacementCapture = document.createElement('a-entity');
    this.classroomPlacementCapture.id = 'classroom-placement-capture';
    this.classroomPlacementCapture.setAttribute('visible', 'false');

    this.classroomPlacementCaptureSphere = document.createElement('a-sphere');
    this.classroomPlacementCaptureSphere.id = 'classroom-placement-capture-sphere';
    this.classroomPlacementCaptureSphere.classList.add('interactive');
    this.classroomPlacementCaptureSphere.setAttribute('radius', String(CLASSROOM_CAPTURE_RADIUS));
    this.classroomPlacementCaptureSphere.setAttribute('segments-width', '96');
    this.classroomPlacementCaptureSphere.setAttribute('segments-height', '48');
    this.classroomPlacementCaptureSphere.setAttribute('position', `0 ${CLASSROOM_PANEL_Y} 0`);
    this.classroomPlacementCaptureSphere.setAttribute(
      'material',
      'color: #7dd3fc; shader: flat; transparent: true; opacity: 0.012; side: double; depthWrite: false'
    );

    bindInteractiveAction(
      this.classroomPlacementCaptureSphere,
      (event) => this.withRuntimeGuard('패널 위치 배치', () => this.placeNextClassroomPanel(event)),
      {
        events: ['click', 'touchstart'],
        shouldHandle: () => this.appMode === 'panelPlacement'
      }
    );

    this.classroomPlacementCapture.appendChild(this.classroomPlacementCaptureSphere);
    this.classroomRoot.appendChild(this.classroomPlacementCapture);
  }

  createDomainSelectUi() {
    this.data.domains.forEach((domain) => {
      const face = STUDIO_FACES[domain.id] || STUDIO_FACES.engaging;
      const cardRoot = document.createElement('a-entity');
      cardRoot.id = `domain-card-${domain.id}`;
      cardRoot.dataset.domainId = domain.id;
      cardRoot.setAttribute('position', face.position);
      cardRoot.setAttribute('rotation', face.rotation);

      const card = createPlane({
        id: `domain-card-${domain.id}-surface`,
        width: 2.08,
        height: 1.18,
        className: 'interactive domain-card domain-station',
        position: '0 0 0.04'
      });
      const domainTheme = this.theme.domains?.[domain.id] || {};
      const accent = domainTheme.accent || '#2563eb';
      const frame = this.createStationFrame(`domain-card-${domain.id}`, accent, {width: 2.28, height: 1.34});
      const halo = this.createGazeHalo(`domain-card-${domain.id}-halo`, accent, '0.78 -0.36 0.08', 0.18);
      card.dataset.accent = accent;
      card.dataset.swipeSurface = 'true';

      card._gazeHalo = halo;
      this.bindGazeSelectButton(card, () => this.withRuntimeGuard('영역 시작', () => this.openPoint(domain.id)), {
        idle: () => this.domainStationTexture(domain, accent, false),
        focused: () => this.domainStationTexture(domain, accent, true)
      });
      this.bindPanelSwipeSurface(card);

      cardRoot.append(frame, card, halo);
      this.addPanelSwipeHandles(cardRoot, accent, `domain-${domain.id}`);
      this.domainSelectRoot.appendChild(cardRoot);
      this.domainCards.set(domain.id, card);
      this.domainCardButtons.set(domain.id, card);
    });

    this.progressFaceRoot = document.createElement('a-entity');
    this.progressFaceRoot.id = 'progress-face-ui';
    this.progressFaceRoot.setAttribute('position', STUDIO_FACES.progress.position);
    this.progressFaceRoot.setAttribute('rotation', STUDIO_FACES.progress.rotation);
    this.progressFacePlane = createPlane({
      id: 'progress-face-dashboard',
      width: 2.08,
      height: 1.18,
      position: '0 0.02 0.04'
    });
    const progressAccent = this.theme.palette?.cyan || '#38bdf8';
    const progressFrame = this.createStationFrame('progress-face', progressAccent, {width: 2.28, height: 1.34});
    this.progressFaceRoot.append(progressFrame, this.progressFacePlane);
    this.domainSelectRoot.appendChild(this.progressFaceRoot);

    this.frameworkEntryRoot = document.createElement('a-entity');
    this.frameworkEntryRoot.id = 'framework-entry-ui';
    this.frameworkEntryRoot.setAttribute('position', STUDIO_FACES.framework.position);
    this.frameworkEntryRoot.setAttribute('rotation', STUDIO_FACES.framework.rotation);
    this.frameworkEntryPlane = createPlane({
      id: 'framework-entry-summary',
      width: 2.08,
      height: 1.08,
      className: 'interactive studio-nav-button framework-station',
      position: '0 0.02 0.04'
    });
    const frameworkAccent = this.theme.palette?.framework || '#ec4899';
    const frameworkFrame = this.createStationFrame('framework-entry', frameworkAccent, {width: 2.28, height: 1.24});
    this.frameworkEntryHalo = this.createGazeHalo('framework-entry-halo', frameworkAccent, '0.78 -0.34 0.08', 0.18);
    this.frameworkEntryPlane._gazeHalo = this.frameworkEntryHalo;
    this.frameworkEntryPlane.dataset.accent = frameworkAccent;
    this.frameworkEntryPlane.dataset.swipeSurface = 'true';
    this.frameworkEntryRoot.append(frameworkFrame, this.frameworkEntryPlane, this.frameworkEntryHalo);
    this.addPanelSwipeHandles(this.frameworkEntryRoot, frameworkAccent, 'framework-entry');
    this.domainSelectRoot.appendChild(this.frameworkEntryRoot);

    this.surveyFaceRoot = document.createElement('a-entity');
    this.surveyFaceRoot.id = 'survey-face-ui';
    this.surveyFaceRoot.setAttribute('position', STUDIO_FACES.survey.position);
    this.surveyFaceRoot.setAttribute('rotation', STUDIO_FACES.survey.rotation);
    this.surveyFacePlane = createPlane({
      id: 'survey-face-summary',
      width: 2.08,
      height: 1.08,
      className: 'interactive studio-nav-button survey-station',
      position: '0 0.02 0.04'
    });
    const surveyAccent = this.theme.palette?.mint || '#14b8a6';
    const surveyFrame = this.createStationFrame('survey-face', surveyAccent, {width: 2.28, height: 1.24});
    this.surveyFaceHalo = this.createGazeHalo('survey-face-halo', surveyAccent, '0.78 -0.34 0.08', 0.18);
    this.surveyFacePlane._gazeHalo = this.surveyFaceHalo;
    this.surveyFacePlane.dataset.accent = surveyAccent;
    this.surveyFacePlane.dataset.swipeSurface = 'true';
    this.surveyButton = this.surveyFacePlane;
    this.surveyFaceRoot.append(surveyFrame, this.surveyFacePlane, this.surveyFaceHalo);
    this.addPanelSwipeHandles(this.surveyFaceRoot, surveyAccent, 'survey');
    this.domainSelectRoot.appendChild(this.surveyFaceRoot);

    this.bindGazeSelectButton(this.surveyButton, () => this.withRuntimeGuard('설문 열기', () => this.openPoint('survey')), {
      idle: () => this.utilityStationTexture('설문조사', '학습 후 생각을 선택합니다.', 'SURVEY', this.theme.palette?.mint || '#14b8a6', false),
      focused: () => this.utilityStationTexture('설문조사', '조준됨 · 클릭하면 설문이 열립니다.', 'SURVEY', this.theme.palette?.mint || '#14b8a6', true)
    });
    this.bindGazeSelectButton(this.frameworkEntryPlane, () => this.withRuntimeGuard('설명 보기', () => this.openPoint('framework')), {
      idle: () => this.utilityStationTexture('우리 반 AI 로봇의 비밀', '4개 영역과 세부 역량을 확인합니다.', 'OECD', frameworkAccent, false),
      focused: () => this.utilityStationTexture('우리 반 AI 로봇의 비밀', '조준됨 · 클릭하면 설명 패널이 열립니다.', 'OECD', frameworkAccent, true)
    });
    this.bindPanelSwipeSurface(this.surveyFacePlane);
    this.bindPanelSwipeSurface(this.frameworkEntryPlane);
    this.createFrameworkDetailUi();
    this.createClassroomHotspotUi();
  }

  createClassroomHotspotUi() {
    this.classroomHotspotRoot = document.createElement('a-entity');
    this.classroomHotspotRoot.id = 'classroom-hotspot-ui';
    this.classroomHotspotRoot.setAttribute('visible', 'false');

    this.data.domains.forEach((domain) => {
      const face = STUDIO_FACES[domain.id] || STUDIO_FACES.engaging;
      const accent = this.theme.domains?.[domain.id]?.accent || this.getFaceAccent(domain.id);
      const label = domain.title || domain.titleKo || domain.id;
      this.classroomHotspotRoot.appendChild(this.createClassroomHotspot({
        id: `classroom-hotspot-${domain.id}`,
        panelId: domain.id,
        label,
        title: domain.titleKo || domain.title,
        accent,
        position: face.position,
        rotation: face.rotation,
        action: () => this.openDomain(domain.id, {focus: false})
      }));
    });

    const palette = this.theme.palette || {};
    const utilityHotspots = [
      {
        id: 'classroom-hotspot-report',
        label: 'Report',
        title: '결과 리포트',
        accent: palette.cyan || '#38bdf8',
        face: STUDIO_FACES.progress,
        action: () => this.showReport()
      },
      {
        id: 'classroom-hotspot-framework',
        label: '로봇의 비밀',
        title: '우리 반 AI 로봇의 비밀',
        accent: palette.framework || '#ec4899',
        face: STUDIO_FACES.framework,
        action: () => this.showFrameworkInfo()
      },
      {
        id: 'classroom-hotspot-survey',
        label: 'Survey',
        title: '설문조사',
        accent: palette.mint || '#14b8a6',
        face: STUDIO_FACES.survey,
        action: () => this.showSurvey()
      }
    ];

    utilityHotspots.forEach((hotspot) => {
      this.classroomHotspotRoot.appendChild(this.createClassroomHotspot({
        id: hotspot.id,
        panelId: hotspot.id.replace('classroom-hotspot-', ''),
        label: hotspot.label,
        title: hotspot.title,
        accent: hotspot.accent,
        position: hotspot.face.position,
        rotation: hotspot.face.rotation,
        action: hotspot.action
      }));
    });

    this.classroomRoot.appendChild(this.classroomHotspotRoot);
  }

  createClassroomHotspot({id, panelId, label, title, accent, position, rotation, action}) {
    const root = document.createElement('a-entity');
    root.id = id;
    root.setAttribute('position', position);
    root.setAttribute('rotation', rotation);
    root.dataset.panelId = panelId || id;

    const marker = document.createElement('a-ring');
    marker.id = `${id}-ring`;
    marker.setAttribute('radius-inner', '0.18');
    marker.setAttribute('radius-outer', '0.205');
    marker.setAttribute('segments-theta', '96');
    marker.setAttribute('position', '0 0.03 0.06');
    marker.setAttribute('material', `color: ${accent}; shader: flat; transparent: true; opacity: 0.82; side: double`);
    marker.setAttribute('animation__pulse', 'property: scale; from: 0.94 0.94 1; to: 1.08 1.08 1; dur: 1300; easing: easeInOutSine; loop: true; dir: alternate');

    const button = createPlane({
      id: `${id}-button`,
      width: 0.92,
      height: 0.34,
      className: 'interactive classroom-hotspot',
      position: '0 -0.30 0.08'
    });
    button.dataset.accent = accent;
    button.dataset.panelId = panelId || id;
    button.dataset.label = label;
    button.dataset.title = title;
    applyTexture(button, this.hotspotTexture(label, title, accent, false, panelId));
    this.bindGazeSelectButton(button, () => this.withRuntimeGuard(`${title} 열기`, () => {
      if (action && !this.isKnownPoint(panelId)) {
        action();
        return;
      }
      this.openPoint(panelId);
    }), {
      idle: () => this.hotspotTexture(label, title, accent, false, panelId),
      focused: () => this.hotspotTexture(label, `${title} 열기`, accent, true, panelId)
    });

    root.append(marker, button);
    root._marker = marker;
    root._button = button;
    this.classroomHotspots.push(button);
    if (panelId) this.classroomHotspotRoots.set(panelId, root);
    return root;
  }

  hotspotTexture(label, title, accent, focused = false, panelId = '') {
    const state = this.getMissionVisualState(panelId);
    const prefix = state.complete ? '완료' : state.locked ? '잠김' : focused ? '선택' : '열림';
    const subtitle = state.locked
      ? '이전 미션 완료 후 열립니다.'
      : state.complete
        ? `${title} · 완료됨`
        : focused
          ? `${title} · 클릭하면 열립니다.`
          : title;
    return {
      variant: 'button',
      width: 680,
      height: 210,
      background: focused && !state.locked ? '#f8fbff' : state.locked ? '#050b14' : '#071827',
      border: accent,
      accent,
      title: `${prefix} · ${label}`,
      subtitle,
      textColor: focused && !state.locked ? '#102235' : state.locked ? '#9aa8b8' : '#f8fbff',
      align: 'center',
      glass: false,
      titleSize: focused ? 31 : 30,
      titleMaxLines: 1,
      tokens: this.theme.ui || {}
    };
  }

  showStart() {
    this.appMode = 'start';
    this.activeDomain = null;
    this.scene.dataset.appMode = this.appMode;
    this.hideAllOverlays();
    this.focusSection('start');
    this.startPanel.show();
    this.setGroupVisible(this.startPanel.el, true);
    this.updateHomeButtonVisibility();
  }

  returnToStart() {
    this.activeDomain = null;
    this.pendingPointAfterIntro = null;
    this.introVideoPanel?.pauseVideo?.();
    this.showStart();
  }

  updateHomeButtonVisibility() {
    if (!this.homeButton) return;
    const shouldShow = this.appMode !== 'start';
    this.setGroupVisible(this.homeButton, shouldShow);
  }

  isIntroVideoEnabled() {
    return this.theme?.introVideo?.enabled !== false;
  }

  shouldRequireIntroVideo() {
    const config = this.theme?.introVideo || {};
    return this.isIntroVideoEnabled() &&
      config.requiredBeforeQuiz !== false &&
      !this.routeOptions.skipVideo &&
      this.introVideoConfirmed !== true;
  }

  showIntroVideo() {
    this.appMode = 'introVideo';
    this.activeDomain = null;
    this.scene.dataset.appMode = this.appMode;
    this.hideAllOverlays();
    this.focusSection('start');
    this.setGroupVisible(this.classroomRoot, true);
    this.setGroupVisible(this.introVideoPanel?.el, true);
    this.introVideoPanel?.show();
    this.showNotice('영상을 확인한 뒤 마커 활동을 시작할 수 있습니다.');
    this.debugLog('mode-intro-video', {
      pendingPointAfterIntro: this.pendingPointAfterIntro,
      hasVideoUrl: Boolean(this.theme?.introVideo?.url)
    });
    this.updateHomeButtonVisibility();
  }

  confirmIntroVideo() {
    this.introVideoConfirmed = true;
    this.introVideoPanel?.hide();

    const pendingPoint = this.pendingPointAfterIntro;
    this.pendingPointAfterIntro = null;
    this.showNotice('영상 확인이 완료되었습니다. 이제 마커를 선택할 수 있습니다.');

    if (pendingPoint && this.isKnownPoint(pendingPoint)) {
      this.openPoint(pendingPoint);
      return;
    }

    if (this.isClassroomModeActive() && !this.savedClassroomAnchor) {
      this.showClassroomPlacement();
      return;
    }

    this.showDomainSelect();
  }

  showClassroomPlacement() {
    this.appMode = 'placement';
    this.activeDomain = null;
    this.scene.dataset.appMode = this.appMode;
    this.hideAllOverlays();
    this.setGroupVisible(this.classroomRoot, false);
    this.setGroupVisible(this.placementRoot, true);
    this.placementRoot?.setAttribute('scale', '0.96 0.96 0.96');
    this.placementRoot?.setAttribute('animation__open', 'property: scale; to: 1 1 1; dur: 180; easing: easeOutCubic');
    this.debugLog('mode-classroom-placement');
    this.updateHomeButtonVisibility();
  }

  showDomainSelect() {
    if (this.shouldRequireIntroVideo()) {
      this.showIntroVideo();
      return;
    }

    this.appMode = 'domainSelect';
    this.activeDomain = null;
    this.scene.dataset.appMode = this.appMode;
    this.hideAllOverlays();
    this.updateDomainSelectUi();
    this.focusSection('domainSelect');
    this.setGroupVisible(this.classroomRoot, true);
    if (this.isClassroomModeActive()) {
      if (!this.hasCompleteClassroomLayout()) {
        this.showClassroomPanelPlacement();
        return;
      }
      this.applyClassroomLayout();
      this.updateClassroomHotspotStates();
      this.setClassroomHotspotsInteractive(true);
      this.setGroupVisible(this.domainSelectRoot, false);
      this.setGroupVisible(this.classroomHotspotRoot, true);
      this.classroomHotspotRoot?.setAttribute('scale', '0.96 0.96 0.96');
      this.classroomHotspotRoot?.setAttribute('animation__open', 'property: scale; to: 1 1 1; dur: 180; easing: easeOutCubic');
      this.debugLog('mode-domain-select-hotspots');
      this.updateHomeButtonVisibility();
      return;
    }

    this.setGroupVisible(this.classroomHotspotRoot, false);
    this.setGroupVisible(this.domainSelectRoot, true);
    this.domainFocusIndex = 0;
    this.applyDomainRingRotation(false);
    this.domainSelectRoot.setAttribute('scale', '0.97 0.97 0.97');
    this.domainSelectRoot.setAttribute('animation__open', 'property: scale; to: 1 1 1; dur: 160; easing: easeOutCubic');
    this.debugLog('mode-domain-select');
    this.updateHomeButtonVisibility();
  }

  rotateDomainRing(direction = 1) {
    if (this.appMode !== 'domainSelect' || !this.domainSelectRoot) return;
    const total = STUDIO_FACE_ORDER.length;
    this.domainFocusIndex = (this.domainFocusIndex + direction + total) % total;
    this.applyDomainRingRotation(true);
  }

  applyDomainRingRotation(animate = true) {
    if (!this.cameraRig) return;
    if (this.isClassroomModeActive()) return;
    const faceId = STUDIO_FACE_ORDER[this.domainFocusIndex] || 'progress';
    const face = STUDIO_FACES[faceId] || STUDIO_FACES.progress;
    const target = `0 ${-face.angle} 0`;
    this.domainSelectRoot.dataset.focusFace = faceId;
    const lookControls = this.camera?.components?.['look-controls'];
    if (lookControls?.pitchObject) lookControls.pitchObject.rotation.x = 0;
    if (lookControls?.yawObject) lookControls.yawObject.rotation.y = 0;
    this.camera?.setAttribute('rotation', '0 0 0');
    this.cameraRig.removeAttribute('animation__ring_scroll');
    if (!animate) {
      this.cameraRig.setAttribute('rotation', target);
      return;
    }
    this.cameraRig.setAttribute('animation__ring_scroll', `property: rotation; to: ${target}; dur: 280; easing: easeInOutQuad`);
  }

  startIntroTransition() {
    const transition = document.querySelector('#scene-transition');
    transition?.classList.add('is-active');

    window.setTimeout(() => {
      if (this.shouldRequireIntroVideo()) {
        this.showIntroVideo();
      } else
      if (this.isClassroomModeActive() && !this.savedClassroomAnchor) {
        this.showClassroomPlacement();
      } else {
        this.showDomainSelect();
      }
      window.requestAnimationFrame(() => transition?.classList.remove('is-active'));
    }, 320);
  }

  updateDomainSelectUi() {
    const palette = this.theme.palette || {};
    const overall = getOverallStats(this.data, this.progress);

    this.data.domains.forEach((domain) => {
      const stats = getDomainStats(domain, this.progress);
      const domainTheme = this.theme.domains?.[domain.id] || {};
      const accent = domainTheme.accent || '#2563eb';
      const card = this.domainCards.get(domain.id);
      const button = this.domainCardButtons.get(domain.id);
      const status = stats.complete ? '완료 · 다시 풀기' : stats.answered > 0 ? '이어 풀기' : '시작';

      card.dataset.stationStatus = status;
      applyTexture(card, this.domainStationTexture(domain, accent, false));
      button.dataset.accent = accent;
      button.dataset.idleTitle = status;
      button.dataset.gazeReady = 'false';
    });

    const surveyAnswered = this.surveyData?.questions?.filter((question) => (
      this.surveyResponses.answers?.[question.id] !== undefined
    )).length || 0;
    const surveyTotal = this.surveyData?.questions?.length || 0;

    this.updateProgressRing();
    this.updateFrameworkEntryUi();

    this.updateInlineReportDashboard(overall);

    applyTexture(this.surveyFacePlane, this.utilityStationTexture(
      '설문조사',
      `${this.surveyData?.description || '학습 후 생각을 선택합니다.'}\n응답 ${surveyAnswered}/${surveyTotal}`,
      'SURVEY',
      palette.mint || '#14b8a6',
      false
    ));

    this.surveyButton.dataset.gazeReady = 'false';
    if (this.frameworkEntryPlane) this.frameworkEntryPlane.dataset.gazeReady = 'false';
  }

  updateInlineReportDashboard(overallStats) {
    if (!this.progressFacePlane) return;
    const palette = this.theme.palette || {};
    const tokens = this.theme.ui || {};
    const domainStats = Object.fromEntries(this.data.domains.map((domain) => [domain.id, getDomainStats(domain, this.progress)]));
    const rankedDomains = this.data.domains
      .map((domain) => ({domain, stats: domainStats[domain.id]}))
      .sort((a, b) => b.stats.accuracy - a.stats.accuracy);
    const strength = rankedDomains[0]?.domain.titleKo || '-';
    const growth = rankedDomains[rankedDomains.length - 1]?.domain.titleKo || '-';

    applyTexture(this.progressFacePlane, {
      variant: 'reportGrid',
      width: 1280,
      height: 720,
      accent: palette.cyan || '#38bdf8',
      subtitle: 'REPORT',
      title: '결과 리포트',
      overall: overallStats,
      domains: this.data.domains.map((domain) => {
        const stats = domainStats[domain.id];
        const domainTheme = this.theme.domains?.[domain.id] || {};
        return {
          label: domainTheme.shortLabel || domain.title,
          title: domain.titleKo,
          answered: stats.answered,
          correct: stats.correct,
          total: stats.total,
          accuracy: stats.accuracy,
          accent: domainTheme.accent || this.getFaceAccent(domain.id)
        };
      }),
      footer: `강점 ${strength} · 보완 ${growth}`,
      tokens
    });
  }

  domainStationTexture(domain, accent, focused = false) {
    const stats = getDomainStats(domain, this.progress);
    const domainTheme = this.theme.domains?.[domain.id] || {};
    const status = stats.complete ? '완료 · 다시 풀기' : stats.answered > 0 ? '이어 풀기' : '시작';
    return {
      variant: 'station',
      width: 1280,
      height: 720,
      accent,
      icon: domain.title,
      subtitle: '',
      title: domain.titleKo,
      body: focused ? domain.description : '시선을 맞춘 뒤 클릭해 시작합니다.',
      footer: focused ? '조준됨 · 클릭' : `${status} · ${stats.answered}/${stats.total}`,
      focused,
      progress: null,
      tokens: this.theme.ui || {}
    };
  }

  progressStationTexture(focused = false) {
    const palette = this.theme.palette || {};
    const overall = getOverallStats(this.data, this.progress);
    const domainLine = this.data.domains.map((domain) => {
      const stats = getDomainStats(domain, this.progress);
      const shortTitle = String(domain.titleKo || domain.title || '').replace(/^AI[와로 ]*/, '').replace(/하기$/, '');
      return `${shortTitle} ${stats.answered}/${stats.total}`;
    }).join(' · ');
    return {
      variant: 'station',
      width: 1280,
      height: 720,
      accent: palette.cyan || '#38bdf8',
      icon: 'REPORT',
      subtitle: '',
      title: '진행률 / 리포트',
      body: `전체 ${overall.answered}/${overall.total} 완료 · 정답 ${overall.correct}개 · 정답률 ${overall.accuracy}%\n${domainLine}`,
      footer: focused ? '조준됨 · 상세 리포트 열기' : '상세 리포트 보기',
      focused,
      progress: null,
      tokens: this.theme.ui || {}
    };
  }

  utilityStationTexture(title, body, icon, accent, focused = false, progress = null, textureOptions = {}) {
    return {
      variant: 'station',
      width: textureOptions.width || 1280,
      height: textureOptions.height || 720,
      accent,
      icon,
      subtitle: '',
      title,
      body,
      footer: focused ? '조준됨 · 클릭' : '시선으로 선택',
      focused,
      progress,
      tokens: this.theme.ui || {}
    };
  }

  updateFrameworkEntryUi() {
    if (!this.frameworkEntryPlane) return;
    const accent = this.theme.palette?.framework || '#ec4899';
    applyTexture(this.frameworkEntryPlane, this.utilityStationTexture(
      '우리 반 AI 로봇의 비밀',
      '4개 영역과 세부 역량을 한 화면에서 확인합니다.',
      'OECD',
      accent,
      false,
      null,
      {width: 1280, height: 720}
    ));
    this.frameworkEntryPlane.dataset.gazeReady = 'false';
  }

  createFrameworkDetailUi() {
    this.frameworkDetailRoot = document.createElement('a-entity');
    this.frameworkDetailRoot.id = 'framework-detail-ui';
    this.frameworkDetailRoot.setAttribute('position', '0 2.34 -3.35');
    this.frameworkDetailRoot.setAttribute('rotation', '0 0 0');
    this.frameworkDetailRoot.setAttribute('visible', 'false');

    this.frameworkDetailTrack = document.createElement('a-entity');
    this.frameworkDetailTrack.id = 'framework-detail-track';
    this.frameworkDetailTrack.setAttribute('position', '0 0 0');

    this.frameworkDetailPlanes = this.data.domains.map((domain, index) => {
      const plane = createPlane({
        id: `framework-detail-${domain.id}`,
        width: 2.24,
        height: 1.62,
        position: `${(index * FRAMEWORK_SLIDE_SLOT).toFixed(3)} 0.12 0.06`,
        rotation: '0 0 0'
      });
      this.frameworkDetailTrack.appendChild(plane);
      return plane;
    });
    this.frameworkDetailRoot.appendChild(this.frameworkDetailTrack);

    this.frameworkBackButton = createPlane({
      id: 'framework-detail-back',
      width: 0.70,
      height: 0.22,
      className: 'interactive framework-back',
      position: '0 -1.00 0.22'
    });
    bindInteractiveAction(this.frameworkBackButton, () => this.withRuntimeGuard('영역 선택으로 돌아가기', () => this.showDomainSelect()));
    bindHoverEffect(this.frameworkBackButton, {activeScale: '1.045 1.045 1'});
    this.frameworkDetailRoot.appendChild(this.frameworkBackButton);
    this.classroomRoot.appendChild(this.frameworkDetailRoot);
  }

  renderFrameworkDetailUi() {
    if (!this.frameworkDetailRoot || !this.frameworkDetailPlanes?.length) return;
    this.data.domains.forEach((domain, index) => {
      const plane = this.frameworkDetailPlanes[index];
      if (!plane) return;
      plane.setAttribute('material', {
        shader: 'flat',
        src: this.createFrameworkDomainTexture(domain),
        transparent: true,
        side: 'double'
      });
    });
    applyTexture(this.frameworkBackButton, {
      variant: 'button',
      width: 560,
      height: 170,
      background: '#111827',
      border: '#7dd3fc',
      accent: '#7dd3fc',
      title: '영역 선택으로',
      textColor: '#f8fbff',
      titleSize: 28,
      tokens: this.theme.ui || {}
    });
  }

  updateFrameworkDetailLayout(animate = true) {
    if (!this.frameworkDetailTrack || !this.frameworkDetailPlanes?.length) return;
    const focusIndex = Math.max(0, Math.min(this.frameworkDetailPlanes.length - 1, this.frameworkDetailFocusIndex || 0));
    const targetX = -(FRAMEWORK_SLIDE_SLOT * focusIndex);
    this.frameworkDetailRoot.dataset.focusIndex = String(focusIndex);
    this.frameworkDetailTrack.dataset.focusIndex = String(focusIndex);

    this.frameworkDetailTrack.removeAttribute('animation__framework_slide');
    if (animate) {
      this.frameworkDetailTrack.setAttribute(
        'animation__framework_slide',
        `property: position; to: ${targetX.toFixed(3)} 0 0; dur: 260; easing: easeInOutQuad`
      );
    } else {
      this.frameworkDetailTrack.setAttribute('position', `${targetX.toFixed(3)} 0 0`);
    }

    this.frameworkDetailPlanes.forEach((plane, index) => {
      if (!plane) return;
      const distance = index - focusIndex;
      const absDistance = Math.abs(distance);
      const tilt = Math.max(-16, Math.min(16, -distance * 10));
      const scale = absDistance === 0 ? '1 1 1' : absDistance === 1 ? '0.93 0.93 1' : '0.88 0.88 1';
      plane.setAttribute('rotation', `0 ${tilt.toFixed(1)} 0`);
      plane.setAttribute('scale', scale);
      plane.dataset.focused = absDistance === 0 ? 'true' : 'false';
    });
  }

  rotateFrameworkDetail(direction = 1) {
    if (this.appMode !== 'framework' || !this.frameworkDetailPlanes?.length) return;
    const total = this.frameworkDetailPlanes.length;
    this.frameworkDetailFocusIndex = (this.frameworkDetailFocusIndex + direction + total) % total;
    this.updateFrameworkDetailLayout(true);
    this.debugLog('framework-carousel', {
      direction,
      focusIndex: this.frameworkDetailFocusIndex,
      activeDomain: this.data.domains[this.frameworkDetailFocusIndex]?.id || null
    });
  }

  handleFrameworkCarouselAxis(x = 0) {
    if (this.appMode !== 'framework') return;
    const direction = x > FRAMEWORK_SLIDE_THRESHOLD ? 1 : x < -FRAMEWORK_SLIDE_THRESHOLD ? -1 : 0;
    if (!direction) {
      this.frameworkCarouselStickDirection = 0;
      return;
    }
    if (this.frameworkCarouselStickDirection === direction) return;
    const now = Date.now();
    if (now - this.lastFrameworkCarouselAt < FRAMEWORK_SLIDE_COOLDOWN_MS) return;
    this.frameworkCarouselStickDirection = direction;
    this.lastFrameworkCarouselAt = now;
    this.rotateFrameworkDetail(direction);
  }

  getControllerAxis(event) {
    const detail = event?.detail || {};
    if (Array.isArray(detail.axis)) {
      return {
        x: Number(detail.axis[0] || 0),
        y: Number(detail.axis[1] || 0)
      };
    }
    if (typeof detail.x === 'number' || typeof detail.y === 'number') {
      return {
        x: Number(detail.x || 0),
        y: Number(detail.y || 0)
      };
    }
    if (Array.isArray(detail.axes)) {
      return {
        x: Number(detail.axes[0] || 0),
        y: Number(detail.axes[1] || 0)
      };
    }
    return null;
  }

  bindFrameworkCarouselControls() {
    const hands = [this.leftHand, this.rightHand].filter(Boolean);
    const handleAxis = (event) => {
      if (this.appMode !== 'framework') return;
      const axis = this.getControllerAxis(event);
      if (!axis) return;
      this.handleFrameworkCarouselAxis(axis.x);
    };

    hands.forEach((hand) => {
      ['thumbstickmoved', 'axismove'].forEach((eventName) => {
        hand.addEventListener(eventName, handleAxis);
      });
    });

    window.addEventListener('keydown', (event) => {
      if (this.appMode !== 'framework') return;
      const key = String(event.key || '').toLowerCase();
      if (key === 'arrowleft' || key === 'arrowright') {
        event.preventDefault();
        this.rotateFrameworkDetail(key === 'arrowright' ? 1 : -1);
      }
    });

    window.addEventListener('wheel', (event) => {
      if (this.appMode !== 'framework') return;
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      if (Math.abs(delta) < 18) return;
      const now = Date.now();
      if (now - this.lastFrameworkCarouselAt < 430) return;
      this.lastFrameworkCarouselAt = now;
      this.rotateFrameworkDetail(delta > 0 ? 1 : -1);
      event.preventDefault();
    }, {passive: false});
  }

  showFrameworkInfo() {
    this.appMode = 'framework';
    this.activeDomain = null;
    this.scene.dataset.appMode = this.appMode;
    this.hideAllOverlays();
    this.focusSection('framework');
    if (!this.applyClassroomPanelPose(this.frameworkDetailRoot, 'framework')) {
      this.frameworkDetailRoot?.setAttribute('position', '0 2.34 -3.35');
      this.frameworkDetailRoot?.setAttribute('rotation', '0 0 0');
    }
    this.frameworkDetailFocusIndex = 0;
    this.renderFrameworkDetailUi();
    this.updateFrameworkDetailLayout(false);
    this.setGroupVisible(this.frameworkDetailRoot, true);
    this.frameworkDetailRoot.setAttribute('scale', '0.96 0.96 0.96');
    this.frameworkDetailRoot.setAttribute('animation__open', 'property: scale; to: 1 1 1; dur: 180; easing: easeOutCubic');
    this.markMissionComplete('framework');
    this.debugLog('mode-framework');
    this.updateHomeButtonVisibility();
  }

  createFrameworkDomainTexture(domain) {
    const canvas = document.createElement('canvas');
    canvas.width = 1440;
    canvas.height = 1050;
    const ctx = canvas.getContext('2d');
    const palette = this.theme.palette || {};
    const domainTheme = this.theme.domains?.[domain.id] || {};
    const accent = domainTheme.accent || palette.sky || '#7dd3fc';
    const font = '"Pretendard", "Noto Sans KR", "Apple SD Gothic Neo", sans-serif';

    const round = (x, y, width, height, radius) => {
      const r = Math.min(radius, width / 2, height / 2);
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + width, y, x + width, y + height, r);
      ctx.arcTo(x + width, y + height, x, y + height, r);
      ctx.arcTo(x, y + height, x, y, r);
      ctx.arcTo(x, y, x + width, y, r);
      ctx.closePath();
    };
    const wrapText = (text, maxWidth) => {
      const words = String(text || '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
      const lines = [];
      let line = '';
      words.forEach((word) => {
        const testLine = line ? `${line} ${word}` : word;
        if (ctx.measureText(testLine).width <= maxWidth) {
          line = testLine;
          return;
        }
        if (line) lines.push(line);
        if (ctx.measureText(word).width <= maxWidth) {
          line = word;
          return;
        }
        let chunk = '';
        [...word].forEach((char) => {
          const testChunk = `${chunk}${char}`;
          if (ctx.measureText(testChunk).width > maxWidth && chunk) {
            lines.push(chunk);
            chunk = char;
          } else {
            chunk = testChunk;
          }
        });
        line = chunk;
      });
      if (line) lines.push(line);
      return lines;
    };

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(3, 8, 17, 0.95)';
    round(22, 22, canvas.width - 44, canvas.height - 44, 48);
    ctx.fill();
    ctx.strokeStyle = 'rgba(248, 251, 255, 0.58)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 5;
    round(44, 44, canvas.width - 88, canvas.height - 88, 34);
    ctx.stroke();

    ctx.fillStyle = accent;
    round(76, 78, 10, 96, 5);
    ctx.fill();
    ctx.fillStyle = '#f8fbff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = `860 58px ${font}`;
    ctx.fillText(domain.titleKo, 112, 78);
    ctx.fillStyle = 'rgba(226, 238, 250, 0.78)';
    ctx.font = `700 30px ${font}`;
    ctx.fillText(`${domain.title} · 세부 역량 ${domain.questions.length}개`, 112, 140);

    const items = domain.questions.map((question) => question.competenceKo || question.competence || question.question);
    const itemWidth = canvas.width - 220;
    const itemFontSize = domain.questions.length > 6 ? 27 : 29;
    const lineHeight = itemFontSize + 10;
    let y = 212;
    ctx.font = `660 ${itemFontSize}px ${font}`;

    items.forEach((item, index) => {
      const lines = wrapText(item, itemWidth - 84);
      const rowHeight = Math.max(62, lines.length * lineHeight + 24);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.055)';
      round(76, y, itemWidth, rowHeight, 18);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.10)';
      round(96, y + 14, 46, 34, 17);
      ctx.fill();
      ctx.fillStyle = accent;
      ctx.font = `820 19px ${font}`;
      ctx.textAlign = 'center';
      ctx.fillText(String(index + 1), 119, y + 22);

      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(242, 248, 255, 0.86)';
      ctx.font = `660 ${itemFontSize}px ${font}`;
      lines.forEach((line, lineIndex) => {
        ctx.fillText(line, 172, y + 15 + lineIndex * lineHeight);
      });
      y += rowHeight + 14;
    });

    return canvas.toDataURL('image/png');
  }

  createStationFrame(idPrefix, accent, options = {}) {
    const width = options.width || 1.68;
    const height = options.height || 1.06;
    const frame = document.createElement('a-entity');
    frame.id = `${idPrefix}-frame`;

    const backplate = createPlane({
      id: `${idPrefix}-backplate`,
      width,
      height,
      position: '0 0 -0.012'
    });
    backplate.setAttribute('material', `color: ${accent}; shader: flat; transparent: true; opacity: 0.13; side: double`);

    frame.append(backplate);
    return frame;
  }

  addPanelSwipeHandles(parent, accent, idPrefix, options = {}) {
    if (!parent) return;
    return;
    const x = Number(options.x ?? 1.16);
    const height = Number(options.height ?? 1.20);
    const y = Number(options.y ?? -0.02);
    const z = Number(options.z ?? 0.125);

    [
      {side: 'left', x: -x, fallbackDirection: -1, arrow: '‹'},
      {side: 'right', x, fallbackDirection: 1, arrow: '›'}
    ].forEach((config) => {
      const handle = document.createElement('a-entity');
      handle.id = `${idPrefix}-swipe-${config.side}`;
      handle.classList.add('interactive', 'panel-swipe-handle');
      handle.dataset.swipeHandle = 'true';
      handle.dataset.fallbackDirection = String(config.fallbackDirection);
      handle.dataset.accent = accent;
      handle.setAttribute('position', `${config.x} ${y} ${z}`);

      const hitArea = createPlane({
        id: `${idPrefix}-swipe-${config.side}-hit`,
        width: 0.34,
        height,
        className: 'interactive panel-swipe-hit',
        position: '0 0 0.002'
      });
      hitArea.dataset.swipeHandle = 'true';
      hitArea.dataset.fallbackDirection = String(config.fallbackDirection);
      hitArea.dataset.accent = accent;
      hitArea._swipeRoot = handle;
      hitArea.setAttribute('material', 'color: #ffffff; shader: flat; transparent: true; opacity: 0.01; side: double');

      const grip = createPlane({
        id: `${idPrefix}-swipe-${config.side}-grip`,
        width: 0.026,
        height: Math.min(0.74, height - 0.18),
        position: '0 0 0.018'
      });
      grip.setAttribute('material', `color: ${accent}; shader: flat; transparent: true; opacity: 0.52; side: double`);

      const arrow = document.createElement('a-text');
      arrow.setAttribute('value', config.arrow);
      arrow.setAttribute('align', 'center');
      arrow.setAttribute('anchor', 'center');
      arrow.setAttribute('baseline', 'center');
      arrow.setAttribute('font', 'kelsonsans');
      arrow.setAttribute('width', '1.1');
      arrow.setAttribute('position', '0 -0.42 0.026');
      arrow.setAttribute('material', `color: ${accent}; shader: flat; transparent: true; opacity: 0.62; side: double`);

      handle._swipeGrip = grip;
      handle.append(hitArea, grip, arrow);
      this.bindPanelSwipeHandle(handle, hitArea);
      parent.appendChild(handle);
    });
  }

  bindPanelSwipeHandle(handle, hitArea) {
    const beginFromPointer = (event) => {
      if (this.appMode !== 'domainSelect') return;
      if (this.isControllerCursorEvent(event)) return;
      const pointerX = this.getPointerX(event);
      this.beginPanelSwipe({
        source: 'pointer',
        handle,
        fallbackDirection: Number(hitArea.dataset.fallbackDirection || handle.dataset.fallbackDirection || 1),
        pointerX
      });
      if (event.cancelable) event.preventDefault();
      event.stopPropagation();
    };

    ['mousedown', 'touchstart'].forEach((eventName) => {
      hitArea.addEventListener(eventName, beginFromPointer);
      handle.addEventListener(eventName, beginFromPointer);
    });

    const clickFallback = (event) => {
      if (this.appMode !== 'domainSelect') return;
      if (Date.now() - Number(handle.dataset.lastSwipeEndedAt || 0) < 220) return;
      this.completePanelSwipe(Number(hitArea.dataset.fallbackDirection || handle.dataset.fallbackDirection || 1), 'handle-click');
      if (event.cancelable) event.preventDefault();
      event.stopPropagation();
    };
    hitArea.addEventListener('click', clickFallback);
    handle.addEventListener('click', clickFallback);

    const setFocused = (focused) => {
      const grip = handle._swipeGrip;
      if (!grip) return;
      grip.setAttribute(
        'material',
        `color: ${handle.dataset.accent || '#7dd3fc'}; shader: flat; transparent: true; opacity: ${focused ? 0.96 : 0.52}; side: double`
      );
      handle.setAttribute('animation__swipe_focus', `property: scale; to: ${focused ? '1.08 1.08 1' : '1 1 1'}; dur: 120; easing: easeOutQuad`);
    };

    hitArea.addEventListener('mouseenter', () => setFocused(true));
    hitArea.addEventListener('mouseleave', () => setFocused(false));
  }

  bindPanelSwipeSurface(surface) {
    if (!surface || surface.dataset.swipeSurfaceBound === 'true') return;
    surface.dataset.swipeSurfaceBound = 'true';
    surface.addEventListener('mousedown', (event) => {
      if (this.appMode !== 'domainSelect') return;
      if (this.isControllerCursorEvent(event)) return;
      this.beginPanelSwipe({
        source: 'pointer',
        handle: surface,
        fallbackDirection: 0,
        pointerX: this.getPointerX(event),
        requireThreshold: true,
        suppressTarget: surface
      });
    });
  }

  domainButtonTexture(title, accent, focused = false) {
    return {
      variant: 'button',
      width: 380,
      height: 128,
      background: focused ? '#ffffff' : accent,
      border: accent,
      accent,
      title,
      textColor: focused ? accent : '#ffffff',
      align: 'center',
      glass: focused,
      titleSize: focused ? 21 : 22,
      titleMaxLines: 1,
      tokens: this.theme.ui || {}
    };
  }

  navButtonTexture(title, background, textColor, focused = false) {
    const palette = this.theme.palette || {};
    return {
      variant: 'button',
      width: 560,
      height: 150,
      background: focused ? '#ffffff' : background,
      border: palette.line || '#c9d8e6',
      accent: palette.sky || '#62c6f2',
      title,
      textColor: focused ? background : textColor,
      align: 'center',
      glass: true,
      titleSize: focused ? 23 : 25,
      tokens: this.theme.ui || {}
    };
  }

  bindGazeSelectButton(button, action, textures) {
    button.dataset.gazeReady = 'false';
    bindInteractiveAction(button, (event) => {
      this.pulseGazeHalo(button);
      action(event);
    }, {
      events: ['click', 'touchstart'],
      shouldHandle: (event) => (
        Date.now() > Number(button.dataset.suppressClickUntil || 0) &&
        (button.dataset.gazeReady === 'true' || event.type === 'touchstart')
      )
    });
    bindHoverEffect(button, {
      activeScale: '1.045 1.045 1',
      onEnter: () => {
        button.dataset.gazeReady = 'true';
        this.showGazeHalo(button, true);
        applyTexture(button, textures.focused());
      },
      onLeave: () => {
        button.dataset.gazeReady = 'false';
        this.showGazeHalo(button, false);
        applyTexture(button, textures.idle());
      }
    });
  }

  createGazeHalo(id, accent, position = '0 0 0.08', radius = 0.14) {
    const halo = document.createElement('a-ring');
    halo.id = id;
    halo.setAttribute('radius-inner', String(radius));
    halo.setAttribute('radius-outer', String(radius + 0.014));
    halo.setAttribute('segments-theta', '80');
    halo.setAttribute('position', position);
    halo.setAttribute('material', `color: ${accent}; shader: flat; transparent: true; opacity: 0.0; side: double`);
    halo.setAttribute('visible', 'false');
    return halo;
  }

  showGazeHalo(entity, visible) {
    const halo = entity?._gazeHalo;
    if (!halo) return;
    halo.setAttribute('visible', 'false');
    halo.removeAttribute('animation__turn');
    halo.removeAttribute('animation__aim');
    halo.setAttribute('scale', '1 1 1');
    halo.setAttribute('rotation', '0 0 0');
  }

  pulseGazeHalo(entity) {
    const halo = entity?._gazeHalo;
    if (!halo) return;
    halo.setAttribute('visible', 'false');
    halo.removeAttribute('animation__select');
  }

  createProgressRing() {
    this.progressRingRoot = document.createElement('a-entity');
    this.progressRingRoot.id = 'floor-progress-ring';
    this.progressMarkers = [];

    const questions = this.data.domains.flatMap((domain) => domain.questions.map((question) => ({domain, question})));
    const total = Math.max(questions.length, 1);
    const radius = 2.18;

    const track = document.createElement('a-torus');
    track.id = 'floor-progress-track';
    track.setAttribute('radius', String(radius));
    track.setAttribute('radius-tubular', '0.008');
    track.setAttribute('segments-radial', '132');
    track.setAttribute('segments-tubular', '8');
    track.setAttribute('rotation', '90 0 0');
    track.setAttribute('position', '0 0.026 0');
    track.setAttribute('material', 'color: #38bdf8; shader: flat; transparent: true; opacity: 0.24');
    this.progressRingRoot.appendChild(track);

    const outerTrack = document.createElement('a-torus');
    outerTrack.id = 'floor-progress-outer-track';
    outerTrack.setAttribute('radius', String(radius + 0.18));
    outerTrack.setAttribute('radius-tubular', '0.0035');
    outerTrack.setAttribute('segments-radial', '132');
    outerTrack.setAttribute('segments-tubular', '8');
    outerTrack.setAttribute('rotation', '90 0 0');
    outerTrack.setAttribute('position', '0 0.024 0');
    outerTrack.setAttribute('material', 'color: #8b5cf6; shader: flat; transparent: true; opacity: 0.18');
    this.progressRingRoot.appendChild(outerTrack);

    questions.forEach(({domain, question}, index) => {
      const angle = (index / total) * Math.PI * 2;
      const marker = document.createElement('a-cylinder');
      marker.id = `progress-marker-${question.id}`;
      marker.dataset.questionId = question.id;
      marker.dataset.domainId = domain.id;
      marker.setAttribute('radius', '0.043');
      marker.setAttribute('height', '0.026');
      marker.setAttribute('segments-radial', '32');
      marker.setAttribute('position', `${(Math.sin(angle) * radius).toFixed(3)} 0.036 ${(-Math.cos(angle) * radius).toFixed(3)}`);
      marker.setAttribute('material', 'color: #172235; emissive: #000000; emissiveIntensity: 0.0; roughness: 0.5; metalness: 0.08');
      this.progressRingRoot.appendChild(marker);
      this.progressMarkers.push(marker);
    });

    this.domainSelectRoot.appendChild(this.progressRingRoot);
  }

  updateProgressRing() {
    if (!this.progressMarkers?.length) return;
    const danger = this.theme.palette?.danger || '#de4d5a';
    this.progressMarkers.forEach((marker) => {
      const questionId = marker.dataset.questionId;
      const domainId = marker.dataset.domainId;
      const selected = this.progress.answers?.[questionId];
      const domain = this.findDomain(domainId);
      const question = domain?.questions?.find((item) => item.id === questionId);
      const accent = this.getFaceAccent(domainId);
      const answered = selected !== undefined;
      const correct = answered && question && selected === question.answerIndex;
      const color = !answered ? '#172235' : correct ? accent : danger;
      const emissive = !answered ? '#000000' : color;
      const intensity = !answered ? 0 : 0.74;
      marker.setAttribute('material', `color: ${color}; emissive: ${emissive}; emissiveIntensity: ${intensity}; roughness: 0.46; metalness: 0.02`);
      marker.setAttribute('scale', answered ? '1.32 1 1.32' : '1 1 1');
    });
  }

  getFaceAccent(faceId) {
    const palette = this.theme.palette || {};
    if (this.theme.domains?.[faceId]?.accent) return this.theme.domains[faceId].accent;
    const key = STUDIO_FACES[faceId]?.accentKey;
    return palette[key] || {
      survey: palette.mint || '#14b8a6',
      progress: palette.cyan || '#38bdf8',
      framework: palette.framework || '#ec4899'
    }[faceId] || palette.sky || '#62c6f2';
  }

  normalisePointId(pointId) {
    const id = normaliseQueryValue(pointId);
    if (['ai-literacy', 'ai_literacy', 'oecd', 'literacy'].includes(id)) return 'framework';
    if (['result', 'results', 'progress'].includes(id)) return 'report';
    if (['reflection'].includes(id)) return 'survey';
    return id;
  }

  isKnownPoint(pointId) {
    const id = this.normalisePointId(pointId);
    return Boolean(this.findDomain(id) || ['framework', 'report', 'survey'].includes(id));
  }

  getMissionOrder() {
    const configuredOrder = this.theme?.arMission?.order;
    const order = Array.isArray(configuredOrder) && configuredOrder.length
      ? configuredOrder
      : DEFAULT_MISSION_ORDER;
    return order.map((id) => this.normalisePointId(id)).filter((id, index, list) => id && list.indexOf(id) === index);
  }

  isMissionSequential() {
    return this.theme?.arMission?.enabled !== false && this.theme?.arMission?.sequential === true;
  }

  isSurveyComplete() {
    const questions = Array.isArray(this.surveyData?.questions) ? this.surveyData.questions : [];
    if (!questions.length) return true;
    return questions.every((question) => this.surveyResponses.answers?.[question.id] !== undefined);
  }

  isMissionItemComplete(pointId) {
    const id = this.normalisePointId(pointId);
    const domain = this.findDomain(id);
    if (domain) return getDomainStats(domain, this.progress).complete;
    if (id === 'survey') return this.isSurveyComplete() || this.missionState.completed?.survey === true;
    return this.missionState.completed?.[id] === true;
  }

  isMissionItemUnlocked(pointId) {
    const id = this.normalisePointId(pointId);
    if (!this.isMissionSequential()) return true;
    const order = this.getMissionOrder();
    const index = order.indexOf(id);
    if (index <= 0) return true;
    return order.slice(0, index).every((previousId) => this.isMissionItemComplete(previousId));
  }

  getMissionVisualState(pointId) {
    const id = this.normalisePointId(pointId);
    const complete = this.isMissionItemComplete(id);
    const unlocked = this.isMissionItemUnlocked(id);
    const order = this.getMissionOrder();
    const orderIndex = order.indexOf(id);
    const previousId = orderIndex > 0 ? order[orderIndex - 1] : null;
    return {
      id,
      complete,
      unlocked,
      locked: !unlocked,
      orderIndex,
      previousId
    };
  }

  markMissionComplete(pointId) {
    const id = this.normalisePointId(pointId);
    if (!id || this.findDomain(id)) {
      this.updateClassroomHotspotStates();
      return;
    }
    this.missionState = {
      ...(this.missionState || {}),
      completed: {
        ...(this.missionState?.completed || {}),
        [id]: true
      }
    };
    writeJson(MISSION_STATE_KEY, this.missionState);
    this.updateClassroomHotspotStates();
  }

  openPoint(pointId) {
    const id = this.normalisePointId(pointId);
    if (!this.isKnownPoint(id)) return;

    if (this.shouldRequireIntroVideo()) {
      this.pendingPointAfterIntro = id;
      this.showIntroVideo();
      return;
    }

    if (!this.isMissionItemUnlocked(id)) {
      const previous = this.getMissionVisualState(id).previousId;
      const previousTitle = previous ? this.getPointDisplayName(previous) : '이전 미션';
      if (this.appMode !== 'domainSelect') this.showDomainSelect();
      this.showNotice(`${previousTitle}을(를) 먼저 완료한 뒤 열 수 있습니다.`);
      this.updateClassroomHotspotStates();
      return;
    }

    const domain = this.findDomain(id);
    if (domain) {
      this.openDomain(id, {focus: false});
      return;
    }
    if (id === 'framework') {
      this.showFrameworkInfo();
      return;
    }
    if (id === 'report') {
      this.showReport();
      return;
    }
    if (id === 'survey') this.showSurvey();
  }

  getPointDisplayName(pointId) {
    const id = this.normalisePointId(pointId);
    const domain = this.findDomain(id);
    if (domain) return domain.titleKo || domain.title || id;
    return {
      framework: '우리 반 AI 로봇의 비밀 안내',
      report: '결과 리포트',
      survey: '설문조사'
    }[id] || id;
  }

  updateClassroomHotspotStates() {
    if (!this.classroomHotspotRoots?.size) return;
    this.classroomHotspotRoots.forEach((root, panelId) => {
      const marker = root._marker;
      const button = root._button;
      const accent = button?.dataset.accent || '#7dd3fc';
      const state = this.getMissionVisualState(panelId);
      const markerOpacity = state.locked ? 0.22 : state.complete ? 0.95 : 0.72;
      marker?.setAttribute(
        'material',
        `color: ${accent}; shader: flat; transparent: true; opacity: ${markerOpacity}; side: double`
      );
      if (state.locked) {
        marker?.removeAttribute('animation__pulse');
      } else {
        marker?.setAttribute('animation__pulse', 'property: scale; from: 0.94 0.94 1; to: 1.08 1.08 1; dur: 1300; easing: easeInOutSine; loop: true; dir: alternate');
      }
      if (button) {
        applyTexture(button, this.hotspotTexture(
          button.dataset.label || panelId,
          button.dataset.title || this.getPointDisplayName(panelId),
          accent,
          false,
          panelId
        ));
      }
    });
  }

  openDomain(domainId, options = {}) {
    const domain = this.findDomain(domainId);
    const panel = this.quizPanels.get(domainId);
    if (!domain || !panel) return;

    this.appMode = 'quiz';
    this.activeDomain = domainId;
    this.quizShouldFocus = options.focus !== false;
    this.scene.dataset.appMode = this.appMode;
    this.hideAllOverlays();
    if (this.quizShouldFocus) this.focusSection('quiz', domainId);

    const stats = getDomainStats(domain, this.progress);
    if (stats.complete) {
      this.progress = resetDomainProgress(this.progress, domain);
      this.updateDomainSelectUi();
    }

    const nextQuestion = getNextUnansweredQuestion(domain, this.progress);
    if (nextQuestion) {
      this.showDomainQuestion(domain, nextQuestion);
      return;
    }

    this.showDomainComplete(panel, domain);
  }

  showDomainQuestion(domain, question, animate = true) {
    const panel = this.quizPanels.get(domain.id);
    if (!panel) return;
    this.appMode = 'quiz';
    this.activeDomain = domain.id;
    this.scene.dataset.appMode = this.appMode;
    this.hideAllQuizPanels();
    if (this.quizShouldFocus !== false) this.focusSection('quiz', domain.id);

    const domainStats = getDomainStats(domain, this.progress);
    const questionNumber = Math.max(1, domain.questions.findIndex((item) => item.id === question.id) + 1);
    const attempts = getAttemptCount(this.progress, question.id);
    const remaining = Math.max(0, MAX_ATTEMPTS - attempts);
    const progressText = `${domain.titleKo} ${questionNumber}/${domainStats.total} · 남은 기회 ${remaining}번`;
    panel.show(question, domain, progressText, this.getQuizTransform(domain.id));
    panel.setCloseButton('영역 선택');
    this.setGroupVisible(panel.el, true);
    if (!animate) panel.el.removeAttribute('animation__open');
    this.debugLog('show-question', {domainId: domain.id, questionId: question.id});
    this.updateHomeButtonVisibility();
  }

  selectChoice(choiceIndex, panel, event = null) {
    const domain = this.findDomain(panel.domainId);
    const question = panel.currentQuestion;

    this.debugLog('choice-event', {
      domainId: panel.domainId,
      questionId: question?.id || null,
      choiceIndex,
      answerIndex: question?.answerIndex ?? null,
      eventType: event?.type || 'keyboard',
      panelState: panel.el.dataset.panelState || ''
    });

    if (!domain || !question || this.progress.answers[question.id] !== undefined || !panel.canSelectChoice(choiceIndex)) {
      this.debugLog('choice-ignored', {choiceIndex});
      return;
    }

    const correct = choiceIndex === question.answerIndex;
    const attemptsAfterThisChoice = getAttemptCount(this.progress, question.id) + 1;

    panel.markChoiceSelected(question, choiceIndex);
    this.progress = recordAttempt(this.progress, question.id);

    if (!correct && attemptsAfterThisChoice < MAX_ATTEMPTS) {
      panel.resetAfterWrongAttempt(question);
      panel.setFeedback({
        title: '다시 생각해 봅시다. 남은 기회 1번',
        body: question.feedbackWrong,
        footer: '선택지는 다시 초기화되었습니다. 근거를 다시 확인해 보세요.'
      }, 'wrong');
      panel.setNextButton('다시 선택', false);
      this.debugLog('choice-retry', {questionId: question.id, choiceIndex, attempts: attemptsAfterThisChoice});
      return;
    }

    this.progress = answerQuestion(this.progress, question.id, choiceIndex);
    panel.lockWithResult(question, choiceIndex);
    panel.setFeedback({
      title: correct ? '정답입니다!' : `정답은 ${question.choices[question.answerIndex]}입니다.`,
      body: correct ? question.feedbackCorrect : question.explanation,
      footer: correct ? question.explanation : '해설을 확인한 뒤 다음 문제로 넘어가세요.'
    }, correct ? 'correct' : 'wrong');

    const nextQuestion = getNextUnansweredQuestion(domain, this.progress);
    const overall = getOverallStats(this.data, this.progress);
    panel.setNextButton(overall.complete ? '결과 보기' : nextQuestion ? '다음 문제' : '영역 완료', true);
    this.updateDomainSelectUi();
    this.debugLog('choice-locked', {questionId: question.id, correct, attempts: attemptsAfterThisChoice});
  }

  goNext(panel) {
    const domain = this.findDomain(panel.domainId);
    if (!domain || !panel.currentQuestion) return;

    const overall = getOverallStats(this.data, this.progress);
    if (overall.complete) {
      this.showReport();
      return;
    }

    const nextQuestion = getNextUnansweredQuestion(domain, this.progress);
    if (nextQuestion) {
      this.showDomainQuestion(domain, nextQuestion);
      return;
    }

    this.showDomainComplete(panel, domain);
    this.showNotice(`${domain.titleKo} 영역을 완료했습니다. 영역 선택 화면에서 다음 영역을 고르세요.`);
  }

  showDomainComplete(panel, domain) {
    if (!panel) return;
    this.appMode = 'quiz';
    this.activeDomain = domain.id;
    this.scene.dataset.appMode = this.appMode;
    this.hideAllQuizPanels();
    if (this.quizShouldFocus !== false) this.focusSection('quiz', domain.id);
    panel.showComplete(domain, this.getQuizTransform(domain.id));
    panel.setCloseButton('영역 선택');
    this.setGroupVisible(panel.el, true);
    this.markMissionComplete(domain.id);
    this.updateHomeButtonVisibility();
  }

  closeQuiz() {
    this.hideAllQuizPanels();
    this.showDomainSelect();
  }

  showReport() {
    this.appMode = 'report';
    this.activeDomain = null;
    this.scene.dataset.appMode = this.appMode;
    this.hideAllOverlays();
    this.focusSection('report');
    if (!this.applyClassroomPanelPose(this.resultPanel?.el, 'report', 'progress')) {
      this.resultPanel?.el?.setAttribute('position', SECTION_POSES.report.position);
      this.resultPanel?.el?.setAttribute('rotation', SECTION_POSES.report.rotation);
    }
    const overall = getOverallStats(this.data, this.progress);
    const domainStats = Object.fromEntries(this.data.domains.map((domain) => [domain.id, getDomainStats(domain, this.progress)]));
    this.resultPanel.show(this.data, overall, domainStats);
    this.setGroupVisible(this.resultPanel.el, true);
    this.markMissionComplete('report');
    this.debugLog('mode-report', overall);
    this.updateHomeButtonVisibility();
  }

  showSurvey() {
    this.appMode = 'survey';
    this.activeDomain = null;
    this.scene.dataset.appMode = this.appMode;
    this.hideAllOverlays();
    this.focusSection('survey');
    if (!this.applyClassroomPanelPose(this.surveyPanel?.el, 'survey')) {
      this.surveyPanel?.el?.setAttribute('position', SECTION_POSES.survey.position);
      this.surveyPanel?.el?.setAttribute('rotation', SECTION_POSES.survey.rotation);
    }
    this.surveyPanel.show(this.surveyData, this.surveyResponses);
    this.setGroupVisible(this.surveyPanel.el, true);
    this.debugLog('mode-survey');
    this.updateHomeButtonVisibility();
  }

  saveSurveyAnswer(question, value) {
    this.surveyResponses = saveSurveyAnswer(this.surveyResponses, question.id, value);
    this.surveyPanel.updateResponses(this.surveyResponses);
    if (this.isSurveyComplete()) this.markMissionComplete('survey');
  }

  restart() {
    resetProgress();
    removeItem(MISSION_STATE_KEY);
    this.missionState = {completed: {}};
    this.progress = loadProgress();
    this.hideAllOverlays();
    this.updateDomainSelectUi();
    this.showDomainSelect();
  }

  hideAllOverlays() {
    if (this.startPanel) {
      this.startPanel.hide();
      this.setGroupVisible(this.startPanel.el, false);
    }
    if (this.introVideoPanel) {
      this.introVideoPanel.hide();
      this.setGroupVisible(this.introVideoPanel.el, false);
    }
    this.setGroupVisible(this.domainSelectRoot, false);
    this.setGroupVisible(this.classroomHotspotRoot, false);
    if (this.resultPanel) {
      this.resultPanel.hide();
      this.setGroupVisible(this.resultPanel.el, false);
    }
    if (this.surveyPanel) {
      this.surveyPanel.hide();
      this.setGroupVisible(this.surveyPanel.el, false);
    }
    this.setGroupVisible(this.placementRoot, false);
    this.setGroupVisible(this.classroomPanelPlacementRoot, false);
    this.setGroupVisible(this.classroomPlacementCapture, false);
    this.setGroupVisible(this.frameworkDetailRoot, false);
    this.hideAllQuizPanels();
  }

  hideAllQuizPanels() {
    this.quizPanels.forEach((panel) => {
      panel.hide();
      this.setGroupVisible(panel.el, false);
    });
  }

  getQuizTransform(domainId) {
    const face = STUDIO_FACES[domainId] || STUDIO_FACES.engaging;
    if (this.isClassroomModeActive()) {
      const pose = this.getClassroomPose(domainId) || this.getDefaultClassroomPose(domainId);
      return {
        ...SINGLE_QUIZ_TRANSFORM,
        x: pose.position.x,
        y: SINGLE_QUIZ_TRANSFORM.y,
        z: pose.position.z,
        ry: pose.rotation.y
      };
    }
    return {
      ...SINGLE_QUIZ_TRANSFORM,
      x: face.x,
      y: SINGLE_QUIZ_TRANSFORM.y,
      z: face.z,
      ry: face.ry
    };
  }

  focusSection(mode, domainId = null) {
    if (!this.cameraRig) return;
    if (this.isClassroomModeActive()) {
      this.debugLog('focus-section-skipped-classroom', {mode, domainId});
      return;
    }
    this.cameraRig.setAttribute('position', '0 1.6 0');
    const targetYaw = domainId && STUDIO_FACES[domainId]
      ? STUDIO_FACES[domainId].ry
      : SECTION_FOCUS_ROTATION[mode] ?? 0;
    const lookControls = this.camera?.components?.['look-controls'];
    if (lookControls?.pitchObject) lookControls.pitchObject.rotation.x = 0;
    if (lookControls?.yawObject) lookControls.yawObject.rotation.y = 0;
    this.cameraRig.setAttribute('rotation', `0 ${targetYaw} 0`);
    if (this.camera) {
      this.camera.setAttribute('position', '0 0 0');
      this.camera.setAttribute('rotation', '0 0 0');
    }
    this.debugLog('focus-section', {
      mode,
      domainId,
      targetYaw,
      cameraRigRotation: this.cameraRig.getAttribute('rotation'),
      cameraRotation: this.camera?.getAttribute('rotation') || null
    });
  }

  exposeRuntimeApi() {
    window.AILiteracyStudio = {
      app: this,
      showStart: () => this.showStart(),
      showIntroVideo: () => this.showIntroVideo(),
      confirmIntroVideo: () => this.confirmIntroVideo(),
      showDomainSelect: () => this.showDomainSelect(),
      openDomain: (domainId) => this.openDomain(domainId),
      openPoint: (pointId) => this.openPoint(pointId),
      showReport: () => this.showReport(),
      showSurvey: () => this.showSurvey(),
      showClassroomPlacement: () => this.showClassroomPlacement(),
      showClassroomPanelPlacement: () => this.showClassroomPanelPlacement(),
      resetClassroomAnchor: () => this.resetClassroomAnchor(),
      resetClassroomLayout: () => this.resetClassroomLayout(),
      reset: () => this.restart(),
      routeHelp: {
        skipIntro: '?skipintro=true',
        skipVideo: '?skipVideo=1',
        resetVideo: '?resetVideo=1',
        teacherPreview: '?teacherPreview=1',
        classroomMode: '?mr=1',
        resetClassroomAnchor: '?mr=1&resetAnchor=1',
        resetClassroomLayout: 'AILiteracyStudio.resetClassroomLayout()',
        openDomain: '?domain=engaging',
        report: '?view=report',
        survey: '?view=survey',
        framework: '?view=framework',
        point: '?point=engaging',
        reset: '?reset=true'
      }
    };
  }

  setGroupVisible(group, visible) {
    if (!group) return;
    group.setAttribute('visible', visible ? 'true' : 'false');
    if (group.object3D) group.object3D.visible = Boolean(visible);
    group.querySelectorAll?.('.interactive, [data-hidden-interactive="true"]').forEach((entity) => {
      if (visible) {
        if (entity.dataset.hiddenInteractive === 'true') {
          entity.classList.add('interactive');
          delete entity.dataset.hiddenInteractive;
        }
        return;
      }
      if (entity.classList.contains('interactive')) {
        entity.classList.remove('interactive');
        entity.dataset.hiddenInteractive = 'true';
      }
    });
  }

  findDomain(domainId) {
    return this.data.domains.find((domain) => domain.id === domainId);
  }

  bindKeyboardControls() {
    window.addEventListener('keydown', (event) => {
      const key = String(event.key || '').toLowerCase();
      const isEnter = key === 'enter' || String(event.code || '').toLowerCase() === 'enter';

      if (this.appMode === 'start' && (isEnter || event.key === ' ' || key === 's')) {
        this.withRuntimeGuard('영역 선택 시작 키보드', () => this.startPanel.start(() => this.startIntroTransition()));
        return;
      }

      if (this.appMode === 'introVideo' && (isEnter || event.key === ' ' || key === 'v')) {
        this.withRuntimeGuard('사전 영상 확인 키보드', () => this.confirmIntroVideo());
        return;
      }

      if (this.appMode === 'placement' && (isEnter || event.key === ' ' || key === 'p')) {
        this.withRuntimeGuard('교실 기준점 설정 키보드', () => this.setClassroomAnchorFromView());
        return;
      }

      if (this.appMode === 'panelPlacement' && (isEnter || event.key === ' ' || key === 'p')) {
        this.withRuntimeGuard('패널 위치 배치 키보드', () => this.placeNextClassroomPanel());
        return;
      }

      if (this.appMode === 'domainSelect') {
        if (key === 'arrowleft' || key === 'arrowright') {
          event.preventDefault();
          this.rotateDomainRing(key === 'arrowright' ? 1 : -1);
          return;
        }
        if (['1', '2', '3', '4'].includes(event.key)) {
          this.withRuntimeGuard('영역 시작 키보드', () => this.openPoint(REQUIRED_DOMAIN_ORDER[Number(event.key) - 1]));
          return;
        }
        if (key === 'r') this.withRuntimeGuard('리포트 키보드', () => this.openPoint('report'));
        if (key === 'v' || key === 's') this.withRuntimeGuard('설문 키보드', () => this.openPoint('survey'));
      }

      if (this.activeDomain && ['1', '2', '3', '4'].includes(event.key)) {
        const panel = this.quizPanels.get(this.activeDomain);
        if (panel?.currentQuestion) this.withRuntimeGuard('선택지 키보드', () => this.selectChoice(Number(event.key) - 1, panel, event));
        return;
      }

      if ((isEnter || key === 'n') && this.activeDomain) {
        const panel = this.quizPanels.get(this.activeDomain);
        if (panel?.currentQuestion && this.progress.answers[panel.currentQuestion.id] !== undefined) {
          this.withRuntimeGuard('다음 문제 키보드', () => this.goNext(panel));
        }
        return;
      }

      if (this.appMode === 'survey' && ['1', '2', '3', '4', '5'].includes(event.key)) {
        this.withRuntimeGuard('설문 선택 키보드', () => this.surveyPanel.selectOption(Number(event.key) - 1));
        return;
      }
      if (this.appMode === 'survey' && (isEnter || key === 'n')) {
        this.withRuntimeGuard('설문 다음 키보드', () => this.surveyPanel.goNext());
        return;
      }
      if (event.key === 'Escape' || key === 'h') {
        this.withRuntimeGuard('영역 선택 복귀 키보드', () => this.showDomainSelect());
      }
    });
  }

  bindWheelControls() {
    window.addEventListener('wheel', (event) => {
      if (this.appMode !== 'domainSelect') return;
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      if (Math.abs(delta) < 18) return;
      const now = Date.now();
      if (now - this.lastWheelNavigationAt < 430) return;
      this.lastWheelNavigationAt = now;
      event.preventDefault();
      this.rotateDomainRing(delta > 0 ? 1 : -1);
    }, {passive: false});
  }

  bindPanelSwipeControls() {
    window.addEventListener('mousemove', (event) => {
      if (this.panelSwipeState?.source !== 'pointer') return;
      this.updatePanelSwipePreview(this.getPointerX(event));
    });

    window.addEventListener('mouseup', (event) => {
      if (this.panelSwipeState?.source !== 'pointer') return;
      this.endPointerPanelSwipe(event);
    });

    window.addEventListener('touchmove', (event) => {
      if (this.panelSwipeState?.source !== 'pointer') return;
      this.updatePanelSwipePreview(this.getPointerX(event));
    }, {passive: true});

    window.addEventListener('touchend', (event) => {
      if (this.panelSwipeState?.source !== 'pointer') return;
      this.endPointerPanelSwipe(event);
    });

    [this.leftHand, this.rightHand].filter(Boolean).forEach((hand) => {
      ['triggerdown', 'gripdown'].forEach((eventName) => {
        hand.addEventListener(eventName, (event) => this.beginControllerPanelSwipe(hand, event));
      });
      ['triggerup', 'gripup'].forEach((eventName) => {
        hand.addEventListener(eventName, (event) => this.endControllerPanelSwipe(hand, event));
      });
    });
  }

  getPointerX(event) {
    const source = event?.changedTouches?.[0] || event?.touches?.[0] || event?.detail?.mouseEvent || event;
    return Number(source?.clientX ?? 0);
  }

  isControllerCursorEvent(event) {
    return Boolean(
      event?.detail?.cursorEl &&
      !event?.detail?.mouseEvent &&
      event?.clientX === undefined &&
      !event?.touches?.length &&
      !event?.changedTouches?.length
    );
  }

  beginPanelSwipe({
    source,
    handle,
    fallbackDirection = 1,
    pointerX = 0,
    controllerPosition = null,
    requireThreshold = false,
    suppressTarget = null
  }) {
    if (this.appMode !== 'domainSelect') return;
    const now = Date.now();
    if (now - this.lastPanelSwipeAt < PANEL_SWIPE_COOLDOWN_MS) return;
    const swipeRoot = handle?._swipeRoot || handle;
    const basePosition = swipeRoot?.getAttribute?.('position') || {x: 0, y: 0, z: 0};
    this.panelSwipeState = {
      source,
      handle: swipeRoot,
      fallbackDirection,
      requireThreshold,
      suppressTarget,
      startPointerX: pointerX,
      lastPointerX: pointerX,
      basePosition: {
        x: Number(basePosition.x || 0),
        y: Number(basePosition.y || 0),
        z: Number(basePosition.z || 0)
      },
      startControllerPosition: controllerPosition,
      moved: false,
      startedAt: now
    };
    this.setSwipeHandleActive(swipeRoot, true);
    this.debugLog('panel-swipe-start', {source, fallbackDirection, requireThreshold});
  }

  updatePanelSwipePreview(pointerX) {
    if (!this.panelSwipeState) return;
    const delta = pointerX - this.panelSwipeState.startPointerX;
    this.panelSwipeState.lastPointerX = pointerX;
    this.panelSwipeState.moved = Math.abs(delta) >= 8;
    const handle = this.panelSwipeState.handle;
    if (handle?._swipeGrip) {
      const base = this.panelSwipeState.basePosition || {x: 0, y: 0, z: 0};
      const offset = Math.max(-0.08, Math.min(0.08, delta / 780));
      handle.setAttribute('position', `${(base.x + offset).toFixed(3)} ${base.y.toFixed(3)} ${base.z.toFixed(3)}`);
    }
  }

  endPointerPanelSwipe(event) {
    if (!this.panelSwipeState) return;
    const pointerX = this.getPointerX(event);
    const delta = pointerX - this.panelSwipeState.startPointerX;
    const reachedThreshold = Math.abs(delta) >= PANEL_SWIPE_MOUSE_THRESHOLD;
    if (!reachedThreshold && this.panelSwipeState.requireThreshold) {
      this.cancelPanelSwipe('pointer-cancel');
      return;
    }
    const direction = reachedThreshold ? (delta < 0 ? 1 : -1) : this.panelSwipeState.fallbackDirection;
    const reason = reachedThreshold ? 'pointer-swipe' : 'pointer-tap';
    this.finishPanelSwipe(direction, reason);
  }

  beginControllerPanelSwipe(hand, event) {
    if (this.appMode !== 'domainSelect') return;
    const target = this.getIntersectedSwipeTarget(hand);
    if (!target) return;
    const isSurface = target.dataset?.swipeSurface === 'true';
    this.beginPanelSwipe({
      source: 'controller',
      handle: target,
      fallbackDirection: isSurface ? 0 : Number(target.dataset.fallbackDirection || target._swipeRoot?.dataset?.fallbackDirection || 1),
      controllerPosition: this.getObjectWorldPosition(hand),
      requireThreshold: isSurface,
      suppressTarget: isSurface ? target : null
    });
    event?.stopPropagation?.();
  }

  endControllerPanelSwipe(hand, event) {
    if (this.panelSwipeState?.source !== 'controller') return;
    const start = this.panelSwipeState.startControllerPosition;
    const end = this.getObjectWorldPosition(hand);
    const rightDelta = start && end ? this.getCameraRightDelta(start, end) : 0;
    const reachedThreshold = Math.abs(rightDelta) >= PANEL_SWIPE_CONTROLLER_THRESHOLD;
    if (!reachedThreshold && this.panelSwipeState.requireThreshold) {
      this.cancelPanelSwipe('controller-cancel');
      return;
    }
    const direction = reachedThreshold ? (rightDelta < 0 ? 1 : -1) : this.panelSwipeState.fallbackDirection;
    const reason = reachedThreshold ? 'controller-swipe' : 'controller-tap';
    this.finishPanelSwipe(direction, reason);
    event?.stopPropagation?.();
  }

  getIntersectedSwipeTarget(hand) {
    const intersectedEls = hand?.components?.raycaster?.intersectedEls || [];
    return intersectedEls.find((entity) => (
      entity?.dataset?.swipeHandle === 'true' ||
      entity?.dataset?.swipeSurface === 'true' ||
      entity?._swipeRoot?.dataset?.swipeHandle === 'true' ||
      entity?.classList?.contains('panel-swipe-handle')
    ));
  }

  getObjectWorldPosition(entity) {
    const THREE = window.AFRAME?.THREE || window.THREE;
    if (!THREE || !entity?.object3D) return null;
    const position = new THREE.Vector3();
    entity.object3D.getWorldPosition(position);
    return position;
  }

  getCameraRightDelta(start, end) {
    const THREE = window.AFRAME?.THREE || window.THREE;
    if (!THREE || !start || !end) return 0;
    const quaternion = new THREE.Quaternion();
    this.camera?.object3D?.getWorldQuaternion(quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(quaternion).normalize();
    return end.clone().sub(start).dot(right);
  }

  finishPanelSwipe(direction, reason = 'swipe') {
    const state = this.panelSwipeState;
    if (!state) return;
    this.panelSwipeState = null;
    this.lastPanelSwipeAt = Date.now();
    if (state.handle && state.basePosition) {
      state.handle.setAttribute('position', `${state.basePosition.x} ${state.basePosition.y} ${state.basePosition.z}`);
    }
    this.setSwipeHandleActive(state.handle, false);
    if (state.handle) state.handle.dataset.lastSwipeEndedAt = String(Date.now());
    if (state.suppressTarget && reason.includes('swipe')) {
      state.suppressTarget.dataset.suppressClickUntil = String(Date.now() + 360);
    }
    this.completePanelSwipe(direction, reason);
  }

  cancelPanelSwipe(reason = 'cancel') {
    const state = this.panelSwipeState;
    if (!state) return;
    this.panelSwipeState = null;
    if (state.handle && state.basePosition) {
      state.handle.setAttribute('position', `${state.basePosition.x} ${state.basePosition.y} ${state.basePosition.z}`);
    }
    this.setSwipeHandleActive(state.handle, false);
    this.debugLog('panel-swipe-cancel', {reason});
  }

  completePanelSwipe(direction, reason = 'swipe') {
    if (this.appMode !== 'domainSelect') return;
    this.debugLog('panel-swipe-complete', {direction, reason});
    this.rotateDomainRing(direction);
  }

  setSwipeHandleActive(handle, active) {
    if (!handle) return;
    const accent = handle.dataset.accent || '#7dd3fc';
    const grip = handle._swipeGrip;
    if (grip) {
      grip.setAttribute(
        'material',
        `color: ${accent}; shader: flat; transparent: true; opacity: ${active ? 1 : 0.52}; side: double`
      );
    }
    handle.removeAttribute('animation__swipe_focus');
    handle.setAttribute('scale', active ? '1.14 1.14 1' : '1 1 1');
  }

  box(id, widthHeightDepth, position, color) {
    const box = document.createElement('a-box');
    box.id = id;
    const [width, height, depth] = widthHeightDepth.split(' ');
    box.setAttribute('width', width);
    box.setAttribute('height', height);
    box.setAttribute('depth', depth);
    box.setAttribute('position', position);
    box.setAttribute('material', `color: ${color}; roughness: 0.82; metalness: 0.05`);
    return box;
  }

  deepMerge(base, override) {
    if (!override || typeof override !== 'object' || Array.isArray(override)) return {...base};
    const next = {...base};
    Object.entries(override).forEach(([key, value]) => {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        next[key] = this.deepMerge(next[key] || {}, value);
      } else {
        next[key] = value;
      }
    });
    return next;
  }

  withRuntimeGuard(label, action) {
    try {
      const result = action();
      if (result && typeof result.catch === 'function') {
        result
          .catch((error) => this.showRuntimeError(error, label))
          .finally(() => this.updateHomeButtonVisibility());
      } else {
        this.updateHomeButtonVisibility();
      }
      return result;
    } catch (error) {
      this.showRuntimeError(error, label);
      this.updateHomeButtonVisibility();
      return null;
    }
  }

  debugLog(label, payload = {}) {
    if (!this.debug) return;
    if (this.scene) {
      this.scene.dataset.lastDebug = label;
      this.scene.dataset.lastDebugPayload = JSON.stringify(payload);
    }
    console.log(`[AI Literacy Studio debug] ${label}`, payload);
  }

  showNotice(message) {
    this.showRuntimeWarning(message, '안내');
  }

  setLoading(message) {
    this.root.innerHTML = `<main class="system-message">${message}</main>`;
  }

  setError(message) {
    const safeMessage = String(message).replace(/[<>&]/g, (char) => ({'<': '&lt;', '>': '&gt;', '&': '&amp;'})[char]);
    this.root.innerHTML = `<main class="system-message error"><strong>실행 오류</strong><pre>${safeMessage}</pre></main>`;
  }

  showRuntimeError(error, label = '실행 중 오류') {
    console.error(`[AI Literacy Studio] ${label}`, error);
    const message = error?.message || String(error);
    let overlay = document.querySelector('#runtime-error');
    if (!overlay) {
      overlay = document.createElement('aside');
      overlay.id = 'runtime-error';
      overlay.className = 'runtime-error';
      document.body.appendChild(overlay);
    }
    overlay.textContent = `${label}: ${message}`;
    window.setTimeout(() => {
      if (overlay) overlay.remove();
    }, 6000);
  }

  showRuntimeWarning(message, label = '안내') {
    let overlay = document.querySelector('#runtime-warning');
    if (!overlay) {
      overlay = document.createElement('aside');
      overlay.id = 'runtime-warning';
      overlay.className = 'runtime-error runtime-warning';
      document.body.appendChild(overlay);
    }
    overlay.textContent = `${label}: ${message}`;
    window.setTimeout(() => {
      if (overlay) overlay.remove();
    }, 6000);
  }
}