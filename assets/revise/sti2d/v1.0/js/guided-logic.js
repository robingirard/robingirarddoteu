// guided-logic.js — logique pure des exercices complets (« guided », SPEC §4) et des annales (SPEC §10)
export const GUIDED_MIN_LEVEL = 2; // niveau de compétence requis pour lancer un exercice complet
export const XP_PER_STEP = 2;      // XP par étape juste du premier coup

export function isGuided(item) {
  return !!item && item.type === 'guided';
}

/** Étapes d'un exercice complet, avec `kind` par défaut (mcq). */
export function guidedSteps(item) {
  const steps = (item && item.payload && Array.isArray(item.payload.steps)) ? item.payload.steps : [];
  return steps.map((s) => ({ ...s, kind: s.kind || 'mcq' }));
}

/** good si tout juste du premier coup, hard si au moins la moitié, again sinon. */
export function guidedGrade(firstTryCount, total) {
  if (total > 0 && firstTryCount >= total) return 'good';
  if (total > 0 && firstTryCount >= total / 2) return 'hard';
  return 'again';
}

/** Résultat transmis à la séance quand toutes les étapes sont jouées (compte pour un seul exercice). */
export function guidedResult(firstTryCount, total) {
  const grade = guidedGrade(firstTryCount, total);
  return {
    correct: total > 0 && firstTryCount >= total,
    grade,
    detail: `${firstTryCount} / ${total} étapes justes du premier coup.`,
    xpBonus: XP_PER_STEP * firstTryCount,
    requeue: false, // un exercice complet n'est jamais rejoué dans la même séance
  };
}

export function nextStepIndex(index, total) {
  return index + 1 < total ? index + 1 : null;
}

/** Un exercice complet se lance au niveau ≥ 2 de la compétence, ou en mode découverte. */
export function guidedUnlocked(skillState, settings) {
  if (settings && settings.unlockAll) return true;
  return (((skillState || {}).level) || 0) >= GUIDED_MIN_LEVEL;
}

/** État d'un sujet d'annales : verrouillé tant qu'un prérequis {skill, level} manque (sauf mode découverte). */
export function annaleStatus(annale, progress) {
  const skills = (progress && progress.skills) || {};
  const missing = (annale.prerequis || []).filter((p) => ((skills[p.skill] || {}).level || 0) < (p.level || 1));
  const unlockAll = !!(progress && progress.settings && progress.settings.unlockAll);
  return { locked: !unlockAll && missing.length > 0, missing };
}
