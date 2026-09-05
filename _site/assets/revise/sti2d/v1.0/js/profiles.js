// profiles.js — plusieurs élèves sur le même navigateur (voir docs/PLAN-V2.md §3).
//
// La progression vivait sous une clé unique : un seul élève par appareil, et rien à emporter
// ailleurs. Chaque profil a maintenant sa propre progression (`revise.progres.<id>.v1`), et cet
// index dit lesquels existent et lequel travaille en ce moment. Deux frères peuvent réviser sur le
// même téléphone, et une progression peut voyager d'une machine à l'autre par un fichier.
//
// Rien ne sort de l'appareil : ni compte, ni serveur, ni identifiant autre qu'un prénom choisi par
// l'élève — ce sont des données scolaires de mineurs, elles restent chez eux.
//
// Tout accès au stockage est protégé : en navigation privée stricte, quota plein ou `localStorage`
// interdit, l'application doit continuer de tourner sans profil plutôt que de planter.

import { STORAGE_KEY, progressKey } from './store.js';
import { todayStr } from './dates.js';

export const INDEX_KEY = 'revise.profils.v1';
export const VERSION = 1;
export const EMOJI_DEFAUT = '🙂';
const NOM_MAX = 40;

function defaultStorage() {
  try {
    return globalThis.localStorage || null;
  } catch {
    return null; // accès interdit (navigation privée stricte, etc.)
  }
}

function emptyIndex() {
  return { version: VERSION, courant: null, profils: [] };
}

/** Lit l'index ; un stockage absent ou abîmé donne un index vide, jamais une exception. */
function readIndex(storage) {
  try {
    const raw = storage && storage.getItem(INDEX_KEY);
    if (!raw) return emptyIndex();
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== 'object' || !Array.isArray(obj.profils)) return emptyIndex();
    const profils = obj.profils.filter((p) => p && typeof p.id === 'string' && p.id);
    const courant = profils.some((p) => p.id === obj.courant) ? obj.courant : (profils[0] ? profils[0].id : null);
    return { version: VERSION, courant, profils };
  } catch {
    return emptyIndex();
  }
}

function writeIndex(index, storage) {
  try {
    if (!storage) return false;
    storage.setItem(INDEX_KEY, JSON.stringify(index));
    return true;
  } catch {
    return false;   // quota plein : le profil reste utilisable pour cette session
  }
}

/** Vrai si un index a déjà été écrit (sert à ne migrer qu'une fois). */
function indexExists(storage) {
  try {
    return !!(storage && storage.getItem(INDEX_KEY));
  } catch {
    return false;
  }
}

function nettoyerNom(nom) {
  const n = String(nom == null ? '' : nom).trim().slice(0, NOM_MAX);
  if (!n) throw new Error('Le prénom ne peut pas être vide.');
  return n;
}

function nettoyerEmoji(emoji) {
  const e = String(emoji == null ? '' : emoji).trim();
  if (!e) return EMOJI_DEFAUT;
  return Array.from(e).slice(0, 2).join('');
}

/** Base d'identifiant tirée du prénom : sans accent, sans espace, utilisable dans une clé. */
function slug(nom) {
  const s = String(nom)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 20);
  return s || 'eleve';
}

/**
 * Identifiant libre : préfixe lisible + suffixe tiré au sort, vérifié contre l'index.
 * Deux « Tom » sur le même appareil doivent avoir deux progressions distinctes — d'où la
 * vérification plutôt qu'un simple tirage.
 */
function nouvelId(nom, pris) {
  const base = slug(nom);
  for (let essai = 0; essai < 50; essai++) {
    const suffixe = Math.floor(Math.random() * 0x10000).toString(16).padStart(4, '0');
    const id = `${base}-${suffixe}`;
    if (!pris.has(id)) return id;
  }
  let n = 2;
  while (pris.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

/** Les profils enregistrés, dans l'ordre de création. */
export function list(storage = defaultStorage()) {
  return readIndex(storage).profils;
}

/** Identifiant du profil qui travaille, ou null s'il n'y en a aucun. */
export function current(storage = defaultStorage()) {
  return readIndex(storage).courant;
}

/** Le profil courant sous forme d'objet (null si aucun). */
export function currentProfile(storage = defaultStorage()) {
  const index = readIndex(storage);
  return index.profils.find((p) => p.id === index.courant) || null;
}

export function get(id, storage = defaultStorage()) {
  return readIndex(storage).profils.find((p) => p.id === id) || null;
}

/** Change de profil ; un identifiant inconnu est ignoré (l'appelant ne peut pas casser l'index). */
export function setCurrent(id, storage = defaultStorage()) {
  const index = readIndex(storage);
  if (!index.profils.some((p) => p.id === id)) return index.courant;
  index.courant = id;
  writeIndex(index, storage);
  return id;
}

/** Crée un profil ; le premier créé devient le profil courant. */
export function create({ nom, emoji } = {}, storage = defaultStorage(), today = todayStr()) {
  const index = readIndex(storage);
  const profil = {
    id: nouvelId(nom, new Set(index.profils.map((p) => p.id))),
    nom: nettoyerNom(nom),
    emoji: nettoyerEmoji(emoji),
    cree: today,
    vu: null,
  };
  index.profils.push(profil);
  if (!index.courant) index.courant = profil.id;
  writeIndex(index, storage);
  return profil;
}

/** Change le prénom et/ou l'emoji ; l'identifiant, lui, ne bouge pas (il nomme la progression). */
export function rename(id, { nom, emoji } = {}, storage = defaultStorage()) {
  const index = readIndex(storage);
  const profil = index.profils.find((p) => p.id === id);
  if (!profil) return null;
  if (nom !== undefined) profil.nom = nettoyerNom(nom);
  if (emoji !== undefined) profil.emoji = nettoyerEmoji(emoji);
  writeIndex(index, storage);
  return profil;
}

/** Supprime un profil **et sa progression** ; renvoie le nouveau profil courant (ou null). */
export function remove(id, storage = defaultStorage()) {
  const index = readIndex(storage);
  const reste = index.profils.filter((p) => p.id !== id);
  if (reste.length === index.profils.length) return index.courant;
  index.profils = reste;
  if (index.courant === id) index.courant = reste[0] ? reste[0].id : null;
  writeIndex(index, storage);
  try {
    if (storage) storage.removeItem(progressKey(id));
  } catch {
    /* la progression restera orpheline : sans entrée d'index, elle n'est plus atteignable */
  }
  return index.courant;
}

/** Date de dernière séance, affichée dans le choix du profil. */
export function touch(id, today, storage = defaultStorage()) {
  const index = readIndex(storage);
  const profil = index.profils.find((p) => p.id === id);
  if (!profil) return null;
  profil.vu = today;
  writeIndex(index, storage);
  return profil;
}

/**
 * Reprend la progression d'avant les profils.
 *
 * Elle vit sous `revise-sti2d.progress.v1` et c'est le travail réel du fils de Robin : on la
 * **recopie** sous la clé du nouveau profil et on laisse l'ancienne en place. Rien n'est détruit,
 * et relancer la migration ne fait rien de plus (l'existence de l'index suffit à l'arrêter).
 *
 * @returns {object|null} le profil créé, ou null s'il n'y avait rien à reprendre.
 */
export function migrate(today = todayStr(), storage = defaultStorage()) {
  if (!storage || indexExists(storage)) return null;
  let raw = null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  let nom = 'Élève';
  try {
    const ancienne = JSON.parse(raw);
    const trouve = ancienne && ancienne.settings && ancienne.settings.name;
    if (trouve && String(trouve).trim()) nom = String(trouve).trim().slice(0, NOM_MAX);
  } catch {
    /* progression illisible : on garde le nom par défaut, mais on recopie quand même les octets */
  }

  const profil = create({ nom }, storage, today);
  try {
    storage.setItem(progressKey(profil.id), raw);
  } catch {
    /* quota : le profil existe, sa progression repartira de zéro */
  }
  return profil;
}
