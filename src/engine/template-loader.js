import { normalizeMissionFile } from "./mission-normalizer.mjs";

const COURSE_PATH = "./config/course.json";
const MISSIONS_PATH = "./content/missions.json";

async function fetchJson(path) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`${path} 파일을 읽지 못했습니다. (HTTP ${response.status})`);
  }
  return response.json();
}

function assertCourseShape(course) {
  const required = ["templateVersion", "title", "subtitle", "sessionMinutes"];
  const missing = required.filter((key) => !(key in course));
  if (missing.length) {
    throw new Error(`course.json 누락 필드: ${missing.join(", ")}`);
  }
}

export async function loadTemplateData() {
  const [course, missionFileRaw] = await Promise.all([
    fetchJson(COURSE_PATH),
    fetchJson(MISSIONS_PATH)
  ]);

  assertCourseShape(course);
  const missionFile = normalizeMissionFile(missionFileRaw);

  return {
    course,
    missions: missionFile.missions,
    difficultyScale: missionFile.difficultyScale,
    rubricTemplate: missionFile.rubricTemplate,
    teacherDefaults: missionFile.teacherDefaults,
    autoNormalizeRubricWeights: missionFile.autoNormalizeRubricWeights
  };
}
