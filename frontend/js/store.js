// ═══════════════════════════════════════
// NOVELLE — Global State Store
// ═══════════════════════════════════════

import { storage } from './utils/storage.js';
import { CONFIG } from './config.js';

class Store {
  constructor() {
    this._state = {
      user: storage.get(CONFIG.STORAGE_KEYS.USER) || null,
      theme: storage.get(CONFIG.STORAGE_KEYS.THEME) || 'light',
      favorites: storage.get(CONFIG.STORAGE_KEYS.FAVORITES) || [],
      progress: storage.get(CONFIG.STORAGE_KEYS.PROGRESS) || {},
      history: storage.get(CONFIG.STORAGE_KEYS.HISTORY) || [],
      readingPrefs: storage.get(CONFIG.STORAGE_KEYS.READING_PREFS) || {
        fontSize: CONFIG.READING.DEFAULT_FONT_SIZE,
        fontFamily: CONFIG.READING.DEFAULT_FONT,
      },
      currentStory: null,
      currentScene: null,
      isLoading: false,
      sidebarOpen: false,
    };

    this._listeners = new Map();
  }

  /**
   * Get a state value
   */
  get(key) {
    return this._state[key];
  }

  /**
   * Set a state value and notify listeners
   */
  set(key, value) {
    const oldValue = this._state[key];
    this._state[key] = value;

    // Persist certain keys
    this._persist(key, value);

    // Notify listeners
    if (this._listeners.has(key)) {
      this._listeners.get(key).forEach(cb => cb(value, oldValue));
    }

    // Global listeners
    if (this._listeners.has('*')) {
      this._listeners.get('*').forEach(cb => cb(key, value, oldValue));
    }
  }

  /**
   * Subscribe to state changes
   */
  on(key, callback) {
    if (!this._listeners.has(key)) {
      this._listeners.set(key, new Set());
    }
    this._listeners.get(key).add(callback);

    // Return unsubscribe function
    return () => this._listeners.get(key)?.delete(callback);
  }

  /**
   * Get entire state
   */
  getState() {
    return { ...this._state };
  }

  /**
   * Persist state to localStorage
   */
  _persist(key, value) {
    const persistMap = {
      user: CONFIG.STORAGE_KEYS.USER,
      theme: CONFIG.STORAGE_KEYS.THEME,
      favorites: CONFIG.STORAGE_KEYS.FAVORITES,
      progress: CONFIG.STORAGE_KEYS.PROGRESS,
      history: CONFIG.STORAGE_KEYS.HISTORY,
      readingPrefs: CONFIG.STORAGE_KEYS.READING_PREFS,
    };

    if (persistMap[key]) {
      storage.set(persistMap[key], value);
    }
  }

  /**
   * Check if user is logged in
   */
  isAuthenticated() {
    return this._state.user !== null;
  }

  /**
   * Clear user session
   */
  logout() {
    this.set('user', null);
    this.set('favorites', []);
    this.set('progress', {});
    this.set('history', []);
    storage.remove(CONFIG.STORAGE_KEYS.TOKEN);
  }
}

export const store = new Store();
