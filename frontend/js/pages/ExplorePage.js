// NOVELLE - Explore Page

import { renderNavbar, initNavbar } from '../components/Navbar.js';
import { renderSidebar, initSidebar } from '../components/Sidebar.js';
import { renderStoryCards } from '../components/StoryCard.js';
import { StoryService } from '../services/StoryService.js';
import { CategoryService, getCategorySlug, normalizeCategoryName } from '../services/CategoryService.js';
import { FavoritesService } from '../services/FavoriteService.js';
import { router } from '../router.js';
import { delegate } from '../utils/dom.js';
import { debounce, escapeHtml } from '../utils/helpers.js';
import { icon } from '../utils/icons.js';

export const ExplorePage = {
  render() {
    return `
      ${renderNavbar()}
      ${renderSidebar()}
      <main class="page">
        <div class="container">
          <div class="explore__header">
            <h1 class="explore__title">Explorar historias</h1>
            <div class="explore__search">
              ${icon('search')}
              <input type="text" placeholder="Buscar por titulo, autor o tema..." id="explore-search" />
            </div>
            <div class="explore__filters" id="explore-filters">
              <button class="chip active" data-filter="all">Todas</button>
            </div>
          </div>
          <div class="explore__grid stagger-children" id="explore-grid"></div>
        </div>
      </main>
    `;
  },

  async init(params = {}) {
    initNavbar();
    initSidebar();

    const categories = await CategoryService.getAll();
    const allStories = await StoryService.getAll();
    await FavoritesService.load().catch(() => {});
    const queryParams = router.getQuery();
    const query = queryParams.q || '';
    let activeCategory = params.slug || queryParams.category || 'all';

    renderFilterChips(categories, activeCategory);

    const searchInput = document.getElementById('explore-search');
    if (query && searchInput) {
      searchInput.value = query;
    }

    renderGrid(filterStories(allStories, categories, activeCategory, query), activeCategory !== 'all');

    searchInput?.addEventListener('input', debounce(() => {
      const q = searchInput.value.trim();
      renderGrid(filterStories(allStories, categories, activeCategory, q), activeCategory !== 'all');
    }, 300));

    delegate(document, 'click', '#explore-filters .chip[data-filter]', (e, chip) => {
      document.querySelectorAll('#explore-filters .chip[data-filter]').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      activeCategory = chip.dataset.filter;
      const q = searchInput?.value.trim() || '';
      renderGrid(filterStories(allStories, categories, activeCategory, q), activeCategory !== 'all');
    });

    delegate(document, 'click', '.story-card', (e, card) => {
      const storyId = card.dataset.storyId;
      if (storyId) router.navigate(`/story/${storyId}`);
    });
  },
};

function renderFilterChips(categories, activeCategory) {
  const filters = document.getElementById('explore-filters');
  if (!filters) return;

  const isAllActive = !activeCategory || activeCategory === 'all';
  filters.innerHTML = `
    <button class="chip ${isAllActive ? 'active' : ''}" data-filter="all">Todas</button>
    ${categories.map(category => {
      const slug = getCategorySlug(category) || category.id;
      const isActive = storyMatchesCategory(
        { category_id: category.id, category: slug, categoryName: category.name },
        activeCategory,
        categories
      );
      return `<button class="chip ${isActive && !isAllActive ? 'active' : ''}" data-filter="${escapeHtml(slug)}">${escapeHtml(category.name)}</button>`;
    }).join('')}
  `;
}

function filterStories(stories, categories, categoryRef = 'all', query = '') {
  const normalizedQuery = query.trim().toLowerCase();
  return stories.filter(story => {
    const matchesCategory = storyMatchesCategory(story, categoryRef, categories);
    const matchesQuery = !normalizedQuery
      || story.title?.toLowerCase().includes(normalizedQuery)
      || story.description?.toLowerCase().includes(normalizedQuery)
      || story.author?.toLowerCase().includes(normalizedQuery);
    return matchesCategory && matchesQuery;
  });
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

function renderGrid(stories, categoryScoped = false) {
  const grid = document.getElementById('explore-grid');
  if (!grid) return;

  if (stories.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-state__icon">${icon('search')}</div>
        <h3 class="empty-state__title">${categoryScoped ? 'Aun no hay historias en esta categoria.' : 'Sin resultados'}</h3>
        <p class="empty-state__text">${categoryScoped ? 'Cuando se publique una historia aqui, aparecera en esta seccion.' : 'No encontramos historias con esos criterios. Intenta con otra busqueda.'}</p>
      </div>
    `;
    return;
  }

  const cards = renderStoryCards(stories);
  grid.innerHTML = cards.trim() ? cards : `
    <div class="empty-state" style="grid-column:1/-1">
      <div class="empty-state__icon">${icon('search')}</div>
      <h3 class="empty-state__title">Sin resultados</h3>
      <p class="empty-state__text">No pudimos mostrar historias con esos datos.</p>
    </div>
  `;
}
