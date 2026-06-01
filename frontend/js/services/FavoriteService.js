// NOVELLE - Real Favorites Service

import { store } from '../store.js';
import { api } from '../utils/api.js';
import { storage } from '../utils/storage.js';

const FAVORITES_BY_USER_KEY = 'novelle_favorites_by_user';

function currentUserId() {
  const user = store.get('user');
  return user?.uid || user?.id || 'guest';
}

function shouldUseRemote(userId) {
  return Boolean(userId && userId !== 'guest');
}

function normalizeIds(favorites = []) {
  return favorites
    .map(item => typeof item === 'string' ? item : item?.story_id || item?.storyId)
    .filter(Boolean);
}

function getLocalMap() {
  return storage.get(FAVORITES_BY_USER_KEY) || {};
}

function getLocal(userId = currentUserId()) {
  return getLocalMap()[userId] || [];
}

function saveLocal(ids, userId = currentUserId()) {
  const favorites = [...new Set(ids)];
  const map = getLocalMap();
  map[userId] = favorites;
  storage.set(FAVORITES_BY_USER_KEY, map);
  store.set('favorites', favorites);
}

export const FavoritesService = {
  async load(userId = currentUserId()) {
    store.set('favorites', getLocal(userId));

    if (!shouldUseRemote(userId)) {
      return this.getAll();
    }

    try {
      const remoteFavorites = await api.get(`/favorites/${encodeURIComponent(userId)}`);
      if (Array.isArray(remoteFavorites)) {
        saveLocal([...this.getAll(), ...normalizeIds(remoteFavorites)], userId);
      }
    } catch (error) {
      // Keep local favorites if the remote service is unavailable.
    }

    return this.getAll();
  },

  getAll(userId = currentUserId()) {
    return getLocal(userId);
  },

  isFavorite(storyId) {
    return this.getAll().includes(storyId);
  },

  async toggleFavorite(storyId, userId = currentUserId()) {
    const current = this.getAll(userId);
    const wasFavorite = current.includes(storyId);
    const nextFavorites = wasFavorite
      ? current.filter(id => id !== storyId)
      : [...current, storyId];

    saveLocal(nextFavorites, userId);

    if (!shouldUseRemote(userId)) {
      return !wasFavorite;
    }

    let response = null;
    try {
      response = await api.post('/favorites/', {
        user_id: userId,
        story_id: storyId,
      });
    } catch (error) {
      return !wasFavorite;
    }

    if (response?.status === 'added' || response?.status === 'removed') {
      const remoteIsFavorite = response.status === 'added';
      const syncedFavorites = remoteIsFavorite
        ? [...this.getAll(userId), storyId]
        : this.getAll(userId).filter(id => id !== storyId);
      saveLocal(syncedFavorites, userId);
      return remoteIsFavorite;
    }

    return !wasFavorite;
  },

  toggle(storyId) {
    return this.toggleFavorite(storyId);
  },
};
