// mech-anim.js — schémas cinématiques animés. Chaque classe d'équivalence du schéma (groupe
// g.mech[data-class="E1"], produit par le build d'après la couleur des tracés) reçoit à chaque image
// une transformation rigide calculée d'après CONTENT.animations[id de figure] : boîte du dessin en cm
// (`bbox`), bord en points (`border`), durée d'un cycle (`duration`, s) et mouvement de chaque classe
// (`fixed`, `rotate`, `translate`, `follow`, `coupler`, `slider`, `rocker` : balancier d'un quadrilatère
// articulé, `aim` : pièce qui pivote pour viser un point mobile, avec `slide` pour la tige d'un vérin,
// `attach` : translation qui suit un point d'une autre classe, `track` : idem projetée sur une direction,
// `dash` : courroie dont les tirets défilent).
// Partie géométrique pure (testable),
// puis pilote DOM (requestAnimationFrame), déclenché par anim.js (survol, toucher, bouton de leçon).

export const K = 72 / 2.54;   // points par centimètre : les SVG produits par le build sont en points
const TAU = 2 * Math.PI;

let animations = {};          // id de figure → spécification
export function configure({ animations: a } = {}) { if (a !== undefined) animations = a || {}; }
export function specOf(id) { return (id && animations[id]) || null; }

/** Point (cm, repère du dessin TikZ) → unités utilisateur du SVG : bord + boîte fixe, y vers le bas. */
export function toSvg(pt, spec) {
  const [x0, , , y1] = spec.bbox;
  const b = spec.border == null ? 4 : Number(spec.border);
  return [b + (pt[0] - x0) * K, b + (y1 - pt[1]) * K];
}

// ------------------------------------------------------------------ matrices affines 2D (convention SVG)
export const IDENTITY = Object.freeze({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });

/** Produit M·N : applique N puis M. */
export function mul(M, N) {
  return {
    a: M.a * N.a + M.c * N.b, b: M.b * N.a + M.d * N.b,
    c: M.a * N.c + M.c * N.d, d: M.b * N.c + M.d * N.d,
    e: M.a * N.e + M.c * N.f + M.e, f: M.b * N.e + M.d * N.f + M.f,
  };
}
export function translate(tx, ty) { return { a: 1, b: 0, c: 0, d: 1, e: tx, f: ty }; }

/** Rotation en unités SVG (radians ; positif = sens horaire à l'écran, l'axe y pointant vers le bas). */
export function rotSvg(rad, cx, cy) {
  const cos = Math.cos(rad), sin = Math.sin(rad);
  return { a: cos, b: sin, c: -sin, d: cos, e: cx - cos * cx + sin * cy, f: cy - sin * cx - cos * cy };
}
/** Rotation exprimée dans le repère du dessin (degrés, sens trigonométrique) : angle SVG opposé. */
export function rotateAbout(deg, cx, cy) { return rotSvg((-deg * Math.PI) / 180, cx, cy); }
export function apply(M, p) { return [M.a * p[0] + M.c * p[1] + M.e, M.b * p[0] + M.d * p[1] + M.f]; }
export function toAttr(M) {
  const r = (v) => (Math.abs(v) < 1e-9 ? 0 : Number(v.toFixed(4)));
  return `matrix(${[M.a, M.b, M.c, M.d, M.e, M.f].map(r).join(' ')})`;
}

function unit(v) { const [x, y] = v || [1, 0]; const n = Math.hypot(x, y) || 1; return [x / n, y / n]; }
function dirSvg(v) { const [x, y] = unit(v); return [x, -y]; }   // direction du dessin → SVG (y inversé)

/** Mouvements élémentaires : fixed, rotate (continu par `turns` ou oscillant par `amplitude`), translate. */
function basic(c, spec, t) {
  switch (c && c.motion) {
    case 'rotate': {
      const [cx, cy] = toSvg(c.center || [0, 0], spec);
      const deg = (Number(c.offset) || 0)   // angle moyen (ex. benne oscillant entre 0° et 30° : offset 15, amplitude 15)
        + (c.turns ? c.turns * 360 * t : (Number(c.amplitude) || 0) * Math.sin(TAU * (t + (Number(c.phase) || 0))));
      return rotateAbout(deg, cx, cy);
    }
    case 'translate': {
      const d = dirSvg(c.dir);
      const s = (Number(c.amplitude) || 0) * Math.sin(TAU * (t + (Number(c.phase) || 0))) * K;
      return translate(d[0] * s, d[1] * s);
    }
    default: return IDENTITY;
  }
}

/** Point B d'un coulisseau : sur la droite (B0, dir), à la distance L de A, solution la plus proche de B0. */
export function sliderPoint(A, B0, dir, L) {
  const w = [B0[0] - A[0], B0[1] - A[1]];
  const wd = w[0] * dir[0] + w[1] * dir[1];
  const disc = wd * wd - (w[0] * w[0] + w[1] * w[1] - L * L);
  let s;
  if (disc < 0) s = -wd;   // hors d'atteinte (ne devrait pas arriver) : point de la droite le plus proche, jamais NaN
  else {
    const r = Math.sqrt(disc);
    const s1 = -wd + r, s2 = -wd - r;
    s = Math.abs(s1) <= Math.abs(s2) ? s1 : s2;
  }
  return [B0[0] + s * dir[0], B0[1] + s * dir[1]];
}

/** Courroie (`dash`) : motif de tirets (unités SVG) et décalage à l'instant t. `speed` en points par seconde
 *  le long du tracé (positif = sens de tracé) ; la distance par cycle est arrondie à un nombre entier de
 *  motifs pour que le défilement reboucle sans saut. */
export const DASH_PATTERN = [7, 4];
export function dashAt(c, spec, t) {
  const P = DASH_PATTERN[0] + DASH_PATTERN[1];
  const duration = Math.max(0.5, Number(spec.duration) || 4);
  const perCycle = Math.round(((Number(c.speed) || 0) * duration) / P) * P;
  return { dasharray: DASH_PATTERN.join(' '), dashoffset: -perCycle * t };
}

/** Point B d'un balancier : à distance r du pivot et L de A, du même côté (orientation) que la position dessinée. */
export function rockerPoint(A, pivot, r, L, sign) {
  const dx = pivot[0] - A[0], dy = pivot[1] - A[1];
  const d = Math.hypot(dx, dy) || 1e-9;
  const ux = dx / d, uy = dy / d;
  const a = (L * L - r * r + d * d) / (2 * d);       // abscisse du milieu de la corde depuis A
  const h = Math.sqrt(Math.max(0, L * L - a * a));     // hors d'atteinte : h = 0, point sur la ligne des centres
  const M = [A[0] + a * ux, A[1] + a * uy];
  const c1 = [M[0] - h * uy, M[1] + h * ux], c2 = [M[0] + h * uy, M[1] - h * ux];
  const orient = (B) => Math.sign((B[0] - A[0]) * (B[1] - pivot[1]) - (B[1] - A[1]) * (B[0] - pivot[0]));
  return orient(c1) === sign ? c1 : c2;
}
const orientation = (A, B, P) => Math.sign((B[0] - A[0]) * (B[1] - P[1]) - (B[1] - A[1]) * (B[0] - P[0]));

/** Pose de chaque classe à l'instant t ∈ [0,1) : { id: matrice SVG }. Lève une erreur en cas de cycle. */
export function poseAt(spec, t) {
  const classes = spec.classes || {};
  const memo = {};
  const points = {};          // bielles : { A0, B0, A, B } en SVG
  const visiting = new Set();
  const pose = (id) => {
    if (memo[id]) return memo[id];
    if (visiting.has(id)) throw new Error(`cycle dans l'animation : ${id}`);
    visiting.add(id);
    const c = classes[id] || { motion: 'fixed' };
    let M;
    switch (c.motion) {
      case 'follow': {
        const base = pose(c.of);
        M = c.then ? mul(base, basic(c.then, spec, t)) : base;
        break;
      }
      case 'coupler': {   // bielle entre un point A de la manivelle et un point B du coulisseau (ou du balancier)
        const A0 = toSvg(c.a, spec), B0 = toSvg(c.b, spec);
        const A = apply(pose(c.crank), A0);
        const out = classes[c.slider] || {};
        const L = Math.hypot(B0[0] - A0[0], B0[1] - A0[1]);
        let B;
        if (out.motion === 'rocker') {
          const P = toSvg(out.pivot || [0, 0], spec);
          B = rockerPoint(A, P, Math.hypot(B0[0] - P[0], B0[1] - P[1]), L, orientation(A0, B0, P));
        } else B = sliderPoint(A, B0, dirSvg(out.dir), L);
        const phi0 = Math.atan2(B0[1] - A0[1], B0[0] - A0[0]);
        const phi = Math.atan2(B[1] - A[1], B[0] - A[0]);
        M = mul(translate(A[0] - A0[0], A[1] - A0[1]), rotSvg(phi - phi0, A0[0], A0[1]));
        points[id] = { A0, B0, A, B };
        break;
      }
      case 'slider': {    // coulisseau entraîné par sa bielle
        pose(c.coupler);
        const p = points[c.coupler];
        M = p ? translate(p.B[0] - p.B0[0], p.B[1] - p.B0[1]) : IDENTITY;
        break;
      }
      case 'rocker': {    // balancier : tourne autour de son pivot fixe pour suivre le point B de sa bielle
        pose(c.coupler);
        const p = points[c.coupler];
        const P = toSvg(c.pivot || [0, 0], spec);
        M = p ? rotSvg(Math.atan2(p.B[1] - P[1], p.B[0] - P[0]) - Math.atan2(p.B0[1] - P[1], p.B0[0] - P[0]), P[0], P[1]) : IDENTITY;
        break;
      }
      case 'attach':      // pièce qui suit, sans tourner, le point `point` de la classe `of` (écrou au bout d'une barre)
      case 'track': {     // idem, mais seule la composante le long de `dir` est conservée (vis qui monte avec ses écrous)
        const Q0 = toSvg(c.point || [0, 0], spec);
        const Q = apply(pose(c.of), Q0);
        let dx = Q[0] - Q0[0], dy = Q[1] - Q0[1];
        if (c.motion === 'track') { const d = dirSvg(c.dir); const s = dx * d[0] + dy * d[1]; dx = s * d[0]; dy = s * d[1]; }
        M = translate(dx, dy);
        break;
      }
      case 'aim': {       // corps de vérin : pivote autour de `pivot` pour viser le point `point` de la classe `at` ;
        const P = toSvg(c.pivot || [0, 0], spec);                    // tige (`slide`) : glisse en plus jusqu'à ce point
        const Q0 = toSvg(c.point || [0, 0], spec);
        const Q = apply(pose(c.at), Q0);
        const R = rotSvg(Math.atan2(Q[1] - P[1], Q[0] - P[0]) - Math.atan2(Q0[1] - P[1], Q0[0] - P[0]), P[0], P[1]);
        if (c.slide) { const RQ0 = apply(R, Q0); M = mul(translate(Q[0] - RQ0[0], Q[1] - RQ0[1]), R); } else M = R;
        break;
      }
      default:
        M = basic(c, spec, t);
    }
    visiting.delete(id);
    memo[id] = M;
    return M;
  };
  for (const id of Object.keys(classes)) pose(id);
  return memo;
}

// ------------------------------------------------------------------ pilote DOM
const running = new Map();   // svg → { raf, start, caption }

function reducedMotion() {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}
export function isPlaying(svg) { return running.has(svg); }

/** Lance l'animation d'un schéma (svg[data-mech]) ; retourne vrai si elle a démarré. */
export function play(svg) {
  if (!svg || running.has(svg) || reducedMotion()) return false;
  const spec = specOf(svg.dataset && svg.dataset.mech);
  if (!spec || typeof requestAnimationFrame !== 'function') return false;
  const groups = [...svg.querySelectorAll('g.mech[data-class]')];
  const duration = Math.max(0.5, Number(spec.duration) || 4) * 1000;
  const state = { raf: 0, start: performance.now(), caption: null };
  if (spec.legende && svg.parentElement && !svg.parentElement.querySelector(':scope > .mech-legende')) {
    const cap = document.createElement('div');
    cap.className = 'mech-legende';
    cap.textContent = spec.legende;
    svg.parentElement.append(cap);
    state.caption = cap;
  }
  const frame = (now) => {
    if (!svg.isConnected) { stop(svg); return; }
    const t = ((((now - state.start) / duration) % 1) + 1) % 1;
    let poses;
    try { poses = poseAt(spec, t); } catch (err) { console.error(err); stop(svg); return; }
    for (const g of groups) {
      const c = spec.classes && spec.classes[g.dataset.class];
      if (c && c.motion === 'dash') {
        const d = dashAt(c, spec, t);
        g.setAttribute('stroke-dasharray', d.dasharray);
        g.setAttribute('stroke-dashoffset', d.dashoffset.toFixed(2));
        continue;
      }
      const M = poses[g.dataset.class];
      if (M) g.setAttribute('transform', toAttr(M));
    }
    state.raf = requestAnimationFrame(frame);
  };
  running.set(svg, state);
  svg.classList.add('mech-playing');
  if (svg.parentElement) svg.parentElement.classList.add('mech-on');   // masque la pastille ▶ pendant la lecture
  state.raf = requestAnimationFrame(frame);
  return true;
}

/** Arrête l'animation et remet le schéma dans sa position dessinée. */
export function stop(svg) {
  const state = running.get(svg);
  if (!state) return;
  if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(state.raf);
  running.delete(svg);
  svg.classList.remove('mech-playing');
  if (svg.parentElement) svg.parentElement.classList.remove('mech-on');
  for (const g of svg.querySelectorAll('g.mech[data-class]')) { g.removeAttribute('transform'); g.removeAttribute('stroke-dasharray'); g.removeAttribute('stroke-dashoffset'); }
  if (state.caption && state.caption.parentNode) state.caption.remove();
}
export function setPlaying(svg, on) { if (on) return play(svg); stop(svg); return false; }
export function stopAll() { for (const svg of [...running.keys()]) stop(svg); }

/** Aligne les schémas d'un corps de leçon sur l'état du bouton (sans arrêter ceux basculés au toucher). */
export function syncLesson(body, on) {
  if (!body || typeof body.querySelectorAll !== 'function') return;
  for (const svg of body.querySelectorAll('svg[data-mech]')) setPlaying(svg, on || (svg.classList && svg.classList.contains('playing')));
}
