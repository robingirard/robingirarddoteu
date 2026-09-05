// mcq.js — question à choix multiples (liste ou grille 2×2, réponse unique ou multiple)
import { h } from '../dom.js';
import { renderRich } from '../render.js';
import { shuffle } from '../session.js';
import { setEquals, mcqDetail } from '../answers.js';
import { promptEl, verifyButton, appendAll } from './common.js';

export function mount(container, item, ctx) {
  const { onAnswer, figures = {}, rng = Math.random } = ctx;
  const p = item.payload;
  const multiple = !!p.multiple;
  const answer = new Set(p.answer || []);
  const selected = new Set();
  const buttons = new Map();
  const order = shuffle(p.choices.map((_, i) => i), rng); // l'ordre d'affichage change à chaque fois

  const verify = verifyButton(() => {
    const ok = setEquals(selected, answer);
    for (const [idx, btn] of buttons) {
      btn.disabled = true;
      if (answer.has(idx)) btn.classList.add('correct');
      else if (selected.has(idx)) btn.classList.add('wrong');
    }
    verify.hidden = true;
    onAnswer({ correct: ok, grade: ok ? 'good' : 'again', detail: ok ? null : mcqDetail(selected, answer, p.feedback) });
  });

  const list = h('div', { class: `choices ${p.layout === 'grid' ? 'choices-grid' : 'choices-list'}`, role: 'group' });
  for (const idx of order) {
    const btn = h('button', { class: 'choice', type: 'button', 'aria-pressed': 'false', html: renderRich(p.choices[idx], figures) });
    btn.addEventListener('click', () => {
      if (!multiple) {
        for (const [i, b] of buttons) {
          if (i !== idx) { selected.delete(i); b.classList.remove('selected'); b.setAttribute('aria-pressed', 'false'); }
        }
      }
      const on = !selected.has(idx);
      if (on) selected.add(idx); else selected.delete(idx);
      btn.classList.toggle('selected', on);
      btn.setAttribute('aria-pressed', String(on));
      verify.disabled = selected.size === 0;
    });
    buttons.set(idx, btn);
    list.append(btn);
  }
  appendAll(container,
    promptEl(item, figures),
    multiple ? h('p', { class: 'hint' }, 'Plusieurs réponses sont possibles.') : null,
    list,
    verify,
  );
}
