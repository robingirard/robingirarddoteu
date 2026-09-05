// figures.js — chargement à la demande des figures SVG (fichiers dist/figures/<id>.svg).
// Le contenu ne contient plus les SVG en ligne : render.js pose un gabarit (`.fig-lazy`) dimensionné
// grâce à l'index des figures (largeur/hauteur en points), puis hydrate() télécharge chaque figure une
// seule fois et l'injecte dans tous les gabarits qui la réclament. Les fonctions de chargement sont
// indépendantes du DOM (testables) ; hydrate/observe touchent le document.

const cache = new Map();     // id → texte SVG
const inflight = new Map();  // id → Promise<string> (un seul téléchargement par figure)
const failed = new Map();    // id → message d'erreur (réessai au prochain hydrate)
let index = null;            // { id: { w, h, bytes } } — CONTENT.figureIndex ou figures/index.json
let base = './figures/';     // relatif à index.html : fonctionne sous un sous-chemin (GitHub Pages)
let fetchImpl = null;        // injectable pour les tests

export const PT_TO_PX = 96 / 72;

export function configure({ index: idx, base: b, fetch: f } = {}) {
  if (idx !== undefined) index = idx || null;
  if (b) base = b;
  if (f) fetchImpl = f;
}

export function getIndex() { return index; }
export function isLazy(id) { return !!(index && Object.prototype.hasOwnProperty.call(index, id)); }
export function isCached(id) { return cache.has(id); }
export function figureUrl(id) { return `${base}${encodeURIComponent(id)}.svg`; }

/** Gabarit HTML posé par render.js à la place de la figure (dimensions réservées pour éviter les sauts). */
export function placeholderHtml(id, { block = false } = {}) {
  if (!isLazy(id)) return null;
  const meta = index[id] || {};
  const w = Number(meta.w) || 0, hgt = Number(meta.h) || 0;
  const safe = String(id).replace(/[^\w.-]/g, '');
  const style = w > 0 && hgt > 0
    ? `width: min(100%, ${Math.round(w * PT_TO_PX)}px); aspect-ratio: ${w} / ${hgt};`
    : 'width: min(100%, 200px); aspect-ratio: 4 / 3;';
  const tag = block ? 'figure' : 'span';
  const cls = block ? 'fig fig-block fig-lazy' : 'fig fig-inline fig-lazy';
  return `<${tag} class="${cls}" data-fig="${safe}" style="${style}" aria-busy="true"></${tag}>`;
}

function doFetch(url) {
  const f = fetchImpl || globalThis.fetch;
  if (typeof f !== 'function') return Promise.reject(new Error('fetch indisponible'));
  return f(url, { credentials: 'same-origin' });
}

/** Télécharge (une seule fois) le SVG d'une figure ; rejette en cas d'échec (réessai possible). */
export function load(id) {
  if (cache.has(id)) return Promise.resolve(cache.get(id));
  if (inflight.has(id)) return inflight.get(id);
  const p = doFetch(figureUrl(id))
    .then((res) => {
      if (!res || !res.ok) throw new Error(`HTTP ${res ? res.status : '?'}`);
      return res.text();
    })
    .then((text) => {
      const svg = String(text || '').trim();
      if (!/^<svg[\s>]/i.test(svg)) throw new Error('réponse inattendue (pas un SVG)');
      cache.set(id, svg);
      failed.delete(id);
      return svg;
    })
    .catch((err) => {
      failed.set(id, err && err.message ? err.message : String(err));
      throw err;
    })
    .finally(() => inflight.delete(id));
  inflight.set(id, p);
  return p;
}

/** Précharge une liste d'identifiants (erreurs ignorées). */
export function prefetch(ids) {
  const wanted = [...new Set((ids || []).filter((id) => isLazy(id) && !cache.has(id)))];
  return Promise.all(wanted.map((id) => load(id).catch(() => null)));
}

/** Identifiants de figures cités dans un objet (payload d'exercice, leçon…). */
export function figureIdsOf(obj) {
  const ids = new Set();
  const re = /\{\{fig:([\w.-]+)\}\}/g;
  const walk = (v) => {
    if (typeof v === 'string') { for (let m; (m = re.exec(v));) ids.add(m[1]); re.lastIndex = 0; }
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk(obj);
  return [...ids];
}

/** Télécharge toutes les figures de l'index, `concurrency` à la fois ; onProgress(k, n). */
export async function prefetchAll({ concurrency = 4, onProgress = null, ids = null } = {}) {
  const all = ids || Object.keys(index || {});
  let done = 0, ok = 0;
  const queue = all.slice();
  const worker = async () => {
    while (queue.length) {
      const id = queue.shift();
      try { await load(id); ok += 1; } catch { /* figure manquante : on continue */ }
      done += 1;
      if (onProgress) onProgress(done, all.length, ok);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(concurrency, all.length)) }, worker));
  return { done, ok, total: all.length };
}

/** Taille totale des figures de l'index, en octets. */
export function totalBytes(idx = index) {
  return Object.values(idx || {}).reduce((s, m) => s + (Number(m && m.bytes) || 0), 0);
}

export function formatMo(bytes) {
  if (bytes < 1e6) return `${Math.max(1, Math.round(bytes / 1e3))} ko`;
  return `${(bytes / 1e6).toFixed(bytes >= 10e6 ? 0 : 1).replace('.', ',')} Mo`;
}

/** Charge l'index depuis figures/index.json si CONTENT ne le fournit pas. */
export async function ensureIndex() {
  if (index) return index;
  const res = await doFetch(`${base}index.json`);
  if (!res || !res.ok) throw new Error('index des figures introuvable');
  index = await res.json();
  return index;
}

// ------------------------------------------------------------------ DOM
function inject(el, svg) {
  el.innerHTML = svg;
  el.classList.remove('fig-lazy', 'fig-error');
  if (el.querySelector && el.querySelector('svg[data-anim], svg[data-mech]')) el.classList.add('fig-anim'); // symbole ou schéma animable
  el.removeAttribute('style');
  el.removeAttribute('aria-busy');
  el.dataset.loaded = '1';
}

function markError(el, msg) {
  el.classList.add('fig-error');
  el.removeAttribute('aria-busy');
  el.innerHTML = `<span class="fig-unavailable" title="${String(msg).replace(/"/g, '')}">figure indisponible</span>`;
}

/** Remplit les gabarits `.fig-lazy` présents sous `root` (par défaut tout le document). */
export function hydrate(root = globalThis.document) {
  if (!root || typeof root.querySelectorAll !== 'function') return Promise.resolve();
  const nodes = [...root.querySelectorAll('.fig-lazy[data-fig]')];
  const ids = [...new Set(nodes.map((el) => el.dataset.fig))];
  return Promise.all(ids.map((id) => {
    const targets = () => [...(globalThis.document || root).querySelectorAll(`.fig-lazy[data-fig="${id}"]`)];
    if (cache.has(id)) { targets().forEach((el) => inject(el, cache.get(id))); return Promise.resolve(); }
    return load(id)
      .then((svg) => targets().forEach((el) => inject(el, svg)))
      .catch((err) => targets().forEach((el) => markError(el, err && err.message ? err.message : err)));
  }));
}

let observer = null;
/** Hydrate automatiquement les gabarits ajoutés plus tard (choix, corrections, étapes guidées…). */
export function observe(root) {
  if (observer || !root || typeof MutationObserver === 'undefined') return;
  let scheduled = false;
  observer = new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    setTimeout(() => { scheduled = false; hydrate(root); }, 0);
  });
  observer.observe(root, { childList: true, subtree: true });
}

/** Remise à zéro (tests). */
export function resetForTests() {
  cache.clear(); inflight.clear(); failed.clear();
  index = null; base = './figures/'; fetchImpl = null;
  if (observer) { observer.disconnect(); observer = null; }
}
export function failureOf(id) { return failed.get(id) || null; }
