export const REQUIRED_DOMAIN_IDS = ["engage", "create", "manage", "design"];

const DOMAIN_LABELS = {
  engage: "Engaging with AI",
  create: "Creating with AI",
  manage: "Managing AI",
  design: "Designing AI"
};

function isObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function toTrimmedString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function toLineItems(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  return [];
}

function round2(number) {
  return Math.round(number * 100) / 100;
}

function normalizeWeightSum(weights) {
  const total = weights.reduce((sum, item) => sum + item.weight, 0);
  if (total <= 0) return weights;

  const scaled = weights.map((item) => ({
    ...item,
    weight: round2((item.weight / total) * 100)
  }));

  const scaledTotal = round2(scaled.reduce((sum, item) => sum + item.weight, 0));
  const delta = round2(100 - scaledTotal);
  if (delta === 0) return scaled;

  let maxIndex = 0;
  for (let i = 1; i < scaled.length; i += 1) {
    if (scaled[i].weight > scaled[maxIndex].weight) {
      maxIndex = i;
    }
  }
  scaled[maxIndex].weight = round2(scaled[maxIndex].weight + delta);
  return scaled;
}

function toWeightsFromString(raw, criterionIds) {
  const text = toTrimmedString(raw);
  if (!text) return [];

  const parts = text
    .split(/[\/,|]/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (parts.length === 0) return [];

  if (parts.every((item) => item.includes(":"))) {
    return parts
      .map((item) => {
        const [criterionId, weight] = item.split(":").map((token) => token.trim());
        return {
          criterionId,
          weight: Number(weight)
        };
      })
      .filter((item) => item.criterionId && Number.isFinite(item.weight) && item.weight > 0);
  }

  return criterionIds
    .map((criterionId, index) => ({
      criterionId,
      weight: Number(parts[index] ?? 0)
    }))
    .filter((item) => Number.isFinite(item.weight) && item.weight > 0);
}

function toRubricFocus(raw, fallback, criterionIds) {
  const source = raw ?? fallback;

  if (typeof source === "string") {
    return toWeightsFromString(source, criterionIds);
  }

  if (Array.isArray(source)) {
    if (source.every((item) => typeof item === "number")) {
      return criterionIds
        .map((criterionId, index) => ({
          criterionId,
          weight: Number(source[index] ?? 0)
        }))
        .filter((item) => Number.isFinite(item.weight) && item.weight > 0);
    }

    return source
      .map((item) => ({
        criterionId: toTrimmedString(item?.criterionId),
        weight: Number(item?.weight)
      }))
      .filter((item) => item.criterionId && Number.isFinite(item.weight) && item.weight > 0);
  }

  if (isObject(source)) {
    return criterionIds
      .map((criterionId) => ({
        criterionId,
        weight: Number(source[criterionId] ?? 0)
      }))
      .filter((item) => Number.isFinite(item.weight) && item.weight > 0);
  }

  return [];
}

function assertDomainCoverage(missions) {
  const ids = missions.map((mission) => mission.id);
  const missing = REQUIRED_DOMAIN_IDS.filter((id) => !ids.includes(id));
  if (missing.length) {
    throw new Error(`4영역 미션 id 누락: ${missing.join(", ")}`);
  }
}

function assertRubricTemplate(rubricTemplate) {
  if (!isObject(rubricTemplate)) {
    throw new Error("rubricTemplate 객체가 필요합니다.");
  }

  if (!Array.isArray(rubricTemplate.criteria) || rubricTemplate.criteria.length === 0) {
    throw new Error("rubricTemplate.criteria는 1개 이상이어야 합니다.");
  }

  if (
    !Array.isArray(rubricTemplate.levelDescriptors) ||
    rubricTemplate.levelDescriptors.length === 0
  ) {
    throw new Error("rubricTemplate.levelDescriptors는 1개 이상이어야 합니다.");
  }
}

function compactRowToMission(id, row) {
  if (!isObject(row)) {
    throw new Error(`missionsCompact.${id}는 객체여야 합니다.`);
  }

  return {
    id,
    domain: row.domain ?? DOMAIN_LABELS[id],
    subject: row.subject ?? row.s,
    difficulty: row.difficulty ?? row.d,
    estimatedMinutes: row.estimatedMinutes ?? row.minutes ?? row.m,
    title: row.title ?? row.t,
    goal: row.goal ?? row.g,
    briefing: row.briefing ?? row.b,
    tasksText: row.tasksText ?? row.tasks ?? row.ta,
    successCriteriaText:
      row.successCriteriaText ?? row.successCriteria ?? row.criteria ?? row.c,
    evidenceText: row.evidenceText ?? row.evidence ?? row.ev ?? row.e,
    rubricWeights: row.rubricWeights ?? row.weights ?? row.w,
    teacherNotes: row.teacherNotes ?? row.notes ?? row.n
  };
}

function extractMissionsInput(missionFile) {
  if (Array.isArray(missionFile.missions) && missionFile.missions.length > 0) {
    return missionFile.missions;
  }

  if (isObject(missionFile.missionsCompact)) {
    return Object.entries(missionFile.missionsCompact).map(([id, row]) =>
      compactRowToMission(id, row)
    );
  }

  throw new Error("missions 또는 missionsCompact 입력이 필요합니다.");
}

function normalizeTeacherDefaults(rawDefaults) {
  if (!isObject(rawDefaults)) return {};

  return {
    subject: rawDefaults.subject ?? rawDefaults.s,
    difficulty: rawDefaults.difficulty ?? rawDefaults.d,
    estimatedMinutes:
      rawDefaults.estimatedMinutes ?? rawDefaults.minutes ?? rawDefaults.m,
    rubricWeights: rawDefaults.rubricWeights ?? rawDefaults.weights ?? rawDefaults.w,
    autoNormalizeRubricWeights: rawDefaults.autoNormalizeRubricWeights
  };
}

function normalizeMission(rawMission, options, index) {
  const {
    teacherDefaults,
    rubricCriterionIds,
    difficultyScale,
    autoNormalizeRubricWeights
  } = options;

  const mission = {
    ...teacherDefaults,
    ...Object.fromEntries(
      Object.entries(rawMission).filter(([, value]) => value !== undefined && value !== null)
    )
  };

  const id = toTrimmedString(mission.id);
  const domain = toTrimmedString(mission.domain || DOMAIN_LABELS[id]);
  const title = toTrimmedString(mission.title);
  const goal = toTrimmedString(mission.goal);
  const briefing = toTrimmedString(mission.briefing);
  const subject = toTrimmedString(mission.subject);
  const difficulty = toTrimmedString(mission.difficulty);
  const teacherNotes = toTrimmedString(mission.teacherNotes);

  if (!id || !domain || !title || !goal) {
    throw new Error(`missions[${index}]는 id/domain/title/goal이 필요합니다.`);
  }

  if (!subject) {
    throw new Error(`missions[${index}].subject는 비어 있을 수 없습니다.`);
  }

  if (!difficulty) {
    throw new Error(`missions[${index}].difficulty는 비어 있을 수 없습니다.`);
  }

  if (!difficultyScale.includes(difficulty)) {
    throw new Error(
      `missions[${index}].difficulty(${difficulty})가 difficultyScale에 없습니다.`
    );
  }

  const estimatedMinutes = Number(mission.estimatedMinutes);
  if (!Number.isFinite(estimatedMinutes) || estimatedMinutes <= 0) {
    throw new Error(`missions[${index}].estimatedMinutes는 1 이상의 숫자여야 합니다.`);
  }

  const tasks = toLineItems(mission.tasks ?? mission.tasksText);
  const successCriteria = toLineItems(
    mission.successCriteria ?? mission.successCriteriaText
  );
  const evidenceToCollect = toLineItems(
    mission.evidenceToCollect ?? mission.evidenceText
  );

  if (tasks.length === 0) {
    throw new Error(`missions[${index}] tasks가 비어 있습니다.`);
  }

  if (successCriteria.length === 0) {
    throw new Error(`missions[${index}] successCriteria가 비어 있습니다.`);
  }

  if (evidenceToCollect.length === 0) {
    throw new Error(`missions[${index}] evidenceToCollect가 비어 있습니다.`);
  }

  const fallbackRubricWeights = teacherDefaults.rubricWeights;
  let rubricFocus = toRubricFocus(
    mission.rubricFocus ?? mission.rubricWeights ?? mission.weights ?? mission.w,
    fallbackRubricWeights,
    rubricCriterionIds
  );

  if (rubricFocus.length === 0) {
    throw new Error(`missions[${index}] rubricFocus 또는 rubricWeights가 필요합니다.`);
  }

  rubricFocus.forEach((item, focusIndex) => {
    if (!rubricCriterionIds.includes(item.criterionId)) {
      throw new Error(
        `missions[${index}].rubricFocus[${focusIndex}] criterionId(${item.criterionId})가 rubricTemplate.criteria에 없습니다.`
      );
    }
    if (!Number.isFinite(item.weight) || item.weight < 0) {
      throw new Error(
        `missions[${index}].rubricFocus[${focusIndex}] weight는 0 이상의 숫자여야 합니다.`
      );
    }
  });

  const weightSum = round2(rubricFocus.reduce((sum, item) => sum + item.weight, 0));
  if (round2(weightSum) !== 100) {
    if (!autoNormalizeRubricWeights) {
      throw new Error(
        `missions[${index}] rubric weight 합계(${weightSum})는 100이어야 합니다.`
      );
    }
    rubricFocus = normalizeWeightSum(rubricFocus);
  }

  return {
    id,
    domain,
    subject,
    difficulty,
    estimatedMinutes,
    title,
    goal,
    briefing,
    tasks,
    successCriteria,
    evidenceToCollect,
    rubricFocus,
    teacherNotes
  };
}

export function normalizeMissionFile(missionFile) {
  if (!isObject(missionFile)) {
    throw new Error("missions.json 형식이 올바르지 않습니다.");
  }

  const rawMissions = extractMissionsInput(missionFile);
  if (!Array.isArray(rawMissions) || rawMissions.length === 0) {
    throw new Error("미션 입력이 비어 있습니다.");
  }

  const difficultyScale = Array.isArray(missionFile.difficultyScale)
    ? missionFile.difficultyScale.map((item) => toTrimmedString(item)).filter(Boolean)
    : [];
  if (difficultyScale.length === 0) {
    throw new Error("difficultyScale은 1개 이상이어야 합니다.");
  }

  assertRubricTemplate(missionFile.rubricTemplate);

  const rubricTemplate = {
    ...missionFile.rubricTemplate,
    criteria: missionFile.rubricTemplate.criteria.map((item) => ({
      id: toTrimmedString(item.id),
      label: toTrimmedString(item.label),
      description: toTrimmedString(item.description)
    })),
    levelDescriptors: missionFile.rubricTemplate.levelDescriptors.map((item) => ({
      level: toTrimmedString(item.level),
      label: toTrimmedString(item.label),
      description: toTrimmedString(item.description)
    }))
  };

  const rubricCriterionIds = rubricTemplate.criteria.map((item) => item.id).filter(Boolean);
  if (rubricCriterionIds.length === 0) {
    throw new Error("rubricTemplate.criteria.id는 비어 있을 수 없습니다.");
  }

  const teacherDefaults = normalizeTeacherDefaults(missionFile.teacherDefaults);
  const autoNormalizeRubricWeights =
    missionFile.autoNormalizeRubricWeights !== false &&
    teacherDefaults.autoNormalizeRubricWeights !== false;

  const missions = rawMissions.map((rawMission, index) =>
    normalizeMission(
      rawMission,
      {
        teacherDefaults,
        rubricCriterionIds,
        difficultyScale,
        autoNormalizeRubricWeights
      },
      index
    )
  );

  assertDomainCoverage(missions);

  return {
    templateVersion: missionFile.templateVersion ?? "1.0.0",
    difficultyScale,
    rubricTemplate,
    teacherDefaults,
    autoNormalizeRubricWeights,
    missions
  };
}
