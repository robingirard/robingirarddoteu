// anim.js — symboles de liaison animés (SVG portant data-anim="rot|rock|tx|ty", solide 1 en classe .s1)
// et schémas cinématiques animés (SVG portant data-mech, pilotés par mech-anim.js).
// Symboles : l'animation est en CSS (app.css) : survol de la souris, classe .playing (toucher), ou
// classe .playing-all sur le corps d'une leçon (bouton « Voir les liaisons bouger »).
// Schémas : mêmes déclencheurs, mais le mouvement est calculé en JavaScript (mech-anim.js).
import * as mech from './mech-anim.js';

/** Vrai sur les appareils sans survol (tactiles) : un toucher sur la figure bascule l'animation. */
export function touchOnly() {
  return typeof matchMedia === 'function' && matchMedia('(hover: none)').matches;
}

/** Bascule l'animation d'un symbole (appelé au toucher). Retourne le nouvel état. */
export function togglePlaying(svg) {
  if (!svg) return false;
  const on = svg.classList.toggle('playing');
  if (svg.dataset && svg.dataset.mech) mech.setPlaying(svg, on);
  return on;
}

/** Libellé du bouton de leçon selon l'état. */
export function lessonButtonLabel(playing) {
  return playing ? '⏸ Arrêter' : '▶ Voir les liaisons bouger';
}

/** Bascule l'animation de toutes les figures d'un corps de leçon ; met à jour le bouton. */
export function toggleLesson(body, btn) {
  const on = body.classList.toggle('playing-all');
  if (btn) { btn.textContent = lessonButtonLabel(on); btn.setAttribute('aria-pressed', on ? 'true' : 'false'); }
  mech.syncLesson(body, on);
  return on;
}

/** Affiche le bouton d'une leçon seulement si elle contient au moins un symbole animable. */
export function refreshLessonButtons(root) {
  if (!root || typeof root.querySelectorAll !== 'function') return;
  for (const btn of root.querySelectorAll('.lesson-anim-btn')) {
    const details = btn.closest('details.lesson');
    const body = details && details.querySelector('.lesson-body');
    btn.hidden = !(body && (body.querySelector('svg[data-anim]') || body.querySelector('svg[data-mech]')));
  }
}

let installed = false;
/** Écouteurs délégués : toucher sur un symbole (tactile), bouton des leçons ; observation des injections. */
export function install(root) {
  if (installed || !root) return;
  installed = true;
  root.addEventListener('click', (e) => {
    const target = e.target;
    if (!target || typeof target.closest !== 'function') return;
    const btn = target.closest('.lesson-anim-btn');
    if (btn) {
      const details = btn.closest('details.lesson');
      const body = details && details.querySelector('.lesson-body');
      if (body) toggleLesson(body, btn);
      return;
    }
    if (!touchOnly()) return;
    const svg = target.closest('svg[data-anim], svg[data-mech]');
    if (svg) togglePlaying(svg);
  });
  // Survol à la souris d'un schéma cinématique : lecture pendant le survol (les symboles, eux, sont en CSS)
  root.addEventListener('pointerover', (e) => {
    if (touchOnly() || (e.pointerType && e.pointerType !== 'mouse')) return;
    const svg = e.target && typeof e.target.closest === 'function' ? e.target.closest('svg[data-mech]') : null;
    if (svg && !mech.isPlaying(svg)) { svg.dataset.hoverPlay = '1'; mech.play(svg); }
  });
  root.addEventListener('pointerout', (e) => {
    const svg = e.target && typeof e.target.closest === 'function' ? e.target.closest('svg[data-mech]') : null;
    if (!svg || !svg.dataset.hoverPlay) return;
    if (e.relatedTarget && svg.contains(e.relatedTarget)) return;
    delete svg.dataset.hoverPlay;
    if (!svg.classList.contains('playing') && !svg.closest('.playing-all')) mech.stop(svg);
  });
  if (typeof MutationObserver !== 'undefined') {
    let scheduled = false;
    const obs = new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      setTimeout(() => { scheduled = false; refreshLessonButtons(root); }, 0);
    });
    obs.observe(root, { childList: true, subtree: true });
  }
  refreshLessonButtons(root);
}
