const DEFAULT_FONT = '"Pretendard", "Noto Sans KR", "Apple SD Gothic Neo", sans-serif';

const DEFAULT_TOKENS = {
  radius: 30,
  borderWidth: 2,
  shadow: 'rgba(15, 35, 58, 0.18)',
  surface: '#f8fbff',
  surfaceAlt: '#eef6ff',
  ink: '#14283d',
  muted: '#60758a',
  line: '#c9d8e6',
  navy: '#12263f',
  success: '#21a66b',
  danger: '#de4d5a',
  panelStyle: 'cleanFlat'
};

function splitLongToken(token, maxChars) {
  const chunks = [];
  for (let index = 0; index < token.length; index += maxChars) {
    chunks.push(token.slice(index, index + maxChars));
  }
  return chunks;
}

function wrapLines(ctx, text, maxWidth) {
  const tokens = String(text || '').split(/\s+/).flatMap((token) => {
    if (ctx.measureText(token).width <= maxWidth) return [token];
    return splitLongToken(token, Math.max(4, Math.floor(maxWidth / 28)));
  });

  const lines = [];
  let line = '';

  tokens.forEach((token) => {
    const testLine = line ? `${line} ${token}` : token;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      lines.push(line);
      line = token;
    } else {
      line = testLine;
    }
  });

  if (line) lines.push(line);
  return lines;
}

function trimToFit(ctx, text, maxWidth) {
  const ellipsis = '...';
  let value = String(text || '');
  while (value.length > 0 && ctx.measureText(`${value}${ellipsis}`).width > maxWidth) {
    value = value.slice(0, -1);
  }
  return value ? `${value}${ellipsis}` : ellipsis;
}

function wrapParagraphs(ctx, text, maxWidth, maxLines = 8) {
  const paragraphs = String(text || '').split('\n');
  const lines = [];

  paragraphs.forEach((paragraph) => {
    if (!paragraph.trim()) {
      lines.push('');
      return;
    }
    wrapLines(ctx, paragraph, maxWidth).forEach((line) => lines.push(line));
  });

  if (lines.length <= maxLines) return lines;
  const clipped = lines.slice(0, maxLines);
  clipped[clipped.length - 1] = trimToFit(ctx, clipped[clipped.length - 1], maxWidth);
  return clipped;
}

function fitFontSize(ctx, text, maxWidth, maxLines, startSize, minSize, weight = 700) {
  let size = startSize;
  while (size > minSize) {
    ctx.font = `${weight} ${size}px ${DEFAULT_FONT}`;
    const lines = wrapParagraphs(ctx, text, maxWidth, maxLines + 1);
    if (lines.length <= maxLines) return size;
    size -= 2;
  }
  return minSize;
}

export function createTextTexture(options) {
  const variant = options.variant || 'panel';
  if (variant === 'choice') return createChoiceTexture(options);
  if (variant === 'button') return createButtonTexture(options);
  if (variant === 'stat') return createStatTexture(options);
  if (variant === 'studioHeader') return createStudioHeaderTexture(options);
  if (variant === 'station') return createStationTexture(options);
  if (variant === 'reportGrid') return createReportGridTexture(options);

  const {
    width = 1024,
    height = 512,
    background = '#f8fbff',
    border = '#88a9c8',
    accent = '#1d8f8a',
    title = '',
    subtitle = '',
    body = '',
    footer = '',
    icon = '',
    progress = null,
    chips = [],
    textColor = '#163047',
    mutedColor = '#46657f',
    align = 'left',
    radius = 30,
    glass = false,
    titleSize = 52,
    titleMinSize = Math.max(22, titleSize - 16),
    titleMaxLines = 2,
    bodySize = 34,
    bodyMinSize = Math.max(18, bodySize - 10),
    bodyMaxLines = 6,
    footerSize = 30,
    footerMinSize = Math.max(16, footerSize - 8),
    footerMaxLines = 1,
    subtitleSize = 30,
    chipSize = 24,
    tokens = {}
  } = options;

  const design = {...DEFAULT_TOKENS, ...tokens};
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, width, height);

  const panel = {x: 22, y: 22, width: width - 44, height: height - 44};
  drawElevatedPanel(ctx, panel, {
    radius,
    background,
    border,
    accent,
    glass,
    shadow: design.shadow,
    panelStyle: design.panelStyle
  });

  const paddingX = align === 'center' ? 72 : 78;
  const left = align === 'center' ? width / 2 : panel.x + paddingX;
  const rightReserve = icon ? 188 : 70;
  const maxTextWidth = align === 'center' ? panel.width - 144 : panel.width - paddingX - rightReserve;
  let y = panel.y + 42;

  ctx.textAlign = align;
  ctx.textBaseline = 'top';

  if (subtitle || chips.length > 0 || icon) {
    const metaY = y;
    if (subtitle) {
      ctx.font = `600 ${subtitleSize}px ${DEFAULT_FONT}`;
      ctx.fillStyle = mutedColor;
      wrapParagraphs(ctx, subtitle, maxTextWidth, 1).forEach((line) => {
        ctx.fillText(line, left, y);
        y += subtitleSize + 7;
      });
    }

    if (chips.length > 0) {
      drawChips(ctx, chips, {
        x: align === 'center' ? panel.x + 60 : left,
        y: y + 3,
        chipSize,
        accent,
        border,
        mutedColor,
        maxRight: panel.x + panel.width - 60
      });
      y += chipSize + 30;
    }

    if (icon) {
      drawIconChip(ctx, icon, {
        x: panel.x + panel.width - 164,
        y: metaY - 4,
        width: 108,
        height: 52,
        accent
      });
    }
    y += 16;
  }

  if (title) {
    const fittedTitleSize = fitFontSize(ctx, title, maxTextWidth, titleMaxLines, titleSize, titleMinSize, 760);
    ctx.font = `760 ${fittedTitleSize}px ${DEFAULT_FONT}`;
    ctx.fillStyle = textColor;
    wrapParagraphs(ctx, title, maxTextWidth, titleMaxLines).forEach((line) => {
      ctx.fillText(line, left, y);
      y += fittedTitleSize + 11;
    });
    y += 12;
  }

  if (body) {
    const fittedBodySize = fitFontSize(ctx, body, maxTextWidth, bodyMaxLines, bodySize, bodyMinSize, 520);
    ctx.font = `520 ${fittedBodySize}px ${DEFAULT_FONT}`;
    ctx.fillStyle = textColor;
    wrapParagraphs(ctx, body, maxTextWidth, bodyMaxLines).forEach((line) => {
      ctx.fillText(line, left, y);
      y += fittedBodySize + 10;
    });
  }

  if (progress) {
    drawProgress(ctx, progress, {
      x: panel.x + 58,
      y: panel.y + panel.height - (footer ? 112 : 74),
      width: panel.width - 116,
      accent,
      mutedColor,
      trackColor: hexToRgba(border, 0.22)
    });
  }

  if (footer) {
    const fittedFooterSize = fitFontSize(ctx, footer, maxTextWidth, footerMaxLines, footerSize, footerMinSize, 700);
    ctx.font = `700 ${fittedFooterSize}px ${DEFAULT_FONT}`;
    ctx.fillStyle = accent;
    let footerY = panel.y + panel.height - 42 - (footerMaxLines - 1) * (fittedFooterSize + 7);
    wrapParagraphs(ctx, footer, maxTextWidth, footerMaxLines).forEach((line) => {
      ctx.fillText(line, left, footerY);
      footerY += fittedFooterSize + 7;
    });
  }

  return canvas.toDataURL('image/png');
}

function createChoiceTexture(options) {
  const {
    width = 1200,
    height = 190,
    title = '',
    choiceNumber = '',
    status = 'idle',
    accent = '#2563eb',
    textColor = '#162a3f',
    titleMaxLines = 3,
    tokens = {}
  } = options;
  const design = {...DEFAULT_TOKENS, ...tokens};
  const statusStyle = getChoiceStatusStyle(status, design, accent);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, width, height);

  const card = {x: 18, y: 18, width: width - 36, height: height - 36};
  ctx.save();
  ctx.shadowColor = status === 'idle' ? 'rgba(0, 0, 0, 0.48)' : hexToRgba(statusStyle.border, 0.30);
  ctx.shadowBlur = status === 'idle' ? 20 : 30;
  ctx.shadowOffsetY = 10;
  ctx.fillStyle = 'rgba(3, 8, 17, 0.72)';
  roundRect(ctx, card.x, card.y, card.width, card.height, 30);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = statusStyle.fill;
  roundRect(ctx, card.x, card.y, card.width, card.height, 26);
  ctx.fill();
  ctx.lineWidth = status === 'idle' ? 2 : 3.5;
  ctx.strokeStyle = statusStyle.border;
  ctx.stroke();

  const accentRailWidth = status === 'idle' ? 7 : 10;
  ctx.fillStyle = hexToRgba(statusStyle.badgeText || statusStyle.border, status === 'idle' ? 0.34 : 0.72);
  roundRect(ctx, card.x + 10, card.y + 28, accentRailWidth, card.height - 56, accentRailWidth / 2);
  ctx.fill();

  const badgeWidth = height > 240 ? 72 : 76;
  const badge = {x: card.x + 40, y: card.y + 36, width: badgeWidth, height: card.height - 72};
  ctx.fillStyle = statusStyle.badgeFill;
  roundRect(ctx, badge.x, badge.y, badge.width, badge.height, 24);
  ctx.fill();
  ctx.fillStyle = statusStyle.badgeText;
  ctx.font = `760 30px ${DEFAULT_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(choiceNumber || ''), badge.x + badge.width / 2, badge.y + badge.height / 2 + 1);

  const labelX = card.x + badgeWidth + 74;
  const iconReserve = statusStyle.icon ? 96 : 34;
  const labelWidth = card.width - badgeWidth - iconReserve - 108;
  const fitted = fitFontSize(ctx, title, labelWidth, titleMaxLines, 31, 21, 660);
  ctx.font = `660 ${fitted}px ${DEFAULT_FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = textColor;
  let y = card.y + (height > 240 ? 58 : 47);
  wrapParagraphs(ctx, title, labelWidth, titleMaxLines).forEach((line) => {
    ctx.fillText(line, labelX, y);
    y += fitted + 8;
  });

  if (statusStyle.icon) {
    ctx.fillStyle = statusStyle.iconFill;
    roundRect(ctx, card.x + card.width - 86, card.y + 44, 52, 52, 26);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = `800 30px ${DEFAULT_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(statusStyle.icon, card.x + card.width - 60, card.y + 71);
  }

  if (statusStyle.statusLabel) {
    ctx.font = `700 19px ${DEFAULT_FONT}`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = statusStyle.border;
    ctx.fillText(statusStyle.statusLabel, card.x + card.width - 112, card.y + card.height - 36);
  }

  return canvas.toDataURL('image/png');
}

function createButtonTexture(options) {
  const {
    width = 500,
    height = 180,
    background = '#12263f',
    border = '#6fbbe7',
    accent = '#8b5cf6',
    title = '',
    textColor = '#ffffff',
    titleSize = 32,
    tokens = {}
  } = options;
  const design = {...DEFAULT_TOKENS, ...tokens};
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, width, height);

  const card = {x: 18, y: 20, width: width - 36, height: height - 40};
  drawSoftShadow(ctx, card, 26, hexToRgba(design.navy, 0.22));
  ctx.fillStyle = background;
  roundRect(ctx, card.x, card.y, card.width, card.height, 30);
  ctx.fill();
  ctx.strokeStyle = hexToRgba(border, 0.72);
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.font = `760 ${titleSize}px ${DEFAULT_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = textColor;
  ctx.fillText(title, width / 2, height / 2 + 1);
  return canvas.toDataURL('image/png');
}

function createStationTexture(options) {
  const {
    width = 900,
    height = 560,
    accent = '#2563eb',
    title = '',
    subtitle = '',
    body = '',
    footer = '',
    icon = '',
    focused = false,
    progress = null,
    bodyMaxLines = 3,
    tokens = {}
  } = options;
  const design = {...DEFAULT_TOKENS, ...tokens};
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, width, height);

  const card = {x: 18, y: 18, width: width - 36, height: height - 36};
  const fill = focused ? mixHex(accent, '#06111f', 0.58) : mixHex(accent, '#06111f', 0.82);
  const ink = '#f8fbff';
  const muted = focused ? 'rgba(255, 255, 255, 0.86)' : 'rgba(220, 235, 248, 0.76)';

  ctx.save();
  ctx.shadowColor = focused ? hexToRgba(accent, 0.46) : 'rgba(0, 0, 0, 0.46)';
  ctx.shadowBlur = focused ? 36 : 24;
  ctx.shadowOffsetY = focused ? 12 : 10;
  ctx.fillStyle = 'rgba(5, 13, 25, 0.82)';
  roundRect(ctx, card.x, card.y, card.width, card.height, 38);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = fill;
  roundRect(ctx, card.x, card.y, card.width, card.height, 38);
  ctx.fill();
  ctx.lineWidth = focused ? 4 : 2;
  ctx.strokeStyle = focused ? hexToRgba('#ffffff', 0.74) : hexToRgba(accent, 0.54);
  ctx.stroke();

  const chipLabel = String(icon || 'AI');
  const chipMaxWidth = Math.min(card.width - 132, 318);
  let chipFontSize = 24;
  ctx.font = `800 ${chipFontSize}px ${DEFAULT_FONT}`;
  while (chipFontSize > 15 && ctx.measureText(chipLabel).width > chipMaxWidth - 48) {
    chipFontSize -= 1;
    ctx.font = `800 ${chipFontSize}px ${DEFAULT_FONT}`;
  }
  const chipWidth = Math.min(chipMaxWidth, Math.max(118, ctx.measureText(chipLabel).width + 48));
  ctx.fillStyle = focused ? 'rgba(255, 255, 255, 0.20)' : hexToRgba(accent, 0.16);
  roundRect(ctx, card.x + 44, card.y + 44, chipWidth, 64, 32);
  ctx.fill();
  ctx.strokeStyle = focused ? 'rgba(255,255,255,0.38)' : hexToRgba(accent, 0.32);
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = focused ? '#ffffff' : accent;
  ctx.font = `800 ${chipFontSize}px ${DEFAULT_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(chipLabel, card.x + 44 + chipWidth / 2, card.y + 77);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const hasSubtitle = Boolean(String(subtitle || '').trim());
  if (hasSubtitle) {
    ctx.font = `740 25px ${DEFAULT_FONT}`;
    ctx.fillStyle = muted;
    ctx.fillText(subtitle, card.x + 62, card.y + 132);
  }

  const titleSize = fitFontSize(ctx, title, card.width - 96, 2, 62, 42, 780);
  ctx.font = `780 ${titleSize}px ${DEFAULT_FONT}`;
  ctx.fillStyle = ink;
  let y = card.y + (hasSubtitle ? 172 : 134);
  wrapParagraphs(ctx, title, card.width - 96, 2).forEach((line) => {
    ctx.fillText(line, card.x + 62, y);
    y += titleSize + 10;
  });

  ctx.font = `620 31px ${DEFAULT_FONT}`;
  ctx.fillStyle = muted;
  const bodyStartY = card.y + (hasSubtitle ? 318 : 286);
  wrapParagraphs(ctx, body, card.width - 118, bodyMaxLines).forEach((line, index) => {
    ctx.fillText(line, card.x + 62, bodyStartY + index * 42);
  });

  if (progress) {
    drawProgress(ctx, progress, {
      x: card.x + 48,
      y: card.y + card.height - 84,
      width: card.width - 96,
      accent: focused ? '#ffffff' : accent,
      mutedColor: muted,
      trackColor: focused ? 'rgba(255, 255, 255, 0.25)' : 'rgba(15, 36, 56, 0.14)',
      compact: true
    });
  }

  ctx.textAlign = 'right';
  ctx.font = `760 31px ${DEFAULT_FONT}`;
  ctx.fillStyle = focused ? '#ffffff' : hexToRgba(accent, 0.96);
  ctx.fillText(footer, card.x + card.width - 48, card.y + card.height - 56);

  return canvas.toDataURL('image/png');
}

function createReportGridTexture(options) {
  const {
    width = 1280,
    height = 720,
    accent = '#38bdf8',
    title = '결과 리포트',
    subtitle = 'REPORT',
    overall = {},
    domains = [],
    footer = '',
    tokens = {}
  } = options;
  const design = {...DEFAULT_TOKENS, ...tokens};
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, width, height);

  const panel = {x: 18, y: 18, width: width - 36, height: height - 36};
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.48)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 10;
  ctx.fillStyle = 'rgba(5, 13, 25, 0.82)';
  roundRect(ctx, panel.x, panel.y, panel.width, panel.height, 38);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = mixHex(accent, '#06111f', 0.82);
  roundRect(ctx, panel.x, panel.y, panel.width, panel.height, 38);
  ctx.fill();
  ctx.strokeStyle = hexToRgba(accent, 0.56);
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = hexToRgba(accent, 0.16);
  roundRect(ctx, panel.x + 44, panel.y + 42, 126, 52, 26);
  ctx.fill();
  ctx.strokeStyle = hexToRgba(accent, 0.34);
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = accent;
  ctx.font = `800 21px ${DEFAULT_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(subtitle || 'REPORT'), panel.x + 107, panel.y + 68);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#f8fbff';
  const fittedTitle = fitFontSize(ctx, title, panel.width - 128, 1, 50, 36, 780);
  ctx.font = `780 ${fittedTitle}px ${DEFAULT_FONT}`;
  ctx.fillText(title, panel.x + 44, panel.y + 112);

  const summary = `전체 ${overall.answered ?? 0}/${overall.total ?? 0} · 정답 ${overall.correct ?? 0} · 정답률 ${overall.accuracy ?? 0}%`;
  ctx.font = `720 27px ${DEFAULT_FONT}`;
  ctx.fillStyle = 'rgba(220, 235, 248, 0.86)';
  ctx.fillText(summary, panel.x + 44, panel.y + 178);

  const cardW = (panel.width - 126) / 2;
  const cardH = 154;
  const startX = panel.x + 44;
  const startY = panel.y + 242;
  const gapX = 38;
  const gapY = 30;
  domains.slice(0, 4).forEach((domain, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = startX + col * (cardW + gapX);
    const y = startY + row * (cardH + gapY);
    const domainAccent = domain.accent || accent;
    const answered = Number(domain.answered || 0);
    const total = Math.max(0, Number(domain.total || 0));
    const progressValue = total ? answered / total : 0;

    ctx.fillStyle = hexToRgba(domainAccent, 0.12);
    roundRect(ctx, x, y, cardW, cardH, 26);
    ctx.fill();
    ctx.strokeStyle = hexToRgba(domainAccent, 0.56);
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = domainAccent;
    roundRect(ctx, x + 28, y + 28, 8, 64, 4);
    ctx.fill();

    ctx.fillStyle = 'rgba(220, 235, 248, 0.72)';
    ctx.font = `760 20px ${DEFAULT_FONT}`;
    ctx.fillText(domain.label || '', x + 54, y + 26);

    ctx.fillStyle = '#f8fbff';
    const titleSize = fitFontSize(ctx, domain.title || '', cardW - 92, 1, 32, 24, 760);
    ctx.font = `760 ${titleSize}px ${DEFAULT_FONT}`;
    ctx.fillText(domain.title || '', x + 54, y + 58);

    ctx.fillStyle = 'rgba(220, 235, 248, 0.86)';
    ctx.font = `680 22px ${DEFAULT_FONT}`;
    ctx.fillText(`${answered}/${total} 완료 · 정답률 ${domain.accuracy ?? 0}%`, x + 54, y + 99);

    drawProgress(ctx, {value: progressValue, label: ''}, {
      x: x + 54,
      y: y + cardH - 28,
      width: cardW - 96,
      accent: domainAccent,
      mutedColor: 'rgba(220, 235, 248, 0.78)',
      trackColor: 'rgba(220, 235, 248, 0.14)',
      compact: true
    });
  });

  if (footer) {
    ctx.textAlign = 'right';
    ctx.font = `720 22px ${DEFAULT_FONT}`;
    ctx.fillStyle = accent;
    ctx.fillText(footer, panel.x + panel.width - 44, panel.y + panel.height - 40);
  }

  return canvas.toDataURL('image/png');
}

function createStatTexture(options) {
  const {
    width = 420,
    height = 220,
    title = '',
    subtitle = '',
    body = '',
    footer = '',
    accent = '#2563eb',
    background = '#f8fbff',
    border = '#c9d8e6',
    textColor = '#14283d',
    mutedColor = '#60758a',
    progress = null,
    tokens = {}
  } = options;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, width, height);
  const design = {...DEFAULT_TOKENS, ...tokens};
  const card = {x: 16, y: 16, width: width - 32, height: height - 32};
  drawElevatedPanel(ctx, card, {
    radius: 30,
    background,
    border,
    accent,
    glass: true,
    shadow: hexToRgba(design.navy, 0.14),
    panelStyle: design.panelStyle
  });

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const contentX = card.x + 60;
  const contentWidth = card.width - 88;
  if (height < 150) {
    ctx.font = `760 21px ${DEFAULT_FONT}`;
    ctx.fillStyle = textColor;
    wrapParagraphs(ctx, title, contentWidth, 1).forEach((line) => ctx.fillText(line, contentX, card.y + 24));
    if (progress) {
      drawProgress(ctx, progress, {
        x: contentX,
        y: card.y + card.height - 28,
        width: contentWidth,
        accent,
        mutedColor,
        trackColor: hexToRgba(border, 0.28),
        compact: true
      });
    }
    return canvas.toDataURL('image/png');
  }

  ctx.font = `700 22px ${DEFAULT_FONT}`;
  ctx.fillStyle = mutedColor;
  ctx.fillText(subtitle, contentX, card.y + 26);
  ctx.font = `760 34px ${DEFAULT_FONT}`;
  ctx.fillStyle = textColor;
  wrapParagraphs(ctx, title, contentWidth, 1).forEach((line) => ctx.fillText(line, contentX, card.y + 58));
  ctx.font = `620 24px ${DEFAULT_FONT}`;
  ctx.fillStyle = textColor;
  wrapParagraphs(ctx, body, contentWidth, 2).forEach((line, index) => ctx.fillText(line, contentX, card.y + 104 + index * 32));

  if (progress) {
    drawProgress(ctx, progress, {
      x: contentX,
      y: card.y + card.height - 52,
      width: contentWidth,
      accent,
      mutedColor,
      trackColor: hexToRgba(border, 0.28),
      compact: true
    });
  } else if (footer) {
    ctx.font = `700 20px ${DEFAULT_FONT}`;
    ctx.fillStyle = accent;
    ctx.fillText(footer, contentX, card.y + card.height - 44);
  }

  return canvas.toDataURL('image/png');
}

function createStudioHeaderTexture(options) {
  const {
    width = 1100,
    height = 210,
    background = '#fbfdff',
    border = '#c9d8e6',
    accent = '#62c6f2',
    title = 'AI Literacy Studio',
    subtitle = '',
    body = '',
    footer = '',
    progress = null,
    textColor = '#14283d',
    mutedColor = '#60758a',
    tokens = {}
  } = options;
  const design = {...DEFAULT_TOKENS, ...tokens};
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, width, height);

  const card = {x: 18, y: 18, width: width - 36, height: height - 36};
  const scale = Math.min(width / 920, height / 560);
  const s = (value) => value * scale;
  drawSoftShadow(ctx, card, 30, hexToRgba(design.navy, 0.12));
  ctx.fillStyle = background;
  roundRect(ctx, card.x, card.y, card.width, card.height, 30);
  ctx.fill();
  ctx.strokeStyle = hexToRgba(border, 0.78);
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = accent;
  roundRect(ctx, card.x + s(32), card.y + s(34), s(7), card.height - s(68), s(4));
  ctx.fill();

  const left = card.x + s(66);
  const right = card.x + card.width - s(42);
  const hasProgress = Boolean(progress);
  const percent = Math.max(0, Math.min(1, progress?.value || 0));
  const label = progress?.label || `${Math.round(percent * 100)}%`;

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = `760 ${Math.round(s(34))}px ${DEFAULT_FONT}`;
  ctx.fillStyle = textColor;
  ctx.fillText(title, left, card.y + s(34));

  if (subtitle) {
    ctx.font = `680 ${Math.round(s(21))}px ${DEFAULT_FONT}`;
    ctx.fillStyle = mutedColor;
    ctx.fillText(subtitle, left, card.y + s(76));
  }

  ctx.font = `620 ${Math.round(s(20))}px ${DEFAULT_FONT}`;
  ctx.fillStyle = mutedColor;
  wrapParagraphs(ctx, body, Math.max(80, right - left - s(32)), 2).forEach((line, index) => {
    ctx.fillText(line, left, card.y + s(108) + index * s(28));
  });

  ctx.textAlign = 'right';
  if (hasProgress) {
    ctx.font = `760 ${Math.round(s(27))}px ${DEFAULT_FONT}`;
    ctx.fillStyle = textColor;
    ctx.fillText(label, right, card.y + s(35));
    ctx.font = `700 ${Math.round(s(17))}px ${DEFAULT_FONT}`;
    ctx.fillStyle = mutedColor;
    ctx.fillText(footer, right, card.y + s(76));

    drawProgress(ctx, {value: percent, label: ''}, {
      x: left,
      y: card.y + card.height - s(38),
      width: card.width - s(106),
      accent,
      mutedColor,
      trackColor: hexToRgba(border, 0.25),
      compact: true
    });
  } else if (footer) {
    ctx.font = `700 ${Math.round(s(21))}px ${DEFAULT_FONT}`;
    ctx.fillStyle = mutedColor;
    ctx.fillText(footer, right, card.y + s(48));
  }

  return canvas.toDataURL('image/png');
}

export function applyTexture(entity, options) {
  entity.setAttribute('material', {
    shader: 'flat',
    src: createTextTexture(options),
    transparent: true,
    side: 'double'
  });
  tuneTextureForReadableText(entity);
}

export function createPlane({id, width, height, className = '', position = '0 0 0', rotation = '0 0 0'}) {
  const plane = document.createElement('a-plane');
  if (id) plane.id = id;
  plane.setAttribute('width', width);
  plane.setAttribute('height', height);
  plane.setAttribute('position', position);
  plane.setAttribute('rotation', rotation);
  if (className) plane.setAttribute('class', className);
  return plane;
}

function tuneTextureForReadableText(entity) {
  const tune = () => {
    const THREE = window.AFRAME?.THREE || window.THREE;
    const scene = entity.sceneEl;
    const renderer = scene?.renderer;
    const mesh = entity.getObject3D?.('mesh');
    const material = Array.isArray(mesh?.material) ? mesh.material[0] : mesh?.material;
    const texture = material?.map;
    if (!THREE || !texture) return false;

    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    if (renderer?.capabilities?.getMaxAnisotropy) {
      texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    }
    texture.needsUpdate = true;
    return true;
  };

  if (!tune()) {
    window.requestAnimationFrame(() => {
      if (!tune()) window.setTimeout(tune, 60);
    });
  }
  entity.addEventListener('materialtextureloaded', tune, {once: true});
}

function drawElevatedPanel(ctx, rect, style) {
  const {radius, background, border, accent, glass, shadow} = style;
  const darkSurface = isDarkColor(background);
  drawSoftShadow(ctx, rect, radius, shadow || 'rgba(15, 35, 58, 0.16)');

  ctx.fillStyle = glass ? mixHex(background, '#ffffff', 0.34) : background;
  roundRect(ctx, rect.x, rect.y, rect.width, rect.height, radius);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = hexToRgba(border, 0.72);
  ctx.stroke();

  ctx.strokeStyle = darkSurface ? 'rgba(255, 255, 255, 0.14)' : 'rgba(255, 255, 255, 0.56)';
  ctx.lineWidth = 2;
  roundRect(ctx, rect.x + 10, rect.y + 10, rect.width - 20, rect.height - 20, Math.max(8, radius - 9));
  ctx.stroke();

}

function drawSoftShadow(ctx, rect, radius, color) {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 32;
  ctx.shadowOffsetY = 16;
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  roundRect(ctx, rect.x, rect.y, rect.width, rect.height, radius);
  ctx.fill();
  ctx.restore();
}

function drawIconChip(ctx, icon, {x, y, width, height, accent}) {
  ctx.save();
  ctx.fillStyle = hexToRgba(accent, 0.14);
  roundRect(ctx, x, y, width, height, 24);
  ctx.fill();
  ctx.strokeStyle = hexToRgba(accent, 0.36);
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = accent;
  ctx.font = `760 20px ${DEFAULT_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(icon, x + width / 2, y + height / 2 + 1);
  ctx.restore();
}

function drawChips(ctx, chips, {x, y, chipSize, accent, border, mutedColor, maxRight}) {
  ctx.save();
  let chipX = x;
  ctx.textAlign = 'left';
  ctx.font = `700 ${chipSize}px ${DEFAULT_FONT}`;
  chips.forEach((chip) => {
    const chipWidth = Math.min(ctx.measureText(chip).width + 34, maxRight - chipX);
    if (chipWidth < 48) return;
    ctx.fillStyle = hexToRgba(accent, 0.10);
    roundRect(ctx, chipX, y, chipWidth, chipSize + 22, (chipSize + 22) / 2);
    ctx.fill();
    ctx.strokeStyle = hexToRgba(border, 0.45);
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = mutedColor;
    ctx.fillText(chip, chipX + 17, y + 10);
    chipX += chipWidth + 12;
  });
  ctx.restore();
}

function drawProgress(ctx, progress, {x, y, width, accent, mutedColor, trackColor, compact = false}) {
  ctx.save();
  const percent = Math.max(0, Math.min(1, progress.value || 0));
  const height = compact ? 10 : 14;
  const label = progress.label !== undefined ? progress.label : `${Math.round(percent * 100)}%`;
  ctx.fillStyle = trackColor || 'rgba(110, 132, 154, 0.20)';
  roundRect(ctx, x, y, width, height, height / 2);
  ctx.fill();
  ctx.fillStyle = accent;
  roundRect(ctx, x, y, Math.max(height, width * percent), height, height / 2);
  ctx.fill();

  if (label && !compact) {
    ctx.font = `700 22px ${DEFAULT_FONT}`;
    ctx.fillStyle = mutedColor;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + width, y - 16);
  }
  ctx.restore();
}

function getChoiceStatusStyle(status, design, accent = '#2563eb') {
  const styles = {
    idle: {
      fill: 'rgba(6, 17, 31, 0.94)',
      border: hexToRgba(accent, 0.38),
      badgeFill: hexToRgba(accent, 0.16),
      badgeText: '#dff6ff'
    },
    hover: {
      fill: 'rgba(9, 26, 45, 0.98)',
      border: hexToRgba(accent, 0.86),
      badgeFill: hexToRgba(accent, 0.28),
      badgeText: '#ffffff'
    },
    selected: {
      fill: 'rgba(15, 35, 58, 0.98)',
      border: hexToRgba(accent, 0.92),
      badgeFill: hexToRgba(accent, 0.36),
      badgeText: '#ffffff',
      statusLabel: '선택함'
    },
    correct: {
      fill: 'rgba(6, 32, 22, 0.98)',
      border: hexToRgba(design.success, 0.78),
      badgeFill: hexToRgba(design.success, 0.24),
      badgeText: '#eafff4',
      iconFill: design.success,
      icon: '✓',
      statusLabel: '정답'
    },
    wrong: {
      fill: 'rgba(38, 11, 18, 0.98)',
      border: hexToRgba(design.danger, 0.76),
      badgeFill: hexToRgba(design.danger, 0.24),
      badgeText: '#fff0f2',
      iconFill: design.danger,
      icon: '×',
      statusLabel: '오답'
    }
  };
  return styles[status] || styles.idle;
}

function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function hexToRgb(hex) {
  const normalized = String(hex || '#000000').replace('#', '');
  const value = normalized.length === 3
    ? normalized.split('').map((char) => char + char).join('')
    : normalized.slice(0, 6);
  const intValue = Number.parseInt(value, 16);
  if (Number.isNaN(intValue)) return {r: 0, g: 0, b: 0};
  return {
    r: (intValue >> 16) & 255,
    g: (intValue >> 8) & 255,
    b: intValue & 255
  };
}

function hexToRgba(hex, alpha) {
  if (String(hex || '').startsWith('rgba')) return hex;
  const {r, g, b} = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function isDarkColor(color) {
  if (!String(color || '').trim().startsWith('#')) return false;
  const {r, g, b} = hexToRgb(color);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) < 80;
}

function mixHex(hexA, hexB, amount) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const mix = (from, to) => Math.round(from + (to - from) * amount);
  return `rgb(${mix(a.r, b.r)}, ${mix(a.g, b.g)}, ${mix(a.b, b.b)})`;
}
