// dates.js — utilitaires de dates au format 'YYYY-MM-DD' (jours entiers, sans fuseau horaire)

const pad = (n) => String(n).padStart(2, '0');

/** Date du jour (heure locale) au format YYYY-MM-DD. */
export function todayStr(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 'YYYY-MM-DD' → millisecondes UTC à minuit. */
export function parseDay(s) {
  const [y, m, d] = String(s).split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

/** millisecondes UTC → 'YYYY-MM-DD'. */
export function formatDay(ms) {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** Ajoute n jours (n peut être négatif). */
export function addDays(day, n) {
  return formatDay(parseDay(day) + n * 86400000);
}

/** Nombre de jours de a vers b (positif si b est après a). */
export function diffDays(a, b) {
  return Math.round((parseDay(b) - parseDay(a)) / 86400000);
}

export function isValidDay(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(parseDay(s));
}
