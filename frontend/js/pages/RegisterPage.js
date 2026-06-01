// ═══════════════════════════════════════
// NOVELLE — Register Page
// ═══════════════════════════════════════

import { router } from '../router.js';
import { AuthService } from '../services/AuthService.js';
import { isValidEmail, isValidUsername, isValidName, getPasswordStrength } from '../utils/validators.js';
import { $ } from '../utils/dom.js';
import { showToast } from '../components/Toast.js';
import { icon } from '../utils/icons.js';

export const RegisterPage = {
  render() {
    return `
      <div class="auth-layout page--no-nav">
        <div class="auth-layout__left">
          <form class="auth-form" id="register-form">
            <h1 class="auth-form__logo">Novelle</h1>
            <p class="auth-form__subtitle">Crea tu cuenta y comienza tu aventura</p>

            <div class="form-group">
              <label class="form-label" for="reg-name">Nombre completo</label>
              <input type="text" class="form-input" id="reg-name" placeholder="Tu nombre" required />
              <div class="form-message form-message--error hidden" id="reg-name-error"></div>
            </div>

            <div class="form-group">
              <label class="form-label" for="reg-username">Nombre de usuario</label>
              <input type="text" class="form-input" id="reg-username" placeholder="usuario123" required />
              <div class="form-message form-message--error hidden" id="reg-username-error"></div>
              <div class="form-message form-message--info">3-20 caracteres, letras, números, puntos y guion bajo</div>
            </div>

            <div class="form-group">
              <label class="form-label" for="reg-email">Correo electrónico</label>
              <input type="email" class="form-input" id="reg-email" placeholder="tu@correo.com" required />
              <div class="form-message form-message--error hidden" id="reg-email-error"></div>
            </div>

            <div class="form-group">
              <label class="form-label" for="reg-password">Contraseña</label>
              <div style="position:relative">
                <input type="password" class="form-input" id="reg-password" placeholder="Min. 8 caracteres" required />
                <button type="button" class="form-input-action" id="reg-toggle-pw">${icon('eye')}</button>
              </div>
              <div class="password-strength mt-4" id="pw-strength">
                <div class="password-strength__bar" id="pw-bar-1"></div>
                <div class="password-strength__bar" id="pw-bar-2"></div>
                <div class="password-strength__bar" id="pw-bar-3"></div>
                <span class="password-strength__text" id="pw-text"></span>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="reg-confirm">Confirmar contraseña</label>
              <input type="password" class="form-input" id="reg-confirm" placeholder="Repite tu contraseña" required />
              <div class="form-message form-message--error hidden" id="reg-confirm-error"></div>
            </div>

            <div class="form-check mb-6">
              <input type="checkbox" id="reg-terms" />
              <label for="reg-terms">Acepto los <a href="#" style="text-decoration:underline">Términos y condiciones</a></label>
            </div>

            <button type="submit" class="btn btn--primary btn--block btn--lg" id="reg-submit">
              <span class="btn__text">Crear cuenta</span>
            </button>

            <p class="auth-form__footer">
              ¿Ya tienes cuenta? <a href="#/login">Inicia sesión</a>
            </p>
          </form>
        </div>
        <div class="auth-layout__right">
          <div style="text-align:center;max-width:400px">
            <svg viewBox="0 0 300 300" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:240px;margin:0 auto">
              <circle cx="150" cy="150" r="120" stroke="var(--border)" stroke-width="1" stroke-dasharray="6 6"/>
              <path d="M100 200 L150 100 L200 200" stroke="var(--text-primary)" stroke-width="2" fill="none" stroke-linecap="round"/>
              <circle cx="150" cy="100" r="6" fill="var(--accent)"/>
              <circle cx="125" cy="150" r="4" stroke="var(--text-primary)" stroke-width="1.5" fill="none"/>
              <circle cx="175" cy="150" r="4" stroke="var(--text-primary)" stroke-width="1.5" fill="none"/>
              <line x1="150" y1="100" x2="125" y2="150" stroke="var(--text-tertiary)" stroke-width="1" stroke-dasharray="4 4"/>
              <line x1="150" y1="100" x2="175" y2="150" stroke="var(--text-tertiary)" stroke-width="1" stroke-dasharray="4 4"/>
            </svg>
            <h2 style="font-family:var(--font-display);font-size:1.5rem;font-weight:700;margin-top:32px">Múltiples caminos</h2>
            <p style="color:var(--text-secondary);margin-top:8px;font-size:0.9rem">Cada decisión crea una nueva rama en tu historia. ¿Cuál será tu camino?</p>
          </div>
        </div>
      </div>
    `;
  },

  init() {
    const form = $('#register-form');
    const pwInput = $('#reg-password');
    const togglePw = $('#reg-toggle-pw');

    // Toggle password
    togglePw?.addEventListener('click', () => {
      const isPassword = pwInput.type === 'password';
      pwInput.type = isPassword ? 'text' : 'password';
      togglePw.innerHTML = isPassword ? icon('eyeOff') : icon('eye');
    });

    // Password strength
    pwInput?.addEventListener('input', () => {
      const strength = getPasswordStrength(pwInput.value);
      const bars = [1, 2, 3].map(i => $(`#pw-bar-${i}`));
      const text = $('#pw-text');

      bars.forEach(b => { b.className = 'password-strength__bar'; });

      if (strength === 'weak') {
        bars[0].classList.add('active');
        text.textContent = 'Débil';
      } else if (strength === 'medium') {
        bars[0].classList.add('active', 'medium');
        bars[1].classList.add('active', 'medium');
        text.textContent = 'Media';
      } else {
        bars.forEach(b => b.classList.add('active', 'strong'));
        text.textContent = 'Fuerte';
      }
    });

    // Real-time validation
    $('#reg-name')?.addEventListener('blur', function () {
      validateField(this, isValidName, '#reg-name-error', 'Nombre inválido');
    });
    $('#reg-username')?.addEventListener('blur', function () {
      validateField(this, isValidUsername, '#reg-username-error', 'Usuario inválido (3-20 caracteres alfanuméricos)');
    });
    $('#reg-email')?.addEventListener('blur', function () {
      validateField(this, isValidEmail, '#reg-email-error', 'Correo inválido');
    });

    // Submit
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = $('#reg-name').value.trim();
      const username = $('#reg-username').value.trim();
      const email = $('#reg-email').value.trim();
      const password = $('#reg-password').value;
      const confirm = $('#reg-confirm').value;
      const terms = $('#reg-terms').checked;

      if (!name || !username || !email || !password) {
        showToast('Completa todos los campos', 'warning');
        return;
      }
      if (password !== confirm) {
        showToast('Las contraseñas no coinciden', 'error');
        return;
      }
      if (!terms) {
        showToast('Debes aceptar los términos', 'warning');
        return;
      }

      const submitBtn = $('#reg-submit');
      submitBtn.classList.add('btn--loading');

      try {
        await AuthService.register({ name, username, email, password });
        showToast('¡Cuenta creada exitosamente!', 'success');
        router.navigate('/home');
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        submitBtn.classList.remove('btn--loading');
      }
    });
  },
};

function validateField(input, validatorFn, errorSelector, errorMsg) {
  const error = $(errorSelector);
  if (input.value && !validatorFn(input.value)) {
    input.classList.add('form-input--invalid');
    input.classList.remove('form-input--valid');
    if (error) { error.textContent = errorMsg; error.classList.remove('hidden'); }
  } else if (input.value) {
    input.classList.add('form-input--valid');
    input.classList.remove('form-input--invalid');
    if (error) error.classList.add('hidden');
  }
}
