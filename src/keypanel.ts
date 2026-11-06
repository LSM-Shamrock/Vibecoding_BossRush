import { ACTIONS, codeLabel, GROUP_LABEL, MOUSE_CODES, type ActionGroup, type ActionId, type AssignResult, type Keybinds } from './keybinds';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/**
 * 일시정지 화면에 들어가는 "조작 키" 패널.
 * 칸을 클릭 → 바꿀 키를 누르면 지정 / Esc 취소 / Backspace 비우기.
 * 입력 대기 중에는 키 이벤트를 캡처 단계에서 가로채므로, 누른 키가 게임 동작(일시정지 해제 등)으로 새지 않는다.
 */
export class KeyPanel {
  readonly el = document.createElement('div');
  private grid = document.createElement('div');
  private msgEl = document.createElement('div');
  private listen: { action: ActionId; slot: 0 | 1 } | null = null;

  constructor(private binds: Keybinds) {
    this.el.className = 'keypanel';
    this.grid.className = 'kp-grid';
    this.msgEl.className = 'kp-msg';
    this.setMsg('', '');

    const top = document.createElement('div');
    top.className = 'kp-top';
    const head = document.createElement('div');
    head.className = 'kp-head';
    const ttl = document.createElement('span');
    ttl.textContent = '조작 키';
    head.append(ttl, this.msgEl);
    const rs = document.createElement('span');
    rs.className = 'kp-btn';
    rs.setAttribute('role', 'button');
    rs.dataset.do = 'reset';
    rs.textContent = '기본값';
    head.append(rs);
    top.append(head);
    const body = document.createElement('div');
    body.className = 'kp-body';

    body.append(this.grid);
    this.el.append(top, body);

    this.el.addEventListener('click', (e) => {
      e.stopPropagation(); // 오버레이 클릭(= 계속하기)으로 번지지 않게
      this.click(e.target as HTMLElement);
    });
    window.addEventListener('blur', () => this.cancel());
    this.render();
  }

  /** 일시정지 화면이 열릴 때 */
  get listening() {
    return !!this.listen;
  }
  open() {
    this.cancel(true);
    this.setMsg('', '');
    this.render();
  }
  /** 닫힐 때 (입력 대기 중이었다면 해제) */
  close() {
    this.cancel(true);
  }

  private click(t: HTMLElement) {
    const cap = t.closest<HTMLElement>('[data-slot]');
    if (cap) {
      const action = cap.dataset.action as ActionId;
      const slot = Number(cap.dataset.slot) as 0 | 1;
      if (this.listen && this.listen.action === action && this.listen.slot === slot) this.cancel();
      else this.startListen(action, slot);
      return;
    }
    if (t.closest('[data-do="reset"]')) {
      this.cancel(true);
      this.binds.reset();
      this.setMsg('기본 키로 되돌렸습니다', 'ok');
      this.render();
      return;
    }
    this.cancel(); // 패널의 다른 곳을 누르면 입력 대기만 취소
  }

  private startListen(action: ActionId, slot: 0 | 1) {
    this.cancel(true);
    this.listen = { action, slot };
    window.addEventListener('keydown', this.onKey, true);
    window.addEventListener('mousedown', this.onMouse, true);
    window.addEventListener('contextmenu', this.noMenu, true);
    this.setMsg('바꿀 키를 누르세요 · Esc 취소 · Backspace 비우기', 'hint');
    this.render();
  }

  private cancel(silent = false) {
    if (!this.listen) return;
    this.listen = null;
    window.removeEventListener('keydown', this.onKey, true);
    window.removeEventListener('mousedown', this.onMouse, true);
    // 우클릭으로 지정한 직후 뜨는 contextmenu 까지 막고 나서 해제한다
    window.setTimeout(() => window.removeEventListener('contextmenu', this.noMenu, true), 0);
    if (!silent) {
      this.setMsg('', '');
      this.render();
    }
  }

  private onKey = (e: KeyboardEvent) => {
    const l = this.listen;
    if (!l) return;
    e.preventDefault();
    e.stopImmediatePropagation(); // 게임 입력(Input)에는 전달하지 않는다
    if (e.repeat) return;
    if (e.code === 'Escape') {
      this.cancel();
      return;
    }
    const res = e.code === 'Backspace' || e.code === 'Delete' ? this.binds.clear(l.action, l.slot) : this.binds.assign(l.action, l.slot, e.code);
    this.apply(res);
  };

  /** 입력 대기 중 휠 클릭 · 우클릭 → 그 버튼을 지정 (좌클릭은 다른 칸 선택용으로 그대로 둔다) */
  private onMouse = (e: MouseEvent) => {
    const l = this.listen;
    const code = MOUSE_CODES[e.button];
    if (!l || !code) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    this.apply(this.binds.assign(l.action, l.slot, code));
  };
  private noMenu = (e: Event) => e.preventDefault();

  private apply(res: AssignResult) {
    if (res.ok) {
      this.cancel(true);
      this.setMsg(res.msg, res.msg ? 'ok' : '');
    } else {
      this.setMsg(res.msg, 'err'); // 계속 입력 대기
    }
    this.render();
  }

  private setMsg(text: string, kind: 'ok' | 'err' | 'hint' | '') {
    this.msgEl.textContent = text;
    this.msgEl.hidden = !text;
    this.msgEl.className = `kp-msg ${text ? kind : 'idle'}`;
  }

  private render() {
    const l = this.listen;
    const row = (a: (typeof ACTIONS)[number]) => {
      const slots = this.binds.slots(a.id);
      const cell = (slot: 0 | 1) => {
        const code = slots[slot];
        const on = !!l && l.action === a.id && l.slot === slot;
        const cls = `keycap${on ? ' listening' : ''}${!code && !on ? ' empty' : ''}`;
        return `<div class="kp-cell"><span class="${cls}" role="button" data-action="${a.id}" data-slot="${slot}">${on ? '키를 누르세요' : esc(codeLabel(code))}</span></div>`;
      };
      return `<div class="kp-label">${esc(a.label)}${a.hint ? `<small>${esc(a.hint)}</small>` : ''}</div>${cell(0)}${cell(1)}`;
    };
    // 불꽃 쏘기(좌클릭)는 바꿀 수 없는 키라 공격 묶음 맨 위에 값만 보여준다
    const fixed = (label: string, value: string) => `<div class="kp-label">${label}</div><div class="kp-cell"><span class="keycap fixed">${value}</span></div><div class="kp-cell"></div>`;
    let html = `<div class="kp-th"></div><div class="kp-th">기본</div><div class="kp-th">보조</div>`;
    for (const g of Object.keys(GROUP_LABEL) as ActionGroup[]) {
      html += `<div class="kp-sec">${GROUP_LABEL[g]}</div>`;
      if (g === 'combat') html += fixed('불꽃 쏘기', '좌클릭');
      for (const a of ACTIONS) if (a.group === g) html += row(a);
    }
    this.grid.innerHTML = html;
  }
}
