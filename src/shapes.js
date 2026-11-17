// Облака точек для 3D-сцены. Каждая функция возвращает Float32Array(n * 3).

const TAU = Math.PI * 2;
const rnd = Math.random;
const jit = (a) => (rnd() - 0.5) * a;

function core(n) {
  const p = new Float32Array(n * 3);
  const tiltX = 1.22;
  const tiltZ = 0.35;
  for (let i = 0; i < n; i++) {
    let x, y, z;
    if (i < n * 0.62) {
      const u = rnd() * 2 - 1;
      const a = rnd() * TAU;
      const s = Math.sqrt(1 - u * u);
      x = s * Math.cos(a) * 0.95;
      y = u * 0.95;
      z = s * Math.sin(a) * 0.95;
    } else {
      const a = rnd() * TAU;
      const R = 1.5 + jit(0.05);
      const px = Math.cos(a) * R;
      const pz = Math.sin(a) * R;
      const py = jit(0.04);
      const y1 = py * Math.cos(tiltX) - pz * Math.sin(tiltX);
      const z1 = py * Math.sin(tiltX) + pz * Math.cos(tiltX);
      x = px * Math.cos(tiltZ) - y1 * Math.sin(tiltZ);
      y = px * Math.sin(tiltZ) + y1 * Math.cos(tiltZ);
      z = z1;
    }
    p.set([x, y, z], i * 3);
  }
  return p;
}

// Ресторан: блюдо под крышкой-клошем.
function restaurant(n) {
  const p = new Float32Array(n * 3);
  const dy = -0.45;
  for (let i = 0; i < n; i++) {
    const k = i / n;
    let x, y, z;
    const a = rnd() * TAU;
    if (k < 0.55) {
      y = rnd();
      const s = Math.sqrt(1 - y * y);
      x = s * Math.cos(a);
      z = s * Math.sin(a);
    } else if (k < 0.63) {
      const u = rnd() * 2 - 1;
      const s = Math.sqrt(1 - u * u) * 0.13;
      x = s * Math.cos(a);
      z = s * Math.sin(a);
      y = 1.1 + u * 0.13;
    } else {
      const r = k < 0.9 ? Math.sqrt(rnd()) * 1.32 : 1.32 + jit(0.04);
      x = r * Math.cos(a);
      z = r * Math.sin(a);
      y = -0.05 + (r > 1.1 ? (r - 1.1) * 0.25 : 0) + jit(0.02);
    }
    p.set([x, y + dy, z], i * 3);
  }
  return p;
}

// Производство: шестерня.
function production(n) {
  const p = new Float32Array(n * 3);
  const teeth = 10;
  const ri = 0.42;
  const half = 0.18;
  const outer = (a) => (((a / TAU) * teeth) % 1 < 0.5 ? 1.22 : 0.98);
  for (let i = 0; i < n; i++) {
    const k = i / n;
    const a = rnd() * TAU;
    const ro = outer(a);
    let r, z;
    if (k < 0.55) {
      r = Math.sqrt(rnd() * (ro * ro - ri * ri) + ri * ri);
      z = rnd() < 0.5 ? half : -half;
    } else if (k < 0.87) {
      r = ro;
      z = jit(half * 2);
    } else {
      r = ri;
      z = jit(half * 2);
    }
    p.set([r * Math.cos(a), r * Math.sin(a), z], i * 3);
  }
  return p;
}

// Магазин: пакет с ручками.
function shop(n) {
  const p = new Float32Array(n * 3);
  const w = 1.3, h = 1.5, d = 0.55, dy = -0.2;
  for (let i = 0; i < n; i++) {
    const k = i / n;
    let x, y, z;
    if (k < 0.58) {
      x = jit(w); y = jit(h); z = rnd() < 0.5 ? d / 2 : -d / 2;
    } else if (k < 0.78) {
      x = rnd() < 0.5 ? w / 2 : -w / 2; y = jit(h); z = jit(d);
    } else if (k < 0.86) {
      x = jit(w); y = -h / 2; z = jit(d);
    } else {
      const a = rnd() * Math.PI;
      x = Math.cos(a) * 0.34 + jit(0.04);
      y = h / 2 + Math.sin(a) * 0.4 + jit(0.04);
      z = (rnd() < 0.5 ? d / 2 : -d / 2) + jit(0.04);
    }
    p.set([x, y + dy, z], i * 3);
  }
  return p;
}

// Услуги: циферблат, время записи.
function services(n) {
  const p = new Float32Array(n * 3);
  const hand = (angle, len) => {
    const t = rnd() * len;
    return [Math.sin(angle) * t + jit(0.05), Math.cos(angle) * t + jit(0.05), 0.06 + jit(0.03)];
  };
  for (let i = 0; i < n; i++) {
    const k = i / n;
    let v;
    if (k < 0.42) {
      const a = rnd() * TAU;
      const b = rnd() * TAU;
      const R = 1.08 + Math.cos(b) * 0.07;
      v = [R * Math.cos(a), R * Math.sin(a), Math.sin(b) * 0.07];
    } else if (k < 0.58) {
      const a = (Math.floor(rnd() * 12) / 12) * TAU;
      const r = 0.8 + rnd() * 0.14;
      v = [r * Math.sin(a) + jit(0.03), r * Math.cos(a) + jit(0.03), jit(0.03)];
    } else if (k < 0.7) {
      v = hand(-1.05, 0.5);
    } else if (k < 0.84) {
      v = hand(1.05, 0.78);
    } else {
      const a = rnd() * TAU;
      const r = Math.sqrt(rnd()) * 0.98;
      v = [r * Math.cos(a), r * Math.sin(a), -0.08];
    }
    p.set(v, i * 3);
  }
  return p;
}

export const SHAPES = { asset: core, restaurant, production, shop, services };
