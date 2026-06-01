import { renderNavbar, initNavbar } from '../components/Navbar.js';
import { renderSidebar, initSidebar } from '../components/Sidebar.js';
import { showToast } from '../components/Toast.js';
import { router } from '../router.js';
import { CategoryService } from '../services/CategoryService.js';
import { StoryService } from '../services/StoryService.js';
import { StoryCoverService } from '../services/StoryCoverService.js';
import { store } from '../store.js';
import { escapeHtml } from '../utils/helpers.js';

const REQUIRED_FIELDS = [
  'title',
  'description',
  'author',
  'category_id',
  'first_scene_content',
];

let selectedCoverFile = null;

export const CreateStoryPage = {
  render() {
    const user = store.get('user');
    const author = user?.name || '';
    return `
      ${renderNavbar()}
      ${renderSidebar()}
      <main class="page create-story">
        <div class="container">
          <div class="create-story__header">
            <p class="create-story__eyebrow">Escritura</p>
            <h1 class="create-story__title">Crear historia</h1>
          </div>

          <form class="create-story__layout" id="create-story-form" novalidate>
            <section class="create-story__form">
              <div class="form-group">
                <label class="form-label" for="story-title">Titulo</label>
                <input class="form-input" id="story-title" name="title" type="text" maxlength="200" required />
                <p class="form-message form-message--error" data-error-for="title"></p>
              </div>

              <div class="form-group">
                <label class="form-label" for="story-description">Descripcion</label>
                <textarea class="form-input" id="story-description" name="description" rows="4" required></textarea>
                <p class="form-message form-message--error" data-error-for="description"></p>
              </div>

              <div class="create-story__row">
                <div class="form-group">
                  <label class="form-label" for="story-author">Autor</label>
                  <input class="form-input" id="story-author" name="author" type="text" maxlength="100" value="${escapeHtml(author)}" required />
                  <p class="form-message form-message--error" data-error-for="author"></p>
                </div>

                <div class="form-group">
                  <label class="form-label" for="story-category">Categoria</label>
                  <select class="form-input" id="story-category" name="category_id" required disabled>
                    <option value="">Cargando categorias...</option>
                  </select>
                  <p class="form-message form-message--error" data-error-for="category_id"></p>
                  <p class="form-message form-message--info" id="category-message"></p>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label" for="story-cover">Imagen de portada</label>
                <label class="create-story__file" for="story-cover">
                  <span class="create-story__file-main" id="cover-file-label">Seleccionar imagen</span>
                  <span class="create-story__file-sub">JPG, PNG o WebP</span>
                </label>
                <input class="create-story__file-input" id="story-cover" name="cover_image" type="file" accept="image/jpeg,image/png,image/webp" />
              </div>

              <div class="form-group">
                <label class="form-label" for="story-content">Contenido inicial de la historia</label>
                <textarea class="form-input create-story__editor" id="story-content" name="first_scene_content" required></textarea>
                <p class="form-message form-message--error" data-error-for="first_scene_content"></p>
              </div>

              <div class="create-story__actions">
                <button class="btn btn--secondary btn--lg" type="submit" data-status="draft">
                  <span class="btn__text">Guardar borrador</span>
                </button>
                <button class="btn btn--primary btn--lg" type="submit" data-status="published">
                  <span class="btn__text">Publicar historia</span>
                </button>
              </div>
            </section>

            <aside class="create-story__preview" aria-live="polite">
              <div class="create-story__cover" id="cover-preview">
                <span>Novelle</span>
              </div>
              <div class="create-story__meta">
                <p id="preview-author">Autor</p>
                <h2 id="preview-title">Titulo de la historia</h2>
              </div>
            </aside>
          </form>
        </div>
      </main>
    `;
  },

  async init() {
    initNavbar();
    initSidebar();

    const form = document.getElementById('create-story-form');
    const coverInput = document.getElementById('story-cover');
    const titleInput = document.getElementById('story-title');
    const authorInput = document.getElementById('story-author');

    selectedCoverFile = null;

    await loadCategories();

    coverInput?.addEventListener('change', updateCoverPreview);
    titleInput?.addEventListener('input', updateTextPreview);
    authorInput?.addEventListener('input', updateTextPreview);

    form?.addEventListener('submit', async (event) => {
      event.preventDefault();

      const submitter = event.submitter;
      const status = submitter?.dataset.status || 'draft';

      clearErrors();

      const formData = new FormData(form);
      const user = store.get('user');
      const userId = user?.uid || user?.id || null;
      const initialContent = value(formData, 'first_scene_content');
      const payload = {
        title: value(formData, 'title'),
        description: value(formData, 'description'),
        author: value(formData, 'author'),
        category_id: value(formData, 'category_id'),
        cover_image: null,
        status,
        first_scene_content: initialContent,
        initial_content: initialContent,
        ...(userId ? { user_id: userId } : {}),
      };

      if (!validatePayload(payload)) return;

      setSubmitting(form, true);

      try {
        if (selectedCoverFile) {
          const coverKey = `pending-${userId || 'guest'}-${Date.now()}`;
          payload.cover_image = await StoryCoverService.uploadCoverUrl(coverKey, selectedCoverFile);
        }

        let created = await StoryService.createStory(payload);
        const storyId = getStoryId(created);

        if (!storyId) {
          throw new Error('La historia se guardo, pero el backend no devolvio un id valido.');
        }

        if (selectedCoverFile && !payload.cover_image) {
          const coverUrl = await StoryCoverService.saveCoverForStory(storyId, selectedCoverFile);
          if (coverUrl) {
            created = await StoryService.updateStory(storyId, { cover_image: coverUrl });
          }
        }

        showToast(status === 'published' ? 'Historia publicada' : 'Borrador guardado', 'success');
        if (status === 'published') {
          setTimeout(() => router.navigate(`/story/${storyId}`), 700);
        } else {
          form.reset();
          resetCoverPreview();
        }
      } catch (error) {
        showToast(error.message || 'No se pudo guardar la historia', 'error');
      } finally {
        setSubmitting(form, false);
      }
    });
  },
};

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
  document.querySelectorAll('.form-input--invalid').forEach((input) => {
    input.classList.remove('form-input--invalid');
  });
  document.querySelectorAll('[data-error-for]').forEach((error) => {
    error.textContent = '';
  });
}

function setSubmitting(form, submitting) {
  form.querySelectorAll('button[type="submit"]').forEach((button) => {
    button.disabled = submitting;
    button.classList.toggle('btn--loading', submitting);
  });
}

function getStoryId(response) {
  const id = response?.id || response?.story_id || response?.story?.id;
  if (!id || ['undefined', 'null', 'temp'].includes(String(id).toLowerCase())) return null;
  return String(id);
}

function resetCoverPreview() {
  const preview = document.getElementById('cover-preview');
  const label = document.getElementById('cover-file-label');
  selectedCoverFile = null;
  if (preview) {
    preview.style.backgroundImage = '';
    preview.classList.remove('has-image');
  }
  if (label) label.textContent = 'Seleccionar imagen';
  updateTextPreview();
}

async function updateCoverPreview(event) {
  const preview = document.getElementById('cover-preview');
  const label = document.getElementById('cover-file-label');
  const file = event.target.files?.[0];
  if (!preview) return;

  if (!file) {
    selectedCoverFile = null;
    preview.style.backgroundImage = '';
    preview.classList.remove('has-image');
    if (label) label.textContent = 'Seleccionar imagen';
    return;
  }

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
  const titleValue = document.getElementById('story-title')?.value.trim();
  const authorValue = document.getElementById('story-author')?.value.trim();

  if (title) title.textContent = titleValue || 'Titulo de la historia';
  if (author) author.textContent = authorValue || 'Autor';
}

async function loadCategories() {
  const select = document.getElementById('story-category');
  const message = document.getElementById('category-message');
  if (!select) return;

  const categories = await CategoryService.getAll();

  if (!categories.length) {
    select.innerHTML = '<option value="">Sin categorias disponibles</option>';
    select.disabled = true;
    if (message) message.textContent = 'No hay categorias disponibles para publicar historias.';
    return;
  }

  select.innerHTML = [
    '<option value="">Selecciona una categoria</option>',
    ...categories.map(category => `<option value="${escapeHtml(category.id)}">${escapeHtml(category.name)}</option>`),
  ].join('');
  select.disabled = false;
  if (message) message.textContent = '';
}
