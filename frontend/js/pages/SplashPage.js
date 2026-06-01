// ═══════════════════════════════════════
// NOVELLE — Splash Page
// ═══════════════════════════════════════

import { router } from '../router.js';
import { CONFIG } from '../config.js';

export const SplashPage = {
  render() {
    return `
      <div class="splash page--no-nav page--centered">
        <h1 class="splash__logo">Novelle</h1>
        <p class="splash__tagline">${CONFIG.APP_TAGLINE}</p>
        <div class="splash__illustration">
          <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="100" cy="100" r="80" stroke="var(--text-primary)" stroke-width="1.5" stroke-dasharray="4 4" opacity="0.3"/>
            <rect x="65" y="50" width="70" height="95" rx="4" stroke="var(--text-primary)" stroke-width="2"/>
            <line x1="75" y1="70" x2="125" y2="70" stroke="var(--text-primary)" stroke-width="1.5" opacity="0.5"/>
            <line x1="75" y1="82" x2="120" y2="82" stroke="var(--text-primary)" stroke-width="1.5" opacity="0.4"/>
            <line x1="75" y1="94" x2="115" y2="94" stroke="var(--text-primary)" stroke-width="1.5" opacity="0.3"/>
            <line x1="75" y1="106" x2="110" y2="106" stroke="var(--text-primary)" stroke-width="1.5" opacity="0.2"/>
            <path d="M85 120 L100 112 L115 120" stroke="var(--accent)" stroke-width="2" fill="none" stroke-linecap="round"/>
            <circle cx="100" cy="160" r="3" fill="var(--text-primary)" opacity="0.3"/>
          </svg>
        </div>
        <div class="splash__loader"></div>
      </div>
    `;
  },

  init() {
    setTimeout(() => {
      router.navigate('/home');
    }, CONFIG.SPLASH_DURATION);
  },
};
