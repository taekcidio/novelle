// ═══════════════════════════════════════
// NOVELLE — Story Service
// ═══════════════════════════════════════

import { api } from '../utils/api.js';
import { CategoryService, getCategorySlug } from './CategoryService.js';
import { StoryCoverService } from './StoryCoverService.js';
import { store } from '../store.js';
import { storage } from '../utils/storage.js';

const CREATED_STORIES_KEY = 'novelle_created_stories';
const PROGRESS_BY_USER_KEY = 'novelle_progress_by_user';

function currentUserKey() {
  const user = store.get('user');
  return user?.uid || user?.id || 'guest';
}

function getCreatedMap() {
  return storage.get(CREATED_STORIES_KEY) || {};
}

function rememberCreatedStory(storyId, userId = currentUserKey()) {
  if (!storyId) return;
  const createdMap = getCreatedMap();
  const ids = createdMap[userId] || [];
  createdMap[userId] = [...new Set([storyId, ...ids])];
  storage.set(CREATED_STORIES_KEY, createdMap);
}

function forgetCreatedStory(storyId) {
  if (!storyId) return;
  const createdMap = getCreatedMap();
  Object.keys(createdMap).forEach((userId) => {
    createdMap[userId] = (createdMap[userId] || []).filter(id => id !== storyId);
  });
  storage.set(CREATED_STORIES_KEY, createdMap);
}

function getRememberedCreatedIds(userId = currentUserKey()) {
  return getCreatedMap()[userId] || [];
}

function cleanupLocalStoryState(storyId) {
  const progressMap = storage.get(PROGRESS_BY_USER_KEY) || {};
  Object.keys(progressMap).forEach((userId) => {
    if (progressMap[userId]?.[storyId]) {
      delete progressMap[userId][storyId];
    }
  });
  storage.set(PROGRESS_BY_USER_KEY, progressMap);

  const progress = store.get('progress') || {};
  if (progress[storyId]) {
    const nextProgress = { ...progress };
    delete nextProgress[storyId];
    store.set('progress', nextProgress);
  }

  const favorites = (store.get('favorites') || []).filter(id => id !== storyId);
  store.set('favorites', favorites);

  const history = (store.get('history') || []).filter(item => item.storyId !== storyId);
  store.set('history', history);
}

function isValidStoryId(id) {
  const value = String(id || '').trim();
  return Boolean(value) && !['undefined', 'null', 'temp'].includes(value.toLowerCase());
}

function normalizeStory(story, categories = []) {
  if (!story) return null;

  const category = CategoryService.findForStory(story, categories);
  const rawCategoryName = typeof story.categoryName === 'string' ? story.categoryName : '';
  const rawCategory = typeof story.category === 'string' ? story.category : '';
  const incomingCategoryName = rawCategoryName && rawCategoryName.toLowerCase() !== 'unknown'
    ? rawCategoryName
    : '';
  const incomingCategory = rawCategory && rawCategory.toLowerCase() !== 'unknown'
    ? rawCategory
    : '';
  const categoryName = incomingCategoryName
    || category?.name
    || incomingCategory
    || 'Sin categoría';

  const categorySlug = category ? getCategorySlug(category) : (incomingCategory || 'unknown');

  const endingsCount = Number(
    story.endings_count
    ?? (Array.isArray(story.endings) ? story.endings.length : story.endings)
    ?? 0
  );

  return {
    ...story,
    id: String(story.id),
    cover_image: story.cover_image || story.cover || null,
    cover: StoryCoverService.getLocalCover(story.id) || story.cover || story.cover_image || null,
    category: categorySlug,
    categoryName,
    readingTime: story.readingTime || story.reading_time || '0 min',
    endings: Number.isFinite(endingsCount) ? endingsCount : 0,
    rating: Number(story.rating ?? 0),
    readers: Number(story.readers ?? 0),
    scenes_data: story.scenes_data || (story.scenes || []).map(normalizeScene),
  };
}

function normalizeScene(scene) {
  if (!scene) return null;

  return {
    ...scene,
    id: scene.id || scene.scene_id || `scene-${Date.now()}`,
    content: scene.content || scene.scene_content || '',
    sceneOrder: scene.sceneOrder ?? scene.scene_order ?? scene.order ?? 0,
    isDecisionPoint: scene.isDecisionPoint ?? scene.is_decision_point ?? false,
    isEnding: scene.isEnding ?? scene.is_ending ?? false,
    decisions: (scene.decisions || []).map(decision => ({
      ...decision,
      text: decision.text || decision.decision_text || 'Continuar',
      leadsTo: decision.leadsTo || decision.next_scene_id || decision.leads_to_scene || decision.leads_to_ending || decision.leads_to,
      nextSceneId: decision.nextSceneId || decision.next_scene_id || decision.leads_to_scene || null,
      endingId: decision.endingId || decision.leads_to_ending || null,
    })),
  };
}

async function getApiStories(endpoint) {
  try {
    const stories = await api.get(endpoint);

    let categories = [];
    try {
      categories = await CategoryService.getAll();
    } catch (error) {
    }

    return Array.isArray(stories)
      ? stories.map(story => normalizeStory(story, categories)).filter(Boolean)
      : [];
  } catch (error) {
    console.error('Error cargando historias.', endpoint, error);
    return [];
  }
}

export const StoryService = {
  async getAll() {
    const stories = await getApiStories('/stories/');
    return Array.isArray(stories)
      ? stories.filter(story => story.status === 'published')
      : [];
  },

  async getById(id) {
    if (!isValidStoryId(id)) return null;

    try {
      const story = await api.get(`/stories/${id}`);
      const categories = await CategoryService.getAll();
      if (story) return normalizeStory(story, categories);
    } catch (error) {
      console.error('No se pudo cargar la historia desde Supabase.', error);
    }
    return null;
  },

  async getFeatured() {
    const stories = await this.getAll();
    return stories.slice(0, 6);
  },

  async getByCategory(categoryId) {
    const stories = await this.getAll();
    const categories = await CategoryService.getAll();
    return stories.filter(story => CategoryService.matchesStory(story, categoryId, categories));
  },

  async search(query) {
    const stories = await this.getAll();
    const normalizedQuery = query.toLowerCase();
    return stories.filter(story => (
      story.title?.toLowerCase().includes(normalizedQuery)
      || story.description?.toLowerCase().includes(normalizedQuery)
      || story.author?.toLowerCase().includes(normalizedQuery)
    ));
  },

  async createStory(story) {
    const created = await api.post('/stories/', story);
    if (!created) {
      throw new Error('No se pudo conectar con el backend');
    }
    if (isValidStoryId(created.id)) rememberCreatedStory(String(created.id));
    const categories = await CategoryService.getAll();
    return normalizeStory(created, categories);
  },

  async updateStory(id, story) {
    if (!isValidStoryId(id)) {
      throw new Error('Id de historia invalido.');
    }
    const updated = await api.put(`/stories/${id}`, story);
    if (!updated) {
      throw new Error('No se pudo conectar con el backend');
    }
    const categories = await CategoryService.getAll();
    return normalizeStory(updated, categories);
  },

  async deleteStory(id) {
    if (!isValidStoryId(id)) {
      throw new Error('Id de historia invalido.');
    }
    const deleted = await api.delete(`/stories/${id}`);
    if (!deleted) {
      throw new Error('No se pudo conectar con el backend');
    }
    StoryCoverService.removeLocalCover(id);
    forgetCreatedStory(id);
    cleanupLocalStoryState(id);
    return deleted;
  },

  async getMyCreated(userId) {
    if (userId) {
      const stories = await getApiStories(`/stories/my-created/${encodeURIComponent(userId)}`);
      if (stories && stories.length) return stories;
    }

    const rememberedIds = getRememberedCreatedIds(userId || currentUserKey());
    const rememberedStories = (
      await Promise.all(rememberedIds.map(id => this.getById(id)))
    ).filter(Boolean);
    if (rememberedStories.length) return rememberedStories;
    return [];
  },

  async getScene(storyId, sceneId) {
    try {
      const scene = await api.get(`/stories/${storyId}/scenes/${sceneId}`);
      return scene ? normalizeScene(scene) : null;
    } catch (error) {
      console.error('No se pudo cargar la escena desde Supabase.', error);
      return null;
    }
  },

  async getFirstScene(storyId) {
    try {
      const scene = await api.get(`/stories/${storyId}/scenes/first`);
      if (scene?.message && !scene.content) {
        return { empty: true, message: scene.message };
      }
      if (scene) return normalizeScene(scene);
    } catch (error) {
      console.error('No se pudo cargar la primera escena desde Supabase.', error);
    }

    return null;
  },

  async getEnding(storyId, endingId) {
    try {
      return await api.get(`/stories/${storyId}/endings/${endingId}`);
    } catch (error) {
      console.error('No se pudo cargar el final desde Supabase.', error);
      return null;
    }
  },

  async continueStory({ storyId, currentSceneId, decisionId, decisionText, selectedChoice, context, userId }) {
    try {
      const payload = {
        story_id: storyId,
        current_scene_id: currentSceneId,
        decision_id: decisionId,
        decision_text: decisionText,
        selected_choice: selectedChoice || decisionText,
        context: context || null,
        user_id: userId,
      };
      const scene = await withTimeout(
        api.post('/ai/continue-story', payload),
        45000,
        'La continuacion con IA tardo demasiado.'
      );
      if (!scene) return null;

      const normalizedScene = normalizeScene(scene);
      if (!normalizedScene.decisions.length) {
        normalizedScene.decisions = buildDecisionsFromChoices(scene.choices);
      }
      return normalizedScene;
    } catch (error) {
      console.error('No se pudo continuar la historia con IA.', error);
      return null;
    }
  },

  async generateChoices({ storyId, currentSceneId, userId }) {
    try {
      const response = await api.post('/ai/generate-choices', {
        story_id: storyId,
        current_scene_id: currentSceneId,
        user_id: userId,
      });
      return Array.isArray(response?.choices) ? response.choices : [];
    } catch (error) {
      console.error('No se pudieron generar opciones narrativas.', error);
      return [];
    }
  },
};

function buildDecisionsFromChoices(choices = []) {
  const sourceChoices = Array.isArray(choices) && choices.length
    ? choices
    : [
      'Seguir adelante con cautela',
      'Tomar una decision inesperada',
    ];

  return sourceChoices.slice(0, 3).map((choice, index) => ({
    id: `fallback-${Date.now()}-${index + 1}`,
    text: choice,
    nextSceneId: null,
    endingId: null,
    hint: 'La historia continuara desde este punto.',
  }));
}

function withTimeout(promise, timeoutMs, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), timeoutMs);
    }),
  ]);
}
