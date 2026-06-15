function readCssVar(name, fallback) {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return value || fallback;
}

function createText(value, position, options = {}) {
  const {
    width = "2.8",
    color = "#ffffff",
    align = "center",
    scale = "1 1 1",
    wrapCount,
    anchor = "center"
  } = options;

  const text = document.createElement("a-text");
  text.setAttribute("value", value);
  text.setAttribute("position", position);
  text.setAttribute("width", width);
  text.setAttribute("color", color);
  text.setAttribute("align", align);
  text.setAttribute("anchor", anchor);
  text.setAttribute("scale", scale);

  if (wrapCount) {
    text.setAttribute("wrap-count", String(wrapCount));
  }

  return text;
}

function createPanel(width, height, color, opacity = 0.95) {
  const panel = document.createElement("a-plane");
  panel.setAttribute("width", String(width));
  panel.setAttribute("height", String(height));
  panel.setAttribute(
    "material",
    `color: ${color}; opacity: ${opacity}; roughness: 0.2; metalness: 0.05; side: double`
  );
  return panel;
}

function createButton(label, position, tone = "primary") {
  const palette = {
    primary: {
      base: readCssVar("--vr-card-active", "#6be4c9"),
      hover: readCssVar("--vr-button-hover", "#9df4df"),
      text: readCssVar("--vr-button-text", "#103b52")
    },
    neutral: {
      base: readCssVar("--vr-card", "#ffffff"),
      hover: readCssVar("--vr-button-neutral-hover", "#f5fbff"),
      text: readCssVar("--vr-card-text", "#1b3e5d")
    }
  };

  const colors = palette[tone] || palette.primary;

  const button = createPanel(1.85, 0.46, colors.base, 1);
  button.setAttribute("class", "clickable");
  button.setAttribute("data-base-color", colors.base);
  button.setAttribute("data-hover-color", colors.hover);
  button.setAttribute(
    "animation__hover",
    "property: scale; startEvents: mouseenter; to: 1.05 1.05 1.05; dur: 120"
  );
  button.setAttribute(
    "animation__leave",
    "property: scale; startEvents: mouseleave; to: 1 1 1; dur: 110"
  );

  const text = createText(label, "0 0 0.01", {
    width: "2.8",
    color: colors.text,
    scale: "0.6 0.6 0.6"
  });
  button.appendChild(text);

  const entity = document.createElement("a-entity");
  entity.setAttribute("position", position);
  entity.appendChild(button);

  button.addEventListener("mouseenter", () => {
    button.setAttribute(
      "material",
      `color: ${colors.hover}; opacity: 1; roughness: 0.2; metalness: 0.05; side: double`
    );
  });

  button.addEventListener("mouseleave", () => {
    button.setAttribute(
      "material",
      `color: ${colors.base}; opacity: 1; roughness: 0.2; metalness: 0.05; side: double`
    );
  });

  return { entity, button };
}

function toPreviewLines(items, count = 3) {
  return (items || []).slice(0, count).map((item, index) => `${index + 1}. ${item}`);
}

function missionTone(id) {
  const tones = {
    engage: "#7fd3ff",
    create: "#ffc987",
    manage: "#98e2b8",
    design: "#f7a8c8"
  };
  return tones[id] || "#b3d7ff";
}

function portalPositionByIndex(index) {
  const points = [
    { x: -3.05, y: 1.4, z: -4.6 },
    { x: 3.05, y: 1.4, z: -4.6 },
    { x: -3.05, y: 1.4, z: -8.2 },
    { x: 3.05, y: 1.4, z: -8.2 }
  ];

  if (points[index]) return points[index];

  const col = index % 2;
  const row = Math.floor(index / 2);
  return {
    x: col === 0 ? -3.05 : 3.05,
    y: 1.4,
    z: -8.2 - (row - 1) * 3.6
  };
}

function createPortal(mission, index, onOpenMission) {
  const pos = portalPositionByIndex(index);
  const portal = document.createElement("a-entity");
  portal.setAttribute("position", `${pos.x} ${pos.y} ${pos.z}`);

  const frame = createPanel(2.25, 2.9, readCssVar("--vr-card", "#ffffff"), 0.94);
  frame.setAttribute("class", "clickable");
  frame.setAttribute("data-base-color", readCssVar("--vr-card", "#ffffff"));
  frame.setAttribute("data-active-color", missionTone(mission.id));
  frame.setAttribute(
    "animation__hover",
    "property: scale; startEvents: mouseenter; to: 1.03 1.03 1.03; dur: 120"
  );
  frame.setAttribute(
    "animation__leave",
    "property: scale; startEvents: mouseleave; to: 1 1 1; dur: 120"
  );

  const ring = document.createElement("a-ring");
  ring.setAttribute("radius-inner", "1.3");
  ring.setAttribute("radius-outer", "1.45");
  ring.setAttribute("position", "0 0 -0.02");
  ring.setAttribute("rotation", "0 0 0");
  ring.setAttribute("color", missionTone(mission.id));
  ring.setAttribute("opacity", "0.35");

  const badge = document.createElement("a-circle");
  badge.setAttribute("radius", "0.32");
  badge.setAttribute("position", "0 0.98 0.01");
  badge.setAttribute("color", missionTone(mission.id));

  const number = createText(String(index + 1), "0 0.96 0.02", {
    width: "0.8",
    color: "#0f2f44",
    scale: "0.55 0.55 0.55"
  });

  const domain = createText(mission.domain, "0 0.5 0.01", {
    width: "2",
    color: readCssVar("--vr-card-text", "#1b3e5d"),
    scale: "0.52 0.52 0.52"
  });

  const title = createText(mission.title, "0 0.05 0.01", {
    width: "2.1",
    color: readCssVar("--vr-card-text", "#1b3e5d"),
    scale: "0.62 0.62 0.62",
    wrapCount: 20
  });

  const meta = createText(`${mission.subject} | ${mission.estimatedMinutes}분`, "0 -0.55 0.01", {
    width: "2.1",
    color: "#2e5677",
    scale: "0.42 0.42 0.42",
    wrapCount: 23
  });

  const hint = createText("클릭해서 미션 룸 열기", "0 -1.03 0.01", {
    width: "2",
    color: "#0d8f7c",
    scale: "0.42 0.42 0.42"
  });

  frame.addEventListener("mouseenter", () => {
    frame.setAttribute(
      "material",
      `color: ${missionTone(mission.id)}; opacity: 1; roughness: 0.2; metalness: 0.05; side: double`
    );
  });

  frame.addEventListener("mouseleave", () => {
    frame.setAttribute(
      "material",
      `color: ${readCssVar("--vr-card", "#ffffff")}; opacity: 0.94; roughness: 0.2; metalness: 0.05; side: double`
    );
  });

  frame.addEventListener("click", () => onOpenMission(index));

  frame.appendChild(badge);
  frame.appendChild(number);
  frame.appendChild(domain);
  frame.appendChild(title);
  frame.appendChild(meta);
  frame.appendChild(hint);
  portal.appendChild(ring);
  portal.appendChild(frame);

  return portal;
}

function createHubWorld(missions, onOpenMission) {
  const world = document.createElement("a-entity");
  world.setAttribute("id", "hub-world");

  const title = createText("AI Literacy Mission Portals", "0 3.1 -6.3", {
    width: "10",
    color: readCssVar("--vr-title", "#f5feff"),
    scale: "1.15 1.15 1.15"
  });

  const subtitle = createText("OECD 4영역 미션형 탐험", "0 2.68 -6.3", {
    width: "9",
    color: readCssVar("--vr-subtitle", "#d2ecff"),
    scale: "0.72 0.72 0.72"
  });

  const base = document.createElement("a-cylinder");
  base.setAttribute("position", "0 0.01 -6.4");
  base.setAttribute("radius", "6.2");
  base.setAttribute("height", "0.02");
  base.setAttribute("color", readCssVar("--vr-platform", "#19365d"));
  base.setAttribute("opacity", "0.52");

  world.appendChild(base);
  world.appendChild(title);
  world.appendChild(subtitle);

  missions.forEach((mission, index) => {
    world.appendChild(createPortal(mission, index, onOpenMission));
  });

  return world;
}

function createMissionRoom() {
  const room = document.createElement("a-entity");
  room.setAttribute("id", "mission-room");
  room.setAttribute("visible", "false");

  const shell = document.createElement("a-cylinder");
  shell.setAttribute("position", "0 1.4 -6.4");
  shell.setAttribute("radius", "4.1");
  shell.setAttribute("height", "3.1");
  shell.setAttribute("open-ended", "true");
  shell.setAttribute("side", "back");
  shell.setAttribute("color", readCssVar("--vr-room-shell", "#13223f"));
  shell.setAttribute("opacity", "0.9");

  const panel = createPanel(6.1, 3.05, readCssVar("--vr-card", "#ffffff"), 0.95);
  panel.setAttribute("position", "0 1.52 -6.15");

  const domain = createText("", "0 2.65 -6.11", {
    width: "5.4",
    color: readCssVar("--vr-room-domain", "#0d9682"),
    scale: "0.68 0.68 0.68"
  });

  const title = createText("", "0 2.24 -6.11", {
    width: "5.5",
    color: readCssVar("--vr-card-text", "#1b3e5d"),
    scale: "0.88 0.88 0.88",
    wrapCount: 24
  });

  const goalLabel = createText("Mission Goal", "-2.45 1.9 -6.11", {
    width: "2.4",
    align: "left",
    anchor: "left",
    color: "#0d8f7c",
    scale: "0.48 0.48 0.48"
  });

  const goal = createText("", "-2.45 1.58 -6.11", {
    width: "4.9",
    align: "left",
    anchor: "left",
    color: "#214b6f",
    scale: "0.45 0.45 0.45",
    wrapCount: 46
  });

  const tasksLabel = createText("Task Preview", "-2.45 1.14 -6.11", {
    width: "2.4",
    align: "left",
    anchor: "left",
    color: "#0d8f7c",
    scale: "0.48 0.48 0.48"
  });

  const tasks = createText("", "-2.45 0.79 -6.11", {
    width: "4.9",
    align: "left",
    anchor: "left",
    color: "#214b6f",
    scale: "0.43 0.43 0.43",
    wrapCount: 48
  });

  const evidenceLabel = createText("Evidence", "-2.45 0.28 -6.11", {
    width: "2.4",
    align: "left",
    anchor: "left",
    color: "#0d8f7c",
    scale: "0.48 0.48 0.48"
  });

  const evidence = createText("", "-2.45 -0.05 -6.11", {
    width: "4.9",
    align: "left",
    anchor: "left",
    color: "#214b6f",
    scale: "0.43 0.43 0.43",
    wrapCount: 48
  });

  const meta = createText("", "0 -0.95 -6.11", {
    width: "5.6",
    color: "#1c3e5c",
    scale: "0.5 0.5 0.5"
  });

  panel.appendChild(domain);
  panel.appendChild(title);
  panel.appendChild(goalLabel);
  panel.appendChild(goal);
  panel.appendChild(tasksLabel);
  panel.appendChild(tasks);
  panel.appendChild(evidenceLabel);
  panel.appendChild(evidence);
  panel.appendChild(meta);

  const openHud = createButton("이 미션 시작", "-1.1 -0.95 -5.88", "primary");
  const backHub = createButton("허브로 돌아가기", "1.1 -0.95 -5.88", "neutral");

  room.appendChild(shell);
  room.appendChild(panel);
  room.appendChild(openHud.entity);
  room.appendChild(backHub.entity);

  return {
    room,
    refs: {
      domain,
      title,
      goal,
      tasks,
      evidence,
      meta,
      openHud: openHud.button,
      backHub: backHub.button
    }
  };
}

function updateRoom(roomRefs, mission) {
  roomRefs.domain.setAttribute("value", mission.domain);
  roomRefs.title.setAttribute("value", mission.title);
  roomRefs.goal.setAttribute("value", mission.goal);

  const taskPreview = toPreviewLines(mission.tasks, 3).join("\n");
  roomRefs.tasks.setAttribute("value", taskPreview || "태스크를 설정하세요.");

  const evidencePreview = toPreviewLines(mission.evidenceToCollect, 2).join("\n");
  roomRefs.evidence.setAttribute("value", evidencePreview || "증거 항목을 설정하세요.");

  roomRefs.meta.setAttribute(
    "value",
    `${mission.subject} | ${mission.difficulty} | ${mission.estimatedMinutes}분`
  );
}

function setRigPosition(positionText) {
  const rig = document.querySelector("#camera-rig");
  if (!rig) return;
  rig.setAttribute("position", positionText);
}

export function buildMissionHub(hubEl, missions, onMissionSelect) {
  if (!hubEl) return null;

  hubEl.innerHTML = "";

  let activeIndex = -1;

  const showHub = () => {
    const hubWorld = document.querySelector("#hub-world");
    const room = document.querySelector("#mission-room");
    if (hubWorld) hubWorld.setAttribute("visible", "true");
    if (room) room.setAttribute("visible", "false");
    setRigPosition("0 1.6 3.2");
  };

  const showMissionRoom = (index) => {
    const mission = missions[index];
    if (!mission) return;

    activeIndex = index;
    updateRoom(refs, mission);
    const hubWorld = document.querySelector("#hub-world");
    const room = document.querySelector("#mission-room");

    if (hubWorld) hubWorld.setAttribute("visible", "false");
    if (room) room.setAttribute("visible", "true");

    setRigPosition("0 1.6 2.5");
    onMissionSelect(mission);
  };

  const hubWorld = createHubWorld(missions, showMissionRoom);
  const { room, refs } = createMissionRoom();

  refs.openHud.addEventListener("click", () => {
    if (activeIndex < 0 || !missions[activeIndex]) return;
    onMissionSelect(missions[activeIndex]);
  });

  refs.backHub.addEventListener("click", showHub);

  hubEl.appendChild(hubWorld);
  hubEl.appendChild(room);

  const selectMissionByIndex = (index) => {
    const mission = missions[index];
    if (!mission) return;

    updateRoom(refs, mission);
    showMissionRoom(index);
  };

  const openHub = () => {
    showHub();
  };

  const previewMissionByIndex = (index) => {
    const mission = missions[index];
    if (!mission) return;
    updateRoom(refs, mission);
  };

  previewMissionByIndex(0);
  openHub();

  return {
    selectMissionByIndex,
    openHub,
    previewMissionByIndex
  };
}
