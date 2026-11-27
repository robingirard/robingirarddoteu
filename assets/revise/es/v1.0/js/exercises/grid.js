// grid.js — grille de cases à cocher (ex. degrés de liberté : lignes x,y,z × colonnes T,R)
import { h } from '../dom.js';
import { renderRich } from '../render.js';
import { setEquals, gridDetail } from '../answers.js';
import { promptEl, verifyButton } from './common.js';

export function mount(container, item, ctx) {
  const { onAnswer, figures = {} } = ctx;
  const p = item.payload;
  const answer = new Set(p.answer || []);
  const cells = new Map(); // id de case → { input, td }

  // Deux étiquettes par case. Celle du tableau n'est écrite que si c'est un code de deux lettres
  // (mobilités « Tx », efforts « X ») : les libellés longs (« α → noyau d'hélium 4 ») redisent les
  // deux en-têtes et poussaient la dernière colonne hors de l'écran. Celle du commentaire, elle,
  // doit se lire en phrase — d'où le repli sur « ligne → colonne » quand la case n'a qu'un code.
  const codesLisibles = p.cols.every((c) => c.id.length === 1) && p.rows.every((r) => r.id.length === 1);
  const cellLabel = (id) => (codesLisibles ? (p.labels && p.labels[id]) || id : '');
  const nomCases = {};
  for (const c of p.cols) {
    for (const r of p.rows) {
      const id = c.id + r.id;
      nomCases[id] = (p.labels && p.labels[id]) || cellLabel(id) || `${r.label} → ${c.label}`;
    }
  }

  const verify = verifyButton(() => {
    const checked = [...cells].filter(([, c]) => c.input.checked).map(([id]) => id);
    const ok = setEquals(checked, answer);
    for (const [id, c] of cells) {
      c.input.disabled = true;
      if (answer.has(id)) c.td.classList.add(c.input.checked ? 'correct' : 'missed');
      else if (c.input.checked) c.td.classList.add('wrong');
    }
    verify.hidden = true;
    let detail = null;
    if (!ok) {
      const order = [...cells.keys()];
      detail = gridDetail(checked, [...answer], nomCases, order);
      const notes = order.filter((id) => (answer.has(id) !== checked.includes(id)) && p.cellFeedback && p.cellFeedback[id])
        .map((id) => `${nomCases[id] || id} : ${p.cellFeedback[id]}`);
      if (notes.length) detail = [detail, ...notes].filter(Boolean).join('\n');
    }
    onAnswer({ correct: ok, grade: ok ? 'good' : 'again', detail });
  });
  verify.disabled = false; // une grille vide est une réponse possible (ex. encastrement : 0 ddl)

  // Les en-têtes sont du texte riche : en maths, une ligne de grille est une formule ($x\mapsto\dfrac{1}{x}$).
  const head = (label, scope) => h('th', { scope, html: renderRich(label, figures) });
  const thead = h('thead', {}, h('tr', {}, h('th', {}), ...p.cols.map((c) => head(c.label, 'col'))));
  const tbody = h('tbody', {}, ...p.rows.map((r) =>
    h('tr', {}, head(r.label, 'row'), ...p.cols.map((c) => {
      const id = c.id + r.id;
      const label = cellLabel(id); // vide = les en-têtes suffisent (sinon la grille sort de l'écran)
      const input = h('input', { type: 'checkbox', 'data-cell': id, 'aria-label': nomCases[id] });
      const td = h('td', {}, h('label', { class: 'cell' }, input, label ? h('span', { class: 'cell-label' }, label) : null));
      cells.set(id, { input, td });
      return td;
    }))));
  container.append(
    promptEl(item, figures),
    h('p', { class: 'hint', html: renderRich(p.hint || 'Coche les cases qui conviennent (aucune est possible), puis vérifie.', figures) }),
    h('div', { class: 'table-wrap' }, h('table', { class: 'grid-table' }, thead, tbody)),
    verify,
  );
}
