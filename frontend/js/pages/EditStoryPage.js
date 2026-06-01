import { renderNavbar, initNavbar } from '../components/Navbar.js';
import { renderSidebar, initSidebar } from '../components/Sidebar.js';
import { showToast } from '../components/Toast.js';
import { router } from '../router.js';
import { CategoryService } from '../services/CategoryService.js';
import { StoryService } from '../services/StoryService.js';
import { StoryCoverService } from '../services/StoryCoverService.js';
import { store } from '../store.js';

const REQUIRED_FIELDS = ['title', 'description', 'author', 'category_id', 'first_scene_content'];
let selectedCoverFile = null;
let currentCoverImage = null;

export const EditStoryPage = {
  render() {
    return `
      ${renderNavbar()}
      ${renderSidebar()}
      <main class="page create-story">
        <div class="container">
          <div class="create-story__header">
            <p class="create-story__eyebrow">Gestionar</p>
            <h1 class="create-story__title">Editar historia</h1>
          </div>
          <div id="edit-story-root" class="create-story__loading">Cargando historia...</div>
        </div>
      </main>
    `;
  },

  async init(params) {
    initNavbar();
    initSidebar();

    const storyId = normalizeStoryId(params?.id);
    const root = document.getElementById('edit-story-root');

    if (!root) return;

    if (!storyId) {
      showToast('Historia no encontrada', 'error');
      router.navigate('/profile');
      return;
    }

    const story = await StoryService.getById(storyId);

    if (!story) {
      root.textContent = 'Historia no encontrada.';
      showToast('Historia no encontrada', 'error');
      router.navigate('/profile');
      return;
    }

    if (!(await canEditStory(story, storyId))) {
      root.textContent = 'No puedes editar esta historia.';
      showToast('No puedes editar esta historia', 'error');
      router.navigate('/profile');
      return;
    }

    selectedCoverFile = null;
    currentCoverImage = story.cover_image || story.cover || null;
    root.outerHTML = renderForm(story);
    bindForm(story);
  },
};

function renderForm(story) {
  const firstScene = story.scenes_data?.[0] || story.scenes?.[0] || {};
  const coverImage = story.cover_image || story.cover || null;
  const coverStyle = coverImage ? `style="background-image:url('${escapeAttr(coverImage)}')"` : '';

  return `
    <form class="create-story__layout" id="edit-story-form" novalidate>
      <section class="create-story__form">
        <div class="form-group">
          <label class="form-label" for="story-title">Titulo</label>
          <input class="form-input" id="story-title" name="title" type="text" maxlength="200" value="${escapeAttr(story.title)}" required />
          <p class="form-message form-message--error" data-error-for="title"></p>
        </div>

        <div class="form-group">
          <label class="form-label" for="story-description">Descripcion</label>
          <textarea class="form-input" id="story-description" name="description" rows="4" required>${escapeHtml(story.description)}</textarea>
          <p class="form-message form-message--error" data-error-for="description"></p>
        </div>

        <div class="create-story__row">
          <div class="form-group">
            <label class="form-label" for="story-author">Autor</label>
            <input class="form-input" id="story-author" name="author" type="text" maxlength="100" value="${escapeAttr(story.author)}" required />
            <p class="form-message form-message--error" data-error-for="author"></p>
          </div>
          <div class="form-group">
            <label class="form-label" for="story-category">Categoria</label>
            <select class="form-input" id="story-category" name="category_id" data-selected="${escapeAttr(story.category_id || '')}" required disabled>
              <option value="">Cargando categorias...</option>
            </select>
            <p class="form-message form-message--error" data-error-for="category_id"></p>
            <p class="form-message form-message--info" id="category-message"></p>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="story-cover">Imagen de portada</label>
          <label class="create-story__file" for="story-cover">
            <span class="create-story__file-main" id="cover-file-label">${coverImage ? 'Cambiar imagen' : 'Seleccionar imagen'}</span>
            <span class="create-story__file-sub">JPG, PNG o WebP</span>
          </label>
          <input class="create-story__file-input" id="story-cover" name="cover_image" type="file" accept="image/jpeg,image/png,image/webp" />
        </div>

        <div class="form-group">
          <label class="form-label" for="story-content">Contenido inicial de la historia</label>
          <textarea class="form-input create-story__editor" id="story-content" name="first_scene_content" required>${escapeHtml(firstScene.content || '')}</textarea>
          <p class="form-message form-message--error" data-error-for="first_scene_content"></p>
        </div>

        <div class="form-group">
          <label class="form-label" for="story-status">Estado</label>
          <select class="form-input" id="story-status" name="status">
            <option value="draft" ${story.status !== 'published' ? 'selected' : ''}>Borrador</option>
            <option value="published" ${story.status === 'published' ? 'selected' : ''}>Publicada</option>
          </select>
        </div>

        <div class="create-story__actions">
          <button class="btn btn--primary btn--lg" type="submit"><span class="btn__text">Guardar cambios</span></button>
          <button class="btn btn--secondary btn--lg" type="button" id="delete-story">Eliminar historia</button>
        </div>
      </section>

      <aside class="create-story__preview" aria-live="polite">
        <div class="create-story__cover ${coverImage ? 'has-image' : ''}" id="cover-preview" ${coverStyle}>
          <span>Novelle</span>
        </div>
        <div class="create-story__meta">
          <p id="preview-author">${escapeHtml(story.author || 'Autor')}</p>
          <h2 id="preview-title">${escapeHtml(story.title || 'Titulo de la historia')}</h2>
        </div>
      </aside>
    </form>
  `;
}

async function bindForm(story) {
  const form = document.getElementById('edit-story-form');
  const coverInput = document.getElementById('story-cover');
  const titleInput = document.getElementById('story-title');
  const authorInput = document.getElementById('story-author');
  const deleteButton = document.getElementById('delete-story');

  await loadCategories(story.category_id || '');

  coverInput?.addEventListener('change', updateCoverPreview);
  titleInput?.addEventListener('input', updateTextPreview);
  authorInput?.addEventListener('input', updateTextPreview);

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearErrors();

    const formData = new FormData(form);
    const userId = getCurrentUserId();
    const initialContent = value(formData, 'first_scene_content');
    const payload = {
      title: value(formData, 'title'),
      description: value(formData, 'description'),
      author: value(formData, 'author'),
      category_id: value(formData, 'category_id'),
      cover_image: currentCoverImage && !currentCoverImage.startsWith('data:image/') ? currentCoverImage : null,
      status: value(formData, 'status') || 'draft',
      first_scene_content: initialContent,
      initial_content: initialContent,
      ...(userId ? { user_id: userId } : {}),
    };

    if (!validatePayload(payload)) return;

    setSubmitting(form, true);
    try {
      if (selectedCoverFile) {
        const coverUrl = await StoryCoverService.saveCoverForStory(story.id, selectedCoverFile);
        if (coverUrl) payload.cover_image = coverUrl;
      }
      const updatedStory = await StoryService.updateStory(story.id, payload);
      selectedCoverFile = null;
      currentCoverImage = updatedStory.cover_image || updatedStory.cover || payload.cover_image || null;
      showToast('Cambios guardados', 'success');
      form.outerHTML = renderForm(updatedStory);
      bindForm(updatedStory);
    } catch (error) {
      showToast(error.message || 'No se pudo guardar la historia', 'error');
    } finally {
      if (form.isConnected) setSubmitting(form, false);
    }
  });

  deleteButton?.addEventListener('click', async () => {
    if (!confirm('Eliminar esta historia?')) return;
    setSubmitting(form, true);
    try {
      await StoryService.deleteStory(story.id);
      store.set('currentStory', null);
      showToast('Historia eliminada', 'success');
      router.navigate('/profile');
    } catch (error) {
      showToast(error.message || 'No se pudo eliminar la historia', 'error');
      setSubmitting(form, false);
    }
  });
}

function normalizeStoryId(id) {
  const valueToCheck = String(id || '').trim();
  if (!valueToCheck || ['undefined', 'null', 'temp'].includes(valueToCheck.toLowerCase())) return null;
  return valueToCheck;
}

function value(formData, name) {
  return String(formData.get(name) || '').trim();
}

function validatePayload(payload) {
  let valid = true;
  REQUIRED_FIELDS.forEach((field) => {
    if (!payload[field]) {
      setError(field, 'Campo obligatorio');
      valid = false;
    }
  });
  return valid;
}

function setError(field, message) {
  const input = document.querySelector(`[name="${field}"]`);
  const error = document.querySelector(`[data-error-for="${field}"]`);
  input?.classList.add('form-input--invalid');
  if (error) error.textContent = message;
}

function clearErrors() {
  document.querySelectorAll('.form-input--invalid').forEach(input => input.classList.remove('form-input--invalid'));
  document.querySelectorAll('[data-error-for]').forEach(error => { error.textContent = ''; });
}

function setSubmitting(form, submitting) {
  form.querySelectorAll('button').forEach((button) => {
    button.disabled = submitting;
  });
  form.querySelector('button[type="submit"]')?.classList.toggle('btn--loading', submitting);
}

async function updateCoverPreview(event) {
  const preview = document.getElementById('cover-preview');
  const label = document.getElementById('cover-file-label');
  const file = event.target.files?.[0];
  if (!preview || !file) return;

  try {
    const previewImage = await StoryCoverService.previewDataUrl(file);
    selectedCoverFile = file;
    preview.style.backgroundImage = `url("${previewImage}")`;
    preview.classList.add('has-image');
    if (label) label.textContent = file.name;
  } catch (error) {
    selectedCoverFile = null;
    event.target.value = '';
    showToast(error.message || 'No se pudo cargar la portada', 'error');
  }
}

function updateTextPreview() {
  const title = document.getElementById('preview-title');
  const author = document.getElementById('preview-author');
  if (title) title.textContent = document.getElementById('story-title')?.value.trim() || 'Titulo de la historia';
  if (author) author.textContent = document.getElementById('story-author')?.value.trim() || 'Autor';
}

function escapeHtml(valueToEscape) {
  return String(valueToEscape || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeAttr(valueToEscape) {
  return escapeHtml(valueToEscape);
}

async function loadCategories(selectedCategoryId) {
  const select = document.getElementById('story-category');
  const message = document.getElementById('category-message');
  if (!select) return;

  const categories = await CategoryService.getAll();

  if (!categories.length) {
    select.innerHTML = '<option value="">Sin categorias disponibles</option>';
    select.disabled = true;
    if (message) message.textContent = 'No hay categorias disponibles para guardar cambios.';
    return;
  }

  select.innerHTML = [
    '<option value="">Selecciona una categoria</option>',
    ...categories.map(category => `
      <option value="${escapeAttr(category.id)}" ${category.id === selectedCategoryId ? 'selected' : ''}>${escapeHtml(category.name)}</option>
    `),
  ].join('');
  select.disabled = false;
  if (message) message.textContent = '';
}

async function canEditStory(story, storyId) {
  const userKey = getCurrentUserId();
  if (!userKey) return false;
  const created = await StoryService.getMyCreated(userKey);
  const wasCreatedByCurrentUser = created.some(item => item.id === storyId);

  if (story.user_id) {
    return String(story.user_id) === String(userKey) || wasCreatedByCurrentUser;
  }

  return wasCreatedByCurrentUser;
}

function getCurrentUserId() {
  const user = store.get('user');
  return user?.uid || user?.id || 'guest';
}
