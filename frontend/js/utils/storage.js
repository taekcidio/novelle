// ═══════════════════════════════════════
// NOVELLE — Storage Utility
// ═══════════════════════════════════════

export const storage = {
  /**
   * Get a value from localStorage
   */
  get(key) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  },

  /**
   * Set a value in localStorage
   */
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
    }
  },

  /**
   * Remove a key from localStorage
   */
  remove(key) {
    localStorage.removeItem(key);
  },

  /**
   * Clear all Novelle storage
   */
  clear() {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('novelle_'));
    keys.forEach(k => localStorage.removeItem(k));
  },

  /**
   * Session storage get
   */
  sessionGet(key) {
    try {
      const item = sessionStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  },

  /**
   * Session storage set
   */
  sessionSet(key, value) {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
    }
  },
};
