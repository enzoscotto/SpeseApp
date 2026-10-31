import * as S from './store.js';
import * as C from './calc.js';
import * as Sync from './sync.js';
import { ICONS, ICON_GROUPS } from './icons.js';
import { money, signed, moneyRaw, signedRaw, display, periodLabel, fmtDay, fmtShort, DEBT_TYPES } from './calc.js';

const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ui = { open: new Set(), sel: null, searchOpen: false, tab: 'mese', periodId: null, acct: 'tutti', q: '', statYear: null, catf: '', allMonths: false };

const IC = {
  mese: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
  debiti: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.3"/><path d="M3 20c.5-3.5 3-5.5 6-5.5s5.5 2 6 5.5"/><path d="M17 6.5a3 3 0 0 1 0 5.5M18.5 15c1.6.7 2.6 2.4 2.9 4.5"/></svg>',
  stat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/></svg>',
  altro: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/></svg>',
  searchBtn: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>',
  filter: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"><path d="M3 6h9M18 6h3M3 12h3M12 12h9M3 18h11M20 18h1"/><circle cx="15" cy="6" r="2.2"/><circle cx="9" cy="12" r="2.2"/><circle cx="17" cy="18" r="2.2"/></svg>',
  eye: '<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  eyeoff: '<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.9 17.9A10.6 10.6 0 0 1 12 19c-6.4 0-10-7-10-7a18.6 18.6 0 0 1 5.1-5.9M9.9 4.2A9.9 9.9 0 0 1 12 4c6.4 0 10 7 10 7a18.7 18.7 0 0 1-2.2 3.2M1 1l22 22"/><path d="M14.1 14.1a3 3 0 1 1-4.2-4.2"/></svg>',
  plus: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  left: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  right: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>',
  chev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/></svg>',
  folder: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
  x: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
};

// icone piene delle categorie
const glyph = (name, size = 22) => `<svg class="gl" viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true"><path d="${ICONS[C.glyphKey(name)] || ICONS.tag}"/></svg>`;
const mini = (name, color, size = 15) => `<i class="mini" style="--cc:${color || C.catColor(name)}">${glyph(name, size)}</i>`;

function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2200); }
const num = v => { const n = Number(String(v ?? '').replace(/[€\s]/g, '').replace(/\./g, m => (String(v).includes(',') ? '' : m)).replace(',', '.')); return Number.isFinite(n) ? n : NaN; };
const backupDays = () => S.state.meta.lastBackup ? Math.floor((Date.now() - new Date(S.state.meta.lastBackup)) / 864e5) : null;

// ---------- sheets ----------
// trascinando il foglio verso il basso (dall'intestazione o dal contenuto, se e' in cima) si chiude come su iPhone
function swipeToClose(wrap) {
  const sheet = $('.sheet', wrap), back = $('.back', wrap);
  let g = null, block = false;
  const settle = ms => { sheet.style.transition = `transform ${ms}ms cubic-bezier(.2,.8,.2,1)`; back.style.transition = `opacity ${ms}ms`; };
  const reset = () => { settle(250); sheet.style.transform = ''; back.style.opacity = ''; setTimeout(() => { sheet.style.transition = ''; back.style.transition = ''; }, 260); };
  const scroller = el => {      // il primo contenitore che scorre davvero (elenchi lunghi), se c'e'
    for (; el && el !== wrap; el = el.parentElement) if (el.scrollHeight > el.clientHeight + 1 && /auto|scroll/.test(getComputedStyle(el).overflowY)) return el;
    return null;
  };
  wrap.addEventListener('touchstart', e => {
    g = null; if (e.touches.length !== 1) return;
    const sc = scroller(e.target); block = !sc;       // senza niente da scorrere, la pagina sotto non deve muoversi
    g = { x: e.touches[0].clientX, y: e.touches[0].clientY, dy: 0, t: Date.now(), on: false, sc };
  }, { passive: true });
  wrap.addEventListener('touchmove', e => {
    if (block && e.cancelable) e.preventDefault();
    if (!g) return;
    const dx = e.touches[0].clientX - g.x, dy = e.touches[0].clientY - g.y;
    if (!g.on) {
      if (g.sc && (g.sc.scrollTop > 0 || dy < -6)) { g = null; return; }      // e' lo scorrimento del contenuto
      if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) { g = null; return; }
      if (dy <= 10) return;
      g.on = true; sheet.style.transition = 'none'; back.style.transition = 'none';
    }
    if (e.cancelable) e.preventDefault();
    g.dy = Math.max(0, dy - 10);
    sheet.style.transform = `translate3d(0,${g.dy}px,0)`;
    back.style.opacity = String(Math.max(0, 1 - g.dy / (sheet.offsetHeight * 1.1)));
  }, { passive: false });
  const end = cancel => {
    const d = g; g = null; if (!d || !d.on) return;
    const fast = d.dy / Math.max(1, Date.now() - d.t) > 0.5;
    if (!cancel && (d.dy > Math.min(140, sheet.offsetHeight * 0.3) || (fast && d.dy > 40))) {
      settle(220); sheet.style.transform = `translate3d(0,${sheet.offsetHeight}px,0)`; back.style.opacity = '0';
      setTimeout(() => wrap.remove(), 220);
    } else reset();
  };
  wrap.addEventListener('touchend', () => end(false));
  wrap.addEventListener('touchcancel', () => end(true));
}

function openSheet(title, body, { onSave, saveLabel = 'Salva', deleteLabel, onMount } = {}) {
  const root = $('#sheetRoot');
  const wrap = document.createElement('div');
  const foot = onSave || deleteLabel
    ? `<div class="foot">${deleteLabel ? `<button class="fbtn del" data-del>${esc(deleteLabel)}</button>` : ''}${onSave ? `<button class="fbtn save" data-save>${esc(saveLabel)}</button>` : ''}</div>` : '';
  wrap.innerHTML = `<div class="back"></div><div class="sheet" role="dialog"><div class="head"><button data-x>Chiudi</button><h2>${esc(title)}</h2><span style="width:52px"></span></div><div class="body">${body}</div>${foot}</div>`;
  root.appendChild(wrap);
  const close = () => wrap.remove();
  $('.back', wrap).onclick = close; $('[data-x]', wrap).onclick = close;
  swipeToClose(wrap);
  if (onSave) $('[data-save]', wrap).onclick = async () => { if ((await onSave(wrap)) !== false) close(); };
  onMount && onMount(wrap, close);
  return { el: wrap, close };
}

// ---------- tabs ----------
function renderTabs() {
  const t = (id, label, ic, dot) => `<button data-act="tab" data-id="${id}" class="${ui.tab === id ? 'on' : ''} ${dot ? 'dot' : ''}">${ic}<span>${label}</span></button>`;
  const d = backupDays();
  $('#tabs').innerHTML = '<div class="tabpill">' + t('mese', 'Mese', IC.mese) + t('stat', 'Statistiche', IC.stat) +
    t('altro', 'Altro', IC.altro, Sync.config() ? /^(Errore|Offline)/.test(Sync.status.msg) : S.state.transactions.length > 0 && (d === null || d > 30)) + '</div>' +
    `<button class="plus" data-act="add" aria-label="Aggiungi">${IC.plus}</button>`;
}

function render() {
  if (ui.tab !== 'mese') ui.sel = null;
  renderTabs();
  const v = $('#view');
  v.innerHTML = ({ mese: viewMese, stat: viewStat, altro: viewAltro })[ui.tab]();
  if (ui.tab === 'mese') { renderList(); fitBx(); }
  if (ui.tab === 'stat') { const b = $('.bars.sc'); if (b) b.scrollLeft = b.scrollWidth; }
  renderSelBar();
  renderFab();
}

// i saldi restano su una riga anche con 5 cifre: stessa grandezza per Carta e Contanti
function fitBx() {
  const vs = [...document.querySelectorAll('.bx-v')]; if (!vs.length) return;
  let size = 22; vs.forEach(v => v.style.fontSize = size + 'px');
  while (size > 11 && vs.some(v => v.scrollWidth > v.clientWidth + 0.5)) { size -= 0.5; vs.forEach(v => v.style.fontSize = size + 'px'); }
}
window.addEventListener('resize', fitBx);

// ---------- filtri della lista ----------
function filterSheet() {
  const nNone = S.state.transactions.filter(t => !t.cat).length;
  const row = (val, label, ico) => `<button class="row" data-f="${esc(val)}"><div class="main"><div class="ttl lbl">${ico || ''} ${esc(label)}</div></div>${ui.catf === val ? '<span class="pos">✓</span>' : ''}</button>`;
  const body = `<div class="form"><div class="frow"><label style="width:auto;flex:1;color:var(--text)">Cerca in tutti i mesi</label><label class="switch"><input type="checkbox" id="fAll" ${ui.allMonths ? 'checked' : ''}><i></i></label></div></div>
    <div class="sechead"><span>Categoria</span></div>
    <div class="list">${row('', 'Tutte le categorie') + row('__none', `Senza categoria (${nNone})`) + C.categories().map(c => row(c.name, c.name, mini(c.name, c.color))).join('')}</div>`;
  openSheet('Filtri', body, {
    onMount: (w, close) => {
      $('#fAll', w).onchange = ev => { ui.allMonths = ev.target.checked; render(); };
      w.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { ui.catf = b.dataset.f; if (ui.catf) ui.allMonths = ui.allMonths || false; close(); render(); });
    }
  });
}

// ---------- privacy e cambio mese ----------
const eyeBtn = () => `<button class="iconbtn ${privacyOn() ? 'on' : ''}" data-act="privacy" aria-label="${privacyOn() ? 'Mostra le cifre' : 'Nascondi le cifre'}" aria-pressed="${privacyOn()}">${privacyOn() ? IC.eyeoff : IC.eye}</button>`;
function privacyOn() { try { return localStorage.getItem('privacy') === '1'; } catch { return false; } }
function setPrivacyOn(v) { try { localStorage.setItem('privacy', v ? '1' : '0'); } catch { /* ignore */ } C.setPrivacy(v); }

// Il mese segue il dito e quello vicino entra di lato, come le pagine della schermata Home.
let drag = null, noClickUntil = 0, pageBusy = false;
const PAGE_MS = 300, PAGE_EASE = 'cubic-bezier(.22,.8,.3,1)';
const reduceMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const neighborId = dir => { const ps = S.state.periods, i = ps.findIndex(p => p.id === ui.periodId) + dir; return ps[i]?.id || null; };

function pageHtml(periodId) {       // il contenuto della pagina Mese per un altro mese, senza toccare quella attuale
  const keep = ui.periodId; ui.periodId = periodId;
  const host = document.createElement('div'); host.innerHTML = viewMese();
  renderList($('#listBox', host));
  ui.periodId = keep;
  host.querySelectorAll('[id]').forEach(e => e.removeAttribute('id'));
  return host.innerHTML;
}
function makeGhost(periodId) {
  const v = $('#view'), g = document.createElement('div');
  g.className = 'ghost'; g.innerHTML = pageHtml(periodId);
  Object.assign(g.style, { top: window.scrollY + 'px', left: v.offsetLeft + 'px', width: v.offsetWidth + 'px', padding: getComputedStyle(v).padding });
  $('#app').appendChild(g); fitBx();
  return g;
}
function commitPage(target, ghost) {
  const v = $('#view');
  v.style.transition = 'none'; v.style.transform = '';
  ui.periodId = target; render(); window.scrollTo(0, 0);
  ghost?.remove(); v.style.transition = '';
}
function slideTo(id) {              // cambio mese da elenco o pulsanti: la pagina scorre da sola
  const ps = S.state.periods, i0 = ps.findIndex(p => p.id === ui.periodId), i1 = ps.findIndex(p => p.id === id);
  if (i1 < 0 || i0 === i1 || ui.tab !== 'mese' || reduceMotion() || pageBusy) { ui.periodId = id; ui.tab = 'mese'; render(); window.scrollTo(0, 0); return; }
  const dir = i1 > i0 ? 1 : -1, W = window.innerWidth, v = $('#view'), g = makeGhost(id), ease = `transform ${PAGE_MS}ms ${PAGE_EASE}`;
  pageBusy = true; g.style.transform = `translate3d(${dir * W}px,0,0)`; void g.offsetWidth;
  v.style.transition = g.style.transition = ease;
  v.style.transform = `translate3d(${-dir * W}px,0,0)`; g.style.transform = 'translate3d(0,0,0)';
  setTimeout(() => { commitPage(id, g); pageBusy = false; }, PAGE_MS);
}
function dragTo(dx) {
  const v = $('#view'), W = window.innerWidth, dir = dx < 0 ? 1 : -1;
  if (drag.dir !== dir) {            // cambio di verso: rifaccio la pagina vicina dall'altra parte
    drag.ghost?.remove(); drag.ghost = null; drag.dir = dir; drag.target = neighborId(dir);
    if (drag.target) drag.ghost = makeGhost(drag.target);
  }
  drag.dx = dx;
  v.style.transform = `translate3d(${drag.ghost ? dx : dx * 0.3}px,0,0)`;      // senza mese vicino: effetto elastico
  if (drag.ghost) drag.ghost.style.transform = `translate3d(${dx + dir * W}px,0,0)`;
}
function endDrag(cancelled) {
  const d = drag; drag = null;
  if (!d || d.mode !== 'h') return;
  noClickUntil = Date.now() + 350;    // lo scorrimento non deve aprire il riquadro su cui e' finito il dito
  const v = $('#view'), W = window.innerWidth, dx = d.dx || 0, fast = Math.abs(dx) / Math.max(1, Date.now() - d.t0) > 0.45;
  const go = !cancelled && d.ghost && (Math.abs(dx) > W * 0.3 || (fast && Math.abs(dx) > 40)), ease = `transform ${PAGE_MS}ms ${PAGE_EASE}`;
  v.style.transition = ease; if (d.ghost) d.ghost.style.transition = ease;
  if (go) {
    pageBusy = true;
    v.style.transform = `translate3d(${-d.dir * W}px,0,0)`; d.ghost.style.transform = 'translate3d(0,0,0)';
    setTimeout(() => { commitPage(d.target, d.ghost); pageBusy = false; }, PAGE_MS);
  } else {
    v.style.transform = 'translate3d(0,0,0)'; if (d.ghost) d.ghost.style.transform = `translate3d(${d.dir * W}px,0,0)`;
    setTimeout(() => { v.style.transition = ''; v.style.transform = ''; d.ghost?.remove(); }, PAGE_MS);
  }
}
document.addEventListener('pointerdown', e => {
  drag = !pageBusy && ui.tab === 'mese' && e.isPrimary && e.target.closest('#view') && !e.target.closest('input,select,textarea') && !document.querySelector('#sheetRoot .sheet, .addmenu') && S.state.periods.length
    ? { x: e.clientX, y: e.clientY, id: e.pointerId, mode: null, dx: 0, t0: Date.now(), dir: 0, ghost: null, target: null } : null;
});
document.addEventListener('pointermove', e => {
  if (!drag || e.pointerId !== drag.id) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  if (drag.mode === null) {
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
    drag.mode = Math.abs(dx) > 1.4 * Math.abs(dy) ? 'h' : 'v';
  }
  if (drag.mode === 'h') dragTo(dx);
});
document.addEventListener('pointerup', e => { if (drag && e.pointerId === drag.id) endDrag(false); });
document.addEventListener('pointercancel', () => endDrag(true));
document.addEventListener('click', e => { if (Date.now() < noClickUntil) { e.stopPropagation(); e.preventDefault(); } }, true);

// ---------- MESE ----------
function curPeriod() { return S.period(ui.periodId) || C.currentPeriod(); }

function viewMese() {
  if (!S.state.periods.length) {
    return `<div class="bar"><h1>Le Mie Spese</h1></div><div class="card" style="text-align:center;padding:28px 18px">
      <div style="font-size:44px">📒</div><h2 style="margin:8px 0">Benvenuto!</h2>
      <p class="muted">Non ci sono ancora dati su questo telefono. Se li hai già su GitHub, collega il repository e l’app li scarica.</p>
      <button class="btn" style="margin-top:14px" data-act="${Sync.config() ? 'restoreSync' : 'syncSheet'}">${Sync.config() ? 'Ripristina i dati da GitHub' : 'Collega GitHub e scarica i dati'}</button>
      <label class="btn sec">Importa da file<input type="file" accept=".json,application/json" hidden data-import="replace"></label>
      <button class="btn sec" data-act="startEmpty">Parti da zero</button></div>`;
  }
  const p = curPeriod(); ui.periodId = p.id;
  const st = C.stats(p), i = S.state.periods.findIndex(x => x.id === p.id);
  const isCur = C.currentPeriod()?.id === p.id;
  const ICO_CARD = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="2.5" y="5" width="19" height="14" rx="3"/><path d="M2.5 10h19M6.5 15h4"/></svg>';
  const ICO_CASH = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="2.5" y="6" width="19" height="12" rx="2.5"/><circle cx="12" cy="12" r="2.8"/><path d="M6 9.5v.01M18 14.5v.01"/></svg>';
  const balances = isCur ? `
  <div class="bxs">
    <div class="bx carta"><div class="bx-t">${ICO_CARD}<span>Carta</span></div><div class="bx-v num">${money(st.card.rest)}</div></div>
    <div class="bx contanti"><div class="bx-t">${ICO_CASH}<span>Contanti</span></div><div class="bx-v num">${money(st.cash.rest)}</div></div>
  </div>` : '';
  const pct = p.salary > 0 ? Math.round(st.real / p.salary * 100) : null;
  const level = pct == null ? '' : pct > 100 ? 'over' : pct > 85 ? 'warn' : '';
  const sav = p.salary == null ? `<span>Risparmiato</span><b class="muted">in attesa stipendio</b>`
    : `<span>Risparmiato</span><b class="num">${st.saved >= 0 ? money(st.saved) : '−' + money(-st.saved)}</b>`;
  return `
  <div id="topArea">
  <div class="bar">
    <button class="periodbtn" data-act="pickPeriod"><span>${esc(periodLabel(p))}</span>${IC.chev}</button>
    <div class="nav">
      <button class="iconbtn ${ui.q ? 'on' : ''}" data-act="searchToggle" aria-label="Cerca">${IC.searchBtn}</button>
      <button class="iconbtn ${ui.catf || ui.allMonths ? 'on' : ''}" data-act="filterSheet" aria-label="Filtra per categoria">${IC.filter}</button>
      ${eyeBtn()}
    </div>
  </div>
  ${ui.searchOpen || ui.q ? `<div class="search">${IC.search}<input id="q" type="search" placeholder="Cerca in tutti i mesi" value="${esc(ui.q)}" enterkeyhint="search" autocomplete="off" autocapitalize="off"></div>` : ''}
  ${balances}
  <div class="duo">
    <button class="dbox spent" data-act="summary"><span>Speso</span><b class="num">${money(st.real)}</b></button>
    <button class="dbox saved ${p.salary != null && st.saved < 0 ? 'bad' : ''}" data-act="summary"><span>Risparmiato</span><b class="num">${p.salary == null ? '—' : (st.saved >= 0 ? money(st.saved) : '−' + money(-st.saved))}</b></button>
  </div>
  </div>
  <div class="seg" id="acctSeg">${['tutti', 'carta', 'contanti'].map(a => `<button data-act="acct" data-id="${a}" class="${ui.acct === a ? 'on' : ''}">${{ tutti: 'Tutti', carta: 'Carta', contanti: 'Contanti' }[a]}</button>`).join('')}</div>
  ${ui.catf || ui.allMonths ? `<button class="activef" data-act="clearFilters">${esc(ui.catf === '__none' ? 'Senza categoria' : ui.catf || 'Tutte le categorie')}${ui.allMonths ? ' · tutti i mesi' : ''}<i>✕</i></button>` : ''}
  <div id="listBox"></div>`;
}

function rowHtml(t, showAcct, showPeriod, sub, plain, extra) {
  const debt = S.state.debts.find(d => d.txId === t.id);
  const un = t.unpaid ? `<span class="tag red">Da incassare${t.expected ? ' ' + moneyRaw(Math.max(0, t.expected - t.amount)) : ''}</span>` : '';
  const ico = glyph(t.cat), cc = t.cat ? C.catColor(t.cat) : '';
  const chips = [`<span class="tag ${t.account === 'carta' ? 'card' : 'cash'}">${t.account === 'carta' ? 'Carta' : 'Contanti'}</span>`,
    t.cat ? `<span class="tag cat">${esc(t.cat)}${t.sub ? ' · ' + esc(t.sub) : ''}</span>` : '<span class="tag nocat">Senza categoria</span>',
    debt ? `<span class="tag dbt">${esc(debt.person)}</span>` : '', un, showPeriod ? `<span class="muted">${esc(fmtShort(t.date))}</span>` : '', extra || ''].join('');
  const title = esc(t.cat === 'Riconversione' && t.pair ? display(t) : (t.desc || t.category || '—'));
  const selOn = !plain && ui.sel?.has(t.id), lock = !plain && ui.sel && lockedIds.has(t.id), chk = !plain && ui.sel ? `<span class="chk ${selOn ? 'on' : ''} ${lock ? 'lk' : ''}"></span>` : '';
  return `<button class="mv ${selOn ? 'selected' : ''} ${lock ? 'lock' : ''} ${cc ? 'cc' : ''} ${t.unpaid ? 'unp' : ''} ${sub ? 'sub' : ''} ${t.account === 'carta' ? 'ac-carta' : 'ac-cash'}" ${cc ? `style="--cc:${cc}"` : ''} data-act="editTx" data-id="${t.id}">${chk}<div class="ico">${ico}</div><div class="main"><div class="mvt">${title}</div><div class="chips2">${chips}</div></div>
    <div class="amt num ${t.kind === 'in' ? 'pos' : 'neg'}">${t.kind === 'in' ? '+' : '−'}${moneyRaw(t.amount)}</div></button>`;
}
// ---------- gruppi di movimenti ----------
// Un gruppo ha un nome (meta.groups[gid]) e i suoi movimenti hanno `gid`. Il gruppo e' sempre una tua scelta.
const groupsOn = () => { try { return localStorage.getItem('groups') !== '0'; } catch { return true; } };
const setGroupsOn = v => { try { localStorage.setItem('groups', v ? '1' : '0'); } catch { /* ignore */ } };
const groupsClosed = () => { try { return localStorage.getItem('gclosed') === '1'; } catch { return false; } };
const setGroupsClosed = v => { try { localStorage.setItem('gclosed', v ? '1' : '0'); } catch { /* ignore */ } };
const groups = () => S.state.meta.groups || {};
const gName = gid => groups()[gid]?.name || 'Gruppo';
const gMembers = gid => S.state.transactions.filter(t => t.gid === gid);
const netOf = x => x.kind === 'in' ? x.amount : -x.amount;
const gTotal = list => list.reduce((s, x) => s + netOf(x), 0);
const sgnCls = v => v > 0.005 ? 'pos' : v < -0.005 ? 'neg' : '';
const groupedIds = () => new Set(S.state.transactions.filter(t => t.gid && groups()[t.gid]).map(t => t.id));
let lockedIds = new Set();
async function pruneGroups() {
  const g = groups(), used = new Set(S.state.transactions.map(t => t.gid).filter(Boolean));
  const keep = Object.fromEntries(Object.entries(g).filter(([id]) => used.has(id)));
  if (Object.keys(keep).length !== Object.keys(g).length) await S.setMeta('groups', keep);
}
// i vecchi collegamenti (principale + sotto-movimenti) diventano gruppi con nome
async function migrateGroups() {
  if ((S.state.meta.groupsV || 0) >= 1) return;
  const all = S.state.transactions, byId = new Map(all.map(t => [t.id, t]));
  const par = t => t.of || (String(t.grp || '').includes(':') ? null : t.rientroOf) || null;
  const top = t => { let x = t; for (let i = 0; i < 8; i++) { const p = byId.get(par(x)); if (!p || p === x) break; x = p; } return x; };
  const fam = new Map();
  for (const t of all) { const r = top(t); if (!fam.has(r.id)) fam.set(r.id, []); fam.get(r.id).push(t); }
  const gs = { ...groups() }, upd = [];
  for (const [rid, ms] of fam) {
    if (ms.length < 2) continue;
    const root = byId.get(rid); gs[rid] = { name: root.desc || root.category || 'Gruppo' };
    for (const m of ms) upd.push({ ...m, gid: rid, of: undefined });
  }
  if (upd.length) { await S.bulkSave('transactions', upd); await S.setMeta('groups', gs); }
  await S.setMeta('groupsV', 1);
}
function groupItems(list) {   // list: movimenti gia' filtrati e ordinati -> [{ t } | { gid, kids }]
  const seen = new Map(), out = [];
  for (const t of list) {
    if (!t.gid || !groups()[t.gid]) { out.push({ t }); continue; }
    let g = seen.get(t.gid);
    if (!g) { g = { gid: t.gid, kids: [] }; seen.set(t.gid, g); out.push(g); }
    g.kids.push(t);
  }
  return out;
}
function groupHtml(g, showAcct, showPeriod) {
  const all = gMembers(g.gid), tot = gTotal(all), n = all.length;
  const closed = groupsClosed(), col = closed && !ui.sel && !ui.open.has(g.gid), first = g.kids[0].date;
  const head = `<button class="mv gh" data-act="openGroup" data-id="${g.gid}"><div class="ico">${IC.folder}</div><div class="main"><div class="mvt">${esc(gName(g.gid))}</div><div class="chips2"><span class="muted">${n} ${n === 1 ? 'movimento' : 'movimenti'}</span></div></div><div class="amt num ${sgnCls(tot)}">${signedRaw(tot)}</div>${closed ? `<span class="gtgl ${col ? '' : 'up'}" data-act="toggleGroup" data-id="${g.gid}">${IC.chev}</span>` : ''}</button>`;
  // aperto, il gruppo mostra anche i movimenti degli altri mesi (sfumati): nei conti del mese contano solo quelli del mese
  const mine = new Set(g.kids.map(k => k.id));
  const rows = showPeriod || ui.catf ? g.kids.map(k => ({ t: k })) : all.map(t => ({ t, out: !mine.has(t.id) }));
  rows.sort((a, b) => b.t.date.localeCompare(a.t.date));
  const kids = rows.map(({ t, out }) => {
    const h = rowHtml(t, showAcct, showPeriod || out || t.date !== first, true, out ? '<span class="tag">Altro mese</span>' : '');
    return out ? h.replace('class="mv ', 'class="mv out ') : h;
  }).join('');
  return `<div class="mvg ${col ? 'col' : ''}">${head}${col ? '' : kids}</div>`;
}

const relDay = d => {
  if (d === C.today()) return 'Oggi';
  const y = new Date(); y.setDate(y.getDate() - 1);
  if (d === C.isoDate(y)) return 'Ieri';
  const t = fmtDay(d); return t[0].toUpperCase() + t.slice(1);
};
const byDateDesc = (a, b) => b[0].date.localeCompare(a[0].date) || b[1] - a[1];

function renderList(box = $('#listBox')) {
  if (!box) return;
  box.classList.toggle('selmode', !!ui.sel);
  lockedIds = ui.sel ? groupedIds() : new Set();
  const q = ui.q.trim().toLowerCase();
  const global = !!q || ui.allMonths;
  const okCat = t => !ui.catf || (ui.catf === '__none' ? !t.cat : t.cat === ui.catf);
  const okAcct = t => ui.acct === 'tutti' || t.account === ui.acct;
  const qNone = q === 'senza categoria';   // anche scrivendolo nella ricerca
  let items;
  if (global) {
    items = S.state.transactions.map((t, i) => [t, i]).filter(([t]) => okAcct(t) && okCat(t) && (!q || (qNone ? !t.cat :
      (display(t) + ' ' + (t.cat || '') + ' ' + t.amount + ' ' + (S.state.debts.find(d => d.txId === t.id)?.person || '')).toLowerCase().includes(q))));
  } else {
    items = S.txOf(ui.periodId).map((t, i) => [t, i]).filter(([t]) => okAcct(t) && okCat(t));
  }
  items.sort(byDateDesc);
  if (!items.length) { box.innerHTML = `<div class="empty">${global || ui.catf ? 'Nessun movimento con questi filtri' : 'Nessun movimento.<br>Tocca + per aggiungerne uno.'}</div>`; return; }
  // nelle sezioni Carta e Contanti i movimenti si vedono per intero, senza i riquadri dei gruppi
  const entries = groupsOn() && ui.acct === 'tutti' ? groupItems(items.map(([t]) => t)) : items.map(([t]) => ({ t }));
  let html = '', day = null, shown = entries.slice(0, global ? 300 : 2000), buf = [], dsum = 0;
  const flush = () => { if (day) html += `<div class="dayh"><span>${esc(relDay(day))}</span><span class="num">${signed(dsum)}</span></div><div class="mvs">${buf.join('')}</div>`; buf = []; dsum = 0; };
  for (const en of shown) {
    const date = en.gid ? en.kids[0].date : en.t.date;
    if (date !== day) { flush(); day = date; }
    if (en.gid) { buf.push(groupHtml(en, ui.acct === 'tutti', global)); dsum += gTotal(en.kids); }
    else { buf.push(rowHtml(en.t, ui.acct === 'tutti', global)); dsum += netOf(en.t); }
  }
  flush();
  if (global) html = `<div class="muted" style="margin:10px 4px 0;font-size:13px">${items.length} risultati${items.length > 300 ? ' (primi 300)' : ''} · totale ${signed(items.reduce((s, [t]) => s + (t.kind === 'in' ? t.amount : -t.amount), 0))}</div>` + html;
  box.innerHTML = html;
}

function pickPeriod() {
  const years = [...new Set(S.state.periods.map(C.periodYear))].sort().reverse();
  const body = years.map(y => `<div class="sechead"><span>${y}</span></div><div class="list">${S.state.periods.filter(p => C.periodYear(p) === y).reverse().map(p => {
    const s = C.stats(p);
    return `<button class="row" data-act="gotoPeriod" data-id="${esc(p.id)}"><div class="main"><div class="ttl">${p.id === ui.periodId ? '<b>' : ''}${esc(periodLabel(p))}${p.id === ui.periodId ? '</b>' : ''}</div></div><div class="amt num muted" style="font-weight:400">${s.saved == null ? '' : signed(s.saved)}</div></button>`;
  }).join('')}</div>`).join('');
  openSheet('Scegli il mese', body);
}

function editPeriod() {
  const p = curPeriod(), v = x => x == null ? '' : x;
  openSheet('Dati del mese', `
    <div class="form">
      <div class="frow"><label>Stipendio</label><input id="pSal" inputmode="decimal" placeholder="In attesa…" value="${v(p.salary)}"></div>
      <div class="frow"><label>Inizio carta</label><input id="pCard" inputmode="decimal" value="${v(p.startCard)}"></div>
      <div class="frow"><label>Inizio contanti</label><input id="pCash" inputmode="decimal" value="${v(p.startCash)}"></div>
      <div class="frow"><label>Rettifica</label><input id="pAdj" inputmode="decimal" value="${v(p.adjust || 0)}"></div>
    </div>`, {
    deleteLabel: 'Elimina mese',
    onMount: (w, close) => {
      const del = $('[data-del]', w); if (!del) return;
      del.onclick = async () => {
        if (C.currentPeriod()?.id === p.id) return toast('Il mese corrente non si può eliminare');
        const txs = S.txOf(p.id), ids = txs.map(t => t.id), idset = new Set(ids);
        if (!confirm(txs.length ? `Eliminare ${periodLabel(p)} con i suoi ${txs.length} movimenti? Non si può annullare.` : `Eliminare ${periodLabel(p)}?`)) return;
        await S.bulkRemove('debts', S.state.debts.filter(d => idset.has(d.txId)).map(d => d.id));
        await S.bulkRemove('transactions', ids);
        await S.remove('periods', p.id);
        ui.periodId = C.currentPeriod().id; close(); render(); toast('Mese eliminato');
      };
    },
    onSave: async w => {
      const g = id => $(id, w).value.trim(), n = id => g(id) === '' ? null : num(g(id));
      const sal = n('#pSal'), sc = n('#pCard') ?? 0, sk = n('#pCash') ?? 0, adj = n('#pAdj') ?? 0;
      if ([sal, sc, sk, adj].some(x => x !== null && Number.isNaN(x))) return toast('Controlla i numeri'), false;
      await S.save('periods', { ...p, salary: sal, startCard: sc, startCash: sk, adjust: adj, start: p.start, end: p.end });
      render();
    }
  });
}

// ---------- form movimento ----------
const peopleNames = () => C.people().map(p => p.name).sort((a, b) => a.localeCompare(b));

// ---------- spese per categoria (statistiche) ----------
// Prestiti e riconversioni non sono spese. Un rimborso registrato sulla stessa riga di una spesa (stesso gruppo) la riduce:
// cosi' un acquisto pagato da te e rimborsato da altri conta solo per la parte che ti e' costata davvero.
const NOT_SPEND = new Set(['Riconversione', 'Prestiti e debiti']);
function netSpend(txs) {
  const pools = new Map(), res = new Map();
  for (const t of txs) if (t.kind === 'in' && t.cat === 'Rimborsi e rientri' && (t.gid || t.grp)) pools.set(t.gid || t.grp, (pools.get(t.gid || t.grp) || 0) + t.amount);
  for (const t of txs) {
    if (t.kind !== 'out' || t.pair || NOT_SPEND.has(t.cat)) continue;
    let v = t.amount;
    const key = t.gid || t.grp, pool = key ? pools.get(key) || 0 : 0;
    if (pool > 0) { const take = Math.min(v, pool); pools.set(key, pool - take); v -= take; }
    res.set(t.id, v);
  }
  return res;
}

// ---------- riepilogo del mese ----------
function summarySheet() {
  const p = curPeriod(), st = C.stats(p), isCur = C.currentPeriod()?.id === p.id, when = isCur ? 'Questo mese' : 'In ' + C.monthName(p);
  const cats = new Map(), mtx = S.txOf(p.id), net = netSpend(mtx);
  for (const t of mtx) if (net.has(t.id)) { const k = t.cat || 'Senza categoria'; cats.set(k, (cats.get(k) || 0) + net.get(t.id)); }
  const top = [...cats.entries()].filter(([, v]) => v > 0.005).sort((a, b) => b[1] - a[1]);
  const body = `
    <div class="sumhero">
      <div class="sh-l">${when} hai risparmiato</div>
      <div class="sh-v num ${p.salary != null && st.saved < 0 ? 'neg' : ''}">${p.salary == null ? 'in attesa dello stipendio' : (st.saved >= 0 ? money(st.saved) : '−' + money(-st.saved))}</div>
    </div>
    <div class="card" style="padding:6px 16px">
      <div class="kv"><span>Stipendio</span><b class="num">${p.salary == null ? '—' : money(p.salary)}</b></div>
      <div class="kv"><span>Hai speso</span><b class="num">${money(st.real)}</b></div>
    </div>
    <div class="sechead"><span>Per categoria</span></div>
    <div class="card">${top.map(([k, v]) => `<div class="hbar"><div class="top"><span class="lbl">${mini(k, k === 'Senza categoria' ? '#9CA3AF' : null)} ${esc(k)}</span><span class="num">${money(v)}</span></div><div class="track"><div class="fill" style="width:${v / top[0][1] * 100}%;background:${k === 'Senza categoria' ? '#9CA3AF' : C.catColor(k)}"></div></div></div>`).join('') || '<div class="empty">Nessuna uscita</div>'}</div>
    <button class="btn sec" data-edit>Modifica dati del mese</button>`;
  openSheet(periodLabel(p), body, { onMount: (w, close) => { $('[data-edit]', w).onclick = () => { close(); editPeriod(); }; } });
}

// ---------- menu del + ----------
function openAddMenu() {
  const plus = $('#tabs .plus'); if (!plus) return;
  const r = plus.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const items = [['out', 'Uscita', 'cash-minus', '#e0605c'], ['in', 'Entrata', 'cash-plus', '#2fae76'], ['stipendio', 'Stipendio', 'briefcase', '#8a6be0'], ['prelievo', 'Prelievo', 'bank-transfer-out', '#4a86f0'], ['versamento', 'Versamento', 'bank-transfer-in', '#1fa6a0']];
  const D = 58, STEP = 68;
  const root = document.createElement('div'); root.className = 'addmenu';
  root.innerHTML = '<div class="amback"></div>' + items.map(([k, label, ic, col], n) => {
    const x = cx - D / 2, y = cy - D / 2 - (n + 1) * STEP;
    return `<button class="am" data-k="${k}" style="left:${x}px;top:${y}px;--dx:${cx - D / 2 - x}px;--dy:${cy - D / 2 - y}px;--d:${n * 35}ms"><span class="amdot" style="--cc:${col}"><svg class="gl" viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><path d="${ICONS[ic]}"/></svg></span><span class="amlbl">${label}</span></button>`;
  }).join('') + `<button class="amx" style="left:${cx - 23}px;top:${cy - 23}px" aria-label="Chiudi">${IC.plus.replace('width="26" height="26"', 'width="26" height="26" style="transform:rotate(45deg)"')}</button>`;
  document.body.appendChild(root);
  setTimeout(() => root.classList.add('on'), 20);
  const close = () => { root.classList.remove('on'); setTimeout(() => root.remove(), 200); };
  $('.amback', root).onclick = close; $('.amx', root).onclick = close;
  root.querySelectorAll('.am').forEach(b => b.onclick = () => { close(); const k = b.dataset.k; if (k === 'stipendio') openSalarySheet(); else openTxSheet(null, { kind: k }); });
}

function openSalarySheet() {
  const p = curPeriod();
  openSheet('Stipendio', `<div class="form">
      <div class="frow"><label>Mese</label><span style="flex:1;text-align:right">${esc(periodLabel(p))}</span></div>
      <div class="frow amount"><input id="sAmt" inputmode="decimal" placeholder="0,00" value="${p.salary != null ? C.inAmt(p.salary) : ''}" autocomplete="off"></div>
    </div>`, {
    onMount: w => setTimeout(() => $('#sAmt', w).focus(), 300),
    onSave: async w => {
      const v = num($('#sAmt', w).value);
      if (!(v > 0)) return toast('Inserisci l’importo'), false;
      await S.save('periods', { ...p, salary: C.r2(v) });
      render(); toast('Stipendio registrato ✓');
    }
  });
}

// il rientro di un'uscita: creato dall'app (rientroOf) oppure stesso gruppo/riga degli Excel importati
const findBack = t => t && (S.state.transactions.find(x => x.rientroOf === t.id) ||
  (t.grp && t.kind === 'out' ? S.state.transactions.find(x => x.grp === t.grp && x.id !== t.id && x.kind === 'in' && x.account !== t.account && !x.pair) : null));

// scelta di piu' movimenti da aggiungere a un gruppo (quelli gia' in un gruppo non compaiono)
function pickMany(title, refDate, cb) {
  const ex = groupedIds(), ref = Date.parse(refDate) || Date.now(), sel = new Set();
  openSheet(title, `<div class="search" style="margin-top:0">${IC.search}<input id="pq" type="search" placeholder="Cerca un movimento" autocomplete="off"></div><div id="pres"></div>`, {
    saveLabel: 'Aggiungi',
    onMount: w => {
      const run = () => {
        const q = $('#pq', w).value.trim().toLowerCase();
        const res = S.state.transactions.filter(t => !ex.has(t.id) && (!q || (display(t) + ' ' + (t.cat || '') + ' ' + t.amount).toLowerCase().includes(q)))
          .sort((a, b) => Math.abs(Date.parse(a.date) - ref) - Math.abs(Date.parse(b.date) - ref)).slice(0, 80);
        $('#pres', w).innerHTML = res.length ? `<div class="mvs">${res.map(t => rowHtml(t, true, true, false, true).replace('data-act="editTx"', 'data-pick')
          .replace('class="mv ', `class="mv ${sel.has(t.id) ? 'selected' : ''} `).replace('<div class="ico">', `<span class="chk ${sel.has(t.id) ? 'on' : ''}"></span><div class="ico">`)).join('')}</div>` : '<div class="empty">Nessun movimento</div>';
        $('#pres', w).querySelectorAll('[data-pick]').forEach(b => b.onclick = () => {
          const id = b.dataset.id, on = !sel.has(id); if (on) sel.add(id); else sel.delete(id);
          b.classList.toggle('selected', on); b.querySelector('.chk').classList.toggle('on', on);
        });
      };
      $('#pq', w).oninput = run; run();
    },
    onSave: async () => {
      if (!sel.size) return toast('Seleziona almeno un movimento'), false;
      await cb([...sel]);
    }
  });
}

// scelta di un gruppo esistente (o nuovo) per un movimento
function pickGroup(cb) {
  const gs = Object.keys(groups()).filter(id => gMembers(id).length);
  openSheet('Scegli il gruppo', `<div class="list">${gs.map(id => { const ms = gMembers(id), tot = gTotal(ms); return `<button class="row" data-g="${id}"><div class="main"><div class="ttl">${esc(gName(id))}</div><div class="sm">${ms.length} ${ms.length === 1 ? 'movimento' : 'movimenti'} · ${signedRaw(tot)}</div></div></button>`; }).join('')}<button class="row" data-new><div class="main"><div class="ttl" style="color:var(--accent)">+ Nuovo gruppo</div></div></button></div>`, {
    onMount: (w, close) => {
      w.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { cb(b.dataset.g, null); close(); });
      $('[data-new]', w).onclick = () => { const n = (prompt('Nome del gruppo:') || '').trim(); if (!n) return; cb(S.uid(), n); close(); };
    }
  });
}

// elenco a tendina delle categorie, con le loro icone
function openCatMenu(anchor, cur, pick) {
  const r = anchor.getBoundingClientRect(), vw = window.innerWidth, vh = window.innerHeight;
  const root = document.createElement('div'); root.className = 'catmenu';
  const row = (name, label, ico) => `<button type="button" class="cmrow ${name === (cur || '') ? 'on' : ''}" data-c="${esc(name)}">${ico}<span>${esc(label)}</span>${name === (cur || '') ? '<b>✓</b>' : ''}</button>`;
  root.innerHTML = `<div class="cmback"></div><div class="cmlist" role="listbox">${row('', 'Nessuna categoria', '<i class="mini" style="--cc:var(--muted)">' + glyph('', 15) + '</i>')}${C.categories().map(c => row(c.name, c.name, mini(c.name, c.color, 15))).join('')}</div>`;
  document.body.appendChild(root);
  const list = $('.cmlist', root), width = Math.min(280, vw - 24), below = vh - r.bottom - 14, above = r.top - 14, up = below < 260 && above > below;
  Object.assign(list.style, { width: width + 'px', left: Math.max(12, Math.min(vw - width - 12, r.right - width)) + 'px', maxHeight: Math.min(360, up ? above : below) + 'px', [up ? 'bottom' : 'top']: (up ? vh - r.top + 6 : r.bottom + 6) + 'px' });
  list.querySelector('.on')?.scrollIntoView({ block: 'center' });
  const close = () => root.remove();
  $('.cmback', root).onclick = close;
  list.querySelectorAll('.cmrow').forEach(b => b.onclick = () => { close(); pick(b.dataset.c); });
}

function openTxSheet(existing, preset = {}) {
  const e = existing, debt0 = e && S.state.debts.find(d => d.txId === e.id), ret0 = e && findBack(e);
  const f = {
    kind: e ? e.kind : (preset.kind || 'out'), acct: e ? e.account : (preset.acct || S.state.meta.lastAcct || 'carta'), giro: false, giroDir: 'prelievo',
    cat: e ? (e.cat || null) : null, catManual: !!(e && e.cat), catClicked: false, sub: e?.sub || null, subManual: !!e?.sub,
    more: !!(e && (ret0 || debt0 || e.unpaid)),
  };
  const body = `
    <div class="seg big" id="fKind" style="margin-bottom:12px" ${e ? '' : 'hidden'}><button data-v="out">Uscita</button><button data-v="in">Entrata</button></div>
    <div class="seg" id="fAcct" style="margin-bottom:12px"><button data-v="carta">Carta</button><button data-v="contanti">Contanti</button></div>
    <div class="form">
      <div class="frow amount"><input id="fAmt" inputmode="decimal" placeholder="0,00" value="${e ? C.inAmt(e.amount) : ''}" autocomplete="off"></div>
      <div class="frow"><label>Data</label><input id="fDate" type="date" value="${e ? e.date : C.today()}"></div>
      <div id="fTextRows"><div class="frow"><label>Motivo</label><input id="fDesc" placeholder="Descrizione" value="${esc(e?.desc || '')}" autocomplete="off" autocapitalize="sentences"></div></div>
    </div>
    <div class="form" id="fChips"><div class="frow"><label>Categoria</label><button type="button" class="catsel" id="fCatBtn"></button></div></div>
    <div class="catgrid" id="fSubs" hidden></div>
    <div id="fMore"><button type="button" class="morehd" id="fMoreBtn"><span>Rientro e debito</span><em id="fMoreTag"></em>${IC.chev}</button><div id="fMoreBody" hidden>
    <div class="form" id="fRetBox">
      <div class="frow"><label id="fRetLbl" style="width:auto;flex:1;color:var(--text)"></label><label class="switch"><input type="checkbox" id="fRet"><i></i></label></div>
      <div id="fRetRows" hidden>
        <div class="frow"><label>Importo</label><input id="fRetAmt" inputmode="decimal" placeholder="0,00"></div>
        <div class="frow"><label>Data</label><input id="fRetDate" type="date"></div>
        <div class="frow"><label style="width:auto;flex:1;color:var(--text)">Non ancora ricevuto</label><label class="switch"><input type="checkbox" id="fRetUn"><i></i></label></div>
      </div>
    </div>
    <div class="form" id="fUnBox" hidden>
      <div class="frow"><label style="width:auto;flex:1;color:var(--text)">Non ancora ricevuto (casella rossa)</label><label class="switch"><input type="checkbox" id="fUn"><i></i></label></div>
      <div class="frow" id="fExpRow" hidden><label>Atteso</label><input id="fExp" inputmode="decimal" placeholder="0,00"></div>
    </div>
    <div id="fDebtBox"><div class="form">
      <div class="frow"><label>Debito con</label><select id="fPerson"><option value="">— nessuno —</option>${peopleNames().map(n => `<option ${debt0?.person === n ? 'selected' : ''}>${esc(n)}</option>`).join('')}<option value="__new">+ Nuova persona…</option></select></div>
      <div class="frow" id="fDtRow" hidden><label>Tipo</label><select id="fDt"></select></div>
    </div></div>
    </div></div>
    ${e?.unpaid ? `<button class="btn" data-paid style="margin-top:6px">Segna come incassato</button>` : ''}`;

  openSheet(e ? 'Modifica movimento' : ({ out: 'Nuova uscita', in: 'Nuova entrata', prelievo: 'Prelievo', versamento: 'Versamento' }[f.kind] || 'Nuovo movimento'), body, { deleteLabel: e ? 'Elimina' : null,
    onMount: (w) => {
      const setSeg = (id, val) => $$(`#${id} button`, w).forEach(b => b.classList.toggle('on', b.dataset.v === val));
      const $$ = (s, r) => [...r.querySelectorAll(s)];
      const sync = () => {
        f.giro = f.kind === 'prelievo' || f.kind === 'versamento'; if (f.giro) f.giroDir = f.kind;
        setSeg('fKind', f.kind); setSeg('fAcct', f.acct);
        const sh = w.querySelector('.sheet'); if (f.giro) delete sh.dataset.acct; else sh.dataset.acct = f.acct;
        $('#fAcct', w).hidden = f.giro; $('#fTextRows', w).hidden = f.giro; $('#fChips', w).hidden = f.giro; $('#fDebtBox', w).hidden = f.giro; $('#fMore', w).hidden = f.giro;
        // tipi di debito coerenti con entrata/uscita
        const sel = $('#fDt', w), keep = sel.value || debt0?.type;
        const types = Object.entries(DEBT_TYPES).filter(([, t]) => t.kind === (f.kind === 'in' ? 'in' : 'out'));
        sel.innerHTML = types.map(([k, t]) => `<option value="${k}" ${k === keep ? 'selected' : ''}>${t.label}</option>`).join('');
        $('#fDtRow', w).hidden = !$('#fPerson', w).value;
        $('#fRetBox', w).hidden = f.kind !== 'out';
        $('#fRetLbl', w).textContent = f.acct === 'carta' ? 'Mi rientra come contanti' : 'Mi rientra come carta';
        $('#fRetRows', w).hidden = !$('#fRet', w).checked;
        $('#fUnBox', w).hidden = f.kind !== 'in';
        $('#fExpRow', w).hidden = !$('#fUn', w).checked;
        drawCat();
        const on = [!$('#fRetBox', w).hidden && $('#fRet', w).checked && 'rientro', !$('#fUnBox', w).hidden && $('#fUn', w).checked && 'da incassare', $('#fPerson', w).value && $('#fPerson', w).value !== '__new' && $('#fPerson', w).value].filter(Boolean);
        $('#fMoreTag', w).textContent = on.join(' · ');
        $('#fMoreBody', w).hidden = !f.more; $('#fMore', w).classList.toggle('open', f.more);
      };
      $('#fMoreBtn', w).onclick = () => { f.more = !f.more; sync(); };
      $$('#fKind button', w).forEach(b => b.onclick = () => { f.kind = b.dataset.v; sync(); });
      $$('#fAcct button', w).forEach(b => b.onclick = () => { f.acct = b.dataset.v; sync(); });
      const drawCat = () => {
        $('#fCatBtn', w).innerHTML = (f.cat ? `${mini(f.cat, null, 15)}<span>${esc(f.cat)}</span>` : '<span class="ph">Scegli…</span>') + IC.chev;
        const shop = f.cat === 'Shopping online' && !f.giro;
        $('#fSubs', w).hidden = !shop;
        $$('#fSubs button', w).forEach(b => b.classList.toggle('on', b.dataset.s === f.sub));
      };
      const guessSubNow = () => { if (f.cat === 'Shopping online' && !f.subManual) f.sub = C.guessSub($('#fDesc', w).value || e?.raw || ''); };
      $('#fCatBtn', w).onclick = ev => openCatMenu(ev.currentTarget, f.cat, name => { f.cat = name || null; f.catManual = !!f.cat; f.catClicked = true; guessSubNow(); drawCat(); });
      const buildSubs = () => {
        $('#fSubs', w).innerHTML = C.subs().map(x => `<button data-s="${esc(x)}">${esc(x)}</button>`).join('') + '<button data-newsub>+ Nuovo sito</button>';
        $$('#fSubs button[data-s]', w).forEach(b => b.onclick = () => { f.sub = b.dataset.s; f.subManual = true; drawCat(); });
        $('#fSubs [data-newsub]', w).onclick = async () => {
          const n = (prompt('Nome del sito:') || '').trim(); if (!n) return;
          if (!C.subs().some(x => x.toLowerCase() === n.toLowerCase())) await S.setMeta('subs', [...C.subs().filter(x => x !== 'Altri siti'), n, 'Altri siti']);
          f.sub = C.subs().find(x => x.toLowerCase() === n.toLowerCase()); f.subManual = true; buildSubs(); drawCat();
        };
      };
      buildSubs();
      $('#fDesc', w).addEventListener('input', () => { if (!f.catManual) f.cat = C.guessCat($('#fDesc', w).value, f.kind === 'in' ? 'in' : 'out'); guessSubNow(); drawCat(); });
      drawCat();
      $('#fPerson', w).onchange = ev => {
        if (ev.target.value === '__new') {
          const n = (prompt('Nome della persona:') || '').trim();
          if (n) { const o = new Option(n, n, true, true); ev.target.add(o, ev.target.options.length - 1); S.setMeta('people', [...new Set([...(S.state.meta.people || []), n])]); } else ev.target.value = '';
        }
        sync();
      };
      const ret = $('#fRet', w); let retAmtTouched = !!ret0, retDateTouched = !!ret0;
      if (ret0) { ret.checked = true; $('#fRetAmt', w).value = C.inAmt(ret0.unpaid ? (ret0.expected ?? ret0.amount) : ret0.amount); $('#fRetDate', w).value = ret0.date; $('#fRetUn', w).checked = !!ret0.unpaid; }
      if (e?.unpaid) { $('#fUn', w).checked = true; $('#fExp', w).value = C.inAmt(e.expected ?? e.amount); }
      $('#fUn', w).onchange = sync;
      const paid = $('[data-paid]', w);
      if (paid) paid.onclick = async () => { await S.save('transactions', { ...e, amount: e.expected ?? e.amount, unpaid: undefined, expected: undefined }); w.remove(); render(); toast('Segnato come incassato ✓'); };
      $('#fRetAmt', w).oninput = () => { retAmtTouched = true; };
      $('#fRetDate', w).oninput = () => { retDateTouched = true; };
      $('#fAmt', w).addEventListener('input', () => { if (!retAmtTouched) $('#fRetAmt', w).value = $('#fAmt', w).value; });
      $('#fDate', w).addEventListener('input', () => { if (!retDateTouched) $('#fRetDate', w).value = $('#fDate', w).value; });
      ret.onchange = () => {
        if (ret.checked) { if (!retAmtTouched) $('#fRetAmt', w).value = $('#fAmt', w).value; if (!retDateTouched) $('#fRetDate', w).value = $('#fDate', w).value; }
        sync();
      };
      const del = $('[data-del]', w);
      if (del) del.onclick = async () => {
        const partner = e.pair && S.state.transactions.find(t => t.pair === e.pair && t.id !== e.id);
        if (!confirm(partner ? 'Eliminare questo giroconto (entrambi i movimenti)?' : 'Eliminare questo movimento?')) return;
        const back = findBack(e);
        if (back && !confirm('Questo movimento ha un rientro collegato. Eliminare anche il rientro?')) return;
        if (back) await S.remove('transactions', back.id);
        for (const d of S.state.debts.filter(d => d.txId === e.id || d.txId === partner?.id)) await S.remove('debts', d.id);
        await S.remove('transactions', e.id); if (partner) await S.remove('transactions', partner.id);
        await pruneGroups();
        w.remove(); render(); toast('Eliminato');
      };
      sync();
      if (!e) setTimeout(() => $('#fAmt', w).focus(), 300);
      w._f = f;
    },
    onSave: async w => {
      const amount = num($('#fAmt', w).value) || 0, date = $('#fDate', w).value;
      const unIn = f.kind === 'in' && !f.giro && $('#fUn', w).checked;
      const exp = unIn ? C.r2(num($('#fExp', w).value) || amount) : 0;
      if (!(amount > 0) && !(unIn && exp > 0)) return toast('Inserisci un importo'), false;
      if (!date) return toast('Inserisci la data'), false;
      const amt = C.r2(amount);
      const wantRet = !f.giro && f.kind === 'out' && $('#fRet', w).checked;
      const retUn = wantRet && $('#fRetUn', w).checked;
      const retAmt = wantRet ? C.r2(num($('#fRetAmt', w).value)) : 0, retDate = wantRet ? $('#fRetDate', w).value : '';
      if (wantRet && (!(retAmt > 0) || !retDate)) return toast('Importo e data del rientro'), false;
      if (f.giro) {
        const p = C.ensurePeriodFor(date), pair = S.uid();
        const mk = (account, kind, category, desc) => ({ id: S.uid(), periodId: p.id, date, account, kind, amount: amt, category, desc, pair, grp: pair, cat: 'Riconversione' });
        const out = f.giroDir === 'prelievo'
          ? [mk('carta', 'out', 'Prelievo', 'Bancomat'), mk('contanti', 'in', 'Prelievo', 'Da carta')]
          : [mk('contanti', 'out', 'Versamento', 'Contanti'), mk('carta', 'in', 'Versamento', 'Contanti')];
        for (const t of out) await S.save('transactions', t);
      } else {
        const cat = f.cat || '', desc = $('#fDesc', w).value.trim();
        const sub = cat === 'Shopping online' ? (f.sub || 'Altri siti') : '';
        if (!cat && !desc) return toast('Scegli una categoria o scrivi il motivo'), false;
        let periodId = e?.periodId;
        const per = S.period(periodId);
        if (!per || date < per.start || date > per.end) periodId = C.ensurePeriodFor(date).id;
        const tid = e?.id || S.uid();
        const t = { ...(e || {}), id: tid, grp: wantRet ? (e?.grp || tid) : (e?.grp === tid && !S.state.transactions.some(m => m.grp === tid && m.id !== tid && m.rientroOf !== tid) ? undefined : e?.grp), unpaid: unIn || undefined, expected: unIn ? exp : undefined, periodId, date, account: f.acct, kind: f.kind, amount: amt, category: sub ? cat + ' - ' + sub : cat, desc, cat: cat || undefined, sub: sub || undefined, catSet: (f.catClicked || e?.catSet) || undefined };
        // movimenti importati dagli Excel: se il motivo non cambia, nel foglio resta il testo originale
        if (e && e.raw && e.desc === desc) { t.category = e.category; t.desc = e.desc; t.raw = e.raw; } else delete t.raw;
        if (cat && desc) await S.setMeta('learned', { ...(S.state.meta.learned || {}), [learnKey(desc)]: cat });
        await S.save('transactions', t);
        await pruneGroups();
        const partner = e?.pair && S.state.transactions.find(x => x.pair === e.pair && x.id !== e.id);
        if (partner) await S.save('transactions', { ...partner, amount: amt, date, periodId });
        // debito collegato
        const person = $('#fPerson', w).value, old = S.state.debts.find(d => d.txId === t.id);
        if (person && person !== '__new') {
          const type = $('#fDt', w).value, dt = DEBT_TYPES[type];
          await S.save('debts', { id: old?.id || S.uid(), person, type, amount: C.r2(dt.sign * amt), date, note: display(t), txId: t.id });
        } else if (old) await S.remove('debts', old.id);
        const back = findBack(t) || ret0;
        if (wantRet) {
          const target = f.acct === 'carta' ? 'contanti' : 'carta';
          await S.save('transactions', { ...(back || {}), id: back?.id || S.uid(), periodId: C.ensurePeriodFor(retDate).id, date: retDate, account: target, kind: 'in', amount: retUn ? (back?.unpaid ? back.amount : 0) : retAmt, unpaid: retUn || undefined, expected: retUn ? retAmt : undefined, grp: t.grp,
            category: back ? back.category : 'Rimborsi e rientri', cat: back?.cat || 'Rimborsi e rientri', desc: back ? back.desc : 'Soldi ' + (desc || cat), rientroOf: back ? back.rientroOf : t.id });
        } else if (back) await S.remove('transactions', back.id);
        await S.setMeta('lastAcct', f.acct);
        ui.periodId = periodId;
      }
      render(); toast(e ? 'Modificato' : 'Aggiunto ✓');
    }
  });
}

// ---------- DEBITI ----------
function debtsSheet() {
  const ppl = C.people(), owed = ppl.filter(p => p.bal > 0).reduce((s, p) => s + p.bal, 0), owe = -ppl.filter(p => p.bal < 0).reduce((s, p) => s + p.bal, 0);
  openSheet('Debiti', `<div class="grid2"><div class="card acc"><div class="t">Ti devono</div><div class="v num pos">${money(owed)}</div></div><div class="card acc"><div class="t">Devi</div><div class="v num neg">${money(owe)}</div></div></div>
  ${ppl.length ? `<div class="list">${ppl.map(p => `<button class="row" data-act="person" data-id="${esc(p.name)}"><div class="main"><div class="ttl"><b>${esc(p.name)}</b></div><div class="sm">${p.bal > 0 ? 'ti deve' : p.bal < 0 ? 'devi' : 'in pari'}</div></div><div class="amt num ${p.bal > 0 ? 'pos' : p.bal < 0 ? 'neg' : 'muted'}">${money(Math.abs(p.bal))}</div></button>`).join('')}</div>`
    : `<div class="empty">Nessun debito registrato</div>`}
  <button class="btn sec" data-act="newPerson" style="margin-top:12px">Nuova persona</button>`);
}

function newPerson() {
  const n = (prompt('Nome della persona:') || '').trim(); if (!n) return;
  S.setMeta('people', [...new Set([...(S.state.meta.people || []), n])]).then(() => { $('#sheetRoot').innerHTML = ''; render(); openPerson(n); });
}

function openPerson(name) {
  const draw = () => {
    const ds = S.state.debts.filter(d => d.person === name).sort((a, b) => b.date.localeCompare(a.date));
    const bal = C.r2(ds.reduce((s, d) => s + d.amount, 0));
    return `<div class="card hero" style="text-align:center"><div class="lbl">${bal > 0 ? name + ' ti deve' : bal < 0 ? 'Devi a ' + name : 'In pari con ' + name}</div><div class="big num ${bal > 0 ? 'pos' : bal < 0 ? 'neg' : ''}">${money(Math.abs(bal))}</div></div>
    <div class="btns2">${Object.entries(DEBT_TYPES).map(([k, t]) => `<button class="btn sec" data-dt="${k}">${t.label}</button>`).join('')}</div>
    <button class="btn sec" data-link>Collega movimenti esistenti</button><button class="btn sec" data-fix>Correggi saldo</button>
    <div class="sechead"><span>Storico</span></div>
    ${ds.length ? `<div class="list">${ds.map(d => `<button class="row" data-ed="${d.id}"><div class="main"><div class="ttl">${esc(DEBT_TYPES[d.type]?.label || (d.amount > 0 ? 'Credito' : 'Debito'))}${d.note ? ' · ' + esc(d.note) : ''}</div><div class="sm">${esc(fmtShort(d.date))}${d.txId ? ' · collegato' : ''}</div></div><div class="amt num ${d.amount > 0 ? 'pos' : 'neg'}">${signed(d.amount)}</div></button>`).join('')}</div>` : '<div class="empty">Nessuna voce</div>'}
    <div style="margin-top:18px"><button class="btn red" data-rename>Rinomina / elimina persona</button></div>`;
  };
  const sh = openSheet(name, draw(), {
    onMount: w => {
      const body = $('.body', w);
      const redraw = () => { body.innerHTML = draw(); wire(); render(); };
      const wire = () => {
        body.querySelectorAll('[data-dt]').forEach(b => b.onclick = () => debtEntrySheet(name, b.dataset.dt, redraw));
        $('[data-link]', body).onclick = () => linkSheet(name, redraw);
        $('[data-fix]', body).onclick = async () => {
          const cur = C.r2(S.state.debts.filter(d => d.person === name).reduce((a, d) => a + d.amount, 0));
          const v = prompt(`Saldo attuale con ${name} (positivo = ti deve):`, C.inAmt(cur)); if (v === null) return;
          const target = num(v); if (Number.isNaN(target)) return toast('Numero non valido');
          const diff = C.r2(target - cur); if (!diff) return;
          await S.save('debts', { id: S.uid(), person: name, type: null, amount: diff, date: C.today(), note: 'Correzione saldo', txId: null }); redraw();
        };
        body.querySelectorAll('[data-ed]').forEach(b => b.onclick = () => {
          const d = S.state.debts.find(x => x.id === b.dataset.ed); if (!d) return;
          if (d.txId) { if (confirm('Questa voce è collegata a un movimento. Scollegarla (il movimento resta)?')) S.remove('debts', d.id).then(redraw); }
          else if (confirm('Eliminare questa voce di debito?')) S.remove('debts', d.id).then(redraw);
        });
        $('[data-rename]', body).onclick = async () => {
          const n = prompt('Nuovo nome (lascia vuoto per ELIMINARE la persona e le sue voci):', name);
          if (n === null) return;
          if (n.trim() === '') { if (!confirm('Eliminare ' + name + ' e tutte le sue voci di debito?')) return; for (const d of S.state.debts.filter(d => d.person === name)) await S.remove('debts', d.id); await S.setMeta('people', (S.state.meta.people || []).filter(x => x !== name)); w.remove(); render(); return; }
          for (const d of S.state.debts.filter(d => d.person === name)) await S.save('debts', { ...d, person: n.trim() });
          await S.setMeta('people', [...new Set((S.state.meta.people || []).filter(x => x !== name).concat(n.trim()))]);
          w.remove(); render(); openPerson(n.trim());
        };
      };
      wire();
    }
  });
}

function debtEntrySheet(person, type, done) {
  const dt = DEBT_TYPES[type];
  openSheet(dt.label + ' · ' + person, `
    <div class="form">
      <div class="frow amount"><input id="eAmt" inputmode="decimal" placeholder="0,00"></div>
      <div class="frow"><label>Data</label><input id="eDate" type="date" value="${C.today()}"></div>
      <div class="frow"><label>Nota</label><input id="eNote" placeholder="Facoltativa"></div>
      <div class="frow"><label>Registra su</label><select id="eAcc"><option value="">Solo promemoria</option><option value="carta">Carta (${dt.kind === 'out' ? 'uscita' : 'entrata'})</option><option value="contanti">Contanti (${dt.kind === 'out' ? 'uscita' : 'entrata'})</option></select></div>
    </div>`, {
    onMount: w => setTimeout(() => $('#eAmt', w).focus(), 300),
    onSave: async w => {
      const amt = C.r2(num($('#eAmt', w).value)), date = $('#eDate', w).value, note = $('#eNote', w).value.trim(), acc = $('#eAcc', w).value;
      if (!(amt > 0) || !date) return toast('Importo e data obbligatori'), false;
      let txId = null;
      if (acc) {
        const p = C.ensurePeriodFor(date);
        const cat = type === 'lent' || type === 'borrowed' ? 'Prestito' : 'Rimborso';
        const t = { id: S.uid(), periodId: p.id, date, account: acc, kind: dt.kind, amount: amt, category: cat, cat: 'Prestiti e debiti', desc: person + (note ? ' - ' + note : '') };
        await S.save('transactions', t); txId = t.id;
      }
      await S.save('debts', { id: S.uid(), person, type, amount: C.r2(dt.sign * amt), date, note, txId });
      done(); toast('Registrato ✓');
    }
  });
}

function linkSheet(person, done) {
  const sh = openSheet('Collega movimenti', `<div class="search" style="margin-top:0">${IC.search}<input id="lq" type="search" value="${esc(person)}" autocomplete="off"></div><div id="lres"></div>`, {
    onMount: w => {
      const run = () => {
        const q = $('#lq', w).value.trim().toLowerCase(), linked = new Set(S.state.debts.map(d => d.txId));
        const res = S.state.transactions.map((t, i) => [t, i]).filter(([t]) => !linked.has(t.id) && !t.pair && (!q || display(t).toLowerCase().includes(q))).sort(byDateDesc).slice(0, 80);
        $('#lres', w).innerHTML = res.length ? `<div class="mvs">${res.map(([t]) => rowHtml(t, true, true, false, true).replace('data-act="editTx"', 'data-pick')).join('')}</div>` : '<div class="empty">Nessun movimento</div>';
        $('#lres', w).querySelectorAll('[data-pick]').forEach(b => b.onclick = () => {
          const t = S.state.transactions.find(x => x.id === b.dataset.id);
          const opts = Object.entries(DEBT_TYPES).filter(([, d]) => d.kind === t.kind);
          openSheet(display(t), `<p class="muted">${esc(fmtShort(t.date))} · ${signed(t.kind === 'in' ? t.amount : -t.amount)}</p>` + opts.map(([k, d]) => `<button class="btn sec" data-t="${k}" style="margin-bottom:10px">${d.label}</button>`).join(''), {
            onMount: ww => ww.querySelectorAll('[data-t]').forEach(bb => bb.onclick = async () => {
              const d = DEBT_TYPES[bb.dataset.t];
              await S.save('debts', { id: S.uid(), person, type: bb.dataset.t, amount: C.r2(d.sign * t.amount), date: t.date, note: display(t), txId: t.id });
              ww.remove(); run(); done(); toast('Collegato ✓');
            })
          });
        });
      };
      $('#lq', w).oninput = run; run();
    }
  });
}

// ---------- STATISTICHE ----------
const WEEKDAYS = ['lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato', 'domenica'];
const isoToDate = x => { const [y, m, d] = x.split('-').map(Number); return new Date(y, m - 1, d); };
const dayDiff = (a, b) => Math.round((isoToDate(a) - isoToDate(b)) / 864e5);
const wdIdx = d => (d.getDay() + 6) % 7;   // lunedi = 0

function lineChart(vals) {
  const W = 300, H = 90, pad = 6, mn = Math.min(...vals), span = (Math.max(...vals) - mn) || 1;
  const x = i => pad + i * (W - 2 * pad) / (vals.length - 1), y = v => H - pad - (v - mn) / span * (H - 2 * pad);
  const pts = vals.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  return `<svg class="line" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="lg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b62f0" stop-opacity=".35"/><stop offset="1" stop-color="#2b62f0" stop-opacity="0"/></linearGradient></defs><polygon points="${pad},${H} ${pts} ${W - pad},${H}" fill="url(#lg)"/><polyline points="${pts}" fill="none" stroke="#2b62f0" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>`;
}

// sezioni delle statistiche che si aprono e si chiudono (la scelta si ricorda); all'inizio sono aperte solo le principali
const STAT_DEF = { trend: true, cat: true };
const statOpen = () => { try { return JSON.parse(localStorage.getItem('statopen') || '{}'); } catch { return {}; } };

// sezioni: chiave, titolo, se si puo' mostrare a torta
const STAT_ITEMS = [['now', 'Mese in corso'], ['hero', 'Risparmiato e medie'], ['trend', 'Mese per mese'], ['stip', 'Crescita dello stipendio'], ['saldo', 'Saldo nel tempo'],
  ['record', 'Record'], ['cat', 'Spese per categoria', true], ['quando', 'Quando spendi'], ['conto', 'Carta o contanti', true], ['abb', 'Abbonamenti'], ['top', 'Le spese più alte'],
  ['shop', 'Shopping online per sito', true], ['debiti', 'Debiti'], ['mesi', 'Per mese']];
const statCfg = () => ({ order: [], hide: [], pie: {}, ...(S.state.meta.statCfg || {}) });
const statOrder = () => { const o = statCfg().order, keys = STAT_ITEMS.map(x => x[0]); return [...o.filter(k => keys.includes(k)), ...keys.filter(k => !o.includes(k))]; };

// torta (ciambella) con legenda; items: [{ label, v, color, cat? }]
function donut(items, total, center) {
  let off = 0;
  const segs = items.map(it => {
    const pct = it.v / total * 100, len = Math.max(0, pct - 0.5), seg = `<circle r="15.9155" cx="21" cy="21" fill="none" stroke="${it.color}" stroke-width="6.5" stroke-dasharray="${len.toFixed(2)} ${(100 - len).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 21 21)"/>`;
    off += pct; return seg;
  }).join('');
  return `<div class="card"><svg class="donut" viewBox="0 0 42 42" role="img" aria-label="Grafico a torta"><circle r="15.9155" cx="21" cy="21" fill="none" stroke="var(--chip)" stroke-width="6.5"/>${segs}<text x="21" y="22.3" text-anchor="middle">${center}</text></svg>
    <div class="plist">${items.map(it => `<${it.cat ? `button data-act="searchCat" data-id="${esc(it.cat)}"` : 'div'} class="prow"><span class="dotc" style="--c:${it.color}">${esc(it.label)}</span><span class="num">${money(it.v)} <span class="muted">· ${Math.round(it.v / total * 100)}%</span></span></${it.cat ? 'button' : 'div'}>`).join('')}</div></div>`;
}

function viewStat() {
  const head = `<div class="bar"><h1>Statistiche</h1><div class="nav"><button class="iconbtn" data-act="statSettings" aria-label="Personalizza le statistiche">${IC.filter}</button>${eyeBtn()}</div></div>`;
  const ps = S.state.periods;
  if (!ps.length) return head + '<div class="empty">Nessun dato</div>';
  const years = [...new Set(ps.map(C.periodYear))].sort();
  if (!ui.statYear || (ui.statYear !== 'tutto' && !years.includes(ui.statYear))) ui.statYear = years[years.length - 1];
  const today = C.today(), cfg = statCfg();
  const rows = ps.filter(p => ui.statYear === 'tutto' || C.periodYear(p) === ui.statYear).map(p => ({ p, s: C.stats(p) }));
  const tot = rows.reduce((a, { p, s }) => ({ sal: a.sal + (p.salary || 0), real: a.real + s.real, sav: a.sav + (s.saved || 0) }), { sal: 0, real: 0, sav: 0 });
  const rate = tot.sal > 0 ? tot.sav / tot.sal * 100 : null;

  // giorni trascorsi e spesa per giorno della settimana
  const wdCnt = Array(7).fill(0), wdSum = Array(7).fill(0); let days = 0;
  for (const { p } of rows) for (let d = isoToDate(p.start), e = isoToDate(p.end < today ? p.end : today); d <= e; d.setDate(d.getDate() + 1)) { wdCnt[wdIdx(d)]++; days++; }

  // spese nette (senza prestiti e ricariche tra i tuoi conti)
  const rtx = rows.flatMap(({ p }) => S.txOf(p.id)), net = netSpend(rtx);
  const cats = new Map(), subs = new Map(), subsc = new Map(), dayTot = new Map(), accs = { carta: 0, contanti: 0 }; let outTot = 0;
  for (const t of rtx) {
    const v = net.get(t.id); if (!(v > 0)) continue;
    const k = t.cat || 'Senza categoria';
    cats.set(k, (cats.get(k) || 0) + v); outTot += v; accs[t.account] += v;
    dayTot.set(t.date, (dayTot.get(t.date) || 0) + v);
    wdSum[wdIdx(isoToDate(t.date))] += v;
    if (t.cat === 'Shopping online') { const sk = t.sub || 'Altri siti'; subs.set(sk, (subs.get(sk) || 0) + v); }
    if (t.cat === 'Abbonamenti') {
      const key = (t.desc || t.category || '').trim().toLowerCase(), e = subsc.get(key) || { name: t.desc || t.category || '—', n: 0, tot: 0, last: t };
      e.n++; e.tot += v; if (t.date >= e.last.date) e.last = t; subsc.set(key, e);
    }
  }
  const catAll = [...cats.entries()].sort((a, b) => b[1] - a[1]), top = catAll.slice(0, 14);
  const subList = [...subs.entries()].sort((a, b) => b[1] - a[1]);
  const subscList = [...subsc.values()].sort((a, b) => b.last.amount - a.last.amount).slice(0, 8);
  const big = rtx.filter(t => net.get(t.id) > 0).sort((a, b) => net.get(b.id) - net.get(a.id)).slice(0, 5);
  const catColor = k => k === 'Senza categoria' ? '#9CA3AF' : C.catColor(k);

  // mese in corso
  const cp = C.currentPeriod(); let now = '';
  if (cp && cp.start <= today && today <= cp.end) {
    const cs = C.stats(cp), total = dayDiff(cp.end, cp.start) + 1, el = dayDiff(today, cp.start) + 1, perDay = cs.real / el, proj = perDay * total, sal = cp.salary;
    now = `<div class="card nowc"><div class="t">Mese in corso · ${esc(C.monthName(cp))}</div>
      <div class="v num">${money(cs.real)} <small>spesi in ${el} ${el === 1 ? 'giorno' : 'giorni'}</small></div>
      ${sal > 0 ? `<div class="hbar"><div class="track"><div class="fill" style="width:${Math.min(100, cs.real / sal * 100)}%"></div></div></div>` : ''}
      <div class="sm">${perDay > 0 ? `${money(perDay)} al giorno. A questo ritmo chiudi il mese a circa <b class="num">${money(proj)}</b>${sal > 0 ? `, il ${Math.round(proj / sal * 100)}% dello stipendio` : ''}.` : 'Ancora nessuna spesa questo mese.'}</div></div>`;
  }

  // record
  const doneRows = rows.filter(r => r.p.end < today), spent = doneRows.filter(r => r.s.real > 0), saved = doneRows.filter(r => r.s.saved != null);
  const pick = (list, f, better) => list.length ? list.reduce((a, b) => better(f(b), f(a)) ? b : a) : null;
  const dear = pick(spent, r => r.s.real, (b, a) => b > a), cheap = pick(spent, r => r.s.real, (b, a) => b < a), best = pick(saved, r => r.s.saved, (b, a) => b > a);
  let topDay = null; for (const [d, v] of dayTot) if (!topDay || v > topDay[1]) topDay = [d, v];
  const tile = (t, v, sub, id) => `<${id ? `button data-act="gotoPeriod" data-id="${esc(id)}"` : 'div'} class="card acc"><div class="t">${t}</div><div class="v num">${v}</div><div class="s">${sub}</div></${id ? 'button' : 'div'}>`;
  const records = [dear && tile('Mese più caro', money(dear.s.real), esc(periodLabel(dear.p)), dear.p.id), cheap && tile('Mese più leggero', money(cheap.s.real), esc(periodLabel(cheap.p)), cheap.p.id),
    best && tile('Miglior risparmio', money(best.s.saved), esc(periodLabel(best.p)), best.p.id), topDay && tile('Giorno più costoso', money(topDay[1]), esc(fmtShort(topDay[0])))].filter(Boolean);

  // grafici
  const max = Math.max(1, ...rows.map(r => Math.max(r.s.real, r.s.saved || 0)));
  const lbl = pp => { const m = C.MESI_BREVI[+pp.start.slice(5, 7) - 1]; return ui.statYear === 'tutto' ? `${m}<br>${pp.start.slice(2, 4)}` : m; };
  const bal = rows.map(r => r.s.total), dBal = bal.length ? bal[bal.length - 1] - bal[0] : 0;
  const avgWd = wdSum.map((v, i) => wdCnt[i] ? v / wdCnt[i] : 0), maxWd = Math.max(0, ...avgWd), hotWd = avgWd.indexOf(maxWd);
  const accTot = accs.carta + accs.contanti, pc = accTot ? accs.carta / accTot * 100 : 0;
  const ppl = C.people(), owed = ppl.filter(x => x.bal > 0).reduce((a, x) => a + x.bal, 0), owe = -ppl.filter(x => x.bal < 0).reduce((a, x) => a + x.bal, 0);

  // crescita dello stipendio: sempre su tutta la storia, non solo sull'anno scelto
  const sp = ps.filter(p => p.salary > 0), salYears = [...new Set(sp.map(C.periodYear))].sort();
  const yAvg = y => { const l = sp.filter(p => C.periodYear(p) === y); return { n: l.length, avg: l.reduce((a, p) => a + p.salary, 0) / l.length }; };
  const dSal = sp.length >= 2 ? sp[sp.length - 1].salary - sp[0].salary : 0, pSal = sp.length >= 2 ? dSal / sp[0].salary * 100 : 0;

  const so = statOpen();
  const sec = (key, title, right, body) => {
    const open = so[key] ?? !!STAT_DEF[key];
    return `<div class="ssec"><button class="sechead sh" data-act="statToggle" data-id="${key}" aria-expanded="${open}"><span>${title}</span><span class="sr">${right || ''}<i class="gch ${open ? 'up' : ''}">${IC.chev}</i></span></button><div class="sbody" ${open ? '' : 'hidden'}>${body}</div></div>`;
  };
  const blocks = {
    now,
    hero: `<div class="card hero"><div class="t">Risparmiato</div><div class="v num ${tot.sav >= 0 ? 'pos' : 'neg'}">${signed(tot.sav).replace('+', '')}</div><div class="sm">${rate !== null ? `${Math.round(rate)}% degli stipendi` : 'in attesa degli stipendi'}</div></div>
  <div class="grid2">
    <div class="card acc"><div class="t">Stipendi</div><div class="v num">${money(tot.sal)}</div></div>
    <div class="card acc"><div class="t">Spesa reale</div><div class="v num">${money(tot.real)}</div></div>
    <div class="card acc"><div class="t">Media al mese</div><div class="v num">${money(rows.length ? tot.real / rows.length : 0)}</div></div>
    <div class="card acc"><div class="t">Media al giorno</div><div class="v num">${money(days ? tot.real / days : 0)}</div></div>
  </div>`,
    trend: sec('trend', 'Mese per mese', '<span style="color:var(--carta)">■</span> spesa <span style="color:var(--cash)">■</span> risparmio',
      `<div class="card"><div class="bars ${rows.length > 9 ? 'sc' : ''}">${rows.map(({ p, s }) => `<button class="b" data-act="gotoPeriod" data-id="${esc(p.id)}"><div style="display:flex;gap:2px;align-items:flex-end;width:100%;height:100%"><div class="col" style="height:${Math.max(1, s.real / max * 100)}%"></div><div class="col sv" style="height:${Math.max(1, Math.max(0, s.saved || 0) / max * 100)}%"></div></div><div class="m">${lbl(p)}</div></button>`).join('')}</div></div>`),
    stip: sec('stip', 'Crescita dello stipendio', sp.length ? `<span class="num">ultimo ${money(sp[sp.length - 1].salary)}</span>` : '', sp.length >= 2
      ? `<div class="card"><div class="lv"><b class="num">${money(sp[sp.length - 1].salary)}</b><span class="num ${dSal >= 0 ? 'pos' : 'neg'}">${signed(dSal)} · ${pSal >= 0 ? '+' : '−'}${Math.abs(Math.round(pSal))}%</span></div>${lineChart(sp.map(p => p.salary))}<div class="lax"><span>${esc(periodLabel(sp[0]))} · ${money(sp[0].salary)}</span><span>${esc(periodLabel(sp[sp.length - 1]))}</span></div></div>
         <div class="list">${salYears.map((y, i) => { const a = yAvg(y), prev = i ? yAvg(salYears[i - 1]) : null, d = prev ? (a.avg - prev.avg) / prev.avg * 100 : null;
           return `<div class="row"><div class="main"><div class="ttl">${y}</div><div class="sm">${a.n} ${a.n === 1 ? 'stipendio' : 'stipendi'}</div></div><div style="text-align:right"><div class="amt num">${money(a.avg)} <span class="muted" style="font-weight:500">al mese</span></div>${d === null ? '' : `<div class="sm num ${d >= 0 ? 'pos' : 'neg'}">${d >= 0 ? '+' : '−'}${Math.abs(d).toFixed(1).replace('.', ',')}% sull’anno prima</div>`}</div></div>`; }).join('')}</div>`
      : '<div class="card"><div class="sm" style="color:var(--muted)">Servono almeno due mesi con lo stipendio registrato.</div></div>'),
    saldo: rows.length >= 2 ? sec('saldo', 'Saldo nel tempo', 'carta + contanti',
      `<div class="card"><div class="lv"><b class="num">${money(bal[bal.length - 1])}</b><span class="num ${dBal >= 0 ? 'pos' : 'neg'}">${signed(dBal)}</span></div>${lineChart(bal)}<div class="lax"><span>${esc(periodLabel(rows[0].p))}</span><span>${esc(periodLabel(rows[rows.length - 1].p))}</span></div></div>`) : '',
    record: records.length ? sec('record', 'Record', '', `<div class="grid2">${records.join('')}</div>`) : '',
    cat: sec('cat', 'Spese per categoria', `<span class="num">${money(outTot)}</span>`,
      (cfg.pie.cat && outTot > 0
        ? donut([...catAll.slice(0, 7).map(([k, v]) => ({ label: k, v, color: catColor(k), cat: k })), ...(catAll.length > 7 ? [{ label: 'Altre', v: catAll.slice(7).reduce((a, [, v]) => a + v, 0), color: '#6B7280' }] : [])], outTot, money(outTot))
        : `<div class="card">${top.map(([k, v]) => `<button class="hbar" style="display:block;width:100%;text-align:left" data-act="searchCat" data-id="${esc(k)}"><div class="top"><span class="lbl">${mini(k, k === 'Senza categoria' ? '#9CA3AF' : null)} ${esc(k)}</span><span class="num">${money(v)} <span class="muted" style="font-weight:600">· ${Math.round(v / outTot * 100)}%</span></span></div><div class="track"><div class="fill" style="width:${v / top[0][1] * 100}%;background:${C.catColor(k)}"></div></div></button>`).join('') || '<div class="empty">—</div>'}</div>`)
      + `<p class="hint" style="margin:-4px 4px 0">Prestiti e ricariche tra i tuoi conti non contano come spesa. Un rimborso nello stesso gruppo o sulla stessa riga riduce la spesa.</p>`),
    quando: outTot > 0 ? sec('quando', 'Quando spendi', 'media per giorno',
      `<div class="card"><div class="wd">${avgWd.map((v, i) => `<div class="${i === hotWd ? 'hot' : ''}"><i style="height:${Math.max(3, maxWd ? v / maxWd * 100 : 0)}%"></i><span>${WEEKDAYS[i][0].toUpperCase()}</span></div>`).join('')}</div><div class="sm" style="margin-top:10px;color:var(--muted);font-weight:600">Spendi di più di ${WEEKDAYS[hotWd]}: in media <b class="num" style="color:var(--text)">${money(maxWd)}</b>.</div></div>`) : '',
    conto: outTot > 0 ? sec('conto', 'Carta o contanti', 'dove paghi', cfg.pie.conto
      ? donut([{ label: 'Carta', v: accs.carta, color: cssColor('--carta') || '#2f6af2' }, { label: 'Contanti', v: accs.contanti, color: cssColor('--cash') || '#10b981' }].filter(x => x.v > 0), outTot, money(outTot))
      : `<div class="card"><div class="split"><i style="width:${pc}%;background:var(--carta)"></i><i style="flex:1;background:var(--cash)"></i></div><div class="legend"><span><span class="dotc" style="--c:var(--carta)">Carta ${Math.round(pc)}%</span><br><b class="num">${money(accs.carta)}</b></span><span style="text-align:right"><span class="dotc" style="--c:var(--cash)">Contanti ${Math.round(100 - pc)}%</span><br><b class="num">${money(accs.contanti)}</b></span></div></div>`) : '',
    abb: subscList.length ? sec('abb', 'Abbonamenti', `<span class="num">≈ ${money([...subsc.values()].reduce((a, e) => a + e.tot, 0) / Math.max(1, rows.length))} al mese</span>`,
      `<div class="card">${subscList.map(e => `<div class="kv"><span>${esc(e.name)}<br><small class="muted">${e.n} ${e.n === 1 ? 'addebito' : 'addebiti'}</small></span><b class="num">${money(e.last.amount)}</b></div>`).join('')}</div>`) : '',
    top: big.length ? sec('top', 'Le spese più alte', '', `<div class="mvs">${big.map(t => rowHtml(t, true, true)).join('')}</div>`) : '',
    shop: subList.length ? sec('shop', 'Shopping online per sito', '', cfg.pie.shop
      ? donut(subList.map(([k, v], i) => ({ label: k, v, color: C.PALETTE[i % C.PALETTE.length] })), subList.reduce((a, [, v]) => a + v, 0), money(subList.reduce((a, [, v]) => a + v, 0)))
      : `<div class="card">${subList.map(([k, v]) => `<div class="hbar"><div class="top"><span>${esc(k)}</span><span class="num">${money(v)}</span></div><div class="track"><div class="fill" style="width:${v / subList[0][1] * 100}%"></div></div></div>`).join('')}</div>`) : '',
    debiti: sec('debiti', 'Debiti', `Ti devono ${money(owed)}`,
      `<div class="list"><button class="row" data-act="debtsSheet"><div class="main"><div class="ttl">Vedi le persone</div><div class="sm">Ti devono ${money(owed)} · Devi ${money(owe)}</div></div><span class="gch rt">${IC.chev}</span></button></div>`),
    mesi: sec('mesi', 'Per mese', '', `<div class="list">${[...rows].reverse().map(({ p, s }) => `<button class="row" data-act="gotoPeriod" data-id="${esc(p.id)}"><div class="main"><div class="ttl">${esc(periodLabel(p))}</div><div class="sm num">Spesa ${money(s.real)}</div></div><div class="amt num ${s.saved == null ? 'muted' : s.saved >= 0 ? 'pos' : 'neg'}">${s.saved == null ? '—' : signed(s.saved)}</div></button>`).join('')}</div>`),
  };
  const shown = statOrder().filter(k => !cfg.hide.includes(k)).map(k => blocks[k]).join('');
  return `${head}
  <div class="seg" style="overflow-x:auto">${[...years, 'tutto'].map(y => `<button data-act="statYear" data-id="${y}" class="${ui.statYear === y ? 'on' : ''}">${y === 'tutto' ? 'Tutto' : y}</button>`).join('')}</div>
  <div style="height:10px"></div>
  ${shown || '<div class="empty">Nessuna sezione visibile.<br>Usa il pulsante in alto per sceglierle.</div>'}`;
}

// scegli quali sezioni vedere, in che ordine e se mostrarle a torta
function statSettings() {
  const draw = () => {
    const cfg = statCfg(), order = statOrder();
    return `<p class="hint" style="margin:0 4px 12px">Accendi le sezioni che vuoi vedere e riordinale con le frecce. Dove si può, scegli anche la torta.</p>
    <div class="list">${order.map((k, i) => { const it = STAT_ITEMS.find(x => x[0] === k);
      return `<div class="row srow"><div class="main"><div class="ttl">${it[1]}</div>${it[2] ? `<div class="seg mini" data-pie="${k}"><button data-v="0" class="${cfg.pie[k] ? '' : 'on'}">Barre</button><button data-v="1" class="${cfg.pie[k] ? 'on' : ''}">Torta</button></div>` : ''}</div>
        <button class="arw up" data-mv="${k}" data-d="-1" aria-label="Sposta su" ${i === 0 ? 'disabled' : ''}>${IC.chev}</button><button class="arw" data-mv="${k}" data-d="1" aria-label="Sposta giù" ${i === order.length - 1 ? 'disabled' : ''}>${IC.chev}</button>
        <label class="switch"><input type="checkbox" data-vis="${k}" ${cfg.hide.includes(k) ? '' : 'checked'}><i></i></label></div>`; }).join('')}</div>
    <button class="btn sec" data-reset style="margin-top:12px">Ripristina ordine e scelte</button>`;
  };
  openSheet('Personalizza statistiche', draw(), {
    onMount: w => {
      const body = $('.body', w);
      const save = async c => { await S.setMeta('statCfg', c); render(); body.innerHTML = draw(); wire(); };
      const wire = () => {
        body.querySelectorAll('[data-vis]').forEach(b => b.onchange = () => { const c = statCfg(); c.hide = b.checked ? c.hide.filter(x => x !== b.dataset.vis) : [...c.hide, b.dataset.vis]; save({ ...c, order: statOrder() }); });
        body.querySelectorAll('[data-mv]').forEach(b => b.onclick = () => { const o = statOrder(), i = o.indexOf(b.dataset.mv), j = i + +b.dataset.d; if (j < 0 || j >= o.length) return; [o[i], o[j]] = [o[j], o[i]]; save({ ...statCfg(), order: o }); });
        body.querySelectorAll('[data-pie] button').forEach(b => b.onclick = () => { const c = statCfg(); save({ ...c, order: statOrder(), pie: { ...c.pie, [b.parentNode.dataset.pie]: b.dataset.v === '1' } }); });
        $('[data-reset]', body).onclick = () => save({});
      };
      wire();
    }
  });
}

// ---------- ALTRO ----------
function viewAltro() {
  const d = backupDays(), n = S.state.transactions.length;
  const warn = !Sync.config() && n > 0 && (d === null || d > 30) ? `<div class="warn">⚠️ ${d === null ? 'Non hai ancora fatto nessun backup.' : `Ultimo backup ${d} giorni fa.`} I dati sono salvati solo su questo iPhone: esporta un backup e salvalo su iCloud Drive.</div>` : '';
  return `<div class="bar"><h1>Altro</h1><div class="nav">${eyeBtn()}</div></div>${warn}
  <div class="sechead"><span>Aspetto</span></div>
  <div class="list"><button class="row" data-act="themeSheet"><div class="main"><div class="ttl">Tema</div><div class="sm">${{ auto: 'Automatico (come l’iPhone)', light: 'Chiaro', dark: 'Scuro' }[themePref()]}</div></div></button><button class="row" data-act="colorSheet"><div class="main"><div class="ttl">Personalizzazione</div><div class="sm">Colori di Carta, Contanti, entrate, uscite</div></div></button><button class="row" data-act="mvStyleSheet"><div class="main"><div class="ttl">Colori dei movimenti</div><div class="sm">${MVS[mvStyle()]}</div></div></button></div>
  <div class="sechead"><span>Movimenti</span></div>
  <div class="list"><label class="row"><div class="main"><div class="ttl">Raggruppa movimenti</div><div class="sm">Crea gruppi con un nome e il totale dei loro movimenti, ad esempio un acquisto per qualcuno e i soldi che ti ridà</div></div><span class="switch"><input type="checkbox" data-groups ${groupsOn() ? 'checked' : ''}><i></i></span></label>
    <label class="row"><div class="main"><div class="ttl">Chiudi i gruppi</div><div class="sm">Mostra solo il riquadro del gruppo con nome e totale; i movimenti si aprono con la freccia</div></div><span class="switch"><input type="checkbox" data-gclosed ${groupsClosed() ? 'checked' : ''}><i></i></span></label></div>
  <div class="sechead"><span>Categorie</span></div>
  <div class="list"><button class="row" data-act="catSheet"><div class="main"><div class="ttl">Gestisci categorie</div><div class="sm">${S.state.transactions.filter(t => !t.cat).length} movimenti da categorizzare</div></div></button></div>
  <div class="sechead"><span>Excel e sincronizzazione</span></div>
  <div class="list"><button class="row" data-act="syncSheet"><div class="main"><div class="ttl">Sincronizzazione GitHub</div><div class="sm">${esc(syncLine())}</div></div></button></div>
  <div class="sechead"><span>Backup e dati</span></div>
  <div class="list">
    <button class="row" data-act="export"><div class="main"><div class="ttl">Esporta backup (JSON)</div></div></button>
    <label class="row"><div class="main"><div class="ttl">Importa / ripristina backup</div></div><input type="file" accept=".json,application/json" hidden data-import="ask"></label>
    <button class="row" data-act="csv"><div class="main"><div class="ttl">Esporta tutti i movimenti (CSV)</div></div></button>
  </div>
  <div class="sechead"><span>Riepilogo</span></div>
  <div class="card"><div class="kv"><span>Mesi</span><b>${S.state.periods.length}</b></div><div class="kv"><span>Movimenti</span><b>${n}</b></div><div class="kv"><span>Voci di debito</span><b>${S.state.debts.length}</b></div></div>
  <div class="sechead"><span>App</span></div>
  <div class="list">
    <button class="row" data-act="update"><div class="main"><div class="ttl">Aggiorna app</div></div></button>
    <button class="row" data-act="wipe"><div class="main"><div class="ttl neg">Cancella tutti i dati</div></div></button>
  </div>`;
}

// ---------- selezione multipla e nuovo gruppo ----------
// pallino fisso per iniziare la selezione: resta sullo schermo mentre scorri la lista
function renderFab() {
  let b = $('#selFab');
  if (ui.tab !== 'mese' || ui.sel || !groupsOn()) { b?.remove(); return; }
  if (!b) {
    b = document.createElement('button'); b.id = 'selFab'; b.dataset.act = 'selMode'; b.setAttribute('aria-label', 'Seleziona movimenti');
    b.innerHTML = '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/></svg>';
    document.body.appendChild(b);
  }
}
function renderSelBar() {
  let bar = $('#selBar');
  if (!ui.sel || ui.tab !== 'mese') { bar?.remove(); return; }
  if (!bar) { bar = document.createElement('div'); bar.id = 'selBar'; document.body.appendChild(bar); }
  const n = ui.sel.size;
  bar.innerHTML = `<span>${n} ${n === 1 ? 'selezionato' : 'selezionati'}</span><button class="sbtn" data-act="selMode">Annulla</button><button class="sbtn go" data-act="createGroup" ${n < 2 ? 'disabled' : ''}>Crea gruppo</button>`;
}
function toggleSel(id) { if (lockedIds.has(id)) return toast('Fa già parte di un gruppo'); if (ui.sel.has(id)) ui.sel.delete(id); else ui.sel.add(id); renderList(); renderSelBar(); }
function createGroup() {
  const txs = [...(ui.sel || [])].map(id => S.state.transactions.find(t => t.id === id)).filter(Boolean);
  if (txs.length < 2) return toast('Seleziona almeno due movimenti');
  const def = (txs.filter(t => t.kind === 'out').sort((a, b) => b.amount - a.amount)[0] || txs[0]).desc || '';
  openSheet('Nuovo gruppo', `<div class="form"><div class="frow"><label>Nome</label><input id="gnm" value="${esc(def)}" placeholder="Es. Acquisti per Mamma" autocomplete="off" autocapitalize="sentences"></div></div>
    <div class="gsum">${txs.length} movimenti · totale <b class="num ${sgnCls(gTotal(txs))}">${signedRaw(gTotal(txs))}</b></div>`, {
    saveLabel: 'Crea gruppo',
    onMount: w => setTimeout(() => $('#gnm', w).select(), 300),
    onSave: async w => {
      const name = $('#gnm', w).value.trim(); if (!name) return toast('Scrivi un nome per il gruppo'), false;
      const gid = S.uid();
      await S.setMeta('groups', { ...groups(), [gid]: { name } });
      await S.bulkSave('transactions', txs.map(t => ({ ...t, gid })));
      ui.sel = null; render(); toast('Gruppo creato ✓');
    }
  });
}

// foglio del gruppo: nome, totale, movimenti, aggiunta e scioglimento
function openGroupSheet(gid) {
  if (!groups()[gid]) return;
  openSheet('Gruppo', `<div class="form"><div class="frow"><label>Nome</label><input id="gnm" value="${esc(gName(gid))}" autocomplete="off" autocapitalize="sentences"></div></div>
    <div class="gsum" id="gsum"></div><div id="glist"></div><button class="btn sec" data-add style="margin-top:12px">Aggiungi movimenti</button>`, {
    saveLabel: 'Salva', deleteLabel: 'Sciogli gruppo',
    onMount: (w, close) => {
      const draw = () => {
        const ms = gMembers(gid).sort((a, b) => b.date.localeCompare(a.date));
        if (!ms.length) { close(); return; }
        const tot = gTotal(ms);
        $('#gsum', w).innerHTML = `${ms.length} ${ms.length === 1 ? 'movimento' : 'movimenti'} · totale <b class="num ${sgnCls(tot)}">${signedRaw(tot)}</b>`;
        $('#glist', w).innerHTML = `<div class="form linked">${ms.map(x => `<div class="lrow"><div class="lt"><b>${esc(x.desc || x.category || '—')}</b><span>${esc(fmtShort(x.date))} · ${x.account === 'carta' ? 'Carta' : 'Contanti'}</span></div><span class="num ${x.kind === 'in' ? 'pos' : 'neg'}">${x.kind === 'in' ? '+' : '−'}${moneyRaw(x.amount)}</span><button data-rm="${x.id}" aria-label="Rimuovi dal gruppo">${IC.x}</button></div>`).join('')}</div>`;
        $('#glist', w).querySelectorAll('[data-rm]').forEach(b => b.onclick = async () => {
          const x = S.state.transactions.find(t => t.id === b.dataset.rm);
          await S.save('transactions', { ...x, gid: undefined }); await pruneGroups(); render(); draw();
        });
      };
      $('[data-add]', w).onclick = () => pickMany('Aggiungi al gruppo', gMembers(gid)[0]?.date, async ids => {
        await S.bulkSave('transactions', ids.map(id => ({ ...S.state.transactions.find(t => t.id === id), gid })));
        render(); draw();
      });
      $('[data-del]', w).onclick = async () => {
        if (!confirm('Sciogliere il gruppo? I movimenti restano, senza gruppo.')) return;
        await S.bulkSave('transactions', gMembers(gid).map(t => ({ ...t, gid: undefined })));
        await pruneGroups(); close(); render(); toast('Gruppo sciolto');
      };
      draw();
    },
    onSave: async w => {
      const name = $('#gnm', w).value.trim(); if (!name) return toast('Scrivi un nome per il gruppo'), false;
      await S.setMeta('groups', { ...groups(), [gid]: { ...groups()[gid], name } });
      render(); toast('Salvato');
    }
  });
}

// ---------- colori dei movimenti ----------
const MVS = { rail: 'Striscia a lato', soft: 'Sfondo tenue', solid: 'Barra piena' };
function mvStyle() { try { const v = localStorage.getItem('mvs'); return MVS[v] ? v : 'soft'; } catch { return 'soft'; } }
function applyMvStyle(v) { document.documentElement.dataset.mvs = v; try { localStorage.setItem('mvs', v); } catch { /* ignore */ } }
function mvStyleSheet() {
  const cur = mvStyle(), d = { rail: 'Movimento neutro con una striscia blu (carta) o verde (contanti) a sinistra', soft: 'Tutta la barra con una tinta leggera del colore del conto', solid: 'Barra blu o verde come i riquadri in alto, con l’importo in una chip bianca' };
  openSheet('Colori dei movimenti', `<div class="list">${Object.keys(MVS).map(k => `<button class="row" data-s="${k}"><div class="main"><div class="ttl">${MVS[k]}${cur === k ? ' ✓' : ''}</div><div class="sm">${d[k]}</div></div></button>`).join('')}</div>`, {
    onMount: (w, close) => w.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { applyMvStyle(b.dataset.s); close(); render(); })
  });
}

// ---------- colori personalizzati ----------
const COLOR_ITEMS = [
  ['carta', 'Carta', 'Riquadro, tag e barre della carta'],
  ['cash', 'Contanti', 'Riquadro, tag e barre dei contanti'],
  ['accent', 'Colore principale', 'Pulsante +, schede attive, link e gruppi'],
  ['in', 'Entrate', 'Importi in entrata'],
  ['red', 'Uscite', 'Importi in uscita e avvisi'],
];
const COLOR_PRESETS = ['#2b62f0', '#0ea5e9', '#14b8a6', '#10b981', '#84cc16', '#f59e0b', '#f97316', '#ef4444', '#ec4899', '#8b5cf6'];
const isHex = c => /^#[0-9a-f]{6}$/i.test(c || '');
function mixHex(a, b, t) {
  const n = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  return '#' + n(a).map((v, k) => Math.round(v + (n(b)[k] - v) * t).toString(16).padStart(2, '0')).join('');
}
function applyColors() {
  const st = document.documentElement.style, c = S.state.meta.colors || {};
  const put = (k, v) => v ? st.setProperty(k, v) : st.removeProperty(k);
  const ok = k => isHex(c[k]) ? c[k] : null;
  for (const [k, pre] of [['carta', '--carta'], ['cash', '--cash'], ['accent', '--pl']]) {
    const v = ok(k);
    put(pre, v); put(pre + '-l', v && mixHex(v, '#ffffff', .2)); put(pre + '-d', v && mixHex(v, '#000000', .32));
  }
  put('--accent', ok('accent'));
  put('--in', ok('in')); put('--green', ok('in')); put('--in-strong', ok('in'));
  put('--red', ok('red'));
}
const cssColor = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
function colorSheet() {
  openSheet('Colori dell’app', '', {
    onMount: w => {
      const body = $('.body', w);
      const draw = () => {
        const cur = S.state.meta.colors || {};
        body.innerHTML = `<p class="hint" style="margin:0 4px 12px">Scegli i colori che preferisci: l’app cambia subito.</p>` + COLOR_ITEMS.map(([k, name, desc]) => {
          const v = isHex(cur[k]) ? cur[k] : null, shown = v || cssColor({ carta: '--carta', cash: '--cash', accent: '--accent', in: '--in', red: '--red' }[k]);
          return `<div class="cpick"><div class="cphead"><i class="cpdot" style="background:${esc(shown)}"></i><div><b>${name}</b><small>${desc}</small></div></div>
            <div class="cpsw">${COLOR_PRESETS.map(c => `<button type="button" data-k="${k}" data-c="${c}" class="${v && v.toLowerCase() === c ? 'on' : ''}" style="background:${c}" aria-label="${c}"></button>`).join('')}<label class="cpcustom ${v && !COLOR_PRESETS.includes(v.toLowerCase()) ? 'on' : ''}"><input type="color" data-k="${k}" value="${/^#[0-9a-f]{6}$/i.test(shown) ? shown : '#2b62f0'}"></label></div></div>`;
        }).join('') + `<button class="btn red" data-reset style="margin-top:6px">Ripristina i colori originali</button>`;
        body.querySelectorAll('button[data-c]').forEach(b => b.onclick = () => set(b.dataset.k, b.dataset.c));
        body.querySelectorAll('input[type=color]').forEach(i => i.onchange = () => set(i.dataset.k, i.value));
        $('[data-reset]', body).onclick = async () => { await S.setMeta('colors', {}); applyColors(); render(); draw(); };
      };
      const set = async (k, v) => { await S.setMeta('colors', { ...(S.state.meta.colors || {}), [k]: v }); applyColors(); render(); draw(); };
      draw();
    }
  });
}

// ---------- tema ----------
function themePref() { try { return localStorage.getItem('theme') || 'auto'; } catch { return 'auto'; } }
function applyTheme(t) {
  const r = document.documentElement;
  if (t === 'light' || t === 'dark') r.dataset.theme = t; else delete r.dataset.theme;
  try { localStorage.setItem('theme', t); } catch { /* ignore */ }
  document.querySelectorAll('meta[name=theme-color]').forEach(m => { m.content = t === 'dark' ? '#0d1020' : t === 'light' ? '#f3f5fb' : m.content; });
}
function themeSheet() {
  const cur = themePref();
  openSheet('Tema', `<div class="list">${[['auto', 'Automatico', 'Segue il tema dell’iPhone'], ['light', 'Chiaro', ''], ['dark', 'Scuro', '']].map(([k, n, d]) =>
    `<button class="row" data-t="${k}"><div class="main"><div class="ttl">${n}${cur === k ? ' ✓' : ''}</div>${d ? `<div class="sm">${d}</div>` : ''}</div></button>`).join('')}</div>`, {
    onMount: (w, close) => w.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { applyTheme(b.dataset.t); close(); render(); })
  });
}

// ---------- categorie ----------
const nocat = () => S.state.transactions.filter(t => !t.cat);
const learnKey = d => d.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
// Le categorie le assegni tu. Questa migrazione toglie quelle assegnate in automatico in passato
// e lascia solo quelle scelte a mano (catSet).
async function migrateCats() {
  if ((S.state.meta.catV || 0) >= 3) return;
  const upd = S.state.transactions.filter(t => t.cat && !t.catSet).map(t => ({ ...t, cat: undefined, sub: undefined }));
  await S.bulkSave('transactions', upd);
  await S.setMeta('catV', 3);
}
function catSheet() {
  const draw = () => {
    const cnt = new Map(); S.state.transactions.forEach(t => t.cat && cnt.set(t.cat, (cnt.get(t.cat) || 0) + 1));
    const sc = new Map(); S.state.transactions.forEach(t => t.sub && sc.set(t.sub, (sc.get(t.sub) || 0) + 1));
    return `
      <div class="sechead"><span>Le tue categorie</span></div>
      <div class="list">${C.categories().map(c => `<button class="row" data-cat="${esc(c.name)}"><div class="main"><div class="ttl lbl">${mini(c.name, c.color)} ${esc(c.name)}</div></div><div class="amt num muted" style="font-weight:400">${cnt.get(c.name) || 0}</div></button>`).join('')}</div>
      <button class="btn sec" data-new style="margin-top:12px">+ Nuova categoria</button>
      <button class="btn red" data-reset style="margin-top:10px">Azzera tutte le categorie</button>
      <div class="sechead"><span>Siti per Shopping online</span></div>
      <div class="list">${C.subs().map(x => `<button class="row" data-sub="${esc(x)}"><div class="main"><div class="ttl">${esc(x)}</div></div><div class="amt num muted" style="font-weight:400">${sc.get(x) || 0}</div></button>`).join('')}</div>
      <button class="btn sec" data-newsub style="margin-top:12px">+ Nuovo sito</button>`;
  };
  openSheet('Categorie', draw(), {
    onMount: w => {
      const body = $('.body', w);
      const redraw = () => { body.innerHTML = draw(); wire(); render(); };
      const saveCats = async list => { await S.setMeta('categories', list); };
      const wire = () => {
        $('[data-reset]', body).onclick = async () => {
          if (!confirm('Togliere la categoria da TUTTI i movimenti? Nell’Excel tornerà il testo originale.')) return;
          await S.bulkSave('transactions', S.state.transactions.filter(t => t.cat || t.sub || t.catSet).map(t => ({ ...t, cat: undefined, sub: undefined, catSet: undefined })));
          toast('Categorie azzerate'); redraw();
        };
        $('[data-newsub]', body).onclick = async () => {
          const n = (prompt('Nome del sito:') || '').trim(); if (!n || C.subs().some(x => x.toLowerCase() === n.toLowerCase())) return;
          await S.setMeta('subs', [...C.subs().filter(x => x !== 'Altri siti'), n, 'Altri siti']); redraw();
        };
        body.querySelectorAll('[data-sub]').forEach(b => b.onclick = async () => {
          const old = b.dataset.sub; if (old === 'Altri siti') return toast('Questa voce non si modifica');
          const n = prompt(`Nuovo nome per “${old}” (vuoto = elimina il sito):`, old); if (n === null) return;
          const upd = S.state.transactions.filter(t => t.sub === old).map(t => {
            const x = { ...t, sub: n.trim() ? n.trim() : 'Altri siti' };
            if (!t.raw && t.category === 'Shopping online - ' + old) x.category = 'Shopping online - ' + x.sub;
            return x;
          });
          await S.bulkSave('transactions', upd);
          await S.setMeta('subs', n.trim() ? C.subs().map(x => x === old ? n.trim() : x) : C.subs().filter(x => x !== old)); redraw();
        });
        $('[data-new]', body).onclick = () => categoryEditor(null, redraw);
        body.querySelectorAll('[data-cat]').forEach(b => b.onclick = () => categoryEditor(C.categories().find(c => c.name === b.dataset.cat), redraw));
      };
      wire();
    }
  });
}
// categorie usate dalle statistiche: il nome non si cambia e non si eliminano
const FIXED_CATS = new Set(['Riconversione', 'Prestiti e debiti', 'Rimborsi e rientri']);
const glyphSvg = (key, size) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true"><path d="${ICONS[key] || ICONS.tag}"/></svg>`;

// foglio per creare o modificare una categoria: nome, colore e icona
function categoryEditor(cur, done) {
  const st = { color: cur?.color || C.PALETTE[C.categories().length % C.PALETTE.length], glyph: cur ? C.glyphKey(cur.name) : 'tag' };
  const fixed = !!cur && FIXED_CATS.has(cur.name);
  const body = `<div class="cprev"><i class="mini lg" id="cpv"></i><b id="cpn"></b></div>
    <div class="form"><div class="frow"><label>Nome</label><input id="cnm" value="${esc(cur?.name || '')}" placeholder="Es. Palestra" autocomplete="off" autocapitalize="sentences" ${fixed ? 'disabled' : ''}></div></div>
    ${fixed ? '<p class="hint" style="margin:8px 4px 0">Il nome di questa categoria è fisso perché serve alle statistiche.</p>' : ''}
    <div class="sechead"><span>Colore</span></div>
    <div class="swatches">${C.PALETTE.map(c => `<button class="sw" data-c="${c}" style="--c:${c}" aria-label="Colore ${c}"></button>`).join('')}</div>
    <div class="sechead"><span>Icona</span></div>
    ${ICON_GROUPS.map(([t, keys]) => `<div class="igt">${esc(t)}</div><div class="igrid">${keys.map(k => `<button class="ig" data-g="${k}" aria-label="${k}">${glyphSvg(k, 24)}</button>`).join('')}</div>`).join('')}`;
  openSheet(cur ? 'Modifica categoria' : 'Nuova categoria', body, {
    saveLabel: cur ? 'Salva' : 'Crea', deleteLabel: cur && !fixed ? 'Elimina' : null,
    onMount: (w, close) => {
      const paint = () => {
        const name = $('#cnm', w).value.trim();
        $('#cpv', w).style.setProperty('--cc', st.color); $('#cpv', w).innerHTML = glyphSvg(st.glyph, 28);
        $('#cpn', w).textContent = name || 'Nome della categoria';
        w.querySelectorAll('.sw').forEach(b => b.classList.toggle('on', b.dataset.c === st.color));
        w.querySelectorAll('.ig').forEach(b => { b.classList.toggle('on', b.dataset.g === st.glyph); b.style.setProperty('--c', st.color); });
      };
      w.querySelectorAll('.sw').forEach(b => b.onclick = () => { st.color = b.dataset.c; paint(); });
      w.querySelectorAll('.ig').forEach(b => b.onclick = () => { st.glyph = b.dataset.g; paint(); });
      $('#cnm', w).addEventListener('input', paint);
      paint();
      if (!cur) setTimeout(() => $('#cnm', w).focus(), 300);
      else setTimeout(() => w.querySelector('.ig.on')?.scrollIntoView({ block: 'center' }), 350);
      const del = $('[data-del]', w);
      if (del) del.onclick = async () => {
        if (!confirm(`Eliminare “${cur.name}”? I suoi movimenti restano senza categoria.`)) return;
        await bulkCat(cur.name, null); await S.setMeta('categories', C.categories().filter(c => c.name !== cur.name));
        close(); done(); toast('Categoria eliminata');
      };
    },
    onSave: async w => {
      const name = $('#cnm', w).value.trim(); if (!name) return toast('Scrivi il nome della categoria'), false;
      const list = C.categories();
      if (list.some(c => c.name.toLowerCase() === name.toLowerCase() && c.name !== cur?.name)) return toast('Esiste già una categoria con questo nome'), false;
      if (!cur) { list.splice(Math.max(0, list.length - 1), 0, { name, color: st.color, glyph: st.glyph }); }
      else {
        if (name !== cur.name) await bulkCat(cur.name, name);
        for (let i = 0; i < list.length; i++) if (list[i].name === cur.name) list[i] = { ...list[i], name, color: st.color, glyph: st.glyph };
      }
      await S.setMeta('categories', list);
      done(); render(); toast(cur ? 'Categoria salvata' : 'Categoria creata ✓');
    }
  });
}

// rinomina/elimina una categoria su tutti i movimenti (il testo Excel dei movimenti nuovi segue il nome)
async function bulkCat(oldName, newName) {
  const upd = S.state.transactions.filter(t => t.cat === oldName).map(t => {
    const x = { ...t, cat: newName || undefined };
    if (!t.raw && t.category === oldName) x.category = newName || '';
    return x;
  });
  await S.bulkSave('transactions', upd);
}
// controlla se su GitHub ci sono dati piu' recenti (altro dispositivo, o Excel/PC) e li scarica
let pulling = false;
async function pullRemote(manual = false) {
  if (!Sync.config() || pulling) return;
  if (!manual && document.querySelector('#sheetRoot .sheet')) return;       // non cambio i dati mentre stai scrivendo
  pulling = true;
  try {
    const r = await Sync.check(manual);
    if (!r) { if (manual) toast('Nessuna rete o GitHub non raggiungibile'); return; }
    if (!r.changed) { if (manual) toast('Hai già i dati più recenti ✓'); return; }
    if (S.state.meta.syncDirty && !confirm('Su GitHub ci sono dati più recenti, ma su questo telefono ci sono modifiche non ancora inviate.\n\nOK = scarica quelli di GitHub (le modifiche non inviate si perdono)\nAnnulla = tieni quelli del telefono e inviali')) {
      await S.setMeta('syncSha', r.sha); Sync.schedule(300); return;
    }
    const d = await Sync.download(); S.validate(d);
    await Sync.applyRemote(r.sha, async () => { await S.importData(d, 'replace'); await S.setMeta('catV', 3); await S.setMeta('groupsV', 1); await applyMeta(d, true); });
    await pruneGroups(); ui.sel = null; if (!S.period(ui.periodId)) ui.periodId = null;
    C.ensurePeriodFor(C.today()); render(); toast('Dati aggiornati da GitHub ✓');
  } catch (e) { if (manual) alert(e.message); }
  finally { pulling = false; }
}

function syncLine() {
  const c = Sync.config(); if (!c) return 'Non attiva';
  if (Sync.status.msg) return Sync.status.msg;
  if (S.state.meta.syncDirty) return 'Attiva · invio delle modifiche in corso';
  const t = S.state.meta.lastSync;
  return t ? 'Attiva · aggiornata il ' + new Date(t).toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Attiva';
}

// collega GitHub: se nel repository ci sono gia' dati li scarica (telefono nuovo), senza mai sovrascriverli con un archivio vuoto
async function connectSync(repo, token) {
  const pr = await Sync.probe(repo, token);
  const localCount = S.state.transactions.length, empty = !localCount && !S.state.periods.length;
  let choice = 'local';
  if (pr.exists) {
    S.validate(pr.data);
    choice = empty ? 'remote' : await askSyncSource(pr.data, localCount);
    if (!choice) return false;
  }
  if (choice === 'remote') {
    await S.importData(pr.data, 'replace'); await S.setMeta('catV', 3); await S.setMeta('groupsV', 1); await applyMeta(pr.data);
    ui.periodId = null; const n0 = S.state.periods.length; C.ensurePeriodFor(C.today());
    await Sync.enable(pr.c, false); if (S.state.periods.length > n0) Sync.schedule();
    toast(`Scaricati ${pr.data.transactions.length} movimenti da GitHub`);
  } else await Sync.enable(pr.c, !empty);
  return true;
}
function askSyncSource(remote, localCount) {
  return new Promise(resolve => {
    let done = false; const fin = v => { if (!done) { done = true; resolve(v); } };
    const when = remote.exportedAt ? new Date(remote.exportedAt).toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
    const sh = openSheet('Dati già presenti', `<p class="muted" style="margin:0 4px 14px">Su GitHub ci sono <b>${remote.transactions.length}</b> movimenti${when ? ` (ultimo invio ${esc(when)})` : ''}. Su questo telefono ce ne sono <b>${localCount}</b>.</p>
      <button class="btn" data-r>Scarica quelli di GitHub</button><p class="hint" style="margin:6px 4px 14px">Sostituisce i dati del telefono.</p>
      <button class="btn sec" data-l>Invia quelli del telefono</button><p class="hint" style="margin:6px 4px 0">Sostituisce i dati su GitHub.</p>`, {
      onMount: (w, close) => {
        $('[data-r]', w).onclick = () => { fin('remote'); close(); };
        $('[data-l]', w).onclick = () => { fin('local'); close(); };
      }
    });
    $('.back', sh.el).addEventListener('click', () => fin(null)); $('[data-x]', sh.el).addEventListener('click', () => fin(null));
  });
}

function syncSheet() {
  const c = Sync.config();
  const body = c ? `<div class="form"><div class="frow"><label>Repository</label><input value="${esc(c.repo)}" readonly></div></div>
      <button class="btn" data-now>Sincronizza ora</button>
      <button class="btn sec" data-restore>Ripristina dati da GitHub</button>
      <button class="btn red" data-off>Disattiva</button>`
    : `<div class="form">
        <div class="frow"><label>Repository</label><input id="syRepo" placeholder="utente/nome" autocapitalize="off" autocorrect="off" spellcheck="false"></div>
        <div class="frow"><label>Token</label><input id="syTok" type="password" placeholder="github_pat_…" autocapitalize="off" autocorrect="off" spellcheck="false"></div>
      </div><p class="hint" style="margin:10px 4px">Se su GitHub ci sono già i tuoi dati, l’app li scarica; altrimenti invia quelli di questo telefono.</p><button class="btn" data-on>Collega e sincronizza</button>`;
  openSheet('Sincronizzazione GitHub', body, {
    onMount: (w, close) => {
      const on = $('[data-on]', w);
      if (on) on.onclick = async () => {
        on.textContent = 'Connessione…'; on.disabled = true;
        try {
          const ok = await connectSync($('#syRepo', w).value, $('#syTok', w).value);
          if (ok) { close(); render(); toast('Sincronizzazione attiva ✓'); } else { on.textContent = 'Collega e sincronizza'; on.disabled = false; }
        } catch (e) { on.textContent = 'Collega e sincronizza'; on.disabled = false; alert(e.message); }
      };
      const now = $('[data-now]', w); if (now) now.onclick = async () => { now.textContent = 'Sincronizzazione…'; await pullRemote(true); if (S.state.meta.syncDirty) await Sync.push(); close(); render(); };
      const off = $('[data-off]', w); if (off) off.onclick = async () => { if (confirm('Disattivare la sincronizzazione? Il token viene rimosso da questo telefono.')) { await Sync.disable(); close(); render(); } };
      const rs = $('[data-restore]', w); if (rs) rs.onclick = async () => {
        if (!confirm('Sostituire TUTTI i dati dell’app con quelli su GitHub?')) return;
        try { const d = await Sync.download(); await S.importData(d, 'replace'); await applyMeta(d); ui.periodId = null; close(); render(); toast('Dati ripristinati'); }
        catch (e) { alert(e.message); }
      };
    }
  });
}

async function doExport() {
  const json = JSON.stringify(S.exportData()), name = `spese-backup-${C.today()}.json`;
  const file = new File([json], name, { type: 'application/json' });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file], title: name });
    else throw new Error('noshare');
  } catch (err) {
    if (err && err.name === 'AbortError') return;
    const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = name; document.body.appendChild(a); a.click(); a.remove();
  }
  await S.setMeta('lastBackup', new Date().toISOString()); render(); toast('Backup creato');
}
async function doCsv() {
  const q = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  const per = new Map(S.state.periods.map(p => [p.id, periodLabel(p)]));
  const rows = [['Data', 'Mese', 'Conto', 'Verso', 'Importo', 'Tipo', 'Motivo'].join(';')].concat(
    [...S.state.transactions].sort((a, b) => a.date.localeCompare(b.date)).map(t => [t.date, q(per.get(t.periodId)), t.account, t.kind === 'in' ? 'Entrata' : 'Uscita', String(t.amount).replace('.', ','), q(t.category), q(t.desc)].join(';')));
  const file = new File(['﻿' + rows.join('\r\n')], `spese-movimenti-${C.today()}.csv`, { type: 'text/csv' });
  try { if (navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file] }); else throw 0; }
  catch (e) { if (e && e.name === 'AbortError') return; const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = file.name; document.body.appendChild(a); a.click(); a.remove(); }
}
// elenco categorie e siti personalizzati inclusi nel backup
async function applyMeta(d, replace = false) {     // replace: i dati arrivano da GitHub e sostituiscono quelli del telefono
  if (d.people) await S.setMeta('people', d.people);
  if (d.categories) await S.setMeta('categories', d.categories);
  if (d.subs) await S.setMeta('subs', d.subs);
  if (d.groups || replace) await S.setMeta('groups', replace ? (d.groups || {}) : { ...groups(), ...d.groups });
  if (d.statCfg) await S.setMeta('statCfg', d.statCfg);
  if (d.colors) { await S.setMeta('colors', d.colors); applyColors(); }
}

async function doImport(file, mode) {
  try {
    const d = JSON.parse(await file.text()); S.validate(d);
    if (mode === 'ask' && d.periods.length === 0) {   // file parziale (es. categorie proposte): si puo' solo unire
      if (!confirm(`Applicare le modifiche a ${d.transactions.length} movimenti? Gli altri dati restano com'erano.`)) return;
      mode = 'merge';
    }
    if (mode === 'ask') {
      const replace = S.state.transactions.length === 0 || confirm(`Il file contiene ${d.periods.length} mesi e ${d.transactions.length} movimenti.\n\nOK = SOSTITUISCI tutti i dati attuali\nAnnulla = scegli se unire`);
      if (replace) mode = 'replace';
      else if (confirm('Unire i dati del file a quelli presenti? (i movimenti con lo stesso ID vengono aggiornati)')) mode = 'merge';
      else return;
    }
    await S.importData(d, mode);
    await S.setMeta('catV', 3);
    await applyMeta(d);
    ui.periodId = null; ui.tab = 'mese'; C.ensurePeriodFor(C.today());
    render(); toast(`Importati ${d.transactions.length} movimenti`);
  } catch (e) { alert('Importazione non riuscita: ' + e.message); }
}

// ---------- eventi ----------
const actions = {
  tab: el => { ui.sel = null; ui.tab = el.dataset.id; window.scrollTo(0, 0); render(); },
  add: () => openAddMenu(),
  prev: () => { const id = neighborId(-1); if (id) slideTo(id); },
  privacy: () => { setPrivacyOn(!privacyOn()); render(); },
  filterSheet,
  clearFilters: () => { ui.catf = ''; ui.allMonths = false; render(); },
  searchToggle: () => { ui.searchOpen = !(ui.searchOpen || ui.q); if (!ui.searchOpen) ui.q = ''; render(); if (ui.searchOpen) $('#q')?.focus(); },
  next: () => { const id = neighborId(1); if (id) slideTo(id); },
  pickPeriod, editPeriod, summary: summarySheet,
  gotoPeriod: el => { ui.q = ''; $('#sheetRoot').innerHTML = ''; slideTo(el.dataset.id); },
  acct: el => { ui.acct = el.dataset.id; render(); },
  editTx: el => ui.sel ? toggleSel(el.dataset.id) : openTxSheet(S.state.transactions.find(t => t.id === el.dataset.id)),
  selMode: () => { ui.sel = ui.sel ? null : new Set(); render(); },
  createGroup,
  statSettings,
  statToggle: el => {
    const k = el.dataset.id, so = statOpen(), open = !(so[k] ?? !!STAT_DEF[k]);
    so[k] = open; try { localStorage.setItem('statopen', JSON.stringify(so)); } catch { /* ignore */ }
    const sec = el.closest('.ssec'); sec.querySelector('.sbody').hidden = !open;
    el.setAttribute('aria-expanded', open); el.querySelector('.gch').classList.toggle('up', open);
    if (open) { const b = sec.querySelector('.bars.sc'); if (b) b.scrollLeft = b.scrollWidth; }
  },
  openGroup: el => { if (!ui.sel) openGroupSheet(el.dataset.id); },
  mvStyleSheet,
  toggleGroup: el => { if (ui.open.has(el.dataset.id)) ui.open.delete(el.dataset.id); else ui.open.add(el.dataset.id); renderList(); },
  newPerson, debtsSheet, person: el => { $('#sheetRoot').innerHTML = ''; openPerson(el.dataset.id); },
  statYear: el => { ui.statYear = el.dataset.id; render(); },
  searchCat: el => { ui.q = ''; ui.catf = el.dataset.id === 'Senza categoria' ? '__none' : el.dataset.id; ui.allMonths = true; ui.tab = 'mese'; render(); window.scrollTo(0, 0); },
  allMonths: () => { ui.allMonths = !ui.allMonths; render(); },
  export: doExport, csv: doCsv, syncSheet, catSheet, themeSheet, colorSheet,
  restoreSync: async () => {
    try { const d = await Sync.download(); await S.importData(d, 'replace'); await S.setMeta('catV', 3); await S.setMeta('groupsV', 1); await applyMeta(d); ui.periodId = null; C.ensurePeriodFor(C.today()); render(); toast('Dati ripristinati'); }
    catch (e) { alert(e.message); }
  },
  startEmpty: async () => { C.ensurePeriodFor(C.today()); render(); },
  update: async () => { const regs = await navigator.serviceWorker?.getRegistrations?.() || []; for (const r of regs) await r.unregister(); for (const k of await caches.keys()) await caches.delete(k); location.reload(); },
  wipe: async () => { if (confirm('Cancellare TUTTI i dati dall’app? Operazione irreversibile (fai prima un backup).') && confirm('Sei sicuro?')) { await S.wipe(); ui.periodId = null; render(); toast('Dati cancellati'); } },
};
document.addEventListener('click', e => { const el = e.target.closest('[data-act]'); if (el && actions[el.dataset.act]) { e.preventDefault(); actions[el.dataset.act](el); } });
document.addEventListener('change', e => { const el = e.target; if (el.matches && el.matches('[data-import]') && el.files[0]) { doImport(el.files[0], el.dataset.import); el.value = ''; } });
document.addEventListener('change', e => { if (e.target.matches?.('[data-groups]')) setGroupsOn(e.target.checked); if (e.target.matches?.('[data-gclosed]')) { setGroupsClosed(e.target.checked); ui.open.clear(); } });
document.addEventListener('change', e => { if (e.target.id === 'catf') { ui.catf = e.target.value; renderList(); } });
document.addEventListener('input', e => { if (e.target.id === 'q') { ui.q = e.target.value; renderList(); } });
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'q') e.target.blur(); });

// ---------- avvio ----------
(async function boot() {
  C.setPrivacy(privacyOn());
  applyMvStyle(mvStyle());
  try {
    await S.load();
    if (S.state.periods.length) { C.ensurePeriodFor(C.today()); await migrateCats(); await migrateGroups(); await pruneGroups(); }
    if (navigator.storage?.persist) navigator.storage.persist().catch(() => {});
  } catch (err) { $('#view').innerHTML = `<div class="card"><b>Impossibile aprire l’archivio dati.</b><p class="muted">${esc(err.message)}<br>Se usi la navigazione privata, apri l’app normalmente.</p></div>`; return; }
  applyColors();
  S.onChange(() => Sync.schedule());
  Sync.setConflictListener(() => pullRemote(true));
  Sync.setStatusListener(() => { renderTabs(); if (ui.tab === 'altro' && !document.querySelector('#sheetRoot .sheet')) render(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) Sync.flush(); });
  window.addEventListener('pagehide', Sync.flush);
  Sync.resumeIfDirty();
  window.addEventListener('online', () => { pullRemote(); Sync.resumeIfDirty(); });
  render();
  pullRemote();
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => {});
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { pullRemote(); Sync.resumeIfDirty(); } if (!document.hidden && S.state.periods.length) { C.ensurePeriodFor(C.today()); if (ui.tab !== 'mese' || !$('#q') || document.activeElement !== $('#q')) renderTabs(); } });
})();
