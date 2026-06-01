// NOVELLE - API Utility (Fetch Wrapper)

import { CONFIG } from '../config.js';
import { storage } from './storage.js';

const BASE_URL = CONFIG.API_BASE_URL;

async function request(endpoint, options = {}) {
  const token = storage.get(CONFIG.STORAGE_KEYS.TOKEN);

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, config);

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new ApiError(response.status, error.detail || 'Error en la solicitud');
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    return null;
  }
}

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const api = {
  get: endpoint => request(endpoint, { method: 'GET' }),
  post: (endpoint, body) => request(endpoint, { method: 'POST', body }),
  put: (endpoint, body) => request(endpoint, { method: 'PUT', body }),
  patch: (endpoint, body) => request(endpoint, { method: 'PATCH', body }),
  delete: (endpoint, body = null) => request(endpoint, {
    method: 'DELETE',
    ...(body && { body }),
  }),
};
