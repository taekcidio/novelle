import { CONFIG } from '../config.js';

export const SupabaseStorageService = {
  isConfigured() {
    return Boolean(CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY);
  },

  async uploadPublic({ bucket, path, blob, contentType }) {
    if (!this.isConfigured() || !bucket || !path || !blob) return null;

    const baseUrl = CONFIG.SUPABASE_URL.replace(/\/$/, '');
    const encodedPath = path.split('/').map(encodeURIComponent).join('/');
    const endpoint = `${baseUrl}/storage/v1/object/${bucket}/${encodedPath}`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          apikey: CONFIG.SUPABASE_ANON_KEY,
          Authorization: `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
          'Content-Type': contentType || blob.type || 'image/jpeg',
          'x-upsert': 'true',
        },
        body: blob,
      });

      if (!response.ok) return null;
      return `${baseUrl}/storage/v1/object/public/${bucket}/${encodedPath}`;
    } catch (error) {
      return null;
    }
  },
};
