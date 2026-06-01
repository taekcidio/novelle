import { api } from '../utils/api.js';

let categoriesCache = null;

export function normalizeCategoryName(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function getCategorySlug(category) {
  return category?.slug || normalizeCategoryName(category?.name || category?.category || category);
}

export const CategoryService = {
  async getAll() {
    if (categoriesCache) return categoriesCache;

    try {
      const categories = await api.get('/categories/');
      if (Array.isArray(categories)) {
        categoriesCache = categories.map(category => ({
          ...category,
          slug: getCategorySlug(category),
        }));
        return categoriesCache;
      }
    } catch (error) {
      console.error('No se pudieron cargar las categorias desde Supabase.', error);
    }

    console.error('No se pudieron cargar categorias reales.');
    return [];
  },

  findForStory(story, categories = []) {
    return categories.find(category => (
      category.id === story.category_id
      || category.id === story.category
      || getCategorySlug(category) === normalizeCategoryName(story.category)
      || normalizeCategoryName(category.name) === normalizeCategoryName(story.categoryName)
    )) || null;
  },

  matchesStory(story, categoryRef, categories = []) {
    if (!categoryRef || categoryRef === 'all') return true;

    const normalizedRef = normalizeCategoryName(categoryRef);
    const category = this.findForStory(story, categories);

    return (
      story.category_id === categoryRef
      || story.category === categoryRef
      || normalizeCategoryName(story.category) === normalizedRef
      || normalizeCategoryName(story.categoryName) === normalizedRef
      || category?.id === categoryRef
      || getCategorySlug(category) === normalizedRef
    );
  },
};
