import * as THREE from 'three';
import { CFG } from './config';

/**
 * 3층 — 용암 바다 위의 화산암 제단, 제단을 두른 불길, 둘레에 솟은 화산들. 머리 위는 불타는 노을 하늘.
 *
 *   · 색: 자줏빛 붉은 하늘이 지평선으로 갈수록 주황 · 금빛으로 환해지고, 제단은 굳은 용암 껍질, 판 사이 틈으로 용암빛이 새어 나온다. 둘레 화산은 분화구와 비탈의 용암 줄기가 빛난다.
 *   · 지형: 둥근 화산암 제단(들쭉날쭉한 턱 3단) → 제단을 두른 용암 도랑과 불길 → 끓는 용암 바다 → 둘레의 화산들(가까운 다섯, 먼 넷)과 연기 기둥, 떠다니는 화산암 조각.
 *   · 용이 하늘을 날아다니므로 하늘(돔)에 공을 들였다: 불타는 노을과 빛을 받은 뭉게구름, 지는 해. 용이 포효하면 하늘이 번쩍 밝아진다.
 */
const TAU = Math.PI * 2;
const R = CFG.peak.radius;
const LAVA_Y = -3.2; // 구름 바다의 높이

export const VOLC = {
  fog: 0x9a5a4a,
  fogDensity: 0.0042,
  hemiSky: 0xe0a890,
  hemiGround: 0x6a2a1c,
  hemiIntensity: 0.95,
  sun: 0xffa064,
  sunIntensity: 1.4,
  sunPos: [-34, 30, 26] as [number, number, number],
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

/** 하늘 돔 텍스처 (등장방형): 불타는 노을 — 위는 자줏빛 붉은 하늘, 지평선 쪽은 주황 · 금빛으로 환하게 타오르고, 아래에서 빛을 받은 뭉게구름이 떠 있다 */
function makeSky(rand: () => number) {
  const W = 1024;
  const H = 512;
  const { cv, g } = canvas(W, H);
  const gr = g.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, '#2a1430');
  gr.addColorStop(0.18, '#55203a');
  gr.addColorStop(0.32, '#9a3a3c');
  gr.addColorStop(0.42, '#e0663e');
  gr.addColorStop(0.48, '#ffa652');
  gr.addColorStop(0.505, '#ffd88a');
  gr.addColorStop(0.53, '#d0784e');
  gr.addColorStop(1, '#9a5a4a');
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
  // 지평선의 금빛 띠
  for (let i = 0; i < 40; i++) puff(rand() * W, H * (0.47 + rand() * 0.05), 60 + rand() * 90, 0.18, '255,200,120', 0.18 + rand() * 0.18);
  // 뭉게구름: 몸은 붉은 자줏빛, 아래와 가장자리는 지평선의 금빛을 받아 환하다
  for (let c = 0; c < 26; c++) {
    const cx = rand() * W;
    const cy = H * (0.14 + rand() * 0.34);
    const size = 0.8 + rand() * 1.1;
    const n = 7 + Math.floor(rand() * 7);
    const pts: [number, number, number][] = [];
    for (let i = 0; i < n; i++) {
      const k = (i / (n - 1)) * 2 - 1;
      pts.push([cx + k * 80 * size + (rand() - 0.5) * 28, cy + (rand() - 0.5) * 10 * size - (1 - Math.abs(k)) * 10 * size, (22 + rand() * 26) * size * (1 - Math.abs(k) * 0.35)]);
    }
    const low = cy / H > 0.36 ? 1 : 0.55;
    for (const [x, y, r] of pts) puff(x, y + r * 0.4, r * 1.08, 0.62, '255,170,90', 0.45 * low);
    for (const [x, y, r] of pts) puff(x, y, r, 0.72, '150,62,74', 0.85);
    for (const [x, y, r] of pts) puff(x, y + r * 0.3, r * 0.7, 0.6, '255,150,90', 0.4 * low);
    for (const [x, y, r] of pts) puff(x - r * 0.1, y - r * 0.22, r * 0.5, 0.7, '255,196,160', 0.3);
  }
  // 높은 곳의 가는 구름결
  for (let i = 0; i < 20; i++) puff(rand() * W, H * (0.05 + rand() * 0.15), 80 + rand() * 90, 0.09, '230,130,130', 0.16 + rand() * 0.12);
  return tex(cv);
}

/** 지는 해: 흰 금빛 원반과 넓게 번지는 주황 후광 */
function makeSunTex(core: boolean) {
  const S = 256;
  const { cv, g } = canvas(S);
  const gg = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  if (core) {
    gg.addColorStop(0, 'rgba(255,248,225,1)');
    gg.addColorStop(0.42, 'rgba(255,224,160,1)');
    gg.addColorStop(0.52, 'rgba(255,170,90,0.55)');
    gg.addColorStop(0.7, 'rgba(255,140,70,0.12)');
    gg.addColorStop(1, 'rgba(255,120,60,0)');
  } else {
    gg.addColorStop(0, 'rgba(255,190,110,0.5)');
    gg.addColorStop(0.3, 'rgba(255,150,80,0.25)');
    gg.addColorStop(0.65, 'rgba(240,110,70,0.08)');
    gg.addColorStop(1, 'rgba(220,90,60,0)');
  }
  g.fillStyle = gg;
  g.fillRect(0, 0, S, S);
  return tex(cv);
}

/** 용암 바다: 제단 아래로 끓는 용암. 검게 굳은 껍질 사이로 주황 · 금빛 용암이 환하게 흐른다 */
function makeLava(rand: () => number) {
  const S = 512;
  const { cv, g } = canvas(S);
  g.fillStyle = '#8a2a0c';
  g.fillRect(0, 0, S, S);
  for (let i = 0; i < 420; i++) {
    const x = rand() * S;
    const y = rand() * S;
    const r = 12 + rand() * 44;
    const gg = g.createRadialGradient(x, y, 0, x, y, r);
    const b = rand();
    gg.addColorStop(0, b < 0.42 ? 'rgba(255,120,30,0.8)' : b < 0.84 ? 'rgba(46,16,10,0.8)' : 'rgba(255,214,120,0.75)');
    gg.addColorStop(1, 'rgba(138,42,12,0)');
    for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) {
      g.fillStyle = gg;
      g.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
    }
  }
  const t = tex(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/**
 * 제단 바닥: 식어서 굳은 용암 껍질. 크고 작은 판(보로노이 조각)으로 갈라져 있고, 판 사이 틈으로 아래의 용암빛이 새어 나온다(발광 층).
 * 판 모양은 낮은 해상도에서 계산해 키워 그리고(틈이 부드럽게 번진다), 기공 · 잔금은 원래 해상도로 덧그린다.
 */
function makeAltar(rand: () => number) {
  const S = 2048;
  const c = S / 2;
  const px = S / (R * 2);
  const base = canvas(S);
  const glow = canvas(S);
  const g = base.g;
  const e = glow.g;

  // 1) 굳은 용암 판: 흩어진 격자점을 씨앗으로 한 보로노이 (격자라서 이웃 9칸만 보면 된다)
  const L = 512;
  const GN = 16;
  const cell = L / GN;
  const seeds: { x: number; y: number; s: number; hot: number }[] = [];
  for (let gy = 0; gy < GN; gy++) {
    for (let gx = 0; gx < GN; gx++) {
      seeds.push({ x: (gx + 0.12 + rand() * 0.76) * cell, y: (gy + 0.12 + rand() * 0.76) * cell, s: rand(), hot: rand() < 0.8 ? 1 : 0.35 });
    }
  }
  const small = canvas(L);
  const smallGlow = canvas(L);
  const bi = small.g.createImageData(L, L);
  const gi = smallGlow.g.createImageData(L, L);
  const lp = L / (R * 2);
  for (let y = 0; y < L; y++) {
    for (let x = 0; x < L; x++) {
      const gx = Math.floor(x / cell);
      const gy = Math.floor(y / cell);
      let d1 = 1e9;
      let d2 = 1e9;
      let i1 = 0;
      for (let oy = -1; oy <= 1; oy++) {
        const yy = gy + oy;
        if (yy < 0 || yy >= GN) continue;
        for (let ox = -1; ox <= 1; ox++) {
          const xx = gx + ox;
          if (xx < 0 || xx >= GN) continue;
          const i = yy * GN + xx;
          const s = seeds[i];
          const d = (s.x - x) * (s.x - x) + (s.y - y) * (s.y - y);
          if (d < d1) {
            d2 = d1;
            d1 = d;
            i1 = i;
          } else if (d < d2) d2 = d;
        }
      }
      const edge = Math.sqrt(d2) - Math.sqrt(d1); // 판 경계까지의 거리(의 두 배 정도)
      const sd = seeds[i1];
      // 판: 가운데는 조금 밝고(굳은 겉면), 가장자리로 갈수록 어둡게 말려 들어간다
      const k = Math.min(1, edge / (0.9 * lp));
      const sh = (30 + sd.s * 24) * (0.55 + 0.45 * k);
      const o = (y * L + x) * 4;
      bi.data[o] = sh;
      bi.data[o + 1] = sh * 0.82;
      bi.data[o + 2] = sh * 0.74;
      bi.data[o + 3] = 255;
      // 틈의 용암빛
      const t = Math.max(0, 1 - edge / (2.2 * (lp / 8.5)));
      const seam = t * t * sd.hot;
      gi.data[o] = 255 * seam;
      gi.data[o + 1] = (80 + 110 * t) * seam;
      gi.data[o + 2] = 30 * seam;
      gi.data[o + 3] = 255;
    }
  }
  small.g.putImageData(bi, 0, 0);
  smallGlow.g.putImageData(gi, 0, 0);
  g.imageSmoothingEnabled = true;
  e.imageSmoothingEnabled = true;
  g.drawImage(small.cv, 0, 0, S, S);
  e.drawImage(smallGlow.cv, 0, 0, S, S);

  // 2) 현무암 기공 · 거친 알갱이
  for (let i = 0; i < 26000; i++) {
    const x = rand() * S;
    const y = rand() * S;
    g.fillStyle = rand() < 0.65 ? 'rgba(6,4,4,0.5)' : 'rgba(130,108,96,0.16)';
    g.beginPath();
    g.arc(x, y, 1 + rand() * 2.4, 0, TAU);
    g.fill();
  }
  // 3) 판을 가로지르는 가는 잔금 (틈으로 용암이 비친다)
  for (let i = 0; i < 18; i++) {
    let x = c + (rand() - 0.5) * S * 0.9;
    let y = c + (rand() - 0.5) * S * 0.9;
    if (Math.hypot(x - c, y - c) > R * px - 20) continue;
    let a = rand() * TAU;
    const pts: [number, number][] = [[x, y]];
    for (let k = 0; k < 10; k++) {
      a += (rand() - 0.5) * 1.0;
      x += Math.cos(a) * 18;
      y += Math.sin(a) * 18;
      pts.push([x, y]);
    }
    const path = (ctx: CanvasRenderingContext2D) => {
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (const [x2, y2] of pts) ctx.lineTo(x2, y2);
      ctx.stroke();
    };
    g.strokeStyle = 'rgba(4,2,2,0.85)';
    g.lineWidth = 4;
    path(g);
    e.strokeStyle = 'rgba(255,150,50,0.7)';
    e.lineWidth = 2;
    path(e);
  }
  return { map: tex(base.cv), glow: tex(glow.cv) };
}

/**
 * 화산 한 채: 밑면 반지름 1, 높이 1, 밑면이 y=0. 오목하게 휜 비탈(아래가 넓게 퍼진다)에 능선과 골이 패고, 꼭대기는 분화구로 뚫려 있다.
 * uv: u = 둘레, v = 높이 (화산 텍스처의 세로가 높이).
 */
const CRATER = 0.15;
function volcanoGeo(rand: () => number) {
  const SEG = 48;
  const ROWS = 16;
  const ph = [rand() * TAU, rand() * TAU, rand() * TAU];
  const pos: number[] = [];
  const uv: number[] = [];
  for (let j = 0; j <= ROWS; j++) {
    const v = j / ROWS;
    const prof = CRATER + (1 - CRATER) * Math.pow(1 - v, 1.9);
    for (let i = 0; i <= SEG; i++) {
      const u = i / SEG;
      const a = u * TAU;
      // 능선 · 골 (꼭대기와 밑동은 덜 일그러진다)
      const n = 0.09 * Math.sin(a * 5 + ph[0]) + 0.05 * Math.sin(a * 11 + ph[1] + v * 3) + 0.035 * Math.sin(a * 23 + ph[2]);
      const r = prof * (1 + n * Math.sin(Math.PI * Math.min(1, v * 1.15 + 0.08)));
      pos.push(Math.cos(a) * r, v * (1 + (j === ROWS ? 0 : 0.015 * Math.sin(a * 7 + ph[1]))), Math.sin(a) * r);
      uv.push(u, v);
    }
  }
  // 분화구 안쪽 벽: 꼭대기 테두리에서 안으로 살짝 꺼져 들어간다
  const top = ROWS * (SEG + 1);
  for (let i = 0; i <= SEG; i++) {
    const a = (i / SEG) * TAU;
    pos.push(Math.cos(a) * CRATER * 0.7, 0.93, Math.sin(a) * CRATER * 0.7);
    uv.push(i / SEG, 1);
  }
  const idx: number[] = [];
  for (let j = 0; j <= ROWS; j++) {
    if (j === ROWS) {
      for (let i = 0; i < SEG; i++) {
        const a = top + i;
        const b = top + SEG + 1 + i;
        idx.push(a, a + 1, b, b, a + 1, b + 1);
      }
      break;
    }
    for (let i = 0; i < SEG; i++) {
      const a = j * (SEG + 1) + i;
      const b = a + SEG + 1;
      idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

/** 화산 비탈 텍스처: 위는 재가 덮인 회갈색, 아래는 검붉은 바위. 발광 층에는 분화구 테두리의 불빛과 비탈을 타고 흘러내리는 용암 줄기 */
function makeVolcanoTex(rand: () => number) {
  const W = 512;
  const H = 512;
  const base = canvas(W, H);
  const glow = canvas(W, H);
  const g = base.g;
  const e = glow.g;
  const gr = g.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, '#4a3c38');
  gr.addColorStop(0.35, '#5a4038');
  gr.addColorStop(1, '#6a463a');
  g.fillStyle = gr;
  g.fillRect(0, 0, W, H);
  // 비탈을 따라 내려오는 줄무늬(골)와 얼룩
  for (let i = 0; i < 140; i++) {
    const x = rand() * W;
    g.strokeStyle = rand() < 0.5 ? 'rgba(20,12,10,0.35)' : 'rgba(150,120,105,0.14)';
    g.lineWidth = 2 + rand() * 6;
    g.beginPath();
    g.moveTo(x, 0);
    let xx = x;
    for (let y = 0; y < H; y += 32) {
      xx += (rand() - 0.5) * 10;
      g.lineTo(xx, y + 32);
    }
    g.stroke();
  }
  e.fillStyle = '#000';
  e.fillRect(0, 0, W, H);
  // 분화구 테두리의 불빛
  const cg = e.createLinearGradient(0, 0, 0, 60);
  cg.addColorStop(0, 'rgba(255,170,60,1)');
  cg.addColorStop(0.3, 'rgba(255,90,20,0.6)');
  cg.addColorStop(1, 'rgba(255,60,10,0)');
  e.fillStyle = cg;
  e.fillRect(0, 0, W, 60);
  // 용암 줄기: 꼭대기에서 출발해 구불구불 흘러내리며 가늘어진다 (둘레가 이어지도록 양옆으로도 그린다)
  for (let k = 0; k < 9; k++) {
    let x = rand() * W;
    const len = H * (0.35 + rand() * 0.5);
    const pts: [number, number, number][] = [];
    for (let y = 0; y <= len; y += 8) {
      x += (rand() - 0.5) * 9;
      pts.push([x, y, 1 - y / len]);
    }
    for (const ox of [-W, 0, W]) {
      for (const [w, col] of [[16, 'rgba(255,70,10,0.25)'], [7, 'rgba(255,120,30,0.85)'], [2.5, 'rgba(255,220,130,0.95)']] as [number, string][]) {
        e.strokeStyle = col;
        for (let i = 1; i < pts.length; i++) {
          e.lineWidth = w * (0.25 + 0.75 * pts[i][2]);
          e.beginPath();
          e.moveTo(pts[i - 1][0] + ox, pts[i - 1][1]);
          e.lineTo(pts[i][0] + ox, pts[i][1]);
          e.stroke();
        }
      }
    }
  }
  const map = tex(base.cv);
  const gl = tex(glow.cv);
  for (const t of [map, gl]) t.wrapS = THREE.RepeatWrapping;
  return { map, glow: gl };
}

/** 흐린 연기 덩어리 한 장 */
function makePuffTex(rand: () => number) {
  const S = 128;
  const { cv, g } = canvas(S);
  for (let i = 0; i < 18; i++) {
    const a = rand() * TAU;
    const d = rand() * S * 0.18;
    const x = S / 2 + Math.cos(a) * d;
    const y = S / 2 + Math.sin(a) * d;
    const r = S * (0.14 + rand() * 0.16);
    const gg = g.createRadialGradient(x, y, 0, x, y, r);
    gg.addColorStop(0, 'rgba(255,255,255,0.45)');
    gg.addColorStop(0.6, 'rgba(255,255,255,0.2)');
    gg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gg;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  return tex(cv);
}

/** 원기둥 도형의 옆면을 들쭉날쭉하게 (같은 자리의 정점은 같이 움직인다 · 높이는 그대로) */
function jag(geo: THREE.BufferGeometry, rand: () => number, amount: number) {
  const p = geo.getAttribute('position') as THREE.BufferAttribute;
  const offs = new Map<string, number>();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const z = p.getZ(i);
    const r = Math.hypot(x, z);
    if (r < 1e-3) continue;
    const key = `${(Math.atan2(z, x)).toFixed(3)}|${p.getY(i).toFixed(3)}|${r.toFixed(2)}`;
    let o = offs.get(key);
    if (o === undefined) {
      o = (rand() - 0.5) * 2 * amount;
      offs.set(key, o);
    }
    const k = (r + o) / r;
    p.setXYZ(i, x * k, p.getY(i), z * k);
  }
  geo.computeVertexNormals();
  return geo;
}

/**
 * 불길 고리: 반지름 ring 둘레에 불꽃 판을 빙 둘러 세운다. 판은 세로축을 중심으로 늘 카메라를 향하고,
 * 모양(일렁이는 물방울꼴 불길)은 셰이더가 시간에 따라 그린다. 카메라 바로 앞의 불꽃은 흐려져서 화면을 가리지 않는다.
 */
const FLAME_VS = /* glsl */ `
  attribute vec3 aPos;
  attribute vec3 aInfo; // 위상, 폭, 높이
  uniform float uTime;
  varying vec2 vUv;
  varying float vPh;
  varying float vFade;
  void main() {
    vUv = uv;
    vPh = aInfo.x;
    float flick = 1.0 + 0.16 * sin(uTime * 7.0 + aInfo.x * 6.0) + 0.09 * sin(uTime * 13.0 + aInfo.x * 3.0);
    vec3 camR = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
    vec3 right = normalize(vec3(camR.x, 0.0, camR.z) + 1e-5);
    vec3 wp = aPos + right * (position.x * aInfo.y) + vec3(0.0, position.y * aInfo.z * flick, 0.0);
    vec4 mv = viewMatrix * vec4(wp, 1.0);
    vFade = smoothstep(2.5, 8.0, -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;
const FLAME_FS = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  varying float vPh;
  varying float vFade;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  void main() {
    float x = vUv.x - 0.5;
    if (abs(x) > 0.62 - 0.4 * vUv.y || vFade <= 0.0) discard; // 불길 바깥은 계산하지 않는다
    float y = vUv.y;
    float n = noise(vec2(x * 3.0 + vPh * 7.0, y * 3.0 - uTime * 2.4 + vPh * 5.0)) * 0.6
            + 0.2;
    x += (n - 0.5) * 0.3 * y;
    float w = (1.0 - y) * 0.46 * (0.65 + 0.35 * n) + 0.02;
    float body = smoothstep(w, w * 0.25, abs(x));
    body *= smoothstep(0.0, 0.06, y) * (1.0 - smoothstep(0.45, 1.0, y + (n - 0.5) * 0.35));
    float core = smoothstep(w * 0.6, 0.0, abs(x)) * (1.0 - smoothstep(0.05, 0.5, y));
    vec3 col = mix(vec3(0.9, 0.16, 0.02), vec3(1.0, 0.48, 0.08), body) + vec3(1.0, 0.72, 0.3) * core * 0.45;
    gl_FragColor = vec4(col * body * vFade * 0.85, 1.0);
  }
`;

function makeFlameRing(rand: () => number, ring: number, width: number, y: number) {
  const N = 110;
  const plane = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0);
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = plane.index;
  geo.setAttribute('position', plane.getAttribute('position'));
  geo.setAttribute('uv', plane.getAttribute('uv'));
  const pos = new Float32Array(N * 3);
  const info = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const a = (i / N) * TAU + rand() * 0.03;
    const r = ring + (rand() - 0.5) * width * 0.7;
    pos.set([Math.cos(a) * r, y, Math.sin(a) * r], i * 3);
    // 큰 불길과 작은 불길이 섞여 있다
    const big = rand() < 0.35;
    info.set([rand() * 10, big ? 3.0 + rand() * 1.2 : 1.8 + rand() * 0.8, big ? 4.5 + rand() * 2.5 : 2.2 + rand() * 1.6], i * 3);
  }
  geo.setAttribute('aPos', new THREE.InstancedBufferAttribute(pos, 3));
  geo.setAttribute('aInfo', new THREE.InstancedBufferAttribute(info, 3));
  geo.instanceCount = N;
  const mat = new THREE.ShaderMaterial({
    vertexShader: FLAME_VS,
    fragmentShader: FLAME_FS,
    uniforms: { uTime: { value: 0 } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  const m = new THREE.Mesh(geo, mat);
  m.frustumCulled = false;
  return m;
}

export class Volcano {
  readonly group = new THREE.Group();
  private trenchTex: THREE.Texture;
  private trenchMat: THREE.MeshBasicMaterial;
  private flames: THREE.Mesh;
  private lavaTex: THREE.Texture;
  private lavaMat: THREE.MeshBasicMaterial;
  private altarMat: THREE.MeshStandardMaterial;
  private rimMat: THREE.MeshBasicMaterial;
  private sky: THREE.Mesh;
  private sunDisc: THREE.Sprite;
  private sunGlow: THREE.Sprite;
  private sunDir = new THREE.Vector3(VOLC.sunPos[0], 9, VOLC.sunPos[2]).normalize(); // 해: 지평선 가까이 낮게
  private embers: THREE.Points;
  private emberSpeed: Float32Array;
  private lights: { l: THREE.PointLight; base: number; ph: number }[] = [];
  private rocks: { m: THREE.Mesh; y0: number; ph: number; spin: number }[] = [];
  private volcMat: THREE.MeshStandardMaterial;
  private craterMat: THREE.MeshBasicMaterial;
  private smoke: { s: THREE.Sprite; base: THREE.Vector3; size: number; rise: number; ph: number; speed: number; drift: number }[] = [];
  private flare = 0;
  private flareT = 5;
  private bolt = 0; // 번개 번쩍임 0~1
  private boltT = 3;
  private boltQueue = 0;

  constructor(scene: THREE.Scene) {
    const rand = mulberry32(31337);
    const root = this.group;
    scene.add(root);

    /* 하늘 */
    this.sky = new THREE.Mesh(
      new THREE.SphereGeometry(1150, 32, 20),
      new THREE.MeshBasicMaterial({ map: makeSky(rand), side: THREE.BackSide, fog: false, depthWrite: false, toneMapped: false }),
    );
    this.sky.renderOrder = -10;
    this.sky.frustumCulled = false;
    root.add(this.sky);
    const mkSun = (core: boolean, size: number) => {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeSunTex(core), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false }));
      sp.scale.set(size, size, 1);
      sp.renderOrder = -9;
      sp.frustumCulled = false;
      root.add(sp);
      return sp;
    };
    this.sunGlow = mkSun(false, 620);
    this.sunDisc = mkSun(true, 110);

    /* 용암 바다 */
    this.lavaTex = makeLava(rand);
    this.lavaTex.repeat.set(80, 80);
    this.lavaMat = new THREE.MeshBasicMaterial({ map: this.lavaTex, color: new THREE.Color(1, 1, 1), toneMapped: false, fog: true });
    const lava = new THREE.Mesh(new THREE.CircleGeometry(1400, 64).rotateX(-Math.PI / 2), this.lavaMat);
    lava.position.y = LAVA_Y;
    root.add(lava);

    /* 제단: 굳은 용암 껍질 바닥 + 들쭉날쭉한 현무암 턱 세 단 */
    const rock = new THREE.MeshStandardMaterial({ color: 0x3a2e2a, emissive: 0x1a0804, roughness: 0.95, metalness: 0.02, flatShading: true });
    const alt = makeAltar(rand);
    this.altarMat = new THREE.MeshStandardMaterial({ map: alt.map, emissiveMap: alt.glow, emissive: 0xff5a22, emissiveIntensity: 0.45, roughness: 0.85, metalness: 0 });
    const floor = new THREE.Mesh(new THREE.CircleGeometry(R, 96).rotateX(-Math.PI / 2), this.altarMat);
    floor.receiveShadow = true;
    root.add(floor);
    for (let k = 0; k < 3; k++) {
      const rr = R + 0.2 + (k + 1) * 1.6;
      const step = new THREE.Mesh(jag(new THREE.CylinderGeometry(rr, rr + 0.6, 0.9, 72), rand, 0.32), rock);
      step.position.y = -0.46 - k * 0.9;
      step.receiveShadow = true;
      root.add(step);
    }
    // 아래로 좁아지는 기단 (울퉁불퉁한 화산암)
    const side = new THREE.Mesh(
      jag(new THREE.CylinderGeometry(R + 5, R * 0.45, 22, 48, 4, true), rand, 1.4),
      new THREE.MeshStandardMaterial({ color: 0x2a1e1a, emissive: 0x2a0a04, roughness: 0.95, flatShading: true, side: THREE.DoubleSide }),
    );
    side.position.y = -14;
    root.add(side);

    /* 제단을 두른 불꽃: 둘째 단 위의 용암 도랑 + 그 위로 일렁이는 불길 */
    const trenchIn = R + 2.0;
    const trenchOut = R + 3.3;
    this.trenchTex = makeLava(rand);
    this.trenchTex.repeat.set(10, 10);
    this.trenchMat = new THREE.MeshBasicMaterial({ map: this.trenchTex, color: new THREE.Color(1.3, 1.1, 1.0), toneMapped: false });
    const trench = new THREE.Mesh(new THREE.RingGeometry(trenchIn, trenchOut, 128, 1).rotateX(-Math.PI / 2), this.trenchMat);
    trench.position.y = -0.88;
    root.add(trench);
    this.flames = makeFlameRing(rand, (trenchIn + trenchOut) / 2, trenchOut - trenchIn, -0.9);
    root.add(this.flames);
    // 가장자리 용암빛 테두리
    this.rimMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.3, 0.1), transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const rim = new THREE.Mesh(new THREE.RingGeometry(R - 0.45, R + 0.05, 96).rotateX(-Math.PI / 2), this.rimMat);
    rim.position.y = 0.03;
    root.add(rim);

    /* 둘레의 화산들: 용암 바다에서 솟아 분화구가 빛나고, 비탈로 용암이 흘러내리며, 연기가 피어오른다.
       가까운 화산도 용이 선회하는 범위(≈60) 밖에 밑동이 오도록 멀리 둔다 */
    const vt = makeVolcanoTex(rand);
    this.volcMat = new THREE.MeshStandardMaterial({ map: vt.map, emissiveMap: vt.glow, emissive: 0xff7a30, emissiveIntensity: 1.0, roughness: 0.95, flatShading: true });
    const vgeos = [volcanoGeo(rand), volcanoGeo(rand), volcanoGeo(rand)];
    this.craterMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.8, 0.7, 0.18), toneMapped: false });
    const craterGeo = new THREE.CircleGeometry(CRATER * 0.72, 24).rotateX(-Math.PI / 2);
    const puffTex = makePuffTex(rand);
    const glowTex = makeSunTex(false);
    // [각도, 거리, 높이, 밑면 반지름]
    const spots: [number, number, number, number][] = [];
    for (let i = 0; i < 5; i++) spots.push([(i / 5) * TAU + rand() * 0.6, 175 + rand() * 70, 55 + rand() * 45, 85 + rand() * 25]);
    for (let i = 0; i < 4; i++) spots.push([(i / 4) * TAU + 0.4 + rand() * 0.6, 430 + rand() * 160, 150 + rand() * 110, 230 + rand() * 80]);
    for (const [a, d, h, br] of spots) {
      const vg = new THREE.Group();
      vg.position.set(Math.cos(a) * d, LAVA_Y - 2, Math.sin(a) * d);
      vg.rotation.y = rand() * TAU;
      const body = new THREE.Mesh(vgeos[Math.floor(rand() * vgeos.length)], this.volcMat);
      body.scale.set(br, h, br);
      vg.add(body);
      // 분화구 속 용암
      const crater = new THREE.Mesh(craterGeo, this.craterMat);
      crater.scale.set(br, 1, br);
      crater.position.y = h * 0.94;
      vg.add(crater);
      // 분화구 위의 붉은 빛무리
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffa060, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
      halo.scale.set(br * 0.9, br * 0.6, 1);
      halo.position.y = h * 1.02;
      vg.add(halo);
      root.add(vg);
      // 연기 기둥: 연기 덩어리 여러 장이 분화구에서 올라가며 커지고 옅어진다
      const top = new THREE.Vector3(vg.position.x, vg.position.y + h, vg.position.z);
      const n = 7;
      for (let k = 0; k < n; k++) {
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, color: 0x5a4642, transparent: true, opacity: 0, depthWrite: false, fog: true }));
        root.add(s);
        this.smoke.push({ s, base: top, size: br * 0.5, rise: h * 0.9, ph: k / n, speed: 0.035 + rand() * 0.02, drift: rand() * TAU });
      }
    }

    /* 둥둥 뜬 화산암 조각 (틈으로 불빛이 비친다) */
    const rockGeo = new THREE.IcosahedronGeometry(1, 0);
    const floatRock = new THREE.MeshStandardMaterial({ color: 0x5a463e, emissive: 0x3a1206, roughness: 0.95, flatShading: true });
    for (let i = 0; i < 16; i++) {
      const m = new THREE.Mesh(rockGeo, floatRock);
      const a = rand() * TAU;
      const d = 85 + rand() * 90;
      const sc = 3 + rand() * 7;
      m.scale.set(sc, sc * (0.6 + rand() * 0.5), sc);
      m.position.set(Math.cos(a) * d, 4 + rand() * 40, Math.sin(a) * d);
      // 화산 비탈 속에 묻히는 조각은 뺀다
      const buried = spots.some(([va, vd, vh, vbr]) => {
        const rho = Math.hypot(m.position.x - Math.cos(va) * vd, m.position.z - Math.sin(va) * vd) / vbr;
        if (rho >= 1) return false;
        const v = 1 - Math.pow(Math.max(0, (rho - CRATER) / (1 - CRATER)), 1 / 1.9);
        return m.position.y - sc < LAVA_Y - 2 + vh * v + 6;
      });
      if (buried) continue;
      root.add(m);
      this.rocks.push({ m, y0: m.position.y, ph: rand() * TAU, spin: (rand() - 0.5) * 0.3 });
    }

    /* 불씨: 플레이어 주변 상자 안에서 떠오른다 */
    const N = 520;
    const pos = new Float32Array(N * 3);
    this.emberSpeed = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = (rand() - 0.5) * 100;
      pos[i * 3 + 1] = LAVA_Y + rand() * 40;
      pos[i * 3 + 2] = (rand() - 0.5) * 100;
      this.emberSpeed[i] = 1.2 + rand() * 3;
    }
    const eg = new THREE.BufferGeometry();
    eg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.embers = new THREE.Points(
      eg,
      new THREE.PointsMaterial({ color: new THREE.Color(1.8, 0.55, 0.18), size: 0.3, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
    );
    this.embers.frustumCulled = false;
    root.add(this.embers);

    /* 불길 고리의 점광원 (제단 가장자리와 플레이어·용을 불빛으로 물들인다) */
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU + 0.3;
      const l = new THREE.PointLight(0xff6a2a, 8, 34, 1.5);
      l.position.set(Math.cos(a) * (R + 2.6), 2.6, Math.sin(a) * (R + 2.6));
      root.add(l);
      this.lights.push({ l, base: 8, ph: rand() * TAU });
    }
  }

  /** 용이 포효하거나 큰 기술을 쓸 때 하늘이 번쩍 (0~1) */
  pulse(k: number) {
    this.flare = Math.max(this.flare, k);
  }

  update(dt: number, t: number, fx = 0, fz = 0) {
    this.lavaTex.offset.x += dt * 0.004;
    this.lavaTex.offset.y -= dt * 0.0025;
    this.trenchTex.offset.x += dt * 0.02;
    this.trenchTex.offset.y -= dt * 0.012;
    (this.flames.material as THREE.ShaderMaterial).uniforms.uTime.value = t;
    this.flareT -= dt;
    if (this.flareT < 0) {
      this.flare = Math.max(this.flare, 0.8);
      this.flareT = 6 + Math.random() * 8;
    }
    this.flare = Math.max(0, this.flare - dt * 0.9);
    // 번개: 가끔 하늘 전체가 두 번 번쩍인다
    this.boltT -= dt;
    if (this.boltT < 0) {
      this.bolt = 1;
      this.boltQueue = Math.random() < 0.6 ? 1 : 0;
      this.boltT = 3.5 + Math.random() * 6;
    }
    this.bolt = Math.max(0, this.bolt - dt * 5.5);
    if (this.bolt <= 0 && this.boltQueue > 0) {
      this.boltQueue--;
      this.bolt = 0.8;
    }
    const lk = 1 + this.bolt * 0.5 + this.flare * 0.3;
    (this.sky.material as THREE.MeshBasicMaterial).color.setRGB(0.95 * lk, 0.92 * lk, 1.0 * lk);
    const pulse = 0.5 + 0.5 * Math.sin(t * 1.3);
    this.altarMat.emissiveIntensity = 0.4 + 0.15 * pulse + this.flare * 0.7;
    this.rimMat.color.setRGB(1, 0.32, 0.1).multiplyScalar(1.1 + 0.5 * pulse + this.flare * 0.6);
    this.volcMat.emissiveIntensity = 0.85 + 0.25 * pulse + this.flare * 0.6;
    this.craterMat.color.setRGB(1.8, 0.7, 0.18).multiplyScalar(0.85 + 0.2 * Math.sin(t * 2.3) + this.flare * 0.4);
    for (const sm of this.smoke) {
      // 분화구에서 올라가며 커지고, 바람에 한쪽으로 밀리며, 위에서 옅어진다
      const u = (sm.ph + t * sm.speed) % 1;
      sm.s.position.set(sm.base.x + Math.cos(sm.drift) * u * sm.rise * 0.35, sm.base.y + u * sm.rise, sm.base.z + Math.sin(sm.drift) * u * sm.rise * 0.35);
      const sz = sm.size * (0.6 + u * 1.8);
      sm.s.scale.set(sz, sz, 1);
      (sm.s.material as THREE.SpriteMaterial).opacity = Math.min(1, u * 6) * (1 - u) * 0.75;
    }
    this.lavaMat.color.setRGB(1 + this.flare * 0.3 + this.bolt * 0.3, 1 + this.flare * 0.15 + this.bolt * 0.3, 1 + this.bolt * 0.4);
    for (const li of this.lights) {
      const f = 0.88 + 0.12 * Math.sin(t * 9 + li.ph) + 0.06 * Math.sin(t * 23 + li.ph * 2);
      li.l.intensity = li.base * f * (1 + this.flare * 0.5 + this.bolt * 1.5);
    }
    for (const r of this.rocks) {
      r.m.position.y = r.y0 + Math.sin(t * 0.4 + r.ph) * 1.2;
      r.m.rotation.y += dt * r.spin;
      r.m.rotation.x += dt * r.spin * 0.6;
    }
    this.sky.position.set(fx, 0, fz);
    this.sky.rotation.y += dt * 0.004;
    for (const sp of [this.sunDisc, this.sunGlow]) sp.position.set(fx + this.sunDir.x * 1000, this.sunDir.y * 1000, fz + this.sunDir.z * 1000);
    (this.sunGlow.material as THREE.SpriteMaterial).opacity = 0.6 + this.flare * 0.3;

    const a = this.embers.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < a.count; i++) {
      let y = a.getY(i) + dt * this.emberSpeed[i];
      let x = a.getX(i) + Math.sin(t * 0.8 + i) * dt * 0.9 + dt * 0.6;
      let z = a.getZ(i) + Math.cos(t * 0.7 + i * 1.7) * dt * 0.7;
      if (y > 36) y = LAVA_Y + 0.2;
      if (x - fx > 50) x -= 100;
      else if (x - fx < -50) x += 100;
      if (z - fz > 50) z -= 100;
      else if (z - fz < -50) z += 100;
      a.setXYZ(i, x, y, z);
    }
    a.needsUpdate = true;
  }
}
