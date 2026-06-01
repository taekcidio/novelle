// ═══════════════════════════════════════
// NOVELLE — Progress & Favorites Services
// ═══════════════════════════════════════

import { store } from '../store.js';
import { api } from '../utils/api.js';
import { storage } from '../utils/storage.js';
import { displayText } from '../utils/helpers.js';
export { FavoritesService } from './FavoriteService.js';

const PROGRESS_BY_USER_KEY = 'novelle_progress_by_user';

function currentUserId() {
  const user = store.get('user');
  return user?.uid || user?.id || 'guest';
}

function getProgressMap() {
  return storage.get(PROGRESS_BY_USER_KEY) || {};
}

function getUserProgress(userId = currentUserId()) {
  return getProgressMap()[userId] || {};
}

function saveUserProgress(progress, userId = currentUserId()) {
  const map = getProgressMap();
  map[userId] = progress;
  storage.set(PROGRESS_BY_USER_KEY, map);
  store.set('progress', progress);
}

export const ProgressService = {
  getProgress(storyId) {
    const all = getUserProgress();
    return all[storyId] || null;
  },

  saveProgress(storyId, data) {
    const all = getUserProgress();
    const existing = all[storyId] || {};
    all[storyId] = {
      ...existing,
      ...data,
      decisions: data.decisions || existing.decisions || [],
      currentScene: data.currentScene || existing.currentScene || null,
      updatedAt: new Date().toISOString(),
    };
    saveUserProgress(all);
    return all[storyId];
  },

  getDecisionPath(storyId) {
    return this.getProgress(storyId)?.decisions || [];
  },

  addDecision(storyId, decisionId, sceneId) {
    const progress = this.getProgress(storyId) || { decisions: [], currentScene: null };
    progress.decisions.push({ decisionId, sceneId, timestamp: Date.now() });
    progress.currentScene = sceneId;
    this.saveProgress(storyId, progress);
  },

  async saveInteractiveProgress(storyId, { currentScene, decisionId, decisionText, nextSceneId, endingId, completed = false, partNumber = null }) {
    const progress = this.getProgress(storyId) || { decisions: [], currentScene: null };
    const decisionEntry = decisionId || decisionText
      ? { decisionId, decisionText, nextSceneId, endingId, timestamp: new Date().toISOString() }
      : null;

    if (decisionEntry) {
      progress.decisions.push(decisionEntry);
    }

    progress.currentScene = currentScene || nextSceneId || progress.currentScene;
    progress.completed = completed;
    if (Number.isFinite(Number(partNumber))) {
      progress.partNumber = Number(partNumber);
    }
    const savedProgress = this.saveProgress(storyId, progress);

    const user = store.get('user');
    try {
      await api.post('/progress/', {
        user_id: user?.id || 'guest',
        story_id: storyId,
        current_scene: progress.currentScene,
        decisions: progress.decisions,
        completed,
      });
    } catch (error) {
      // Keep local progress if remote sync is unavailable.
    }

    return savedProgress;
  },

  getAllInProgress() {
    const all = getUserProgress();
    return Object.entries(all).filter(([, p]) => !p.completed).map(([id, p]) => ({ storyId: id, ...p }));
  },

  getAll() {
    return Object.entries(getUserProgress()).map(([storyId, progress]) => ({ storyId, ...progress }));
  },

  getCompleted() {
    return this.getAll().filter(progress => progress.completed);
  },

  loadCurrentUser() {
    store.set('progress', getUserProgress());
    return store.get('progress') || {};
  },
};

export const HistoryService = {
  getAll() {
    return store.get('history') || [];
  },

  add(storyId, storyTitle, action = 'read') {
    const history = this.getAll();
    history.unshift({
      storyId,
      storyTitle: displayText(storyTitle, 'Historia'),
      action: displayText(action, 'read'),
      timestamp: new Date().toISOString(),
    });
    if (history.length > 100) history.pop();
    store.set('history', history);
  },
};
