// match.js — association : toucher un élément de gauche puis son correspondant à droite
import { h } from '../dom.js';
import { renderRich } from '../render.js';
import { shuffle } from '../session.js';
import { promptEl } from './common.js';

export function mount(container, item, ctx) {
  const { onAnswer, figures = {}, rng = Math.random } = ctx;
  const pairs = item.payload.pairs || [];
  const n = pairs.length;
  const leftOrder = shuffle(pairs.map((_, i) => i), rng);
  const rightOrder = shuffle(pairs.map((_, i) => i), rng);
  const leftBtns = new Map(), rightBtns = new Map();
  let selectedLeft = null, failed = false, matched = 0, done = false, firstError = null;

  const hint = h('p', { class: 'hint' }, 'Touche un élément de gauche, puis celui qui lui correspond à droite.');
  const it = (s) => (/\{\{fig:/.test(s) ? s : `*${s}*`); // pas d'italique autour d'une figure
  const finish = () => {
    if (done) return;
    done = true;
    const detail = firstError ? `Erreur : ${it(firstError.left)} ↔ ${it(firstError.right)}` : null;
    onAnswer({ correct: !failed, grade: failed ? 'again' : 'good', detail });
  };
  const flashWrong = (a, b) => {
    a.classList.add('wrong'); b.classList.add('wrong');
    setTimeout(() => { a.classList.remove('wrong'); b.classList.remove('wrong'); }, 600);
  };

  for (const i of leftOrder) {
    const btn = h('button', { class: 'match-btn', type: 'button', html: renderRich(pairs[i].left, figures) });
    btn.addEventListener('click', () => {
      if (btn.classList.contains('matched')) return;
      for (const b of leftBtns.values()) b.classList.remove('selected');
      selectedLeft = i;
      btn.classList.add('selected');
    });
    leftBtns.set(i, btn);
  }
  for (const j of rightOrder) {
    const btn = h('button', { class: 'match-btn', type: 'button', html: renderRich(pairs[j].right, figures) });
    btn.addEventListener('click', () => {
      if (btn.classList.contains('matched')) return;
      if (selectedLeft == null) {
        hint.classList.add('hint-attn');
        setTimeout(() => hint.classList.remove('hint-attn'), 600);
        return;
      }
      const left = leftBtns.get(selectedLeft);
      if (selectedLeft === j) {
        left.classList.remove('selected');
        left.classList.add('matched'); btn.classList.add('matched');
        left.disabled = true; btn.disabled = true;
        selectedLeft = null;
        matched += 1;
        if (matched === n) finish();
      } else {
        if (!failed) firstError = { left: pairs[selectedLeft].left, right: pairs[j].right };
        failed = true; // une erreur = item raté, mais on continue jusqu'au bout
        left.classList.remove('selected');
        selectedLeft = null;
        flashWrong(left, btn);
      }
    });
    rightBtns.set(j, btn);
  }
  container.append(
    promptEl(item, figures),
    hint,
    h('div', { class: 'match' },
      h('div', { class: 'match-col' }, ...leftOrder.map((i) => leftBtns.get(i))),
      h('div', { class: 'match-col' }, ...rightOrder.map((j) => rightBtns.get(j)))),
  );
}
