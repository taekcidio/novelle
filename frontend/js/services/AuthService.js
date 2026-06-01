// NOVELLE - Firebase Auth Service

import {
  createUserWithEmailAndPassword,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js';

import { firebaseAuth, googleProvider } from '../config/firebase.js';
import { store } from '../store.js';
import { storage } from '../utils/storage.js';
import { CONFIG } from '../config.js';
import { ProfileService, mergeUserProfile } from './ProfileService.js';

function usernameFromUser(firebaseUser, fallback = '') {
  const source = fallback || firebaseUser.displayName || firebaseUser.email || firebaseUser.uid;
  return String(source)
    .split('@')[0]
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')
    .slice(0, 24) || 'lector';
}

async function normalizeFirebaseUser(firebaseUser, extra = {}) {
  if (!firebaseUser) return null;
  const savedProfile = ProfileService.get(firebaseUser.uid);

  const token = await firebaseUser.getIdToken().catch(() => null);
  if (token) storage.set(CONFIG.STORAGE_KEYS.TOKEN, token);

  const name = extra.name || savedProfile.name || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Lector';
  const normalizedUser = mergeUserProfile({
    id: firebaseUser.uid,
    uid: firebaseUser.uid,
    name,
    username: extra.username || savedProfile.username || usernameFromUser(firebaseUser),
    email: firebaseUser.email || '',
    avatar: firebaseUser.photoURL || null,
    provider: firebaseUser.providerData?.[0]?.providerId || 'firebase',
    joinedAt: firebaseUser.metadata?.creationTime || new Date().toISOString(),
    stats: {
      storiesRead: 0,
      decisionsTotal: 0,
      endingsUnlocked: 0,
      readingTime: 0,
      favoriteGenre: null,
    },
  });

  ProfileService.save(firebaseUser.uid, {
    name: normalizedUser.name,
    username: normalizedUser.username,
  });
  store.set('user', normalizedUser);
  return normalizedUser;
}

function authErrorMessage(error) {
  const code = error?.code || '';
  const messages = {
    'auth/email-already-in-use': 'Ese correo ya tiene una cuenta.',
    'auth/invalid-email': 'Correo electronico invalido.',
    'auth/invalid-credential': 'Correo o contrasena incorrectos.',
    'auth/popup-closed-by-user': 'Inicio con Google cancelado.',
    'auth/weak-password': 'La contrasena debe tener al menos 6 caracteres.',
    'auth/network-request-failed': 'No se pudo conectar con Firebase. Revisa tu conexion.',
  };
  return messages[code] || error?.message || 'No se pudo completar la autenticacion.';
}

export const AuthService = {
  async login(email, password) {
    try {
      const credential = await signInWithEmailAndPassword(firebaseAuth, email, password);
      const user = await normalizeFirebaseUser(credential.user);
      return { user, token: storage.get(CONFIG.STORAGE_KEYS.TOKEN) };
    } catch (error) {
      throw new Error(authErrorMessage(error));
    }
  },

  async register({ name, username, email, password }) {
    try {
      const credential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
      await updateProfile(credential.user, { displayName: name });
      const user = await normalizeFirebaseUser(credential.user, { name, username });
      return { user, token: storage.get(CONFIG.STORAGE_KEYS.TOKEN) };
    } catch (error) {
      throw new Error(authErrorMessage(error));
    }
  },

  async loginWithGoogle() {
    try {
      const credential = await signInWithPopup(firebaseAuth, googleProvider);
      const user = await normalizeFirebaseUser(credential.user);
      return { user, token: storage.get(CONFIG.STORAGE_KEYS.TOKEN) };
    } catch (error) {
      throw new Error(authErrorMessage(error));
    }
  },

  async logout() {
    try {
      await signOut(firebaseAuth);
    } finally {
      store.logout();
    }
  },

  onAuthStateChanged(callback) {
    return firebaseOnAuthStateChanged(firebaseAuth, async (firebaseUser) => {
      const user = firebaseUser ? await normalizeFirebaseUser(firebaseUser) : null;
      if (!firebaseUser) store.logout();
      if (typeof callback === 'function') callback(user);
    });
  },

  isAuthenticated() {
    return store.isAuthenticated();
  },

  getCurrentUser() {
    return store.get('user');
  },
};
