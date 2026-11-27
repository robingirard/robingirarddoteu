// home.js — accueil : regroupement des unités par matière et état d'affichage des sections (fonctions pures)

/**
 * Matières connues, dans l'ordre d'affichage : le repli d'un paquet qui ne déclare pas les siennes
 * (et la table des libellés quand `pack.yaml` les donne en ids nus, comme le paquet STI2D).
 */
export const SUBJECTS = [
  { id: 'ingenierie', label: 'Ingénierie 2I2D', icon: '⚙️' },
  { id: 'physique', label: 'Physique-chimie', icon: '🔬' },
  { id: 'maths', label: 'Mathématiques', icon: '📐' },
];
export const DEFAULT_SUBJECT = 'ingenierie';
export const UI_KEY = 'revise-sti2d.ui.v1';

/**
 * Matières du contenu, dans l'ordre d'affichage (moteur 1.3) : celles que le paquet déclare
 * (`content.pack.matieres`, objets { id, label, icon } normalisés par le build), sinon SUBJECTS.
 */
export function subjectsOf(content) {
  const declared = content && content.pack && content.pack.matieres;
  if (!Array.isArray(declared) || declared.length === 0) return SUBJECTS;
  return declared
    .filter((m) => m && m.id)
    .map((m) => ({ ...(SUBJECTS.find((s) => s.id === m.id) || {}), ...m }))
    .map((m) => ({ id: m.id, label: m.label || m.id, icon: m.icon || '📚' }));
}

export function subjectById(id, content) {
  return subjectsOf(content).find((s) => s.id === id) || null;
}

/** Matière d'une unité (une valeur inconnue ou absente → la première matière du contenu). */
export function subjectOf(unit, content) {
  const m = unit && unit.matiere;
  if (subjectById(m, content)) return m;
  return content && content.pack && content.pack.matieres ? subjectsOf(content)[0].id : DEFAULT_SUBJECT;
}

/** Groupes ordonnés { id, label, icon, units, skillCount } ; les matières sans unité sont omises. */
export function groupUnitsBySubject(content) {
  const groups = subjectsOf(content).map((s) => ({ ...s, units: [], skillCount: 0 }));
  for (const unit of (content && content.units) || []) {
    const g = groups.find((x) => x.id === subjectOf(unit, content));
    g.units.push(unit);
    g.skillCount += (unit.skills || []).length;
  }
  return groups.filter((g) => g.units.length > 0);
}

/** Nombre de compétences du groupe au niveau ≥ 1. */
export function reachedCount(group, progress) {
  const states = (progress && progress.skills) || {};
  let n = 0;
  for (const unit of group.units || []) {
    for (const skill of unit.skills || []) {
      if (((states[skill.id] || {}).level || 0) >= 1) n += 1;
    }
  }
  return n;
}

/** Matière d'une compétence (par son id) d'après le contenu ; null si inconnue. */
export function subjectOfSkill(skillId, content) {
  for (const unit of (content && content.units) || []) {
    if ((unit.skills || []).some((s) => s.id === skillId)) return subjectOf(unit, content);
  }
  return null;
}

/**
 * Regroupe des lignes de compétences (objets avec `id`) par matière, dans l'ordre des matières,
 * les compétences inconnues du contenu à la fin (« Autres »). Un seul groupe → pas d'en-tête.
 */
export function groupSkillRows(rows, content) {
  const groups = subjectsOf(content).map((s) => ({ ...s, rows: [] }));
  const other = { id: 'autres', label: 'Autres compétences', icon: '📚', rows: [] };
  for (const row of rows || []) {
    const subj = subjectOfSkill(row.id, content);
    (subj ? groups.find((g) => g.id === subj) : other).rows.push(row);
  }
  const out = [...groups, other].filter((g) => g.rows.length > 0);
  return out.map((g) => ({ ...g, header: out.length > 1 }));
}

// ---- état d'affichage (sections repliées), persistant par navigateur

export function defaultUiState() {
  return { collapsed: {} };
}

export function loadUiState(storage) {
  try {
    const raw = storage && storage.getItem(UI_KEY);
    const obj = raw ? JSON.parse(raw) : null;
    if (obj && typeof obj === 'object' && obj.collapsed && typeof obj.collapsed === 'object') {
      const collapsed = {};
      for (const [k, v] of Object.entries(obj.collapsed)) if (v) collapsed[k] = true;
      return { collapsed };
    }
  } catch { /* stockage indisponible ou corrompu : état par défaut */ }
  return defaultUiState();
}

export function saveUiState(state, storage) {
  try {
    if (!storage) return false;
    storage.setItem(UI_KEY, JSON.stringify({ collapsed: state.collapsed || {} }));
    return true;
  } catch {
    return false;
  }
}

/** Par défaut, toutes les sections sont dépliées. */
export function isExpanded(state, key) {
  return !(state && state.collapsed && state.collapsed[key]);
}

/** Nouvel état après bascule (ou forçage si `expanded` est donné). Ne modifie pas `state`. */
export function toggleSection(state, key, expanded = null) {
  const collapsed = { ...((state && state.collapsed) || {}) };
  const willExpand = expanded == null ? !isExpanded(state, key) : Boolean(expanded);
  if (willExpand) delete collapsed[key]; else collapsed[key] = true;
  return { collapsed };
}
