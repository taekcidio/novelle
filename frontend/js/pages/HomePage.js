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

    const categories = await safeLoad('Home categories', () => CategoryService.getAll());
    const stories = await safeLoad('Home stories', () => StoryService.getAll());
    const featured = await safeLoad('Home featured stories', () => StoryService.getFeatured());
    console.log('[Novelle Home] stories count', stories.length);
    await FavoritesService.load().catch(() => {});
    const inProgress = ProgressService.getAllInProgress();
    renderCategoryChips(categories);

    // Continue reading
    const continueSection = document.getElementById('continue-section');
    const continueGrid = document.getElementById('continue-grid');
    if (inProgress.length > 0 && continueGrid) {
      const continueCards = inProgress.slice(0, 3).map(p => {
        const story = stories.find(s => s.id === p.storyId);
        if (!story) return '';
        try {
          return renderStoryCard(story, { horizontal: true, showProgress: true, progress: 40 });
        } catch (error) {
          return '';
        }
      }).join('');
      continueGrid.innerHTML = continueCards;
    } else if (continueSection) {
      continueSection.style.display = 'none';
    }

    // Featured
    const featuredCards = renderCardsOrEmpty(featured, { featured: false });
    console.log('[Novelle Home] featured rendered count', countRenderedCards(featuredCards));
    const featuredGrid = document.getElementById('featured-grid');
    if (featuredGrid) featuredGrid.innerHTML = featuredCards;

    // All stories
    const storyCards = renderCardsOrEmpty(stories);
    console.log('[Novelle Home] all stories rendered count', countRenderedCards(storyCards));
    const allStoriesGrid = document.getElementById('all-stories-grid');
    if (allStoriesGrid) allStoriesGrid.innerHTML = storyCards;

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
      const filteredCards = renderCardsOrEmpty(filtered);
      console.log('[Novelle Home] filtered rendered count', cat, countRenderedCards(filteredCards));
      const grid = document.getElementById('all-stories-grid');
      if (grid) grid.innerHTML = filteredCards;
    });

    initScrollReveal();
  },
};

async function safeLoad(label, loader) {
  try {
    const result = await loader();
    return Array.isArray(result) ? result : [];
  } catch (error) {
    console.error(`[Novelle Home] ${label} failed`, error);
    return [];
  }
}

function renderCategoryChips(categories) {
  const container = document.getElementById('home-categories');
  if (!container) return;
  const safeCategories = Array.isArray(categories) ? categories : [];

  container.innerHTML = `
    <button class="chip active" data-category="all">Todas</button>
    ${safeCategories.map(category => `<button class="chip" data-category="${escapeHtml(getCategorySlug(category) || category.id)}">${escapeHtml(category.name)}</button>`).join('')}
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

function countRenderedCards(html) {
  return (html.match(/class="story-card/g) || []).length;
}
