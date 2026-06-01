import { store } from '../store.js';
import { storage } from '../utils/storage.js';
import { SupabaseStorageService } from './SupabaseStorageService.js';

const PROFILE_KEY = 'novelle_local_profiles';
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const MAX_BANNER_BYTES = 5 * 1024 * 1024;
const ALLOWED_PROFILE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const ProfileService = {
  getAll() {
    return storage.get(PROFILE_KEY) || {};
  },

  get(uid) {
    return this.getAll()[uid] || {};
  },

  getCurrent() {
    return mergeUserProfile(store.get('user'));
  },

  save(uid, profile) {
    const profiles = this.getAll();
    const now = Date.now();
    const nextProfile = {
      ...(profiles[uid] || {}),
      ...profile,
      updatedAt: now,
    };

    if (profile.avatar !== undefined) nextProfile.avatarUpdatedAt = now;
    if (profile.banner !== undefined) nextProfile.bannerUpdatedAt = now;

    profiles[uid] = nextProfile;
    storage.set(PROFILE_KEY, profiles);

    const current = store.get('user');
    if (current && (current.uid === uid || current.id === uid)) {
      const merged = mergeUserProfile({ ...current, ...nextProfile });
      store.set('user', merged);
    }

    window.dispatchEvent(new CustomEvent('novelle:profile-updated', {
      detail: { uid, profile: nextProfile },
    }));

    return nextProfile;
  },

  async processAvatar(file) {
    return processProfileImage(file, {
      maxBytes: MAX_AVATAR_BYTES,
      maxDimension: 512,
      label: 'La foto de perfil',
    });
  },

  async processBanner(file) {
    return processProfileImage(file, {
      maxBytes: MAX_BANNER_BYTES,
      maxDimension: 1800,
      label: 'El banner',
    });
  },

  async uploadAvatar(uid, file) {
    return processAndUploadProfileImage(uid, file, {
      bucket: 'avatars',
      prefix: 'avatar',
      maxBytes: MAX_AVATAR_BYTES,
      maxDimension: 512,
      label: 'La foto de perfil',
    });
  },

  async uploadBanner(uid, file) {
    return processAndUploadProfileImage(uid, file, {
      bucket: 'profile-banners',
      prefix: 'banner',
      maxBytes: MAX_BANNER_BYTES,
      maxDimension: 1800,
      label: 'El banner',
    });
  },

  initialsFromName,
  withCacheBust,
};

export function mergeUserProfile(user = {}) {
  const uid = user?.uid || user?.id || 'guest';
  const saved = ProfileService.get(uid);
  const name = saved.name || user?.name || 'Invitado';
  const avatar = saved.avatar !== undefined ? saved.avatar : (user?.avatar || null);
  const banner = saved.banner !== undefined ? saved.banner : (user?.banner || null);

  return {
    ...user,
    ...saved,
    uid,
    id: user?.id || uid,
    name,
    username: saved.username || user?.username || 'guest',
    bio: saved.bio || user?.bio || '',
    avatar: withCacheBust(avatar, saved.avatarUpdatedAt),
    avatarRaw: avatar,
    banner: withCacheBust(banner, saved.bannerUpdatedAt),
    bannerRaw: banner,
    initials: initialsFromName(name),
    stats: {
      storiesRead: 0,
      decisionsTotal: 0,
      endingsUnlocked: 0,
      readingTime: 0,
      ...(user?.stats || {}),
    },
  };
}

function initialsFromName(name = '') {
  return String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase() || '?';
}

function withCacheBust(src, timestamp) {
  if (!src || src.startsWith('data:') || !timestamp) return src || null;
  const separator = src.includes('?') ? '&' : '?';
  return `${src}${separator}t=${timestamp}`;
}

async function processProfileImage(file, { maxBytes, maxDimension, label }) {
  const prepared = await prepareProfileImage(file, { maxBytes, maxDimension, label });
  return prepared?.dataUrl || null;
}

async function processAndUploadProfileImage(uid, file, options) {
  const prepared = await prepareProfileImage(file, options);
  if (!prepared) return { dataUrl: null, url: null, value: null, storedRemotely: false };
  const { blob, dataUrl } = prepared;
  const path = `${uid || 'guest'}/${options.prefix}-${Date.now()}.jpg`;
  const publicUrl = await SupabaseStorageService.uploadPublic({
    bucket: options.bucket,
    path,
    blob,
    contentType: 'image/jpeg',
  });

  return {
    dataUrl,
    url: publicUrl,
    value: publicUrl || dataUrl,
    storedRemotely: Boolean(publicUrl),
  };
}

async function prepareProfileImage(file, { maxBytes, maxDimension, label }) {
  if (!file) return null;
  if (!ALLOWED_PROFILE_TYPES.includes(file.type)) {
    throw new Error(`${label} debe ser JPG, PNG o WebP.`);
  }

  const image = await loadImage(file);
  const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
  let width = Math.max(1, Math.round(image.width * scale));
  let height = Math.max(1, Math.round(image.height * scale));
  let quality = 0.86;
  let blob = null;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    blob = await drawImageToBlob(image, width, height, quality);
    if (!blob) break;
    if (blob.size <= maxBytes) break;
    quality -= 0.1;
    if (quality < 0.46) {
      width = Math.round(width * 0.86);
      height = Math.round(height * 0.86);
      quality = 0.76;
    }
  }

  if (!blob || blob.size > maxBytes) {
    throw new Error(`${label} supera el limite permitido.`);
  }

  return {
    blob,
    dataUrl: await blobToDataUrl(blob),
  };
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
      reject(new Error('No se pudo procesar la imagen.'));
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
    reader.onerror = () => reject(new Error('No se pudo guardar la imagen.'));
    reader.readAsDataURL(blob);
  });
}
