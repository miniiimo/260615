let registered = false;

export function registerGalaxyFloorComponent() {
  if (registered || !window.AFRAME) return;
  registered = true;

  AFRAME.registerComponent('galaxy-floor', {
    schema: {
      count: {type: 'int', default: 9000},
      radius: {type: 'number', default: 5.6},
      branches: {type: 'int', default: 5},
      speed: {type: 'number', default: 0.075},
      size: {type: 'number', default: 0.042},
      maxPointSize: {type: 'number', default: 18},
      opacity: {type: 'number', default: 0.9},
      coreStrength: {type: 'number', default: 0.32},
      coreGlow: {type: 'number', default: 1},
      pointCore: {type: 'number', default: 0.38},
      thickness: {type: 'number', default: 0.026},
      swirl: {type: 'number', default: 2.65},
      colorInside: {type: 'color', default: '#ffb06f'},
      colorMid: {type: 'color', default: '#f4a0d8'},
      colorOutside: {type: 'color', default: '#311599'}
    },

    init() {
      const THREE = window.AFRAME.THREE || window.THREE;
      this.THREE = THREE;
      this.seed = seededRandom(20260509);
      this.particles = [];

      const count = Math.max(1, this.data.count);
      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);
      const sizes = new Float32Array(count);
      const alphas = new Float32Array(count);
      const inside = new THREE.Color(this.data.colorInside);
      const mid = new THREE.Color(this.data.colorMid);
      const outside = new THREE.Color(this.data.colorOutside);
      const whiteHot = new THREE.Color('#fff7e8');

      for (let index = 0; index < count; index += 1) {
        const isCore = this.seed() < this.data.coreStrength;
        const ratio = isCore
          ? Math.pow(this.seed(), 2.55) * 0.34
          : Math.pow(this.seed(), 0.58);
        const radius = Math.max(0.012, ratio * this.data.radius);
        const branch = Math.floor(this.seed() * this.data.branches);
        const branchAngle = branch * Math.PI * 2 / this.data.branches;
        const diffuse = this.seed() < 0.34 || ratio < 0.16;
        const armNoise = gaussian(this.seed) * (0.18 + ratio * 0.62);
        const diffuseNoise = gaussian(this.seed) * 0.18;
        const baseAngle = diffuse
          ? this.seed() * Math.PI * 2 + ratio * this.data.swirl * 0.45 + diffuseNoise
          : branchAngle + ratio * this.data.swirl + armNoise;
        const vertical = gaussian(this.seed) * this.data.thickness * (0.35 + ratio * 0.9);
        const drift = 0.58 + this.seed() * 0.92;
        const phase = this.seed() * Math.PI * 2;

        this.particles.push({ratio, radius, baseAngle, vertical, drift, phase});
        writePosition(positions, index, radius, baseAngle, vertical);

        const color = getGalaxyColor(THREE, ratio, inside, mid, outside, whiteHot, this.seed(), this.data.coreGlow);
        colors[index * 3] = color.r;
        colors[index * 3 + 1] = color.g;
        colors[index * 3 + 2] = color.b;

        const coreBoost = Math.max(0, 1 - ratio / 0.24) * this.data.coreGlow;
        sizes[index] = this.data.size * (0.72 + this.seed() * 1.65 + coreBoost * 2.15);
        alphas[index] = this.data.opacity * (0.38 + this.seed() * 0.48 + coreBoost * 0.42);
      }

      this.geometry = new THREE.BufferGeometry();
      this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      this.geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
      this.geometry.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));

      this.material = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uPixelRatio: {value: Math.min(window.devicePixelRatio || 1, 2)},
          uPointCore: {value: this.data.pointCore},
          uMaxPointSize: {value: this.data.maxPointSize}
        },
        vertexShader: `
          uniform float uPixelRatio;
          uniform float uPointCore;
          uniform float uMaxPointSize;
          attribute float aSize;
          attribute float aAlpha;
          varying vec3 vColor;
          varying float vAlpha;

          void main() {
            vec4 modelPosition = modelMatrix * vec4(position, 1.0);
            vec4 viewPosition = viewMatrix * modelPosition;
            vec4 projectedPosition = projectionMatrix * viewPosition;
            gl_Position = projectedPosition;

            float perspective = 110.0 / max(0.38, -viewPosition.z);
            gl_PointSize = clamp(aSize * perspective * uPixelRatio, 1.0, uMaxPointSize);
            vColor = color;
            vAlpha = aAlpha;
          }
        `,
        fragmentShader: `
          uniform float uPointCore;
          varying vec3 vColor;
          varying float vAlpha;

          void main() {
            vec2 uv = gl_PointCoord - vec2(0.5);
            float distanceToCenter = length(uv);
            float glow = smoothstep(0.5, 0.0, distanceToCenter);
            glow = pow(glow, 1.45);
            float core = smoothstep(0.18, 0.0, distanceToCenter) * uPointCore;
            float alpha = (glow + core) * vAlpha;
            if (alpha < 0.012) discard;
            gl_FragColor = vec4(vColor + core, alpha);
          }
        `
      });

      this.points = new THREE.Points(this.geometry, this.material);
      this.points.frustumCulled = false;
      this.el.setObject3D('mesh', this.points);
    },

    tick(time) {
      if (!this.geometry) return;
      const seconds = (time || 0) / 1000;
      const positions = this.geometry.attributes.position.array;

      this.particles.forEach((particle, index) => {
        const localSpeed = this.data.speed * (1.18 - particle.ratio * 0.42) * particle.drift;
        const flow = seconds * localSpeed;
        const breathe = Math.sin(seconds * 0.72 + particle.phase) * 0.035 * (1 - particle.ratio * 0.35);
        const radius = particle.radius + breathe;
        const angle = particle.baseAngle + flow;
        const vertical = particle.vertical + Math.sin(seconds * 1.08 + particle.phase) * 0.004;
        writePosition(positions, index, radius, angle, vertical);
      });

      this.geometry.attributes.position.needsUpdate = true;
    },

    remove() {
      if (this.points) this.el.removeObject3D('mesh');
      this.geometry?.dispose();
      this.material?.dispose();
    }
  });
}

function writePosition(positions, index, radius, angle, vertical) {
  positions[index * 3] = Math.cos(angle) * radius;
  positions[index * 3 + 1] = 0.028 + vertical;
  positions[index * 3 + 2] = Math.sin(angle) * radius;
}

function getGalaxyColor(THREE, ratio, inside, mid, outside, whiteHot, noise, coreGlow = 1) {
  if (coreGlow > 0 && ratio < 0.18) {
    return whiteHot.clone().lerp(inside, ratio / 0.18).lerp(mid, noise * 0.16);
  }

  if (ratio < 0.54) {
    return inside.clone().lerp(mid, (ratio - 0.18) / 0.36).lerp(whiteHot, noise * 0.08);
  }

  return mid.clone().lerp(outside, (ratio - 0.54) / 0.46).lerp(new THREE.Color('#5b4cff'), noise * 0.18);
}

function gaussian(random) {
  let u = 0;
  let v = 0;
  while (u === 0) u = random();
  while (v === 0) v = random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let mixed = value;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}
