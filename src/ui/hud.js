const els = {
  courseTitle: document.querySelector("#course-title"),
  courseSubtitle: document.querySelector("#course-subtitle"),
  missionDomain: document.querySelector("#mission-domain"),
  missionTitle: document.querySelector("#mission-title"),
  missionMeta: document.querySelector("#mission-meta"),
  missionGoal: document.querySelector("#mission-goal"),
  missionTasks: document.querySelector("#mission-tasks"),
  missionCriteria: document.querySelector("#mission-criteria"),
  missionEvidence: document.querySelector("#mission-evidence"),
  missionRubricFocus: document.querySelector("#mission-rubric-focus"),
  rubricLevels: document.querySelector("#rubric-levels"),
  missionNotes: document.querySelector("#mission-notes"),
  statusText: document.querySelector("#status-text")
};

function renderList(target, values) {
  if (!target) return;
  target.innerHTML = "";

  values.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    target.appendChild(li);
  });
}

export function renderCourseMeta(course) {
  if (els.courseTitle) els.courseTitle.textContent = course.title;
  if (els.courseSubtitle) {
    const info = `${course.subtitle} | ${course.gradeBand} | ${course.sessionMinutes}분`;
    els.courseSubtitle.textContent = info;
  }
}

function renderRubricFocus(mission, rubricTemplate) {
  const criteriaMap = new Map(
    (rubricTemplate?.criteria || []).map((item) => [item.id, item.label])
  );

  const focus = (mission.rubricFocus || []).map((item) => {
    const label = criteriaMap.get(item.criterionId) || item.criterionId;
    return `${label}: ${item.weight}%`;
  });

  const levels = (rubricTemplate?.levelDescriptors || []).map((item) => {
    return `${item.level} (${item.label}) - ${item.description}`;
  });

  renderList(els.missionRubricFocus, focus);
  renderList(els.rubricLevels, levels);
}

export function renderMission(mission, rubricTemplate) {
  if (els.missionDomain) els.missionDomain.textContent = mission.domain;
  if (els.missionTitle) els.missionTitle.textContent = mission.title;
  if (els.missionMeta) {
    els.missionMeta.textContent = `${mission.subject} | ${mission.difficulty} | ${mission.estimatedMinutes}분`;
  }
  if (els.missionGoal) els.missionGoal.textContent = mission.goal;
  renderList(els.missionTasks, mission.tasks || []);
  renderList(els.missionCriteria, mission.successCriteria || []);
  renderList(els.missionEvidence, mission.evidenceToCollect || []);
  renderRubricFocus(mission, rubricTemplate);
  if (els.missionNotes) {
    els.missionNotes.textContent = mission.teacherNotes || "없음";
  }
}

export function setStatus(message) {
  if (els.statusText) els.statusText.textContent = message;
}

export function showError(message) {
  setStatus(`오류: ${message}`);
}
