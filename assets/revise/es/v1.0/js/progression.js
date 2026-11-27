// progression.js — arbre de compétences, niveaux, XP et série (voir docs/SPEC.md §7)
// Fonctions pures.
import { addDays } from './dates.js';

export const PASS_THRESHOLD = 0.8;     // réussite d'une séance : ≥ 80 % de bonnes réponses au 1er essai
export const SESSIONS_PER_LEVEL = 2;   // séances réussies nécessaires par niveau
export const XP_PER_SESSION = 10;
export const XP_PER_CORRECT = 2;
export const DEFAULT_LEVELS = 3;
export const DEFAULT_DAILY_GOAL = 30;

export function newSkillState() {
  return { level: 0, progress: 0, sessions: 0, xp: 0 };
}

export function skillLevels(skill) {
  return skill && skill.levels > 0 ? skill.levels : DEFAULT_LEVELS;
}

/** Une compétence est déverrouillée si tous ses prérequis sont au niveau ≥ 1 (ou en mode découverte). */
export function isUnlocked(skill, progress) {
  if (progress && progress.settings && progress.settings.unlockAll) return true;
  const skills = (progress && progress.skills) || {};
  return (skill.prerequisites || []).every((id) => ((skills[id] || {}).level || 0) >= 1);
}

export function isCompleted(skill, progress) {
  const st = ((progress && progress.skills) || {})[skill.id];
  return !!st && st.level >= skillLevels(skill);
}

/** @param {{correct:number,total:number}} result */
export function isPassed(result) {
  return result.total > 0 && result.correct / result.total >= PASS_THRESHOLD;
}

export function sessionXp(result) {
  return XP_PER_SESSION + XP_PER_CORRECT * (result.correct || 0);
}

/**
 * Met à jour l'état d'une compétence après une séance (extraXp : bonus des exercices complets).
 * @returns {{state:object, xp:number, passed:boolean, leveledUp:boolean}}
 */
export function applySession(state, skill, result, extraXp = 0) {
  const s = { ...newSkillState(), ...(state || {}) };
  const levels = skillLevels(skill);
  const passed = isPassed(result);
  const xp = sessionXp(result) + (extraXp > 0 ? extraXp : 0);
  let leveledUp = false;
  s.sessions += 1;
  s.xp += xp;
  if (passed && s.level < levels) {
    s.progress = Math.round((s.progress + 1 / SESSIONS_PER_LEVEL) * 1000) / 1000;
    if (s.progress >= 0.999) {
      s.level += 1;
      s.progress = 0;
      leveledUp = true;
    }
  }
  return { state: s, xp, passed, leveledUp };
}

/** Série de jours consécutifs avec au moins une séance terminée. */
export function updateStreak(streak, today) {
  const st = { count: 0, last: null, ...(streak || {}) };
  if (st.last === today) return st;
  if (st.last && addDays(st.last, 1) === today) return { count: st.count + 1, last: today };
  return { count: 1, last: today };
}

/** Série affichable : 0 si la série est rompue (dernière séance avant hier). */
export function currentStreak(streak, today) {
  if (!streak || !streak.last) return 0;
  if (streak.last === today || addDays(streak.last, 1) === today) return streak.count;
  return 0;
}

/** XP gagnés un jour donné d'après l'historique. */
export function xpOnDay(history, day) {
  return (history || []).filter((h) => h.date === day).reduce((acc, h) => acc + (h.xp || 0), 0);
}
