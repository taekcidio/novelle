// NOVELLE - Story Card Component

import { icon } from '../utils/icons.js';
import { FavoritesService } from '../services/FavoriteService.js';
import { displayText } from '../utils/helpers.js';

const MAX_COVER_LENGTH = 2048;
const MAX_LOCAL_DATA_COVER_LENGTH = 1500000;

export function renderStoryCard(story, options = {}) {
  const safeStory = story || {};
  const { horizontal = false, featured = false, showProgress = false, progress = 0 } = options;
  const storyId = safeStory.id || '';
  const isFav = FavoritesService.isFavorite(storyId);
  const variant = horizontal ? 'story-card--horizontal' : (featured ? 'story-card--featured' : '');
  const title = displayText(safeStory.title, 'Historia');
  const author = displayText(safeStory.author, 'Autor desconocido');
  const rawCategory = typeof safeStory.categoryName === 'string'
    ? safeStory.categoryName
    : (typeof safeStory.category === 'string' ? safeStory.category : '');
  const placeholderKey = getPlaceholderKey(rawCategory);
  const cover = getCoverState(safeStory, placeholderKey);
  const categoryName = rawCategory && rawCategory.toLowerCase() !== 'unknown' ? rawCategory : 'Sin categoría';
  const endingsCount = typeof safeStory.endings === 'number'
    ? safeStory.endings
    : (Array.isArray(safeStory.endings) ? safeStory.endings.length : Number(safeStory.endings || 0));
  const ratingValue = Number(safeStory.rating ?? 0);
  const readersValue = Number(safeStory.readers ?? 0);
  const rating = Number.isFinite(ratingValue) ? ratingValue.toFixed(1) : '0.0';
  const readers = Number.isFinite(readersValue) ? readersValue : 0;
  const readingTime = safeStory.readingTime || safeStory.reading_time || '0 min';
  const metaItems = [
    `<span>${icon('star')} ${rating}</span>`,
    `<span>${icon('eye')} ${formatReaders(readers)}</span>`,
    `<span>${icon('clock')} ${readingTime}</span>`,
  ].join('');
  const coverClasses = [
    'story-card__cover',
    cover.isPlaceholder ? 'story-card__cover--placeholder' : '',
    `story-card__cover--${placeholderKey}`,
  ].filter(Boolean).join(' ');
  const imageMarkup = cover.isPlaceholder
    ? ''
    : `<img src="${escapeAttribute(cover.src)}" alt="${escapeAttribute(title)}" loading="lazy" onerror="this.style.display='none';this.closest('.story-card__cover')?.classList.add('story-card__cover--placeholder')" />`;

  return `
    <article class="story-card ${variant}" data-story-id="${escapeAttribute(storyId)}" role="button" tabindex="0">
      <div class="${coverClasses}">
        ${imageMarkup}
        <div class="story-card__overlay"></div>
        <div class="story-card__cover-content">
          ${categoryName ? `<span class="story-card__badge">${escapeHtml(categoryName)}</span>` : '<span></span>'}
          <div class="story-card__cover-bottom">
            <span class="story-card__endings">${Number.isFinite(endingsCount) ? endingsCount : 0} finales</span>
          </div>
        </div>
        <button class="story-card__fav ${isFav ? 'is-active' : ''}" aria-label="${isFav ? 'Quitar de favoritos' : 'Agregar a favoritos'}" aria-pressed="${isFav}" data-story-id="${escapeAttribute(storyId)}">
          ${isFav ? icon('heartFilled') : icon('heart')}
        </button>
      </div>
      <div class="story-card__body">
        <h3 class="story-card__title">${escapeHtml(title)}</h3>
        <p class="story-card__author">por ${escapeHtml(author)}</p>
        <div class="story-card__meta">${metaItems}</div>
        ${showProgress ? `
          <div class="story-card__progress">
            <div class="story-card__progress-fill" style="width: ${progress}%"></div>
          </div>
        ` : ''}
      </div>
    </article>
  `;
}

export function renderStoryCards(stories, options = {}) {
  const renderedCards = (stories || []).map(story => {
    try {
      return renderStoryCard(story, options);
    } catch (error) {
      return '';
    }
  }).filter(Boolean);
  return renderedCards.join('');
}

function formatReaders(count) {
  if (count >= 1000) return (count / 1000).toFixed(1) + 'k';
  return count.toString();
}

function getCoverState(story, placeholderKey) {
  const cover = typeof story?.cover === 'string' ? story.cover.trim() : '';

  if (!isValidCover(cover)) {
    return {
      isPlaceholder: true,
      src: '',
    };
  }

  return {
    isPlaceholder: false,
    src: cover,
  };
}

function isValidCover(cover) {
  if (!cover) return false;
  if (/^data:image\/[^;]+;base64,/i.test(cover)) return isValidDataImage(cover);
  if (cover.length > MAX_COVER_LENGTH) return false;
  if (/[\u0000-\u001f"'<>`]/.test(cover)) return false;
  if (/^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(cover)) return true;
  return false;
}

function isValidDataImage(cover) {
  const base64 = cover.split(',')[1] || '';
  if (!base64 || base64.length > MAX_LOCAL_DATA_COVER_LENGTH) return false;
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) return false;
  if (base64.length % 4 !== 0) return false;

  try {
    atob(base64);
    return true;
  } catch (error) {
    return false;
  }
}

function getPlaceholderKey(category) {
  const normalized = normalizeCategory(category);

  if (['misterio', 'mystery'].includes(normalized)) return 'mystery';
  if (['ciencia-ficcion', 'ciencia-ficción', 'scifi', 'sci-fi', 'science-fiction'].includes(normalized)) return 'scifi';
  if (['fantasia', 'fantasía', 'fantasy', 'adventure', 'aventura'].includes(normalized)) return 'fantasy';
  if (['terror', 'horror'].includes(normalized)) return 'horror';
  if (['romance', 'romantica', 'romántica', 'comedy', 'comedia'].includes(normalized)) return 'romance';
  if (['drama'].includes(normalized)) return 'drama';
  return 'default';
}

function normalizeCategory(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function escapeAttribute(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}
