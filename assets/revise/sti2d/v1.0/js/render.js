// render.js — texte riche et Markdown restreint → HTML (voir docs/SPEC.md §4-§5)
// Tout le texte est échappé ; seules les figures SVG (de confiance, générées par le build) et le HTML produit par KaTeX
// (qui échappe lui-même la source) sont insérés tels quels.

import { placeholderHtml } from './figures.js';

const FIG_RE = /\{\{fig:([\w.-]+)\}\}/g;
const FIG_ONLY_RE = /^\s*\{\{fig:([\w.-]+)\}\}\s*$/;
// Jetons traités avant l'échappement : figure, maths affichées ($$…$$ ou \[…\]), maths en ligne ($…$ ou \(…\)).
// Un « $ » isolé (sans fermeture sur la même ligne) reste un simple caractère.
// Le code en ligne `…` est reconnu en premier : ni maths, ni figure, ni gras à l'intérieur.
const TOKEN_RE = /(`[^`\n]+?`)|(\{\{fig:[\w.-]+\}\})|(\$\$[\s\S]+?\$\$)|(\\\[[\s\S]+?\\\])|(\$[^$\n]+?\$)|(\\\([^\n]+?\\\))/g;
const MATH_ONLY_RE = /^\s*(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\])\s*$/;
const EMOJI_RE = /\{\{emoji:([^{}<>&]{1,16})\}\}/g;          // appliqué sur le texte déjà échappé
const EMOJI_ONLY_RE = /^\s*\{\{emoji:[^{}<>&]{1,16}\}\}\s*$/;

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function figureHtml(id, figures = {}, { block = false } = {}) {
  const svg = figures && figures[id];
  if (!svg) {
    // Figure absente du contenu en ligne : gabarit chargé à la demande si elle est connue de l'index
    const lazy = placeholderHtml(id, { block });
    if (lazy) return lazy;
    return `<span class="fig-missing">[figure manquante : ${escapeHtml(id)}]</span>`;
  }
  const attr = `data-fig="${escapeHtml(id)}"`;
  const anim = /\sdata-(anim|mech)=/.test(svg) ? ' fig-anim' : ''; // symbole ou schéma animable (voir anim.js)
  return block ? `<figure class="fig fig-block${anim}" ${attr}>${svg}</figure>` : `<span class="fig fig-inline${anim}" ${attr}>${svg}</span>`;
}

/** Mise en forme en ligne d'un texte déjà échappé. */
function inline(escaped, { emojiBlock = false } = {}) {
  const emojiClass = emojiBlock ? 'emoji-big emoji-block' : 'emoji-big';
  return escaped
    .replace(EMOJI_RE, `<span class="${emojiClass}">$1</span>`)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*\w])\*(\S(?:[^*\n]*?\S)?)\*(?!\w)/g, '$1<em>$2</em>')
    .replace(/\n/g, '<br>');
}

/** Formule LaTeX → HTML KaTeX (si la bibliothèque est chargée), sinon texte en italique. Jamais d'HTML brut. */
export function mathHtml(src, { display = false } = {}) {
  const katex = globalThis.katex;
  let html;
  if (katex && typeof katex.renderToString === 'function') {
    try {
      html = katex.renderToString(src, { throwOnError: false, displayMode: display, output: 'html', strict: 'ignore' });
    } catch (err) {
      html = `<span class="math">${escapeHtml(src)}</span>`;
    }
  } else {
    html = `<span class="math">${escapeHtml(src)}</span>`;
  }
  return display ? `<div class="math-display">${html}</div>` : html;
}

/** Texte riche : **gras**, *italique*, \n, `code`, {{fig:ID}}, {{emoji:🚪}}, $math$, $$maths affichées$$. */
export function renderRich(text, figures = {}) {
  if (text == null) return '';
  const str = String(text);
  const block = FIG_ONLY_RE.test(str);
  const emojiBlock = EMOJI_ONLY_RE.test(str); // un pictogramme seul : affiché en grand, centré
  let out = '';
  let last = 0;
  TOKEN_RE.lastIndex = 0;
  for (let m; (m = TOKEN_RE.exec(str));) {
    out += inline(escapeHtml(str.slice(last, m.index)), { emojiBlock });
    const [tok, code, fig, dd, bracket, d, paren] = m;
    if (code) out += `<code>${escapeHtml(tok.slice(1, -1))}</code>`;
    else if (fig) out += figureHtml(tok.slice(6, -2), figures, { block });
    else if (dd) out += mathHtml(dd.slice(2, -2), { display: true });
    else if (bracket) out += mathHtml(bracket.slice(2, -2), { display: true });
    else if (d) out += mathHtml(d.slice(1, -1));
    else if (paren) out += mathHtml(paren.slice(2, -2));
    last = m.index + tok.length;
  }
  out += inline(escapeHtml(str.slice(last)), { emojiBlock });
  return out;
}

const isSeparatorRow = (cells) => cells.every((c) => /^:?-{2,}:?$/.test(c));

const codeBlockHtml = (lines) => `<pre class="code"><code>${escapeHtml(lines.join('\n'))}</code></pre>`;

/** Markdown restreint : titres, paragraphes, listes, tableaux, figures, blocs de code ```, texte riche. */
export function renderLesson(md, figures = {}) {
  const lines = String(md || '').replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  let para = [], list = null, olist = null, table = null, code = null;
  const flushPara = () => {
    if (para.length) out.push(`<p>${renderRich(para.join(' '), figures)}</p>`);
    para = [];
  };
  const flushList = () => {
    if (list) out.push(`<ul>${list.map((li) => `<li>${renderRich(li, figures)}</li>`).join('')}</ul>`);
    if (olist) out.push(`<ol>${olist.map((li) => `<li>${renderRich(li, figures)}</li>`).join('')}</ol>`);
    list = null; olist = null;
  };
  const flushTable = () => {
    if (table && table.length) {
      const [head, ...rows] = table;
      const th = head.map((c) => `<th>${renderRich(c, figures)}</th>`).join('');
      const tr = rows.map((r) => `<tr>${r.map((c) => `<td>${renderRich(c, figures)}</td>`).join('')}</tr>`).join('');
      out.push(`<div class="table-wrap"><table><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table></div>`);
    }
    table = null;
  };
  const flushAll = () => { flushPara(); flushList(); flushTable(); };

  for (const raw of lines) {
    const t = raw.trim();
    if (code) { // bloc de code ouvert : lignes conservées telles quelles jusqu'à la clôture
      if (t.startsWith('```')) { out.push(codeBlockHtml(code)); code = null; } else code.push(raw.replace(/\s+$/, ''));
      continue;
    }
    if (t === '') { flushAll(); continue; }
    if (t.startsWith('```')) { flushAll(); code = []; continue; }
    const heading = /^(#{1,3})\s+(.+)$/.exec(t);
    if (heading) {
      flushAll();
      const level = heading[1].length + 1; // '#' → h2 : le h1 est le titre de l'écran
      out.push(`<h${level}>${renderRich(heading[2], figures)}</h${level}>`);
      continue;
    }
    const fig = FIG_ONLY_RE.exec(t);
    if (fig) { flushAll(); out.push(figureHtml(fig[1], figures, { block: true })); continue; }
    if (MATH_ONLY_RE.test(t)) { flushAll(); out.push(renderRich(t, figures)); continue; }
    if (/^[-*]\s+/.test(t)) {
      flushPara(); flushTable();
      if (olist) flushList();
      (list ||= []).push(t.replace(/^[-*]\s+/, ''));
      continue;
    }
    if (/^\d+[.)]\s+/.test(t)) {
      flushPara(); flushTable();
      if (list) flushList();
      (olist ||= []).push(t.replace(/^\d+[.)]\s+/, ''));
      continue;
    }
    if (t.startsWith('|')) {
      flushPara(); flushList();
      const cells = t.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
      if (!isSeparatorRow(cells)) (table ||= []).push(cells);
      continue;
    }
    flushList(); flushTable();
    para.push(t);
  }
  flushAll();
  if (code) out.push(codeBlockHtml(code)); // bloc non refermé : affiché quand même
  return out.join('\n');
}
