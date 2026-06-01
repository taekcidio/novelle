// ═══════════════════════════════════════
// NOVELLE — Navbar Component
// ═══════════════════════════════════════

import { store } from '../store.js';
import { router } from '../router.js';
import { icon } from '../utils/icons.js';
import { $ } from '../utils/dom.js';
import { AuthService } from '../services/AuthService.js';
import { ProfileService } from '../services/ProfileService.js';

let profileSyncBound = false;

export function renderNavbar() {
  const user = ProfileService.getCurrent();
  const theme = store.get('theme');
  const avatarMarkup = user?.avatar
    ? `<img src="${escapeAttribute(user.avatar)}" alt="${escapeAttribute(user.name)}" />`
    : (user?.initials || '?');

  return `
    <nav class="navbar" id="main-navbar">
      <div class="navbar__inner">
        <div class="navbar__left">
          <a class="navbar__logo" id="nav-logo">Novelle</a>
          <div class="navbar__links">
            <a href="#/home" class="nav-link" data-route="/home">Inicio</a>
            <a href="#/explore" class="nav-link" data-route="/explore">Explorar</a>
            <a href="#/create" class="nav-link" data-route="/create">Crear</a>
            <a href="#/categories" class="nav-link" data-route="/categories">Categorías</a>
            <a href="#/library" class="nav-link" data-route="/library">Biblioteca</a>
          </div>
        </div>
        <div class="navbar__right">
          <div class="navbar__search">
            ${icon('search')}
            <input type="text" placeholder="Buscar historias..." id="nav-search" />
          </div>
          <button class="navbar__theme-btn" id="theme-toggle" aria-label="Cambiar tema">
            ${theme === 'dark' ? icon('sun') : icon('moon')}
          </button>
          <div class="navbar__user">
            <div class="navbar__avatar" id="nav-avatar" aria-label="Abrir menú de usuario" aria-expanded="false">${avatarMarkup}</div>
            <div class="navbar__user-menu" id="nav-user-menu">
              <button class="navbar__user-item" data-nav-target="/profile">${icon('user')} <span>Mi perfil</span></button>
              <button class="navbar__user-item" data-nav-target="/library">${icon('library')} <span>Biblioteca</span></button>
              <button class="navbar__user-item" data-nav-target="/settings">${icon('settings')} <span>Configuración</span></button>
              <button class="navbar__user-item navbar__user-item--danger" id="nav-logout">${icon('logout')} <span>Cerrar sesión</span></button>
            </div>
          </div>
          <div class="navbar__hamburger" id="nav-hamburger">
            <span></span>
          </div>
        </div>
      </div>
    </nav>
  `;
}

export function initNavbar() {
  // Logo click
  const logo = $('#nav-logo');
  if (logo) logo.addEventListener('click', (e) => { e.preventDefault(); router.navigate('/home'); });

  // Theme toggle
  const themeBtn = $('#theme-toggle');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const current = store.get('theme');
      const next = current === 'dark' ? 'light' : 'dark';
      store.set('theme', next);
      document.body.setAttribute('data-theme', next);
      themeBtn.innerHTML = next === 'dark' ? icon('sun') : icon('moon');
    });
  }

  // User menu
  const avatar = $('#nav-avatar');
  const userMenu = $('#nav-user-menu');
  if (avatar && userMenu) {
    avatar.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = userMenu.classList.toggle('active');
      avatar.setAttribute('aria-expanded', String(isOpen));
    });
    userMenu.addEventListener('click', (e) => e.stopPropagation());
    document.addEventListener('click', () => {
      userMenu.classList.remove('active');
      avatar.setAttribute('aria-expanded', 'false');
    });
    document.querySelectorAll('[data-nav-target]').forEach(item => {
      item.addEventListener('click', () => {
        userMenu.classList.remove('active');
        router.navigate(item.dataset.navTarget);
      });
    });
  }

  const logout = $('#nav-logout');
  if (logout) {
    logout.addEventListener('click', async () => {
      await AuthService.logout();
      router.navigate('/login');
    });
  }

  // Hamburger
  const hamburger = $('#nav-hamburger');
  if (hamburger) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('active');
      store.set('sidebarOpen', !store.get('sidebarOpen'));
    });
  }

  // Search
  const searchInput = $('#nav-search');
  if (searchInput) {
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && searchInput.value.trim()) {
        router.navigate(`/explore?q=${encodeURIComponent(searchInput.value.trim())}`);
      }
    });
  }

  // Highlight active link
  highlightActiveLink();
  if (!profileSyncBound) {
    window.addEventListener('novelle:profile-updated', syncNavbarProfile);
    profileSyncBound = true;
  }
}

function highlightActiveLink() {
  const path = router.getPath();
  const links = document.querySelectorAll('.nav-link');
  links.forEach(link => {
    const route = link.getAttribute('data-route');
    link.classList.toggle('active', path.startsWith(route));
  });
}

function syncNavbarProfile() {
  const profile = ProfileService.getCurrent();
  const avatar = $('#nav-avatar');
  if (!avatar) return;
  avatar.innerHTML = profile.avatar
    ? `<img src="${escapeAttribute(profile.avatar)}" alt="${escapeAttribute(profile.name)}" />`
    : profile.initials;
}

function escapeAttribute(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}
