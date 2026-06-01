// ═══════════════════════════════════════
// NOVELLE — Sidebar Component
// ═══════════════════════════════════════

import { store } from '../store.js';
import { router } from '../router.js';
import { AuthService } from '../services/AuthService.js';
import { ProfileService } from '../services/ProfileService.js';
import { icon } from '../utils/icons.js';
import { $ } from '../utils/dom.js';

let profileSyncBound = false;

export function renderSidebar() {
  const user = ProfileService.getCurrent();
  const avatarMarkup = user?.avatar
    ? `<img src="${escapeAttribute(user.avatar)}" alt="${escapeAttribute(user.name)}" />`
    : (user?.initials || '?');
  const name = user?.name || 'Invitado';
  const email = user?.email || '';

  return `
    <div class="sidebar-overlay" id="sidebar-overlay"></div>
    <aside class="sidebar" id="sidebar">
      <div class="sidebar__header">
        <span class="heading-5">Menú</span>
        <button class="sidebar__close" id="sidebar-close">${icon('x')}</button>
      </div>
      <div class="sidebar__user">
        <div class="sidebar__avatar">${avatarMarkup}</div>
        <div class="sidebar__user-info">
          <div class="name">${escapeAttribute(name)}</div>
          <div class="email">${escapeAttribute(email)}</div>
        </div>
      </div>
      <nav class="sidebar__nav">
        <a class="sidebar__link" href="#/home">${icon('home')} Inicio</a>
        <a class="sidebar__link" href="#/explore">${icon('compass')} Explorar</a>
        <a class="sidebar__link" href="#/create">${icon('book')} Crear</a>
        <a class="sidebar__link" href="#/categories">${icon('grid')} Categorías</a>
        <a class="sidebar__link" href="#/library">${icon('library')} Biblioteca</a>
        <a class="sidebar__link" href="#/favorites">${icon('heart')} Favoritos</a>
        <div class="sidebar__divider"></div>
        <a class="sidebar__link" href="#/dashboard">${icon('star')} Dashboard</a>
        <a class="sidebar__link" href="#/history">${icon('history')} Historial</a>
        <a class="sidebar__link" href="#/profile">${icon('user')} Perfil</a>
        <a class="sidebar__link" href="#/settings">${icon('settings')} Configuración</a>
      </nav>
      <div class="sidebar__footer">
        <button class="sidebar__link" id="sidebar-logout">${icon('logout')} Cerrar sesión</button>
      </div>
    </aside>
  `;
}

export function initSidebar() {
  const sidebar = $('#sidebar');
  const overlay = $('#sidebar-overlay');
  const closeBtn = $('#sidebar-close');
  const logoutBtn = $('#sidebar-logout');

  function closeSidebar() {
    sidebar?.classList.remove('active');
    overlay?.classList.remove('active');
    store.set('sidebarOpen', false);
    const hamburger = $('#nav-hamburger');
    hamburger?.classList.remove('active');
  }

  // Listen for sidebar state
  store.on('sidebarOpen', (isOpen) => {
    if (isOpen) {
      sidebar?.classList.add('active');
      overlay?.classList.add('active');
    } else {
      closeSidebar();
    }
  });

  overlay?.addEventListener('click', closeSidebar);
  closeBtn?.addEventListener('click', closeSidebar);

  // Close on nav link click
  sidebar?.querySelectorAll('.sidebar__link[href]').forEach(link => {
    link.addEventListener('click', closeSidebar);
  });

  // Logout
  logoutBtn?.addEventListener('click', async () => {
    closeSidebar();
    await AuthService.logout();
    router.navigate('/login');
  });

  if (!profileSyncBound) {
    window.addEventListener('novelle:profile-updated', syncSidebarProfile);
    profileSyncBound = true;
  }
}

function syncSidebarProfile() {
  const profile = ProfileService.getCurrent();
  const avatar = document.querySelector('.sidebar__avatar');
  const name = document.querySelector('.sidebar__user-info .name');
  if (avatar) {
    avatar.innerHTML = profile.avatar
      ? `<img src="${escapeAttribute(profile.avatar)}" alt="${escapeAttribute(profile.name)}" />`
      : profile.initials;
  }
  if (name) name.textContent = profile.name;
}

function escapeAttribute(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}
