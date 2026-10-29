// Archivio dati: tutto in memoria + salvataggio su IndexedDB.
const DB_NAME = 'spese-db', DB_VER = 1;
const STORES = ['periods', 'transactions', 'debts', 'meta'];
let db = null;

export const state = { periods: [], transactions: [], debts: [], meta: {} };
let byPeriod = new Map();
const listeners = [];
export const onChange = f => listeners.push(f);
const changed = () => listeners.forEach(f => f());

function req(r) { return new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }

export async function load() {
  db = await new Promise((res, rej) => {
    const o = indexedDB.open(DB_NAME, DB_VER);
    o.onupgradeneeded = () => { STORES.forEach(s => { if (!o.result.objectStoreNames.contains(s)) o.result.createObjectStore(s, { keyPath: 'id' }); }); };
    o.onsuccess = () => res(o.result);
    o.onerror = () => rej(o.error);
  });
  const all = s => req(db.transaction(s).objectStore(s).getAll());
  state.periods = await all('periods');
  state.transactions = await all('transactions');
  state.debts = await all('debts');
  state.meta = Object.fromEntries((await all('meta')).map(m => [m.id, m.value]));
  sortPeriods(); reindex();
}

function sortPeriods() { state.periods.sort((a, b) => a.start.localeCompare(b.start) || a.id.localeCompare(b.id)); }
export function reindex() {
  byPeriod = new Map();
  for (const t of state.transactions) {
    if (!byPeriod.has(t.periodId)) byPeriod.set(t.periodId, []);
    byPeriod.get(t.periodId).push(t);
  }
}
export const txOf = pid => byPeriod.get(pid) || [];
export const period = id => state.periods.find(p => p.id === id);

function tx(stores) { return db.transaction(stores, 'readwrite'); }
const coll = { periods: 'periods', transactions: 'transactions', debts: 'debts' };

export async function save(store, obj) {
  const arr = state[store], i = arr.findIndex(x => x.id === obj.id);
  if (i >= 0) arr[i] = obj; else arr.push(obj);
  if (store === 'periods') sortPeriods();
  reindex();
  await req(tx(store).objectStore(store).put(obj));
  changed();
}
export async function remove(store, id) {
  state[store] = state[store].filter(x => x.id !== id);
  reindex();
  await req(tx(store).objectStore(store).delete(id));
  changed();
}
export async function setMeta(key, value) {
  state.meta[key] = value;
  await req(tx('meta').objectStore('meta').put({ id: key, value }));
  if (key === 'people') changed();
}

export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 9));

export function exportData() {
  return { version: 1, exportedAt: new Date().toISOString(), periods: state.periods, transactions: state.transactions, debts: state.debts, people: state.meta.people || [] };
}

export function validate(d) {
  if (!d || !Array.isArray(d.periods) || !Array.isArray(d.transactions)) throw new Error('File non valido');
  for (const t of d.transactions) {
    if (!t.id || !t.periodId || !t.date || typeof t.amount !== 'number' || !['carta', 'contanti'].includes(t.account) || !['in', 'out'].includes(t.kind)) throw new Error('Movimento non valido: ' + JSON.stringify(t).slice(0, 80));
  }
  for (const p of d.periods) if (!p.id || !p.start || !p.end) throw new Error('Periodo non valido');
}

// mode: 'replace' | 'merge'
export async function importData(d, mode) {
  validate(d);
  d.debts = d.debts || [];
  const stores = ['periods', 'transactions', 'debts'];
  const t = tx(stores);
  if (mode === 'replace') for (const s of stores) t.objectStore(s).clear();
  for (const s of stores) for (const o of d[s]) t.objectStore(s).put(o);
  await new Promise((res, rej) => { t.oncomplete = res; t.onerror = () => rej(t.error); });
  if (mode === 'replace') {
    state.periods = d.periods.slice(); state.transactions = d.transactions.slice(); state.debts = d.debts.slice();
  } else {
    for (const s of stores) {
      const m = new Map(state[s].map(x => [x.id, x]));
      for (const o of d[s]) m.set(o.id, o);
      state[s] = [...m.values()];
    }
  }
  sortPeriods(); reindex(); changed();
}

export async function wipe() {
  const t = tx(STORES);
  STORES.forEach(s => t.objectStore(s).clear());
  await new Promise(r => { t.oncomplete = r; });
  state.periods = []; state.transactions = []; state.debts = []; state.meta = {};
  reindex();
}

export async function bulkSave(store, objs) {
  if (!objs.length) return;
  const m = new Map(state[store].map(x => [x.id, x]));
  for (const o of objs) m.set(o.id, o);
  state[store] = [...m.values()]; reindex();
  const t = tx(store);
  for (const o of objs) t.objectStore(store).put(o);
  await new Promise((res, rej) => { t.oncomplete = res; t.onerror = () => rej(t.error); });
  changed();
}
