// ═══════════════════════════════════════
// NOVELLE — Regex Validators
// ═══════════════════════════════════════

export const PATTERNS = {
  // Email: standard RFC-like pattern
  EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,

  // Password: min 8 chars, at least 1 uppercase, 1 lowercase, 1 number, 1 special char
  PASSWORD_STRONG: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{}|;:'",.<>?/\\`~])[A-Za-z\d!@#$%^&*()_+\-=\[\]{}|;:'",.<>?/\\`~]{8,}$/,

  // Password: medium (at least 6 chars, 1 letter, 1 number)
  PASSWORD_MEDIUM: /^(?=.*[a-zA-Z])(?=.*\d)[A-Za-z\d!@#$%^&*()_+\-=\[\]{}|;:'",.<>?/\\`~]{6,}$/,

  // Username: 3-20 chars, alphanumeric, underscores, dots
  USERNAME: /^[a-zA-Z0-9._]{3,20}$/,

  // Name: 2-50 chars, letters and spaces, allows accented chars
  NAME: /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]{2,50}$/,

  // Phone: basic international format
  PHONE: /^\+?[\d\s\-()]{7,15}$/,

  // URL
  URL: /^https?:\/\/[^\s/$.?#].[^\s]*$/,

  // No empty (trimmed)
  NOT_EMPTY: /\S+/,
};

/**
 * Validate a value against a pattern
 * @param {string} value - Value to validate
 * @param {RegExp} pattern - Regex pattern
 * @returns {boolean}
 */
export function validate(value, pattern) {
  return pattern.test(value);
}

/**
 * Validate email
 */
export function isValidEmail(email) {
  return PATTERNS.EMAIL.test(email);
}

/**
 * Validate password and return strength level
 * @returns {'weak'|'medium'|'strong'}
 */
export function getPasswordStrength(password) {
  if (!password || password.length < 6) return 'weak';
  if (PATTERNS.PASSWORD_STRONG.test(password)) return 'strong';
  if (PATTERNS.PASSWORD_MEDIUM.test(password)) return 'medium';
  return 'weak';
}

/**
 * Validate username
 */
export function isValidUsername(username) {
  return PATTERNS.USERNAME.test(username);
}

/**
 * Validate name
 */
export function isValidName(name) {
  return PATTERNS.NAME.test(name);
}

/**
 * Validate a form object against rules
 * @param {Object} formData - { field: value }
 * @param {Object} rules - { field: { pattern, message, required } }
 * @returns {{ valid: boolean, errors: Object }}
 */
export function validateForm(formData, rules) {
  const errors = {};

  for (const [field, rule] of Object.entries(rules)) {
    const value = formData[field] || '';

    if (rule.required && !PATTERNS.NOT_EMPTY.test(value)) {
      errors[field] = rule.requiredMessage || 'Este campo es obligatorio';
      continue;
    }

    if (value && rule.pattern && !rule.pattern.test(value)) {
      errors[field] = rule.message || 'Formato inválido';
    }

    if (rule.minLength && value.length < rule.minLength) {
      errors[field] = `Mínimo ${rule.minLength} caracteres`;
    }

    if (rule.match && formData[rule.match] !== value) {
      errors[field] = rule.matchMessage || 'Los campos no coinciden';
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
