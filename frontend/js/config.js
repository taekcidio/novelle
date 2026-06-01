// ═══════════════════════════════════════
// NOVELLE — App Configuration
// ═══════════════════════════════════════

export const CONFIG = {
  APP_NAME: 'Novelle',
  APP_TAGLINE: 'Historias que tú decides',
  VERSION: '1.0.0',

  // API
  API_BASE_URL: window.NOVELLE_API_BASE_URL || 'http://localhost:8000/api/v1',
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
