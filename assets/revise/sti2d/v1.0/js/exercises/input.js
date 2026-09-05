// input.js — réponse courte (texte ou nombre) avec normalisation
import { h } from '../dom.js';
import { checkInput } from '../answers.js';
import { promptEl, verifyButton } from './common.js';

export function mount(container, item, ctx) {
  const { onAnswer, figures = {} } = ctx;
  const p = item.payload;
  const input = h('input', {
    class: 'text-input', type: 'text', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false',
    inputmode: p.numeric ? 'decimal' : 'text', placeholder: p.numeric ? 'Nombre' : 'Ta réponse', 'aria-label': 'Réponse',
  });
  const verify = verifyButton(() => {
    const ok = checkInput(p, input.value);
    input.disabled = true;
    verify.hidden = true;
    input.classList.add(ok ? 'correct' : 'wrong');
    if (!ok) {
      container.append(h('p', { class: 'expected' }, 'Réponse attendue : ', h('strong', {}, `${p.answer}${p.unit ? ' ' + p.unit : ''}`)));
    }
    onAnswer({ correct: ok, grade: ok ? 'good' : 'again', detail: ok ? null : `Réponse attendue : **${p.answer}${p.unit ? ' ' + p.unit : ''}**` });
  });
  input.addEventListener('input', () => { verify.disabled = input.value.trim() === ''; });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !verify.disabled && !verify.hidden) verify.click(); });
  container.append(
    promptEl(item, figures),
    h('div', { class: 'input-row' }, input, p.unit ? h('span', { class: 'unit' }, p.unit) : null),
    verify,
  );
  setTimeout(() => input.focus(), 50);
}
