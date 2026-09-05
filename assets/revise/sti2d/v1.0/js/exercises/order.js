// order.js — remettre des étapes dans l'ordre en les touchant successivement
import { h, clear } from '../dom.js';
import { renderRich } from '../render.js';
import { shuffle } from '../session.js';
import { promptEl, verifyButton } from './common.js';
import { orderDetail } from '../answers.js';

export function mount(container, item, ctx) {
  const { onAnswer, figures = {}, rng = Math.random } = ctx;
  const steps = item.payload.steps || [];
  const n = steps.length;
  let order = shuffle(steps.map((_, i) => i), rng);
  for (let guard = 0; n > 1 && order.every((v, i) => v === i) && guard < 10; guard++) order = shuffle(order, rng);
  const chosen = [];

  const chosenList = h('ol', { class: 'order-chosen' });
  const pool = h('div', { class: 'order-pool' });
  const undo = h('button', { class: 'btn btn-small', type: 'button', disabled: true, onClick: () => { chosen.pop(); render(); } }, '↩ Annuler');
  const verify = verifyButton(() => {
    const ok = chosen.every((v, i) => v === i);
    verify.hidden = true; undo.hidden = true; pool.hidden = true;
    [...chosenList.children].forEach((li, i) => li.classList.add(chosen[i] === i ? 'correct' : 'wrong'));
    if (!ok) {
      container.append(h('div', { class: 'order-solution' },
        h('p', { class: 'hint' }, 'Le bon ordre était :'),
        h('ol', {}, ...steps.map((s) => h('li', { html: renderRich(s, figures) })))));
    }
    onAnswer({ correct: ok, grade: ok ? 'good' : 'again', detail: ok ? null : orderDetail(chosen, steps) });
  });

  function render() {
    clear(chosenList); clear(pool);
    for (const i of chosen) chosenList.append(h('li', { html: renderRich(steps[i], figures) }));
    for (const i of order) {
      if (chosen.includes(i)) continue;
      pool.append(h('button', { class: 'choice order-step', type: 'button', html: renderRich(steps[i], figures), onClick: () => { chosen.push(i); render(); } }));
    }
    undo.disabled = chosen.length === 0;
    verify.disabled = chosen.length !== n;
  }
  render();
  container.append(
    promptEl(item, figures),
    h('p', { class: 'hint' }, 'Touche les étapes dans le bon ordre (la première d\'abord).'),
    chosenList,
    pool,
    h('div', { class: 'row-right' }, undo),
    verify,
  );
}
