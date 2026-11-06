/**
 * 그래픽 설정. 브라우저에 저장되고, 바뀌면 구독자(렌더러 · 조명 · HUD)에 알린다.
 *  - scale   : 렌더 해상도 배율 (화면 크기 × devicePixelRatio(최대 1.5) × scale)
 *  - shadows : 0 끄기 / 1 낮음(1024) / 2 높음(2048)
 *  - bloom   : 0 끄기 / 1 낮음(절반 해상도) / 2 높음
 *  - aa      : MSAA 샘플 수 (0 / 2 / 4)
 *  - lights  : 순간 조명(타격·폭발 섬광) 개수 단계 0 / 1 / 2  → 1개 / 2개 / 4개
 *  - fps     : 오른쪽 위 FPS 표시
 */
export type Level = 0 | 1 | 2;
export type PresetKey = 'low' | 'medium' | 'high';

export interface GfxSettings {
  scale: number;
  shadows: Level;
  bloom: Level;
  aa: 0 | 2 | 4;
  lights: Level;
  fps: boolean;
}

type Quality = Omit<GfxSettings, 'fps'>;

export const PRESETS: Record<PresetKey, { label: string; v: Quality }> = {
  low: { label: '낮음', v: { scale: 0.7, shadows: 0, bloom: 1, aa: 0, lights: 0 } },
  medium: { label: '중간', v: { scale: 0.85, shadows: 1, bloom: 1, aa: 2, lights: 1 } },
  high: { label: '높음', v: { scale: 1, shadows: 2, bloom: 2, aa: 4, lights: 2 } },
};

/** 순간 조명 단계 → 실제 점광원 개수 */
export const FX_LIGHTS: Record<Level, number> = { 0: 1, 1: 2, 2: 4 };

const KEY = 'deepnest.gfx';
const DEFAULT: GfxSettings = { ...PRESETS.high.v, fps: true };

const clampScale = (v: number) => Math.min(1, Math.max(0.5, Number.isFinite(v) ? v : 1));
const lvl = (v: unknown, d: Level): Level => (v === 0 || v === 1 || v === 2 ? v : d);

function load(): GfxSettings {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<GfxSettings> | null;
    if (!raw || typeof raw !== 'object') return { ...DEFAULT };
    return {
      scale: clampScale(Number(raw.scale)),
      shadows: lvl(raw.shadows, DEFAULT.shadows),
      bloom: lvl(raw.bloom, DEFAULT.bloom),
      aa: raw.aa === 0 || raw.aa === 2 || raw.aa === 4 ? raw.aa : DEFAULT.aa,
      lights: lvl(raw.lights, DEFAULT.lights),
      fps: typeof raw.fps === 'boolean' ? raw.fps : DEFAULT.fps,
    };
  } catch {
    return { ...DEFAULT };
  }
}

export class Graphics {
  private s: GfxSettings = load();
  private subs: ((s: Readonly<GfxSettings>) => void)[] = [];

  get v(): Readonly<GfxSettings> {
    return this.s;
  }

  /** 지금 값과 똑같은 프리셋 (하나하나 바꿔서 어느 프리셋과도 다르면 null = 사용자 지정) */
  preset(): PresetKey | null {
    for (const k of Object.keys(PRESETS) as PresetKey[]) {
      const p = PRESETS[k].v;
      if (p.scale === this.s.scale && p.shadows === this.s.shadows && p.bloom === this.s.bloom && p.aa === this.s.aa && p.lights === this.s.lights) return k;
    }
    return null;
  }

  set(patch: Partial<GfxSettings>) {
    const next = { ...this.s, ...patch };
    next.scale = clampScale(Math.round(next.scale * 100) / 100);
    this.s = next;
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* 저장소를 못 쓰면 이번 실행에서만 적용 */
    }
    for (const f of this.subs) f(this.s);
  }

  applyPreset(k: PresetKey) {
    this.set({ ...PRESETS[k].v });
  }

  /** 구독하고 즉시 한 번 호출한다 */
  onChange(f: (s: Readonly<GfxSettings>) => void) {
    this.subs.push(f);
    f(this.s);
  }
}
