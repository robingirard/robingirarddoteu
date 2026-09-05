// answers.js — vérification des réponses (fonctions pures, testables)

/** Égalité de deux ensembles (tableaux ou Set). */
export function setEquals(a, b) {
  const sa = new Set(a), sb = new Set(b);
  if (sa.size !== sb.size) return false;
  for (const x of sa) if (!sb.has(x)) return false;
  return true;
}

/** Normalisation d'une réponse texte : minuscules, sans accents, sans espaces, virgule → point. */
export function normalizeAnswer(s) {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '')
    .replace(/,/g, '.');
}

/** Vérifie une réponse saisie pour un item de type `input`. */
export function checkInput(payload, value) {
  const given = normalizeAnswer(value);
  if (given === '') return false;
  if (payload.numeric) {
    const x = Number(given);
    const expected = Number(normalizeAnswer(payload.answer));
    if (Number.isNaN(x) || Number.isNaN(expected)) return false;
    return Math.abs(x - expected) <= (Number(payload.tolerance) || 0) + 1e-12;
  }
  const accepted = [payload.answer, ...(payload.accept || [])].map(normalizeAnswer);
  return accepted.includes(given);
}

// ---- détail propre à l'erreur commise (voir docs/SPEC.md §4)

/**
 * QCM : feedback du premier mauvais choix sélectionné (indice croissant) ; sinon, en réponse
 * multiple, feedback de la première bonne réponse oubliée. null si rien à dire.
 */
export function mcqDetail(selected, answer, feedback = []) {
  const sel = [...selected].sort((a, b) => a - b), ans = new Set(answer);
  const fb = Array.isArray(feedback) ? feedback : [];
  const wrong = sel.find((i) => !ans.has(i));
  if (wrong != null) return fb[wrong] || null;
  const missing = [...ans].sort((a, b) => a - b).find((i) => !sel.includes(i));
  return missing != null ? fb[missing] || null : null;
}

/**
 * Grille : « Coché(s) à tort : … · Oublié(s) : … » avec les étiquettes affichées.
 * `order` (facultatif) fixe l'ordre d'énumération des cases (ordre d'affichage).
 */
export function gridDetail(checked, answer, labels = {}, order = null) {
  const c = new Set(checked), a = new Set(answer);
  const ids = order || [...new Set([...checked, ...answer])];
  const lab = (id) => (labels && labels[id]) || id;
  const extra = ids.filter((id) => c.has(id) && !a.has(id)).map(lab);
  const missing = ids.filter((id) => a.has(id) && !c.has(id)).map(lab);
  if (!extra.length && !missing.length) return null;
  const parts = [];
  if (extra.length) parts.push(`Coché(s) à tort : ${extra.join(', ')}`);
  if (missing.length) parts.push(`Oublié(s) : ${missing.join(', ')}`);
  return parts.join(' · ');
}

/** Ordre : première étape mal placée. */
export function orderDetail(chosen, steps) {
  const k = chosen.findIndex((v, i) => v !== i);
  if (k < 0 || !steps[k]) return null;
  return `L'étape n°${k + 1} devait être : ${steps[k]}`;
}
