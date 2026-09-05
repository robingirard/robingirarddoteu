// bilan.js — bilan pour le parent : construction (pure), texte lisible, encodage en lien (voir docs/SPEC.md §9)
import { isDue, isMastered, isNew } from './scheduler.js';
import { currentStreak, newSkillState, skillLevels } from './progression.js';
import { addDays, isValidDay } from './dates.js';
import { normalizeAnswer } from './answers.js';
import { findSkill } from './session.js';

export const BILAN_VERSION = 1;
const RECENT_MAX = 10;   // séances récentes conservées
const WEAK_MAX = 5;      // points faibles conservés
const ACC_SESSIONS = 3;  // séances prises en compte pour la réussite d'une compétence

const pct = (correct, total) => (total > 0 ? Math.round((100 * correct) / total) : null);
const sum = (arr, key) => arr.reduce((acc, s) => acc + (Number(s[key]) || 0), 0);

/** Construit le bilan (objet §9) à partir de la progression et du contenu. Fonction pure. */
export function buildBilan(progress, content, today) {
  const states = (progress && progress.items) || {};
  const history = (progress && progress.history) || [];
  const since = addDays(today, -6);
  const week = history.filter((s) => s.date >= since && s.date <= today);
  const skills = [];
  for (const unit of (content && content.units) || []) {
    for (const skill of unit.skills || []) {
      const st = { ...newSkillState(), ...(((progress && progress.skills) || {})[skill.id] || {}) };
      const ids = (skill.items || []).filter((id) => content.items && content.items[id]);
      let seen = 0, mastered = 0, due = 0;
      for (const id of ids) {
        const s = states[id];
        if (!isNew(s)) seen += 1;
        if (isMastered(s)) mastered += 1;
        if (isDue(s, today)) due += 1;
      }
      const last = history.filter((s) => s.kind === 'skill' && s.skill === skill.id).slice(-ACC_SESSIONS);
      skills.push({
        id: skill.id, level: st.level, progress: st.progress, sessions: st.sessions,
        acc: pct(sum(last, 'correct'), sum(last, 'total')),
        total: ids.length, seen, mastered, due,
      });
    }
  }
  const recent = history.slice(-RECENT_MAX).reverse()
    .map((s) => ({ date: s.date, skill: s.skill || null, correct: Number(s.correct) || 0, total: Number(s.total) || 0 }));
  const lapses = new Map();
  for (const [id, s] of Object.entries(states)) {
    const item = content && content.items && content.items[id];
    if (!item || !s || !(s.lapses > 0)) continue;
    for (const tag of item.tags || []) lapses.set(tag, (lapses.get(tag) || 0) + s.lapses);
  }
  const weak = [...lapses].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, WEAK_MAX)
    .map(([tag, n]) => ({ tag, lapses: n }));
  return {
    v: BILAN_VERSION,
    date: today,
    name: String((progress && progress.settings && progress.settings.name) || '').trim(),
    xp: Number(progress && progress.xp) || 0,
    streak: currentStreak(progress && progress.streak, today),
    sessions7d: week.length,
    accuracy7d: pct(sum(week, 'correct'), sum(week, 'total')),
    skills, recent, weak,
  };
}

// ---- encodage en lien (base64url, UTF-8), sans jamais évaluer le contenu reçu

export function encodeBilan(bilan) {
  const bytes = new TextEncoder().encode(JSON.stringify(bilan));
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const num = (x, fallback = 0) => (Number.isFinite(Number(x)) ? Number(x) : fallback);
const numOrNull = (x) => (x == null || x === '' ? null : num(x, null));

/** Vérifie et nettoie un objet bilan reçu (forme §9) ; lève une erreur lisible sinon. */
export function sanitizeBilan(obj) {
  const bad = () => new Error('Ce lien ne contient pas un bilan valide.');
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw bad();
  if (obj.v !== BILAN_VERSION || !isValidDay(obj.date)) throw bad();
  if (!Array.isArray(obj.skills) || !Array.isArray(obj.recent) || !Array.isArray(obj.weak)) throw bad();
  const str = (x, max = 60) => String(x ?? '').slice(0, max);
  return {
    v: BILAN_VERSION,
    date: obj.date,
    name: str(obj.name),
    xp: num(obj.xp), streak: num(obj.streak), sessions7d: num(obj.sessions7d), accuracy7d: numOrNull(obj.accuracy7d),
    skills: obj.skills.filter((s) => s && typeof s === 'object').map((s) => ({
      id: str(s.id), level: num(s.level), progress: num(s.progress), sessions: num(s.sessions), acc: numOrNull(s.acc),
      total: num(s.total), seen: num(s.seen), mastered: num(s.mastered), due: num(s.due),
    })),
    recent: obj.recent.filter((s) => s && typeof s === 'object' && isValidDay(s.date)).slice(0, RECENT_MAX)
      .map((s) => ({ date: s.date, skill: s.skill == null ? null : str(s.skill), correct: num(s.correct), total: num(s.total) })),
    weak: obj.weak.filter((w) => w && typeof w === 'object').slice(0, WEAK_MAX).map((w) => ({ tag: str(w.tag), lapses: num(w.lapses) })),
  };
}

export function decodeBilan(encoded) {
  const bad = () => new Error('Ce lien ne contient pas un bilan valide.');
  if (typeof encoded !== 'string' || !/^[A-Za-z0-9_-]{2,}$/.test(encoded)) throw bad();
  let b64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  b64 += '='.repeat((4 - (b64.length % 4)) % 4);
  let bin;
  try { bin = atob(b64); } catch { throw bad(); }
  let obj;
  try { obj = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)))); } catch { throw bad(); }
  return sanitizeBilan(obj);
}

/** Lien à partager : l'adresse de l'appli (fonctionne sous un sous-chemin, ex. GitHub Pages) + #/bilan?d=… */
export function bilanUrl(bilan, base = null) {
  const origin = base != null ? base : (typeof location !== 'undefined' ? location.origin + location.pathname : '');
  return `${origin}#/bilan?d=${encodeBilan(bilan)}`;
}

// ---- libellés lisibles

/**
 * Nom lisible d'un tag : titre de compétence, sinon libellé calculé au build (`tagLabels`), sinon
 * libellé trouvé dans un QCM déjà chargé, sinon tag embelli. La table du build est là parce que
 * l'application ne charge plus tous les exercices : le parcours ci-dessous ne voit que les unités
 * déjà ouvertes.
 */
export function tagLabel(tag, content) {
  const skill = content ? findSkill(content, tag) : null;
  if (skill) return skill.title;
  const connu = content && content.tagLabels && content.tagLabels[tag];
  if (connu) return connu;
  const wanted = normalizeAnswer(String(tag).replace(/-/g, ' '));
  for (const item of Object.values((content && content.items) || {})) {
    if (item.type !== 'mcq' || !item.payload || !(item.tags || []).includes(tag)) continue;
    const hit = (item.payload.choices || []).find((c) => typeof c === 'string' && normalizeAnswer(c) === wanted);
    if (hit) return hit;
  }
  const pretty = String(tag).replace(/[-_]+/g, ' ');
  return pretty.charAt(0).toUpperCase() + pretty.slice(1);
}

export function skillTitle(id, content) {
  if (id == null) return 'Révision';
  const skill = content ? findSkill(content, id) : null;
  return skill ? skill.title : id;
}

export function skillLevelsOf(id, content) {
  const skill = content ? findSkill(content, id) : null;
  return skillLevels(skill);
}

/** 'YYYY-MM-DD' → '4 septembre 2026' (repli sur la chaîne brute). */
export function formatDate(day) {
  if (!isValidDay(day)) return String(day || '');
  const [y, m, d] = day.split('-').map(Number);
  try {
    return new Date(y, m - 1, d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return day;
  }
}

/** Résumé lisible (texte brut) pour le partage. */
export function bilanText(bilan, content) {
  const who = bilan.name ? ` de ${bilan.name}` : '';
  const lines = [
    `Bilan Révise STI2D${who} — ${formatDate(bilan.date)}`,
    `Série : ${bilan.streak} jour${bilan.streak > 1 ? 's' : ''} · ${bilan.xp} XP au total`,
    `Cette semaine : ${bilan.sessions7d} séance${bilan.sessions7d > 1 ? 's' : ''}${bilan.accuracy7d != null ? `, ${bilan.accuracy7d} % de bonnes réponses` : ''}`,
    '',
    'Compétences :',
  ];
  for (const s of bilan.skills) {
    const started = s.sessions > 0 || s.seen > 0;
    const parts = [`niveau ${s.level}/${skillLevelsOf(s.id, content)}`];
    if (s.acc != null) parts.push(`réussite ${s.acc} %`);
    parts.push(`${s.seen}/${s.total} vus`, `${s.mastered} maîtrisé${s.mastered > 1 ? 's' : ''}`);
    lines.push(`- ${skillTitle(s.id, content)} : ${started ? parts.join(', ') : 'pas encore commencé'}`);
  }
  if (bilan.weak.length) {
    lines.push('', `Points faibles : ${bilan.weak.map((w) => `${tagLabel(w.tag, content)} (${w.lapses} erreur${w.lapses > 1 ? 's' : ''})`).join(', ')}`);
  }
  return lines.join('\n');
}
