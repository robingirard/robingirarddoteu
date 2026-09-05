// carte.js — la « carte d'identité » d'un élève : son identité et ses résultats dans toutes les
// matières, dans un seul fichier JSON qui doit pouvoir passer d'une machine à l'autre.
//
// C'est le format d'échange du projet : il porte donc son nom (`format`) et son numéro de version,
// et il reste du JSON lisible à l'œil. Une carte écrite aujourd'hui doit encore s'ouvrir dans dix
// ans, quand l'application aura changé — d'où la règle de relecture ci-dessous : on accepte le
// passé (un ancien export de progression nue), on refuse proprement l'avenir (une version plus
// récente que celle qu'on sait lire).
//
// Deux façons de voyager, et elles n'ont pas la même portée :
//   - le fichier, qui marche toujours ;
//   - le lien, qui met la carte compressée dans le **fragment** de l'URL. Le fragment n'est jamais
//     envoyé au serveur : les résultats scolaires d'un mineur ne quittent pas l'appareil, même
//     quand le lien transite par une messagerie. Il a en revanche une limite de taille (LIMITE_LIEN).
//
// D'où une asymétrie assumée entre les deux : **le fichier garde tout**, en clair — c'est l'archive,
// elle doit rester compréhensible dans dix ans sans l'application, et rien ne l'oblige à être
// courte. **Le lien, lui, compacte les chapitres refermés** (voir compacter()), parce que c'est là,
// et là seulement, que la taille décide si le transport marche ou non.

import { MASTERED_INTERVAL } from './scheduler.js';
import { addDays, isValidDay } from './dates.js';

export const FORMAT = 'revise.carte';
export const VERSION = 1;

// Au-delà de cette longueur d'URL, le lien cesse d'être fiable : les clients de messagerie et de
// courrier le coupent, le replient ou n'en rendent cliquable qu'une partie, et l'élève reçoit une
// carte tronquée sans le savoir. Passé ce seuil, l'appelant doit proposer le fichier à la place —
// c'est pourquoi versLien() renvoie `tient` plutôt que d'échouer.
export const LIMITE_LIEN = 8000;

const NOM_MAX = 40;      // même longueur que le champ « Prénom » des réglages
const EMOJI_MAX = 8;     // un emoji, éventuellement composé (drapeau, famille…)

/** Profil nettoyé, ou null s'il n'y a rien à retenir. */
function normaliserProfil(profil) {
  if (!profil || typeof profil !== 'object') return null;
  const nom = String(profil.nom ?? '').trim().slice(0, NOM_MAX);
  const emoji = String(profil.emoji ?? '').trim().slice(0, EMOJI_MAX);
  return nom || emoji ? { nom, emoji } : null;
}

/** Assemble la carte à partir d'un profil et d'une progression. Fonction pure. */
export function build(profil, progres, today) {
  return {
    format: FORMAT,
    version: VERSION,
    genere: typeof today === 'string' && today ? today : null,
    profil: normaliserProfil(profil),
    progres: progres && typeof progres === 'object' ? progres : {},
  };
}

/** Texte du fichier : indenté, une ligne finale, prêt à être écrit ou relu à l'œil. */
export function toJson(carte) {
  return `${JSON.stringify(carte, null, 2)}\n`;
}

/**
 * Vérifie et normalise un objet reçu (fichier ou lien) ; lève une erreur lisible sinon.
 * Accepte deux formes : une carte, et un ancien export de progression nue — celui que produit
 * `store.exportJson`, et dans lequel vit la progression déjà accumulée. La perdre à l'occasion
 * d'un changement de format serait le pire service à rendre.
 */
function normaliser(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    throw new Error('Ce fichier ne contient pas une carte d\'identité.');
  }
  if (obj.format === FORMAT) {
    const version = Number(obj.version);
    if (!Number.isFinite(version) || version < 1) {
      throw new Error('Cette carte n\'indique pas sa version : elle est probablement abîmée.');
    }
    if (version > VERSION) {
      throw new Error(`Cette carte vient d'une version plus récente de l'application (version ${version}, `
        + `celle-ci lit jusqu'à la ${VERSION}). Mets l'application à jour avant de l'importer.`);
    }
    if (!obj.progres || typeof obj.progres !== 'object' || Array.isArray(obj.progres)) {
      throw new Error('Cette carte ne contient aucune progression.');
    }
    return {
      format: FORMAT,
      version: VERSION,
      genere: typeof obj.genere === 'string' ? obj.genere : null,
      profil: normaliserProfil(obj.profil),
      // toute lecture rend une progression complète : le planificateur ne doit jamais tomber sur
      // une forme réduite, qu'elle vienne d'un lien ou d'un fichier écrit depuis un lien
      progres: etendre(obj.progres),
    };
  }
  if ('items' in obj && 'skills' in obj) {
    // ancien export : la progression seule, sans identité — on la remonte en carte sans profil
    return { format: FORMAT, version: VERSION, genere: null, profil: null, progres: etendre(obj) };
  }
  throw new Error('Ce JSON n\'est ni une carte d\'identité ni une progression exportée.');
}

/** Lit le texte d'un fichier de carte. */
export function parse(texte) {
  let obj;
  try {
    obj = JSON.parse(texte);
  } catch {
    throw new Error('Ce texte n\'est pas du JSON valide.');
  }
  const carte = normaliser(obj);
  return { profil: carte.profil, progres: carte.progres };
}

/** Nom de fichier proposé au téléchargement : « revise-tom-2026-09-05.json ». */
export function nomDeFichier(carte) {
  const nom = ((carte && carte.profil && carte.profil.nom) || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')   // « Chloé » → « chloe »
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const jour = (carte && carte.genere) || '';
  return ['revise', nom, jour].filter(Boolean).join('-') + '.json';
}

// ---- compaction des chapitres refermés
//
// Ce qui pèse dans une carte, c'est `progres.items` : un état de répétition espacée par exercice vu
// (reps, ease, interval, due, lapses, last). Pour un exercice **maîtrisé** — intervalle d'au moins
// MASTERED_INTERVAL jours — ce détail n'apprend plus rien : ce qui compte est « acquis, à revoir
// vers telle date ». Les exercices réellement en cours, eux, gardent leur état complet : c'est là
// que le planificateur travaille.
//
// La reconstruction est approximative, et c'est sans conséquence : la répétition espacée est
// auto-corrective. À la première révision, la réponse de l'élève re-note l'exercice et le
// planificateur recalcule tout à partir de là. Un intervalle rebâti à 21 jours au lieu de 34 coûte
// une révision un peu plus tôt, rien de plus.

/** Vrai pour la forme réduite : une date seule, ou une date et un nombre de rechutes. */
function estReduit(v) {
  return typeof v === 'string' || (Array.isArray(v) && v.length === 2);
}

/**
 * Allège une progression : les exercices maîtrisés passent en forme réduite. Ne modifie pas
 * l'objet reçu, et ne fait rien de plus si la progression est déjà compactée.
 */
export function compacter(progres) {
  const items = {};
  for (const [id, st] of Object.entries((progres && progres.items) || {})) {
    if (estReduit(st)) {
      items[id] = st;
    } else if (st && typeof st === 'object' && Number(st.interval) >= MASTERED_INTERVAL && isValidDay(st.due)) {
      // les rechutes sont conservées : le bilan du parent s'en sert pour les points faibles
      items[id] = Number(st.lapses) > 0 ? [st.due, Number(st.lapses)] : st.due;
    } else {
      items[id] = st;
    }
  }
  return { ...progres, items };
}

/** Rebâtit une progression rejouable par le planificateur. Réciproque approchée de compacter(). */
export function etendre(progres) {
  const items = {};
  for (const [id, st] of Object.entries((progres && progres.items) || {})) {
    if (!estReduit(st)) {
      items[id] = st;
      continue;
    }
    const [due, lapses] = typeof st === 'string' ? [st, 0] : st;
    items[id] = {
      reps: 4,                       // nombre de bonnes réponses qu'il faut pour atteindre 21 jours
      ease: 2.5,                     // aisance par défaut, celle de scheduler.newState()
      interval: MASTERED_INTERVAL,   // le minimum qui vaut « maîtrisé » : on ne surestime pas
      due,
      lapses: Number(lapses) || 0,
      last: addDays(due, -MASTERED_INTERVAL),   // pour que last + interval retombe sur due
    };
  }
  return { ...progres, items };
}

// Pourquoi les identifiants restent en clair, dans le fichier comme dans le lien
//
// La question « et si on n'échangeait qu'une clé courte, ou un numéro ? » se repose naturellement :
// les identifiants pèsent 60 ko bruts pour 2 058 exercices, contre 15 ko d'empreintes. Mesuré
// **après compression**, le gain disparaît : 13 891 octets gzippés pour les identifiants contre
// 10 159 pour des empreintes, parce que gzip avale les longs préfixes communs (`liaisons.
// symbole_vers_nom.…`) alors qu'une empreinte est incompressible. Diviser la taille brute par
// quatre ne divise la compressée que par 1,4, et sur une carte réaliste (300 vus, deux tiers
// maîtrisés) les empreintes font même 79 octets de **plus**. Le seul schéma réellement plus petit
// serait un rang dans l'index du contenu (~260 octets d'identité) — écarté : un rang change dès
// qu'un exercice est ajouté ou retiré, et invaliderait toutes les cartes déjà émises.

// ---- lien : gzip (quand le navigateur sait le faire) puis base64url, dans le fragment

function versBase64url(octets) {
  let bin = '';
  for (let i = 0; i < octets.length; i += 0x8000) bin += String.fromCharCode(...octets.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function depuisBase64url(texte) {
  let b64 = String(texte).replace(/-/g, '+').replace(/_/g, '/');
  b64 += '='.repeat((4 - (b64.length % 4)) % 4);
  let bin;
  try {
    bin = atob(b64);
  } catch {
    throw new Error('Ce lien est abîmé : il ne contient pas une carte lisible.');
  }
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

/** Vide un flux d'octets dans un seul tableau (évite de dépendre de Blob ou de Response). */
async function lireFlux(flux) {
  const lecteur = flux.getReader();
  const morceaux = [];
  let taille = 0;
  for (;;) {
    const { done, value } = await lecteur.read();
    if (done) break;
    morceaux.push(value);
    taille += value.length;
  }
  const tout = new Uint8Array(taille);
  let i = 0;
  for (const m of morceaux) {
    tout.set(m, i);
    i += m.length;
  }
  return tout;
}

function fluxDe(octets) {
  return new ReadableStream({ start(c) { c.enqueue(octets); c.close(); } });
}

async function comprimer(octets) {
  if (typeof CompressionStream !== 'function') return octets;   // vieux navigateur : lien plus long, mais valide
  return lireFlux(fluxDe(octets).pipeThrough(new CompressionStream('gzip')));
}

async function decomprimer(octets) {
  if (typeof DecompressionStream !== 'function') {
    throw new Error('Ce navigateur ne sait pas lire un lien compressé : importe le fichier à la place.');
  }
  try {
    return await lireFlux(fluxDe(octets).pipeThrough(new DecompressionStream('gzip')));
  } catch {
    throw new Error('Ce lien est abîmé : il ne contient pas une carte lisible.');
  }
}

// Un flux gzip commence toujours par 1f 8b : la reconnaissance se fait donc sur les octets eux-mêmes,
// sans préfixe maison à maintenir. Un lien fabriqué sans compression reste lisible par la même fonction.
const estGzip = (o) => o.length > 2 && o[0] === 0x1f && o[1] === 0x8b;

/**
 * Lien à partager : `base` + `#/carte?d=…`. Renvoie aussi la taille obtenue et si elle tient,
 * pour que l'appelant propose le fichier quand le lien deviendrait trop long (voir LIMITE_LIEN).
 */
export async function versLien(carte, base = '') {
  const allegee = { ...carte, progres: compacter(carte.progres) };
  const brut = new TextEncoder().encode(JSON.stringify(allegee));
  const url = `${base}#/carte?d=${versBase64url(await comprimer(brut))}`;
  const octets = new TextEncoder().encode(url).length;
  return { url, octets, tient: octets <= LIMITE_LIEN };
}

/**
 * Relit un lien produit par versLien. Accepte l'URL entière, le fragment seul (`#/carte?d=…`)
 * ou la seule valeur encodée : à l'usage, ce qu'on colle dépend de l'endroit d'où on le copie.
 */
export async function depuisLien(fragment) {
  if (typeof fragment !== 'string' || !fragment.trim()) {
    throw new Error('Ce lien est vide.');
  }
  const m = /[?&]d=([A-Za-z0-9_-]+)/.exec(fragment);
  const encode = m ? m[1] : fragment.trim();
  if (!/^[A-Za-z0-9_-]{4,}$/.test(encode)) {
    throw new Error('Ce lien ne contient pas de carte : il manque la partie « d=… ».');
  }
  const octets = depuisBase64url(encode);
  const json = new TextDecoder().decode(estGzip(octets) ? await decomprimer(octets) : octets);
  let obj;
  try {
    obj = JSON.parse(json);
  } catch {
    throw new Error('Ce lien est abîmé : il ne contient pas une carte lisible.');
  }
  return normaliser(obj);
}
