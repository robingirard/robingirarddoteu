// scheduler.js — répétition espacée : variante simplifiée de SM-2 (voir docs/SPEC.md §6)
// Fonctions pures : aucun accès au DOM ni au stockage.
import { addDays } from './dates.js';

export const GRADES = ['again', 'hard', 'good', 'easy'];
export const MASTERED_INTERVAL = 21; // jours
const MIN_EASE = 1.3;

/** État initial d'un item jamais vu. */
export function newState() {
  return { reps: 0, ease: 2.5, interval: 0, due: null, lapses: 0, last: null };
}

const round2 = (x) => Math.round(x * 100) / 100;

/**
 * Applique une note à l'état d'un item et renvoie le nouvel état (l'ancien n'est pas modifié).
 * @param {object|undefined} state  état courant (undefined = item nouveau)
 * @param {'again'|'hard'|'good'|'easy'} quality
 * @param {string} today  'YYYY-MM-DD'
 */
export function grade(state, quality, today) {
  if (!GRADES.includes(quality)) throw new Error(`Note inconnue : ${quality}`);
  const s = { ...newState(), ...(state || {}) };
  switch (quality) {
    case 'again':
      s.reps = 0;
      s.interval = 0;
      s.ease = Math.max(MIN_EASE, s.ease - 0.2);
      s.lapses += 1;
      break;
    case 'hard':
      s.interval = Math.max(1, Math.round(s.interval * 1.2));
      s.ease = Math.max(MIN_EASE, s.ease - 0.15);
      s.reps += 1;
      break;
    case 'good':
      s.interval = s.reps === 0 ? 1 : s.reps === 1 ? 3 : Math.round(s.interval * s.ease);
      s.reps += 1;
      break;
    case 'easy':
      s.interval = s.reps === 0 ? 3 : Math.round(s.interval * s.ease * 1.3);
      s.ease += 0.15;
      s.reps += 1;
      break;
  }
  s.ease = round2(s.ease);
  s.last = today;
  s.due = addDays(today, s.interval);
  return s;
}

/** Item jamais travaillé. */
export function isNew(state) {
  return !state || !state.last;
}

/** Item à revoir aujourd'hui (ou en retard). */
export function isDue(state, today) {
  return !!state && !!state.due && state.due <= today;
}

/** Item considéré comme maîtrisé (intervalle ≥ 21 jours). */
export function isMastered(state) {
  return !!state && !!state.last && state.interval >= MASTERED_INTERVAL;
}
