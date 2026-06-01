// ═══════════════════════════════════════
// NOVELLE — Login Page
// ═══════════════════════════════════════

import { router } from '../router.js';
import { AuthService } from '../services/AuthService.js';
import { isValidEmail, getPasswordStrength } from '../utils/validators.js';
import { $ } from '../utils/dom.js';
import { showToast } from '../components/Toast.js';
import { icon } from '../utils/icons.js';

export const LoginPage = {
  render() {
    return `
      <div class="auth-layout page--no-nav">
        <div class="auth-layout__left">
          <form class="auth-form" id="login-form">
            <h1 class="auth-form__logo">Novelle</h1>
            <p class="auth-form__subtitle">Inicia sesión para continuar tus historias</p>

            <div class="form-group form-floating">
              <input type="email" class="form-input" id="login-email" placeholder=" " autocomplete="email" required />
              <label class="form-label" for="login-email">Correo electrónico</label>
              <div class="form-message form-message--error hidden" id="login-email-error"></div>
            </div>

            <div class="form-group form-floating">
              <div class="form-input-icon" style="position:relative">
                <input type="password" class="form-input" id="login-password" placeholder=" " autocomplete="current-password" required style="padding-left:16px" />
                <label class="form-label" for="login-password" style="left:16px">Contraseña</label>
                <button type="button" class="form-input-action" id="toggle-password" aria-label="Mostrar contraseña">
                  ${icon('eye')}
                </button>
              </div>
              <div class="form-message form-message--error hidden" id="login-password-error"></div>
            </div>

            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px">
              <label class="form-check">
                <input type="checkbox" id="remember-me" />
                <label for="remember-me">Recordarme</label>
              </label>
              <a href="#" class="text-sm text-secondary" style="font-weight:500">¿Olvidaste tu contraseña?</a>
            </div>

            <button type="submit" class="btn btn--primary btn--block btn--lg" id="login-submit">
              <span class="btn__text">Iniciar sesión</span>
            </button>

            <button type="button" class="btn btn--secondary btn--block btn--lg mt-4" id="login-google">
              Continuar con Google
            </button>

            <p class="auth-form__footer">
              ¿No tienes cuenta? <a href="#/register">Regístrate</a>
            </p>
          </form>
        </div>
        <div class="auth-layout__right">
          <div style="text-align:center;max-width:400px">
            <svg viewBox="0 0 300 300" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:260px;margin:0 auto">
              <circle cx="150" cy="150" r="120" stroke="var(--border)" stroke-width="1" stroke-dasharray="6 6"/>
              <rect x="100" y="70" width="100" height="140" rx="6" stroke="var(--text-primary)" stroke-width="2"/>
              <line x1="115" y1="95" x2="185" y2="95" stroke="var(--text-secondary)" stroke-width="1.5" opacity="0.5"/>
              <line x1="115" y1="112" x2="180" y2="112" stroke="var(--text-secondary)" stroke-width="1.5" opacity="0.4"/>
              <line x1="115" y1="129" x2="170" y2="129" stroke="var(--text-secondary)" stroke-width="1.5" opacity="0.3"/>
              <line x1="115" y1="146" x2="175" y2="146" stroke="var(--text-secondary)" stroke-width="1.5" opacity="0.25"/>
              <line x1="115" y1="163" x2="160" y2="163" stroke="var(--text-secondary)" stroke-width="1.5" opacity="0.2"/>
              <circle cx="150" cy="195" r="8" stroke="var(--accent)" stroke-width="2" fill="none"/>
              <path d="M147 195 L150 198 L155 192" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" fill="none"/>
              <path d="M60 100 Q80 80 90 100" stroke="var(--text-tertiary)" stroke-width="1" fill="none" opacity="0.3"/>
              <path d="M210 200 Q230 180 240 200" stroke="var(--text-tertiary)" stroke-width="1" fill="none" opacity="0.3"/>
            </svg>
            <h2 style="font-family:var(--font-display);font-size:1.5rem;font-weight:700;margin-top:32px">Historias que tú decides</h2>
            <p style="color:var(--text-secondary);margin-top:8px;font-size:0.9rem">Cada elección abre un nuevo camino. Miles de finales te esperan.</p>
          </div>
        </div>
      </div>
    `;
  },

  init() {
    const form = $('#login-form');
    const emailInput = $('#login-email');
    const passwordInput = $('#login-password');
    const toggleBtn = $('#toggle-password');
    const submitBtn = $('#login-submit');
    const googleBtn = $('#login-google');

    // Toggle password visibility
    toggleBtn?.addEventListener('click', () => {
      const isPassword = passwordInput.type === 'password';
      passwordInput.type = isPassword ? 'text' : 'password';
      toggleBtn.innerHTML = isPassword ? icon('eyeOff') : icon('eye');
    });

    // Real-time email validation
    emailInput?.addEventListener('blur', () => {
      const error = $('#login-email-error');
      if (emailInput.value && !isValidEmail(emailInput.value)) {
        emailInput.classList.add('form-input--invalid');
        error.textContent = 'Ingresa un correo válido';
        error.classList.remove('hidden');
      } else {
        emailInput.classList.remove('form-input--invalid');
        error.classList.add('hidden');
      }
    });

    // Form submit
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();

      const email = emailInput.value.trim();
      const password = passwordInput.value;

      if (!email || !password) {
        showToast('Completa todos los campos', 'warning');
        return;
      }

      if (!isValidEmail(email)) {
        showToast('Correo electrónico inválido', 'error');
        return;
      }

      submitBtn.classList.add('btn--loading');

      try {
        await AuthService.login(email, password);
        showToast('¡Bienvenida de vuelta!', 'success');
        router.navigate('/home');
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        submitBtn.classList.remove('btn--loading');
      }
    });

    googleBtn?.addEventListener('click', async () => {
      googleBtn.classList.add('btn--loading');

      try {
        await AuthService.loginWithGoogle();
        showToast('Sesion iniciada con Google', 'success');
        router.navigate('/home');
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        googleBtn.classList.remove('btn--loading');
      }
    });
  },
};
