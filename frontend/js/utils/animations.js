// ═══════════════════════════════════════
// NOVELLE — Animation Utilities
// ═══════════════════════════════════════

import { $$ } from './dom.js';

/**
 * Initialize scroll reveal (Intersection Observer)
 */
export function initScrollReveal() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
  );

  $$('.reveal').forEach((el) => observer.observe(el));
}

/**
 * Animate element in
 */
export function animateIn(element, animation = 'fadeIn', duration = 400) {
  return new Promise((resolve) => {
    element.style.animation = `${animation} ${duration}ms ease forwards`;
    setTimeout(() => {
      element.style.animation = '';
      resolve();
    }, duration);
  });
}

/**
 * Stagger children animation
 */
export function staggerChildren(parent, delay = 60) {
  const children = parent.children;
  Array.from(children).forEach((child, i) => {
    child.style.opacity = '0';
    child.style.animation = `slideUp 0.4s ease ${i * delay}ms forwards`;
  });
}

/**
 * Smooth scroll to element
 */
export function scrollTo(selector, offset = 80) {
  const el = typeof selector === 'string' ? document.querySelector(selector) : selector;
  if (el) {
    const top = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: 'smooth' });
  }
}
