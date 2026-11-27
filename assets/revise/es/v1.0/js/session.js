// session.js — construction et déroulement d'une séance (voir docs/SPEC.md §7)
// Fonctions pures : le hasard est injecté (rng) pour rester testable.
import { isDue, isNew, isMastered } from './scheduler.js';
import { isUnlocked } from './progression.js';

export const SKILL_SESSION_SIZE = 8;
export const REVIEW_SESSION_SIZE = 20;

/** Générateur pseudo-aléatoire déterministe (mulberry32). */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Copie mélangée (Fisher–Yates). */
export function shuffle(arr, rng = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Famille d'un item = son identifiant jusqu'au deuxième point (compétence.générateur) ; les items écrits
 * à la main (« compétence.h<crc> ») forment la famille « compétence.h ». Sert à varier les séances.
 */
export function familyOf(id) {
  const parts = String(id).split('.');
  if (parts.length < 2) return parts[0];
  const second = /^h[0-9a-f]{6,}$/i.test(parts[1]) ? 'h' : parts[1];
  return `${parts[0]}.${second}`;
}

/**
 * Réordonne une file (passage glouton, déterministe) pour éviter deux items consécutifs de la même
 * famille quand c'est possible ; l'ordre relatif des autres items est conservé au mieux.
 */
export function diversify(ids, family = familyOf) {
  const rest = ids.slice();
  const out = [];
  while (rest.length) {
    const prev = out.length ? family(out[out.length - 1]) : null;
    let k = rest.findIndex((id) => family(id) !== prev);
    if (k < 0) k = 0;
    out.push(rest.splice(k, 1)[0]);
  }
  return out;
}

export function findSkill(content, skillId) {
  for (const unit of content.units || []) {
    for (const skill of unit.skills || []) if (skill.id === skillId) return skill;
  }
  return null;
}

export function findUnit(content, skillId) {
  for (const unit of content.units || []) {
    if ((unit.skills || []).some((s) => s.id === skillId)) return unit;
  }
  return null;
}

/** Items d'une compétence, existants dans content.items. */
export function skillItems(content, skill) {
  return (skill.items || []).map((id) => content.items[id]).filter(Boolean);
}

/** Exercices complets (guided) d'une compétence : jamais tirés dans une séance ordinaire. */
export function guidedItems(content, skill) {
  return skillItems(content, skill).filter((it) => it.type === 'guided');
}

/**
 * Classe les items d'une compétence : dus (par date croissante), nouveaux accessibles
 * (niveau ≤ niveau courant + 1, triés par niveau), déjà vus non dus, et nouveaux trop avancés.
 */
export function classifySkillItems(content, progress, skillId, today) {
  const skill = findSkill(content, skillId);
  if (!skill) throw new Error(`Compétence inconnue : ${skillId}`);
  const states = progress.items || {};
  const level = ((progress.skills || {})[skillId] || {}).level || 0;
  const maxLevel = level + 1;
  const due = [], fresh = [], seen = [], later = [], mastered = [];
  for (const item of skillItems(content, skill)) {
    if (item.type === 'guided') continue; // les exercices complets ne comptent pas ici
    const st = states[item.id];
    if (isMastered(st)) mastered.push(item);
    if (isDue(st, today)) due.push(item);
    else if (isNew(st)) ((item.level || 1) <= maxLevel ? fresh : later).push(item);
    else seen.push(item);
  }
  due.sort((a, b) => states[a.id].due.localeCompare(states[b.id].due));
  fresh.sort((a, b) => (a.level || 1) - (b.level || 1)); // tri stable : ordre du contenu à niveau égal
  return { skill, due, fresh, seen, later, mastered };
}

/** Compteurs affichés dans l'interface. */
export function skillCounts(content, progress, skillId, today) {
  const c = classifySkillItems(content, progress, skillId, today);
  return {
    total: c.due.length + c.fresh.length + c.seen.length + c.later.length,
    due: c.due.length,
    fresh: c.fresh.length + c.later.length,
    mastered: c.mastered.length,
  };
}

/** Items dus dans les compétences déverrouillées, triés par date. */
export function dueItems(content, progress, today) {
  const states = progress.items || {};
  const out = [];
  for (const unit of content.units || []) {
    for (const skill of unit.skills || []) {
      if (!isUnlocked(skill, progress)) continue;
      for (const item of skillItems(content, skill)) {
        if (item.type === 'guided') continue;
        if (isDue(states[item.id], today)) out.push(item);
      }
    }
  }
  out.sort((a, b) => states[a.id].due.localeCompare(states[b.id].due));
  return out;
}

export function countDue(content, progress, today) {
  return dueItems(content, progress, today).length;
}

function makeSession(kind, skillId, ids) {
  return { kind, skillId, queue: ids, index: 0, results: {}, attempts: 0, xpBonus: 0 };
}

/**
 * Séance de compétence : items dus, puis nouveaux (niveau ≤ niveau+1), puis déjà vus au hasard.
 * @param {object} opts  { today, size, rng, forceItemId }
 */
export function buildSkillSession(content, progress, skillId, opts = {}) {
  const { today, size = SKILL_SESSION_SIZE, rng = Math.random, forceItemId = null } = opts;
  const forced = forceItemId ? content.items[forceItemId] : null;
  if (forced && forced.type === 'guided') return makeSession('skill', skillId, [forceItemId]); // seul dans sa séance
  const { due, fresh, seen } = classifySkillItems(content, progress, skillId, today);
  // Les dus d'abord (mélangés puis diversifiés), puis les nouveaux et les déjà vus (idem)
  const dueQueue = due.slice(0, size);
  const rest = [];
  for (const item of fresh) {
    if (dueQueue.length + rest.length >= size) break;
    rest.push(item);
  }
  if (dueQueue.length + rest.length < size) {
    for (const item of shuffle(seen, rng)) {
      if (dueQueue.length + rest.length >= size) break;
      rest.push(item);
    }
  }
  let ids = [
    ...diversify(shuffle(dueQueue.map((it) => it.id), rng)),
    ...diversify(shuffle(rest.map((it) => it.id), rng)),
  ];
  if (forceItemId && content.items[forceItemId]) {
    ids = [forceItemId, ...ids.filter((id) => id !== forceItemId)];
  }
  return makeSession('skill', skillId, ids);
}

/** Séance de révision : tous les items dus des compétences déverrouillées (20 max), mélangés. */
export function buildReviewSession(content, progress, opts = {}) {
  const { today, size = REVIEW_SESSION_SIZE, rng = Math.random } = opts;
  const ids = diversify(shuffle(dueItems(content, progress, today).slice(0, size).map((it) => it.id), rng));
  return makeSession('review', null, ids);
}

export function currentItemId(session) {
  return session.index < session.queue.length ? session.queue[session.index] : null;
}

export function isFinished(session) {
  return session.index >= session.queue.length;
}

/**
 * Enregistre une réponse. Un item raté est remis en fin de file ; seule la première
 * tentative compte pour la note du planificateur et pour le score.
 * @param {{correct:boolean, grade?:string, xpBonus?:number, requeue?:boolean}} res
 * @returns {{session:object, schedulerGrade:string|null, firstAttempt:boolean}}
 */
export function answer(session, res) {
  const id = currentItemId(session);
  if (id == null) throw new Error('La séance est terminée.');
  const correct = !!res.correct;
  const s = { ...session, queue: session.queue.slice(), results: { ...session.results } };
  const firstAttempt = !(id in s.results);
  let schedulerGrade = null;
  if (firstAttempt) {
    s.results[id] = { firstTry: correct, attempts: 1 };
    schedulerGrade = correct ? (res.grade && res.grade !== 'again' ? res.grade : 'good') : 'again';
  } else {
    s.results[id] = { ...s.results[id], attempts: s.results[id].attempts + 1 };
  }
  if (firstAttempt && res.xpBonus > 0) s.xpBonus = (s.xpBonus || 0) + res.xpBonus;
  if (!correct && res.requeue !== false) s.queue.push(id);
  s.index += 1;
  s.attempts += 1;
  return { session: s, schedulerGrade, firstAttempt };
}

/** Bilan : items distincts, réussis du premier coup, précision. */
export function summary(session) {
  const ids = Object.keys(session.results);
  const correct = ids.filter((id) => session.results[id].firstTry).length;
  return { total: ids.length, correct, accuracy: ids.length ? correct / ids.length : 0 };
}
