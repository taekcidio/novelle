// ═══════════════════════════════════════
// NOVELLE — Ending Page
// ═══════════════════════════════════════

import { router } from '../router.js';
import { StoryService } from '../services/StoryService.js';
import { ProgressService } from '../services/ProgressService.js';
import { $ } from '../utils/dom.js';
import { icon } from '../utils/icons.js';
import { displayText } from '../utils/helpers.js';

export const EndingPage = {
  render(params) {
    return `
      <div class="ending page--no-nav page--centered anim-fade-in">
        <div id="ending-content" style="text-align:center;max-width:600px;padding:40px 20px">
          <div class="skeleton skeleton--title" style="margin:0 auto"></div>
        </div>
      </div>
    `;
  },

  async init(params) {
    const storyId = params.id;
    const endingId = router.getQuery().ending;
    const story = await StoryService.getById(storyId);
    const ending = story?.endings?.find(e => e.id === endingId);

    if (!ending) { router.navigate('/home'); return; }

    const totalEndings = story.endings.length;
    const endingIndex = story.endings.indexOf(ending) + 1;
    const path = ProgressService.getDecisionPath(storyId);

    const container = $('#ending-content');
    container.innerHTML = `
      <div class="ending__badge">Final ${endingIndex} de ${totalEndings}</div>
      <h1 class="ending__title anim-slide-up">${displayText(ending.title, 'Final')}</h1>
      <p class="ending__text anim-fade-in">${ending.content}</p>

      ${path.length > 0 ? `
        <div class="ending__path anim-fade-in">
          <p class="ending__path-title">Tu camino narrativo</p>
          ${path.map((p, i) => `<div class="ending__path-step">Decisión ${i + 1}</div>`).join('')}
        </div>
      ` : ''}

      <div class="ending__actions anim-slide-up">
        <button class="btn btn--primary btn--lg" id="ending-restart">
          ${icon('refresh')} Leer de nuevo
        </button>
        <button class="btn btn--secondary btn--lg" id="ending-explore">
          ${icon('compass')} Explorar más
        </button>
      </div>
    `;

    $('#ending-restart')?.addEventListener('click', () => router.navigate(`/story/${storyId}`));
    $('#ending-explore')?.addEventListener('click', () => router.navigate('/explore'));
  },
};
