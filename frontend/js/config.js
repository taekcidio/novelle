// ═══════════════════════════════════════
// NOVELLE — App Configuration
// ═══════════════════════════════════════

const PRODUCTION_API_BASE_URL = 'https://name-novelle-backend.onrender.com/api/v1';

function resolveApiBaseUrl() {
  const override = String(window.NOVELLE_API_BASE_URL || '').trim();
  const localHostName = ['local', 'host'].join('');
  const loopbackHost = ['127', '0', '0', '1'].join('.');

  let overrideHost = '';
  try {
    overrideHost = new URL(override).hostname;
  } catch (error) {
    overrideHost = override.split('/')[0].split(':')[0];
  }

  if (!override || [localHostName, loopbackHost].includes(overrideHost.toLowerCase())) {
    return PRODUCTION_API_BASE_URL;
  }
  return override.replace(/\/$/, '');
}

export const CONFIG = {
  APP_NAME: 'Novelle',
  APP_TAGLINE: 'Historias que tú decides',
  VERSION: '1.0.0',

  // API
  API_BASE_URL: resolveApiBaseUrl(),
  SUPABASE_URL: 'https://kkhwkjmaewztqndrnpzi.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtraHdram1hZXd6dHFuZHJucHppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0NTE2OTIsImV4cCI6MjA5NDAyNzY5Mn0.wHm-cQEQUDJPneIGOYwYn1x8zmQwV8h3hoWOW7l6m7w',

  // Feature flags
  FEATURES: {
    AI_GENERATION: true,
    SOCIAL_LOGIN: true,
    PUSH_NOTIFICATIONS: false,
  },

  // Reading defaults
  READING: {
    DEFAULT_FONT_SIZE: 18,
    MIN_FONT_SIZE: 14,
    MAX_FONT_SIZE: 28,
    DEFAULT_FONT: 'Inter',
    FONTS: ['Inter', 'Poppins', 'Georgia', 'system-ui'],
  },

  // Splash screen
  SPLASH_DURATION: 2500,

  // Toast
  TOAST_DURATION: 4000,

  // Pagination
  STORIES_PER_PAGE: 12,

  // Storage keys
  STORAGE_KEYS: {
    THEME: 'novelle_theme',
    USER: 'novelle_user',
    TOKEN: 'novelle_token',
    PROGRESS: 'novelle_progress',
    FAVORITES: 'novelle_favorites',
    READING_PREFS: 'novelle_reading_prefs',
    HISTORY: 'novelle_history',
  },
};
