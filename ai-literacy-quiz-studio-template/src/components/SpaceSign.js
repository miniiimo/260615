import {applyTexture, createPlane} from './canvasTexture.js?v=20260510-inplacegrid1';

export function createSpaceSign({id, title, subtitle, body, accent = '#2563eb', position = '0 1.95 -2.2', rotation = '0 0 0'}) {
  const sign = createPlane({id, width: 2.65, height: 0.72, position, rotation});
  applyTexture(sign, {
    width: 1300,
    height: 390,
    background: '#fbfdff',
    border: '#c9d8e6',
    accent,
    subtitle,
    title,
    body,
    icon: 'SPACE',
    glass: true,
    titleSize: 44,
    titleMaxLines: 1,
    bodySize: 24,
    bodyMaxLines: 2,
    subtitleSize: 24
  });
  return sign;
}
