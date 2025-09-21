<template>
  <div class="users-page">
    <div class="page-header">
      <h1 class="page-title">Users Management</h1>
      <button class="btn btn-primary" @click="showInviteModal = true">
        <PlusIcon class="icon-sm" />
        Invite User
      </button>
    </div>

    <!-- Stats Cards -->
    <div class="stats-section">
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon total">
            <UsersIcon class="icon-md" />
          </div>
          <div class="stat-content">
            <div class="stat-number">{{ users.length }}</div>
            <div class="stat-label">Total Users</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon active">
            <CheckCircleIcon class="icon-md" />
          </div>
          <div class="stat-content">
            <div class="stat-number">{{ activeUsers }}</div>
            <div class="stat-label">Active Users</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon admins">
            <ShieldCheckIcon class="icon-md" />
          </div>
          <div class="stat-content">
            <div class="stat-number">{{ adminUsers }}</div>
            <div class="stat-label">Administrators</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon pending">
            <ClockIcon class="icon-md" />
          </div>
          <div class="stat-content">
            <div class="stat-number">{{ pendingInvites }}</div>
            <div class="stat-label">Pending Invites</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="filters-section">
      <div class="filter-group">
        <label for="role-filter" class="filter-label">Role</label>
        <select id="role-filter" v-model="selectedRole" class="filter-select">
          <option value="">All Roles</option>
          <option value="admin">Administrator</option>
          <option value="inspector">Inspector</option>
          <option value="viewer">Viewer</option>
        </select>
      </div>
      <div class="filter-group">
        <label for="status-filter" class="filter-label">Status</label>
        <select id="status-filter" v-model="selectedStatus" class="filter-select">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="pending">Pending</option>
        </select>
      </div>
      <div class="filter-group">
        <label for="search" class="filter-label">Search</label>
        <input
          id="search"
          type="text"
          v-model="searchTerm"
          placeholder="Search users..."
          class="filter-input"
        />
      </div>
    </div>

    <div class="users-content">
      <!-- Loading State -->
      <div v-if="isLoading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>Loading users...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="error-state">
        <UsersIcon class="icon-xl" />
        <h3>Error Loading Users</h3>
        <p>{{ error }}</p>
        <button @click="fetchUsers" class="btn btn-primary">
          Try Again
        </button>
      </div>

      <!-- Users Table -->
      <div v-else-if="filteredUsers.length > 0" class="users-table-container">
        <table class="users-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Status</th>
              <th>Last Active</th>
              <th>Inspections</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="user in filteredUsers"
              :key="user.id"
              class="user-row"
            >
              <td class="user-info">
                <div class="user-avatar">
                  <img
                    v-if="user.avatar"
                    :src="user.avatar"
                    :alt="user.name"
                    class="avatar-image"
                  />
                  <UserCircleIcon v-else class="icon-lg" />
                </div>
                <div class="user-details">
                  <div class="user-name">{{ user.name }}</div>
                  <div class="user-email">{{ user.email }}</div>
                </div>
              </td>
              <td>
                <span class="role-badge" :class="`role-${user.role}`">
                  {{ user.role.charAt(0).toUpperCase() + user.role.slice(1) }}
                </span>
              </td>
              <td>
                <div class="status-indicator">
                  <div class="status-dot" :class="`status-${user.status}`"></div>
                  <span class="status-text">
                    {{ user.status.charAt(0).toUpperCase() + user.status.slice(1) }}
                  </span>
                </div>
              </td>
              <td class="last-active">
                {{ formatDate(user.lastActive) }}
              </td>
              <td class="inspections-count">
                {{ user.inspectionsCount }}
              </td>
              <td class="user-actions">
                <button
                  class="action-btn"
                  @click="editUser(user)"
                  :disabled="!getUserValidation(user).canEdit"
                  :title="getUserValidation(user).canEdit ? 'Edit user' : getUserValidation(user).reasons.join(', ')"
                  :class="{ 'disabled': !getUserValidation(user).canEdit }"
                >
                  <PencilIcon class="icon-sm" />
                </button>
                <button
                  class="action-btn"
                  @click="toggleUserStatus(user)"
                  :disabled="!getUserValidation(user).canToggleStatus"
                  :title="getUserValidation(user).canToggleStatus
                    ? (user.status === 'active' ? 'Deactivate user' : 'Activate user')
                    : getUserValidation(user).reasons.join(', ')"
                  :class="{
                    'action-btn-deactivate': user.status === 'active' && getUserValidation(user).canToggleStatus,
                    'action-btn-activate': user.status !== 'active' && getUserValidation(user).canToggleStatus,
                    'disabled': !getUserValidation(user).canToggleStatus
                  }"
                >
                  <component :is="user.status === 'active' ? XCircleIcon : CheckCircleIcon" class="icon-sm" />
                </button>
                <button
                  class="action-btn action-btn-delete"
                  @click="deleteUser(user)"
                  :disabled="!getUserValidation(user).canDelete"
                  :title="getUserValidation(user).canDelete ? 'Delete user' : getUserValidation(user).reasons.join(', ')"
                  :class="{ 'disabled': !getUserValidation(user).canDelete }"
                >
                  <TrashIcon class="icon-sm" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Empty State -->
      <div v-else class="empty-state">
        <UsersIcon class="icon-xl" />
        <h3>No Users Found</h3>
        <p>{{ searchTerm || selectedRole || selectedStatus ? 'No users match your filters.' : 'No users have been added yet.' }}</p>
        <button class="btn btn-primary" @click="showInviteModal = true">
          <PlusIcon class="icon-sm" />
          Invite First User
        </button>
      </div>
    </div>

    <!-- Invite User Modal -->
    <div v-if="showInviteModal" class="modal-overlay" @click="closeInviteModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>Invite New User</h2>
          <button @click="closeInviteModal" class="modal-close-btn">
            <XMarkIcon class="icon-sm" />
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="invite-name" class="form-label">Full Name</label>
            <input
              id="invite-name"
              type="text"
              v-model="inviteForm.name"
              placeholder="John Doe"
              class="form-input"
              required
            />
          </div>
          <div class="form-group">
            <label for="invite-email" class="form-label">Email Address</label>
            <input
              id="invite-email"
              type="email"
              v-model="inviteForm.email"
              placeholder="user@company.com"
              class="form-input"
              required
            />
          </div>
          <div class="form-group">
            <label for="invite-role" class="form-label">Role</label>
            <select id="invite-role" v-model="inviteForm.role" class="form-select">
              <option v-for="role in availableRoles" :key="role" :value="role">
                {{ role.charAt(0).toUpperCase() + role.slice(1) }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label for="invite-password" class="form-label">Temporary Password (Optional)</label>
            <input
              id="invite-password"
              type="password"
              v-model="inviteForm.password"
              placeholder="Leave empty to auto-generate"
              class="form-input"
            />
            <small class="form-help">If left empty, a temporary password will be generated and sent via email</small>
          </div>
          <div class="form-group">
            <label for="invite-message" class="form-label">Personal Message (Optional)</label>
            <textarea
              id="invite-message"
              v-model="inviteForm.message"
              placeholder="Welcome to our inspection team!"
              class="form-textarea"
              rows="3"
            ></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="closeInviteModal" class="btn btn-secondary">
            Cancel
          </button>
          <button @click="sendInvite" class="btn btn-primary" :disabled="!inviteForm.email || !inviteForm.name">
            <PaperAirplaneIcon class="icon-sm" />
            Send Invite
          </button>
        </div>
      </div>
    </div>

    <!-- Edit User Modal -->
    <div v-if="showEditModal" class="modal-overlay" @click="closeEditModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>Edit User</h2>
          <button @click="closeEditModal" class="modal-close-btn">
            <XMarkIcon class="icon-sm" />
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="edit-name" class="form-label">Full Name</label>
            <input
              id="edit-name"
              type="text"
              v-model="editForm.name"
              class="form-input"
              required
            />
          </div>
          <div class="form-group">
            <label for="edit-role" class="form-label">Role</label>
            <select id="edit-role" v-model="editForm.role" class="form-select"
                    :disabled="!getUserValidation(users.find(u => u.id === editForm.id) || {} as User).canChangeRole">
              <option v-for="role in availableRoles" :key="role" :value="role">
                {{ role.charAt(0).toUpperCase() + role.slice(1) }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label for="edit-status" class="form-label">Status</label>
            <select id="edit-status" v-model="editForm.status" class="form-select"
                    :disabled="!getUserValidation(users.find(u => u.id === editForm.id) || {} as User).canToggleStatus">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="closeEditModal" class="btn btn-secondary">
            Cancel
          </button>
          <button @click="saveUserEdit" class="btn btn-primary">
            Save Changes
          </button>
        </div>
      </div>
    </div>

    <!-- Confirmation Modal -->
    <div v-if="showConfirmModal" class="modal-overlay" @click="closeConfirmModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2 class="flex items-center gap-2">
            <ExclamationTriangleIcon class="icon-md text-red-600" />
            Confirm Action
          </h2>
          <button @click="closeConfirmModal" class="modal-close-btn">
            <XMarkIcon class="icon-sm" />
          </button>
        </div>
        <div class="modal-body">
          <p>{{ confirmAction.message }}</p>
          <div v-if="confirmAction.type === 'delete'" class="warning-box">
            <ExclamationTriangleIcon class="icon-sm" />
            <span>This action cannot be undone. All user data will be permanently deleted.</span>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="closeConfirmModal" class="btn btn-secondary">
            Cancel
          </button>
          <button @click="confirmUserAction" class="btn"
                  :class="confirmAction.type === 'delete' ? 'btn-danger' : 'btn-primary'">
            {{ confirmAction.type === 'delete' ? 'Delete User' : 'Confirm' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { UserService, type User, type UserValidationResult } from '@/services/userService'
import {
  PlusIcon,
  UsersIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
  ClockIcon,
  UserCircleIcon,
  PencilIcon,
  XCircleIcon,
  TrashIcon,
  XMarkIcon,
  PaperAirplaneIcon,
  ExclamationTriangleIcon
} from '@heroicons/vue/24/outline'

// Auth store
const authStore = useAuthStore()

// State
const users = ref<User[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)
const adminCount = ref(0)
const availableRoles = ref<string[]>([])

// Filters
const selectedRole = ref('')
const selectedStatus = ref('')
const searchTerm = ref('')

// Modal state
const showInviteModal = ref(false)
const showEditModal = ref(false)
const showConfirmModal = ref(false)

// Form state
const inviteForm = ref({
  name: '',
  email: '',
  role: 'inspector',
  password: '',
  message: ''
})

const editForm = ref({
  id: '',
  name: '',
  role: '',
  status: ''
})

const confirmAction = ref({
  type: '',
  user: null as User | null,
  message: ''
})

// Computed
const filteredUsers = computed(() => {
  let filtered = users.value

  if (selectedRole.value) {
    filtered = filtered.filter(user => user.role === selectedRole.value)
  }

  if (selectedStatus.value) {
    filtered = filtered.filter(user => user.status === selectedStatus.value)
  }

  if (searchTerm.value) {
    const search = searchTerm.value.toLowerCase()
    filtered = filtered.filter(user =>
      user.name.toLowerCase().includes(search) ||
      user.email.toLowerCase().includes(search)
    )
  }

  return filtered
})

const activeUsers = computed(() =>
  users.value.filter(user => user.status === 'active').length
)

const adminUsers = computed(() =>
  users.value.filter(user => user.role === 'admin').length
)

const pendingInvites = computed(() =>
  users.value.filter(user => user.status === 'pending').length
)

// Computed for user validation
const getUserValidation = (user: User): UserValidationResult => {
  if (!authStore.user) {
    return {
      canEdit: false,
      canDelete: false,
      canToggleStatus: false,
      canChangeRole: false,
      reasons: ['Not authenticated']
    }
  }

  return UserService.validateUserActions(authStore.user, user, adminCount.value)
}

// API Functions
const fetchUsers = async () => {
  try {
    isLoading.value = true
    error.value = null

    const [usersResponse, adminCountResponse, rolesResponse] = await Promise.all([
      UserService.getUsers({
        role: selectedRole.value || undefined,
        status: selectedStatus.value || undefined
      }),
      UserService.getAdminCount(),
      UserService.getAvailableRoles()
    ])

    users.value = usersResponse.users
    adminCount.value = adminCountResponse
    availableRoles.value = rolesResponse
  } catch (err) {
    console.error('Failed to fetch users:', err)
    error.value = 'Failed to load users. Please try again later.'
  } finally {
    isLoading.value = false
  }
}

// Methods
const formatDate = (dateString: string | null) => {
  if (!dateString) return 'Never'

  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))

  if (diffMinutes < 1) return 'Just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`
  if (diffMinutes < 10080) return `${Math.floor(diffMinutes / 1440)}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const editUser = (user: User) => {
  const validation = getUserValidation(user)
  if (!validation.canEdit) {
    showErrorMessage(`Cannot edit user: ${validation.reasons.join(', ')}`)
    return
  }

  editForm.value = {
    id: user.id,
    name: user.name,
    role: user.role,
    status: user.status
  }
  showEditModal.value = true
}

const toggleUserStatus = (user: User) => {
  const validation = getUserValidation(user)
  if (!validation.canToggleStatus) {
    showErrorMessage(`Cannot change status: ${validation.reasons.join(', ')}`)
    return
  }

  const newStatus = user.status === 'active' ? 'inactive' : 'active'
  const actionText = newStatus === 'active' ? 'activate' : 'deactivate'

  confirmAction.value = {
    type: 'toggleStatus',
    user: user,
    message: `Are you sure you want to ${actionText} ${user.name}?`
  }
  showConfirmModal.value = true
}

const deleteUser = (user: User) => {
  const validation = getUserValidation(user)
  if (!validation.canDelete) {
    showErrorMessage(`Cannot delete user: ${validation.reasons.join(', ')}`)
    return
  }

  confirmAction.value = {
    type: 'delete',
    user: user,
    message: `Are you sure you want to delete ${user.name}? This action cannot be undone.`
  }
  showConfirmModal.value = true
}

// Error/Success handling
const showErrorMessage = (message: string) => {
  error.value = message
  setTimeout(() => {
    error.value = null
  }, 5000)
}

const showSuccessMessage = (message: string) => {
  // You can implement a success toast here
  console.log('Success:', message)
}

// Modal handlers
const closeInviteModal = () => {
  showInviteModal.value = false
  inviteForm.value = {
    name: '',
    email: '',
    role: 'inspector',
    password: '',
    message: ''
  }
}

const closeEditModal = () => {
  showEditModal.value = false
  editForm.value = {
    id: '',
    name: '',
    role: '',
    status: ''
  }
}

const closeConfirmModal = () => {
  showConfirmModal.value = false
  confirmAction.value = {
    type: '',
    user: null,
    message: ''
  }
}

// Action handlers
const sendInvite = async () => {
  if (!inviteForm.value.email || !inviteForm.value.name) return

  try {
    const userData = {
      name: inviteForm.value.name,
      email: inviteForm.value.email,
      role: inviteForm.value.role,
      password: inviteForm.value.password || generateTemporaryPassword()
    }

    await UserService.createUser(userData)
    showSuccessMessage(`Invitation sent to ${inviteForm.value.email}`)
    closeInviteModal()
    await fetchUsers() // Refresh the list
  } catch (err: any) {
    showErrorMessage(err.message)
  }
}

const saveUserEdit = async () => {
  try {
    const updates: any = {}
    const originalUser = users.value.find(u => u.id === editForm.value.id)

    if (!originalUser) return

    if (editForm.value.name !== originalUser.name) {
      updates.name = editForm.value.name
    }
    if (editForm.value.role !== originalUser.role) {
      updates.role = editForm.value.role
    }
    if (editForm.value.status !== originalUser.status) {
      updates.status = editForm.value.status
    }

    if (Object.keys(updates).length === 0) {
      closeEditModal()
      return
    }

    await UserService.updateUser(editForm.value.id, updates)
    showSuccessMessage('User updated successfully')
    closeEditModal()
    await fetchUsers() // Refresh the list
  } catch (err: any) {
    showErrorMessage(err.message)
  }
}

const confirmUserAction = async () => {
  if (!confirmAction.value.user) return

  try {
    const user = confirmAction.value.user

    switch (confirmAction.value.type) {
      case 'toggleStatus':
        const newStatus = user.status === 'active' ? 'inactive' : 'active'
        await UserService.toggleUserStatus(user.id, newStatus)
        showSuccessMessage(`User ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`)
        break

      case 'delete':
        await UserService.deleteUser(user.id)
        showSuccessMessage('User deleted successfully')
        break
    }

    closeConfirmModal()
    await fetchUsers() // Refresh the list
  } catch (err: any) {
    showErrorMessage(err.message)
    closeConfirmModal()
  }
}

const generateTemporaryPassword = (): string => {
  return Math.random().toString(36).slice(-8) + '!' + Math.random().toString(36).slice(-4).toUpperCase()
}

// Lifecycle
onMounted(() => {
  fetchUsers()
})
</script>

<style scoped>
.users-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1.5rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.page-title {
  font-size: 2rem;
  font-weight: 700;
  color: hsl(var(--foreground));
}

/* Stats Section */
.stats-section {
  margin-bottom: 2rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.stat-card {
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  border-radius: 0.75rem;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  transition: all 0.2s;
}

.stat-card:hover {
  border-color: hsl(var(--primary));
  box-shadow: var(--shadow);
}

.stat-icon {
  padding: 0.75rem;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon.total {
  background: hsl(var(--primary) / 0.1);
  color: hsl(var(--primary));
}

.stat-icon.active {
  background: hsl(var(--success) / 0.1);
  color: hsl(var(--success));
}

.stat-icon.admins {
  background: hsl(var(--warning) / 0.1);
  color: hsl(var(--warning));
}

.stat-icon.pending {
  background: hsl(var(--muted));
  color: hsl(var(--muted-foreground));
}

.stat-content {
  flex: 1;
}

.stat-number {
  font-size: 2rem;
  font-weight: 700;
  color: hsl(var(--foreground));
}

.stat-label {
  font-size: 0.875rem;
  color: hsl(var(--muted-foreground));
}

/* Filters */
.filters-section {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: hsl(var(--background));
  border-radius: 0.75rem;
  box-shadow: var(--shadow-sm);
  border: 1px solid hsl(var(--border));
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.filter-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: hsl(var(--foreground));
}

.filter-select,
.filter-input {
  padding: 0.5rem 0.75rem;
  border: 1px solid hsl(var(--border));
  border-radius: 0.375rem;
  font-size: 0.875rem;
  min-width: 150px;
  background: hsl(var(--background));
  color: hsl(var(--foreground));
}

.filter-select:focus,
.filter-input:focus {
  outline: none;
  ring: 2px;
  ring-color: hsl(var(--primary));
  border-color: hsl(var(--primary));
}

/* Content */
.users-content {
  background: hsl(var(--background));
  border-radius: 0.75rem;
  padding: 0;
  box-shadow: var(--shadow-sm);
  border: 1px solid hsl(var(--border));
  overflow: hidden;
}

/* Users Table */
.users-table-container {
  overflow-x: auto;
}

.users-table {
  width: 100%;
  border-collapse: collapse;
}

.users-table th {
  background: hsl(var(--muted));
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  font-size: 0.875rem;
  border-bottom: 1px solid hsl(var(--border));
  color: hsl(var(--foreground));
}

.users-table td {
  padding: 1rem;
  border-bottom: 1px solid hsl(var(--border));
  vertical-align: middle;
  color: hsl(var(--foreground));
}

.user-row:hover {
  background: hsl(var(--muted) / 0.5);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.user-avatar {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: hsl(var(--muted));
  color: hsl(var(--muted-foreground));
}

.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-details {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-weight: 500;
  font-size: 0.875rem;
  color: hsl(var(--foreground));
}

.user-email {
  font-size: 0.75rem;
  color: hsl(var(--muted-foreground));
}

.role-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: capitalize;
}

.role-admin {
  background: hsl(var(--warning) / 0.1);
  color: hsl(var(--warning));
}

.role-inspector {
  background: hsl(var(--primary) / 0.1);
  color: hsl(var(--primary));
}

.role-viewer {
  background: hsl(var(--muted));
  color: hsl(var(--muted-foreground));
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
}

.status-dot.status-active {
  background: hsl(var(--success));
}

.status-dot.status-inactive {
  background: hsl(var(--destructive));
}

.status-dot.status-pending {
  background: hsl(var(--warning));
}

.status-text {
  font-size: 0.875rem;
  color: hsl(var(--foreground));
}

.last-active,
.inspections-count {
  font-size: 0.875rem;
  color: hsl(var(--foreground));
}

.user-actions {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 0.375rem;
  transition: all 0.2s;
  color: hsl(var(--muted-foreground));
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-btn:hover {
  background: hsl(var(--accent));
  color: hsl(var(--accent-foreground));
}

.action-btn:focus {
  outline: none;
  box-shadow: 0 0 0 2px hsl(var(--ring));
}

.action-btn-delete {
  color: hsl(var(--destructive));
}

.action-btn-delete:hover {
  background: hsl(var(--destructive) / 0.1);
  color: hsl(var(--destructive));
}

.action-btn-activate {
  color: hsl(var(--success));
}

.action-btn-activate:hover {
  background: hsl(var(--success) / 0.1);
  color: hsl(var(--success));
}

.action-btn-deactivate {
  color: hsl(var(--destructive));
}

.action-btn-deactivate:hover {
  background: hsl(var(--destructive) / 0.1);
  color: hsl(var(--destructive));
}

.action-btn.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.form-help {
  font-size: 0.75rem;
  margin-top: 0.25rem;
  display: block;
  color: hsl(var(--muted-foreground));
}

.warning-box {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: hsl(var(--destructive) / 0.1);
  border: 1px solid hsl(var(--destructive) / 0.2);
  border-radius: 0.5rem;
  color: hsl(var(--destructive));
  font-size: 0.875rem;
  margin-top: 1rem;
}

.btn-danger {
  background: hsl(var(--destructive));
  color: hsl(var(--destructive-foreground));
  border: 1px solid hsl(var(--destructive));
}

.btn-danger:hover {
  background: hsl(var(--destructive) / 0.9);
  border-color: hsl(var(--destructive) / 0.9);
}

/* Loading and Error States */
.loading-state,
.error-state {
  text-align: center;
  padding: 4rem 2rem;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.loading-spinner {
  width: 2rem;
  height: 2rem;
  border: 3px solid hsl(var(--muted));
  border-top: 3px solid hsl(var(--primary));
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-state h3 {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 1rem 0 0.5rem;
  color: hsl(var(--foreground));
}

.error-state p {
  margin-bottom: 2rem;
  font-size: 0.875rem;
  color: hsl(var(--muted-foreground));
  max-width: 24rem;
  margin-left: auto;
  margin-right: auto;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 4rem 2rem;
}

.empty-state h3 {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 1rem 0 0.5rem;
  color: hsl(var(--foreground));
}

.empty-state p {
  margin-bottom: 2rem;
  font-size: 0.875rem;
  color: hsl(var(--muted-foreground));
  max-width: 24rem;
  margin-left: auto;
  margin-right: auto;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: hsl(var(--background) / 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
  backdrop-filter: blur(4px);
}

.modal-content {
  background: hsl(var(--background));
  border-radius: 0.75rem;
  box-shadow: var(--shadow-lg);
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow: hidden;
  border: 1px solid hsl(var(--border));
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid hsl(var(--border));
}

.modal-header h2 {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
  color: hsl(var(--foreground));
}

.modal-close-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 0.25rem;
  transition: all 0.2s;
}

.modal-close-btn:hover {
  background: hsl(var(--muted));
}

.modal-body {
  padding: 1.5rem;
  max-height: 60vh;
  overflow-y: auto;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
  color: hsl(var(--foreground));
}

.form-input,
.form-select,
.form-textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid hsl(var(--border));
  border-radius: 0.5rem;
  font-size: 0.875rem;
  transition: all 0.2s;
  background: hsl(var(--background));
  color: hsl(var(--foreground));
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  outline: none;
  border-color: hsl(var(--primary));
  box-shadow: 0 0 0 3px hsl(var(--primary) / 0.1);
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1.5rem;
  border-top: 1px solid hsl(var(--border));
  background: hsl(var(--muted) / 0.5);
}

/* Responsive */
@media (max-width: 768px) {
  .users-page {
    padding: 1rem;
  }

  .page-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .filters-section {
    flex-direction: column;
  }

  .filter-select,
  .filter-input {
    min-width: auto;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .users-table th,
  .users-table td {
    padding: 0.75rem 0.5rem;
    font-size: 0.75rem;
  }

  .user-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .user-avatar {
    width: 2rem;
    height: 2rem;
  }

  .user-actions {
    flex-direction: column;
  }

  .modal-header,
  .modal-body,
  .modal-footer {
    padding: 1rem;
  }
}

@media (max-width: 640px) {
  .users-table {
    font-size: 0.75rem;
  }

  .last-active,
  .inspections-count {
    display: none;
  }

  .role-badge {
    font-size: 0.625rem;
    padding: 0.125rem 0.5rem;
  }
}
</style>