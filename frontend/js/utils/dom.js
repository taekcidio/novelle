// ═══════════════════════════════════════
// NOVELLE — DOM Utilities
// ═══════════════════════════════════════

/**
 * Query selector shorthand
 */
export const $ = (selector, parent = document) => parent.querySelector(selector);
export const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

/**
 * Create an element with attributes and children
 */
export function createElement(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);

  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'className') {
      el.className = value;
    } else if (key === 'dataset') {
      Object.assign(el.dataset, value);
    } else if (key.startsWith('on')) {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else {
      el.setAttribute(key, value);
    }
  }

  children.flat().forEach(child => {
    if (typeof child === 'string') {
      el.appendChild(document.createTextNode(child));
    } else if (child instanceof Node) {
      el.appendChild(child);
    }
  });

  return el;
}

/**
 * Delegate event listener
 */
export function delegate(parent, event, selector, handler) {
  const el = typeof parent === 'string' ? $(parent) : parent;
  if (!el) return;

  el.addEventListener(event, (e) => {
    const target = e.target.closest(selector);
    if (target && el.contains(target)) {
      handler.call(target, e, target);
    }
  });
}

/**
 * Wait for DOM ready
 */
export function onReady(fn) {
  if (document.readyState !== 'loading') {
    fn();
  } else {
    document.addEventListener('DOMContentLoaded', fn);
  }
}

/**
 * Set inner HTML safely and return container
 */
export function render(selector, html) {
  const el = typeof selector === 'string' ? $(selector) : selector;
  if (el) el.innerHTML = html;
  return el;
}
