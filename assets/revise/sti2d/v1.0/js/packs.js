// packs.js — le contenu d'une unité (énoncés et leçons) arrive à la demande.
//
// `content.js` ne porte qu'un index : de quoi dessiner l'accueil, la carte de progression et
// composer une séance (type, niveau et tags de chaque exercice). Les énoncés et les leçons vivent
// dans `content/<unité>.js`, chargés quand on ouvre l'unité — sans quoi ouvrir une leçon de maths
// obligeait à charger l'ingénierie et la physique avec (2,5 Mo d'un bloc).
//
// Un exercice existe donc toujours dans `content.items` : d'abord en fiche (type, niveau, tags),
// puis complété par son énoncé quand son unité arrive. C'est ce qui permet à session.js, à
// progression.js et au bilan de continuer à travailler sur la totalité du contenu sans rien charger.

let content = null;
let base = 'content/';
const unitOfSkill = new Map();   // compétence → unité
const chargees = new Map();      // unité → Promise (une seule par unité, quel que soit le nombre d'appels)
const lecons = new Map();        // compétence → texte de la leçon
let injecter = null;             // injection du script (remplaçable dans les tests)

/**
 * Recolle l'index et prépare le chargement à la demande.
 * @param {object} opts { content, base, inject }  `inject(url)` doit renvoyer une Promise.
 */
export function configure(opts = {}) {
  content = opts.content || null;
  if (opts.base) base = opts.base;
  injecter = opts.inject || injecterParScript;
  unitOfSkill.clear();
  chargees.clear();
  lecons.clear();
  if (!content) return;
  content.items = content.items || {};
  // l'identifiant et la compétence ne sont pas dans les fiches (ils sont déjà la clé et skill.items)
  for (const unit of content.units || []) {
    for (const skill of unit.skills || []) {
      unitOfSkill.set(skill.id, unit.id);
      for (const id of skill.items || []) {
        const item = content.items[id];
        if (item) Object.assign(item, { id, skill: skill.id });
      }
    }
  }
  globalThis.REVISE_UNIT = recevoir;
}

/** Appelée par `content/<unité>.js` au chargement. */
function recevoir(unitId, data) {
  for (const [id, item] of Object.entries((data && data.items) || {})) {
    const fiche = content.items[id];
    content.items[id] = fiche ? Object.assign(fiche, item) : item;   // la fiche garde id et skill
  }
  for (const [skillId, texte] of Object.entries((data && data.lessons) || {})) lecons.set(skillId, texte);
  const attente = chargees.get(unitId);
  if (attente && attente.resoudre) attente.resoudre();
}

function injecterParScript(url) {
  return new Promise((resolve, reject) => {
    const el = document.createElement('script');
    el.src = url;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error(`Contenu introuvable : ${url}`));
    document.head.append(el);
  });
}

export function unitOf(skillId) {
  return unitOfSkill.get(skillId) || null;
}

export function unitOfItem(itemId) {
  const item = content && content.items[itemId];
  return item ? unitOf(item.skill) : null;
}

/** Vrai si l'unité est déjà là (ou si elle n'existe pas : rien à attendre). */
export function isLoaded(unitId) {
  const p = chargees.get(unitId);
  return !unitId || !!(p && p.faite);
}

/** Vrai si l'exercice a son énoncé, et pas seulement sa fiche. */
export function hasPayload(itemId) {
  const item = content && content.items[itemId];
  return !!(item && item.payload);
}

/** Charge une unité (une seule fois) ; résout immédiatement si elle est déjà là. */
export function load(unitId) {
  if (!unitId) return Promise.resolve();
  const dejala = chargees.get(unitId);
  if (dejala) return dejala.promesse;
  let resoudre;
  const promesse = new Promise((res, rej) => {
    resoudre = res;
    // le script appelle REVISE_UNIT en s'exécutant ; le onload sert de filet si le fichier est vide
    injecter(`${base}${unitId}.js`).then(() => res(), rej);
  }).then(() => { entree.faite = true; });
  const entree = { promesse, resoudre, faite: false };
  chargees.set(unitId, entree);
  return promesse;
}

/** Charge les unités de ces compétences (les doublons et les inconnues sont ignorés). */
export function loadForSkills(skillIds) {
  const unites = [...new Set(skillIds.map(unitOf).filter(Boolean))];
  return Promise.all(unites.map(load));
}

/** Charge les unités de ces exercices. */
export function loadForItems(itemIds) {
  const unites = [...new Set(itemIds.map(unitOfItem).filter(Boolean))];
  return Promise.all(unites.map(load));
}

/** Leçon d'une compétence, ou null tant que son unité n'est pas chargée (ou s'il n'y en a pas). */
export function lessonOf(skillId) {
  return lecons.get(skillId) || null;
}
