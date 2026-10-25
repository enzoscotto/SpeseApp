import * as S from './store.js';
import * as C from './calc.js';
import { money, signed, display, periodLabel, fmtDay, fmtShort, DEBT_TYPES } from './calc.js';

const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ui = { tab: 'mese', periodId: null, acct: 'tutti', q: '', statYear: null };

const IC = {
  mese: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
  debiti: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.3"/><path d="M3 20c.5-3.5 3-5.5 6-5.5s5.5 2 6 5.5"/><path d="M17 6.5a3 3 0 0 1 0 5.5M18.5 15c1.6.7 2.6 2.4 2.9 4.5"/></svg>',
  stat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/></svg>',
  altro: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/></svg>',
  plus: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  left: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  right: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>',
  chev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/></svg>',
  x: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
};

function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2200); }
const num = v => { const n = Number(String(v ?? '').replace(/[€\s]/g, '').replace(/\./g, m => (String(v).includes(',') ? '' : m)).replace(',', '.')); return Number.isFinite(n) ? n : NaN; };
const backupDays = () => S.state.meta.lastBackup ? Math.floor((Date.now() - new Date(S.state.meta.lastBackup)) / 864e5) : null;

// ---------- sheets ----------
function openSheet(title, body, { onSave, saveLabel = 'Salva', onMount } = {}) {
  const root = $('#sheetRoot');
  const wrap = document.createElement('div');
  wrap.innerHTML = `<div class="back"></div><div class="sheet" role="dialog"><div class="head"><button data-x>Chiudi</button><h2>${esc(title)}</h2>${onSave ? `<button class="save" data-save>${esc(saveLabel)}</button>` : '<span style="width:52px"></span>'}</div><div class="body">${body}</div></div>`;
  root.appendChild(wrap);
  const close = () => wrap.remove();
  $('.back', wrap).onclick = close; $('[data-x]', wrap).onclick = close;
  if (onSave) $('[data-save]', wrap).onclick = async () => { if ((await onSave(wrap)) !== false) close(); };
  onMount && onMount(wrap, close);
  return { el: wrap, close };
}

// ---------- tabs ----------
function renderTabs() {
  const t = (id, label, ic, dot) => `<button data-act="tab" data-id="${id}" class="${ui.tab === id ? 'on' : ''} ${dot ? 'dot' : ''}">${ic}<span>${label}</span></button>`;
  const d = backupDays();
  $('#tabs').innerHTML = t('mese', 'Mese', IC.mese) + t('debiti', 'Debiti', IC.debiti) +
    `<button class="plus" data-act="add" aria-label="Aggiungi"><span>${IC.plus}</span></button>` +
    t('stat', 'Statistiche', IC.stat) + t('altro', 'Altro', IC.altro, S.state.transactions.length > 0 && (d === null || d > 30));
}

function render() {
  renderTabs();
  const v = $('#view');
  v.innerHTML = ({ mese: viewMese, debiti: viewDebiti, stat: viewStat, altro: viewAltro })[ui.tab]();
  if (ui.tab === 'mese') renderList();
}

// ---------- MESE ----------
function curPeriod() { return S.period(ui.periodId) || C.currentPeriod(); }

function viewMese() {
  if (!S.state.periods.length) {
    return `<div class="bar"><h1>Le Mie Spese</h1></div><div class="card" style="text-align:center;padding:28px 18px">
      <div style="font-size:44px">📒</div><h2 style="margin:8px 0">Benvenuto!</h2>
      <p class="muted">Non ci sono ancora dati. Importa il file <b>dati-iniziali.json</b> con i tuoi 47 fogli oppure parti da zero.</p>
      <label class="btn" style="margin-top:14px">Importa dati<input type="file" accept=".json,application/json" hidden data-import="replace"></label>
      <button class="btn sec" data-act="startEmpty">Parti da zero</button></div>`;
  }
  const p = curPeriod(); ui.periodId = p.id;
  const st = C.stats(p), i = S.state.periods.findIndex(x => x.id === p.id);
  const hero = p.salary == null
    ? `<div class="lbl">Risparmiato</div><div class="big muted" style="font-size:24px">In attesa dello stipendio…</div>`
    : `<div class="lbl">Risparmiato</div><div class="big num ${st.saved >= 0 ? 'pos' : 'neg'}">${signed(st.saved).replace('+', '')}</div>`;
  return `
  <div class="bar">
    <button class="periodbtn" data-act="pickPeriod"><span>${esc(periodLabel(p))}</span>${IC.chev}</button>
    <div class="nav"><button class="iconbtn" data-act="prev" ${i <= 0 ? 'disabled' : ''}>${IC.left}</button><button class="iconbtn" data-act="next" ${i >= S.state.periods.length - 1 ? 'disabled' : ''}>${IC.right}</button></div>
  </div>
  <button class="card hero" data-act="editPeriod" style="display:block;width:100%;text-align:left">
    ${hero}
    <div class="sub num"><span>Stipendio <b>${p.salary == null ? '—' : money(p.salary)}</b></span><span>Spesa reale <b>${money(st.real)}</b></span><span>Totale <b>${money(st.total)}</b></span></div>
  </button>
  <div class="grid2">
    ${accCard('carta', 'Carta', st.card, p)}${accCard('contanti', 'Contanti', st.cash, p)}
  </div>
  <div class="search">${IC.search}<input id="q" type="search" placeholder="Cerca in tutti i mesi" value="${esc(ui.q)}" enterkeyhint="search" autocomplete="off" autocapitalize="off"></div>
  <div class="seg" id="acctSeg">${['tutti', 'carta', 'contanti'].map(a => `<button data-act="acct" data-id="${a}" class="${ui.acct === a ? 'on' : ''}">${{ tutti: 'Tutti', carta: 'Carta', contanti: 'Contanti' }[a]}</button>`).join('')}</div>
  <div id="listBox"></div>`;
}
function accCard(id, name, a, p) {
  return `<button class="card acc ${ui.acct === id ? 'sel' : ''}" data-act="acct" data-id="${ui.acct === id ? 'tutti' : id}">
    <div class="t"><span>${name}</span></div><div class="v num">${money(a.rest)}</div>
    <div class="l num"><span>Entrate</span><span class="pos">${money(a.in)}</span></div>
    <div class="l num"><span>Uscite</span><span class="neg">${money(a.out)}</span></div></button>`;
}

function rowHtml(t, showAcct, showPeriod) {
  const debt = S.state.debts.find(d => d.txId === t.id);
  const sm = [showAcct ? `<span class="tag ${t.account === 'carta' ? 'card' : 'cash'}">${t.account === 'carta' ? 'Carta' : 'Contanti'}</span>` : '',
    debt ? `<span class="tag dbt">${esc(debt.person)}</span>` : '', showPeriod ? `<span>${esc(fmtShort(t.date))}</span>` : ''].join('');
  const title = (t.category ? `<b>${esc(t.category)}</b>${t.desc ? ' - ' : ''}` : '') + esc(t.desc);
  return `<button class="row" data-act="editTx" data-id="${t.id}"><div class="main"><div class="ttl">${title || '—'}</div>${sm ? `<div class="sm">${sm}</div>` : ''}</div>
    <div class="amt num ${t.kind === 'in' ? 'pos' : ''}">${t.kind === 'in' ? '+' : '−'}${money(t.amount)}</div></button>`;
}
const byDateDesc = (a, b) => b[0].date.localeCompare(a[0].date) || b[1] - a[1];

function renderList() {
  const box = $('#listBox'); if (!box) return;
  const q = ui.q.trim().toLowerCase();
  let items, global = !!q;
  if (global) {
    items = S.state.transactions.map((t, i) => [t, i]).filter(([t]) => (ui.acct === 'tutti' || t.account === ui.acct) &&
      (display(t) + ' ' + t.amount + ' ' + (S.state.debts.find(d => d.txId === t.id)?.person || '')).toLowerCase().includes(q));
  } else {
    items = S.txOf(ui.periodId).map((t, i) => [t, i]).filter(([t]) => ui.acct === 'tutti' || t.account === ui.acct);
  }
  items.sort(byDateDesc);
  if (!items.length) { box.innerHTML = `<div class="empty">${global ? 'Nessun risultato' : 'Nessun movimento.<br>Tocca + per aggiungerne uno.'}</div>`; return; }
  let html = '', day = null, shown = items.slice(0, global ? 300 : 2000), buf = [], dsum = 0;
  const flush = () => { if (day) html += `<div class="dayh"><span>${esc(fmtDay(day))}</span><span class="num">${signed(dsum)}</span></div><div class="list">${buf.join('')}</div>`; buf = []; dsum = 0; };
  for (const [t] of shown) {
    if (t.date !== day) { flush(); day = t.date; }
    buf.push(rowHtml(t, ui.acct === 'tutti', global)); dsum += t.kind === 'in' ? t.amount : -t.amount;
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
    </div>
    <p class="hint">Lo stipendio entra sulla carta. “Spesa reale” = inizio carta + inizio contanti + stipendio − restanti + rettifica. Una rettifica negativa (es. −200) riduce la spesa reale, come quando nel foglio sottraevi una cifra da N2.</p>
    <div class="form"><div class="frow"><label>Dal</label><input id="pFrom" type="date" value="${p.start}"></div><div class="frow"><label>Al</label><input id="pTo" type="date" value="${p.end}"></div></div>`, {
    onSave: async w => {
      const g = id => $(id, w).value.trim(), n = id => g(id) === '' ? null : num(g(id));
      const sal = n('#pSal'), sc = n('#pCard') ?? 0, sk = n('#pCash') ?? 0, adj = n('#pAdj') ?? 0;
      if ([sal, sc, sk, adj].some(x => x !== null && Number.isNaN(x))) return toast('Controlla i numeri'), false;
      await S.save('periods', { ...p, salary: sal, startCard: sc, startCash: sk, adjust: adj, start: g('#pFrom') || p.start, end: g('#pTo') || p.end });
      render();
    }
  });
}

// ---------- form movimento ----------
function recentCats() {
  const cut = new Date(Date.now() - 120 * 864e5).toISOString().slice(0, 10), m = new Map();
  for (const t of S.state.transactions) if (t.category && t.date >= cut && !t.pair) m.set(t.category, (m.get(t.category) || 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 9).map(x => x[0]);
}
function allCats() {
  const m = new Map(); for (const t of S.state.transactions) if (t.category) m.set(t.category, (m.get(t.category) || 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]).map(x => x[0]);
}
const peopleNames = () => C.people().map(p => p.name).sort((a, b) => a.localeCompare(b));

function openTxSheet(existing, preset = {}) {
  const e = existing, debt0 = e && S.state.debts.find(d => d.txId === e.id);
  const f = {
    kind: e ? e.kind : (preset.kind || 'out'), acct: e ? e.account : (preset.acct || S.state.meta.lastAcct || 'carta'), giro: false, giroDir: 'prelievo',
  };
  const body = `
    <div class="seg big" id="fKind" style="margin-bottom:12px">${e ? '' : ''}<button data-v="out">Uscita</button><button data-v="in">Entrata</button>${e ? '' : '<button data-v="giro">Giroconto</button>'}</div>
    <div class="seg" id="fAcct" style="margin-bottom:12px"><button data-v="carta">Carta</button><button data-v="contanti">Contanti</button></div>
    <div class="seg" id="fGiro" style="margin-bottom:12px" hidden><button data-v="prelievo">Carta → Contanti</button><button data-v="versamento">Contanti → Carta</button></div>
    <div class="form">
      <div class="frow amount"><input id="fAmt" inputmode="decimal" placeholder="0,00" value="${e ? String(e.amount).replace('.', ',') : ''}" autocomplete="off"></div>
      <div class="frow"><label>Data</label><input id="fDate" type="date" value="${e ? e.date : C.today()}"></div>
      <div id="fTextRows">
        <div class="frow"><label>Tipo</label><input id="fCat" list="catList" placeholder="es. Amazon, Uscita, Bonifico" value="${esc(e?.category || '')}" autocomplete="off" autocapitalize="sentences"></div>
        <div class="frow"><label>Motivo</label><input id="fDesc" placeholder="Descrizione" value="${esc(e?.desc || '')}" autocomplete="off" autocapitalize="sentences"></div>
      </div>
    </div>
    <datalist id="catList">${allCats().slice(0, 150).map(c => `<option value="${esc(c)}">`).join('')}</datalist>
    <div class="chips" id="fChips">${recentCats().map(c => `<button data-c="${esc(c)}">${esc(c)}</button>`).join('')}</div>
    <div id="fDebtBox"><div class="form">
      <div class="frow"><label>Debito con</label><select id="fPerson"><option value="">— nessuno —</option>${peopleNames().map(n => `<option ${debt0?.person === n ? 'selected' : ''}>${esc(n)}</option>`).join('')}<option value="__new">+ Nuova persona…</option></select></div>
      <div class="frow" id="fDtRow" hidden><label>Tipo</label><select id="fDt"></select></div>
    </div></div>
    ${e ? `<button class="btn red" data-del style="margin-top:6px">Elimina movimento</button>` : ''}`;

  openSheet(e ? 'Modifica movimento' : 'Nuovo movimento', body, {
    onMount: (w) => {
      const setSeg = (id, val) => $$(`#${id} button`, w).forEach(b => b.classList.toggle('on', b.dataset.v === val));
      const $$ = (s, r) => [...r.querySelectorAll(s)];
      const sync = () => {
        f.giro = f.kind === 'giro';
        setSeg('fKind', f.kind); setSeg('fAcct', f.acct); setSeg('fGiro', f.giroDir);
        $('#fAcct', w).hidden = f.giro; $('#fGiro', w).hidden = !f.giro; $('#fTextRows', w).hidden = f.giro; $('#fChips', w).hidden = f.giro; $('#fDebtBox', w).hidden = f.giro;
        // tipi di debito coerenti con entrata/uscita
        const sel = $('#fDt', w), keep = sel.value || debt0?.type;
        const types = Object.entries(DEBT_TYPES).filter(([, t]) => t.kind === (f.kind === 'in' ? 'in' : 'out'));
        sel.innerHTML = types.map(([k, t]) => `<option value="${k}" ${k === keep ? 'selected' : ''}>${t.label}</option>`).join('');
        $('#fDtRow', w).hidden = !$('#fPerson', w).value;
      };
      $$('#fKind button', w).forEach(b => b.onclick = () => { f.kind = b.dataset.v; sync(); });
      $$('#fAcct button', w).forEach(b => b.onclick = () => { f.acct = b.dataset.v; sync(); });
      $$('#fGiro button', w).forEach(b => b.onclick = () => { f.giroDir = b.dataset.v; sync(); });
      $$('#fChips button', w).forEach(b => b.onclick = () => { $('#fCat', w).value = b.dataset.c; $('#fDesc', w).focus(); });
      $('#fPerson', w).onchange = ev => {
        if (ev.target.value === '__new') {
          const n = (prompt('Nome della persona:') || '').trim();
          if (n) { const o = new Option(n, n, true, true); ev.target.add(o, ev.target.options.length - 1); S.setMeta('people', [...new Set([...(S.state.meta.people || []), n])]); } else ev.target.value = '';
        }
        sync();
      };
      const del = $('[data-del]', w);
      if (del) del.onclick = async () => {
        const partner = e.pair && S.state.transactions.find(t => t.pair === e.pair && t.id !== e.id);
        if (!confirm(partner ? 'Eliminare questo giroconto (entrambi i movimenti)?' : 'Eliminare questo movimento?')) return;
        for (const d of S.state.debts.filter(d => d.txId === e.id || d.txId === partner?.id)) await S.remove('debts', d.id);
        await S.remove('transactions', e.id); if (partner) await S.remove('transactions', partner.id);
        w.remove(); render(); toast('Eliminato');
      };
      sync();
      if (!e) setTimeout(() => $('#fAmt', w).focus(), 300);
      w._f = f;
    },
    onSave: async w => {
      const amount = num($('#fAmt', w).value), date = $('#fDate', w).value;
      if (!(amount > 0)) return toast('Inserisci un importo'), false;
      if (!date) return toast('Inserisci la data'), false;
      const amt = C.r2(amount);
      if (f.giro) {
        const p = C.ensurePeriodFor(date), pair = S.uid();
        const mk = (account, kind, category, desc) => ({ id: S.uid(), periodId: p.id, date, account, kind, amount: amt, category, desc, pair });
        const out = f.giroDir === 'prelievo'
          ? [mk('carta', 'out', 'Prelievo', 'Bancomat'), mk('contanti', 'in', 'Prelievo', 'Da carta')]
          : [mk('contanti', 'out', 'Versamento', 'Contanti'), mk('carta', 'in', 'Versamento', 'Contanti')];
        for (const t of out) await S.save('transactions', t);
      } else {
        const cat = $('#fCat', w).value.trim(), desc = $('#fDesc', w).value.trim();
        if (!cat && !desc) return toast('Scrivi tipo o motivo'), false;
        let periodId = e?.periodId;
        const per = S.period(periodId);
        if (!per || date < per.start || date > per.end) periodId = C.ensurePeriodFor(date).id;
        const t = { ...(e || {}), id: e?.id || S.uid(), periodId, date, account: f.acct, kind: f.kind, amount: amt, category: cat, desc };
        await S.save('transactions', t);
        const partner = e?.pair && S.state.transactions.find(x => x.pair === e.pair && x.id !== e.id);
        if (partner) await S.save('transactions', { ...partner, amount: amt, date, periodId });
        // debito collegato
        const person = $('#fPerson', w).value, old = S.state.debts.find(d => d.txId === t.id);
        if (person && person !== '__new') {
          const type = $('#fDt', w).value, dt = DEBT_TYPES[type];
          await S.save('debts', { id: old?.id || S.uid(), person, type, amount: C.r2(dt.sign * amt), date, note: display(t), txId: t.id });
        } else if (old) await S.remove('debts', old.id);
        await S.setMeta('lastAcct', f.acct);
        ui.periodId = periodId;
      }
      render(); toast(e ? 'Modificato' : 'Aggiunto ✓');
    }
  });
}

// ---------- DEBITI ----------
function viewDebiti() {
  const ppl = C.people(), owed = ppl.filter(p => p.bal > 0).reduce((s, p) => s + p.bal, 0), owe = -ppl.filter(p => p.bal < 0).reduce((s, p) => s + p.bal, 0);
  return `<div class="bar"><h1>Debiti</h1><button class="iconbtn" data-act="newPerson" aria-label="Nuova persona">${IC.plus.replace('width="26" height="26"', 'width="22" height="22"')}</button></div>
  <div class="grid2"><div class="card acc"><div class="t">Ti devono</div><div class="v num pos">${money(owed)}</div></div><div class="card acc"><div class="t">Devi</div><div class="v num neg">${money(owe)}</div></div></div>
  ${ppl.length ? `<div class="list" style="margin-top:4px">${ppl.map(p => `<button class="row" data-act="person" data-id="${esc(p.name)}"><div class="main"><div class="ttl"><b>${esc(p.name)}</b></div><div class="sm">${p.bal > 0 ? 'ti deve' : p.bal < 0 ? 'devi' : 'in pari'}</div></div><div class="amt num ${p.bal > 0 ? 'pos' : p.bal < 0 ? 'neg' : 'muted'}">${money(Math.abs(p.bal))}</div></button>`).join('')}</div>`
    : `<div class="empty">Nessun debito registrato.<br>Aggiungi una persona con + oppure collega un debito mentre inserisci un movimento.</div>`}
  <p class="hint" style="margin-top:14px">Nei fogli i prestiti erano scritti nei motivi (es. “Prestito Papà”). Apri una persona e usa <b>Collega movimenti esistenti</b> per trasformarli in debiti.</p>`;
}

function newPerson() {
  const n = (prompt('Nome della persona:') || '').trim(); if (!n) return;
  S.setMeta('people', [...new Set([...(S.state.meta.people || []), n])]).then(() => { render(); openPerson(n); });
}

function openPerson(name) {
  const draw = () => {
    const ds = S.state.debts.filter(d => d.person === name).sort((a, b) => b.date.localeCompare(a.date));
    const bal = C.r2(ds.reduce((s, d) => s + d.amount, 0));
    return `<div class="card hero" style="text-align:center"><div class="lbl">${bal > 0 ? name + ' ti deve' : bal < 0 ? 'Devi a ' + name : 'In pari con ' + name}</div><div class="big num ${bal > 0 ? 'pos' : bal < 0 ? 'neg' : ''}">${money(Math.abs(bal))}</div></div>
    <div class="btns2">${Object.entries(DEBT_TYPES).map(([k, t]) => `<button class="btn sec" data-dt="${k}">${t.label}</button>`).join('')}</div>
    <button class="btn sec" data-link>Collega movimenti esistenti</button>
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
    </div><p class="hint">Scegli Carta o Contanti per creare anche il movimento nel mese; “Solo promemoria” non tocca i saldi.</p>`, {
    onMount: w => setTimeout(() => $('#eAmt', w).focus(), 300),
    onSave: async w => {
      const amt = C.r2(num($('#eAmt', w).value)), date = $('#eDate', w).value, note = $('#eNote', w).value.trim(), acc = $('#eAcc', w).value;
      if (!(amt > 0) || !date) return toast('Importo e data obbligatori'), false;
      let txId = null;
      if (acc) {
        const p = C.ensurePeriodFor(date);
        const cat = type === 'lent' || type === 'borrowed' ? 'Prestito' : 'Rimborso';
        const t = { id: S.uid(), periodId: p.id, date, account: acc, kind: dt.kind, amount: amt, category: cat, desc: person + (note ? ' - ' + note : '') };
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
        $('#lres', w).innerHTML = res.length ? `<div class="list">${res.map(([t]) => rowHtml(t, true, true).replace('data-act="editTx"', 'data-pick')).join('')}</div>` : '<div class="empty">Nessun movimento</div>';
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
function viewStat() {
  const ps = S.state.periods;
  if (!ps.length) return `<div class="bar"><h1>Statistiche</h1></div><div class="empty">Nessun dato</div>`;
  const years = [...new Set(ps.map(C.periodYear))].sort();
  if (!ui.statYear || (ui.statYear !== 'tutto' && !years.includes(ui.statYear))) ui.statYear = years[years.length - 1];
  const sel = ps.filter(p => ui.statYear === 'tutto' || C.periodYear(p) === ui.statYear);
  const rows = sel.map(p => ({ p, s: C.stats(p) }));
  const tot = rows.reduce((a, { p, s }) => ({ sal: a.sal + (p.salary || 0), real: a.real + s.real, sav: a.sav + (s.saved || 0) }), { sal: 0, real: 0, sav: 0 });
  const max = Math.max(1, ...rows.map(r => Math.max(r.s.real, r.s.saved || 0)));
  const cats = new Map(); let outTot = 0;
  for (const { p } of rows) for (const t of S.txOf(p.id)) if (t.kind === 'out' && !t.pair) { const k = t.category || 'Altro'; cats.set(k, (cats.get(k) || 0) + t.amount); outTot += t.amount; }
  const top = [...cats.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
  const showBars = rows.length <= 14;
  return `<div class="bar"><h1>Statistiche</h1></div>
  <div class="seg" style="overflow-x:auto">${[...years, 'tutto'].map(y => `<button data-act="statYear" data-id="${y}" class="${ui.statYear === y ? 'on' : ''}">${y === 'tutto' ? 'Tutto' : y}</button>`).join('')}</div>
  <div class="card" style="margin-top:12px">
    <div class="kv"><span>Stipendi</span><b class="num">${money(tot.sal)}</b></div>
    <div class="kv"><span>Spesa reale</span><b class="num">${money(tot.real)}</b></div>
    <div class="kv"><span>Risparmiato</span><b class="num ${tot.sav >= 0 ? 'pos' : 'neg'}">${signed(tot.sav).replace('+', '')}</b></div>
    <div class="kv"><span>Media spesa mensile</span><b class="num">${money(rows.length ? tot.real / rows.length : 0)}</b></div>
  </div>
  ${showBars ? `<div class="card"><div class="sechead" style="margin:0 0 4px"><span>Mese per mese</span><span><span style="color:var(--accent)">■</span> spesa <span style="color:var(--green)">■</span> risparmio</span></div><div class="bars">${rows.map(({ p, s }) => `<div class="b"><div style="display:flex;gap:2px;align-items:flex-end;width:100%;height:100%"><div class="col" style="height:${Math.max(1, s.real / max * 100)}%"></div><div class="col sv" style="height:${Math.max(1, Math.max(0, s.saved || 0) / max * 100)}%"></div></div><div class="m">${C.MESI_BREVI[+p.start.slice(5, 7) - 1]}</div></div>`).join('')}</div></div>` : ''}
  <div class="sechead"><span>Uscite per tipo</span><span class="num">${money(outTot)}</span></div>
  <div class="card">${top.map(([k, v]) => `<button class="hbar" style="display:block;width:100%;text-align:left" data-act="searchCat" data-id="${esc(k)}"><div class="top"><span>${esc(k)}</span><span class="num">${money(v)}</span></div><div class="track"><div class="fill" style="width:${v / top[0][1] * 100}%"></div></div></button>`).join('') || '<div class="empty">—</div>'}</div>
  <div class="sechead"><span>Per mese</span></div>
  <div class="list">${[...rows].reverse().map(({ p, s }) => `<button class="row" data-act="gotoPeriod" data-id="${esc(p.id)}"><div class="main"><div class="ttl">${esc(periodLabel(p))}</div><div class="sm num">Spesa ${money(s.real)}</div></div><div class="amt num ${s.saved == null ? 'muted' : s.saved >= 0 ? 'pos' : 'neg'}">${s.saved == null ? '—' : signed(s.saved)}</div></button>`).join('')}</div>`;
}

// ---------- ALTRO ----------
function viewAltro() {
  const d = backupDays(), n = S.state.transactions.length;
  const warn = n > 0 && (d === null || d > 30) ? `<div class="warn">⚠️ ${d === null ? 'Non hai ancora fatto nessun backup.' : `Ultimo backup ${d} giorni fa.`} I dati sono salvati solo su questo iPhone: esporta un backup e salvalo su iCloud Drive.</div>` : '';
  return `<div class="bar"><h1>Altro</h1></div>${warn}
  <div class="sechead"><span>Backup e dati</span></div>
  <div class="list">
    <button class="row" data-act="export"><div class="main"><div class="ttl">Esporta backup (JSON)</div><div class="sm">${S.state.meta.lastBackup ? 'Ultimo: ' + new Date(S.state.meta.lastBackup).toLocaleDateString('it-IT') : 'Mai eseguito'}</div></div></button>
    <label class="row"><div class="main"><div class="ttl">Importa / ripristina backup</div><div class="sm">Scegli un file .json (anche dati-iniziali.json)</div></div><input type="file" accept=".json,application/json" hidden data-import="ask"></label>
    <button class="row" data-act="csv"><div class="main"><div class="ttl">Esporta tutti i movimenti (CSV)</div><div class="sm">Apribile con Excel / Numbers</div></div></button>
  </div>
  <div class="sechead"><span>Riepilogo</span></div>
  <div class="card"><div class="kv"><span>Mesi</span><b>${S.state.periods.length}</b></div><div class="kv"><span>Movimenti</span><b>${n}</b></div><div class="kv"><span>Voci di debito</span><b>${S.state.debts.length}</b></div></div>
  <div class="sechead"><span>App</span></div>
  <div class="list">
    <button class="row" data-act="update"><div class="main"><div class="ttl">Aggiorna app</div><div class="sm">Ricarica l’ultima versione (i dati restano)</div></div></button>
    <button class="row" data-act="wipe"><div class="main"><div class="ttl neg">Cancella tutti i dati</div></div></button>
  </div>`;
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
async function doImport(file, mode) {
  try {
    const d = JSON.parse(await file.text()); S.validate(d);
    if (mode === 'ask') {
      const replace = S.state.transactions.length === 0 || confirm(`Il file contiene ${d.periods.length} mesi e ${d.transactions.length} movimenti.\n\nOK = SOSTITUISCI tutti i dati attuali\nAnnulla = scegli se unire`);
      if (replace) mode = 'replace';
      else if (confirm('Unire i dati del file a quelli presenti? (i movimenti con lo stesso ID vengono aggiornati)')) mode = 'merge';
      else return;
    }
    await S.importData(d, mode);
    if (d.people) await S.setMeta('people', d.people);
    ui.periodId = null; ui.tab = 'mese'; C.ensurePeriodFor(C.today());
    render(); toast(`Importati ${d.transactions.length} movimenti`);
  } catch (e) { alert('Importazione non riuscita: ' + e.message); }
}

// ---------- eventi ----------
const actions = {
  tab: el => { ui.tab = el.dataset.id; window.scrollTo(0, 0); render(); },
  add: () => openTxSheet(null),
  prev: () => { const i = S.state.periods.findIndex(p => p.id === ui.periodId); if (i > 0) { ui.periodId = S.state.periods[i - 1].id; render(); } },
  next: () => { const i = S.state.periods.findIndex(p => p.id === ui.periodId); if (i < S.state.periods.length - 1) { ui.periodId = S.state.periods[i + 1].id; render(); } },
  pickPeriod, editPeriod,
  gotoPeriod: el => { ui.periodId = el.dataset.id; ui.tab = 'mese'; ui.q = ''; $('#sheetRoot').innerHTML = ''; render(); window.scrollTo(0, 0); },
  acct: el => { ui.acct = el.dataset.id; render(); },
  editTx: el => openTxSheet(S.state.transactions.find(t => t.id === el.dataset.id)),
  newPerson, person: el => openPerson(el.dataset.id),
  statYear: el => { ui.statYear = el.dataset.id; render(); },
  searchCat: el => { ui.q = el.dataset.id; ui.tab = 'mese'; render(); window.scrollTo(0, 0); },
  export: doExport, csv: doCsv,
  startEmpty: async () => { C.ensurePeriodFor(C.today()); render(); },
  update: async () => { const regs = await navigator.serviceWorker?.getRegistrations?.() || []; for (const r of regs) await r.unregister(); for (const k of await caches.keys()) await caches.delete(k); location.reload(); },
  wipe: async () => { if (confirm('Cancellare TUTTI i dati dall’app? Operazione irreversibile (fai prima un backup).') && confirm('Sei sicuro?')) { await S.wipe(); ui.periodId = null; render(); toast('Dati cancellati'); } },
};
document.addEventListener('click', e => { const el = e.target.closest('[data-act]'); if (el && actions[el.dataset.act]) { e.preventDefault(); actions[el.dataset.act](el); } });
document.addEventListener('change', e => { const el = e.target; if (el.matches && el.matches('[data-import]') && el.files[0]) { doImport(el.files[0], el.dataset.import); el.value = ''; } });
document.addEventListener('input', e => { if (e.target.id === 'q') { ui.q = e.target.value; renderList(); } });
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'q') e.target.blur(); });

// ---------- avvio ----------
(async function boot() {
  try {
    await S.load();
    if (S.state.periods.length) { C.ensurePeriodFor(C.today()); }
    if (navigator.storage?.persist) navigator.storage.persist().catch(() => {});
  } catch (err) { $('#view').innerHTML = `<div class="card"><b>Impossibile aprire l’archivio dati.</b><p class="muted">${esc(err.message)}<br>Se usi la navigazione privata, apri l’app normalmente.</p></div>`; return; }
  render();
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => {});
  document.addEventListener('visibilitychange', () => { if (!document.hidden && S.state.periods.length) { C.ensurePeriodFor(C.today()); if (ui.tab !== 'mese' || !$('#q') || document.activeElement !== $('#q')) renderTabs(); } });
})();
