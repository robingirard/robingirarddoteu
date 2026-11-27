// common.js — éléments partagés par les exercices
import { h } from '../dom.js';
import { renderRich } from '../render.js';

export function promptEl(item, figures) {
  return h('div', { class: 'prompt', html: renderRich(item.payload.prompt, figures) });
}

/** container.append(...) qui ignore null/false (Element.append(null) écrirait « null »). */
export function appendAll(container, ...children) {
  for (const c of children.flat()) if (c != null && c !== false) container.append(c);
}

export function verifyButton(onClick) {
  return h('button', { class: 'btn btn-primary btn-block btn-verify', type: 'button', disabled: true, onClick }, 'Vérifier');
}
