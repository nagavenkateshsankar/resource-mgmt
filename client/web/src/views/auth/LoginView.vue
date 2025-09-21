<template>
  <div class="login-page">
    <div class="login-container">
      <div class="login-card">
        <!-- Logo and Title -->
        <div class="login-header">
          <div class="logo">
            <svg viewBox="0 0 24 24" fill="currentColor" class="icon-xl text-primary">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <h1 class="title">Site Inspector</h1>
          <p class="subtitle">Sign in to your account</p>
        </div>

        <!-- Error Message -->
        <div v-if="error" class="error-message">
          <ExclamationTriangleIcon class="icon-sm" />
          <span>{{ error }}</span>
        </div>

        <!-- Login Form -->
        <form @submit.prevent="handleLogin" @submit="onFormSubmit" class="login-form">
          <div class="form-group">
            <label for="email" class="form-label">Email address</label>
            <div class="input-container">
              <EnvelopeIcon class="input-icon" />
              <input
                id="email"
                v-model="credentials.email"
                type="email"
                required
                class="form-input"
                placeholder="Enter your email"
                :disabled="isLoading"
              />
            </div>
          </div>

          <div class="form-group">
            <label for="password" class="form-label">Password</label>
            <div class="input-container">
              <LockClosedIcon class="input-icon" />
              <input
                id="password"
                v-model="credentials.password"
                :type="showPassword ? 'text' : 'password'"
                required
                class="form-input"
                placeholder="Enter your password"
                :disabled="isLoading"
              />
              <button
                type="button"
                @click="togglePasswordVisibility"
                class="password-toggle"
                :disabled="isLoading"
              >
                <EyeIcon v-if="!showPassword" class="icon-sm" />
                <EyeSlashIcon v-else class="icon-sm" />
              </button>
            </div>
          </div>

          <div class="form-options">
            <label class="checkbox-container">
              <input
                v-model="rememberMe"
                type="checkbox"
                class="checkbox"
                :disabled="isLoading"
              />
              <span class="checkbox-label">Remember me</span>
            </label>
            <router-link to="/forgot-password" class="forgot-link">
              Forgot password?
            </router-link>
          </div>

          <button
            type="submit"
            class="login-button"
            :disabled="isLoading || !isFormValid"
            @click="onButtonClick"
          >
            <ArrowRightOnRectangleIcon v-if="!isLoading" class="icon-sm" />
            <svg
              v-else
              class="animate-spin icon-sm"
              viewBox="0 0 24 24"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
                fill="none"
                class="opacity-25"
              />
              <path
                fill="currentColor"
                class="opacity-75"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            {{ isLoading ? 'Signing in...' : 'Sign in' }}
          </button>
        </form>

        <!-- Register Link -->
        <div class="register-link">
          Don't have an account?
          <router-link to="/register" class="link">Sign up</router-link>
        </div>

        <!-- PWA Features Notice -->
        <div v-if="showPWANotice" class="pwa-notice">
          <InformationCircleIcon class="icon-sm text-primary" />
          <span>Install this app for offline access and better performance</span>
        </div>
      </div>
    </div>

    <!-- Background Pattern -->
    <div class="background-pattern"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import type { LoginCredentials } from '@/types/auth'

// Icons
import {
  EnvelopeIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowRightOnRectangleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/vue/24/outline'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const appStore = useAppStore()

// Reactive state
const credentials = ref<LoginCredentials>({
  email: 'john@gmail.com', // Pre-filled for testing
  password: 'password'     // Pre-filled for testing
})

const showPassword = ref(false)
const rememberMe = ref(false)

// Computed properties
const isLoading = computed(() => authStore.isLoading)
const error = computed(() => authStore.error)
const isFormValid = computed(() => {
  const valid = credentials.value.email.length > 0 &&
                credentials.value.password.length > 0
  return valid
})
const showPWANotice = computed(() => appStore.canInstall && !appStore.isInstalled)

// Methods
const handleLogin = async () => {
  console.log('🚀 handleLogin function called')
  console.log('📝 Form data:', {
    email: credentials.value.email,
    password: credentials.value.password ? '***' : 'empty',
    isFormValid: isFormValid.value,
    isLoading: isLoading.value
  })

  // Validate form data
  if (!isFormValid.value) {
    console.error('❌ Form validation failed')
    appStore.showErrorMessage('Please fill in all required fields')
    return
  }

  try {
    authStore.clearError()
    console.log('🔄 Calling auth store login...')

    const result = await authStore.login(credentials.value)
    console.log('📊 Login result:', result)

    if (result.success) {
      console.log('✅ Login successful, redirecting...')
      appStore.showSuccessMessage('Welcome back!')

      // Redirect to intended page or dashboard
      const redirectTo = (route.query.redirect as string) || '/dashboard'
      console.log('🔀 Redirecting to:', redirectTo)

      await router.push(redirectTo)
    } else {
      console.error('❌ Login failed:', result.error)
      appStore.showErrorMessage(result.error || 'Login failed')
    }
  } catch (error) {
    console.error('💥 Unexpected error in handleLogin:', error)
    appStore.showErrorMessage('An unexpected error occurred. Please try again.')
  }
}

const togglePasswordVisibility = () => {
  showPassword.value = !showPassword.value
}

const onButtonClick = (event: Event) => {
  console.log('🖱️ Button clicked!', {
    isDisabled: event.target ? (event.target as HTMLButtonElement).disabled : 'unknown',
    isLoading: isLoading.value,
    isFormValid: isFormValid.value
  })
}

const onFormSubmit = (event: Event) => {
  console.log('📋 Form submit event triggered!', {
    preventDefault: event.defaultPrevented,
    type: event.type
  })
}

// Initialize
onMounted(() => {
  console.log('🚀 LoginView mounted')
  console.log('📊 Initial state:', {
    credentials: credentials.value,
    isLoading: isLoading.value,
    error: error.value,
    isFormValid: isFormValid.value,
    isAuthenticated: authStore.isAuthenticated
  })

  // Clear any previous errors
  authStore.clearError()

  // Focus email input
  const emailInput = document.getElementById('email')
  if (emailInput) {
    emailInput.focus()
  }
})
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.8) 100%);
  padding: 1rem;
  position: relative;
  overflow: hidden;
}

.login-container {
  width: 100%;
  max-width: 400px;
  z-index: 10;
}

.login-card {
  background: hsl(var(--background));
  border-radius: 1rem;
  padding: 2rem;
  box-shadow: var(--shadow-lg);
  border: 1px solid hsl(var(--border));
  backdrop-filter: blur(10px);
}

.login-header {
  text-align: center;
  margin-bottom: 2rem;
}

.logo {
  margin: 0 auto 1rem;
  width: fit-content;
}

.title {
  font-size: 2rem;
  font-weight: 700;
  margin: 0 0 0.5rem;
}

.subtitle {
  font-size: 1rem;
  margin: 0;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: hsl(var(--destructive) / 0.1);
  color: hsl(var(--destructive));
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  margin-bottom: 1.5rem;
  border: 1px solid hsl(var(--destructive) / 0.3);
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-label {
  font-size: 0.875rem;
  font-weight: 500;
}

.input-container {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 0.75rem;
  width: 1.25rem;
  height: 1.25rem;
  color: hsl(var(--muted-foreground));
  z-index: 1;
}

.form-input {
  width: 100%;
  padding: 0.75rem 0.75rem 0.75rem 2.75rem;
  border: 1px solid hsl(var(--border));
  border-radius: 0.5rem;
  font-size: 1rem;
  transition: all 0.2s;
  background: hsl(var(--background));
}

.form-input:focus {
  outline: none;
  border-color: hsl(var(--ring));
  box-shadow: 0 0 0 3px hsl(var(--ring) / 0.2);
}

.form-input:disabled {
  background: hsl(var(--muted));
  cursor: not-allowed;
}

.password-toggle {
  position: absolute;
  right: 0.75rem;
  color: hsl(var(--muted-foreground));
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 0.25rem;
  transition: color 0.2s;
}

.password-toggle:hover:not(:disabled) {
}

.password-toggle:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.form-options {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.875rem;
}

.checkbox-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.checkbox {
  width: 1rem;
  height: 1rem;
  border: 1px solid hsl(var(--border));
  border-radius: 0.25rem;
  cursor: pointer;
}

.checkbox:checked {
  background: hsl(var(--primary));
  border-color: hsl(var(--primary));
}

.checkbox-label {
  cursor: pointer;
  user-select: none;
}

.forgot-link {
  color: hsl(var(--primary));
  text-decoration: none;
  font-weight: 500;
}

.forgot-link:hover {
  text-decoration: underline;
}

.login-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.875rem 1rem;
  background: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
  border: none;
  border-radius: 0.5rem;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 0.5rem;
}

.login-button:hover:not(:disabled) {
  background: hsl(var(--primary) / 0.9);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px hsl(var(--primary) / 0.4);
}

.login-button:disabled {
  background: hsl(var(--muted));
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.login-button svg {
  width: 1rem !important;
  height: 1rem !important;
  flex-shrink: 0;
}

.register-link {
  text-align: center;
  font-size: 0.875rem;
  margin-top: 1.5rem;
}

.link {
  color: hsl(var(--primary));
  text-decoration: none;
  font-weight: 500;
}

.link:hover {
  text-decoration: underline;
}

.pwa-notice {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: hsl(var(--primary) / 0.1);
  color: hsl(var(--primary));
  padding: 0.75rem;
  border-radius: 0.5rem;
  font-size: 0.75rem;
  margin-top: 1rem;
  border: 1px solid hsl(var(--primary) / 0.3);
}

.background-pattern {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  opacity: 0.1;
  background-image:
    radial-gradient(circle at 25% 25%, hsl(var(--background)) 2px, transparent 2px),
    radial-gradient(circle at 75% 75%, hsl(var(--background)) 2px, transparent 2px);
  background-size: 50px 50px;
  background-position: 0 0, 25px 25px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@media (max-width: 480px) {
  .login-page {
    padding: 0.5rem;
  }

  .login-card {
    padding: 1.5rem;
  }

  .title {
    font-size: 1.75rem;
  }

  .form-input {
    padding: 0.625rem 0.625rem 0.625rem 2.5rem;
  }

  .input-icon {
    left: 0.625rem;
    width: 1rem;
    height: 1rem;
  }
}
</style>