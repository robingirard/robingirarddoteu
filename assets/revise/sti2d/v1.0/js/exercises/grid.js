// grid.js — grille de cases à cocher (ex. degrés de liberté : lignes x,y,z × colonnes T,R)
import { h } from '../dom.js';
import { setEquals, gridDetail } from '../answers.js';
import { promptEl, verifyButton } from './common.js';

export function mount(container, item, ctx) {
  const { onAnswer, figures = {} } = ctx;
  const p = item.payload;
  const answer = new Set(p.answer || []);
  const cells = new Map(); // id de case → { input, td }

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
      detail = gridDetail(checked, [...answer], p.labels, order);
      const notes = order.filter((id) => (answer.has(id) !== checked.includes(id)) && p.cellFeedback && p.cellFeedback[id])
        .map((id) => `${(p.labels && p.labels[id]) || id} : ${p.cellFeedback[id]}`);
      if (notes.length) detail = [detail, ...notes].filter(Boolean).join('\n');
    }
    onAnswer({ correct: ok, grade: ok ? 'good' : 'again', detail });
  });
  verify.disabled = false; // une grille vide est une réponse possible (ex. encastrement : 0 ddl)

  const thead = h('thead', {}, h('tr', {}, h('th', {}), ...p.cols.map((c) => h('th', { scope: 'col' }, c.label))));
  const tbody = h('tbody', {}, ...p.rows.map((r) =>
    h('tr', {}, h('th', { scope: 'row' }, r.label), ...p.cols.map((c) => {
      const id = c.id + r.id;
      const input = h('input', { type: 'checkbox', 'data-cell': id, 'aria-label': id });
      const label = (p.labels && p.labels[id]) || id; // ex. efforts : Fx → X, Mx → L
      input.setAttribute('aria-label', label);
      const td = h('td', {}, h('label', { class: 'cell' }, input, h('span', { class: 'cell-label' }, label)));
      cells.set(id, { input, td });
      return td;
    }))));
  container.append(
    promptEl(item, figures),
    h('p', { class: 'hint' }, p.hint || 'Coche les cases qui conviennent (aucune est possible), puis vérifie.'),
    h('div', { class: 'table-wrap' }, h('table', { class: 'grid-table' }, thead, tbody)),
    verify,
  );
}
