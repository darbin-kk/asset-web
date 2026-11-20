import {
  WebGLRenderer, Scene, PerspectiveCamera, BufferGeometry, BufferAttribute,
  Points, ShaderMaterial, Color, Group, LinearSRGBColorSpace,
} from 'three';
import { SHAPES } from './shapes.js';

const DELAY = 0.6;

const vertex = /* glsl */ `
  attribute vec3 aFrom;
  attribute vec3 aTo;
  attribute float aRand;
  uniform float uMix;
  uniform float uTime;
  uniform float uScatter;
  uniform float uSize;
  varying float vRand;
  void main() {
    vRand = aRand;
    float t = clamp(uMix * (1.0 + ${DELAY.toFixed(1)}) - aRand * ${DELAY.toFixed(1)}, 0.0, 1.0);
    float e = t * t * (3.0 - 2.0 * t);
    vec3 pos = mix(aFrom, aTo, e);
    float fly = sin(e * 3.14159);
    vec3 dir = normalize(vec3(sin(aRand * 91.7), cos(aRand * 47.3), sin(aRand * 23.1 + 1.7)));
    pos += dir * fly * 0.55;
    pos += dir * uScatter * (0.3 + aRand);
    pos += 0.012 * vec3(sin(uTime + aRand * 40.0), cos(uTime * 0.8 + aRand * 31.0), sin(uTime * 1.2 + aRand * 17.0));
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * (0.6 + aRand) / -mv.z;
  }
`;

const fragment = /* glsl */ `
  precision mediump float;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  varying float vRand;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.32, d);
    if (a < 0.02) discard;
    vec3 c = mix(uColorA, uColorB, step(0.72, vRand));
    gl_FragColor = vec4(c, a * 0.9);
  }
`;

const LAYOUTS = {
  wide: {
    // Главная: фигура между текстом слева и карточками справа; внутренние страницы: между меню и стеклянной колонкой.
    glavnaya: [0.6, 0.15, 0.85],
    uslugi: [-1.15, 0.2, 0.85],
    process: [-1.15, 0.4, 0.8],
    raboty: [-1.15, -0.2, 0.8],
    kontakty: [-1.15, 0.1, 0.9],
  },
  tall: {
    glavnaya: [0, 1.25, 0.6],
    uslugi: [1.0, 1.75, 0.4],
    process: [1.0, 1.75, 0.4],
    raboty: [1.0, 1.75, 0.4],
    kontakty: [1.0, 1.75, 0.4],
  },
};

export function createScene(canvas, { reduced = false } = {}) {
  const small = Math.min(window.innerWidth, window.innerHeight) < 720;
  const count = small ? 2600 : 7500;

  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'low-power' });
  const scene = new Scene();
  const camera = new PerspectiveCamera(35, 1, 0.1, 50);
  camera.position.z = 7.5;

  const from = SHAPES.asset(count);
  const to = from.slice();
  const rand = new Float32Array(count);
  for (let i = 0; i < count; i++) rand[i] = Math.random();

  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(from.slice(), 3));
  geo.setAttribute('aFrom', new BufferAttribute(from, 3));
  geo.setAttribute('aTo', new BufferAttribute(to, 3));
  geo.setAttribute('aRand', new BufferAttribute(rand, 1));

  const uniforms = {
    uMix: { value: 1 },
    uTime: { value: 0 },
    uScatter: { value: 0 },
    uSize: { value: 30 },
    uColorA: { value: new Color('#0e1b2e') },
    uColorB: { value: new Color('#2b4bff') },
  };
  const material = new ShaderMaterial({ vertexShader: vertex, fragmentShader: fragment, uniforms, transparent: true, depthWrite: false });
  const points = new Points(geo, material);
  points.frustumCulled = false;
  const group = new Group();
  group.add(points);
  group.rotation.x = 0.25;
  scene.add(group);

  const colorA = new Color('#0e1b2e');
  const colorB = new Color('#2b4bff');
  const target = { x: 2, y: 0, s: 1 };
  let tab = 'glavnaya';
  let scatter = 0;
  let pointerX = 0;
  let pointerY = 0;
  let running = true;
  let last = performance.now();

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    uniforms.uSize.value = (small ? 30 : 30) * dpr * (h / 900);
    applyLayout();
  }

  function applyLayout() {
    const aspect = window.innerWidth / window.innerHeight;
    const set = aspect < 1 ? LAYOUTS.tall : LAYOUTS.wide;
    const [x, y, s] = set[tab] || set.glavnaya;
    target.x = aspect < 1 ? x : x * Math.min(aspect / 1.78, 1.25);
    target.y = y;
    target.s = s;
  }

  // Фиксируем текущее положение точек, чтобы новая фигура собиралась без рывка.
  function freeze() {
    const m = uniforms.uMix.value;
    if (m >= 1) { from.set(to); return; }
    for (let i = 0; i < count; i++) {
      const t = Math.min(Math.max(m * (1 + DELAY) - rand[i] * DELAY, 0), 1);
      const e = t * t * (3 - 2 * t);
      for (let k = 0; k < 3; k++) {
        const j = i * 3 + k;
        from[j] += (to[j] - from[j]) * e;
      }
    }
  }

  let skip = false;
  function frame(now) {
    if (!running) return;
    // На телефонах рисуем через кадр: 30 кадров в секунду хватает, а батарея и процессор целее.
    if (small) { skip = !skip; if (skip) { requestAnimationFrame(frame); return; } }
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    uniforms.uTime.value += dt;
    if (uniforms.uMix.value < 1) uniforms.uMix.value = Math.min(1, uniforms.uMix.value + dt / (reduced ? 0.01 : 1.5));
    scatter = Math.max(0, scatter - dt * 1.6);
    uniforms.uScatter.value = Math.sin(scatter * Math.PI) * 0.7;
    uniforms.uColorA.value.lerp(colorA, 0.06);
    uniforms.uColorB.value.lerp(colorB, 0.06);
    const k = reduced ? 1 : 0.07;
    group.position.x += (target.x - group.position.x) * k;
    group.position.y += (target.y - group.position.y) * k;
    const s = group.scale.x + (target.s - group.scale.x) * k;
    group.scale.setScalar(s);
    if (!reduced) {
      group.rotation.y += dt * 0.22;
      group.rotation.x += (0.25 + pointerY * 0.2 - group.rotation.x) * 0.05;
      group.rotation.z += (pointerX * 0.12 - group.rotation.z) * 0.05;
    }
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', (e) => {
    pointerX = e.clientX / window.innerWidth - 0.5;
    pointerY = e.clientY / window.innerHeight - 0.5;
  }, { passive: true });
  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    if (running) { last = performance.now(); requestAnimationFrame(frame); }
  });

  resize();
  group.position.set(target.x, target.y, 0);
  group.scale.setScalar(target.s);
  requestAnimationFrame(frame);

  return {
    setShape(name) {
      const make = SHAPES[name] || SHAPES.asset;
      freeze();
      to.set(make(count));
      geo.attributes.aFrom.needsUpdate = true;
      geo.attributes.aTo.needsUpdate = true;
      uniforms.uMix.value = 0;
    },
    setTab(name) {
      tab = name;
      applyLayout();
      if (!reduced) scatter = 1;
    },
    setColors(a, b) {
      // Шейдер выводит цвет как есть, поэтому берём значения из CSS без перевода в линейное пространство,
      // иначе оранжевый #ff7a1a на экране становится красным.
      if (a) colorA.setStyle(a.trim(), LinearSRGBColorSpace);
      if (b) colorB.setStyle(b.trim(), LinearSRGBColorSpace);
    },
  };
}
