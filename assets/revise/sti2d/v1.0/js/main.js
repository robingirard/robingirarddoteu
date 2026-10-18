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
import * as cg from './cagnotte.js';
import * as fusion from './fusion.js';

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
      case 'cagnotte': renderCagnotte(root, query); break;
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
  if (cg.consolider(progress, content, today, cg.etat(progress).bareme).length) store.save(progress);
  root.append(
    topbar({ title: content.title || 'Révise STI2D', droite: pastilleProfil() }),
    h('section', { class: 'stats' },
      h('div', { class: 'stat' }, h('span', { class: 'stat-value' }, `🔥 ${streak}`), h('span', { class: 'stat-label' }, plural(streak, 'jour de série', 'jours de série').replace(/^\d+ /, ''))),
      h('div', { class: 'stat stat-wide' },
        h('span', { class: 'stat-value' }, `⭐ ${xpToday} / ${goal} XP`),
        h('span', { class: 'stat-label' }, xpToday >= goal ? 'objectif du jour atteint !' : 'objectif du jour'),
        bar(xpToday / goal, 'bar-small'))),
    cagnotteCard(),
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
  if (!skill) return renderNotFound(root, skillId);
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

/**
 * Vide le cache du service worker et recharge (le fragment d'URL, donc la destination, survit).
 * Même geste que le bouton « Réparer et recharger » du garde-fou d'index.html ; `localStorage`,
 * donc la progression et les profils, n'est pas touché.
 */
async function reparerEtRecharger() {
  try {
    if ('serviceWorker' in navigator) {
      const rs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(rs.map((r) => r.unregister()));
    }
    if (window.caches) {
      const ks = await caches.keys();
      await Promise.all(ks.map((k) => caches.delete(k)));
    }
  } catch { /* on recharge quand même */ }
  location.reload();
}

/**
 * `cible` = la compétence demandée par le lien, quand il y en avait une. Un lien vers une
 * compétence que le contenu chargé ne connaît pas vient presque toujours d'une version périmée
 * servie par le cache — le lien envoyé par le professeur ou le parent est plus récent que
 * l'application installée. On le dit, et on propose la mise à jour plutôt qu'un cul-de-sac.
 */
function renderNotFound(root, cible = null) {
  root.append(topbar({ back: '#/', title: 'Introuvable' }));
  if (!cible) {
    root.append(h('p', { class: 'muted' }, 'Cette page n\'existe pas.'));
    root.append(bottomNav(null));
    return;
  }
  root.append(
    h('p', {}, 'Cette version de l\'application ne connaît pas la compétence « ', h('code', {}, cible), ' ».'),
    h('p', { class: 'muted' }, 'C\'est presque toujours le signe qu\'une version plus ancienne est encore '
      + 'en mémoire : la compétence a été ajoutée depuis. Mettez à jour, le lien fonctionnera.'),
    h('button', { class: 'btn btn-primary btn-block', onClick: (ev) => {
      ev.currentTarget.disabled = true;
      ev.currentTarget.textContent = 'Mise à jour…';
      reparerEtRecharger();
    } }, 'Mettre à jour et réessayer'),
    bottomNav(null),
  );
}

// ---------------------------------------------------------------- séance
function renderSessionEntry(root, skillId, query) {
  const skill = sess.findSkill(content, skillId);
  if (!skill) return renderNotFound(root, skillId);
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
  const gains = [];
  if (session.kind === 'skill') {
    skill = sess.findSkill(content, session.skillId);
    const avant = progress.skills[session.skillId];
    const r = prog.applySession(avant, skill, result, bonus);
    progress.skills[session.skillId] = r.state;
    ({ xp, passed, leveledUp } = r);
    skillState = r.state;
    const pas = cg.pasDeSeance(progress, skill, avant, passed, today);
    if (pas) gains.push(pas);
  }
  progress.xp += xp;
  progress.streak = prog.updateStreak(progress.streak, today);
  progress.history.push({ id: fusion.idSeance(), date: today, kind: session.kind, skill: session.skillId, correct: result.correct, total: result.total, xp });
  gains.push(...cg.consolider(progress, content, today, cg.etat(progress).bareme));   // une révision peut consolider
  store.save(progress);
  profiles.touch(profiles.current(), today);   // « dernière séance » de la liste des profils
  lastSummary = { kind: session.kind, skill, skillState, result, xp, passed, leveledUp, gains };
  session = null;
  navigate('#/summary');
}


// ---------------------------------------------------------------- bilan
function renderSummary(root) {
  if (!lastSummary) return navigate('#/');
  const { kind, skill, skillState, result, xp, passed, leveledUp, gains = [] } = lastSummary;
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
      gains.length ? gainsCard(gains) : null,
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

// ---------------------------------------------------------------- cagnotte (voir cagnotte.js)
function nomEleve() {
  const moi = profiles.currentProfile();
  return (moi && moi.nom) || progress.settings.name || '';
}

const adresseAppli = () => location.origin + location.pathname;
const lienCagnotte = (obj) => `${adresseAppli()}#/cagnotte?d=${bilan.encodeJson(obj)}`;

/**
 * Bouton de partage : la feuille de partage du téléphone (WhatsApp, Messages, Mail) quand il y en
 * a une, sinon un texte à copier. `contenu()` est appelé au moment du geste, pour partager l'état
 * du moment et pas celui de l'affichage.
 */
function boutonPartage(libelle, contenu, { primaire = true, apres = null } = {}) {
  const area = h('textarea', { class: 'json-area', readonly: true, rows: 5, 'aria-label': 'Message à envoyer' });
  const panel = h('div', { class: 'share-panel', hidden: true },
    h('p', { class: 'muted small' }, 'Copie ce message et envoie-le (WhatsApp, Messages, mail…).'),
    area, h('div', { class: 'row-right' }, copyButton(() => area.value)));
  const btn = h('button', { class: `btn${primaire ? ' btn-primary' : ''} btn-block`, type: 'button', onClick: async () => {
    const { titre, texte, url } = contenu();
    if (navigator.share) {
      try {
        await navigator.share(url ? { title: titre, text: texte, url } : { title: titre, text: texte });
        if (apres) apres();
        return;
      } catch (err) { if (err && err.name === 'AbortError') return; }
    }
    area.value = url ? `${texte}\n${url}` : texte;
    panel.hidden = false;
    if (apres) apres();
  } }, libelle);
  return h('div', { class: 'share-block' }, btn, panel);
}

function partageReleve() {
  return boutonPartage('📨 Envoyer à valider', () => {
    const rel = cg.releve(progress, nomEleve(), todayStr());
    const e = cg.etat(progress);
    const qui = rel.nom || 'Ton enfant';
    return {
      titre: `Cagnotte de ${qui}`,
      texte: `💰 ${qui} : ${plural(rel.pas.length, 'pas', 'pas')} à valider (${cg.euros(e.enAttente)}). Ouvre le lien pour valider :`,
      url: lienCagnotte(rel),
    };
  });
}

/**
 * Ce que la séance vient de mettre dans la cagnotte (écran de fin de séance). Pas de bouton d'envoi
 * ici : les pas s'accumulent, et l'élève envoie le paquet quand il veut, depuis sa cagnotte.
 */
function gainsCard(gains) {
  const e = cg.etat(progress);
  return h('p', { class: 'cagnotte-gain' }, `💰 +${cg.euros(cg.somme(gains, e.bareme))} · ${cg.euros(e.enAttente)} en attente`);
}

/** Carte de l'accueil. Un fragment vide si la cagnotte n'est pas activée (append(null) écrirait « null »). */
function cagnotteCard() {
  if (!cg.estActive(progress)) return document.createDocumentFragment();
  const e = cg.etat(progress);
  return h('a', { class: 'cagnotte-card', href: '#/cagnotte' },
    h('span', { class: 'cagnotte-icone' }, '💰'),
    h('span', { class: 'cagnotte-texte' },
      h('strong', {}, `${cg.euros(e.aRecevoir)} à recevoir`),
      h('span', { class: 'muted small' }, e.enAttente > 0 ? `+ ${cg.euros(e.enAttente)} en attente de validation` : 'rien en attente')),
    h('span', { class: 'subject-chevron', 'aria-hidden': 'true' }, '›'));
}

function libellePas(p) {
  return p.type === 'conso'
    ? `${bilan.skillTitle(p.skill, content)} — retenue un mois après`
    : `${bilan.skillTitle(p.skill, content)} — séance réussie ${p.k}/${p.de}`;
}

function renderCagnotte(root, query) {
  if (query.has('parent')) return renderRegistre(root);
  if (!query.has('d')) return renderMaCagnotte(root);
  let obj;
  try {
    obj = cg.nettoyer(bilan.decodeJson(query.get('d'), 'Ce lien ne contient pas un relevé de cagnotte valide.'));
  } catch (err) {
    root.append(topbar({ back: '#/', title: 'Cagnotte' }), h('p', { class: 'error' }, err.message), bottomNav(null));
    return;
  }
  if (obj.t === 'recu') renderRecuRecu(root, obj); else renderValidation(root, obj);
}

/** L'écran de l'élève : ce qui est validé, ce qui attend, et de quoi envoyer ou réclamer. */
function renderMaCagnotte(root) {
  root.append(topbar({ back: '#/', title: '💰 Ma cagnotte' }));
  if (!cg.estActive(progress)) {
    root.append(h('section', { class: 'settings' },
      h('p', {}, 'La cagnotte n\'est pas activée. Elle se met en route dans les réglages : chaque séance réussie y ajoute une petite somme, qu\'un parent valide ensuite.'),
      h('a', { class: 'btn btn-primary btn-block', href: '#/settings' }, 'Aller aux réglages')), bottomNav(null));
    return;
  }
  const e = cg.etat(progress);
  const b = e.bareme;
  const msg = h('p', { class: 'muted small' });
  const recuInput = h('input', { class: 'text-input', type: 'text', placeholder: 'Colle ici le lien du reçu', 'aria-label': 'Lien du reçu' });
  const recuBtn = h('button', { class: 'btn', type: 'button', onClick: () => {
    const brut = recuInput.value.trim();
    const code = (/[?&]d=([A-Za-z0-9_-]+)/.exec(brut) || [null, brut])[1];
    try {
      const r = cg.nettoyer(bilan.decodeJson(code, 'Ce texte n\'est pas un reçu de cagnotte.'));
      if (r.t !== 'recu') throw new Error('Ce lien est un relevé, pas un reçu : c\'est au parent de l\'ouvrir.');
      const res = cg.appliquerRecu(progress, r);
      store.save(progress);
      if (res.applique) route(); else { msg.textContent = res.raison; msg.className = 'muted small'; }
    } catch (err) {
      msg.textContent = err.message;
      msg.className = 'error small';
    }
  } }, 'Enregistrer');
  const virement = e.aRecevoir > 0
    ? boutonPartage(`💸 Demander un virement de ${cg.euros(e.aRecevoir)}`, () => ({
      titre: 'Demande de virement',
      texte: `💸 Ma cagnotte Révise : ${cg.euros(e.aRecevoir)} validés et pas encore versés. Tu peux me faire le virement sur Revolut ? Merci !`,
    }), { primaire: false })
    : null;
  const ligne = (p, etiquette) => h('li', {}, h('span', {}, `${bilan.formatDate(p.date)} · ${libellePas(p)}`), h('strong', {}, etiquette));
  root.append(
    h('section', { class: 'stats' },
      h('div', { class: 'stat' }, h('span', { class: 'stat-value' }, cg.euros(e.aRecevoir)), h('span', { class: 'stat-label' }, 'validés, à recevoir')),
      h('div', { class: 'stat' }, h('span', { class: 'stat-value' }, cg.euros(e.enAttente)), h('span', { class: 'stat-label' }, 'en attente de validation')),
      h('div', { class: 'stat' }, h('span', { class: 'stat-value' }, cg.euros(e.verse)), h('span', { class: 'stat-label' }, 'déjà versés'))),
    h('section', { class: 'settings' },
      e.attente.length ? partageReleve() : h('p', { class: 'muted' }, 'Rien en attente : chaque séance réussie ajoute un pas ici.'),
      virement,
      h('h2', {}, 'En attente de validation'),
      e.attente.length
        ? h('ul', { class: 'cagnotte-liste' }, ...e.attente.slice().reverse().map((p) => ligne(p, cg.euros(cg.montant(p, b)))))
        : h('p', { class: 'muted small' }, 'Aucun pas en attente.'),
      e.refuses.length ? h('h2', {}, 'Non validés') : null,
      e.refuses.length ? h('ul', { class: 'cagnotte-liste muted' }, ...e.refuses.slice(-10).reverse().map((p) => ligne(p, '—'))) : null,
      h('h2', {}, 'Le reçu du parent'),
      h('p', { class: 'muted small' }, 'Le parent te renvoie un lien après chaque validation. Si l\'ouvrir ne met pas ta cagnotte à jour (application installée sur l\'écran d\'accueil), copie-le et colle-le ici.'),
      h('div', { class: 'input-row' }, recuInput, recuBtn), msg,
      h('h2', {}, 'La règle'),
      h('ul', { class: 'muted small' },
        h('li', {}, `Une compétence terminée vaut ${cg.euros(b.competence)}, répartis sur ses séances réussies (au moins 80 % du premier coup) : ${cg.euros(cg.montant({ type: 'seance', k: 1, de: 6 }, b))} par séance pour une compétence à 3 niveaux.`),
        h('li', {}, `${b.delai} jours après l'avoir terminée, elle rapporte encore ${cg.euros(b.consolidation)} si tu l'as retenue : au moins 80 % de ses exercices maîtrisés, grâce aux révisions.`),
        h('li', {}, 'Une fois que tu as terminé une compétence, la retravailler ne rapporte plus : c\'est la révision qui compte.'))),
    bottomNav(null));
}

/** Questions tirées des compétences à payer, à poser de vive voix avant de valider. */
function interroOrale(pas) {
  const zone = h('div', { class: 'interro' }, h('p', { class: 'muted small' }, 'Chargement des questions…'));
  const niveau = new Map();
  for (const p of pas) niveau.set(p.skill, Math.max(niveau.get(p.skill) || 1, Math.ceil(p.k / 2)));
  const skills = [...niveau.keys()].filter((id) => sess.findSkill(content, id));
  packs.loadForSkills(skills).then(() => {
    const candidats = [];
    for (const id of skills) {
      const skill = sess.findSkill(content, id);
      const items = (skill.items || []).map((i) => content.items[i])
        .filter((it) => it && it.payload && (it.type === 'mcq' || it.type === 'input') && (it.level || 1) <= niveau.get(id));
      if (items.length) candidats.push(items);
    }
    clear(zone);
    if (!candidats.length) { zone.append(h('p', { class: 'muted small' }, 'Pas de question courte disponible pour ces compétences.')); return; }
    const choisis = [];
    const pioche = (liste) => liste.splice(Math.floor(Math.random() * liste.length), 1)[0];
    for (let tour = 0; choisis.length < 2 && tour < 4; tour++) {
      for (const liste of candidats) if (choisis.length < 2 && liste.length) choisis.push(pioche(liste));
    }
    for (const it of choisis) {
      const p = it.payload;
      const rep = it.type === 'mcq'
        ? (p.answer || []).map((i) => p.choices[i]).join(' ; ')
        : `${p.answer}${p.unit ? ' ' + p.unit : ''}`;
      zone.append(h('div', { class: 'interro-q' },
        h('div', { class: 'interro-enonce', html: renderRich(p.prompt, figures) }),
        h('details', {}, h('summary', {}, 'Voir la réponse'),
          h('div', { class: 'interro-rep', html: renderRich(String(rep), figures) }),
          p.explanation ? h('div', { class: 'muted small', html: renderRich(p.explanation, figures) }) : null)));
    }
    figs.hydrate(zone);
  }, () => { clear(zone); zone.append(h('p', { class: 'muted small' }, 'Questions indisponibles hors connexion.')); });
  return zone;
}

/** Le parent ouvre un relevé : il valide, reporte ou refuse chaque pas, puis renvoie un reçu. */
function renderValidation(root, rel) {
  const today = todayStr();
  const reg = cg.chargerRegistre(uiStorage());
  const { enfant, nouveaux } = cg.recevoirReleve(reg, rel);
  cg.enregistrerRegistre(reg, uiStorage());
  const qui = enfant.nom || 'l\'élève';
  root.append(topbar({ back: '#/', title: `💰 Cagnotte de ${qui}` }),
    h('div', { class: 'received-banner' }, `📨 Relevé reçu de ${qui}, daté du ${bilan.formatDate(rel.date)}.`));
  if (enfant.reconstitue) {
    root.append(h('p', { class: 'muted small' }, `Ce registre a été reconstitué à partir du dernier reçu gardé par ${qui} (${cg.euros(enfant.valide)} validés, ${cg.euros(enfant.verse)} versés) : vérifie ces chiffres avec tes virements.`));
  }
  const zone = h('section', { class: 'settings' });
  root.append(zone, bottomNav(null));
  const recuBloc = () => boutonPartage(`📨 Envoyer le reçu à ${qui}`, () => ({
    titre: 'Reçu de cagnotte',
    texte: `✅ Cagnotte : ${cg.euros(enfant.valide)} validés, ${cg.euros(enfant.verse)} déjà versés, ${cg.euros(enfant.valide - enfant.verse)} à verser. Ouvre ce lien pour mettre ta cagnotte à jour :`,
    url: lienCagnotte(cg.recu(reg, rel.id, todayStr())),
  }));
  const totaux = () => h('p', {}, `Validé au total : ${cg.euros(enfant.valide)} · versé : ${cg.euros(enfant.verse)} · `, h('strong', {}, `à verser : ${cg.euros(enfant.valide - enfant.verse)}`));
  if (!nouveaux.length) {
    zone.append(h('p', {}, 'Rien de nouveau dans ce relevé : tout a déjà été traité.'), totaux(), recuBloc(),
      h('a', { class: 'btn btn-block', href: '#/cagnotte?parent' }, 'Le registre et les virements'));
    return;
  }
  const choix = new Map(nouveaux.map((p) => [cg.cle(p), 'v']));
  const total = h('strong', {});
  const majTotal = () => {
    total.textContent = cg.euros(cg.somme(nouveaux.filter((p) => choix.get(cg.cle(p)) === 'v'), reg.bareme));
  };
  const lignes = nouveaux.map((p) => {
    const sel = h('select', { class: 'text-input cagnotte-choix', 'aria-label': `Décision pour ${libellePas(p)}` },
      h('option', { value: 'v' }, '✔ Valider'), h('option', { value: 'l' }, '⏸ Plus tard'), h('option', { value: 'r' }, '✖ Refuser'));
    sel.addEventListener('change', () => { choix.set(cg.cle(p), sel.value); majTotal(); });
    return h('li', { class: 'cagnotte-decision' },
      h('span', {}, `${bilan.formatDate(p.date)} · ${libellePas(p)}`),
      h('span', { class: 'cagnotte-decision-droite' }, h('strong', {}, cg.euros(cg.montant(p, reg.bareme))), sel));
  });
  majTotal();
  const valider = h('button', { class: 'btn btn-primary btn-block', type: 'button', onClick: () => {
    const refuses = new Set(nouveaux.filter((p) => choix.get(cg.cle(p)) === 'r').map(cg.cle));
    const reportes = new Set(nouveaux.filter((p) => choix.get(cg.cle(p)) === 'l').map(cg.cle));
    const r = cg.valider(reg, rel.id, nouveaux, { refuses, reportes }, today);
    cg.enregistrerRegistre(reg, uiStorage());
    clear(zone);
    zone.append(
      h('p', { class: 'ok-text' }, `✔ ${plural(r.nVal, 'pas validé', 'pas validés')} (${cg.euros(r.gagne)})${r.nRef ? `, ${plural(r.nRef, 'refusé', 'refusés')}` : ''}.`),
      totaux(),
      h('p', { class: 'muted small' }, `Envoie le reçu à ${qui} : sa cagnotte affichera les mêmes chiffres. Le virement, tu le fais quand tu veux, puis tu le notes dans le registre.`),
      recuBloc(),
      h('a', { class: 'btn btn-block', href: '#/cagnotte?parent' }, 'J\'ai fait un virement → registre'));
  } }, 'Enregistrer ma décision');
  zone.append(
    h('h2', {}, 'Ce qui est à valider'),
    h('ul', { class: 'cagnotte-liste' }, ...lignes),
    h('p', {}, 'Total validé : ', total),
    h('h2', {}, '🎤 Deux questions à lui poser'),
    h('p', { class: 'muted small' }, 'Tirées des compétences de ce relevé. S\'il sait répondre de vive voix, c\'est que le travail est fait.'),
    interroOrale(nouveaux),
    valider,
    h('p', { class: 'muted small' }, `Barème de ce registre : ${cg.euros(reg.bareme.competence)} par compétence, ${cg.euros(reg.bareme.consolidation)} de consolidation. Il se règle dans le registre.`));
}

/** L'élève ouvre le reçu du parent. */
function renderRecuRecu(root, r) {
  root.append(topbar({ back: '#/', title: '💰 Cagnotte' }));
  let res;
  try {
    res = cg.appliquerRecu(progress, r);
    store.save(progress);
  } catch (err) {
    root.append(h('section', { class: 'settings' },
      h('p', { class: 'error' }, err.message),
      h('p', { class: 'muted small' }, 'Si tu utilises l\'application installée sur l\'écran d\'accueil, ce lien s\'est ouvert dans le navigateur, qui ne la voit pas : copie-le, puis colle-le dans l\'application (Cagnotte → « Le reçu du parent »).')),
    bottomNav(null));
    return;
  }
  const e = cg.etat(progress);
  root.append(h('section', { class: 'settings' },
    h('p', { class: res.applique ? 'ok-text' : 'muted' }, res.applique ? '✔ Cagnotte mise à jour.' : res.raison),
    h('p', {}, `${cg.euros(e.aRecevoir)} validés à recevoir · ${cg.euros(e.enAttente)} en attente.`),
    h('a', { class: 'btn btn-primary btn-block', href: '#/cagnotte' }, 'Voir ma cagnotte')), bottomNav(null));
}

/** Le registre du parent : totaux par enfant, virements, barème. */
function renderRegistre(root) {
  const today = todayStr();
  const reg = cg.chargerRegistre(uiStorage());
  const sauver = () => cg.enregistrerRegistre(reg, uiStorage());
  root.append(topbar({ back: '#/settings', title: '💰 Registre du parent' }));
  const zone = h('section', { class: 'settings' });
  const ids = Object.keys(reg.enfants);
  if (!ids.length) zone.append(h('p', { class: 'muted' }, 'Aucun relevé reçu sur cet appareil. Le registre se crée quand tu ouvres le premier lien « Envoyer à valider ».'));
  for (const id of ids) {
    const e = reg.enfants[id];
    const du = e.valide - e.verse;
    const montantInput = h('input', { class: 'text-input', type: 'text', inputmode: 'decimal', value: du > 0 ? (du / 100).toFixed(2).replace('.', ',') : '', 'aria-label': 'Montant versé en euros' });
    const msg = h('p', { class: 'muted small' });
    const verse = h('button', { class: 'btn', type: 'button', onClick: () => {
      try {
        const m = cg.lireEuros(montantInput.value);
        if (m == null) throw new Error('Montant illisible (exemple : 12,50).');
        cg.verser(reg, id, m, today);
        sauver();
        route();
      } catch (err) { msg.textContent = err.message; msg.className = 'error small'; }
    } }, 'J\'ai versé ce montant');
    zone.append(...[   // Element.append(null) écrirait « null »
      h('h2', {}, e.nom || id),
      h('p', {}, `Validé : ${cg.euros(e.valide)} · versé : ${cg.euros(e.verse)} · `, h('strong', {}, `à verser : ${cg.euros(du)}`)),
      du > 0 ? h('div', { class: 'input-row' }, montantInput, h('span', { class: 'unit' }, '€'), verse) : null, msg,
      boutonPartage(`📨 Envoyer le reçu à ${e.nom || 'l\'élève'}`, () => ({
        titre: 'Reçu de cagnotte',
        texte: `✅ Cagnotte : ${cg.euros(e.valide)} validés, ${cg.euros(e.verse)} déjà versés, ${cg.euros(e.valide - e.verse)} à verser. Ouvre ce lien pour mettre ta cagnotte à jour :`,
        url: lienCagnotte(cg.recu(reg, id, todayStr())),
      }), { primaire: false }),
      e.journal.length
        ? h('ul', { class: 'cagnotte-liste muted small' }, ...e.journal.slice(-10).reverse().map((j) => h('li', {},
          h('span', {}, `${bilan.formatDate(j.date)} · ${j.type === 'versement' ? 'virement' : `validation (${j.valides} pas${j.refuses ? `, ${j.refuses} refusés` : ''})`}`),
          h('strong', {}, cg.euros(j.montant)))))
        : null].filter(Boolean));
  }
  const champ = (val, label) => h('input', { class: 'text-input', type: 'text', inputmode: 'decimal', value: (val / 100).toFixed(2).replace('.', ','), 'aria-label': label });
  const comp = champ(reg.bareme.competence, 'Montant par compétence');
  const conso = champ(reg.bareme.consolidation, 'Montant de consolidation');
  const bmsg = h('p', { class: 'muted small' });
  const bBtn = h('button', { class: 'btn', type: 'button', onClick: () => {
    const c = cg.lireEuros(comp.value), k = cg.lireEuros(conso.value);
    if (c == null || k == null) { bmsg.textContent = 'Montant illisible (exemple : 15 ou 12,50).'; bmsg.className = 'error small'; return; }
    reg.bareme = cg.normaliserBareme({ ...reg.bareme, competence: c, consolidation: k });
    sauver();
    bmsg.textContent = 'Barème enregistré : il s\'applique aux prochaines validations, et l\'élève le verra au prochain reçu.';
    bmsg.className = 'ok-text small';
  } }, 'Enregistrer');
  zone.append(
    h('h2', {}, 'Barème'),
    h('div', { class: 'input-row' }, comp, h('span', { class: 'unit' }, '€ par compétence terminée')),
    h('div', { class: 'input-row' }, conso, h('span', { class: 'unit' }, `€ si elle est retenue ${reg.bareme.delai} jours après`)),
    h('div', { class: 'row-right' }, bBtn), bmsg,
    h('p', { class: 'muted small' }, 'Ce registre vit dans ce navigateur. Garde-le au même endroit (le téléphone sur lequel tu ouvres les liens) ; s\'il disparaissait, le prochain relevé le reconstituerait à partir du dernier reçu.'));
  root.append(zone, bottomNav(null));
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
    const moi = profiles.currentProfile() || { nom: progress.settings.name || '' };
    const dejaTravaille = progress.history.length > 0 || Object.keys(progress.items || {}).length > 0;
    const msg = h('p', { class: 'ok-text' });
    zone.append(
      h('p', {}, `Cette carte est celle de ${nom} : ${plural(nbSkills, 'compétence travaillée', 'compétences travaillées')}.`),
      dejaTravaille ? h('button', { class: 'btn btn-primary btn-block', type: 'button', onClick: () => {
        try {
          const n = fusionnerCarte(carte.toJson(c), moi);
          if (n) msg.textContent = n;
        } catch (err) { msg.textContent = err.message; msg.className = 'error'; }
      } }, `Fusionner avec la progression de ${moi.nom || 'cet appareil'}`) : document.createDocumentFragment(),
      msg,
      h('button', { class: `btn${dejaTravaille ? '' : ' btn-primary'} btn-block`, type: 'button', onClick: () => {
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

// ---------------------------------------------------------------- fusion d'une carte reçue
/**
 * Fusionne une carte (texte JSON) dans la progression du profil courant ; renvoie la phrase à
 * afficher, ou null si l'élève a renoncé. Une carte au nom d'un autre élève demande confirmation.
 */
function fusionnerCarte(texte, monProfil) {
  const { profil, progres } = carte.parse(texte);
  const nomRecu = profil && profil.nom;
  if (nomRecu && monProfil && monProfil.nom && nomRecu !== monProfil.nom
    && !confirm(`Cette progression est celle de ${nomRecu}. La fusionner dans celle de ${monProfil.nom} ?`)) return null;
  const { progres: f, apport } = fusion.fusionner(progress, store.migrate(progres));
  progress = f;
  store.save(progress);
  if (!apport.seances && !apport.exercices && !apport.pas) return 'Rien de nouveau : les deux appareils étaient déjà à jour ✔';
  const parts = [];
  if (apport.seances) parts.push(plural(apport.seances, 'séance ajoutée', 'séances ajoutées'));
  if (apport.exercices) parts.push(plural(apport.exercices, 'exercice mis à jour', 'exercices mis à jour'));
  if (apport.pas) parts.push(plural(apport.pas, 'pas de cagnotte', 'pas de cagnotte'));
  return `Fusion faite ✔ ${parts.join(', ')}.`;
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
  const resetBtn = h('button', { class: 'btn btn-danger', type: 'button', onClick: () => {
    if (confirm('Tout remettre à zéro ? La progression sera définitivement effacée.')) {
      progress = store.reset();
      store.save(progress);
      session = null;
      navigate('#/');
    }
  } }, 'Tout remettre à zéro');

  // ---- passer d'un appareil à l'autre : la carte d'identité (carte.js), fusionnée à l'arrivée (fusion.js)
  const monProfil = profiles.currentProfile() || { nom: progress.settings.name || 'Élève', emoji: '🙂' };
  const carteMsg = h('p', { class: 'muted small' });
  const dire = (texte, cls = 'ok-text small') => { carteMsg.textContent = texte; carteMsg.className = cls; };
  const texteCarte = () => carte.toJson(carte.build(monProfil, progress, todayStr()));
  const recevoir = (texte) => {
    try {
      const n = fusionnerCarte(texte, monProfil);
      if (n) dire(n);
    } catch (err) {
      dire(err.message, 'error small');
    }
  };
  const manuel = h('textarea', { class: 'json-area', rows: 4, placeholder: 'Colle ici la progression copiée sur l\'autre appareil…', 'aria-label': 'Progression à fusionner' });
  const copierBtn = h('button', { class: 'btn btn-primary', type: 'button', onClick: async () => {
    try {
      await navigator.clipboard.writeText(texteCarte());
      dire('Copiée ✔ Sur l\'autre appareil : Réglages → « Coller celle de l\'autre appareil ».');
    } catch {
      manuel.value = texteCarte();
      manuel.closest('details').open = true;
      manuel.select();
      dire('Copie automatique impossible : le texte est sélectionné ci-dessous, copie-le avec ⌘C.', 'muted small');
    }
  } }, '📋 Copier ma progression');
  const collerBtn = h('button', { class: 'btn btn-primary', type: 'button', onClick: async () => {
    let texte = '';
    try {
      texte = await navigator.clipboard.readText();
    } catch {
      manuel.closest('details').open = true;
      manuel.focus();
      dire('Le navigateur ne laisse pas lire le presse-papiers : colle-la ci-dessous (⌘V), puis « Fusionner ».', 'muted small');
      return;
    }
    recevoir(texte);
  } }, '📥 Coller celle de l\'autre appareil');
  const fusionnerBtn = h('button', { class: 'btn', type: 'button', onClick: () => recevoir(manuel.value) }, 'Fusionner');
  const telechargerBtn = h('button', { class: 'btn', type: 'button', onClick: () => {
    const c = carte.build(monProfil, progress, todayStr());
    const blob = new Blob([carte.toJson(c)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: carte.nomDeFichier(c) });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    dire('Carte téléchargée. Envoie-la par AirDrop ou par mail, puis ouvre-la ici sur l\'autre appareil.');
  } }, '⬇ Télécharger ma carte');
  const importFichier = h('input', { type: 'file', accept: 'application/json,.json', class: 'file-input', 'aria-label': 'Carte d\'identité à fusionner' });
  importFichier.addEventListener('change', async () => {
    const f = importFichier.files && importFichier.files[0];
    if (f) recevoir(await f.text());
  });

  const offline = renderOfflineFigures();

  const cagnotteInput = h('input', { type: 'checkbox', checked: cg.estActive(progress), 'aria-label': 'Activer la cagnotte' });
  cagnotteInput.addEventListener('change', () => {
    if (cagnotteInput.checked) cg.activer(progress, todayStr()); else cg.desactiver(progress);
    store.save(progress);
    route();
  });
  const registre = cg.chargerRegistre(uiStorage());
  const nbEnfants = Object.keys(registre.enfants).length;

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
      h('h2', {}, '💰 Cagnotte'),
      h('label', { class: 'toggle-row' }, cagnotteInput, h('span', {}, 'Chaque séance réussie ajoute une petite somme à une cagnotte, qu\'un parent valide ensuite.')),
      cg.estActive(progress) ? h('a', { class: 'btn btn-block', href: '#/cagnotte' }, 'Voir ma cagnotte') : null,
      nbEnfants ? h('a', { class: 'btn btn-block', href: '#/cagnotte?parent' }, `Côté parent : le registre (${plural(nbEnfants, 'enfant', 'enfants')})`) : null,
      h('h2', {}, 'Profils'),
      h('p', { class: 'muted small' }, 'Plusieurs élèves peuvent se partager cet appareil : chacun garde sa progression.'),
      h('a', { class: 'btn btn-block', href: '#/profils' }, `${monProfil.emoji || '🙂'} ${monProfil.nom} — changer de profil`),
      profiles.current() ? h('p', { class: 'muted small' }, 'C\'est ce prénom qui apparaît dans le bilan partagé avec un parent : renomme le profil pour le changer.') : null,
      h('h2', {}, '💻 Passer d\'un appareil à l\'autre'),
      h('p', { class: 'muted small' }, 'Sur l\'appareil où tu viens de travailler : « Copier ». Sur l\'autre : « Coller ». '
        + 'Les deux progressions sont réunies, cagnotte comprise : rien ne se perd, même si tu as travaillé des deux côtés. '
        + 'Entre deux Mac du même compte Apple, ce qui est copié sur l\'un se colle sur l\'autre.'),
      h('div', { class: 'row-buttons' }, copierBtn, collerBtn),
      carteMsg,
      h('details', { class: 'autres-transferts' }, h('summary', {}, 'Autres façons (fichier, copier-coller à la main)'),
        h('p', { class: 'muted small' }, 'La carte d\'identité : tout ce que tu as travaillé, dans un seul fichier. Rien n\'est envoyé : elle reste sur tes appareils.'),
        h('div', { class: 'row-buttons' }, telechargerBtn),
        h('p', { class: 'muted small' }, 'Fusionner une carte reçue :'), importFichier,
        manuel, h('div', { class: 'row-right' }, fusionnerBtn)),
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
