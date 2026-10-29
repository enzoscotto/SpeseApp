// Calcoli: replicano le formule dei fogli Excel.
import { state, txOf, period, save, uid } from './store.js';

const eur = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', useGrouping: 'always' });
// Modalita' privacy: money/signed nascondono le cifre; moneyRaw/signedRaw (usate dai movimenti) restano sempre visibili.
let hidden = false;
export const setPrivacy = v => { hidden = !!v; };
export const moneyRaw = n => eur.format(Math.abs(n) < 0.005 ? 0 : n);
export const signedRaw = n => (n > 0 ? '+' : n < 0 ? '−' : '') + eur.format(Math.abs(n));
export const money = n => (hidden ? '•••• €' : moneyRaw(n));
export const signed = n => (hidden ? '•••• €' : signedRaw(n));
export const r2 = n => Math.round(n * 100) / 100;

export const pad = n => String(n).padStart(2, '0');
export const isoDate = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = () => isoDate(new Date());
const MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
export const MESI_BREVI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const fmtShort = s => { const d = parse(s); return `${d.getDate()} ${MESI_BREVI[d.getMonth()]} ${d.getFullYear()}`; };
export const fmtDay = s => parse(s).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });

export function periodLabel(p) {
  const a = parse(p.start), b = parse(p.end);
  const last = new Date(a.getFullYear(), a.getMonth() + 1, 0).getDate();
  if (a.getDate() === 1 && b.getFullYear() === a.getFullYear() && b.getMonth() === a.getMonth() && b.getDate() === last) return `${MESI[a.getMonth()]} ${a.getFullYear()}`;
  return `${a.getDate()} ${MESI_BREVI[a.getMonth()]} ${a.getFullYear()} – ${b.getDate()} ${MESI_BREVI[b.getMonth()]} ${b.getFullYear()}`;
}
export const monthName = p => MESI[parse(p.start).getMonth()].toLowerCase();
export const periodYear = p => p.start.slice(0, 4);

export function stats(p) {
  const t = txOf(p.id);
  const sum = (acc, kind) => r2(t.filter(x => x.account === acc && x.kind === kind).reduce((s, x) => s + x.amount, 0));
  const card = { in: sum('carta', 'in'), out: sum('carta', 'out') };
  const cash = { in: sum('contanti', 'in'), out: sum('contanti', 'out') };
  const sal = p.salary || 0;
  card.start = p.startCard || 0; cash.start = p.startCash || 0;
  card.rest = r2(card.start + sal + card.in - card.out);   // G5
  cash.rest = r2(cash.start + cash.in - cash.out);          // O5
  // "vero totale uscite" (N2): inizio + stipendio - restanti + rettifica
  const real = r2(card.start + cash.start + sal - card.rest - cash.rest + (p.adjust || 0));
  const saved = p.salary == null ? null : r2(sal - real);   // F2
  return { card, cash, real, saved, count: t.length, total: r2(card.rest + cash.rest) };
}

// Saldo di chiusura del periodo precedente (per aprire un nuovo periodo)
export function restBefore(startIso) {
  const prev = [...state.periods].filter(p => p.start < startIso).pop();
  if (!prev) return { card: 0, cash: 0 };
  const s = stats(prev);
  return { card: s.card.rest, cash: s.cash.rest };
}

export function ensurePeriodFor(dateIso) {
  const cand = state.periods.filter(p => p.start <= dateIso && dateIso <= p.end).pop();
  if (cand) return cand;
  const d = parse(dateIso);
  const start = isoDate(new Date(d.getFullYear(), d.getMonth(), 1));
  const end = isoDate(new Date(d.getFullYear(), d.getMonth() + 1, 0));
  const r = restBefore(start);
  const p = { id: start, start, end, startCard: r.card, startCash: r.cash, salary: null, adjust: 0 };
  if (state.periods.some(x => x.id === p.id)) p.id = start + '-b' + uid().slice(0, 4);
  save('periods', p);
  return p;
}

export function currentPeriod() {
  const t = today();
  return state.periods.filter(p => p.start <= t && t <= p.end).pop() || state.periods[state.periods.length - 1];
}

export const display = t => (t.category ? t.category + ' - ' : '') + t.desc;

// ---- debiti ----
export const DEBT_TYPES = {
  lent: { label: 'Ho prestato', sign: 1, kind: 'out' },
  repaidToMe: { label: 'Mi ha restituito', sign: -1, kind: 'in' },
  borrowed: { label: 'Mi ha prestato', sign: -1, kind: 'in' },
  iRepaid: { label: 'Ho restituito', sign: 1, kind: 'out' },
};
export function people() {
  const m = new Map();
  for (const d of state.debts) m.set(d.person, r2((m.get(d.person) || 0) + d.amount));
  for (const n of state.meta.people || []) if (!m.has(n)) m.set(n, 0);
  return [...m.entries()].map(([name, bal]) => ({ name, bal })).sort((a, b) => Math.abs(b.bal) - Math.abs(a.bal) || a.name.localeCompare(b.name));
}

// ---- categorie ----
export const DEFAULT_CATS = [
  ['Cibo e uscite', '🍕', '#FF9F0A'], ['Shopping online', '📦', '#BF5AF2'], ['Viaggi', '✈️', '#0A84FF'], ['Mare', '🏖️', '#32D2E6'],
  ['Motorino e auto', '🛵', '#FF6B3D'], ['Salute', '🩺', '#2DD4A7'], ['Cura persona', '💈', '#FF6FA5'], ['Casa', '🏠', '#C08A5A'],
  ['Tasse e bollette', '🧾', '#7C8AA5'], ['Abbonamenti', '🔁', '#6E6BF0'], ['Svago', '🎮', '#FFD60A'], ['Regali', '🎁', '#FF375F'],
  ['Vestiti', '👕', '#E879F9'], ['Prestiti e debiti', '🤝', '#D4A017'], ['Rimborsi e rientri', '↩️', '#8FE04A'],
  ['Guadagni', '💼', '#34D399'], ['Riconversione', '🔄', '#94A3B8'], ['Altro', '🏷️', '#9CA3AF'],
];
export const PALETTE = ['#FF9F0A', '#BF5AF2', '#0A84FF', '#32D2E6', '#FF6B3D', '#2DD4A7', '#FF6FA5', '#C08A5A', '#6E6BF0', '#FFD60A', '#FF375F', '#E879F9'];
const defColor = name => DEFAULT_CATS.find(c => c[0] === name)?.[2];
export const categories = () => (state.meta.categories || DEFAULT_CATS.map(([name, icon, color]) => ({ name, icon, color })))
  .map(c => ({ ...c, color: c.color || defColor(c.name) || '#9CA3AF' }));
export const catIcon = name => categories().find(c => c.name === name)?.icon || '🏷️';
export const catColor = name => categories().find(c => c.name === name)?.color || '#8E8E93';

// Sottocategorie di "Shopping online": i siti
export const SUBS = ['Amazon', 'PayPal', 'AliExpress', 'Temu', 'eBay', 'Shein', 'TikTok Shop', 'Altri siti'];
const SITES = [['Amazon', /amazon/], ['AliExpress', /aliexpress/], ['Temu', /temu/], ['eBay', /ebay/], ['Shein', /shein/],
  ['TikTok Shop', /tik ?tok/], ['PayPal', /pay ?pal/]];
export const subs = () => state.meta.subs || SUBS;
export function guessSub(text) {
  const t = plain(text);
  for (const n of subs()) { const k = plain(n); if (n !== 'Altri siti' && k.length >= 3 && t.includes(k)) return n; }
  for (const [name, re] of SITES) if (re.test(t)) return name;
  return 'Altri siti';
}

// Parole chiave, in ordine di priorita' (la prima regola che combacia vince)
const RULES = [
  ['Riconversione', /^(versamento|prelievo)\b|\bversamento\b|\bprelievo|bancomat|conversione|\bhype\b|postepay|ricarica (mamma|papa|alessandro|antima)/],
  ['Prestiti e debiti', /prestit|presit|cambiale|debito/],
  ['Guadagni', /\blavoro\b|riprese|guadagno|stipendio|ebitemp/],
  ['Abbonamenti', /spotify|iliad|icloud|now ?tv|\bhbo\b|netflix|prime\b|abbonament|claude|software|sofware|witcher|palestra|aruba|epic games|apple|dazn|disney|\bchat/],
  ['Shopping online', /amazon|aliexpress|temu|ebay|shein|vinted|zalando|tik ?tok|shoppy|\bpsk\b|istant gaming|\bhrk\b|decathlon|idealo/],
  ['Motorino e auto', /motorino|mototino|benzina|\bauto\b|casello|finanziamento|assicurazione|tagliando/],
  ['Tasse e bollette', /\btasse|bolletta|bollett|fastweb|imposta|\bluce\b|\btim\b|pagopa|\bgas\b|elettricita|spid|\bposte\b/],
  ['Salute', /psicolog|\bvisit[ae]\b|medicin|fisioter|dentist|tamponi|farmac|oculist/],
  ['Cura persona', /barbiere|capelli|\bbarba\b|parrucch/],
  ['Svago', /cinema|concerto|comicon|stadio|teatro|steam|gioco|giochi|playstation|\bpartita\b|calcetto|serata|discoteca|peaky|museo/],
  ['Mare', /\bmare\b|\blido\b|spiagg/],
  ['Vestiti', /new balance|maxisport|mutande|vestit|\bovs\b|scarp|felpa|pull ?& ?bear|zara|maglia|jeans|giacca|tshirt/],
  ['Regali', /regal[oi]|compleanno|gioielli/],
  ['Viaggi', /viaggio|treno|aereo|easyjet|italo|trenitalia|\bmetro\b|\buber\b|flixbus|hotel|\bvolo\b|biglietto|biglietti|parcheggio|autostrada|pedaggio/],
  ['Casa', /\bcasa\b|ikea|elettricista|tavol|divano|mobil|ferro da stiro|\bletto\b|cucina/],
  ['Cibo e uscite', /pizz|sushi|pranzo|\bcena\b|panin|kebab|drink|spritz|birr|aperitiv|gelat|cornett|caff|colazion|donald|poke|just eat|glovo|deliveroo|uber eats|cinese|sfizi|\bspesa\b|\bbar\b|\bpub\b|peroni|cappuccino|patatine|\bmenu\b|wok|bibite|succo|\bcoca\b|poppella|pasticc|\btaco|bellini|sagra|hamburger|mc ?do|sigarett|cicchett|chinott|ristorante|ramen|thai|cereali|salderiso|parigin|acqua|giallo tufo|bistrot|cookies|donut/],
  ['Shopping online', /pay ?pal|\bordine\b|\brata\b|acquisto/],
];
export const plain = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
export function guessCat(text, kind, descOnly) {
  const t = plain(text).replace(/\(prestito[^)]*\)/g, ''), names = new Set(categories().map(c => c.name));   // il totale tra parentesi non e' un prestito
  const learned = state.meta.learned || {}, k = plain(descOnly ?? text);
  if (learned[k] && names.has(learned[k])) return learned[k];
  for (const [name, re] of RULES) if (names.has(name) && re.test(t)) return name;
  if (kind === 'in' && names.has('Rimborsi e rientri')) return 'Rimborsi e rientri';
  return null;
}

export const inAmt = n => (Math.round(n * 100) / 100).toFixed(2).replace('.', ',');

// icona (chiave in icons.js) di ogni categoria
const GLYPHS = {
  'Cibo e uscite': 'silverware-fork-knife', 'Shopping online': 'shopping', 'Viaggi': 'airplane', 'Mare': 'umbrella-beach',
  'Motorino e auto': 'moped', 'Salute': 'medical-bag', 'Cura persona': 'content-cut', 'Casa': 'home', 'Tasse e bollette': 'receipt-text',
  'Abbonamenti': 'sync', 'Svago': 'gamepad-variant', 'Regali': 'gift', 'Vestiti': 'tshirt-crew', 'Prestiti e debiti': 'handshake',
  'Rimborsi e rientri': 'cash-refund', 'Guadagni': 'briefcase', 'Riconversione': 'swap-horizontal', 'Altro': 'tag',
};
export const glyphKey = name => (name ? GLYPHS[name] || 'tag' : 'help');
