// ═══════════════════════════════════════
// NOVELLE — Home Page
// ═══════════════════════════════════════

import { store } from '../store.js';
import { renderNavbar, initNavbar } from '../components/Navbar.js';
import { renderSidebar, initSidebar } from '../components/Sidebar.js';
import { renderStoryCard, renderStoryCards } from '../components/StoryCard.js';
import { StoryService } from '../services/StoryService.js';
import { CategoryService, getCategorySlug, normalizeCategoryName } from '../services/CategoryService.js';
import { ProgressService } from '../services/ProgressService.js';
import { FavoritesService } from '../services/FavoriteService.js';
import { router } from '../router.js';
import { delegate } from '../utils/dom.js';
import { initScrollReveal } from '../utils/animations.js';
import { escapeHtml } from '../utils/helpers.js';

export const HomePage = {
  render() {
    const user = store.get('user');
    const name = user?.name?.split(' ')[0] || 'Lector';

    return `
      ${renderNavbar()}
      ${renderSidebar()}
      <main class="page">
        <div class="container">
          <div class="home__hero">
            <p class="home__greeting">Hola, ${escapeHtml(name)}</p>
            <h1 class="home__title">¿Qué historia vivirás hoy?</h1>
          </div>

          <!-- Categories -->
          <div class="home__categories" id="home-categories">
            <button class="chip active" data-category="all">Todas</button>
          </div>

          <!-- Continue Reading -->
          <section class="reveal" id="continue-section">
            <div class="home__section-header">
              <h2>Continúa leyendo</h2>
              <a href="#/library">Ver todo</a>
            </div>
            <div id="continue-grid" class="grid-3"></div>
          </section>

          <!-- Featured -->
          <section class="section reveal">
            <div class="home__section-header">
              <h2>Destacadas</h2>
              <a href="#/explore">Ver todo</a>
            </div>
            <div id="featured-grid" class="grid-3"></div>
          </section>

          <!-- All Stories -->
          <section class="section reveal">
            <div class="home__section-header">
              <h2>Todas las historias</h2>
            </div>
            <div id="all-stories-grid" class="grid-4 stagger-children"></div>
          </section>
        </div>
      </main>
    `;
  },

  async init() {
    initNavbar();
    initSidebar();

    const categories = await CategoryService.getAll();
    const stories = await StoryService.getAll();
    const featured = await StoryService.getFeatured();
    await FavoritesService.load().catch(() => {});
    const inProgress = ProgressService.getAllInProgress();
    renderCategoryChips(categories);

    // Continue reading
    const continueSection = document.getElementById('continue-section');
    if (inProgress.length > 0) {
      const continueCards = inProgress.slice(0, 3).map(p => {
        const story = stories.find(s => s.id === p.storyId);
        if (!story) return '';
        try {
          return renderStoryCard(story, { horizontal: true, showProgress: true, progress: 40 });
        } catch (error) {
          return '';
        }
      }).join('');
      document.getElementById('continue-grid').innerHTML = continueCards;
    } else {
      continueSection.style.display = 'none';
    }

    // Featured
    document.getElementById('featured-grid').innerHTML =
      renderCardsOrEmpty(featured, { featured: false });

    // All stories
    document.getElementById('all-stories-grid').innerHTML =
      renderCardsOrEmpty(stories);

    // Card clicks
    delegate(document, 'click', '.story-card', (e, card) => {
      const storyId = card.dataset.storyId;
      if (storyId) router.navigate(`/story/${storyId}`);
    });

    // Category filter
    delegate(document, 'click', '.chip[data-category]', async (e, chip) => {
      document.querySelectorAll('.chip[data-category]').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');

      const cat = chip.dataset.category;
      const filtered = stories.filter(story => storyMatchesCategory(story, cat, categories));
      document.getElementById('all-stories-grid').innerHTML =
        renderCardsOrEmpty(filtered);
    });

    initScrollReveal();
  },
};

function renderCategoryChips(categories) {
  const container = document.getElementById('home-categories');
  if (!container) return;

  container.innerHTML = `
    <button class="chip active" data-category="all">Todas</button>
    ${categories.map(category => `<button class="chip" data-category="${escapeHtml(getCategorySlug(category) || category.id)}">${escapeHtml(category.name)}</button>`).join('')}
  `;
}

function storyMatchesCategory(story, categoryRef, categories = []) {
  if (!categoryRef || categoryRef === 'all') return true;

  const normalizedRef = normalizeCategoryAlias(categoryRef);
  const category = CategoryService.findForStory(story, categories);
  const candidates = [
    story.category_id,
    story.category,
    story.categoryName,
    category?.id,
    category?.name,
    category ? getCategorySlug(category) : null,
  ].filter(Boolean).map(normalizeCategoryAlias);

  return candidates.includes(normalizedRef);
}

function normalizeCategoryAlias(value) {
  const normalized = normalizeCategoryName(value);
  const aliases = {
    horror: 'terror',
    terror: 'terror',
    romance: 'romance',
    romantica: 'romance',
    drama: 'drama',
    mystery: 'misterio',
    misterio: 'misterio',
    fantasy: 'fantasia',
    fantasia: 'fantasia',
    scifi: 'ciencia-ficcion',
    'sci-fi': 'ciencia-ficcion',
    'science-fiction': 'ciencia-ficcion',
    'ciencia-ficcion': 'ciencia-ficcion',
  };
  return aliases[normalized] || normalized;
}

function renderEmptyStories() {
  return `
    <div class="empty-state" style="grid-column:1/-1">
      <h3 class="empty-state__title">Sin historias</h3>
      <p class="empty-state__text">Aún no hay historias publicadas en Supabase.</p>
    </div>
  `;
}

function renderCardsOrEmpty(stories, options = {}) {
  const cards = renderStoryCards(stories, options);
  return cards.trim() ? cards : renderEmptyStories();
}
