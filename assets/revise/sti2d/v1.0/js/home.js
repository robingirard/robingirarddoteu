// home.js — accueil : regroupement des unités par matière et état d'affichage des sections (fonctions pures)

/** Matières, dans l'ordre d'affichage. `matiere` d'une unité : 'ingenierie' | 'physique' | 'maths'. */
export const SUBJECTS = [
  { id: 'ingenierie', label: 'Ingénierie 2I2D', icon: '⚙️' },
  { id: 'physique', label: 'Physique-chimie', icon: '🔬' },
  { id: 'maths', label: 'Mathématiques', icon: '📐' },
];
export const DEFAULT_SUBJECT = 'ingenierie';
export const UI_KEY = 'revise-sti2d.ui.v1';

export function subjectById(id) {
  return SUBJECTS.find((s) => s.id === id) || null;
}

/** Matière d'une unité (une valeur inconnue ou absente → ingénierie). */
export function subjectOf(unit) {
  const m = unit && unit.matiere;
  return subjectById(m) ? m : DEFAULT_SUBJECT;
}

/** Groupes ordonnés { id, label, icon, units, skillCount } ; les matières sans unité sont omises. */
export function groupUnitsBySubject(content) {
  const groups = SUBJECTS.map((s) => ({ ...s, units: [], skillCount: 0 }));
  for (const unit of (content && content.units) || []) {
    const g = groups.find((x) => x.id === subjectOf(unit));
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
    if ((unit.skills || []).some((s) => s.id === skillId)) return subjectOf(unit);
  }
  return null;
}

/**
 * Regroupe des lignes de compétences (objets avec `id`) par matière, dans l'ordre des matières,
 * les compétences inconnues du contenu à la fin (« Autres »). Un seul groupe → pas d'en-tête.
 */
export function groupSkillRows(rows, content) {
  const groups = SUBJECTS.map((s) => ({ ...s, rows: [] }));
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
