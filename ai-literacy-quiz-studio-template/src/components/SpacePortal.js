import {applyTexture, createPlane} from './canvasTexture.js?v=20260510-inplacegrid1';
import {bindHoverEffect, bindInteractiveAction} from '../utils/interaction.js?v=20260510-inplacegrid1';

export function createSpacePortal({
  id,
  title,
  shortTitle,
  subtitle,
  description,
  tooltip,
  accent = '#2563eb',
  position,
  rotation = '0 0 0',
  onSelect
}) {
  const portal = document.createElement('a-entity');
  portal.id = `portal-${id}`;
  portal.dataset.spaceId = id;
  portal.setAttribute('position', position);
  portal.setAttribute('rotation', rotation);

  const pedestal = document.createElement('a-cylinder');
  pedestal.setAttribute('radius', id === 'report' || id === 'survey' ? '0.46' : '0.62');
  pedestal.setAttribute('height', '0.028');
  pedestal.setAttribute('segments-radial', '48');
  pedestal.setAttribute('position', '0 -0.62 0');
  pedestal.setAttribute('material', `shader: flat; color: ${accent}; opacity: 0.18; transparent: true; side: double`);

  const leftBeam = document.createElement('a-box');
  leftBeam.setAttribute('width', '0.045');
  leftBeam.setAttribute('height', id === 'report' || id === 'survey' ? '0.88' : '1.22');
  leftBeam.setAttribute('depth', '0.045');
  leftBeam.setAttribute('position', id === 'report' || id === 'survey' ? '-0.45 -0.1 0' : '-0.64 0.06 0');
  leftBeam.setAttribute('material', `color: ${accent}; opacity: 0.78; transparent: true; roughness: 0.36`);

  const rightBeam = document.createElement('a-box');
  rightBeam.setAttribute('width', '0.045');
  rightBeam.setAttribute('height', id === 'report' || id === 'survey' ? '0.88' : '1.22');
  rightBeam.setAttribute('depth', '0.045');
  rightBeam.setAttribute('position', id === 'report' || id === 'survey' ? '0.45 -0.1 0' : '0.64 0.06 0');
  rightBeam.setAttribute('material', `color: ${accent}; opacity: 0.78; transparent: true; roughness: 0.36`);

  const topBeam = document.createElement('a-box');
  topBeam.setAttribute('width', id === 'report' || id === 'survey' ? '0.96' : '1.38');
  topBeam.setAttribute('height', '0.05');
  topBeam.setAttribute('depth', '0.05');
  topBeam.setAttribute('position', id === 'report' || id === 'survey' ? '0 0.35 0' : '0 0.7 0');
  topBeam.setAttribute('material', `color: ${accent}; opacity: 0.82; transparent: true; roughness: 0.34`);

  const label = createPlane({
    width: id === 'report' || id === 'survey' ? 0.82 : 1.08,
    height: 0.24,
    position: id === 'report' || id === 'survey' ? '0 0.62 0.08' : '0 1.0 0.08'
  });
  applyTexture(label, {
    variant: 'button',
    width: 640,
    height: 160,
    background: '#fbfdff',
    border: accent,
    accent,
    title: shortTitle || title,
    textColor: '#10263b',
    align: 'center',
    titleSize: 27,
    titleMaxLines: 1,
    glass: false
  });

  const tooltipPanel = createPlane({
    width: 1.3,
    height: 0.46,
    position: '0 1.42 0.12'
  });
  tooltipPanel.setAttribute('visible', false);
  if (tooltipPanel.object3D) tooltipPanel.object3D.visible = false;
  applyTexture(tooltipPanel, {
    width: 820,
    height: 300,
    background: '#ffffff',
    border: '#d7e2ec',
    accent,
    subtitle: subtitle || '이동 지점',
    title: title || shortTitle,
    body: tooltip || description || '선택하면 이동합니다.',
    footer: '선택해서 이동',
    textColor: '#10263b',
    mutedColor: '#4f6478',
    glass: false,
    titleSize: 28,
    bodySize: 20,
    bodyMaxLines: 2,
    subtitleSize: 17,
    footerSize: 17
  });

  const hotspot = createPlane({
    width: id === 'report' || id === 'survey' ? 1.1 : 1.55,
    height: id === 'report' || id === 'survey' ? 1.1 : 1.65,
    className: 'interactive space-portal',
    position: '0 0.12 0.16'
  });
  hotspot.setAttribute('material', 'shader: flat; color: #ffffff; opacity: 0.001; transparent: true; depthWrite: false');

  bindInteractiveAction(hotspot, () => onSelect(id));
  bindHoverEffect(hotspot, {
    activeScale: '1.03 1.03 1',
    onEnter: () => {
      if (tooltipPanel.object3D) tooltipPanel.object3D.visible = true;
      tooltipPanel.setAttribute('visible', true);
      label.setAttribute('animation__hover', 'property: scale; to: 1.05 1.05 1; dur: 120; easing: easeOutQuad');
    },
    onLeave: () => {
      if (tooltipPanel.object3D) tooltipPanel.object3D.visible = false;
      tooltipPanel.setAttribute('visible', false);
      label.setAttribute('animation__hover', 'property: scale; to: 1 1 1; dur: 120; easing: easeOutQuad');
    }
  });

  portal.append(pedestal, leftBeam, rightBeam, topBeam, label, tooltipPanel, hotspot);
  return portal;
}
