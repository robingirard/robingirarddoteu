// flashcard.js — carte recto/verso auto-évaluée (again / hard / good / easy)
import { h } from '../dom.js';
import { renderRich } from '../render.js';

export const GRADE_LABELS = { again: 'À revoir', hard: 'Difficile', good: 'Bien', easy: 'Facile' };

export function mount(container, item, ctx) {
  const { onAnswer, figures = {} } = ctx;
  const p = item.payload;
  const front = h('div', { class: 'card-face card-front' }, h('div', { class: 'card-content', html: renderRich(p.front, figures) }));
  const back = h('div', { class: 'card-face card-back', hidden: true }, h('div', { class: 'card-content', html: renderRich(p.back, figures) }));
  const grades = h('div', { class: 'grade-row', hidden: true },
    ...Object.entries(GRADE_LABELS).map(([g, label]) =>
      h('button', { class: `btn grade grade-${g}`, type: 'button', onClick: () => {
        grades.querySelectorAll('button').forEach((b) => { b.disabled = true; });
        onAnswer({ correct: g !== 'again', grade: g, detail: null });
      } }, label)));
  const flip = h('button', { class: 'btn btn-primary btn-block', type: 'button', onClick: () => {
    back.hidden = false;
    flip.hidden = true;
    grades.hidden = false;
  } }, 'Retourner la carte');
  container.append(
    h('div', { class: 'flashcard' }, front, back),
    h('p', { class: 'hint' }, 'Réponds dans ta tête, retourne la carte, puis note-toi honnêtement.'),
    flip,
    grades,
  );
}
