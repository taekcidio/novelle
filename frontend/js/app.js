// ═══════════════════════════════════════
// NOVELLE — Main App Entry Point
// ═══════════════════════════════════════

import { router } from './router.js';
import { store } from './store.js';
import { AuthService } from './services/AuthService.js';
import { FavoritesService } from './services/FavoriteService.js';
import { icon } from './utils/icons.js';

// Pages
import { SplashPage } from './pages/SplashPage.js';
import { LoginPage } from './pages/LoginPage.js';
import { RegisterPage } from './pages/RegisterPage.js';
import { HomePage } from './pages/HomePage.js';
import { ExplorePage } from './pages/ExplorePage.js';
import { CreateStoryPage } from './pages/CreateStoryPage.js';
import { EditStoryPage } from './pages/EditStoryPage.js';
import { ReaderPage } from './pages/ReaderPage.js';
import { EndingPage } from './pages/EndingPage.js';
import {
  CategoriesPage,
  ProfilePage,
  DashboardPage,
  FavoritesPage,
  LibraryPage,
  HistoryPage,
  SettingsPage,
} from './pages/OtherPages.js';

// ─── Initialize Theme ──────────────
function initTheme() {
  const theme = store.get('theme') || 'light';
  document.body.setAttribute('data-theme', theme);
}

// ─── Register Routes ────────────────
function initRouter() {
  router
    .on('/', SplashPage)
    .on('/splash', SplashPage)
    .on('/login', LoginPage)
    .on('/register', RegisterPage)
    .on('/home', HomePage)
    .on('/explore', ExplorePage)
    .on('/create', CreateStoryPage)
    .on('/edit-story/:id', EditStoryPage)
    .on('/categories/:slug', ExplorePage)
    .on('/categories', CategoriesPage)
    .on('/story/:id', ReaderPage)
    .on('/ending/:id', EndingPage)
    .on('/profile', ProfilePage)
    .on('/dashboard', DashboardPage)
    .on('/favorites', FavoritesPage)
    .on('/library', LibraryPage)
    .on('/history', HistoryPage)
    .on('/settings', SettingsPage)
    .onNotFound({
      render: () => `
        <div class="page--centered page--no-nav" style="text-align:center">
          <h1 class="heading-1">404</h1>
          <p class="text-secondary mt-4">Página no encontrada</p>
          <a href="#/home" class="btn btn--primary mt-8">Volver al inicio</a>
        </div>
      `,
    })
    .init('#app');
}

function initFavoriteButtons() {
  document.addEventListener('click', async (event) => {
    const button = event.target.closest('.story-card__fav');
    if (!button) return;

    event.preventDefault();
    event.stopPropagation();

    const storyId = button.dataset.storyId;
    if (!storyId || button.disabled) return;

    button.disabled = true;
    try {
      const isFavorite = await FavoritesService.toggleFavorite(storyId);
      updateFavoriteButtons(storyId, isFavorite);
      removeUnfavoritedCardIfNeeded(button, isFavorite);
    } finally {
      button.disabled = false;
    }
  }, true);
}

function updateFavoriteButtons(storyId, isFavorite) {
  document.querySelectorAll(`.story-card__fav[data-story-id="${storyId}"]`).forEach(button => {
    button.classList.toggle('is-active', isFavorite);
    button.setAttribute('aria-label', isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos');
    button.setAttribute('aria-pressed', String(isFavorite));
    button.innerHTML = isFavorite ? icon('heartFilled') : icon('heart');
  });
}

function removeUnfavoritedCardIfNeeded(button, isFavorite) {
  if (isFavorite) return;

  const isFavoritesView = router.getPath() === '/favorites';
  const isProfileFavorites = router.getPath() === '/profile'
    && document.querySelector('.tab[data-tab="favorites"]')?.classList.contains('active');

  if (!isFavoritesView && !isProfileFavorites) return;

  const card = button.closest('.story-card');
  card?.closest('.profile-story')?.remove();
  card?.remove();

  const grid = document.getElementById('favs-grid');
  if (grid && !grid.querySelector('.story-card')) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-state__icon">${icon('heart')}</div><h3 class="empty-state__title">Sin favoritos</h3><p class="empty-state__text">Explora historias y marca las que mas te gusten.</p></div>`;
  }
}

// ─── Start ──────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  AuthService.onAuthStateChanged(() => {
    FavoritesService.load();
  });
  initFavoriteButtons();
  initRouter();
});
