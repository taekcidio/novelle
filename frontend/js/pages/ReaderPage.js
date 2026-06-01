import { router } from '../router.js';
import { store } from '../store.js';
import { StoryService } from '../services/StoryService.js';
import { CommentService } from '../services/CommentService.js';
import { ProgressService, HistoryService } from '../services/ProgressService.js';
import { showToast } from '../components/Toast.js';
import { $ } from '../utils/dom.js';
import { icon } from '../utils/icons.js';
import { displayText, escapeHtml, throttle, timeAgo } from '../utils/helpers.js';

let isReaderLoading = false;

const READER_PREF_KEYS = {
  font: 'readerFont',
  fontSize: 'readerFontSize',
  theme: 'readerTheme',
};

const READER_DEFAULTS = {
  font: 'Inter',
  fontSize: 'medium',
  theme: 'dark',
};

const READER_FONT_SIZES = {
  small: '17px',
  medium: '19px',
  large: '21px',
  xlarge: '23px',
};

const READER_FONTS = {
  Inter: '"Inter", sans-serif',
  Georgia: 'Georgia, serif',
  Merriweather: '"Merriweather", Georgia, serif',
  'Playfair Display': '"Playfair Display", Georgia, serif',
};

export const ReaderPage = {
  render() {
    return `
      <div class="reader page--no-nav" id="reader-root">
        <div class="reading-progress"><div class="reading-progress__fill" id="reading-progress"></div></div>
        <header class="reader__header" id="reader-header">
          <button class="reader__back" id="reader-back">${icon('arrowLeft')}</button>
          <span class="reader__story-title" id="reader-title">Cargando...</span>
          <div class="reader__actions">
            <button class="btn btn--ghost btn--icon" id="reader-bookmark">${icon('bookmark')}</button>
            <button class="btn btn--ghost btn--icon" id="reader-settings-btn">${icon('settings')}</button>
          </div>
        </header>
        <aside class="reader-settings" id="reader-settings-panel" aria-hidden="true">
          <div class="reader-settings__head">
            <h2>Lectura</h2>
            <button class="reader-settings__close" id="reader-settings-close" aria-label="Cerrar configuración">${icon('x')}</button>
          </div>

          <div class="reader-settings__group">
            <p class="reader-settings__label">Tamaño de letra</p>
            <div class="reader-settings__options" data-reader-setting="fontSize">
              <button class="reader-settings__option" data-reader-value="small">Pequeña</button>
              <button class="reader-settings__option" data-reader-value="medium">Mediana</button>
              <button class="reader-settings__option" data-reader-value="large">Grande</button>
              <button class="reader-settings__option" data-reader-value="xlarge">Muy grande</button>
            </div>
          </div>

          <div class="reader-settings__group">
            <p class="reader-settings__label">Fuente de lectura</p>
            <div class="reader-settings__options" data-reader-setting="font">
              <button class="reader-settings__option" data-reader-value="Inter">Inter</button>
              <button class="reader-settings__option" data-reader-value="Georgia">Georgia</button>
              <button class="reader-settings__option" data-reader-value="Merriweather">Merriweather</button>
              <button class="reader-settings__option" data-reader-value="Playfair Display">Playfair Display</button>
            </div>
          </div>

          <div class="reader-settings__group">
            <p class="reader-settings__label">Tema de lectura</p>
            <div class="reader-settings__options" data-reader-setting="theme">
              <button class="reader-settings__option" data-reader-value="dark">Oscuro</button>
              <button class="reader-settings__option" data-reader-value="sepia">Sepia</button>
              <button class="reader-settings__option" data-reader-value="light">Claro</button>
              <button class="reader-settings__option" data-reader-value="black">Negro puro</button>
            </div>
          </div>
        </aside>
        <div class="reader-settings-backdrop" id="reader-settings-backdrop"></div>
        <div class="reader__content" id="reader-content">
          <div class="anim-fade-in" id="scene-container">
            <div style="text-align:center;padding:80px 0">
              <div class="skeleton skeleton--title" style="margin:0 auto"></div>
              <div class="skeleton skeleton--text mt-4" style="width:100%"></div>
              <div class="skeleton skeleton--text mt-4" style="width:90%"></div>
              <div class="skeleton skeleton--text mt-4" style="width:95%"></div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  async init(params) {
    isReaderLoading = false;
    initReaderSettings();
    const storyId = params.id;
    const sceneParam = router.getQuery().scene;

    const story = await StoryService.getById(storyId);
    if (!story) {
      router.navigate('/home');
      return;
    }

    const storyTitle = displayText(story.title, 'Historia');
    $('#reader-title').textContent = storyTitle;

    let scene = null;
    try {
      scene = await getInitialScene(storyId, sceneParam);
    } catch (error) {
      console.error('No se pudo cargar la escena inicial.', error);
      scene = { empty: true, message: 'Esta historia aun no tiene contenido inicial.' };
    }

    if (scene?.empty) {
      renderEmptyScene(scene.message);
    } else if (scene?.content) {
      store.set('currentScene', scene);
      renderScene(scene, story);
      HistoryService.add(storyId, storyTitle, 'read');
    } else {
      renderEmptyScene();
    }
    $('#reader-back')?.addEventListener('click', () => {
      router.navigate('/home');
    });

    window.addEventListener('scroll', throttle(() => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      const bar = $('#reading-progress');
      if (bar) bar.style.width = `${Math.min(progress, 100)}%`;

      const header = $('#reader-header');
      if (header) header.classList.toggle('hidden', scrollTop > 200);
    }, 50));
  },
};

async function getInitialScene(storyId, sceneParam = null) {
  const savedProgress = ProgressService.getProgress(storyId);
  const preferredSceneId = sceneParam || savedProgress?.currentScene;

  if (preferredSceneId) {
    const savedScene = await StoryService.getScene(storyId, preferredSceneId);
    if (savedScene?.content) return savedScene;
  }

  return StoryService.getFirstScene(storyId);
}

function initReaderSettings() {
  applyReaderPrefs(getReaderPrefs());
  updateReaderSettingsUI();

  const panel = $('#reader-settings-panel');
  const settingsBtn = $('#reader-settings-btn');
  const closeBtn = $('#reader-settings-close');
  const backdrop = $('#reader-settings-backdrop');

  const closePanel = () => {
    panel?.classList.remove('active');
    backdrop?.classList.remove('active');
    panel?.setAttribute('aria-hidden', 'true');
  };

  settingsBtn?.addEventListener('click', () => {
    const isOpen = panel?.classList.toggle('active');
    backdrop?.classList.toggle('active', Boolean(isOpen));
    panel?.setAttribute('aria-hidden', String(!isOpen));
  });

  closeBtn?.addEventListener('click', closePanel);
  backdrop?.addEventListener('click', closePanel);

  panel?.querySelectorAll('[data-reader-setting] .reader-settings__option').forEach((button) => {
    button.addEventListener('click', () => {
      const setting = button.closest('[data-reader-setting]')?.dataset.readerSetting;
      const value = button.dataset.readerValue;
      if (!setting || !value) return;

      const prefs = getReaderPrefs();
      prefs[setting] = value;
      saveReaderPrefs(prefs);
      applyReaderPrefs(prefs);
      updateReaderSettingsUI();
    });
  });
}

function getReaderPrefs() {
  return {
    font: localStorage.getItem(READER_PREF_KEYS.font) || READER_DEFAULTS.font,
    fontSize: localStorage.getItem(READER_PREF_KEYS.fontSize) || READER_DEFAULTS.fontSize,
    theme: localStorage.getItem(READER_PREF_KEYS.theme) || READER_DEFAULTS.theme,
  };
}

function saveReaderPrefs(prefs) {
  localStorage.setItem(READER_PREF_KEYS.font, prefs.font);
  localStorage.setItem(READER_PREF_KEYS.fontSize, prefs.fontSize);
  localStorage.setItem(READER_PREF_KEYS.theme, prefs.theme);
}

function applyReaderPrefs(prefs) {
  const reader = $('#reader-root');
  if (!reader) return;

  const fontSize = READER_FONT_SIZES[prefs.fontSize] || READER_FONT_SIZES.medium;
  const fontFamily = READER_FONTS[prefs.font] || READER_FONTS.Inter;
  const theme = ['dark', 'sepia', 'light', 'black'].includes(prefs.theme) ? prefs.theme : READER_DEFAULTS.theme;

  reader.dataset.readerTheme = theme;
  reader.style.setProperty('--reader-font-size', fontSize);
  reader.style.setProperty('--reader-font-family', fontFamily);
}

function updateReaderSettingsUI() {
  const prefs = getReaderPrefs();
  const panel = $('#reader-settings-panel');
  if (!panel) return;

  panel.querySelectorAll('[data-reader-setting]').forEach((group) => {
    const setting = group.dataset.readerSetting;
    group.querySelectorAll('.reader-settings__option').forEach((option) => {
      option.classList.toggle('active', option.dataset.readerValue === prefs[setting]);
    });
  });
}

function renderEmptyScene(message = 'Esta historia aun no tiene contenido inicial.') {
  const container = $('#scene-container');
  if (!container) return;

  container.innerHTML = `
    <div class="empty-state anim-fade-in" style="padding:80px 0">
      <div class="empty-state__icon">${icon('book')}</div>
      <h3 class="empty-state__title">Sin contenido inicial</h3>
      <p class="empty-state__text">${escapeHtml(message)}</p>
    </div>
  `;
}

function renderScene(scene, story) {
  const container = $('#scene-container');
  if (!container) return;
  const partNumber = resolvePartNumber(story, scene);
  const partLabel = renderPartLabel(story, scene, partNumber);

  const progressBar = $('#reading-progress');
  if (progressBar) {
    const sceneProgress = Math.min(((Number(scene.sceneOrder ?? scene.order ?? 0) + 1) / 6) * 100, 92);
    progressBar.style.width = `${sceneProgress}%`;
  }

  const paragraphs = String(scene.content || '').split('\n\n').map((paragraph) => {
    if (paragraph.startsWith('"') || paragraph.startsWith('-')) {
      return `<p class="dialogue">${escapeHtml(paragraph)}</p>`;
    }
    return `<p>${escapeHtml(paragraph)}</p>`;
  }).join('');

  const decisions = scene.decisions || [];
  const decisionsHTML = decisions.length
    ? `
      <div class="reader__decision-prompt">Que decides hacer?</div>
      <div class="decisions__options" style="max-width:500px;margin:0 auto">
        ${decisions.map(decision => `
          <button
            class="decisions__option"
            data-decision-id="${decision.id}"
            data-next-scene-id="${decision.nextSceneId || ''}"
            data-ending-id="${decision.endingId || ''}"
          >
            <p class="decisions__option__text">${escapeHtml(displayText(decision.text, 'Continuar'))}</p>
            ${decision.hint ? `<p class="decisions__option__hint">${escapeHtml(decision.hint)}</p>` : ''}
          </button>
        `).join('')}
      </div>
    `
    : '';

  container.innerHTML = `
    <div class="reader__part-indicator anim-fade-in">${partLabel}</div>
    <h2 class="reader__scene-title anim-fade-in">${escapeHtml(displayText(scene.title, 'Escena'))}</h2>
    <div class="reader__text anim-fade-in">${paragraphs || `<p>${escapeHtml('La escena no tiene contenido disponible.')}</p>`}</div>
    ${decisionsHTML}
    ${decisions.length && !scene.isEnding ? renderFinishControl(scene) : ''}
    ${!decisions.length && !scene.isEnding ? renderGeneratedChoicesState(scene) : ''}
    ${renderCommentsSection()}
  `;

  if (!decisions.length && !scene.isEnding) {
    hydrateGeneratedChoices(scene, story);
  }

  container.querySelectorAll('.decisions__option').forEach((button) => {
    button.addEventListener('click', async () => {
      if (isReaderLoading) return;

      const decisionId = button.dataset.decisionId;
      const nextSceneId = button.dataset.nextSceneId;
      const endingId = button.dataset.endingId;
      const decisionText = button.querySelector('.decisions__option__text')?.textContent || 'Continuar';

      container.querySelectorAll('.decisions__option').forEach((option) => {
        option.style.opacity = '0.3';
        option.disabled = true;
      });
      button.classList.add('selected');
      button.style.opacity = '1';

      await continueFromDecision({
        story,
        scene,
        decisionId,
        decisionText,
        nextSceneId,
        endingId,
      });
    });
  });

  attachFinishHandler(story, scene);
  initComments(story);
}

function renderCommentsSection() {
  const user = store.get('user');

  return `
    <section class="comments" id="story-comments" aria-label="Comentarios">
      <div class="comments__header">
        <h2>Comentarios</h2>
      </div>
      ${user ? `
        <form class="comments__form" id="comment-form">
          <textarea
            class="comments__input"
            id="comment-input"
            maxlength="500"
            rows="3"
            placeholder="Escribe un comentario..."
          ></textarea>
          <div class="comments__form-footer">
            <span class="comments__counter" id="comment-counter">0/500</span>
            <button class="btn btn--primary btn--sm" id="comment-submit" type="submit">Publicar comentario</button>
          </div>
        </form>
      ` : `
        <p class="comments__login">Inicia sesi&oacute;n para comentar.</p>
      `}
      <div class="comments__status" id="comments-status">Cargando comentarios...</div>
      <div class="comments__list" id="comments-list"></div>
    </section>
  `;
}

async function initComments(story) {
  const section = $('#story-comments');
  if (!section || !story?.id) return;

  bindCommentForm(story);
  await loadComments(story.id);
}

function bindCommentForm(story) {
  const form = $('#comment-form');
  const input = $('#comment-input');
  const counter = $('#comment-counter');
  if (!form || !input) return;

  input.addEventListener('input', () => {
    if (counter) counter.textContent = `${input.value.length}/500`;
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const user = store.get('user');
    if (!user) {
      showToast('Inicia sesion para comentar', 'warning');
      return;
    }

    const content = input.value.trim();
    if (!content) {
      showToast('Escribe un comentario antes de publicar.', 'warning');
      return;
    }

    if (content.length > 500) {
      showToast('El comentario no puede superar 500 caracteres.', 'warning');
      return;
    }

    const submit = $('#comment-submit');
    if (submit) submit.disabled = true;

    try {
      const comment = await CommentService.create({
        storyId: story.id,
        userId: user.uid || user.id,
        userName: user.username || user.name || user.email || 'Lector',
        userAvatar: user.avatar || null,
        content,
      });
      input.value = '';
      if (counter) counter.textContent = '0/500';
      prependComment(comment);
      showToast('Comentario publicado', 'success');
    } catch (error) {
      showToast(error.message || 'No pudimos publicar tu comentario.', 'error');
    } finally {
      if (submit) submit.disabled = false;
    }
  });
}

async function loadComments(storyId) {
  const status = $('#comments-status');
  const list = $('#comments-list');
  if (!status || !list) return;

  status.textContent = 'Cargando comentarios...';
  list.innerHTML = '';

  try {
    const comments = await CommentService.getByStory(storyId);
    renderComments(comments);
  } catch (error) {
    console.error('No se pudieron cargar los comentarios.', error);
    status.textContent = 'No pudimos cargar los comentarios. Intenta de nuevo en un momento.';
  }
}

function renderComments(comments) {
  const status = $('#comments-status');
  const list = $('#comments-list');
  if (!status || !list) return;

  list.innerHTML = '';
  if (!comments.length) {
    status.innerHTML = 'S&eacute; el primero en comentar esta historia.';
    return;
  }

  status.textContent = '';
  comments.forEach(comment => list.appendChild(createCommentElement(comment)));
}

function prependComment(comment) {
  const status = $('#comments-status');
  const list = $('#comments-list');
  if (!list) return;

  if (status) status.textContent = '';
  list.prepend(createCommentElement(comment));
}

function createCommentElement(comment) {
  const user = store.get('user');
  const isOwner = Boolean(user && (user.uid || user.id) === comment.userId);
  const article = document.createElement('article');
  article.className = 'comments__item';
  article.dataset.commentId = comment.id;

  const avatar = document.createElement('div');
  avatar.className = 'comments__avatar';
  if (comment.userAvatar) {
    avatar.style.backgroundImage = `url("${String(comment.userAvatar).replace(/"/g, '%22')}")`;
    avatar.classList.add('has-image');
  } else {
    avatar.textContent = getInitial(comment.userName);
  }

  const body = document.createElement('div');
  body.className = 'comments__body';

  const meta = document.createElement('div');
  meta.className = 'comments__meta';

  const name = document.createElement('span');
  name.className = 'comments__name';
  name.textContent = comment.userName || 'Lector';

  const date = document.createElement('time');
  date.className = 'comments__date';
  if (comment.createdAt) date.dateTime = comment.createdAt;
  date.textContent = comment.createdAt ? timeAgo(comment.createdAt) : 'Justo ahora';

  meta.append(name, date);

  const content = document.createElement('p');
  content.className = 'comments__content';
  content.textContent = comment.content;

  body.append(meta, content);

  if (isOwner) {
    const deleteButton = document.createElement('button');
    deleteButton.className = 'comments__delete';
    deleteButton.type = 'button';
    deleteButton.textContent = 'Eliminar';
    deleteButton.addEventListener('click', () => deleteComment(comment, article));
    body.appendChild(deleteButton);
  }

  article.append(avatar, body);
  return article;
}

async function deleteComment(comment, element) {
  const user = store.get('user');
  if (!user) return;

  try {
    await CommentService.delete(comment.id, user.uid || user.id);
    element.remove();
    const list = $('#comments-list');
    const status = $('#comments-status');
    if (list && status && !list.children.length) {
      status.innerHTML = 'S&eacute; el primero en comentar esta historia.';
    }
    showToast('Comentario eliminado', 'success');
  } catch (error) {
    showToast(error.message || 'No pudimos eliminar el comentario.', 'error');
  }
}

function getInitial(name) {
  return String(name || 'L').trim().charAt(0).toUpperCase() || 'L';
}

async function continueFromDecision({ story, scene, decisionId = null, decisionText = 'Continuar', nextSceneId = '', endingId = '' }) {
  isReaderLoading = true;
  showSceneLoading();
  window.scrollTo({ top: 0, behavior: 'smooth' });

  try {
    await ProgressService.saveInteractiveProgress(story.id, {
      currentScene: scene.id,
      decisionId,
      decisionText,
      nextSceneId,
      endingId,
      completed: Boolean(endingId),
      partNumber: resolvePartNumber(story, scene),
    });

    if (endingId) {
      const ending = await StoryService.getEnding(story.id, endingId);
      renderEndingScreen(ending, story);
      return;
    }

    if (nextSceneId) {
      const nextScene = await StoryService.getScene(story.id, nextSceneId);
      if (nextScene?.content) {
        await setCurrentScene(story.id, nextScene, {
          partNumber: resolveNextPartNumber(story, scene, nextScene),
        });
        renderScene(nextScene, story);
        return;
      }
    }

    const generatedScene = await continueWithAI({ story, scene, decisionId, decisionText });
    if (!generatedScene?.content) {
      throw new Error('AI continuation did not return a valid scene.');
    }

    await setCurrentScene(story.id, generatedScene, {
      partNumber: resolveNextPartNumber(story, scene, generatedScene),
    });
    renderScene(generatedScene, story);
  } catch (error) {
    console.error('Error continuando la historia.', error);
    renderScene(scene, story);
    renderReaderNotice('No pudimos continuar la historia ahora. Tu escena actual se mantiene guardada. Intenta de nuevo en un momento.');
  } finally {
    isReaderLoading = false;
  }
}

async function continueWithAI({ story, scene, decisionId = null, decisionText = 'Continuar' }) {
  const user = store.get('user');
  let generatedScene = null;

  try {
    generatedScene = await StoryService.continueStory({
      storyId: story.id,
      currentSceneId: scene.id,
      decisionId,
      decisionText,
      selectedChoice: decisionText,
      context: {
        currentSceneTitle: scene.title,
        currentSceneContent: scene.content,
      },
      userId: user?.id || null,
    });
  } catch (error) {
    console.error('No se pudo continuar con IA.', error);
    return null;
  }

  if (!generatedScene) return null;
  return generatedScene;
}

async function setCurrentScene(storyId, scene, { partNumber = null } = {}) {
  store.set('currentScene', scene);
  await ProgressService.saveInteractiveProgress(storyId, {
    currentScene: scene.id,
    nextSceneId: scene.id,
    completed: false,
    partNumber,
  });
}

function showSceneLoading() {
  const container = $('#scene-container');
  if (!container) return;

  container.innerHTML = `
    <div class="anim-fade-in" style="text-align:center;padding:80px 0">
      <div class="skeleton skeleton--title" style="margin:0 auto"></div>
      <div class="skeleton skeleton--text mt-4" style="width:100%"></div>
      <div class="skeleton skeleton--text mt-4" style="width:90%"></div>
      <p class="text-secondary text-sm mt-6">Cargando siguiente fragmento...</p>
    </div>
  `;
}

function renderGeneratedChoicesState(scene) {
  return `
    <div class="reader__decision-prompt">Que decides hacer?</div>
    <div class="decisions__options" id="generated-decisions" style="max-width:500px;margin:0 auto">
      <button class="decisions__option" disabled>
        <p class="decisions__option__text">Preparando opciones...</p>
      </button>
    </div>
    ${renderFinishControl(scene)}
  `;
}

async function hydrateGeneratedChoices(scene, story) {
  const optionsContainer = $('#generated-decisions');
  if (!optionsContainer) return;

  const user = store.get('user');
  const choices = await StoryService.generateChoices({
    storyId: story.id,
    currentSceneId: scene.id,
    userId: user?.id || null,
  });
  const finalChoices = choices.length >= 3 ? choices : [
    'Seguir la pista antes de que desaparezca',
    'Confrontar lo que se oculta en la escena',
    'Retroceder y observar con mas cuidado',
  ];
  scene.decisions = finalChoices.slice(0, 3).map((choice, index) => ({
    id: `generated-${scene.id}-${index + 1}`,
    text: choice,
    nextSceneId: null,
    endingId: null,
  }));

  if (!$('#generated-decisions')) return;
  optionsContainer.innerHTML = finalChoices.slice(0, 3).map(choice => `
    <button class="decisions__option generated-decision" data-choice="${escapeHtml(choice)}">
      <p class="decisions__option__text">${escapeHtml(choice)}</p>
    </button>
  `).join('');

  optionsContainer.querySelectorAll('.generated-decision').forEach((button) => {
    button.addEventListener('click', async () => {
      if (isReaderLoading) return;

      const decisionText = button.dataset.choice || button.textContent.trim();
      optionsContainer.querySelectorAll('.decisions__option').forEach((option) => {
        option.style.opacity = '0.3';
        option.disabled = true;
      });
      button.classList.add('selected');
      button.style.opacity = '1';

      await continueFromDecision({ story, scene, decisionText });
    });
  });
}

function renderFinishControl(scene) {
  return `
    <div class="ending__actions reader__finish-actions" style="margin-top:24px">
      <button class="btn btn--secondary btn--sm" id="finish-story" data-scene-id="${scene.id}">Finalizar historia</button>
    </div>
  `;
}

function attachFinishHandler(story, scene) {
  $('#finish-story')?.addEventListener('click', async () => {
    await finishStory(story, scene);
  });
}

async function finishStory(story, scene) {
  if (isReaderLoading) return;
  isReaderLoading = true;
  const finishProgress = {
    currentScene: scene?.id || null,
    completed: true,
    partNumber: resolvePartNumber(story, scene || {}),
  };
  ProgressService.saveProgress(story.id, finishProgress);
  renderFinalState(story, true);

  try {
    await ProgressService.saveInteractiveProgress(story.id, finishProgress);
  } catch (error) {
    console.error('No se pudo sincronizar el final.', error);
  } finally {
    isReaderLoading = false;
  }
}

function resolvePartNumber(story, scene) {
  const sceneOrder = Number(scene?.sceneOrder ?? scene?.scene_order ?? scene?.order);
  if (Number.isFinite(sceneOrder)) return Math.max(1, sceneOrder + 1);

  const scenePart = Number(scene?.partNumber ?? scene?.part_number);
  if (Number.isFinite(scenePart) && scenePart > 0) return scenePart;

  const savedPart = Number(ProgressService.getProgress(story?.id)?.partNumber);
  if (Number.isFinite(savedPart) && savedPart > 0) return savedPart;

  return 1;
}

function resolveNextPartNumber(story, currentScene, nextScene) {
  const nextOrder = Number(nextScene?.sceneOrder ?? nextScene?.scene_order ?? nextScene?.order);
  if (Number.isFinite(nextOrder)) return Math.max(1, nextOrder + 1);
  return resolvePartNumber(story, currentScene) + 1;
}

function renderPartLabel(story, scene, partNumber) {
  const totalParts = Number(story?.total_parts ?? story?.totalParts);
  if (Number.isFinite(totalParts) && totalParts > 0) {
    return `Parte ${partNumber} de ${totalParts}`;
  }

  const hasSceneOrder = Number.isFinite(Number(scene?.sceneOrder ?? scene?.scene_order ?? scene?.order));
  return hasSceneOrder ? `Parte ${partNumber}` : `Fragmento ${partNumber} - Historia dinamica`;
}

function renderReaderNotice(message) {
  const container = $('#scene-container');
  if (!container) return;

  const notice = document.createElement('div');
  notice.className = 'empty-state anim-fade-in';
  notice.style.marginTop = '24px';
  notice.innerHTML = `
    <p class="empty-state__text">${escapeHtml(displayText(message, 'No pudimos continuar ahora.'))}</p>
  `;
  container.appendChild(notice);
}

function renderFinalState(story, replace = false) {
  const html = `
    <div class="empty-state anim-fade-in" style="padding:64px 0">
      <div class="empty-state__icon">${icon('book')}</div>
      <h3 class="empty-state__title">Final de lectura</h3>
      <p class="empty-state__text">Esta ruta narrativa ha terminado.</p>
      <div class="ending__actions">
        <button class="btn btn--primary" id="restart-story">Reiniciar historia</button>
        <button class="btn btn--secondary" id="back-home">Volver al inicio</button>
      </div>
    </div>
  `;

  if (replace) {
    const container = $('#scene-container');
    if (container) container.innerHTML = html;
  }

  setTimeout(() => {
    $('#restart-story')?.addEventListener('click', () => {
      router.navigate(`/story/${story.id}`);
    });
    $('#back-home')?.addEventListener('click', () => {
      router.navigate('/home');
    });
  }, 0);

  return html;
}

function renderEndingScreen(ending, story) {
  const container = $('#scene-container');
  if (!container) return;
  const progressBar = $('#reading-progress');
  if (progressBar) progressBar.style.width = '100%';

  const title = displayText(ending?.title, 'Final');
  const content = displayText(ending?.content || ending?.description, 'Esta historia ha llegado a su final.');

  container.innerHTML = `
    <section class="ending anim-fade-in">
      <div class="ending__badge">Final desbloqueado</div>
      <h1 class="ending__title">${escapeHtml(title)}</h1>
      <p class="ending__text">${escapeHtml(content)}</p>
      <div class="ending__actions">
        <button class="btn btn--primary" id="restart-story">Reiniciar historia</button>
        <button class="btn btn--secondary" id="back-home">Volver al inicio</button>
      </div>
    </section>
  `;

  $('#restart-story')?.addEventListener('click', () => {
    router.navigate(`/story/${story.id}`);
  });
  $('#back-home')?.addEventListener('click', () => {
    router.navigate('/home');
  });
}
