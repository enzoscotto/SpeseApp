// Sincronizzazione automatica dei dati su un repository GitHub privato (file dati/spese.json).
import * as S from './store.js';

const API = 'https://api.github.com';
let timer = null, retry = null, running = false, again = false, quiet = false, lastCheck = 0;
export const status = { msg: '', busy: false };
let onStatus = () => {}, onConflict = () => {};

export const config = () => S.state.meta.sync || null;
export const setStatusListener = f => { onStatus = f; };
export const setConflictListener = f => { onConflict = f; };
const say = (msg, busy = false) => { status.msg = msg; status.busy = busy; onStatus(); };

const hdr = (token, accept = 'application/vnd.github+json') => ({ Authorization: `Bearer ${token}`, Accept: accept, 'X-GitHub-Api-Version': '2022-11-28' });
const path = c => c.path || 'dati/spese.json';

function toBase64(str) {
  const bytes = new TextEncoder().encode(str); let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

async function remoteSha(c) {
  const p = path(c), dir = p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : '', name = p.split('/').pop();
  const r = await fetch(`${API}/repos/${c.repo}/contents/${dir}`, { headers: hdr(c.token), cache: 'no-store' });
  if (r.status === 404) return null;
  if (!r.ok) throw await apiError(r);
  const list = await r.json();
  return (Array.isArray(list) ? list.find(x => x.name === name) : null)?.sha || null;
}
async function apiError(r) {
  let m = ''; try { m = (await r.json()).message; } catch { /* ignore */ }
  const e = new Error(r.status === 401 ? 'Token non valido o scaduto' : r.status === 404 ? 'Repository non trovato (controlla nome e permessi del token)' : `GitHub ${r.status}${m ? ': ' + m : ''}`);
  e.status = r.status; return e;
}

async function put(c, sha, body) {
  return fetch(`${API}/repos/${c.repo}/contents/${path(c)}`, {
    method: 'PUT', headers: { ...hdr(c.token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Sincronizzazione app spese', content: body, ...(sha ? { sha } : {}) }),
  });
}

export async function push() {
  const c = config(); if (!c) return;
  if (running) { again = true; return; }
  if (!S.state.transactions.length && !S.state.periods.length) { say('Nessun dato da inviare (i dati su GitHub non vengono toccati)'); return; }
  if (!navigator.onLine) { say('Offline: sincronizzo appena torna la rete'); return; }
  running = true; say('Sincronizzazione…', true);
  try {
    const body = toBase64(JSON.stringify(S.exportData()));
    let sha = S.state.meta.syncSha ?? await remoteSha(c);
    let r = await put(c, sha, body);
    if (r.status === 409 || r.status === 422) {
      if (S.state.meta.syncSha) { const e = new Error('Su GitHub ci sono dati più recenti'); e.conflict = true; throw e; }   // qualcun altro ha cambiato il file: non lo sovrascrivo senza chiedere
      sha = await remoteSha(c); r = await put(c, sha, body);
    }
    if (!r.ok) throw await apiError(r);
    const j = await r.json();
    await S.setMeta('syncSha', j.content.sha); await S.setMeta('syncDirty', false);
    await S.setMeta('lastSync', new Date().toISOString());
    say('');
  } catch (e) {
    if (e.conflict) { say(''); setTimeout(() => onConflict(), 60); return; }
    await S.setMeta('syncSha', null);
    say('Errore: ' + e.message);
    clearTimeout(retry);
    if (e.status !== 401 && e.status !== 404) retry = setTimeout(push, 30000);   // rete instabile o GitHub occupato: riprovo da solo
  } finally {
    running = false; onStatus();
    if (again) { again = false; schedule(500); }
  }
}

export function schedule(ms = 1500) {
  if (!config() || quiet) return;
  S.setMeta('syncDirty', true);
  clearTimeout(timer); timer = setTimeout(push, ms);
}

// chiamata quando l'app va in secondo piano: invia subito quello che e' rimasto in coda
export function flush() { if (config() && S.state.meta.syncDirty) { clearTimeout(timer); push(); } }

export function resumeIfDirty() { if (config() && S.state.meta.syncDirty) schedule(500); }

// confronta il file su GitHub con l'ultimo che questo telefono ha inviato o scaricato
// -> { changed, sha } oppure null (nessuna rete, sincronizzazione spenta, controllo gia' fatto da poco)
export async function check(force = false) {
  const c = config(); if (!c || running || !navigator.onLine) return null;
  if (!force && Date.now() - lastCheck < 15000) return null;
  lastCheck = Date.now();
  const sha = await remoteSha(c);
  if (!sha) return null;
  return { changed: sha !== S.state.meta.syncSha, sha };
}

// sostituisce i dati locali con quelli scaricati senza rimandarli subito su GitHub
export async function applyRemote(sha, importFn) {
  quiet = true; clearTimeout(timer);
  try {
    await importFn();
    await S.setMeta('syncSha', sha); await S.setMeta('syncDirty', false);
    await S.setMeta('lastSync', new Date().toISOString());
  } finally { quiet = false; onStatus(); }
}

export async function download() {
  const c = config(); if (!c) throw new Error('Sincronizzazione non attiva');
  const r = await fetch(`${API}/repos/${c.repo}/contents/${path(c)}`, { headers: hdr(c.token, 'application/vnd.github.raw+json'), cache: 'no-store' });
  if (!r.ok) throw await apiError(r);
  return r.json();
}

// controlla repository e token e scarica il file dati se esiste, senza attivare nulla
export async function probe(repo, token) {
  const c = { repo: repo.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '').replace(/\/$/, ''), token: token.trim(), path: 'dati/spese.json' };
  if (!/^[\w.-]+\/[\w.-]+$/.test(c.repo)) throw new Error('Scrivi il repository come utente/nome');
  const r = await fetch(`${API}/repos/${c.repo}`, { headers: hdr(c.token) });
  if (!r.ok) throw await apiError(r);
  const f = await fetch(`${API}/repos/${c.repo}/contents/${path(c)}`, { headers: hdr(c.token, 'application/vnd.github.raw+json'), cache: 'no-store' });
  if (f.status === 404) return { c, exists: false };
  if (!f.ok) throw await apiError(f);
  return { c, exists: true, data: await f.json() };
}

// attiva la sincronizzazione; send = true invia subito i dati del telefono
export async function enable(c, send) {
  await S.setMeta('sync', c); await S.setMeta('syncSha', null); await S.setMeta('syncDirty', false);
  if (send) {
    await push();
    if (status.msg.startsWith('Errore')) throw new Error(status.msg.slice(8));
  }
}

export async function disable() { await S.setMeta('sync', null); await S.setMeta('syncSha', null); say(''); }
