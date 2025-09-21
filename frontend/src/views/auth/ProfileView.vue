<template>
  <div class="profile-page">
    <div class="page-header">
      <h1 class="page-title">Profile Settings</h1>
      <p class="page-description">Manage your account information and preferences</p>
    </div>

    <div class="profile-content">
      <!-- Profile Information Card -->
      <div class="profile-card">
        <div class="card-header">
          <h2 class="card-title">Personal Information</h2>
        </div>

        <div class="card-content">
          <!-- Avatar Section -->
          <div class="avatar-section">
            <div class="avatar-container">
              <img
                v-if="user?.avatar"
                :src="user.avatar"
                :alt="user.name"
                class="avatar-image"
              />
              <UserCircleIcon v-else class="avatar-placeholder" />
            </div>
            <div class="avatar-actions">
              <button class="avatar-button">Change Photo</button>
              <button v-if="user?.avatar" class="avatar-button remove">Remove</button>
            </div>
          </div>

          <!-- Profile Form -->
          <form @submit.prevent="handleUpdateProfile" class="profile-form">
            <div class="form-grid">
              <div class="form-group">
                <label for="name" class="form-label">Full Name</label>
                <input
                  id="name"
                  v-model="profileForm.name"
                  type="text"
                  required
                  class="form-input"
                  :disabled="isUpdating"
                />
              </div>

              <div class="form-group">
                <label for="email" class="form-label">Email Address</label>
                <input
                  id="email"
                  v-model="profileForm.email"
                  type="email"
                  required
                  class="form-input"
                  :disabled="isUpdating"
                />
              </div>

              <div class="form-group">
                <label for="organization" class="form-label">Organization</label>
                <input
                  id="organization"
                  v-model="profileForm.organization"
                  type="text"
                  class="form-input"
                  :disabled="isUpdating"
                />
              </div>

              <div class="form-group">
                <label for="role" class="form-label">Role</label>
                <input
                  id="role"
                  :value="user?.role || 'Inspector'"
                  type="text"
                  class="form-input"
                  disabled
                  readonly
                />
              </div>
            </div>

            <div class="form-actions">
              <button
                type="button"
                @click="resetForm"
                class="btn-secondary"
                :disabled="isUpdating"
              >
                Reset
              </button>
              <button
                type="submit"
                class="btn-primary"
                :disabled="isUpdating || !hasChanges"
              >
                <CheckIcon v-if="!isUpdating" class="icon-sm" />
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
                {{ isUpdating ? 'Updating...' : 'Update Profile' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Password Change Card -->
      <div class="profile-card">
        <div class="card-header">
          <h2 class="card-title">Change Password</h2>
          <p class="card-description">Update your password to keep your account secure</p>
        </div>

        <div class="card-content">
          <form @submit.prevent="handleChangePassword" class="password-form">
            <div class="form-group">
              <label for="currentPassword" class="form-label">Current Password</label>
              <div class="input-container">
                <input
                  id="currentPassword"
                  v-model="passwordForm.current_password"
                  :type="showCurrentPassword ? 'text' : 'password'"
                  required
                  class="form-input"
                  :disabled="isChangingPassword"
                />
                <button
                  type="button"
                  @click="showCurrentPassword = !showCurrentPassword"
                  class="password-toggle"
                  :disabled="isChangingPassword"
                >
                  <EyeIcon v-if="!showCurrentPassword" class="icon-sm" />
                  <EyeSlashIcon v-else class="icon-sm" />
                </button>
              </div>
            </div>

            <div class="form-group">
              <label for="newPassword" class="form-label">New Password</label>
              <div class="input-container">
                <input
                  id="newPassword"
                  v-model="passwordForm.new_password"
                  :type="showNewPassword ? 'text' : 'password'"
                  required
                  class="form-input"
                  :disabled="isChangingPassword"
                />
                <button
                  type="button"
                  @click="showNewPassword = !showNewPassword"
                  class="password-toggle"
                  :disabled="isChangingPassword"
                >
                  <EyeIcon v-if="!showNewPassword" class="icon-sm" />
                  <EyeSlashIcon v-else class="icon-sm" />
                </button>
              </div>
            </div>

            <div class="form-actions">
              <button
                type="submit"
                class="btn-primary"
                :disabled="isChangingPassword || !passwordForm.current_password || !passwordForm.new_password"
              >
                <KeyIcon v-if="!isChangingPassword" class="icon-sm" />
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
                {{ isChangingPassword ? 'Changing...' : 'Change Password' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Account Actions -->
      <div class="profile-card">
        <div class="card-header">
          <h2 class="card-title">Account Actions</h2>
        </div>

        <div class="card-content">
          <div class="action-item">
            <div class="action-info">
              <h3 class="action-title">Sign out of all devices</h3>
              <p class="action-description">This will sign you out of all devices except this one</p>
            </div>
            <button class="btn-secondary">Sign Out All</button>
          </div>

          <div class="action-item danger">
            <div class="action-info">
              <h3 class="action-title">Delete Account</h3>
              <p class="action-description">Permanently delete your account and all data</p>
            </div>
            <button class="btn-danger">Delete Account</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'

// Icons
import {
  UserCircleIcon,
  CheckIcon,
  EyeIcon,
  EyeSlashIcon,
  KeyIcon
} from '@heroicons/vue/24/outline'

const authStore = useAuthStore()
const appStore = useAppStore()

// Reactive state
const profileForm = ref({
  name: '',
  email: '',
  organization: ''
})

const passwordForm = ref({
  current_password: '',
  new_password: ''
})

const isUpdating = ref(false)
const isChangingPassword = ref(false)
const showCurrentPassword = ref(false)
const showNewPassword = ref(false)

// Computed properties
const user = computed(() => authStore.user)
const hasChanges = computed(() => {
  if (!user.value) return false
  return (
    profileForm.value.name !== user.value.name ||
    profileForm.value.email !== user.value.email ||
    profileForm.value.organization !== (user.value.organization || '')
  )
})

// Methods
const handleUpdateProfile = async () => {
  isUpdating.value = true

  try {
    const result = await authStore.updateProfile(profileForm.value)

    if (result?.success) {
      appStore.showSuccessMessage('Profile updated successfully')
    } else {
      appStore.showErrorMessage(result?.error || 'Failed to update profile')
    }
  } catch (error) {
    appStore.showErrorMessage('An error occurred while updating your profile')
  } finally {
    isUpdating.value = false
  }
}

const handleChangePassword = async () => {
  isChangingPassword.value = true

  try {
    const result = await authStore.changePassword(passwordForm.value)

    if (result?.success) {
      appStore.showSuccessMessage('Password changed successfully')
      passwordForm.value.current_password = ''
      passwordForm.value.new_password = ''
    } else {
      appStore.showErrorMessage(result?.error || 'Failed to change password')
    }
  } catch (error) {
    appStore.showErrorMessage('An error occurred while changing your password')
  } finally {
    isChangingPassword.value = false
  }
}

const resetForm = () => {
  if (user.value) {
    profileForm.value = {
      name: user.value.name || '',
      email: user.value.email || '',
      organization: user.value.organization || ''
    }
  }
}

// Initialize
onMounted(() => {
  resetForm()
})
</script>

<style scoped>
.profile-page {
  max-width: 800px;
  margin: 0 auto;
  padding: 1.5rem;
}

.page-header {
  margin-bottom: 2rem;
}

.page-title {
  font-size: 2rem;
  font-weight: 700;
  margin: 0 0 0.5rem;
  color: hsl(var(--foreground));
}

.page-description {
  font-size: 1rem;
  margin: 0;
  color: hsl(var(--muted-foreground));
}

.profile-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.profile-card {
  background: hsl(var(--background));
  border-radius: 0.75rem;
  border: 1px solid hsl(var(--border));
  overflow: hidden;
}

.card-header {
  padding: 1.5rem 1.5rem 1rem;
  border-bottom: 1px solid hsl(var(--border));
}

.card-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 0.25rem;
  color: hsl(var(--foreground));
}

.card-description {
  font-size: 0.875rem;
  margin: 0;
  color: hsl(var(--muted-foreground));
}

.card-content {
  padding: 1.5rem;
}

.avatar-section {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  margin-bottom: 2rem;
  padding-bottom: 2rem;
  border-bottom: 1px solid hsl(var(--border));
}

.avatar-container {
  width: 5rem;
  height: 5rem;
  border-radius: 50%;
  overflow: hidden;
  background: hsl(var(--muted));
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 3rem;
  height: 3rem;
  color: hsl(var(--muted-foreground));
}

.avatar-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.avatar-button {
  padding: 0.5rem 1rem;
  border: 1px solid hsl(var(--border));
  background: hsl(var(--background));
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  color: hsl(var(--foreground));
}

.avatar-button:hover {
  background: hsl(var(--muted));
  border-color: hsl(var(--muted-foreground));
}

.avatar-button.remove {
  color: hsl(var(--destructive));
  border-color: hsl(var(--destructive) / 0.5);
}

.avatar-button.remove:hover {
  background: hsl(var(--destructive) / 0.1);
  border-color: hsl(var(--destructive));
}

.profile-form,
.password-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
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
}

.form-input {
  width: 100%;
  padding: 0.75rem;
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

.password-toggle {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
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

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding-top: 1rem;
}

.btn-primary,
.btn-secondary,
.btn-danger {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.btn-primary {
  background: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
}

.btn-primary:hover:not(:disabled) {
  background: hsl(var(--primary) / 0.9);
}

.btn-primary:disabled {
  background: hsl(var(--muted));
  cursor: not-allowed;
  color: hsl(var(--muted-foreground));
}

.btn-secondary {
  background: hsl(var(--background));
  border-color: hsl(var(--border));
  color: hsl(var(--foreground));
}

.btn-secondary:hover:not(:disabled) {
  background: hsl(var(--muted));
  border-color: hsl(var(--muted-foreground));
}

.btn-danger {
  background: hsl(var(--destructive));
  color: hsl(var(--destructive-foreground));
}

.btn-danger:hover {
  background: hsl(var(--destructive) / 0.9);
}

.action-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 0;
}

.action-item:not(:last-child) {
  border-bottom: 1px solid hsl(var(--border));
}

.action-item.danger {
  border-color: hsl(var(--destructive) / 0.2);
  background: hsl(var(--destructive) / 0.1);
  margin: -1.5rem;
  margin-top: 1rem;
  padding: 1.5rem;
  border-radius: 0.5rem;
}

.action-info {
  flex: 1;
}

.action-title {
  font-size: 1rem;
  font-weight: 500;
  margin: 0 0 0.25rem;
  color: hsl(var(--foreground));
}

.action-item.danger .action-title {
  color: hsl(var(--destructive));
}

.action-description {
  font-size: 0.875rem;
  margin: 0;
  color: hsl(var(--muted-foreground));
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@media (max-width: 768px) {
  .profile-page {
    padding: 1rem;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .avatar-section {
    flex-direction: column;
    text-align: center;
  }

  .avatar-actions {
    flex-direction: row;
  }

  .action-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .form-actions {
    flex-direction: column;
  }
}
</style>