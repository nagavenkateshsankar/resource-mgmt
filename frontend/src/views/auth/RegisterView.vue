<template>
  <div class="register-page">
    <div class="register-container">
      <div class="register-card">
        <!-- Logo and Title -->
        <div class="register-header">
          <div class="logo">
            <svg viewBox="0 0 24 24" fill="currentColor" class="icon-xl text-primary">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <h1 class="title">Site Inspector</h1>
          <p class="subtitle">Create your account</p>
        </div>

        <!-- Error Message -->
        <div v-if="error" class="error-message">
          <ExclamationTriangleIcon class="icon-sm" />
          <span>{{ error }}</span>
        </div>

        <!-- Register Form -->
        <form @submit.prevent="handleRegister" class="register-form">
          <div class="form-group">
            <label for="name" class="form-label">Full Name</label>
            <div class="input-container">
              <UserIcon class="input-icon" />
              <input
                id="name"
                v-model="registrationData.name"
                type="text"
                required
                class="form-input"
                placeholder="Enter your full name"
                :disabled="isLoading"
              />
            </div>
          </div>

          <div class="form-group">
            <label for="email" class="form-label">Email address</label>
            <div class="input-container">
              <EnvelopeIcon class="input-icon" />
              <input
                id="email"
                v-model="registrationData.email"
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
                v-model="registrationData.password"
                :type="showPassword ? 'text' : 'password'"
                required
                class="form-input"
                placeholder="Enter your password"
                :disabled="isLoading"
                @input="validatePassword"
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
            <div v-if="passwordStrength" class="password-strength">
              <div class="strength-bar">
                <div
                  class="strength-fill"
                  :class="passwordStrength.level"
                  :style="{ width: passwordStrength.percentage + '%' }"
                ></div>
              </div>
              <span class="strength-text">{{ passwordStrength.text }}</span>
            </div>
          </div>

          <div class="form-group">
            <label for="confirmPassword" class="form-label">Confirm Password</label>
            <div class="input-container">
              <LockClosedIcon class="input-icon" />
              <input
                id="confirmPassword"
                v-model="confirmPassword"
                :type="showConfirmPassword ? 'text' : 'password'"
                required
                class="form-input"
                placeholder="Confirm your password"
                :disabled="isLoading"
                :class="{ 'input-error': confirmPassword && !passwordsMatch }"
              />
              <button
                type="button"
                @click="toggleConfirmPasswordVisibility"
                class="password-toggle"
                :disabled="isLoading"
              >
                <EyeIcon v-if="!showConfirmPassword" class="icon-sm" />
                <EyeSlashIcon v-else class="icon-sm" />
              </button>
            </div>
            <div v-if="confirmPassword && !passwordsMatch" class="field-error">
              Passwords don't match
            </div>
          </div>

          <div class="form-group">
            <label for="organization" class="form-label">Organization (Optional)</label>
            <div class="input-container">
              <BuildingOfficeIcon class="input-icon" />
              <input
                id="organization"
                v-model="registrationData.organization"
                type="text"
                class="form-input"
                placeholder="Enter your organization"
                :disabled="isLoading"
              />
            </div>
          </div>

          <div class="form-options">
            <label class="checkbox-container">
              <input
                v-model="acceptTerms"
                type="checkbox"
                class="checkbox"
                required
                :disabled="isLoading"
              />
              <span class="checkbox-label">
                I agree to the
                <a href="/terms" target="_blank" class="link">Terms of Service</a>
                and
                <a href="/privacy" target="_blank" class="link">Privacy Policy</a>
              </span>
            </label>
          </div>

          <button
            type="submit"
            class="register-button"
            :disabled="isLoading || !isFormValid"
          >
            <UserPlusIcon v-if="!isLoading" class="icon-sm" />
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
            {{ isLoading ? 'Creating account...' : 'Create account' }}
          </button>
        </form>

        <!-- Login Link -->
        <div class="login-link">
          Already have an account?
          <router-link to="/login" class="link">Sign in</router-link>
        </div>
      </div>
    </div>

    <!-- Background Pattern -->
    <div class="background-pattern"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import type { RegisterData } from '@/types/auth'

// Icons
import {
  UserIcon,
  EnvelopeIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
  UserPlusIcon,
  BuildingOfficeIcon,
  ExclamationTriangleIcon
} from '@heroicons/vue/24/outline'

const router = useRouter()
const authStore = useAuthStore()
const appStore = useAppStore()

// Reactive state
const registrationData = ref<RegisterData>({
  name: '',
  email: '',
  password: '',
  organization: ''
})

const confirmPassword = ref('')
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const acceptTerms = ref(false)
const passwordStrength = ref<{
  level: string
  percentage: number
  text: string
} | null>(null)

// Computed properties
const isLoading = computed(() => authStore.isLoading)
const error = computed(() => authStore.error)
const passwordsMatch = computed(() => {
  if (!confirmPassword.value) return true
  return registrationData.value.password === confirmPassword.value
})
const isFormValid = computed(() => {
  return registrationData.value.name.length > 0 &&
         registrationData.value.email.length > 0 &&
         registrationData.value.password.length >= 8 &&
         passwordsMatch.value &&
         acceptTerms.value
})

// Methods
const handleRegister = async () => {
  authStore.clearError()

  if (!passwordsMatch.value) {
    appStore.showErrorMessage('Passwords do not match')
    return
  }

  const result = await authStore.register(registrationData.value)

  if (result.success) {
    appStore.showSuccessMessage('Account created successfully! Welcome!')
    router.push('/dashboard')
  }
}

const togglePasswordVisibility = () => {
  showPassword.value = !showPassword.value
}

const toggleConfirmPasswordVisibility = () => {
  showConfirmPassword.value = !showConfirmPassword.value
}

const validatePassword = () => {
  const password = registrationData.value.password

  if (!password) {
    passwordStrength.value = null
    return
  }

  let score = 0
  let level = ''
  let text = ''

  // Length check
  if (password.length >= 8) score += 1
  if (password.length >= 12) score += 1

  // Character variety
  if (/[a-z]/.test(password)) score += 1
  if (/[A-Z]/.test(password)) score += 1
  if (/[0-9]/.test(password)) score += 1
  if (/[^A-Za-z0-9]/.test(password)) score += 1

  // Set level and text
  if (score < 3) {
    level = 'weak'
    text = 'Weak'
  } else if (score < 5) {
    level = 'medium'
    text = 'Medium'
  } else {
    level = 'strong'
    text = 'Strong'
  }

  passwordStrength.value = {
    level,
    percentage: Math.min((score / 6) * 100, 100),
    text
  }
}

// Initialize
onMounted(() => {
  // Clear any previous errors
  authStore.clearError()

  // Focus name input
  const nameInput = document.getElementById('name')
  if (nameInput) {
    nameInput.focus()
  }
})
</script>

<style scoped>
.register-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: hsl(var(--muted));
  padding: 1rem;
  position: relative;
  overflow: hidden;
}

.register-container {
  width: 100%;
  max-width: 450px;
  z-index: 10;
}

.register-card {
  background: hsl(var(--background));
  border-radius: 1rem;
  padding: 2rem;
  box-shadow: var(--shadow-xl);
  border: 1px solid hsl(var(--border));
  backdrop-filter: blur(10px);
  max-height: 90vh;
  overflow-y: auto;
}

.register-header {
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
  color: hsl(var(--foreground));
}

.subtitle {
  font-size: 1rem;
  margin: 0;
  color: hsl(var(--muted-foreground));
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
  border: 1px solid hsl(var(--destructive) / 0.2);
}

.register-form {
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
  color: hsl(var(--foreground));
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
  color: hsl(var(--foreground));
}

.form-input:focus {
  outline: none;
  border-color: hsl(var(--primary));
  box-shadow: 0 0 0 3px hsl(var(--primary) / 0.1);
}

.form-input:disabled {
  background: hsl(var(--muted));
  cursor: not-allowed;
  color: hsl(var(--muted-foreground));
}

.input-error {
  border-color: hsl(var(--destructive)) !important;
}

.input-error:focus {
  box-shadow: 0 0 0 3px hsl(var(--destructive) / 0.1) !important;
}

.field-error {
  color: hsl(var(--destructive));
  font-size: 0.75rem;
  margin-top: 0.25rem;
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
  color: hsl(var(--foreground));
}

.password-toggle:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.password-strength {
  margin-top: 0.5rem;
}

.strength-bar {
  height: 0.25rem;
  background: hsl(var(--border));
  border-radius: 0.125rem;
  overflow: hidden;
  margin-bottom: 0.25rem;
}

.strength-fill {
  height: 100%;
  transition: width 0.3s ease;
}

.strength-fill.weak {
  background: hsl(var(--destructive));
}

.strength-fill.medium {
  background: hsl(var(--warning));
}

.strength-fill.strong {
  background: hsl(var(--success));
}

.strength-text {
  font-size: 0.75rem;
  font-weight: 500;
  color: hsl(var(--foreground));
}

.text-primary {
  color: hsl(var(--primary));
}

.strength-text {
}

.form-options {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  font-size: 0.875rem;
}

.checkbox-container {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  cursor: pointer;
}

.checkbox {
  width: 1rem;
  height: 1rem;
  border: 1px solid hsl(var(--border));
  border-radius: 0.25rem;
  cursor: pointer;
  margin-top: 0.125rem;
  flex-shrink: 0;
  background: hsl(var(--background));
}

.checkbox:checked {
  background: hsl(var(--primary));
  border-color: hsl(var(--primary));
}

.checkbox-label {
  cursor: pointer;
  user-select: none;
  line-height: 1.4;
  color: hsl(var(--foreground));
}

.link {
  color: hsl(var(--primary));
  text-decoration: none;
  font-weight: 500;
}

.link:hover {
  text-decoration: underline;
}

.register-button {
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

.register-button:hover:not(:disabled) {
  background: hsl(var(--primary) / 0.9);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px hsl(var(--primary) / 0.4);
}

.register-button:disabled {
  background: hsl(var(--muted));
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
  color: hsl(var(--muted-foreground));
}

.login-link {
  text-align: center;
  font-size: 0.875rem;
  margin-top: 1.5rem;
  color: hsl(var(--foreground));
}

.background-pattern {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  opacity: 0.1;
  background-image:
    radial-gradient(circle at 25% 25%, white 2px, transparent 2px),
    radial-gradient(circle at 75% 75%, white 2px, transparent 2px);
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
  .register-page {
    padding: 0.5rem;
    align-items: flex-start;
    padding-top: 2rem;
  }

  .register-card {
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