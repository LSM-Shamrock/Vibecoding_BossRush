import type { KeyPanel } from './keypanel';
import type { Sfx } from './audio';
import { PRESETS, type Graphics, type GfxSettings, type Level, type PresetKey } from './graphics';

type TabId = 'keys' | 'sound' | 'gfx';

/** 설정 창: 왼쪽 탭(조작 키 / 사운드 / 그래픽) + 오른쪽 내용. 보스 선택 화면과 일시정지 화면에서 같이 쓴다 */
export class SettingsPanel {
  readonly el = document.createElement('div');
  private tabs = document.createElement('div');
  private body = document.createElement('div');
  private tab: TabId = 'keys';

  constructor(
    private keys: KeyPanel,
    private sfx: Sfx,
    private gfx: Graphics,
  ) {
    this.el.className = 'settings';
    this.tabs.className = 'st-tabs';
    this.body.className = 'st-body';
    this.el.append(this.tabs, this.body);
    // 설정 창 안의 클릭은 뒤의 오버레이(= 계속하기/시작)로 번지지 않게 한다
    this.el.addEventListener('click', (e) => e.stopPropagation());
  }

  open() {
    this.tab = 'keys';
    this.render();
  }
  close() {
    this.keys.close();
  }

  private render() {
    this.tabs.replaceChildren();
    const mk = (id: TabId, label: string) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `st-tab${this.tab === id ? ' sel' : ''}`;
      b.textContent = label;
      b.addEventListener('click', () => {
        if (this.tab === id) return;
        if (this.tab === 'keys') this.keys.close(); // 키 입력 대기 중이었다면 해제
        this.tab = id;
        this.render();
      });
      this.tabs.append(b);
    };
    mk('keys', '조작 키');
    mk('sound', '사운드');
    mk('gfx', '그래픽');
    const sound = this.soundPane();
    const gfx = this.gfxPane();
    // 탭마다 창 크기가 달라지지 않도록 모든 탭을 같은 칸에 겹쳐 두고 고른 것만 보인다
    for (const [el, id] of [[this.keys.el, 'keys'], [sound, 'sound'], [gfx, 'gfx']] as const) {
      el.classList.toggle('active', this.tab === id);
      el.setAttribute('aria-hidden', String(this.tab !== id));
    }
    this.body.replaceChildren(this.keys.el, sound, gfx);
    if (this.tab === 'keys') {
      this.keys.open();
    }
  }

  private soundPane() {
    // 조작 키 탭과 같은 틀: 머리글 한 줄 + 한 줄짜리 행들
    const pane = document.createElement('div');
    pane.className = 'keypanel st-sound';
    pane.innerHTML = '<div class="kp-top"><div class="kp-head"><span>사운드</span></div></div>';
    const body = document.createElement('div');
    body.className = 'kp-body';
    const grid = document.createElement('div');
    grid.className = 'kp-grid st-grid';
    const row = (label: string, kind: 'master' | 'sfx' | 'bgm') => {
      const l = document.createElement('div');
      l.className = 'kp-label';
      l.textContent = label;
      const slider = document.createElement('input');
      slider.type = 'range';
      slider.min = '0';
      slider.max = '100';
      slider.step = '1';
      slider.value = String(Math.round(this.sfx.vol[kind] * 100));
      const val = document.createElement('b');
      val.className = 'st-val';
      const sync = () => {
        val.textContent = `${slider.value}%`;
        slider.style.setProperty('--p', `${slider.value}%`);
      };
      sync();
      slider.addEventListener('input', () => {
        this.sfx.setVolume(kind, parseInt(slider.value, 10) / 100);
        sync();
      });
      // 효과음은 손을 뗄 때 짧게 들려줘서 크기를 가늠할 수 있게 한다
      if (kind === 'sfx') slider.addEventListener('change', () => { this.sfx.unlock(); this.sfx.ready(); });
      grid.append(l, slider, val);
    };
    row('마스터 볼륨', 'master');
    row('효과음', 'sfx');
    row('배경 음악', 'bgm');
    body.append(grid);
    pane.append(body);
    return pane;
  }

  private gfxPane() {
    const pane = document.createElement('div');
    pane.className = 'keypanel st-gfx';
    pane.innerHTML = '<div class="kp-top"><div class="kp-head"><span>그래픽</span></div></div>';
    const body = document.createElement('div');
    body.className = 'kp-body';
    const grid = document.createElement('div');
    grid.className = 'kp-grid st-grid';
    const syncs: (() => void)[] = [];
    const syncAll = () => syncs.forEach((f) => f());
    const label = (text: string) => {
      const l = document.createElement('div');
      l.className = 'kp-label';
      l.textContent = text;
      return l;
    };

    /** 한 줄짜리 버튼 묶음 (하나만 고른다). get 이 null 이면 아무것도 안 골라진 상태(= 사용자 지정) */
    const seg = <T,>(text: string, opts: [T, string][], get: () => T | null, put: (v: T) => void) => {
      const g = document.createElement('div');
      g.className = 'st-seg';
      const btns = opts.map(([v, t]) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = t;
        b.addEventListener('click', () => {
          put(v);
          syncAll();
        });
        g.append(b);
        return [v, b] as const;
      });
      syncs.push(() => {
        const cur = get();
        for (const [v, b] of btns) b.classList.toggle('sel', v === cur);
      });
      grid.append(label(text), g);
    };
    const set = (patch: Partial<GfxSettings>) => this.gfx.set(patch);
    const OFF_LO_HI: [Level, string][] = [
      [0, '끄기'],
      [1, '낮음'],
      [2, '높음'],
    ];

    seg<PresetKey>('품질 프리셋', (Object.keys(PRESETS) as PresetKey[]).map((k) => [k, PRESETS[k].label]), () => this.gfx.preset(), (k) => this.gfx.applyPreset(k));
    const sep = document.createElement('div');
    sep.className = 'st-sep';
    grid.append(sep);

    // 렌더 해상도: 사운드 탭과 같은 슬라이더 + 값
    {
      const wrap = document.createElement('div');
      wrap.className = 'st-range';
      const slider = document.createElement('input');
      slider.type = 'range';
      slider.min = '50';
      slider.max = '100';
      slider.step = '5';
      const val = document.createElement('b');
      val.className = 'st-val';
      const show = (v: number) => {
        val.textContent = `${v}%`;
        slider.style.setProperty('--p', `${((v - 50) / 50) * 100}%`);
      };
      syncs.push(() => {
        const v = Math.round(this.gfx.v.scale * 100);
        slider.value = String(v);
        show(v);
      });
      // 끄는 동안에는 숫자만 바꾸고, 손을 떼면 적용한다 (렌더타깃을 계속 다시 만들지 않게)
      slider.addEventListener('input', () => show(parseInt(slider.value, 10)));
      slider.addEventListener('change', () => {
        set({ scale: parseInt(slider.value, 10) / 100 });
        syncAll();
      });
      wrap.append(slider, val);
      grid.append(label('렌더 해상도'), wrap);
    }
    seg('그림자', OFF_LO_HI, () => this.gfx.v.shadows, (v) => set({ shadows: v }));
    seg('빛 번짐', OFF_LO_HI, () => this.gfx.v.bloom, (v) => set({ bloom: v }));
    seg<0 | 2 | 4>('안티앨리어싱', [[0, '끄기'], [2, '2x'], [4, '4x']], () => this.gfx.v.aa, (v) => set({ aa: v }));
    seg<Level>('순간 조명', [[0, '낮음'], [1, '중간'], [2, '높음']], () => this.gfx.v.lights, (v) => set({ lights: v }));
    seg<boolean>('FPS 표시', [[true, '켜기'], [false, '끄기']], () => this.gfx.v.fps, (v) => set({ fps: v }));

    syncAll();
    body.append(grid);
    pane.append(body);
    return pane;
  }
}
