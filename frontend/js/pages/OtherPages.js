// ═══════════════════════════════════════
// NOVELLE — Remaining Pages
// ═══════════════════════════════════════
// Categories, Profile, Dashboard, Favorites, Library, History, Settings

import { renderNavbar, initNavbar } from '../components/Navbar.js';
import { renderSidebar, initSidebar } from '../components/Sidebar.js';
import { showToast } from '../components/Toast.js';
import { renderStoryCard, renderStoryCards } from '../components/StoryCard.js';
import { store } from '../store.js';
import { router } from '../router.js';
import { CategoryService } from '../services/CategoryService.js';
import { StoryService } from '../services/StoryService.js';
import { AuthService } from '../services/AuthService.js';
import { FavoritesService } from '../services/FavoriteService.js';
import { HistoryService, ProgressService } from '../services/ProgressService.js';
import { ProfileService } from '../services/ProfileService.js';
import { delegate } from '../utils/dom.js';
import { icon } from '../utils/icons.js';
import { initScrollReveal } from '../utils/animations.js';
import { displayText, escapeHtml as escapeHtmlValue } from '../utils/helpers.js';

// ─── Categories ─────────────────────
export const CategoriesPage = {
  render() {
    return `
      ${renderNavbar()}${renderSidebar()}
      <main class="page"><div class="container">
        <div class="explore__header">
          <h1 class="explore__title">Categorías</h1>
          <p class="section__subtitle">Encuentra historias según tu género favorito</p>
        </div>
        <div class="categories-page__grid stagger-children" id="categories-grid">
          <div class="empty-state">
            <p class="empty-state__text">Cargando categorias...</p>
          </div>
        </div>
      </div></main>
    `;
  },
  async init() {
    initNavbar(); initSidebar();
    const grid = document.getElementById('categories-grid');
    const categories = await safeArray('CategoriesPage categories', () => CategoryService.getAll());

    if (grid) {
      grid.innerHTML = categories.length
        ? categories.map(c => `
          <div class="categories-page__card" data-category="${escapeAttr(c.slug || c.id)}">
            <h3 class="categories-page__card-name">${escapeHtml(c.name)}</h3>
            <p class="categories-page__card-count">${c.stories_count || 0} historias</p>
          </div>
        `).join('')
        : `
          <div class="empty-state" style="grid-column:1/-1">
            <div class="empty-state__icon">${icon('book')}</div>
            <h3 class="empty-state__title">Sin categorias</h3>
            <p class="empty-state__text">No se pudieron cargar categorias reales desde Supabase.</p>
          </div>
        `;
    }

    delegate(document, 'click', '.categories-page__card', (e, card) => {
      const category = card.dataset.category;
      if (category) router.navigate(`/categories/${category}`);
    });
  },
};

// ─── Profile ────────────────────────
export const ProfilePage = {
  render() {
    const u = getProfileUser();
    const avatarMarkup = u.avatar
      ? `<img src="${escapeAttr(u.avatar)}" alt="${escapeAttr(u.name)}" />`
      : escapeHtml(u.initials);
    const bannerStyle = u.banner ? ` style="background-image:url('${escapeAttr(u.banner)}')"` : '';
    return `
      ${renderNavbar()}${renderSidebar()}
      <main class="page profile"><div class="container container--lg">
        <div class="profile__header anim-fade-in">
          <div class="profile__banner ${u.banner ? 'has-image' : ''}" id="profile-banner"${bannerStyle}></div>
          <div class="profile__identity">
            <div class="avatar avatar--2xl profile__avatar" id="profile-avatar">${avatarMarkup}</div>
            <div class="profile__copy">
              <div class="profile__title-row">
                <div>
                  <h1 class="profile__name" id="profile-name">${escapeHtml(u.name)}</h1>
                  <p class="profile__username" id="profile-username">@${escapeHtml(u.username)}</p>
                </div>
                <button class="btn btn--secondary btn--sm" id="edit-profile-btn">${icon('settings')} Editar perfil</button>
              </div>
              <p class="profile__bio" id="profile-bio">${escapeHtml(u.bio || 'Aún no has escrito una bio.')}</p>
            </div>
          </div>
          <div class="profile__stats">
            <div class="profile__stat"><div class="profile__stat-value" id="profile-created-count">0</div><div class="profile__stat-label">Historias creadas</div></div>
            <div class="profile__stat"><div class="profile__stat-value">${Number(u.stats.decisionsTotal || 0)}</div><div class="profile__stat-label">Decisiones tomadas</div></div>
            <div class="profile__stat"><div class="profile__stat-value">${Number(u.stats.endingsUnlocked || 0)}</div><div class="profile__stat-label">Finales alcanzados</div></div>
          </div>
        </div>
        <div class="profile__tabs" id="profile-tabs">
          <button class="tab active" data-tab="created">Historias creadas</button>
          <button class="tab" data-tab="saved">Historias guardadas</button>
          <button class="tab" data-tab="favorites">Historias favoritas</button>
        </div>
        <section class="section" id="profile-content">${renderProfileSkeleton()}</section>
      </div></main>
      ${renderEditProfileModal(u)}
    `;
  },
  async init() {
    initNavbar(); initSidebar();
    ProgressService.loadCurrentUser();
    await FavoritesService.load().catch(error => console.error('[Novelle Profile] favorites failed', error));
    const favIds = safeList(FavoritesService.getAll());
    const all = await safeArray('Profile favorites source', () => StoryService.getAll());
    const favStories = all.filter(s => favIds.includes(s.id));
    const grid = document.getElementById('profile-favs');
    if (grid) {
      grid.innerHTML = favStories.length > 0
        ? renderStoryCards(favStories)
        : '<p class="text-secondary text-sm">Aún no tienes favoritos. Explora historias y añade las que más te gusten.</p>';
    }
    initEditProfileModal();
    const user = getProfileUser();
    const userKey = user?.uid || user?.id || user?.name || user?.username || 'Invitado';
    const allStories = await safeArray('Profile stories', () => StoryService.getAll());
    const createdStories = await safeArray('Profile created stories', () => StoryService.getMyCreated(userKey));
    updateCreatedStat(createdStories.length);
    updateProgressStats();

    async function renderTab(tab) {
      const content = document.getElementById('profile-content');
      if (!content) return;

      if (tab === 'created') {
        content.innerHTML = `
          <div class="profile__section-head">
            <h2>Historias creadas</h2>
            <a href="#/create" class="btn btn--primary btn--sm">Crear</a>
          </div>
          ${createdStories.length ? `<div class="grid-3">${createdStories.map(renderCreatedStoryCard).join('')}</div>` : emptyProfileState()}
        `;
        return;
      }

      if (tab === 'saved') {
        const progress = safeList(ProgressService.getAllInProgress());
        const savedIds = [...new Set(progress.map(item => item.storyId))];
        const saved = allStories.filter(story => savedIds.includes(story.id));
        content.innerHTML = `
          <div class="profile__section-head"><h2>Historias guardadas</h2></div>
          ${saved.length ? `<div class="grid-3">${renderStoryCards(saved, { showProgress: true, progress: 35 })}</div>` : emptyProfileState('Empieza a leer una historia para guardar tu progreso.')}
        `;
        return;
      }

      const favoriteIds = safeList(FavoritesService.getAll());
      const favoriteStories = allStories.filter(story => favoriteIds.includes(story.id));
      content.innerHTML = `
        <div class="profile__section-head"><h2>Historias favoritas</h2></div>
        ${favoriteStories.length ? `<div class="grid-3">${renderStoryCards(favoriteStories)}</div>` : emptyProfileState('Marca una historia como favorita para verla aqui.')}
      `;
    }

    await renderTab('created');

    delegate(document, 'click', '.tab[data-tab]', async (e, tabButton) => {
      document.querySelectorAll('.tab[data-tab]').forEach(tab => tab.classList.remove('active'));
      tabButton.classList.add('active');
      await renderTab(tabButton.dataset.tab);
    });

    delegate(document, 'click', '.profile-story__edit', (e, button) => {
      e.stopPropagation();
      router.navigate(`/edit-story/${button.dataset.storyId}`);
    });

    delegate(document, 'click', '.story-card', (e, c) => router.navigate(`/story/${c.dataset.storyId}`));
  },
};

// ─── Dashboard ──────────────────────
function renderCreatedStoryCard(story) {
  try {
    return `
      <div class="profile-story">
        ${renderStoryCard(story)}
        <button class="profile-story__edit btn btn--secondary btn--sm" data-story-id="${escapeAttr(story?.id)}">Editar</button>
      </div>
    `;
  } catch (error) {
    return '';
  }
}

function renderProfileSkeleton() {
  return `
    <div class="profile-skeleton">
      <div class="skeleton skeleton--title"></div>
      <div class="grid-3">
        <div class="skeleton skeleton--card"></div>
        <div class="skeleton skeleton--card"></div>
        <div class="skeleton skeleton--card"></div>
      </div>
    </div>
  `;
}

function emptyProfileState(message) {
  return `
    <div class="empty-state">
      <div class="empty-state__icon">${icon('book')}</div>
      <h3 class="empty-state__title">Sin historias</h3>
      <p class="empty-state__text">${escapeHtml(message || 'Aún no tienes historias aquí.')}</p>
    </div>
  `;
}

function getProfileUser() {
  return ProfileService.getCurrent();
}

function renderEditProfileModal(user) {
  return `
    <div class="modal-overlay profile-edit" id="profile-edit-modal" aria-hidden="true">
      <form class="modal profile-edit__modal" id="profile-edit-form">
        <div class="modal__header">
          <h2 class="modal__title">Editar perfil</h2>
          <button class="modal__close" type="button" id="profile-edit-cancel" aria-label="Cerrar">${icon('x')}</button>
        </div>
        <div class="modal__body profile-edit__body">
          <div class="profile-edit__previews">
            <div class="profile-edit__banner-preview ${user.banner ? 'has-image' : ''}" id="profile-edit-banner-preview"${user.banner ? ` style="background-image:url('${escapeAttr(user.banner)}')"` : ''}></div>
            <div class="avatar avatar--xl profile-edit__avatar-preview" id="profile-edit-avatar-preview">
              ${user.avatar ? `<img src="${escapeAttr(user.avatar)}" alt="${escapeAttr(user.name)}" />` : escapeHtml(user.initials)}
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="profile-edit-name">Nombre visible</label>
            <input class="form-input" id="profile-edit-name" name="name" type="text" maxlength="80" value="${escapeAttr(user.name)}" required />
          </div>
          <div class="form-group">
            <label class="form-label" for="profile-edit-username">Username</label>
            <input class="form-input" id="profile-edit-username" name="username" type="text" maxlength="32" value="${escapeAttr(user.username)}" required />
          </div>
          <div class="form-group">
            <label class="form-label" for="profile-edit-bio">Bio</label>
            <textarea class="form-input" id="profile-edit-bio" name="bio" rows="4" maxlength="240">${escapeHtml(user.bio || '')}</textarea>
          </div>

          <div class="profile-edit__uploads">
            <label class="create-story__file profile-edit__upload" for="profile-edit-avatar-file" id="profile-avatar-upload">
              <span class="create-story__file-main">Cargar foto de perfil</span>
              <span class="create-story__file-sub">JPG, PNG o WebP - max 2MB</span>
              <span class="profile-edit__spinner" aria-hidden="true"></span>
            </label>
            <input class="create-story__file-input" id="profile-edit-avatar-file" type="file" accept="image/*" />

            <label class="create-story__file profile-edit__upload" for="profile-edit-banner-file" id="profile-banner-upload">
              <span class="create-story__file-main">Cargar banner</span>
              <span class="create-story__file-sub">Horizontal recomendado - max 5MB</span>
              <span class="profile-edit__spinner" aria-hidden="true"></span>
            </label>
            <input class="create-story__file-input" id="profile-edit-banner-file" type="file" accept="image/*" />
          </div>
        </div>
        <div class="modal__footer">
          <button class="btn btn--secondary" type="button" id="profile-edit-cancel-footer">Cancelar</button>
          <button class="btn btn--primary" type="submit">Guardar cambios</button>
        </div>
      </form>
    </div>
  `;
}

function initEditProfileModal() {
  const modal = document.getElementById('profile-edit-modal');
  const form = document.getElementById('profile-edit-form');
  if (!modal || !form) return;

  let avatarData = getProfileUser().avatarRaw || getProfileUser().avatar || null;
  let bannerData = getProfileUser().bannerRaw || getProfileUser().banner || null;

  const resetForm = () => {
    const current = getProfileUser();
    avatarData = current.avatarRaw || current.avatar || null;
    bannerData = current.bannerRaw || current.banner || null;
    document.getElementById('profile-edit-name').value = current.name;
    document.getElementById('profile-edit-username').value = current.username;
    document.getElementById('profile-edit-bio').value = current.bio || '';
    updateImagePreview('profile-edit-avatar-preview', avatarData, true, current.initials, current.name);
    updateImagePreview('profile-edit-banner-preview', bannerData, false);
  };

  const open = () => {
    resetForm();
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
  };
  const close = () => {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
  };

  document.getElementById('edit-profile-btn')?.addEventListener('click', open);
  document.getElementById('profile-edit-cancel')?.addEventListener('click', close);
  document.getElementById('profile-edit-cancel-footer')?.addEventListener('click', close);
  modal.addEventListener('click', (event) => {
    if (event.target === modal) close();
  });

  document.getElementById('profile-edit-avatar-file')?.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadLoading('profile-avatar-upload', true);
    try {
      const current = getProfileUser();
      const uploaded = await ProfileService.uploadAvatar(current.uid, file);
      avatarData = uploaded.value;
      updateImagePreview('profile-edit-avatar-preview', uploaded.dataUrl || avatarData, true);
      ProfileService.save(current.uid, {
        avatar: avatarData,
        ...(uploaded.url ? { avatarURL: uploaded.url } : {}),
      });
      applyProfileToDom(getProfileUser());
      showToast('Foto subida', 'success');
    } catch (error) {
      showToast(error.message || 'Error al guardar', 'error');
    } finally {
      setUploadLoading('profile-avatar-upload', false);
    }
  });

  document.getElementById('profile-edit-banner-file')?.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadLoading('profile-banner-upload', true);
    try {
      const current = getProfileUser();
      const uploaded = await ProfileService.uploadBanner(current.uid, file);
      bannerData = uploaded.value;
      updateImagePreview('profile-edit-banner-preview', uploaded.dataUrl || bannerData, false);
      ProfileService.save(current.uid, {
        banner: bannerData,
        ...(uploaded.url ? { bannerURL: uploaded.url } : {}),
      });
      applyProfileToDom(getProfileUser());
      showToast('Foto subida', 'success');
    } catch (error) {
      showToast(error.message || 'Error al guardar', 'error');
    } finally {
      setUploadLoading('profile-banner-upload', false);
    }
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    try {
      const current = getProfileUser();
      const formData = new FormData(form);
      const name = String(formData.get('name') || '').trim() || current.name;
      const username = normalizeUsername(String(formData.get('username') || '').trim() || current.username);
      const bio = String(formData.get('bio') || '').trim();

      ProfileService.save(current.uid, {
        name,
        username,
        bio,
        avatar: avatarData,
        banner: bannerData,
      });
      applyProfileToDom(getProfileUser());
      showToast('Perfil actualizado', 'success');
      close();
    } catch (error) {
      showToast('Error al guardar', 'error');
    }
  });
}

function applyProfileToDom(user) {
  const avatar = document.getElementById('profile-avatar');
  const banner = document.getElementById('profile-banner');
  const name = document.getElementById('profile-name');
  const username = document.getElementById('profile-username');
  const bio = document.getElementById('profile-bio');
  const navAvatar = document.getElementById('nav-avatar');
  const sidebarAvatar = document.querySelector('.sidebar__avatar');
  const avatarHtml = user.avatar ? `<img src="${escapeAttr(user.avatar)}" alt="${escapeAttr(user.name)}" />` : escapeHtml(user.initials);

  if (avatar) avatar.innerHTML = avatarHtml;
  if (navAvatar) navAvatar.innerHTML = avatarHtml;
  if (sidebarAvatar) sidebarAvatar.innerHTML = avatarHtml;
  if (banner) {
    banner.classList.toggle('has-image', Boolean(user.banner));
    banner.style.backgroundImage = user.banner ? `url("${user.banner}")` : '';
  }
  if (name) name.textContent = user.name;
  if (username) username.textContent = `@${user.username}`;
  if (bio) bio.textContent = user.bio || 'Aún no has escrito una bio.';
}

function updateCreatedStat(count) {
  const stat = document.getElementById('profile-created-count');
  if (stat) stat.textContent = String(count);
}

function updateProgressStats() {
  const progress = ProgressService.getAll();
  const decisions = progress.reduce((total, item) => total + (item.decisions?.length || 0), 0);
  const endings = progress.filter(item => item.completed).length;
  const stats = document.querySelectorAll('.profile__stat-value');
  if (stats[1]) stats[1].textContent = String(decisions);
  if (stats[2]) stats[2].textContent = String(endings);
}

function updateImagePreview(id, dataUrl, isAvatar, fallbackInitials = '?', alt = 'Preview') {
  const preview = document.getElementById(id);
  if (!preview) return;
  if (isAvatar) {
    preview.innerHTML = dataUrl
      ? `<img src="${escapeAttr(dataUrl)}" alt="${escapeAttr(alt)}" />`
      : escapeHtml(fallbackInitials);
  } else {
    preview.classList.toggle('has-image', Boolean(dataUrl));
    preview.style.backgroundImage = dataUrl ? `url("${dataUrl}")` : '';
  }
  preview.classList.remove('profile-image-updated');
  requestAnimationFrame(() => preview.classList.add('profile-image-updated'));
}

function setUploadLoading(id, isLoading) {
  document.getElementById(id)?.classList.toggle('is-loading', isLoading);
}

function normalizeUsername(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')
    .slice(0, 32) || 'lector';
}

function escapeAttr(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function escapeHtml(value) {
  return escapeHtmlValue(value);
}

export const DashboardPage = {
  render() {
    const user = store.get('user');
    const s = user?.stats || { storiesRead: 0, decisionsTotal: 0, endingsUnlocked: 0, readingTime: 0 };
    return `
      ${renderNavbar()}${renderSidebar()}
      <main class="page"><div class="container">
        <div class="explore__header"><h1 class="explore__title">Dashboard</h1></div>
        <div class="dashboard__stats stagger-children">
          <div class="dashboard__stat-card"><div class="dashboard__stat-card-label">Historias leídas</div><div class="dashboard__stat-card-value">${s.storiesRead}</div></div>
          <div class="dashboard__stat-card"><div class="dashboard__stat-card-label">Decisiones tomadas</div><div class="dashboard__stat-card-value">${s.decisionsTotal}</div></div>
          <div class="dashboard__stat-card"><div class="dashboard__stat-card-label">Finales desbloqueados</div><div class="dashboard__stat-card-value">${s.endingsUnlocked}</div></div>
          <div class="dashboard__stat-card"><div class="dashboard__stat-card-label">Tiempo de lectura</div><div class="dashboard__stat-card-value">${Math.round(s.readingTime / 60)}h</div></div>
        </div>
        <div class="section">
          <div class="home__section-header"><h2>Recomendadas para ti</h2></div>
          <div id="dash-recs" class="grid-3"></div>
        </div>
      </div></main>
    `;
  },
  async init() {
    initNavbar(); initSidebar();
    const stories = await StoryService.getFeatured();
    document.getElementById('dash-recs').innerHTML = renderStoryCards(stories);
    delegate(document, 'click', '.story-card', (e, c) => router.navigate(`/story/${c.dataset.storyId}`));
    initScrollReveal();
  },
};

// ─── Favorites ──────────────────────
export const FavoritesPage = {
  render() {
    return `
      ${renderNavbar()}${renderSidebar()}
      <main class="page"><div class="container">
        <div class="favorites__header"><h1 class="favorites__title">${icon('heart')} Favoritos</h1></div>
        <div id="favs-grid" class="grid-3"></div>
      </div></main>
    `;
  },
  async init() {
    initNavbar(); initSidebar();
    await FavoritesService.load();
    const favIds = FavoritesService.getAll();
    const all = await StoryService.getAll();
    const favs = all.filter(s => favIds.includes(s.id));
    const grid = document.getElementById('favs-grid');
    grid.innerHTML = favs.length > 0
      ? renderStoryCards(favs)
      : `<div class="empty-state" style="grid-column:1/-1"><div class="empty-state__icon">${icon('heart')}</div><h3 class="empty-state__title">Sin favoritos</h3><p class="empty-state__text">Explora historias y marca las que más te gusten.</p></div>`;
    delegate(document, 'click', '.story-card', (e, c) => router.navigate(`/story/${c.dataset.storyId}`));
  },
};

// ─── Library ────────────────────────
export const LibraryPage = {
  render() {
    return `
      ${renderNavbar()}${renderSidebar()}
      <main class="page"><div class="container">
        <div class="library__header"><h1 class="library__title">Mi Biblioteca</h1></div>
        <div class="tabs" id="library-tabs">
          <button class="tab active" data-tab="reading">Leyendo</button>
          <button class="tab" data-tab="favorites">Favoritas</button>
          <button class="tab" data-tab="created">Creadas</button>
          <button class="tab" data-tab="completed">Finalizadas</button>
        </div>
        <div class="section" id="library-content"></div>
      </div></main>
    `;
  },
  async init() {
    try {
      await initLibraryPage();
    } catch (error) {
      console.error('[Novelle Library] init failed', error);
      initNavbar(); initSidebar();
      const content = document.getElementById('library-content');
      if (content) {
        content.innerHTML = emptyLibraryState('Mi Biblioteca', 'No pudimos cargar tu biblioteca. Intenta de nuevo en un momento.');
      }
    }
    return;
    initNavbar(); initSidebar();
    await FavoritesService.load();
    const stories = await StoryService.getAll();
    const content = document.getElementById('library-content');
    const renderFavoritesTab = () => {
      const favoriteIds = FavoritesService.getAll();
      const favorites = stories.filter(story => favoriteIds.includes(story.id));
      content.innerHTML = favorites.length
        ? `<div class="profile__section-head"><h2>Historias favoritas</h2></div><div class="grid-3">${renderStoryCards(favorites)}</div>`
        : emptyProfileState('Tus historias favoritas apareceran aqui.');
    };
    const renderDefaultTab = () => {
      content.innerHTML = emptyLibraryState('Historias guardadas', 'Empieza a leer una historia para guardar tu progreso.');
    };
    content.innerHTML = stories.length
      ? emptyLibraryState('Historias guardadas', 'Empieza a leer una historia para guardar tu progreso.')
      : `<div class="empty-state"><h3 class="empty-state__title">Sin historias</h3><p class="empty-state__text">Aún no hay historias publicadas en Supabase.</p></div>`;

    delegate(document, 'click', '#library-tabs .tab', (e, tab) => {
      document.querySelectorAll('#library-tabs .tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      if (tab.dataset.tab === 'favorites') {
        renderFavoritesTab();
      } else {
        renderDefaultTab();
      }
    });
    delegate(document, 'click', '.story-card', (e, c) => router.navigate(`/story/${c.dataset.storyId}`));
  },
};

// ─── History ────────────────────────
async function initLibraryPage() {
  initNavbar(); initSidebar();
  ProgressService.loadCurrentUser();
  await FavoritesService.load().catch(error => console.error('[Novelle Library] favorites failed', error));
  const stories = await safeArray('Library stories', () => StoryService.getAll());
  const user = getProfileUser();
  const userKey = user?.uid || user?.id || 'guest';
  const createdStories = await safeArray('Library created stories', () => StoryService.getMyCreated(userKey));
  const content = document.getElementById('library-content');
  const storiesById = new Map(stories.map(story => [story.id, story]));
  const storiesFromIds = (ids) => [...new Set(ids)]
    .map(id => storiesById.get(id))
    .filter(Boolean);
  const renderStories = (title, tabStories, message, options = {}) => {
    if (!content) return;
    content.innerHTML = tabStories.length
      ? `<div class="profile__section-head"><h2>${title}</h2></div><div class="grid-3">${renderStoryCards(tabStories, options)}</div>`
      : emptyLibraryState(title, message);
  };
  const renderTab = (tabName) => {
    if (tabName === 'favorites') {
      renderStories('Historias favoritas', storiesFromIds(safeList(FavoritesService.getAll())), 'Marca una historia como favorita para verla aqui.');
      return;
    }

    if (tabName === 'created') {
      renderStories('Historias creadas', createdStories, 'Aun no tienes historias aqui.');
      return;
    }

    if (tabName === 'completed') {
      renderStories(
        'Historias finalizadas',
        storiesFromIds(safeList(ProgressService.getCompleted()).map(item => item.storyId)),
        'Aun no tienes historias aqui.',
        { showProgress: true, progress: 100 }
      );
      return;
    }

    renderStories(
      'Historias guardadas',
      storiesFromIds(safeList(ProgressService.getAllInProgress()).map(item => item.storyId)),
      'Empieza a leer una historia para guardar tu progreso.',
      { showProgress: true, progress: 35 }
    );
  };

  renderTab('reading');

  delegate(document, 'click', '#library-tabs .tab', (e, tab) => {
    document.querySelectorAll('#library-tabs .tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    renderTab(tab.dataset.tab);
  });
  delegate(document, 'click', '.story-card', (e, c) => router.navigate(`/story/${c.dataset.storyId}`));
}

async function safeArray(label, loader) {
  try {
    const result = await loader();
    return Array.isArray(result) ? result : [];
  } catch (error) {
    console.error(`[Novelle Page] ${label} failed`, error);
    return [];
  }
}

function safeList(value) {
  return Array.isArray(value) ? value : [];
}

function emptyLibraryState(title, message) {
  return `
    <div class="empty-state empty-state--library">
      <div class="empty-state__icon">${icon('library')}</div>
      <h3 class="empty-state__title">${title}</h3>
      <p class="empty-state__text">${message}</p>
      <a href="#/explore" class="btn btn--secondary btn--sm">Explorar historias</a>
    </div>
  `;
}

export const HistoryPage = {
  render() {
    return `
      ${renderNavbar()}${renderSidebar()}
      <main class="page"><div class="container container--md">
        <div class="explore__header"><h1 class="explore__title">Historial</h1></div>
        <div id="history-timeline" class="history-page__timeline"></div>
      </div></main>
    `;
  },
  init() {
    initNavbar(); initSidebar();
    const history = store.get('history') || [];
    const timeline = document.getElementById('history-timeline');
    if (history.length === 0) {
      timeline.innerHTML = `<div class="empty-state"><div class="empty-state__icon">${icon('history')}</div><h3 class="empty-state__title">Sin historial</h3><p class="empty-state__text">Comienza a leer para ver tu historial aquí.</p></div>`;
    } else {
      timeline.innerHTML = history.map(h => `
        <div class="history-page__item">
          <div class="history-page__item-date">${new Date(h.timestamp).toLocaleDateString('es-ES')}</div>
          <div class="story-card story-card--horizontal" data-story-id="${escapeAttr(h.storyId)}">
            <div class="story-card__body"><h3 class="story-card__title">${escapeHtml(displayText(h.storyTitle, 'Historia'))}</h3><p class="story-card__author">${h.action === 'read' ? 'Leida' : escapeHtml(displayText(h.action, ''))}</p></div>
          </div>
        </div>
      `).join('');
    }
    delegate(document, 'click', '.story-card', (e, c) => router.navigate(`/story/${c.dataset.storyId}`));
  },
};

// ─── Settings ───────────────────────
export const SettingsPage = {
  render() {
    const theme = store.get('theme');
    const prefs = store.get('readingPrefs');
    return `
      ${renderNavbar()}${renderSidebar()}
      <main class="page"><div class="container container--md">
        <div class="explore__header"><h1 class="explore__title">Configuración</h1></div>

        <div class="settings__section">
          <h3 class="settings__section-title">Apariencia</h3>
          <div class="settings__row">
            <div><div class="settings__row-label">Modo oscuro</div><div class="settings__row-desc">Cambia entre tema claro y oscuro</div></div>
            <label class="toggle"><input type="checkbox" id="settings-theme" ${theme === 'dark' ? 'checked' : ''} /><span class="toggle__switch"></span></label>
          </div>
        </div>

        <div class="settings__section">
          <h3 class="settings__section-title">Lectura</h3>
          <div class="settings__row">
            <div><div class="settings__row-label">Tamaño de fuente</div><div class="settings__row-desc">${prefs.fontSize}px</div></div>
            <input type="range" min="14" max="28" value="${prefs.fontSize}" id="settings-fontsize" style="width:120px" />
          </div>
        </div>

        <div class="settings__section">
          <h3 class="settings__section-title">Cuenta</h3>
          <div class="settings__row">
            <div><div class="settings__row-label">Cerrar sesión</div><div class="settings__row-desc">Salir de tu cuenta</div></div>
            <button class="btn btn--secondary btn--sm" id="settings-logout">Cerrar sesión</button>
          </div>
        </div>
      </div></main>
    `;
  },
  init() {
    initNavbar(); initSidebar();
    document.getElementById('settings-theme')?.addEventListener('change', (e) => {
      const theme = e.target.checked ? 'dark' : 'light';
      store.set('theme', theme);
      document.body.setAttribute('data-theme', theme);
    });
    document.getElementById('settings-fontsize')?.addEventListener('input', (e) => {
      const prefs = store.get('readingPrefs');
      prefs.fontSize = parseInt(e.target.value);
      store.set('readingPrefs', prefs);
      document.documentElement.style.setProperty('--reader-font-size', prefs.fontSize + 'px');
    });
    document.getElementById('settings-logout')?.addEventListener('click', async () => {
      await AuthService.logout();
      router.navigate('/login');
    });
  },
};
