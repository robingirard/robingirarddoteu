// store.js — persistance de la progression dans localStorage (voir docs/SPEC.md §8)
//
// Une progression par profil depuis l'étape 2 du plan V2 : `use()` dit lequel travaille, et
// `load` / `save` / `reset` suivent. Sans profil actif, tout se passe sous l'ancienne clé —
// c'est ce qui permet à l'application de tourner avant que la migration ait eu lieu, et aux
// tests de continuer à travailler sur le format d'origine.
import { DEFAULT_DAILY_GOAL } from './progression.js';

export const STORAGE_KEY = 'revise-sti2d.progress.v1';
export const PREFIXE_PROFIL = 'revise.progres.';
export const VERSION = 1;

let profilActif = null;

/** Clé de la progression d'un profil (l'ancienne clé quand il n'y en a pas). */
export function progressKey(profileId) {
  return profileId ? `${PREFIXE_PROFIL}${profileId}.v1` : STORAGE_KEY;
}

/** Choisit le profil dont on lit et écrit la progression ; null revient à l'ancienne clé. */
export function use(profileId) {
  profilActif = profileId || null;
  return profilActif;
}

/** La clé réellement utilisée par load/save/reset — utile aux tests et au diagnostic. */
export function activeKey() {
  return progressKey(profilActif);
}

export function emptyProgress() {
  return {
    version: VERSION,
    items: {},
    skills: {},
    xp: 0,
    streak: { count: 0, last: null },
    history: [],
    settings: { dailyGoal: DEFAULT_DAILY_GOAL },
  };
}

/** Complète les champs manquants (et migrera les anciennes versions). */
export function migrate(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw new Error('Format de progression invalide.');
  const base = emptyProgress();
  const p = {
    ...base,
    ...obj,
    items: obj.items && typeof obj.items === 'object' ? obj.items : {},
    skills: obj.skills && typeof obj.skills === 'object' ? obj.skills : {},
    streak: { ...base.streak, ...(obj.streak || {}) },
    history: Array.isArray(obj.history) ? obj.history : [],
    settings: { ...base.settings, ...(obj.settings || {}) },
  };
  p.xp = Number(p.xp) || 0;
  p.version = VERSION;
  return p;
}

function defaultStorage() {
  try {
    return globalThis.localStorage || null;
  } catch {
    return null; // accès interdit (navigation privée stricte, etc.)
  }
}

export function load(storage = defaultStorage()) {
  try {
    const raw = storage && storage.getItem(activeKey());
    return raw ? migrate(JSON.parse(raw)) : emptyProgress();
  } catch {
    return emptyProgress();
  }
}

export function save(progress, storage = defaultStorage()) {
  try {
    if (!storage) return false;
    storage.setItem(activeKey(), JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
}

export function reset(storage = defaultStorage()) {
  try {
    if (storage) storage.removeItem(activeKey());
  } catch {
    /* ignoré */
  }
  return emptyProgress();
}

export function exportJson(progress) {
  return JSON.stringify(progress, null, 2);
}

/** Lit un export JSON ; lève une erreur lisible si le texte n'est pas une progression. */
export function importJson(text) {
  let obj;
  try {
    obj = JSON.parse(text);
  } catch {
    throw new Error('Ce texte n\'est pas du JSON valide.');
  }
  if (!obj || typeof obj !== 'object' || !('items' in obj) || !('skills' in obj)) {
    throw new Error('Ce JSON ne ressemble pas à une progression exportée.');
  }
  return migrate(obj);
}
