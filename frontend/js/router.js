// ═══════════════════════════════════════
// NOVELLE — SPA Router
// ═══════════════════════════════════════

export class Router {
  constructor() {
    this.routes = new Map();
    this.currentRoute = null;
    this.beforeEach = null;
    this.afterEach = null;
    this.container = null;
    this.notFoundHandler = null;
  }

  /**
   * Initialize the router with a DOM container
   * @param {string} selector - CSS selector for the app container
   */
  init(selector) {
    this.container = document.querySelector(selector);
    if (!this.container) {
      throw new Error(`Router: Container "${selector}" not found`);
    }

    window.addEventListener('hashchange', () => this._handleRoute());
    window.addEventListener('load', () => this._handleRoute());

    return this;
  }

  /**
   * Register a route
   * @param {string} path - Route path (e.g., '/home', '/story/:id')
   * @param {Function} handler - Page module with render() and optionally init()
   */
  on(path, handler) {
    this.routes.set(path, handler);
    return this;
  }

  /**
   * Register a 404 handler
   */
  onNotFound(handler) {
    this.notFoundHandler = handler;
    return this;
  }

  /**
   * Navigate to a route
   * @param {string} path - Route path
   */
  navigate(path) {
    window.location.hash = path;
  }

  /**
   * Get current hash path
   */
  getPath() {
    const path = window.location.hash.slice(1) || '/';
    return path.split('?')[0] || '/';
  }

  /**
   * Parse route parameters
   */
  _matchRoute(path) {
    for (const [pattern, handler] of this.routes) {
      const params = this._extractParams(pattern, path);
      if (params !== null) {
        return { handler, params, pattern };
      }
    }
    return null;
  }

  /**
   * Extract params from URL pattern
   */
  _extractParams(pattern, path) {
    const patternParts = pattern.split('/');
    const pathParts = path.split('/');

    if (patternParts.length !== pathParts.length) return null;

    const params = {};

    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(':')) {
        try {
          params[patternParts[i].slice(1)] = decodeURIComponent(pathParts[i]);
        } catch (error) {
          params[patternParts[i].slice(1)] = pathParts[i];
          console.error('[Novelle Router] Error decoding route param', { pattern, path, error });
        }
      } else if (patternParts[i] !== pathParts[i]) {
        return null;
      }
    }

    return params;
  }

  /**
   * Handle route change
   */
  async _handleRoute() {
    const path = this.getPath();

    // Guard
    if (this.beforeEach) {
      const canProceed = await this.beforeEach(path, this.currentRoute);
      if (!canProceed) return;
    }

    const match = this._matchRoute(path);
    const previousRoute = this.currentRoute;

    if (match) {
      const { handler, params, pattern } = match;
      const pageName = getPageName(handler, pattern);
      this.currentRoute = path;
      console.log('[Novelle Router] route start', { path, pattern, page: pageName, params });

      // Page transition
      this.container.classList.add('page-exit');

      await new Promise(resolve => setTimeout(resolve, 200));

      let didRender = false;
      try {
        // Render
        const html = typeof handler.render === 'function'
          ? handler.render(params)
          : handler(params);

        this.container.innerHTML = html;
        didRender = true;
        this.container.classList.remove('page-exit');
        this.container.classList.add('page-enter');
      } catch (error) {
        console.error('[Novelle Router] render error', { path, pattern, page: pageName, params, error });
        this.container.classList.remove('page-exit', 'page-enter');
        this.container.innerHTML = `
          <div class="page--centered page--no-nav" style="text-align:center">
            <h1 class="heading-1">No pudimos cargar esta pagina</h1>
            <p class="text-secondary mt-4">Intenta volver al inicio y abrirla de nuevo.</p>
            <a href="#/home" class="btn btn--primary mt-8">Volver al inicio</a>
          </div>
        `;
      }

      if (didRender) {
        try {
        // Initialize page logic
        if (typeof handler.init === 'function') {
          await handler.init(params);
        }

        // Scroll to top
        window.scrollTo(0, 0);

        setTimeout(() => {
          this.container.classList.remove('page-enter');
        }, 300);
      } catch (error) {
          console.error('[Novelle Router] init error', { path, pattern, page: pageName, params, error });
          this.container.classList.remove('page-exit', 'page-enter');
          const fallbackSlot = this.container.querySelector('[data-page-error]');
          if (fallbackSlot) {
            fallbackSlot.textContent = 'No pudimos cargar algunos datos. Intenta actualizar en un momento.';
          }
        }
      }

    } else if (this.notFoundHandler) {
      this.currentRoute = path;
      const html = this.notFoundHandler.render ? this.notFoundHandler.render() : this.notFoundHandler();
      this.container.innerHTML = html;
    }

    // After guard
    if (this.afterEach) {
      try {
        this.afterEach(path, previousRoute);
      } catch (error) {
        console.error('[Novelle Router] afterEach error', { path, previousRoute, error });
      }
    }
  }

  /**
   * Get query parameters from hash
   */
  getQuery() {
    const hash = window.location.hash;
    const queryIndex = hash.indexOf('?');
    if (queryIndex === -1) return {};

    const queryString = hash.slice(queryIndex + 1);
    const params = {};
    queryString.split('&').forEach(pair => {
      const [key, value] = pair.split('=');
      if (!key) return;
      try {
        params[decodeURIComponent(key)] = decodeURIComponent(value || '');
      } catch (error) {
        params[key] = value || '';
      }
    });
    return params;
  }
}

export const router = new Router();

function getPageName(handler, pattern = '') {
  if (!handler) return routeToPageName(pattern);
  if (handler.pageName) return handler.pageName;
  if (handler.name) return handler.name;
  if (handler.constructor?.name && handler.constructor.name !== 'Object') return handler.constructor.name;
  return routeToPageName(pattern);
}

function routeToPageName(pattern = '') {
  const names = {
    '/': 'HomePage',
    '/splash': 'SplashPage',
    '/login': 'LoginPage',
    '/register': 'RegisterPage',
    '/home': 'HomePage',
    '/explore': 'ExplorePage',
    '/categories': 'CategoriesPage',
    '/categories/:slug': 'ExplorePage',
    '/story/:id': 'ReaderPage',
    '/ending/:id': 'EndingPage',
    '/profile': 'ProfilePage',
    '/dashboard': 'DashboardPage',
    '/favorites': 'FavoritesPage',
    '/library': 'LibraryPage',
    '/history': 'HistoryPage',
    '/settings': 'SettingsPage',
    '/create': 'CreateStoryPage',
    '/edit-story/:id': 'EditStoryPage',
  };
  return names[pattern] || 'AnonymousRoute';
}
