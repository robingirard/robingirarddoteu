// fusion.js — réunir les progressions de deux appareils du même élève. Fonction pure.
//
// La carte d'identité (carte.js) transporte une progression d'un appareil à l'autre. L'importer en
// **remplaçant** celle de l'appareil d'arrivée perdait tout ce qui y avait été fait depuis le
// dernier transfert : travailler sur deux Mac obligeait à ne jamais oublier un passage. La fusion
// ne perd rien, dans quelque ordre qu'on la fasse et même si l'élève a travaillé des deux côtés :
//
//   - un exercice garde l'état de sa révision la plus récente (`last`) — c'est celui qui sait quand
//     le revoir ;
//   - une compétence garde l'état le plus avancé (niveau, puis progression dans le niveau) ;
//   - l'historique est l'union des séances, sans doublon (identifiant de séance, ou à défaut son
//     contenu pour les séances enregistrées avant qu'elles en aient un) ;
//   - XP et série se recalculent sur l'historique réuni ;
//   - la cagnotte se fusionne pas à pas (voir cagnotte.fusionnerCagnottes) ;
//   - les réglages restent ceux de l'appareil d'arrivée : ce sont des préférences d'écran.
import { addDays } from './dates.js';
import { fusionnerCagnottes } from './cagnotte.js';

/** Identifiant d'une séance de l'historique, pour la reconnaître après un aller-retour. */
export function idSeance(rng = Math.random) {
  let s = '';
  for (let i = 0; i < 10; i++) s += 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(rng() * 36)];
  return s;
}

const cleSeance = (h) => h.id || [h.date, h.kind, h.skill, h.correct, h.total, h.xp].join('|');

function plusRecent(a, b) {
  if (!a) return b;
  if (!b) return a;
  const la = a.last || '', lb = b.last || '';
  if (la !== lb) return lb > la ? b : a;
  return (b.reps || 0) > (a.reps || 0) ? b : a;
}

function plusAvancee(a, b) {
  if (!a) return b;
  if (!b) return a;
  const rang = (s) => (Number(s.level) || 0) + (Number(s.progress) || 0) / 10;
  const meilleur = rang(b) > rang(a) ? b : a;
  return {
    ...meilleur,
    sessions: Math.max(Number(a.sessions) || 0, Number(b.sessions) || 0),
    xp: Math.max(Number(a.xp) || 0, Number(b.xp) || 0),
  };
}

/** Série recalculée sur les dates de l'historique : jours consécutifs jusqu'au dernier jour travaillé. */
function serie(history) {
  const jours = new Set(history.map((h) => h.date).filter(Boolean));
  if (!jours.size) return { count: 0, last: null };
  const last = [...jours].sort().pop();
  let count = 1;
  while (jours.has(addDays(last, -count))) count += 1;
  return { count, last };
}

/**
 * Fusionne `autre` (la progression arrivée d'un autre appareil) dans `ici`. Renvoie la progression
 * fusionnée et ce que la fusion a apporté, pour le dire à l'élève. Ne modifie aucune des deux.
 */
export function fusionner(ici, autre) {
  const items = { ...(ici.items || {}) };
  let exercices = 0;
  for (const [id, st] of Object.entries((autre && autre.items) || {})) {
    const garde = plusRecent(items[id], st);
    if (garde !== items[id]) exercices += 1;
    items[id] = garde;
  }
  const skills = { ...(ici.skills || {}) };
  for (const [id, st] of Object.entries((autre && autre.skills) || {})) skills[id] = plusAvancee(skills[id], st);

  const vues = new Set();
  const history = [];
  let seances = 0;
  for (const [h, venantDAutre] of [...(ici.history || []).map((x) => [x, false]), ...((autre && autre.history) || []).map((x) => [x, true])]) {
    const k = cleSeance(h);
    if (vues.has(k)) continue;
    vues.add(k);
    history.push(h);
    if (venantDAutre) seances += 1;
  }
  history.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));   // tri stable : l'ordre du jour est gardé

  const xpHistorique = history.reduce((acc, h) => acc + (Number(h.xp) || 0), 0);
  const avantPas = ((ici.cagnotte && ici.cagnotte.pas) || []).length;
  const cagnotte = fusionnerCagnottes(ici.cagnotte, autre && autre.cagnotte);
  const fusion = {
    ...ici,
    items, skills, history,
    xp: Math.max(Number(ici.xp) || 0, Number(autre && autre.xp) || 0, xpHistorique),
    streak: serie(history),
  };
  if (cagnotte) fusion.cagnotte = cagnotte;
  return { progres: fusion, apport: { exercices, seances, pas: ((cagnotte && cagnotte.pas) || []).length - avantPas } };
}
