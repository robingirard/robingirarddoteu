// cagnotte.js — récompenser les petits pas, validés par un parent. Fonctions pures.
//
// Le principe : chaque séance réussie qui fait avancer une compétence est un **pas**, et chaque pas
// fait monter la cagnotte « en attente ». L'élève envoie quand il veut un **relevé** de ses pas au
// parent (un lien, par la feuille de partage : WhatsApp, Messages, mail). Le parent ouvre le lien,
// valide ou refuse chaque pas, et renvoie un **reçu**. C'est lui qui fait les virements.
//
// Barème (réglable par le parent) : une compétence terminée vaut `competence` centimes, répartis
// sur ses séances réussies (2 par niveau, donc 6 pour une compétence à 3 niveaux : 15 € → 6 × 2,50 €).
// Un mois après, la compétence vaut encore `consolidation` centimes si les révisions espacées
// montrent qu'elle est retenue : au moins 80 % de ses exercices vus sont maîtrisés.
//
// Identité d'un pas : sa compétence et son rang (`mobilites#3`, `mobilites#c` pour la
// consolidation), jamais un numéro d'ordre. Le même pas franchi sur deux appareils est donc le même
// pas : les deux cagnottes se fusionnent sans doublon, et le parent ne le paie qu'une fois.
//
// Qui fait foi. Rien n'est signé : sans serveur, une clé de signature serait dans l'application
// que l'élève a entre les mains. Ce qui protège le parent, c'est que **son registre** à lui fait foi
// (il recalcule chaque montant avec son propre barème, à partir de la compétence et du rang du pas)
// et que l'écran de validation lui propose deux questions à poser de vive voix. Le reçu porte le
// total cumulé : l'historique de la messagerie sert de sauvegarde si le registre disparaît.
import { addDays, isValidDay } from './dates.js';
import { isMastered, isNew } from './scheduler.js';
import { SESSIONS_PER_LEVEL, skillLevels } from './progression.js';

export const VERSION = 1;
export const BAREME_DEFAUT = Object.freeze({ competence: 1500, consolidation: 500, delai: 30 }); // centimes, jours
export const SEUIL_CONSOLIDATION = 0.8;
export const CLE_REGISTRE = 'revise.parent.v1';
const NOM_MAX = 40;
const PAS_MAX = 500;            // pas par relevé : un relevé plus long n'est pas plausible
const MONTANT_MAX = 100000;     // 1 000 € par compétence : au-delà, c'est une faute de frappe

// ---------------------------------------------------------------- montants

/** 1234 → « 12,34 € » (espace insécable). */
export function euros(centimes) {
  const c = Math.round(Number(centimes) || 0);
  const signe = c < 0 ? '−' : '';
  const a = Math.abs(c);
  return `${signe}${Math.floor(a / 100)},${String(a % 100).padStart(2, '0')} €`;
}

/** « 12,5 » ou « 12.50 » → 1250 centimes ; null si illisible ou négatif. */
export function lireEuros(texte) {
  const t = String(texte ?? '').replace(/\s|€/g, '').replace(',', '.');
  if (!/^\d+(\.\d{0,2})?$/.test(t)) return null;
  return Math.round(Number(t) * 100);
}

export function normaliserBareme(b) {
  const n = (x, def) => (Number.isFinite(Number(x)) && Number(x) >= 0 ? Math.min(MONTANT_MAX, Math.round(Number(x))) : def);
  const src = b && typeof b === 'object' ? b : {};
  return {
    competence: n(src.competence, BAREME_DEFAUT.competence),
    consolidation: n(src.consolidation, BAREME_DEFAUT.consolidation),
    delai: Math.max(1, Math.min(365, n(src.delai, BAREME_DEFAUT.delai))),
  };
}

/** Nombre de pas d'une compétence : ses séances réussies nécessaires. */
export function pasParCompetence(skill) {
  return skillLevels(skill) * SESSIONS_PER_LEVEL;
}

/**
 * Montant d'un pas. Le k-ième des N pas d'une compétence reçoit sa part arrondie au centime, de
 * sorte que la somme des N pas fasse exactement le montant de la compétence.
 */
export function montant(pas, bareme = BAREME_DEFAUT) {
  const b = normaliserBareme(bareme);
  if (pas.type === 'conso') return b.consolidation;
  const N = Math.max(1, Number(pas.de) || 1);
  const k = Math.max(1, Math.min(N, Number(pas.k) || 1));
  return Math.round((b.competence * k) / N) - Math.round((b.competence * (k - 1)) / N);
}

export const somme = (pas, bareme) => pas.reduce((acc, p) => acc + montant(p, bareme), 0);

// ---------------------------------------------------------------- côté élève

/** Identifiant de la cagnotte : distingue deux enfants (ou deux profils) dans le registre du parent. */
function nouvelId(rng = Math.random) {
  let s = '';
  for (let i = 0; i < 10; i++) s += 'abcdefghijkmnpqrstuvwxyz23456789'[Math.floor(rng() * 32)];
  return s;
}

export function estActive(progress) {
  return !!(progress && progress.cagnotte && progress.cagnotte.actif);
}

/** Active la cagnotte (ou la réactive : les pas et le dernier reçu sont gardés). */
export function activer(progress, today, rng = Math.random) {
  const c = progress.cagnotte;
  progress.cagnotte = c && c.id
    ? { ...c, actif: true }
    : { actif: true, id: nouvelId(rng), depuis: today, pas: [], recu: null };
  return progress.cagnotte;
}

export function desactiver(progress) {
  if (progress.cagnotte) progress.cagnotte.actif = false;
}

/** Clé d'un pas : `compétence#rang`, ou `compétence#c` pour la consolidation. */
export function cle(p) {
  return p.type === 'conso' ? `${p.skill}#c` : `${p.skill}#${p.k}`;
}

/**
 * Le pas d'une séance de compétence, ou null. `avant` est l'état de la compétence avant la séance :
 * seule une séance réussie qui fait avancer une compétence pas encore terminée compte.
 */
export function pasDeSeance(progress, skill, avant, passed, today) {
  if (!estActive(progress) || !passed || !skill) return null;
  const st = { level: 0, progress: 0, ...(avant || {}) };
  const N = pasParCompetence(skill);
  const k = st.level * SESSIONS_PER_LEVEL + Math.round(st.progress * SESSIONS_PER_LEVEL) + 1;
  if (k > N) return null;   // compétence déjà terminée : les séances suivantes sont de l'entretien
  const c = progress.cagnotte;
  const pas = { date: today, type: 'seance', skill: skill.id, k, de: N };
  if (c.pas.some((p) => cle(p) === cle(pas))) return null;
  c.pas.push(pas);
  return pas;
}

/** Part des exercices vus d'une compétence qui sont maîtrisés (null si aucun n'a été vu). */
export function partMaitrisee(progress, skill) {
  const etats = (progress && progress.items) || {};
  let vus = 0, acquis = 0;
  for (const id of skill.items || []) {
    const s = etats[id];
    if (isNew(s)) continue;
    vus += 1;
    if (isMastered(s)) acquis += 1;
  }
  return vus ? acquis / vus : null;
}

/** Compétences dont le pas final a été franchi : date de fin et date à partir de laquelle consolider. */
export function competencesTerminees(progress, bareme = BAREME_DEFAUT) {
  const c = progress && progress.cagnotte;
  if (!c) return [];
  const delai = normaliserBareme(bareme).delai;
  return c.pas.filter((p) => p.type === 'seance' && p.k === p.de)
    .map((p) => ({ skill: p.skill, fini: p.date, consolidable: addDays(p.date, delai), faite: c.pas.some((q) => q.type === 'conso' && q.skill === p.skill) }));
}

/** Ajoute les pas de consolidation devenus dus ; renvoie ceux qui viennent d'être ajoutés. */
export function consolider(progress, content, today, bareme = BAREME_DEFAUT) {
  if (!estActive(progress)) return [];
  const nouveaux = [];
  for (const t of competencesTerminees(progress, bareme)) {
    if (t.faite || today < t.consolidable) continue;
    const skill = trouverCompetence(content, t.skill);
    if (!skill) continue;
    const part = partMaitrisee(progress, skill);
    if (part == null || part < SEUIL_CONSOLIDATION) continue;
    const pas = { date: today, type: 'conso', skill: t.skill, k: 1, de: 1 };
    progress.cagnotte.pas.push(pas);
    nouveaux.push(pas);
  }
  return nouveaux;
}

function trouverCompetence(content, id) {
  for (const u of (content && content.units) || []) for (const s of u.skills || []) if (s.id === id) return s;
  return null;
}

/** Pas encore sans décision du parent. */
export function enAttente(progress) {
  const c = progress && progress.cagnotte;
  if (!c) return [];
  const r = c.recu;
  const decides = new Set([...lireCles(r && r.valides), ...lireCles(r && r.refuses)]);
  return c.pas.filter((p) => !decides.has(cle(p)));
}

/** Ce que l'élève voit : validé (selon le dernier reçu), versé, à recevoir, en attente. */
export function etat(progress) {
  const c = (progress && progress.cagnotte) || { pas: [], recu: null };
  const r = c.recu;
  const bareme = normaliserBareme(r && r.bareme);
  const attente = enAttente(progress);
  const valide = r ? r.valide : 0;
  const verse = r ? r.verse : 0;
  const refuses = new Set(lireCles(r && r.refuses));
  return {
    bareme, valide, verse, aRecevoir: Math.max(0, valide - verse),
    attente, enAttente: somme(attente, bareme),
    refuses: c.pas.filter((p) => refuses.has(cle(p))),
  };
}

/** Relevé à envoyer au parent : les pas en attente, et le dernier reçu (qui lui sert de sauvegarde). */
export function releve(progress, nom, today) {
  const c = progress.cagnotte;
  return {
    v: VERSION, t: 'releve', id: c.id, nom: String(nom || '').trim().slice(0, NOM_MAX), date: today,
    pas: enAttente(progress).map(({ date, type, skill, k, de }) => ({ date, type, skill, k, de })),
    recu: c.recu ? { ...c.recu } : null,
  };
}

/**
 * Enregistre un reçu du parent. Un reçu plus ancien que celui déjà enregistré est refusé : rouvrir
 * un vieux message ne doit pas faire redescendre la cagnotte.
 */
export function appliquerRecu(progress, recu) {
  const c = progress && progress.cagnotte;
  if (!c || !c.id) throw new Error('La cagnotte n\'est pas activée sur cet appareil (Réglages → Cagnotte).');
  if (recu.id !== c.id) throw new Error('Ce reçu concerne une autre cagnotte : ouvre-le sur l\'appareil (et le profil) de l\'élève.');
  const ancien = c.recu;
  if (ancien) {
    const nDecides = (r) => lireCles(r.valides).length + lireCles(r.refuses).length;
    if (nDecides(recu) < nDecides(ancien) || recu.verse < ancien.verse) {
      return { applique: false, raison: 'Ce reçu est plus ancien que celui déjà enregistré : rien n\'a changé.' };
    }
  }
  c.recu = { ...recu };
  return { applique: true };
}

/** Le plus avancé de deux reçus : celui qui a tranché le plus de pas, puis le plus versé. */
function recuLePlusAvance(a, b) {
  if (!a) return b || null;
  if (!b) return a;
  const poids = (r) => [lireCles(r.valides).length + lireCles(r.refuses).length, r.verse];
  const [pa, pb] = [poids(a), poids(b)];
  return pb[0] > pa[0] || (pb[0] === pa[0] && pb[1] > pa[1]) ? b : a;
}

/**
 * Fusionne la cagnotte d'un autre appareil dans celle-ci : l'union des pas (un pas franchi des deux
 * côtés garde sa date la plus ancienne) et le reçu le plus avancé. Si les deux appareils avaient
 * chacun activé leur cagnotte, on garde l'identifiant de celle que le parent connaît déjà (qui a un
 * reçu), sinon la plus ancienne. Fonction pure.
 */
export function fusionnerCagnottes(ici, autre) {
  if (!autre || !autre.id) return ici || null;
  if (!ici || !ici.id) return { ...autre, pas: [...(autre.pas || [])] };
  const parCle = new Map();
  for (const p of [...(ici.pas || []), ...(autre.pas || [])]) {
    const k = cle(p);
    const deja = parCle.get(k);
    if (!deja || p.date < deja.date) parCle.set(k, { ...p });
  }
  const pas = [...parCle.values()].sort((x, y) => (x.date < y.date ? -1 : x.date > y.date ? 1 : cle(x) < cle(y) ? -1 : 1));
  const garde = ici.recu && !autre.recu ? ici
    : autre.recu && !ici.recu ? autre
      : ici.depuis <= autre.depuis ? ici : autre;
  // un reçu ne vaut que pour l'identifiant qu'il porte : celui de la cagnotte écartée est abandonné
  const recu = ici.id === autre.id ? recuLePlusAvance(ici.recu, autre.recu) : garde.recu;
  return {
    actif: !!(ici.actif || autre.actif), id: garde.id,
    depuis: ici.depuis < autre.depuis ? ici.depuis : autre.depuis,
    pas, recu: recu ? { ...recu } : null,
  };
}

// ---------------------------------------------------------------- côté parent : le registre

export function registreVide() {
  return { v: VERSION, bareme: { ...BAREME_DEFAUT }, enfants: {} };
}

export function normaliserRegistre(obj) {
  const base = registreVide();
  if (!obj || typeof obj !== 'object') return base;
  const enfants = {};
  for (const [id, e] of Object.entries(obj.enfants || {})) {
    if (!e || typeof e !== 'object' || !/^[a-z0-9]{4,20}$/.test(id)) continue;
    enfants[id] = {
      nom: String(e.nom || '').slice(0, NOM_MAX),
      valides: ecrireCles(lireCles(e.valides)),
      refuses: ecrireCles(lireCles(e.refuses)),
      valide: entier(e.valide), verse: entier(e.verse),
      journal: Array.isArray(e.journal) ? e.journal.filter((j) => j && isValidDay(j.date)).slice(-200) : [],
      reconstitue: !!e.reconstitue,
    };
  }
  return { v: VERSION, bareme: normaliserBareme(obj.bareme), enfants };
}

const entier = (x) => (Number.isFinite(Number(x)) && Number(x) >= 0 ? Math.round(Number(x)) : 0);

/**
 * Accueille un relevé : crée l'enfant au premier relevé (ou le reconstitue depuis le dernier reçu
 * que l'élève a gardé, si ce registre a été perdu) et renvoie les pas qui attendent une décision.
 */
export function recevoirReleve(registre, rel) {
  let e = registre.enfants[rel.id];
  if (!e) {
    const r = rel.recu;
    e = {
      nom: rel.nom, valides: r ? r.valides : {}, refuses: r ? r.refuses : {},
      valide: r ? r.valide : 0, verse: r ? r.verse : 0, journal: [], reconstitue: !!r,
    };
    registre.enfants[rel.id] = e;
  }
  if (rel.nom) e.nom = rel.nom;
  const decides = new Set([...lireCles(e.valides), ...lireCles(e.refuses)]);
  return { enfant: e, nouveaux: rel.pas.filter((p) => !decides.has(cle(p))) };
}

/** Le parent tranche : `refuses` est l'ensemble des clés refusées, `reportes` celles laissées pour plus tard. */
export function valider(registre, id, pas, { refuses = new Set(), reportes = new Set() } = {}, today) {
  const e = registre.enfants[id];
  if (!e) throw new Error('Enfant inconnu dans ce registre.');
  const val = lireCles(e.valides), ref = lireCles(e.refuses);
  const deja = new Set([...val, ...ref]);
  let gagne = 0, nVal = 0, nRef = 0;
  for (const p of pas) {
    const c = cle(p);
    if (deja.has(c) || reportes.has(c)) continue;
    deja.add(c);
    if (refuses.has(c)) { ref.push(c); nRef += 1; continue; }
    val.push(c);
    nVal += 1;
    gagne += montant(p, registre.bareme);
  }
  e.valides = ecrireCles(val);
  e.refuses = ecrireCles(ref);
  e.valide += gagne;
  if (nVal || nRef) e.journal.push({ date: today, type: 'validation', montant: gagne, valides: nVal, refuses: nRef });
  return { gagne, nVal, nRef };
}

/** Le parent a fait un virement. */
export function verser(registre, id, centimes, today) {
  const e = registre.enfants[id];
  if (!e) throw new Error('Enfant inconnu dans ce registre.');
  const du = e.valide - e.verse;
  const m = Math.round(Number(centimes) || 0);
  if (!(m > 0)) throw new Error('Montant invalide.');
  if (m > du) throw new Error(`C'est plus que ce qui est dû (${euros(du)}).`);
  e.verse += m;
  e.journal.push({ date: today, type: 'versement', montant: m });
  return e;
}

/** Le reçu à renvoyer à l'élève : l'état cumulé, pour que sa cagnotte affiche les mêmes chiffres. */
export function recu(registre, id, today) {
  const e = registre.enfants[id];
  return { v: VERSION, t: 'recu', id, date: today, valides: e.valides, refuses: e.refuses, valide: e.valide, verse: e.verse, bareme: { ...registre.bareme } };
}

// ---------------------------------------------------------------- ensembles de clés, compacts
//
// Un reçu porte toutes les décisions depuis le début : pour qu'il tienne dans un lien, les clés sont
// regroupées par compétence, `{ mobilites: '1,2,3,4,c' }` (≈ 20 octets par compétence).

export function ecrireCles(cles) {
  const parSkill = {};
  for (const c of new Set(cles)) {
    const i = String(c).lastIndexOf('#');
    if (i <= 0) continue;
    const skill = c.slice(0, i), rang = c.slice(i + 1);
    if (!/^(\d{1,3}|c)$/.test(rang)) continue;
    (parSkill[skill] = parSkill[skill] || []).push(rang);
  }
  const out = {};
  for (const skill of Object.keys(parSkill).sort()) {
    out[skill] = parSkill[skill].sort((a, b) => (a === 'c' ? 1 : b === 'c' ? -1 : Number(a) - Number(b))).join(',');
  }
  return out;
}

export function lireCles(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return [];
  const out = [];
  for (const [skill, rangs] of Object.entries(obj).slice(0, 2000)) {
    if (!skill || skill.length > 80) continue;
    for (const r of String(rangs).split(',')) if (/^(\d{1,3}|c)$/.test(r.trim())) out.push(`${skill}#${r.trim()}`);
  }
  return [...new Set(out)];
}

// ---------------------------------------------------------------- vérification de ce qui arrive par lien

const str = (x, max = 60) => String(x ?? '').slice(0, max);

function nettoyerPas(p) {
  if (!p || typeof p !== 'object' || !isValidDay(p.date)) return null;
  const k = Number(p.k), de = Number(p.de);
  if (!Number.isInteger(k) || !Number.isInteger(de) || k < 1 || de < 1 || k > de || de > 100) return null;
  if (p.type !== 'seance' && p.type !== 'conso') return null;
  const skill = str(p.skill, 80);
  if (!skill || skill.includes('#')) return null;
  return { date: p.date, type: p.type, skill, k, de };
}

function nettoyerRecu(r) {
  if (!r || typeof r !== 'object' || r.v !== VERSION || !/^[a-z0-9]{4,20}$/.test(String(r.id)) || !isValidDay(r.date)) return null;
  return {
    v: VERSION, t: 'recu', id: r.id, date: r.date,
    valides: ecrireCles(lireCles(r.valides)), refuses: ecrireCles(lireCles(r.refuses)),
    valide: entier(r.valide), verse: Math.min(entier(r.verse), entier(r.valide)), bareme: normaliserBareme(r.bareme),
  };
}

/** Vérifie un objet reçu par lien (relevé ou reçu) ; lève une erreur lisible sinon. */
export function nettoyer(obj) {
  const bad = new Error('Ce lien ne contient pas un relevé de cagnotte valide.');
  if (!obj || typeof obj !== 'object') throw bad;
  if (obj.t === 'recu') {
    const r = nettoyerRecu(obj);
    if (!r) throw bad;
    return r;
  }
  if (obj.t !== 'releve' || obj.v !== VERSION || !/^[a-z0-9]{4,20}$/.test(String(obj.id)) || !isValidDay(obj.date) || !Array.isArray(obj.pas)) throw bad;
  return {
    v: VERSION, t: 'releve', id: obj.id, nom: str(obj.nom, NOM_MAX), date: obj.date,
    pas: [...new Map(obj.pas.slice(0, PAS_MAX).map(nettoyerPas).filter(Boolean).map((p) => [cle(p), p])).values()],
    recu: obj.recu ? nettoyerRecu(obj.recu) : null,
  };
}

// ---------------------------------------------------------------- persistance du registre

export function chargerRegistre(storage) {
  try {
    const raw = storage && storage.getItem(CLE_REGISTRE);
    return raw ? normaliserRegistre(JSON.parse(raw)) : registreVide();
  } catch {
    return registreVide();
  }
}

export function enregistrerRegistre(registre, storage) {
  try {
    if (!storage) return false;
    storage.setItem(CLE_REGISTRE, JSON.stringify(registre));
    return true;
  } catch {
    return false;
  }
}
