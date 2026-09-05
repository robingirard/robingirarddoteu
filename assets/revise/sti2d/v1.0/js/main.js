// main.js — point d'entrée : routeur (#/…) et écrans (voir docs/SPEC.md §8)
import { h, clear } from './dom.js';
import * as store from './store.js';
import { todayStr } from './dates.js';
import { grade as gradeItem } from './scheduler.js';
import * as prog from './progression.js';
import * as sess from './session.js';
import { renderRich, renderLesson } from './render.js';
import { EXERCISES } from './exercises/index.js';
import { GRADE_LABELS } from './exercises/flashcard.js';
import * as bilan from './bilan.js';
import * as gl from './guided-logic.js';
import * as home from './home.js';
import * as figs from './figures.js';
import * as packs from './packs.js';
import * as profiles from './profiles.js';
import * as carte from './carte.js';
import * as anim from './anim.js';
import * as mech from './mech-anim.js';

window.__RS_STARTED = true; // signale à index.html que le module a bien démarré

const content = window.CONTENT;
const figures = (content && content.figures) || {};
figs.configure({ index: (content && content.figureIndex) || null }); // figures chargées à la demande
packs.configure({ content });   // énoncés et leçons chargés unité par unité (voir packs.js)
mech.configure({ animations: (content && content.animations) || {} }); // schémas cinématiques animés
// Plusieurs élèves peuvent se partager un navigateur : la progression vit sous un profil.
// migrate() reprend l'ancienne clé unique au premier lancement — la progression réelle n'est jamais perdue.
profiles.migrate(todayStr());
store.use(profiles.current());
let progress = store.load();
function uiStorage() {
  try { return globalThis.localStorage || null; } catch { return null; }
}
let ui = home.loadUiState(uiStorage()); // sections de l'accueil repliées ou non
let session = null;      // séance en cours (perdue si la page est rechargée)
let lastSummary = null;  // bilan de la dernière séance terminée

// ---------------------------------------------------------------- routeur
function parseHash() {
  const raw = (location.hash || '#/').slice(1);
  const [pathStr, queryStr = ''] = raw.split('?');
  return { path: pathStr.split('/').filter(Boolean), query: new URLSearchParams(queryStr) };
}

function navigate(hash) {
  if (location.hash === hash) route(); else location.hash = hash;
}

function route() {
  const root = document.getElementById('app');
  clear(root);
  window.scrollTo(0, 0);
  if (!content || !Array.isArray(content.units)) {
    root.append(h('p', { class: 'error' }, 'Contenu introuvable : le fichier content.js est manquant ou invalide.'));
    return;
  }
  const { path, query } = parseHash();
  const [screen, arg] = path;
  // Les écrans d'une compétence ont besoin de son unité : on l'attend plutôt que d'afficher un
  // écran à moitié vide (les autres écrans se contentent de l'index).
  if ((screen === 'skill' || screen === 'session') && arg) {
    const unite = packs.unitOf(arg);
    if (unite && !packs.isLoaded(unite)) {
      root.append(topbar({ back: '#/', title: '' }), h('p', { class: 'muted' }, 'Chargement du contenu…'));
      packs.load(unite).then(() => route(), (err) => renderContentError(root, err));
      return;
    }
  }
  try {
    switch (screen) {
      case undefined: renderHome(root); break;
      case 'skill': renderSkill(root, arg); break;
      case 'session': renderSessionEntry(root, arg, query); break;
      case 'review': renderReviewEntry(root, query); break;
      case 'summary': renderSummary(root); break;
      case 'progress': renderProgress(root); break;
      case 'bilan': renderBilan(root, query); break;
      case 'settings': renderSettings(root); break;
      case 'profils': renderProfils(root); break;
      case 'carte': renderCarteRecue(root, query); break;
      default: renderHome(root);
    }
    figs.hydrate(root);
  } catch (err) {
    console.error(err);
    root.append(h('p', { class: 'error' }, `Erreur : ${err.message}`), h('a', { class: 'btn', href: '#/' }, 'Accueil'));
  }
}

// ---------------------------------------------------------------- signalement
/**
 * Lien de signalement portant assez de contexte pour être exploitable. Sans l'identifiant de
 * l'exercice et les deux versions, « il y a une erreur dans un exercice de maths » ne se retrouve
 * pas. Un mailto plutôt qu'un formulaire : rien à héberger, rien qui parte à un tiers.
 */
function lienSignalement(sujet, lignes) {
  const p = content.pack || {};
  const corps = [
    '', '', '---', 'Envoyé depuis ' + (content.title || 'Révise') + ' — merci de garder les lignes ci-dessous.',
    ...lignes,
    `Paquet : ${p.id || '?'} ${p.version || '?'} · moteur ${p.moteur || '?'} · contenu du ${(content.generatedAt || '').slice(0, 10)}`,
  ];
  return `mailto:${p.contact || ''}?subject=${encodeURIComponent(`[${p.id || 'revise'}] ${sujet}`)}`
    + `&body=${encodeURIComponent(corps.join('\n'))}`;
}

/** Bouton discret « quelque chose ne va pas ici », posé là où l'élève s'en aperçoit. */
function boutonSignaler(sujet, lignes, libelle = '⚑ Signaler une erreur') {
  return h('a', { class: 'signaler', href: lienSignalement(sujet, lignes) }, libelle);
}

/** Le contenu d'une unité n'a pas pu être chargé (hors ligne au premier passage, fichier absent). */
function renderContentError(root, err) {
  clear(root);
  root.append(
    topbar({ back: '#/', title: 'Contenu indisponible' }),
    h('p', { class: 'error' }, err && err.message ? err.message : 'Contenu introuvable.'),
    h('p', { class: 'muted' }, 'Cette partie n\'a pas encore été ouverte sur cet appareil : reconnecte-toi une fois pour la télécharger.'),
    h('a', { class: 'btn', href: '#/' }, 'Accueil'));
}

// ---------------------------------------------------------------- composants
function topbar({ back = null, title = '', droite = null } = {}) {
  return h('header', { class: 'topbar' },
    back ? h('a', { class: 'icon-btn', href: back, 'aria-label': 'Retour' }, '←') : null,
    h('h1', {}, title),
    droite);
}

/** Pastille du profil courant : qui travaille, et de quoi changer d'élève en un geste. */
function pastilleProfil() {
  const moi = profiles.currentProfile();
  return h('a', { class: 'profil-chip', href: '#/profils', 'aria-label': 'Changer de profil' },
    h('span', { class: 'profil-emoji' }, moi ? moi.emoji || '🙂' : '👤'),
    h('span', { class: 'profil-nom' }, moi ? moi.nom : 'Profil'));
}

function bottomNav(active) {
  const link = (id, href, label) => h('a', { class: `nav-link${active === id ? ' active' : ''}`, href }, label);
  return h('nav', { class: 'bottom-nav' },
    link('home', '#/', '🏠 Accueil'), link('progress', '#/progress', '📈 Progrès'), link('settings', '#/settings', '⚙️ Réglages'));
}

function bar(fraction, cls = '') {
  const pct = Math.max(0, Math.min(100, Math.round(100 * fraction)));
  return h('div', { class: `bar ${cls}`, role: 'progressbar', 'aria-valuenow': pct, 'aria-valuemin': 0, 'aria-valuemax': 100 },
    h('div', { class: 'bar-fill', style: `width:${pct}%` }));
}

/** Pastilles de niveau : ● atteint, ◐ en cours, ○ à faire. */
function levelRing(state, levels) {
  const st = { ...prog.newSkillState(), ...(state || {}) };
  const dots = [];
  for (let i = 0; i < levels; i++) {
    const cls = i < st.level ? 'dot done' : i === st.level && st.progress > 0 ? 'dot half' : 'dot';
    dots.push(h('span', { class: cls }));
  }
  return h('span', { class: 'ring', title: `Niveau ${st.level}/${levels}` }, ...dots, h('span', { class: 'ring-text' }, `${st.level}/${levels}`));
}

function prereqTitles(skill) {
  return (skill.prerequisites || []).map((id) => (sess.findSkill(content, id) || { title: id }).title).join(', ');
}

function plural(n, one, many) {
  return `${n} ${n > 1 ? many : one}`;
}

// ---------------------------------------------------------------- accueil
function renderHome(root) {
  const today = todayStr();
  const streak = prog.currentStreak(progress.streak, today);
  const xpToday = prog.xpOnDay(progress.history, today);
  const goal = progress.settings.dailyGoal || prog.DEFAULT_DAILY_GOAL;
  const dueCount = sess.countDue(content, progress, today);
  root.append(
    topbar({ title: content.title || 'Révise STI2D', droite: pastilleProfil() }),
    h('section', { class: 'stats' },
      h('div', { class: 'stat' }, h('span', { class: 'stat-value' }, `🔥 ${streak}`), h('span', { class: 'stat-label' }, plural(streak, 'jour de série', 'jours de série').replace(/^\d+ /, ''))),
      h('div', { class: 'stat stat-wide' },
        h('span', { class: 'stat-value' }, `⭐ ${xpToday} / ${goal} XP`),
        h('span', { class: 'stat-label' }, xpToday >= goal ? 'objectif du jour atteint !' : 'objectif du jour'),
        bar(xpToday / goal, 'bar-small'))),
    dueCount > 0
      ? h('a', { class: 'btn btn-primary btn-block', href: '#/review' }, `Réviser (${dueCount})`)
      : h('div', { class: 'btn btn-block btn-muted', 'aria-disabled': 'true' }, 'Rien à réviser aujourd\'hui 🎉'),
    ...renderSubjectTree(today),
    renderAnnales(),
    bottomNav('home'),
  );
}

// ---------------------------------------------------------------- arbre par matière
function renderSubjectTree(today) {
  const groups = home.groupUnitsBySubject(content);
  if (groups.length === 0) return [];
  const sections = groups.map((g) => renderSubjectSection(g, today));
  const chips = groups.length > 1
    ? h('nav', { class: 'subject-chips', 'aria-label': 'Matières' }, ...groups.map((g) => h('button', {
      class: 'subject-chip', type: 'button', onClick: () => {
        const section = document.getElementById(`subject-${g.id}`);
        if (!section) return;
        if (!home.isExpanded(ui, g.id)) setSectionExpanded(section, g.id, true);
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      },
    }, `${g.icon} ${g.label}`)))
    : null;
  return [chips, ...sections];
}

function setSectionExpanded(section, key, expanded) {
  ui = home.toggleSection(ui, key, expanded);
  home.saveUiState(ui, uiStorage());
  const head = section.querySelector('.subject-head');
  const body = section.querySelector('.subject-body');
  if (head) head.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  if (body) body.hidden = !expanded;
}

function renderSubjectSection(group, today) {
  const expanded = home.isExpanded(ui, group.id);
  const reached = home.reachedCount(group, progress);
  const bodyId = `subject-body-${group.id}`;
  const section = h('section', { class: 'subject', id: `subject-${group.id}` });
  const head = h('button', {
    class: 'subject-head', type: 'button', 'aria-expanded': expanded ? 'true' : 'false', 'aria-controls': bodyId,
    onClick: () => setSectionExpanded(section, group.id, !home.isExpanded(ui, group.id)),
  },
  h('span', { class: 'subject-icon' }, group.icon),
  h('span', { class: 'subject-text' },
    h('span', { class: 'subject-title' }, group.label),
    h('span', { class: 'subject-summary' }, `${reached} / ${plural(group.skillCount, 'compétence', 'compétences')} au niveau ≥ 1`)),
  h('span', { class: 'subject-chevron', 'aria-hidden': 'true' }, '▾'));
  const body = h('div', { class: 'subject-body', id: bodyId, hidden: !expanded }, ...group.units.map((unit) => renderUnit(unit, today)));
  section.append(head, body);
  return section;
}

// ---------------------------------------------------------------- annales (SPEC §10)
function renderAnnales() {
  const list = Array.isArray(content.annales) ? content.annales : [];
  if (list.length === 0) return null;
  return h('section', { class: 'unit annales' },
    h('h2', {}, '🎓 Annales'),
    h('p', { class: 'muted' }, 'Des sujets officiels du bac, débloqués au fil de la progression.'),
    h('div', { class: 'skills' }, ...list.map(renderAnnaleCard)));
}

function renderAnnaleCard(a) {
  const { locked, missing } = gl.annaleStatus(a, progress);
  const meta = [a.session, a.epreuve, a.partie].filter(Boolean).join(' · ');
  const guidedItem = a.guided ? content.items[a.guided] : null;
  const link = (href, label, primary = false) => h('a', { class: `btn btn-small${primary ? ' btn-primary' : ''}`, href, target: '_blank', rel: 'noopener' }, label);
  const actions = locked
    ? h('p', { class: 'muted small annale-locked' }, `🔒 Requiert : ${missing.map((m) => `${bilan.skillTitle(m.skill, content)} niveau ${m.level || 1}`).join(', ')}`)
    : h('div', { class: 'annale-actions' },
      a.url ? link(a.url, 'Sujet') : null,
      a.corrige ? link(a.corrige, 'Corrigé') : null,
      guidedItem ? h('a', { class: 'btn btn-small btn-primary', href: `#/session/${guidedItem.skill}?item=${encodeURIComponent(guidedItem.id)}&seed=1` }, 'S\'entraîner') : null);
  return h('div', { class: `annale${locked ? ' locked' : ''}` },
    h('div', { class: 'annale-title' }, a.titre || a.id),
    meta ? h('div', { class: 'muted small' }, meta) : null,
    (a.themes || []).length ? h('div', { class: 'chips' }, ...a.themes.map((th) => h('span', { class: 'chip' }, th))) : null,
    actions);
}

function renderUnit(unit, today) {
  return h('section', { class: 'unit' },
    h('h2', {}, unit.title),
    unit.description ? h('p', { class: 'muted', html: renderRich(unit.description, figures) }) : null,
    h('div', { class: 'skills' }, ...(unit.skills || []).map((skill) => renderSkillCard(skill, today))));
}

function renderSkillCard(skill, today) {
  const st = progress.skills[skill.id];
  const unlocked = prog.isUnlocked(skill, progress);
  const levels = prog.skillLevels(skill);
  const counts = sess.skillCounts(content, progress, skill.id, today);
  const state = !unlocked ? 'locked' : prog.isCompleted(skill, progress) ? 'done' : 'open';
  const meta = unlocked
    ? `${plural(counts.due, 'à revoir', 'à revoir')} · ${plural(counts.fresh, 'nouveau', 'nouveaux')} · ${counts.mastered}/${counts.total} maîtrisés`
    : `🔒 Termine d'abord : ${prereqTitles(skill)}`;
  return h('a', { class: `skill skill-${state}`, href: `#/skill/${skill.id}` },
    h('span', { class: 'skill-icon' }, skill.icon || '📘'),
    h('span', { class: 'skill-body' }, h('span', { class: 'skill-title' }, skill.title), h('span', { class: 'skill-meta' }, meta)),
    levelRing(st, levels));
}

// ---------------------------------------------------------------- compétence
function renderSkill(root, skillId) {
  const skill = sess.findSkill(content, skillId);
  if (!skill) return renderNotFound(root);
  const unit = sess.findUnit(content, skillId);
  const today = todayStr();
  const st = { ...prog.newSkillState(), ...(progress.skills[skillId] || {}) };
  const levels = prog.skillLevels(skill);
  const unlocked = prog.isUnlocked(skill, progress);
  const counts = sess.skillCounts(content, progress, skillId, today);
  const lesson = packs.lessonOf(skillId);
  const stat = (label, value) => h('div', { class: 'count' }, h('span', { class: 'count-value' }, value), h('span', { class: 'count-label' }, label));

  root.append(
    topbar({ back: '#/', title: unit ? unit.title : '' }),
    h('section', { class: 'skill-head' },
      h('div', { class: 'skill-icon big' }, skill.icon || '📘'),
      h('h2', {}, skill.title),
      skill.description ? h('p', { class: 'muted', html: renderRich(skill.description, figures) }) : null,
      levelRing(st, levels),
      st.level < levels ? bar(st.progress, 'bar-small') : h('p', { class: 'muted' }, 'Compétence terminée ✔'),
    ),
    h('section', { class: 'counts' },
      stat('nouveaux', counts.fresh), stat('à revoir', counts.due), stat('maîtrisés', counts.mastered), stat('exercices', counts.total)),
    lesson
      ? h('details', { class: 'lesson', open: st.sessions === 0 }, h('summary', {}, '📖 Leçon'),
          h('div', { class: 'lesson-tools' },
            h('button', { class: 'btn btn-small lesson-anim-btn', type: 'button', hidden: true, 'aria-pressed': 'false' }, anim.lessonButtonLabel(false)),
            boutonSignaler(`leçon ${skillId}`, [`Leçon : ${skillId} — ${skill.title}`, 'Ce qui ne va pas : '])),
          h('div', { class: 'lesson-body', html: renderLesson(lesson, figures) }))
      : null,
    renderCompletsCard(skill, st) || document.createDocumentFragment(), // null → « null » affiché sinon
    !unlocked
      ? h('p', { class: 'locked-msg' }, `🔒 Cette compétence se débloque quand « ${prereqTitles(skill)} » atteint le niveau 1.`)
      : counts.total === 0
        ? h('p', { class: 'muted' }, 'Aucun exercice n\'est encore disponible pour cette compétence.')
        : h('a', { class: 'btn btn-primary btn-block', href: `#/session/${skill.id}` }, st.sessions === 0 ? 'Commencer' : 'Nouvelle séance'),
    bottomNav(null),
  );
}

/** Carte « Exercices complets » : les items guided de la compétence, lançables au niveau ≥ 2. */
function renderCompletsCard(skill, st) {
  const guided = sess.guidedItems(content, skill);
  if (guided.length === 0) return null;
  const open = gl.guidedUnlocked(st, progress.settings);
  return h('section', { class: 'complets' },
    h('h2', {}, '🏁 Exercices complets'),
    h('p', { class: 'muted small' }, 'Un problème en plusieurs étapes, comme en fin de chapitre. Il compte pour une séance.'),
    ...guided.map((g) => h('div', { class: 'complet' },
      h('span', { class: 'complet-title' }, (g.payload && g.payload.title) || g.id),
      open
        ? h('a', { class: 'btn btn-small btn-primary', href: `#/session/${skill.id}?item=${encodeURIComponent(g.id)}&seed=1` }, 'Lancer')
        : h('span', { class: 'muted small complet-locked' }, `🔒 Atteins le niveau ${gl.GUIDED_MIN_LEVEL} pour débloquer`))));
}

function renderNotFound(root) {
  root.append(topbar({ back: '#/', title: 'Introuvable' }), h('p', { class: 'muted' }, 'Cette page n\'existe pas.'));
}

// ---------------------------------------------------------------- séance
function renderSessionEntry(root, skillId, query) {
  const skill = sess.findSkill(content, skillId);
  if (!skill) return renderNotFound(root);
  if (!prog.isUnlocked(skill, progress)) return navigate(`#/skill/${skillId}`);
  const forced = query.has('item') || query.has('seed');
  const reuse = !forced && session && session.kind === 'skill' && session.skillId === skillId && !sess.isFinished(session);
  if (!reuse) {
    const seed = query.get('seed');
    const rng = seed != null ? sess.mulberry32(Number(seed)) : Math.random;
    session = sess.buildSkillSession(content, progress, skillId, { today: todayStr(), rng, forceItemId: query.get('item') });
    prefetchSessionFigures(session);
  }
  if (session.queue.length === 0) {
    session = null;
    root.append(topbar({ back: `#/skill/${skillId}`, title: skill.title }), h('p', { class: 'muted' }, 'Aucun exercice disponible.'));
    return;
  }
  renderSessionScreen(root);
}

function renderReviewEntry(root, query) {
  const reuse = !query.has('seed') && session && session.kind === 'review' && !sess.isFinished(session);
  if (!reuse) {
    const seed = query.get('seed');
    const rng = seed != null ? sess.mulberry32(Number(seed)) : Math.random;
    session = sess.buildReviewSession(content, progress, { today: todayStr(), rng });
    prefetchSessionFigures(session);
  }
  if (session.queue.length === 0) {
    session = null;
    root.append(topbar({ back: '#/', title: 'Révision' }), h('p', { class: 'muted' }, 'Rien à réviser aujourd\'hui 🎉'), bottomNav('home'));
    return;
  }
  renderSessionScreen(root);
}

/** Précharge les figures des exercices de la séance (le service worker les garde ensuite hors-ligne). */
function prefetchSessionFigures(s) {
  if (!s || !Array.isArray(s.queue)) return;
  const ids = [];
  for (const q of s.queue) {
    const it = content.items[q && q.id ? q.id : q];
    if (it && it.payload) ids.push(...figs.figureIdsOf(it.payload));   // fiche seule : rien à précharger
  }
  figs.prefetch(ids);
}

function renderSessionScreen(root) {
  clear(root);
  const itemId = sess.currentItemId(session);
  // Une séance de révision traverse plusieurs unités : on attend l'énoncé de l'exercice affiché,
  // et on va chercher les suivants pendant qu'il répond.
  if (itemId && !packs.hasPayload(itemId)) {
    root.append(h('p', { class: 'muted' }, 'Chargement de l\'exercice…'));
    packs.loadForItems([itemId]).then(() => route(), (err) => renderContentError(root, err));
    return;
  }
  packs.loadForItems(session.queue.slice(session.index + 1, session.index + 4)).catch(() => {});
  const item = content.items[itemId];
  const total = session.queue.length;
  const skill = session.skillId ? sess.findSkill(content, session.skillId) : null;
  const quit = h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Quitter la séance', onClick: () => {
    if (confirm('Quitter la séance ? Ce qui a déjà été répondu est conservé, mais la séance ne comptera pas.')) {
      session = null;
      navigate('#/');
    }
  } }, '✕');
  const exerciseBox = h('div', { class: `exercise exercise-${item.type}`, 'data-item': item.id });
  root.append(
    h('header', { class: 'topbar session-top' }, quit, bar(session.index / total, 'session-bar'), h('span', { class: 'counter' }, `${session.index + 1}/${total}`)),
    h('main', { class: 'session-main' },
      skill ? h('p', { class: 'session-skill muted' }, `${skill.icon || ''} ${skill.title}`) : h('p', { class: 'session-skill muted' }, '🔁 Révision'),
      exerciseBox,
      h('p', { class: 'signaler-ligne' }, boutonSignaler(`exercice ${item.id}`, [
        `Exercice : ${item.id} (${item.type}, niveau ${item.level || 1})`,
        `Compétence : ${item.skill}${skill ? ' — ' + skill.title : ''}`,
        'Ce qui ne va pas : ',
      ]))),
  );
  const mod = EXERCISES[item.type];
  if (!mod) {
    exerciseBox.append(
      h('p', { class: 'error' }, `Type d'exercice inconnu : ${item.type}`),
      h('button', { class: 'btn', type: 'button', onClick: () => { session = sess.answer(session, { correct: true }).session; next(root); } }, 'Passer'));
    return;
  }
  let answered = false;
  mod.mount(exerciseBox, item, {
    figures,
    rng: Math.random,
    exercises: EXERCISES, // pour les exercices complets, qui montent leurs étapes
    onAnswer: (res) => {
      if (answered) return;
      answered = true;
      handleAnswer(root, item, res);
    },
  });
  figs.hydrate(root);
}

function handleAnswer(root, item, res) {
  const today = todayStr();
  const { session: next, schedulerGrade } = sess.answer(session, res);
  session = next;
  let nextInfo = '';
  if (schedulerGrade) {
    const st = gradeItem(progress.items[item.id], schedulerGrade, today);
    progress.items[item.id] = st;
    store.save(progress);
    nextInfo = st.interval === 0 ? 'On le revoit dans cette séance.' : `Prochaine révision dans ${plural(st.interval, 'jour', 'jours')}.`;
  } else if (!res.correct) {
    nextInfo = 'On le revoit dans cette séance.';
  }
  const isCard = item.type === 'flashcard';
  const isGuided = item.type === 'guided';
  if (isGuided) nextInfo = ''; // le planificateur ne s'applique pas aux exercices complets
  const cls = isCard ? 'feedback neutral' : res.correct ? 'feedback ok' : isGuided ? 'feedback neutral' : 'feedback ko';
  const title = isCard ? `Carte notée « ${GRADE_LABELS[res.grade] || res.grade} »`
    : isGuided ? (res.correct ? 'Exercice complet réussi !' : 'Exercice complet terminé')
      : res.correct ? 'Bravo, c\'est juste !' : 'Pas tout à fait…';
  const explanation = isGuided ? null : item.payload.explanation;
  const finished = sess.isFinished(session);
  const detail = isGuided ? (res.detail || null) : (!res.correct && res.detail ? res.detail : null); // détail propre à l'erreur (SPEC §4)
  const panel = h('div', { class: cls, role: 'status' },
    h('div', { class: 'feedback-title' }, title),
    detail ? h('div', { class: 'feedback-detail', html: renderRich(detail, figures) }) : null,
    explanation ? h('div', { class: 'feedback-expl', html: renderRich(explanation, figures) }) : null,
    nextInfo ? h('div', { class: 'feedback-next' }, nextInfo) : null,
    h('button', { class: 'btn btn-block btn-continue', type: 'button', onClick: () => nextStep(root) }, finished ? 'Voir le bilan' : 'Continuer'));
  root.append(panel);
  panel.querySelector('button').focus();
}

function nextStep(root) {
  if (sess.isFinished(session)) finishSession(); else renderSessionScreen(root);
}

function finishSession() {
  const today = todayStr();
  const result = sess.summary(session);
  const bonus = session.xpBonus || 0; // XP des étapes d'exercices complets
  let xp = prog.sessionXp(result) + bonus, passed = null, leveledUp = false, skill = null, skillState = null;
  if (session.kind === 'skill') {
    skill = sess.findSkill(content, session.skillId);
    const r = prog.applySession(progress.skills[session.skillId], skill, result, bonus);
    progress.skills[session.skillId] = r.state;
    ({ xp, passed, leveledUp } = r);
    skillState = r.state;
  }
  progress.xp += xp;
  progress.streak = prog.updateStreak(progress.streak, today);
  progress.history.push({ date: today, kind: session.kind, skill: session.skillId, correct: result.correct, total: result.total, xp });
  store.save(progress);
  profiles.touch(profiles.current(), today);   // « dernière séance » de la liste des profils
  lastSummary = { kind: session.kind, skill, skillState, result, xp, passed, leveledUp };
  session = null;
  navigate('#/summary');
}


// ---------------------------------------------------------------- bilan
function renderSummary(root) {
  if (!lastSummary) return navigate('#/');
  const { kind, skill, skillState, result, xp, passed, leveledUp } = lastSummary;
  const pct = Math.round(100 * result.accuracy);
  const levels = skill ? prog.skillLevels(skill) : 0;
  root.append(
    topbar({ title: 'Bilan de la séance' }),
    h('section', { class: 'summary' },
      h('div', { class: 'summary-emoji' }, pct >= 80 ? '🎉' : pct >= 50 ? '💪' : '📚'),
      h('h2', {}, kind === 'review' ? 'Révision terminée' : `${skill.title}`),
      h('p', { class: 'summary-score' }, `${result.correct} / ${result.total} du premier coup (${pct} %)`),
      h('p', { class: 'summary-xp' }, `+${xp} XP`),
      skill
        ? h('div', { class: 'summary-level' },
          leveledUp ? h('p', { class: 'ok-text' }, `Niveau ${skillState.level} atteint !`) : null,
          passed === false ? h('p', { class: 'muted' }, 'Il faut au moins 80 % de bonnes réponses pour progresser de niveau.') : null,
          levelRing(skillState, levels),
          skillState.level < levels ? bar(skillState.progress, 'bar-small') : null)
        : null,
      h('div', { class: 'actions' },
        skill && prog.isUnlocked(skill, progress) ? h('a', { class: 'btn btn-primary btn-block', href: `#/session/${skill.id}` }, 'Encore une séance') : null,
        h('a', { class: 'btn btn-block', href: '#/' }, 'Retour à l\'accueil'))),
  );
}

// ---------------------------------------------------------------- progrès
function renderProgress(root) {
  const today = todayStr();
  const rows = [];
  const groups = home.groupUnitsBySubject(content);
  for (const group of groups) {
    if (groups.length > 1) {
      rows.push(h('tr', { class: 'subhead' }, h('th', { colspan: 6, scope: 'colgroup' }, `${group.icon} ${group.label}`)));
    }
    for (const unit of group.units) {
      for (const skill of unit.skills || []) {
        const st = { ...prog.newSkillState(), ...(progress.skills[skill.id] || {}) };
        const c = sess.skillCounts(content, progress, skill.id, today);
        const unlocked = prog.isUnlocked(skill, progress);
        rows.push(h('tr', { class: unlocked ? '' : 'locked' },
          h('td', {}, h('a', { href: `#/skill/${skill.id}` }, `${skill.icon || ''} ${skill.title}`)),
          h('td', {}, unlocked ? `${st.level}/${prog.skillLevels(skill)}` : '🔒'),
          h('td', {}, c.fresh), h('td', {}, c.due), h('td', {}, c.mastered), h('td', {}, c.total)));
      }
    }
  }
  const sessions = progress.history.length;
  root.append(
    topbar({ back: '#/', title: 'Progrès' }),
    bilanCard(today),
    h('section', { class: 'stats' },
      h('div', { class: 'stat' }, h('span', { class: 'stat-value' }, `⭐ ${progress.xp}`), h('span', { class: 'stat-label' }, 'XP au total')),
      h('div', { class: 'stat' }, h('span', { class: 'stat-value' }, `📚 ${sessions}`), h('span', { class: 'stat-label' }, plural(sessions, 'séance', 'séances').replace(/^\d+ /, ''))),
      h('div', { class: 'stat' }, h('span', { class: 'stat-value' }, `🔥 ${prog.currentStreak(progress.streak, today)}`), h('span', { class: 'stat-label' }, 'jours de série'))),
    h('div', { class: 'table-wrap' }, h('table', { class: 'progress-table' },
      h('thead', {}, h('tr', {}, h('th', {}, 'Compétence'), h('th', { title: 'Niveau' }, 'Niv.'), h('th', { title: 'Nouveaux' }, 'Nouv.'), h('th', { title: 'À revoir' }, 'Dus'), h('th', { title: 'Maîtrisés' }, 'Maîtr.'), h('th', {}, 'Total'))),
      h('tbody', {}, ...rows))),
    h('p', { class: 'muted small' }, 'Un exercice est « maîtrisé » quand sa prochaine révision est prévue dans 21 jours ou plus.'),
    bottomNav('progress'),
  );
}

// ---------------------------------------------------------------- bilan pour le parent (SPEC §9)
function copyButton(getText) {
  const btn = h('button', { class: 'btn', type: 'button', onClick: async () => {
    try {
      await navigator.clipboard.writeText(getText());
      btn.textContent = 'Copié ✔';
    } catch {
      btn.textContent = 'Copie impossible : sélectionne le texte';
    }
  } }, 'Copier');
  return btn;
}

/** Carte « Bilan » de l'écran Progrès : résumé + partage. */
function bilanCard(today) {
  const b = bilan.buildBilan(progress, content, today);
  const text = bilan.bilanText(b, content);
  const url = bilan.bilanUrl(b);
  const title = `Bilan Révise STI2D${b.name ? ' de ' + b.name : ''}`;
  const full = `${text}\n\nBilan détaillé : ${url}`;
  const area = h('textarea', { class: 'json-area', readonly: true, rows: 7, 'aria-label': 'Bilan à partager' });
  area.value = full;
  const mail = h('a', { class: 'btn', href: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(full)}` }, 'Envoyer par e-mail');
  const panel = h('div', { class: 'share-panel', hidden: true },
    h('p', { class: 'muted small' }, 'Copie ce texte (ou envoie-le par e-mail) : le lien ouvre le bilan détaillé.'),
    area, h('div', { class: 'row-right' }, copyButton(() => area.value), mail));
  const shareBtn = h('button', { class: 'btn btn-primary', type: 'button', onClick: async () => {
    if (navigator.share) {
      try { await navigator.share({ title, text, url }); return; } catch (err) { if (err && err.name === 'AbortError') return; }
    }
    panel.hidden = !panel.hidden;
  } }, 'Partager le bilan');
  const weak = b.weak.length ? b.weak.map((w) => bilan.tagLabel(w.tag, content)).join(', ') : 'aucun pour l\'instant';
  return h('section', { class: 'bilan-card' },
    h('h2', {}, `📋 Bilan${b.name ? ' de ' + b.name : ''}`),
    h('ul', { class: 'bilan-lines' },
      h('li', {}, `🔥 Série : ${plural(b.streak, 'jour', 'jours')} · ⭐ ${b.xp} XP`),
      h('li', {}, `📅 Cette semaine : ${plural(b.sessions7d, 'séance', 'séances')}${b.accuracy7d != null ? ` · ${b.accuracy7d} % de bonnes réponses` : ''}`),
      h('li', {}, `🎯 Points faibles : ${weak}`)),
    h('div', { class: 'bilan-actions' }, shareBtn, h('a', { class: 'btn', href: '#/bilan' }, 'Voir le bilan complet')),
    panel);
}

/** Écran bilan : le sien (#/bilan) ou un bilan reçu (#/bilan?d=…), en lecture seule. */
function renderBilan(root, query) {
  const today = todayStr();
  let b = null, received = false, error = null;
  if (query.has('d')) {
    received = true;
    try { b = bilan.decodeBilan(query.get('d')); } catch (err) { error = err.message; }
  } else {
    b = bilan.buildBilan(progress, content, today);
  }
  if (error) {
    root.append(topbar({ back: '#/', title: 'Bilan' }), h('p', { class: 'error' }, error), bottomNav(null));
    return;
  }
  const rows = [];
  for (const group of home.groupSkillRows(b.skills, content)) {
    if (group.header) rows.push(h('tr', { class: 'subhead' }, h('th', { colspan: 7, scope: 'colgroup' }, `${group.icon} ${group.label}`)));
    for (const s of group.rows) {
      rows.push(h('tr', {},
        h('td', {}, bilan.skillTitle(s.id, content)),
        h('td', {}, `${s.level}/${bilan.skillLevelsOf(s.id, content)}`),
        h('td', {}, s.sessions),
        h('td', {}, s.acc != null ? `${s.acc} %` : '—'),
        h('td', {}, `${s.seen}/${s.total}`),
        h('td', {}, s.mastered),
        h('td', {}, s.due)));
    }
  }
  const recent = b.recent.length
    ? h('ul', { class: 'bilan-recent' }, ...b.recent.map((s) => h('li', {}, `${bilan.formatDate(s.date)} · ${bilan.skillTitle(s.skill, content)} : ${s.correct}/${s.total}`)))
    : h('p', { class: 'muted' }, 'Aucune séance pour l\'instant.');
  const weak = b.weak.length
    ? h('ul', { class: 'bilan-weak' }, ...b.weak.map((w) => h('li', {}, `${bilan.tagLabel(w.tag, content)} — ${plural(w.lapses, 'erreur', 'erreurs')}`)))
    : h('p', { class: 'muted' }, 'Aucun point faible repéré pour l\'instant.');
  const parts = [
    topbar({ back: received ? '#/' : '#/progress', title: `Bilan${b.name ? ' de ' + b.name : ''}` }),
    received ? h('div', { class: 'received-banner' }, `📨 Bilan reçu${b.name ? ' de ' + b.name : ''}, daté du ${bilan.formatDate(b.date)}.`) : null,
    h('section', { class: 'stats' },
      h('div', { class: 'stat' }, h('span', { class: 'stat-value' }, `⭐ ${b.xp}`), h('span', { class: 'stat-label' }, 'XP au total')),
      h('div', { class: 'stat' }, h('span', { class: 'stat-value' }, `🔥 ${b.streak}`), h('span', { class: 'stat-label' }, 'jours de série')),
      h('div', { class: 'stat' }, h('span', { class: 'stat-value' }, `📅 ${b.sessions7d}`), h('span', { class: 'stat-label' }, b.accuracy7d != null ? `séances / 7 j · ${b.accuracy7d} %` : 'séances / 7 j'))),
    h('h2', {}, 'Par compétence'),
    h('div', { class: 'table-wrap' }, h('table', { class: 'progress-table bilan-table' },
      h('thead', {}, h('tr', {}, h('th', {}, 'Compétence'), h('th', { title: 'Niveau' }, 'Niv.'), h('th', { title: 'Séances' }, 'Séances'),
        h('th', { title: 'Réussite sur les 3 dernières séances' }, 'Réussite'), h('th', { title: 'Exercices vus / total' }, 'Vus'), h('th', { title: 'Maîtrisés' }, 'Maîtr.'), h('th', { title: 'À revoir' }, 'Dus'))),
      h('tbody', {}, ...rows))),
    h('p', { class: 'muted small' }, 'Réussite : bonnes réponses du premier coup sur les 3 dernières séances. Maîtrisé : prochaine révision prévue dans 21 jours ou plus.'),
    h('h2', {}, 'Dernières séances'), recent,
    h('h2', {}, 'Points faibles'), weak,
    received ? null : h('p', { class: 'muted small' }, `Bilan du ${bilan.formatDate(b.date)}. Pour l'envoyer : Progrès → « Partager le bilan ».`),
    bottomNav(received ? null : 'progress'),
  ];
  root.append(...parts.filter(Boolean)); // Element.append(null) écrirait « null »
}

// ---------------------------------------------------------------- profils
/** Bascule sur un profil : la progression change, la séance en cours n'a plus de sens. */
function changerDeProfil(id) {
  profiles.setCurrent(id);
  store.use(id);
  progress = store.load();
  // Le bilan destiné au parent affiche « progress.settings.name » : avec des profils, c'est le nom
  // du profil qui fait foi, sinon un même appareil enverrait deux bilans au même prénom.
  const moi = profiles.currentProfile();
  if (moi && progress.settings.name !== moi.nom) {
    progress.settings.name = moi.nom;
    store.save(progress);
  }
  session = null;
  lastSummary = null;
  navigate('#/');
}

function renderProfils(root) {
  const liste = profiles.list();
  const courant = profiles.current();
  const msg = h('p', { class: 'muted small' });

  const nomInput = h('input', { class: 'text-input', type: 'text', maxlength: 40, placeholder: 'Prénom', 'aria-label': 'Prénom du nouveau profil' });
  const emojiInput = h('input', { class: 'text-input text-input-court', type: 'text', maxlength: 2, placeholder: '🙂', 'aria-label': 'Emoji du profil' });
  const creer = h('button', { class: 'btn btn-primary', type: 'button', onClick: () => {
    try {
      // Le tout premier profil hérite du travail déjà fait : sans profil, la progression vivait sous
      // l'ancienne clé, et la créer ne doit pas donner l'impression d'avoir tout perdu.
      const premier = profiles.list().length === 0;
      const dejaTravaille = premier && (progress.xp > 0 || Object.keys(progress.items || {}).length > 0);
      const p = profiles.create({ nom: nomInput.value, emoji: emojiInput.value });
      if (dejaTravaille) {
        store.use(p.id);
        store.save(progress);
      }
      changerDeProfil(p.id);
    } catch (err) {
      msg.textContent = err.message;
      msg.className = 'error small';
    }
  } }, 'Créer');

  const fichier = h('input', { type: 'file', accept: 'application/json,.json', class: 'file-input', 'aria-label': 'Fichier de carte d\'identité' });
  fichier.addEventListener('change', async () => {
    const f = fichier.files && fichier.files[0];
    if (!f) return;
    try {
      const { profil, progres } = carte.parse(await f.text());
      const p = profiles.create({ nom: (profil && profil.nom) || 'Élève', emoji: profil && profil.emoji });
      store.use(p.id);
      store.save(store.migrate(progres));
      changerDeProfil(p.id);
    } catch (err) {
      msg.textContent = err.message;
      msg.className = 'error small';
    }
  });

  root.append(
    topbar({ back: '#/', title: 'Qui travaille ?' }),
    h('section', { class: 'profils' },
      liste.length === 0
        ? h('p', { class: 'muted' }, 'Aucun profil pour l\'instant : la progression est enregistrée telle quelle sur cet appareil. Crée un profil pour que plusieurs élèves puissent se partager le navigateur.')
        : h('ul', { class: 'profil-liste' }, ...liste.map((pf) => h('li', { class: `profil-item${pf.id === courant ? ' courant' : ''}` },
            h('button', { class: 'profil-choix', type: 'button', onClick: () => changerDeProfil(pf.id) },
              h('span', { class: 'profil-emoji big' }, pf.emoji || '🙂'),
              h('span', { class: 'profil-texte' },
                h('strong', {}, pf.nom),
                h('span', { class: 'muted small' }, pf.vu ? `dernière séance le ${new Date(pf.vu).toLocaleDateString('fr-FR')}` : 'jamais utilisé')),
              pf.id === courant ? h('span', { class: 'profil-actif' }, '✔') : null),
            h('button', { class: 'icon-btn', type: 'button', 'aria-label': `Renommer ${pf.nom}`, onClick: () => {
              const nom = prompt('Nouveau prénom :', pf.nom);
              if (nom == null) return;
              try {
                profiles.rename(pf.id, { nom });
                if (pf.id === profiles.current()) changerDeProfil(pf.id); else route();
              } catch (err) {
                msg.textContent = err.message;
                msg.className = 'error small';
              }
            } }, '✏️'),
            h('button', { class: 'icon-btn', type: 'button', 'aria-label': `Supprimer ${pf.nom}`, onClick: () => {
              if (!confirm(`Supprimer le profil « ${pf.nom} » ? Sa progression sera définitivement effacée.`)) return;
              profiles.remove(pf.id);
              store.use(profiles.current());
              progress = store.load();
              route();
            } }, '🗑')))),
      h('h2', {}, 'Nouveau profil'),
      h('div', { class: 'input-row' }, emojiInput, nomInput, creer),
      h('h2', {}, 'Reprendre une carte d\'identité'),
      h('p', { class: 'muted small' }, 'Le fichier exporté depuis un autre appareil, dans les réglages.'),
      fichier, msg),
    bottomNav(null));
}

/** Carte reçue par lien (#/carte?d=…) : on demande toujours avant d'écrire quoi que ce soit. */
function renderCarteRecue(root, query) {
  root.append(topbar({ back: '#/', title: 'Carte d\'identité' }));
  const zone = h('section', { class: 'settings' }, h('p', { class: 'muted' }, 'Lecture de la carte…'));
  root.append(zone, bottomNav(null));
  carte.depuisLien(query.get('d') || '').then((c) => {
    const profil = c && c.profil;
    const progres = c && c.progres;
    if (!progres) throw new Error('Ce lien ne contient aucune progression.');
    const nom = (profil && profil.nom) || 'Élève';
    const nbSkills = Object.keys((progres && progres.skills) || {}).length;
    clear(zone);
    zone.append(
      h('p', {}, `Cette carte est celle de ${nom} : ${plural(nbSkills, 'compétence travaillée', 'compétences travaillées')}.`),
      h('button', { class: 'btn btn-primary btn-block', type: 'button', onClick: () => {
        const p = profiles.create({ nom, emoji: profil && profil.emoji });
        store.use(p.id);
        store.save(store.migrate(progres));
        changerDeProfil(p.id);
      } }, `Créer le profil de ${nom} sur cet appareil`),
      h('a', { class: 'btn btn-block', href: '#/' }, 'Ne rien faire'));
  }).catch((err) => {
    clear(zone);
    zone.append(h('p', { class: 'error' }, err && err.message ? err.message : 'Lien illisible.'),
      h('a', { class: 'btn', href: '#/' }, 'Accueil'));
  });
}

// ---------------------------------------------------------------- réglages
function renderSettings(root) {
  const goalInput = h('input', { class: 'text-input', type: 'number', min: 10, max: 500, step: 10, value: progress.settings.dailyGoal || prog.DEFAULT_DAILY_GOAL, 'aria-label': 'Objectif quotidien en XP' });
  goalInput.addEventListener('change', () => {
    const v = Math.max(10, Math.min(500, Number(goalInput.value) || prog.DEFAULT_DAILY_GOAL));
    goalInput.value = v;
    progress.settings.dailyGoal = v;
    store.save(progress);
  });
  const nameInput = h('input', { class: 'text-input', type: 'text', maxlength: 40, autocomplete: 'given-name', value: progress.settings.name || '', placeholder: 'Prénom', 'aria-label': 'Prénom de l\'élève' });
  nameInput.addEventListener('change', () => {
    progress.settings.name = nameInput.value.trim().slice(0, 40);
    store.save(progress);
  });
  const unlockInput = h('input', { type: 'checkbox', checked: !!progress.settings.unlockAll, 'aria-label': 'Mode découverte : tout déverrouiller' });
  unlockInput.addEventListener('change', () => {
    progress.settings.unlockAll = unlockInput.checked;
    store.save(progress);
  });
  const exportArea = h('textarea', { class: 'json-area', readonly: true, rows: 6, 'aria-label': 'Progression exportée' });
  exportArea.value = store.exportJson(progress);
  const copyBtn = h('button', { class: 'btn', type: 'button', onClick: async () => {
    try {
      await navigator.clipboard.writeText(exportArea.value);
      copyBtn.textContent = 'Copié ✔';
    } catch {
      exportArea.select();
      copyBtn.textContent = 'Sélectionné : copie avec ⌘C';
    }
  } }, 'Copier');
  const importArea = h('textarea', { class: 'json-area', rows: 6, placeholder: 'Colle ici une progression exportée…', 'aria-label': 'Progression à importer' });
  const importMsg = h('p', { class: 'muted small' });
  const importBtn = h('button', { class: 'btn', type: 'button', onClick: () => {
    try {
      progress = store.importJson(importArea.value);
      store.save(progress);
      importMsg.textContent = 'Progression importée ✔';
      importMsg.className = 'ok-text small';
      exportArea.value = store.exportJson(progress);
    } catch (err) {
      importMsg.textContent = err.message;
      importMsg.className = 'error small';
    }
  } }, 'Importer');
  const resetBtn = h('button', { class: 'btn btn-danger', type: 'button', onClick: () => {
    if (confirm('Tout remettre à zéro ? La progression sera définitivement effacée.')) {
      progress = store.reset();
      store.save(progress);
      session = null;
      navigate('#/');
    }
  } }, 'Tout remettre à zéro');

  // ---- carte d'identité : le format d'échange entre appareils (voir carte.js)
  const monProfil = profiles.currentProfile() || { nom: progress.settings.name || 'Élève', emoji: '🙂' };
  const carteMsg = h('p', { class: 'muted small' });
  const telechargerBtn = h('button', { class: 'btn', type: 'button', onClick: () => {
    const c = carte.build(monProfil, progress, todayStr());
    const blob = new Blob([carte.toJson(c)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: carte.nomDeFichier(c) });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    carteMsg.textContent = 'Carte téléchargée. Envoie-la-toi par mail ou AirDrop, puis importe-la sur l\'autre appareil.';
    carteMsg.className = 'ok-text small';
  } }, '⬇ Télécharger ma carte');
  const lienBtn = h('button', { class: 'btn', type: 'button', onClick: async () => {
    const c = carte.build(monProfil, progress, todayStr());
    const base = location.origin + location.pathname;
    const { url, octets, tient } = await carte.versLien(c, base);
    if (!tient) {
      // au-delà, l'URL casse selon les messageries : le fichier est le seul transport fiable
      carteMsg.textContent = `Trop de progression pour un lien (${Math.round(octets / 1024)} ko) : utilise le fichier.`;
      carteMsg.className = 'muted small';
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      carteMsg.textContent = `Lien copié (${Math.round(octets / 1024)} ko). Ouvre-le sur l'autre appareil.`;
      carteMsg.className = 'ok-text small';
    } catch {
      carteMsg.textContent = url;
      carteMsg.className = 'muted small json-area-inline';
    }
  } }, '🔗 Copier un lien');
  const importFichier = h('input', { type: 'file', accept: 'application/json,.json', class: 'file-input', 'aria-label': 'Carte d\'identité à importer' });
  importFichier.addEventListener('change', async () => {
    const f = importFichier.files && importFichier.files[0];
    if (!f) return;
    try {
      const { progres } = carte.parse(await f.text());
      progress = store.migrate(progres);
      store.save(progress);
      carteMsg.textContent = 'Carte importée dans le profil courant ✔';
      carteMsg.className = 'ok-text small';
      exportArea.value = store.exportJson(progress);
    } catch (err) {
      carteMsg.textContent = err.message;
      carteMsg.className = 'error small';
    }
  });

  const offline = renderOfflineFigures();

  root.append(
    topbar({ back: '#/', title: 'Réglages' }),
    h('section', { class: 'settings' },
      profiles.current() ? null : h('h2', {}, 'Prénom'),
      profiles.current() ? null : h('p', { class: 'muted small' }, 'Utilisé dans le bilan partagé avec un parent.'),
      profiles.current() ? null : h('div', { class: 'input-row' }, nameInput),
      h('h2', {}, 'Objectif quotidien'),
      h('div', { class: 'input-row' }, goalInput, h('span', { class: 'unit' }, 'XP / jour')),
      h('h2', {}, 'Mode découverte'),
      h('label', { class: 'toggle-row' }, unlockInput, h('span', {}, 'Tout déverrouiller (pour explorer toutes les compétences sans respecter les prérequis).')),
      h('h2', {}, 'Profils'),
      h('p', { class: 'muted small' }, 'Plusieurs élèves peuvent se partager cet appareil : chacun garde sa progression.'),
      h('a', { class: 'btn btn-block', href: '#/profils' }, `${monProfil.emoji || '🙂'} ${monProfil.nom} — changer de profil`),
      profiles.current() ? h('p', { class: 'muted small' }, 'C\'est ce prénom qui apparaît dans le bilan partagé avec un parent : renomme le profil pour le changer.') : null,
      h('h2', {}, 'Carte d\'identité'),
      h('p', { class: 'muted small' }, 'Tout ce que tu as travaillé, dans toutes les matières, dans un seul fichier. Rien n\'est envoyé : la carte reste sur tes appareils.'),
      h('div', { class: 'row-buttons' }, telechargerBtn, lienBtn),
      importFichier, carteMsg,
      h('h2', {}, 'Exporter au format texte'),
      h('p', { class: 'muted small' }, 'Le même contenu, à copier-coller.'),
      exportArea, h('div', { class: 'row-right' }, copyBtn),
      h('h2', {}, 'Importer une progression'),
      importArea, h('div', { class: 'row-right' }, importBtn), importMsg,
      h('h2', {}, 'Mode hors-ligne'),
      offline,
      h('h2', {}, 'Comment c\'est fait'),
      h('p', { class: 'muted small' },
        'L\'essentiel de ce contenu a été écrit avec Claude, sous relecture. Cela vaut pour la '
        + 'justesse scientifique comme pour l\'ergonomie : une erreur de physique, un énoncé ambigu, '
        + 'une figure fausse ou un enchaînement pénible sur téléphone sont des défauts possibles, et '
        + 'attendus. Les signaler est le mécanisme de correction prévu, pas un service après-vente.'),
      h('div', { class: 'row-right' }, boutonSignaler('retour général', [
        'Ce que j\'ai remarqué : ',
      ], '✉️ Envoyer un retour')),
      h('h2', {}, 'Zone dangereuse'),
      h('div', { class: 'row-right' }, resetBtn),
      h('p', { class: 'muted small' }, `Contenu généré le ${content.generatedAt ? new Date(content.generatedAt).toLocaleString('fr-FR') : '—'} · version ${content.version || '?'}`)),
    bottomNav('settings'),
  );
}

/** Bloc « préparer le mode hors-ligne » : télécharge toutes les figures pour que le service worker les garde. */
function renderOfflineFigures() {
  const idx = figs.getIndex();
  const n = idx ? Object.keys(idx).length : 0;
  const size = figs.formatMo(figs.totalBytes(idx));
  const done = progress.settings.offlineFigures;
  const status = h('p', { class: 'muted small offline-status' },
    done && done.date ? `Figures téléchargées le ${new Date(done.date).toLocaleDateString('fr-FR')} (${done.count || n} figures).`
      : "Les figures des leçons et des exercices sont téléchargées au fur et à mesure. Pour tout avoir hors connexion, lance le téléchargement une fois.");
  const bar = h('div', { class: 'bar offline-bar', hidden: true }, h('div', { class: 'bar-fill', style: 'width:0%' }));
  const btn = h('button', { class: 'btn', type: 'button', disabled: n === 0 }, `Préparer le mode hors-ligne (${n} figures, ${size})`);
  btn.addEventListener('click', async () => {
    btn.disabled = true;
    bar.hidden = false;
    status.textContent = 'Téléchargement…';
    try {
      const r = await figs.prefetchAll({ concurrency: 4, onProgress: (k, total) => {
        bar.firstChild.style.width = `${Math.round(100 * k / total)}%`;
        status.textContent = `${k} / ${total} figures téléchargées…`;
      } });
      progress.settings.offlineFigures = { date: new Date().toISOString(), count: r.ok };
      store.save(progress);
      status.textContent = r.ok === r.total
        ? `Terminé : ${r.ok} figures disponibles hors connexion (${size}).`
        : `Terminé : ${r.ok} figures sur ${r.total} (les autres n'ont pas pu être téléchargées).`;
      status.className = 'ok-text small offline-status';
    } catch (err) {
      status.textContent = `Échec du téléchargement : ${err.message}`;
      status.className = 'error small offline-status';
    } finally {
      btn.disabled = false;
    }
  });
  return h('div', { class: 'offline-box' }, status, bar, h('div', { class: 'row-right' }, btn));
}

// ---------------------------------------------------------------- démarrage
window.addEventListener('hashchange', route);
figs.observe(document.getElementById('app')); // gabarits créés après coup (choix, corrections, étapes)
anim.install(document.getElementById('app'));  // symboles animés : toucher, bouton des leçons
route();
