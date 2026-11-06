import * as THREE from 'three';
import { CFG } from './config';

/**
 * 3층 · 극광의 설원 정상 — 구름 바다 위로 솟은 설산 꼭대기의 둥근 화강암 평지. 머리 위는 오로라가 흐르는 밤하늘.
 *
 *   · 색: 짙은 남색 밤하늘에 초록 · 보랏빛 오로라, 청회색 화강암 바닥에 눈 더미와 얼음빛 눈꽃 상감. 붉은 위험 표시가 차가운 바닥 위에서 또렷하다.
 *   · 지형: 둥근 정상 바닥(눈꽃 상감) → 가장자리의 얼음 결정 무리 → 아래로 넓어지는 눈 덮인 산봉우리 → 한참 아래 달빛 구름 바다, 구름 위로 솟은 설산들, 먼 산맥.
 *   · 용이 하늘을 날아다니므로 하늘에 공을 들였다: 별, 달, 천천히 일렁이는 오로라 커튼. 용이 포효하면 오로라가 확 밝아진다. 눈보라가 옆으로 흩날린다.
 */
const TAU = Math.PI * 2;
const R = CFG.peak.radius;
const SEA_Y = -48; // 구름 바다의 높이 (정상 한참 아래)

export const VOLC = {
  fog: 0x13213a,
  fogDensity: 0.0042,
  hemiSky: 0x5a7aa8,
  hemiGround: 0x2a3448,
  hemiIntensity: 0.9,
  sun: 0xbcd4ff, // 달빛
  sunIntensity: 1.15,
  sunPos: [-30, 34, -22] as [number, number, number],
};

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvas(w: number, h = w) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  return { cv, g: cv.getContext('2d', { willReadFrequently: true })! };
}

function tex(cv: HTMLCanvasElement, srgb = true) {
  const t = new THREE.CanvasTexture(cv);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** 하늘 돔 텍스처 (등장방형): 맑은 밤 — 위는 거의 검은 남색, 지평선은 옅은 청록 기운. 별 · 은하수 · 낮게 깔린 구름띠 */
function makeSky(rand: () => number) {
  const W = 2048;
  const H = 1024;
  const { cv, g } = canvas(W, H);
  const gr = g.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, '#02040e');
  gr.addColorStop(0.2, '#050a1e');
  gr.addColorStop(0.36, '#0a1632');
  gr.addColorStop(0.46, '#123050');
  gr.addColorStop(0.5, '#1e4660');
  gr.addColorStop(0.53, '#16283e');
  gr.addColorStop(1, '#13213a');
  g.fillStyle = gr;
  g.fillRect(0, 0, W, H);
  const puff = (x: number, y: number, r: number, squash: number, rgb: string, a: number) => {
    const gg = g.createRadialGradient(x, y, 0, x, y, r);
    gg.addColorStop(0, `rgba(${rgb},${a})`);
    gg.addColorStop(0.6, `rgba(${rgb},${a * 0.55})`);
    gg.addColorStop(1, `rgba(${rgb},0)`);
    for (const ox of [-W, 0, W]) {
      g.save();
      g.translate(x + ox, y);
      g.scale(1, squash);
      g.translate(-x, -y);
      g.fillStyle = gg;
      g.fillRect(x - r, y - r, r * 2, r * 2);
      g.restore();
    }
  };
  // 은하수: 하늘을 비스듬히 가로지르는 옅은 띠
  for (let i = 0; i < 180; i++) {
    const u = rand();
    puff(u * W, H * (0.22 + 0.11 * Math.sin(u * TAU)) + (rand() - 0.5) * 40, 30 + rand() * 60, 0.5, '150,170,230', 0.05 + rand() * 0.05);
  }
  // 별: 위쪽일수록 많다
  for (let i = 0; i < 2600; i++) {
    const y = Math.pow(rand(), 1.6) * H * 0.48;
    const x = rand() * W;
    const b = rand();
    const s = b > 0.985 ? 2.4 : b > 0.9 ? 1.5 : 1;
    g.fillStyle = `rgba(${210 + Math.floor(rand() * 45)},${220 + Math.floor(rand() * 35)},255,${0.35 + rand() * 0.65})`;
    g.fillRect(x, y, s, s);
    if (b > 0.993) {
      const gg = g.createRadialGradient(x, y, 0, x, y, 7);
      gg.addColorStop(0, 'rgba(200,225,255,0.5)');
      gg.addColorStop(1, 'rgba(200,225,255,0)');
      g.fillStyle = gg;
      g.fillRect(x - 7, y - 7, 14, 14);
    }
  }
  // 지평선의 청록 기운 (오로라가 비친 빛)
  for (let i = 0; i < 40; i++) puff(rand() * W, H * (0.47 + rand() * 0.04), 120 + rand() * 160, 0.16, '60,180,160', 0.08 + rand() * 0.08);
  // 낮게 깔린 구름띠 (달빛을 받은 회청색)
  for (let i = 0; i < 40; i++) puff(rand() * W, H * (0.43 + rand() * 0.06), 80 + rand() * 140, 0.12, '70,96,130', 0.18 + rand() * 0.14);
  return tex(cv);
}

/** 달: 흰 원반과 푸른 후광 */
function makeMoonTex(rand: () => number, core: boolean) {
  const S = 256;
  const { cv, g } = canvas(S);
  const gg = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  if (core) {
    gg.addColorStop(0, 'rgba(250,252,255,1)');
    gg.addColorStop(0.44, 'rgba(226,236,255,1)');
    gg.addColorStop(0.5, 'rgba(190,215,255,0.5)');
    gg.addColorStop(0.62, 'rgba(160,200,255,0.1)');
    gg.addColorStop(1, 'rgba(140,180,255,0)');
  } else {
    gg.addColorStop(0, 'rgba(170,200,255,0.4)');
    gg.addColorStop(0.3, 'rgba(130,170,240,0.16)');
    gg.addColorStop(1, 'rgba(100,140,220,0)');
  }
  g.fillStyle = gg;
  g.fillRect(0, 0, S, S);
  if (core) {
    // 달 표면의 옅은 얼룩
    for (let i = 0; i < 9; i++) {
      const a = rand() * TAU;
      const d = rand() * S * 0.16;
      const r = S * (0.03 + rand() * 0.05);
      g.fillStyle = 'rgba(150,170,205,0.35)';
      g.beginPath();
      g.arc(S / 2 + Math.cos(a) * d, S / 2 + Math.sin(a) * d, r, 0, TAU);
      g.fill();
    }
  }
  return tex(cv);
}

/** 구름 바다: 산 아래로 깔린 구름. 달빛을 받은 회청색 뭉게구름과 그 사이의 그늘 */
function makeSea(rand: () => number) {
  const S = 512;
  const { cv, g } = canvas(S);
  g.fillStyle = '#1a2436';
  g.fillRect(0, 0, S, S);
  for (let i = 0; i < 380; i++) {
    const x = rand() * S;
    const y = rand() * S;
    const r = 14 + rand() * 46;
    const gg = g.createRadialGradient(x, y, 0, x, y, r);
    const b = rand();
    gg.addColorStop(0, b < 0.55 ? 'rgba(90,110,140,0.75)' : b < 0.85 ? 'rgba(10,14,24,0.75)' : 'rgba(170,200,230,0.5)');
    gg.addColorStop(1, 'rgba(26,36,54,0)');
    for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) {
      g.fillStyle = gg;
      g.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
    }
  }
  const t = tex(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** 흐린 구름 덩어리 한 장 (구름 바다 위 뭉게구름용) */
function makePuffTex(rand: () => number) {
  const S = 256;
  const { cv, g } = canvas(S);
  for (let i = 0; i < 26; i++) {
    const a = rand() * TAU;
    const d = rand() * S * 0.22;
    const x = S / 2 + Math.cos(a) * d;
    const y = S / 2 + Math.sin(a) * d * 0.55;
    const r = S * (0.12 + rand() * 0.16);
    const gg = g.createRadialGradient(x, y, 0, x, y, r);
    gg.addColorStop(0, 'rgba(255,255,255,0.5)');
    gg.addColorStop(0.6, 'rgba(255,255,255,0.22)');
    gg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gg;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  return tex(cv);
}

/** 정상 바닥: 청회색 화강암 판석(방사형) + 군데군데 쌓인 눈 + 얼음빛 상감(발광 층) + 한가운데 여섯 갈래 눈꽃 문양 */
function makeFloor(rand: () => number) {
  const S = 2048;
  const c = S / 2;
  const base = canvas(S);
  const glow = canvas(S);
  const g = base.g;
  const e = glow.g;
  g.fillStyle = '#1e2430';
  g.fillRect(0, 0, S, S);
  e.fillStyle = '#000';
  e.fillRect(0, 0, S, S);
  const px = S / (R * 2);
  const bands = [0, 5, 11, 16.5, 22, 26.5, R];
  for (let b = 0; b < bands.length - 1; b++) {
    const r0 = bands[b] * px;
    const r1 = bands[b + 1] * px;
    const n = b === 0 ? 1 : 7 + b * 6;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * TAU + b * 0.17;
      const a1 = ((i + 1) / n) * TAU + b * 0.17;
      const sh = 50 + Math.floor(rand() * 26);
      g.fillStyle = `rgb(${sh - 6},${sh},${sh + 14})`;
      g.beginPath();
      if (n === 1) g.arc(c, c, r1, 0, TAU);
      else {
        g.arc(c, c, r1, a0 + 0.008, a1 - 0.008);
        g.arc(c, c, r0 + 3, a1 - 0.008, a0 + 0.008, true);
      }
      g.closePath();
      g.fill();
      // 화강암 알갱이
      for (let k = 0; k < 40; k++) {
        const am = a0 + (a1 - a0) * rand();
        const rm = r0 + (r1 - r0) * rand();
        g.fillStyle = rand() < 0.5 ? 'rgba(200,210,230,0.18)' : 'rgba(8,10,18,0.3)';
        g.fillRect(c + Math.cos(am) * rm, c + Math.sin(am) * rm, 2 + rand() * 3, 2 + rand() * 3);
      }
      // 이음매
      g.strokeStyle = 'rgba(6,8,14,0.9)';
      g.lineWidth = 3;
      g.beginPath();
      g.arc(c, c, r1 - 1, a0, a1);
      g.stroke();
      if (n > 1) {
        g.beginPath();
        g.moveTo(c + Math.cos(a0) * r0, c + Math.sin(a0) * r0);
        g.lineTo(c + Math.cos(a0) * r1, c + Math.sin(a0) * r1);
        g.stroke();
      }
    }
  }
  // 갈라진 자국
  for (let i = 0; i < 14; i++) {
    let x = c + (rand() - 0.5) * S * 0.9;
    let y = c + (rand() - 0.5) * S * 0.9;
    if (Math.hypot(x - c, y - c) > R * px - 20) continue;
    let a = rand() * TAU;
    g.strokeStyle = 'rgba(4,6,10,0.8)';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(x, y);
    for (let k = 0; k < 12; k++) {
      a += (rand() - 0.5) * 0.9;
      x += Math.cos(a) * 20;
      y += Math.sin(a) * 20;
      if (Math.hypot(x - c, y - c) > R * px - 12) break;
      g.lineTo(x, y);
    }
    g.stroke();
  }
  // 쌓인 눈: 가장자리로 갈수록 많고, 둘레를 따라 길쭉하게 쏠린 모양
  for (let i = 0; i < 260; i++) {
    const rr = (0.35 + Math.pow(rand(), 0.6) * 0.65) * R * px;
    const a = rand() * TAU;
    const x = c + Math.cos(a) * rr;
    const y = c + Math.sin(a) * rr;
    const r = (14 + rand() * 40) * (rr / (R * px));
    g.save();
    g.translate(x, y);
    g.rotate(a + Math.PI / 2);
    g.scale(1, 0.45);
    const gg = g.createRadialGradient(0, 0, 0, 0, 0, r);
    gg.addColorStop(0, 'rgba(225,235,250,0.55)');
    gg.addColorStop(0.6, 'rgba(210,222,245,0.25)');
    gg.addColorStop(1, 'rgba(200,215,240,0)');
    g.fillStyle = gg;
    g.fillRect(-r, -r, r * 2, r * 2);
    g.restore();
  }
  const ring = (r: number, w: number, col: string) => {
    e.strokeStyle = col;
    e.lineWidth = w;
    e.beginPath();
    e.arc(c, c, r * px, 0, TAU);
    e.stroke();
  };
  const line = (x0: number, y0: number, x1: number, y1: number, w: number, col: string) => {
    e.strokeStyle = col;
    e.lineWidth = w;
    e.beginPath();
    e.moveTo(c + x0 * px, c + y0 * px);
    e.lineTo(c + x1 * px, c + y1 * px);
    e.stroke();
  };
  // 눈꽃: 여섯 갈래 + 갈래마다 잔가지 두 쌍
  const ICE = 'rgba(140,240,255,0.95)';
  const ICE2 = 'rgba(120,220,255,0.7)';
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + Math.PI / 6;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    line(ca * 1.6, sa * 1.6, ca * 9.4, sa * 9.4, 7, ICE);
    for (const [d, l] of [[4.2, 2.0], [6.8, 1.5]]) {
      for (const s of [1, -1]) {
        const b = a + s * 0.95;
        line(ca * d, sa * d, ca * d + Math.cos(b) * l, sa * d + Math.sin(b) * l, 4, ICE2);
      }
    }
  }
  // 가운데 육각형
  e.strokeStyle = ICE;
  e.lineWidth = 6;
  e.beginPath();
  for (let i = 0; i <= 6; i++) {
    const a = (i / 6) * TAU;
    const x = c + Math.cos(a) * 1.8 * px;
    const y = c + Math.sin(a) * 1.8 * px;
    if (i === 0) e.moveTo(x, y);
    else e.lineTo(x, y);
  }
  e.stroke();
  ring(10.6, 5, 'rgba(120,230,255,0.85)');
  ring(11.3, 2, 'rgba(180,245,255,0.7)');
  // 바깥 띠: 둘레에 작은 서리 결정
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * TAU;
    const x = Math.cos(a) * 19.2;
    const y = Math.sin(a) * 19.2;
    for (let k = 0; k < 3; k++) {
      const b = a + (k / 3) * Math.PI;
      line(x - Math.cos(b) * 0.7, y - Math.sin(b) * 0.7, x + Math.cos(b) * 0.7, y + Math.sin(b) * 0.7, 3, 'rgba(130,230,255,0.6)');
    }
  }
  // 가장자리 룬 띠
  ring(R - 3.0, 3, 'rgba(120,225,255,0.7)');
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * TAU;
    e.strokeStyle = 'rgba(140,235,255,0.75)';
    e.lineWidth = 4;
    e.beginPath();
    e.moveTo(c + Math.cos(a) * (R - 2.6) * px, c + Math.sin(a) * (R - 2.6) * px);
    e.lineTo(c + Math.cos(a) * (R - 1.6) * px, c + Math.sin(a) * (R - 1.6) * px);
    e.stroke();
  }
  ring(R - 1.2, 3, 'rgba(120,225,255,0.7)');
  return { map: tex(base.cv), glow: tex(glow.cv) };
}

/**
 * 울퉁불퉁한 산봉우리 (원뿔을 무작위로 일그러뜨림). 높이에 따라 위는 눈, 아래는 바위색 (정점 색).
 * 밑면 반지름 1, 높이 1, 밑면이 y=0. topR > 0 이면 꼭대기가 평평하게 잘린 모양.
 */
function peakGeo(rand: () => number, topR = 0, snowLine = 0.45, seg = 18) {
  const geo = new THREE.CylinderGeometry(topR, 1, 1, seg, 10, false).translate(0, 0.5, 0);
  const p = geo.getAttribute('position') as THREE.BufferAttribute;
  const n = p.count;
  const col = new Float32Array(n * 3);
  // 같은 자리(이음매)의 정점이 같이 움직이도록 위치로 변위를 나눠 쓴다
  const offs = new Map<string, [number, number]>();
  const rock = [0.22, 0.25, 0.32];
  const snow = [0.86, 0.9, 0.98];
  for (let i = 0; i < n; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const key = `${x.toFixed(3)},${y.toFixed(3)},${z.toFixed(3)}`;
    let o = offs.get(key);
    if (!o) {
      o = [1 + (rand() - 0.5) * 0.36, (rand() - 0.5) * 0.04];
      offs.set(key, o);
    }
    const edge = y > 0.999 || y < 0.001;
    const k = edge ? 1 : o[0];
    p.setXYZ(i, x * k, y + (edge ? 0 : o[1]), z * k);
    // 눈: 높을수록, 그리고 들쭉날쭉
    const s = THREE.MathUtils.smoothstep(y + (o[0] - 1) * 0.8, snowLine - 0.08, snowLine + 0.08);
    for (let ch = 0; ch < 3; ch++) col[i * 3 + ch] = rock[ch] + (snow[ch] - rock[ch]) * s;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  return geo;
}

/** 두 도형을 하나로 (위치만, 인덱스 없는 삼각형 목록 · 법선은 다시 계산) */
function mergeTwo(a: THREE.BufferGeometry, b: THREE.BufferGeometry) {
  const pa = a.toNonIndexed().getAttribute('position').array as Float32Array;
  const pb = b.toNonIndexed().getAttribute('position').array as Float32Array;
  const pos = new Float32Array(pa.length + pb.length);
  pos.set(pa, 0);
  pos.set(pb, pa.length);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

/** 오로라 커튼: 아래 가장자리는 밝은 초록, 위로 갈수록 보랏빛으로 바래며, 세로 줄기가 천천히 흐른다 */
const AURORA_VS = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const AURORA_FS = /* glsl */ `
  uniform float uTime;
  uniform float uPh;
  uniform float uGain;
  varying vec2 vUv;
  void main() {
    float u = vUv.x;
    float v = vUv.y;
    float rays = 0.55 + 0.45 * sin(u * 140.0 + uTime * 1.1 + uPh + sin(u * 19.0 - uTime * 0.6) * 3.0);
    float fold = 0.45 + 0.55 * sin(u * 8.0 - uTime * 0.35 + uPh * 2.0);
    float bottom = smoothstep(0.0, 0.06, v);
    float top = 1.0 - smoothstep(0.2, 1.0, v);
    float edge = smoothstep(0.0, 0.12, u) * smoothstep(1.0, 0.88, u);
    vec3 green = vec3(0.25, 1.0, 0.62);
    vec3 violet = vec3(0.62, 0.32, 1.0);
    vec3 col = mix(green, violet, smoothstep(0.3, 0.85, v));
    float k = bottom * top * edge * (0.3 + 0.7 * rays * fold);
    col = col * k + green * exp(-v * 22.0) * edge * fold * 0.7;
    gl_FragColor = vec4(col * uGain, 1.0);
  }
`;

function makeAurora(rand: () => number, a0: number, span: number, dist: number, base: number, height: number) {
  const N = 90;
  const pos = new Float32Array((N + 1) * 2 * 3);
  const uv = new Float32Array((N + 1) * 2 * 2);
  const wav = 0.6 + rand() * 0.8;
  const ph = rand() * TAU;
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const a = a0 + span * u;
    const r = dist + Math.sin(u * TAU * wav + ph) * dist * 0.12;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const yb = base + Math.sin(u * Math.PI * 1.3 + ph) * 25;
    pos.set([x, yb, z, x * 1.04, yb + height, z * 1.04], i * 6);
    uv.set([u, 0, u, 1], i * 4);
  }
  const idx: number[] = [];
  for (let i = 0; i < N; i++) {
    const a = i * 2;
    idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(idx);
  const mat = new THREE.ShaderMaterial({
    vertexShader: AURORA_VS,
    fragmentShader: AURORA_FS,
    uniforms: { uTime: { value: 0 }, uPh: { value: rand() * 10 }, uGain: { value: 1 } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  const m = new THREE.Mesh(geo, mat);
  m.frustumCulled = false;
  m.renderOrder = -8;
  return m;
}

export class Volcano {
  readonly group = new THREE.Group();
  private seaTex: THREE.Texture;
  private seaMat: THREE.MeshBasicMaterial;
  private floorMat: THREE.MeshStandardMaterial;
  private rimMat: THREE.MeshBasicMaterial;
  private iceMat: THREE.MeshStandardMaterial;
  private sky: THREE.Mesh;
  private moonDisc: THREE.Sprite;
  private moonGlow: THREE.Sprite;
  private moonDir = new THREE.Vector3(...VOLC.sunPos).normalize();
  private aurora = new THREE.Group();
  private auroraMats: THREE.ShaderMaterial[] = [];
  private snow: THREE.Points;
  private snowSpeed: Float32Array;
  private streaks: THREE.LineSegments;
  private streakData: Float32Array; // 줄마다 [속도, 길이]
  private lights: { l: THREE.PointLight; base: number; ph: number }[] = [];
  private clouds: { s: THREE.Sprite; a: number; d: number; w: number }[] = [];
  private flare = 0;
  private flareT = 5;

  constructor(scene: THREE.Scene) {
    const rand = mulberry32(31337);
    const root = this.group;
    scene.add(root);

    /* 하늘 · 달 */
    this.sky = new THREE.Mesh(
      new THREE.SphereGeometry(1150, 32, 20),
      new THREE.MeshBasicMaterial({ map: makeSky(rand), side: THREE.BackSide, fog: false, depthWrite: false, toneMapped: false }),
    );
    this.sky.renderOrder = -10;
    this.sky.frustumCulled = false;
    root.add(this.sky);
    const mkMoon = (core: boolean, size: number) => {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeMoonTex(rand, core), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false }));
      sp.scale.set(size, size, 1);
      sp.renderOrder = -9;
      sp.frustumCulled = false;
      root.add(sp);
      return sp;
    };
    this.moonGlow = mkMoon(false, 380);
    this.moonDisc = mkMoon(true, 70);

    /* 오로라 커튼: 하늘 높이 몇 겹. 달 반대쪽 하늘에 주로 걸린다 */
    const ma = Math.atan2(this.moonDir.z, this.moonDir.x) + Math.PI;
    const curtains: [number, number, number, number, number][] = [
      [ma - 1.3, 1.6, 620, 130, 230],
      [ma - 0.2, 1.4, 560, 170, 200],
      [ma + 0.7, 1.5, 680, 110, 260],
      [ma - 2.6, 1.1, 700, 150, 180],
      [ma + 2.1, 1.0, 640, 190, 170],
    ];
    for (const [a0, span, dist, base, height] of curtains) {
      const m = makeAurora(rand, a0, span, dist, base, height);
      this.auroraMats.push(m.material as THREE.ShaderMaterial);
      this.aurora.add(m);
    }
    root.add(this.aurora);

    /* 구름 바다: 정상 한참 아래 */
    this.seaTex = makeSea(rand);
    this.seaTex.repeat.set(60, 60);
    this.seaMat = new THREE.MeshBasicMaterial({ map: this.seaTex, color: new THREE.Color(1, 1, 1), toneMapped: false, fog: true });
    const sea = new THREE.Mesh(new THREE.CircleGeometry(1400, 64).rotateX(-Math.PI / 2), this.seaMat);
    sea.position.y = SEA_Y;
    root.add(sea);
    // 구름 바다 위로 피어오른 뭉게구름 (천천히 흐른다)
    const puffTex = makePuffTex(rand);
    for (let i = 0; i < 46; i++) {
      const a = rand() * TAU;
      const d = 75 + Math.pow(rand(), 0.7) * 420;
      const col = new THREE.Color(0x6a80a4).lerp(new THREE.Color(0x5ab0a0), rand() < 0.25 ? 0.6 : 0);
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, color: col, transparent: true, opacity: 0.5 + rand() * 0.3, depthWrite: false, fog: true }));
      const w = 50 + rand() * 110;
      s.scale.set(w, w * (0.35 + rand() * 0.15), 1);
      s.position.set(Math.cos(a) * d, SEA_Y + 4 + rand() * 14, Math.sin(a) * d);
      root.add(s);
      this.clouds.push({ s, a, d, w: (rand() - 0.5) * 0.006 });
    }

    /* 재질 */
    const granite = new THREE.MeshStandardMaterial({ color: 0x5a6478, roughness: 0.9, metalness: 0.02, flatShading: true });
    const snowy = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0, flatShading: true });

    /* 정상 바닥 */
    const fl = makeFloor(rand);
    this.floorMat = new THREE.MeshStandardMaterial({ map: fl.map, emissiveMap: fl.glow, emissive: 0xbff4ff, emissiveIntensity: 0.45, roughness: 0.92, metalness: 0 });
    const floor = new THREE.Mesh(new THREE.CircleGeometry(R, 96).rotateX(-Math.PI / 2), this.floorMat);
    floor.receiveShadow = true;
    root.add(floor);
    // 바닥 판의 두께
    const slab = new THREE.Mesh(new THREE.CylinderGeometry(R + 1.0, R + 1.6, 1.8, 96), granite);
    slab.position.y = -0.92;
    slab.receiveShadow = true;
    root.add(slab);
    // 가장자리 얼음빛 테두리 (바닥 위)
    this.rimMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.45, 0.95, 1.0), transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const rim = new THREE.Mesh(new THREE.RingGeometry(R - 0.45, R + 0.05, 96).rotateX(-Math.PI / 2), this.rimMat);
    rim.position.y = 0.03;
    root.add(rim);

    /* 정상 아래 산봉우리: 아래로 넓어지며 구름 바다 밑까지 내려간다 (꼭대기가 잘린 원뿔) */
    const mtH = -SEA_Y + 14;
    const mtR = 74;
    const mountain = new THREE.Mesh(peakGeo(rand, (R + 1.4) / mtR, 0.6, 40), snowy);
    mountain.scale.set(mtR, mtH, mtR);
    mountain.position.y = -1.7 - mtH;
    root.add(mountain);

    /* 가장자리 얼음 결정 무리: 육각 기둥이 비스듬히 솟아 있다 */
    this.iceMat = new THREE.MeshStandardMaterial({ color: 0xa8ecff, emissive: 0x2aa6c8, emissiveIntensity: 0.6, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.82, flatShading: true });
    const shardGeo = mergeTwo(new THREE.CylinderGeometry(0.34, 0.46, 1, 6).translate(0, 0.5, 0), new THREE.ConeGeometry(0.34, 0.6, 6).translate(0, 1.3, 0));
    const ice = new THREE.InstancedMesh(shardGeo, this.iceMat, 12 * 4);
    const o = new THREE.Object3D();
    let ni = 0;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU + rand() * 0.2;
      const cx = Math.cos(a) * (R + 0.9);
      const cz = Math.sin(a) * (R + 0.9);
      const cnt = 2 + Math.floor(rand() * 3);
      for (let k = 0; k < cnt; k++) {
        o.position.set(cx + (rand() - 0.5) * 1.2, -0.2, cz + (rand() - 0.5) * 1.2);
        o.rotation.set((rand() - 0.5) * 0.7, rand() * TAU, (rand() - 0.5) * 0.7);
        const h = 1.2 + rand() * (k === 0 ? 3.2 : 1.8);
        o.scale.set(0.8 + rand() * 0.6, h, 0.8 + rand() * 0.6);
        o.updateMatrix();
        ice.setMatrixAt(ni++, o.matrix);
      }
    }
    ice.count = ni;
    root.add(ice);

    /* 주변 설산: 구름 바다 위로 솟은 봉우리들 + 먼 산맥 */
    const peakMeshes = [peakGeo(rand, 0, 0.5), peakGeo(rand, 0, 0.42), peakGeo(rand, 0.06, 0.55)].map((gm) => new THREE.InstancedMesh(gm, snowy, 40));
    const counts = [0, 0, 0];
    const addPeak = (x: number, z: number, w: number, top: number) => {
      const v = Math.floor(rand() * 3);
      o.position.set(x, SEA_Y - 8, z);
      o.rotation.set(0, rand() * TAU, 0);
      o.scale.set(w, top - SEA_Y + 8, w * (0.8 + rand() * 0.4));
      o.updateMatrix();
      peakMeshes[v].setMatrixAt(counts[v]++, o.matrix);
    };
    for (let i = 0; i < 22; i++) {
      const a = rand() * TAU;
      const d = 120 + Math.pow(rand(), 0.8) * 230;
      addPeak(Math.cos(a) * d, Math.sin(a) * d, 25 + rand() * 40, -10 + rand() * 70);
    }
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * TAU + rand() * 0.15;
      const d = 600 + rand() * 250;
      addPeak(Math.cos(a) * d, Math.sin(a) * d, 120 + rand() * 120, 40 + rand() * 140);
    }
    peakMeshes.forEach((m, i) => {
      m.count = counts[i];
      root.add(m);
    });

    /* 눈보라: 플레이어 주변 상자 안에서 바람에 날리며 내린다 */
    const N = 900;
    const pos = new Float32Array(N * 3);
    this.snowSpeed = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = (rand() - 0.5) * 100;
      pos[i * 3 + 1] = -10 + rand() * 46;
      pos[i * 3 + 2] = (rand() - 0.5) * 100;
      this.snowSpeed[i] = 1.5 + rand() * 2.5;
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const flake = canvas(32);
    const fg = flake.g.createRadialGradient(16, 16, 0, 16, 16, 16);
    fg.addColorStop(0, 'rgba(255,255,255,1)');
    fg.addColorStop(0.45, 'rgba(255,255,255,0.7)');
    fg.addColorStop(1, 'rgba(255,255,255,0)');
    flake.g.fillStyle = fg;
    flake.g.fillRect(0, 0, 32, 32);
    this.snow = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xe8f2ff, map: tex(flake.cv), size: 0.3, transparent: true, opacity: 0.85, depthWrite: false }));
    this.snow.frustumCulled = false;
    root.add(this.snow);

    /* 바람결: 옆으로 빠르게 스쳐 가는 가는 줄 */
    const NL = 110;
    const lp = new Float32Array(NL * 6);
    this.streakData = new Float32Array(NL * 2);
    for (let i = 0; i < NL; i++) {
      const x = (rand() - 0.5) * 120;
      const y = -12 + rand() * 46;
      const z = (rand() - 0.5) * 120;
      lp.set([x, y, z, x, y, z], i * 6);
      this.streakData[i * 2] = 16 + rand() * 18;
      this.streakData[i * 2 + 1] = 1.5 + rand() * 3.5;
    }
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.BufferAttribute(lp, 3));
    this.streaks = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: new THREE.Color(1.0, 1.15, 1.3), transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    this.streaks.frustumCulled = false;
    root.add(this.streaks);

    /* 가장자리 얼음빛 점광원 (플레이어·용을 차갑게 물들인다) */
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU + 0.3;
      const l = new THREE.PointLight(0x7adcff, 3, 26, 1.5);
      l.position.set(Math.cos(a) * (R - 1.5), 1.2, Math.sin(a) * (R - 1.5));
      root.add(l);
      this.lights.push({ l, base: 2.6, ph: rand() * TAU });
    }
  }

  /** 용이 포효하거나 큰 기술을 쓸 때 오로라와 하늘이 확 밝아진다 (0~1) */
  pulse(k: number) {
    this.flare = Math.max(this.flare, k);
  }

  update(dt: number, t: number, fx = 0, fz = 0) {
    this.seaTex.offset.x += dt * 0.004;
    this.seaTex.offset.y -= dt * 0.0025;
    this.flareT -= dt;
    if (this.flareT < 0) {
      this.flare = Math.max(this.flare, 0.4);
      this.flareT = 7 + Math.random() * 8;
    }
    this.flare = Math.max(0, this.flare - dt * 0.7);
    // 오로라: 천천히 흐르고, 전체 밝기가 느리게 숨 쉰다
    const breathe = 0.75 + 0.25 * Math.sin(t * 0.23) + 0.12 * Math.sin(t * 0.61);
    for (let i = 0; i < this.auroraMats.length; i++) {
      const u = this.auroraMats[i].uniforms;
      u.uTime.value = t;
      u.uGain.value = (0.8 + 0.2 * Math.sin(t * 0.4 + i * 1.7)) * breathe * (1 + this.flare * 1.6);
    }
    const lk = 1 + this.flare * 0.25;
    (this.sky.material as THREE.MeshBasicMaterial).color.setRGB(lk, lk * 1.03, lk);
    const pulse = 0.5 + 0.5 * Math.sin(t * 1.1);
    this.floorMat.emissiveIntensity = 0.4 + 0.12 * pulse + this.flare * 0.6;
    this.rimMat.color.setRGB(0.45, 0.95, 1.0).multiplyScalar(1.0 + 0.4 * pulse + this.flare * 0.6);
    this.iceMat.emissiveIntensity = 0.5 + 0.2 * pulse + this.flare * 0.8;
    this.seaMat.color.setRGB(1 + this.flare * 0.1, 1 + this.flare * 0.3, 1 + this.flare * 0.25);
    for (const li of this.lights) {
      const f = 0.9 + 0.1 * Math.sin(t * 2 + li.ph);
      li.l.intensity = li.base * f * (1 + this.flare * 0.6);
    }
    for (const c of this.clouds) {
      c.a += dt * c.w;
      c.s.position.x = Math.cos(c.a) * c.d;
      c.s.position.z = Math.sin(c.a) * c.d;
    }
    this.sky.position.set(fx, 0, fz);
    this.aurora.position.set(fx, 0, fz);
    for (const sp of [this.moonDisc, this.moonGlow]) sp.position.set(fx + this.moonDir.x * 1000, this.moonDir.y * 1000, fz + this.moonDir.z * 1000);
    (this.moonGlow.material as THREE.SpriteMaterial).opacity = 0.6 + this.flare * 0.2;

    // 바람은 달 쪽에서 불어온다
    const wl = Math.hypot(this.moonDir.x, this.moonDir.z) || 1;
    const ux = -this.moonDir.x / wl;
    const uz = -this.moonDir.z / wl;
    const a = this.snow.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < a.count; i++) {
      const sp = this.snowSpeed[i];
      let y = a.getY(i) - dt * sp;
      let x = a.getX(i) + ux * dt * sp * 2.2 + Math.sin(t * 1.3 + i) * dt * 0.5;
      let z = a.getZ(i) + uz * dt * sp * 2.2 + Math.cos(t * 1.1 + i * 1.7) * dt * 0.5;
      if (y < -10) y = 36;
      if (x - fx > 50) x -= 100;
      else if (x - fx < -50) x += 100;
      if (z - fz > 50) z -= 100;
      else if (z - fz < -50) z += 100;
      a.setXYZ(i, x, y, z);
    }
    a.needsUpdate = true;
    const l = this.streaks.geometry.getAttribute('position') as THREE.BufferAttribute;
    const la = l.array as Float32Array;
    for (let i = 0; i < la.length / 6; i++) {
      const sp = this.streakData[i * 2];
      const len = this.streakData[i * 2 + 1];
      let x = la[i * 6] + ux * sp * dt;
      let z = la[i * 6 + 2] + uz * sp * dt;
      if (x - fx > 60) x -= 120;
      else if (x - fx < -60) x += 120;
      if (z - fz > 60) z -= 120;
      else if (z - fz < -60) z += 120;
      la[i * 6] = x;
      la[i * 6 + 2] = z;
      la[i * 6 + 3] = x - ux * len;
      la[i * 6 + 4] = la[i * 6 + 1];
      la[i * 6 + 5] = z - uz * len;
    }
    l.needsUpdate = true;
  }
}
