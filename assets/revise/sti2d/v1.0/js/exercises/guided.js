// guided.js — exercice complet : une suite d'étapes (mcq, input, grid, order, match) autour d'un même
// système, chacune corrigée immédiatement ; l'ensemble compte pour un seul exercice dans la séance.
import { h } from '../dom.js';
import { renderRich } from '../render.js';
import { guidedSteps, guidedResult, nextStepIndex } from '../guided-logic.js';
import { appendAll } from './common.js';

export function mount(container, item, ctx) {
  const { onAnswer, figures = {}, rng = Math.random, exercises = {} } = ctx;
  const p = item.payload || {};
  const steps = guidedSteps(item);
  const total = steps.length;
  let index = 0, firstTry = 0, done = false;

  container.dataset.item = item.id; // repère pour les outils de vérification
  const intro = p.intro
    ? h('details', { class: 'guided-intro', open: true }, h('summary', {}, 'Contexte'), h('div', { class: 'guided-intro-body', html: renderRich(p.intro, figures) }))
    : null;
  const counter = h('p', { class: 'guided-counter' });
  const stepBox = h('div', { class: 'guided-step' });
  const footer = h('div', { class: 'guided-footer' });
  appendAll(container, h('h3', { class: 'guided-title' }, p.title || 'Exercice complet'), intro, counter, stepBox, footer);

  const nextButton = (enabled) => h('button', {
    class: 'btn btn-primary btn-block btn-next-step', type: 'button', disabled: !enabled,
    onClick: () => {
      const n = nextStepIndex(index, total);
      if (n == null) finish();
      else { index = n; showStep(); window.scrollTo(0, 0); }
    },
  }, nextStepIndex(index, total) == null ? 'Terminer' : 'Étape suivante');

  function showStep() {
    const step = steps[index];
    counter.textContent = `Étape ${index + 1} / ${total}`;
    stepBox.replaceChildren();
    footer.replaceChildren();
    stepBox.className = `guided-step step-${step.kind}`;
    stepBox.dataset.step = String(index);
    if (intro) intro.open = index === 0; // contexte déplié à la première étape seulement
    const mod = step.kind !== 'guided' ? exercises[step.kind] : null;
    if (!mod) {
      stepBox.append(h('p', { class: 'error' }, `Type d'étape inconnu : ${step.kind}`));
      footer.append(nextButton(true));
      return;
    }
    let answered = false;
    mod.mount(stepBox, { id: `${item.id}#${index}`, type: step.kind, payload: step }, {
      figures, rng, exercises,
      onAnswer: (res) => {
        if (answered) return;
        answered = true;
        if (res.correct) firstTry += 1;
        const banner = h('div', { class: `guided-feedback ${res.correct ? 'ok' : 'ko'}`, role: 'status' },
          h('div', { class: 'feedback-title' }, res.correct ? 'Bravo, c\'est juste !' : 'Pas tout à fait…'),
          !res.correct && res.detail ? h('div', { class: 'feedback-detail', html: renderRich(res.detail, figures) }) : null,
          step.explanation ? h('div', { class: 'feedback-expl', html: renderRich(step.explanation, figures) }) : null);
        const btn = nextButton(true);
        footer.append(banner, btn);
        btn.focus();
      },
    });
  }

  function finish() {
    if (done) return;
    done = true;
    stepBox.replaceChildren();
    footer.replaceChildren();
    counter.textContent = `Terminé : ${firstTry} / ${total} étapes justes du premier coup.`;
    onAnswer(guidedResult(firstTry, total));
  }

  if (total === 0) { finish(); return; }
  showStep();
}
