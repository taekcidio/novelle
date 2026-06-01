import { CONFIG } from '../config.js';
import { storage } from '../utils/storage.js';
import { SupabaseStorageService } from './SupabaseStorageService.js';

const COVER_KEY = 'novelle_story_covers';
const BUCKET = 'story-covers';
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SOURCE_BYTES = 8 * 1024 * 1024;
const MAX_LOCAL_BYTES = 900 * 1024;
const MAX_DIMENSION = 1200;

export const StoryCoverService = {
  getLocalCover(storyId) {
    if (!storyId) return null;
    return getCoverMap()[storyId]?.dataUrl || null;
  },

  removeLocalCover(storyId) {
    removeLocalCover(storyId);
  },

  async saveCoverForStory(storyId, file) {
    if (!storyId || !file) return null;
    validateCoverFile(file);
    const { blob, dataUrl } = await compressCover(file);
    const publicUrl = await uploadCover(storyId, blob);

    if (publicUrl) {
      removeLocalCover(storyId);
      return publicUrl;
    }

    saveLocalCover(storyId, dataUrl);
    return null;
  },

  async previewDataUrl(file) {
    validateCoverFile(file);
    const { dataUrl } = await compressCover(file);
    return dataUrl;
  },

  async uploadCoverUrl(storyKey, file) {
    if (!storyKey || !file) return null;
    validateCoverFile(file);
    const { blob } = await compressCover(file);
    return uploadCover(storyKey, blob);
  },

  validateCoverFile,
};

function validateCoverFile(file) {
  if (!file) return;
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('La portada debe ser JPG, PNG o WebP.');
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error('La portada es demasiado pesada.');
  }
}

function getCoverMap() {
  return storage.get(COVER_KEY) || {};
}

function saveLocalCover(storyId, dataUrl) {
  const covers = getCoverMap();
  covers[storyId] = {
    dataUrl,
    updatedAt: Date.now(),
  };
  storage.set(COVER_KEY, covers);
}

function removeLocalCover(storyId) {
  const covers = getCoverMap();
  if (!covers[storyId]) return;
  delete covers[storyId];
  storage.set(COVER_KEY, covers);
}

async function compressCover(file) {
  const image = await loadImage(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(image.width, image.height));
  let width = Math.max(1, Math.round(image.width * scale));
  let height = Math.max(1, Math.round(image.height * scale));
  let quality = 0.86;
  let blob = null;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    blob = await drawImageToBlob(image, width, height, quality);
    if (!blob) break;
    if (blob.size <= MAX_LOCAL_BYTES) break;
    quality -= 0.1;
    if (quality < 0.48) {
      width = Math.round(width * 0.86);
      height = Math.round(height * 0.86);
      quality = 0.76;
    }
  }

  if (!blob || blob.size > MAX_LOCAL_BYTES) {
    throw new Error('No se pudo optimizar la portada.');
  }

  return {
    blob,
    dataUrl: await blobToDataUrl(blob),
  };
}

async function uploadCover(storyId, blob) {
  if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_ANON_KEY) return null;
  const path = `${storyId}/cover-${Date.now()}.jpg`;
  return SupabaseStorageService.uploadPublic({
    bucket: BUCKET,
    path,
    blob,
    contentType: 'image/jpeg',
  });
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo leer la portada.'));
    };
    image.src = url;
  });
}

function drawImageToBlob(image, width, height, quality) {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) {
      resolve(null);
      return;
    }
    context.drawImage(image, 0, 0, width, height);
    canvas.toBlob(resolve, 'image/jpeg', quality);
  });
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('No se pudo preparar la portada.'));
    reader.readAsDataURL(blob);
  });
}
