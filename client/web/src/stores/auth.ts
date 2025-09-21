import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { apiUtils } from '@/utils/api'
import type { User, LoginCredentials, RegisterData } from '@/types/auth'

// Helper function to get permissions for a role
const getPermissionsForRole = (role: string): Record<string, boolean> => {
  switch (role) {
    case 'admin':
      return {
        can_create_inspections: true,
        can_view_all_inspections: true,
        can_edit_inspections: true,
        can_delete_inspections: true,
        can_manage_templates: true,
        can_manage_users: true,
        can_view_reports: true,
        can_export_reports: true,
        can_manage_organization: true,
        can_manage_sites: true,
      }
    case 'supervisor':
      return {
        can_create_inspections: true,
        can_view_all_inspections: true,
        can_edit_inspections: true,
        can_delete_inspections: false,
        can_manage_templates: true,
        can_manage_users: false,
        can_view_reports: true,
        can_export_reports: true,
        can_manage_organization: false,
        can_manage_sites: true,
      }
    case 'inspector':
      return {
        can_create_inspections: true,
        can_view_all_inspections: false,
        can_edit_inspections: true,
        can_delete_inspections: false,
        can_manage_templates: false,
        can_manage_users: false,
        can_view_reports: false,
        can_export_reports: false,
        can_manage_organization: false,
        can_manage_sites: false,
      }
    default:
      return {
        can_create_inspections: false,
        can_view_all_inspections: false,
        can_edit_inspections: false,
        can_delete_inspections: false,
        can_manage_templates: false,
        can_manage_users: false,
        can_view_reports: false,
        can_export_reports: false,
        can_manage_organization: false,
        can_manage_sites: false,
      }
  }
}

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref<User | null>(null)
  const token = ref<string | null>(localStorage.getItem('auth_token'))
  const isLoading = ref(false)
  const error = ref<string | null>(null)


  // Getters
  const isAuthenticated = computed(() => {
    return !!user.value && !!token.value
  })

  const userPermissions = computed(() => {
    if (!user.value || !user.value.permissions) return []
    return Object.keys(user.value.permissions).filter(
      key => user.value!.permissions[key] === true
    )
  })

  // Actions
  const login = async (credentials: LoginCredentials) => {
    isLoading.value = true
    error.value = null

    try {
      console.log('🔄 Starting login process...')
      const response = await apiUtils.post('/auth/login', credentials)
      console.log('📥 Login API response:', response)

      const { token: authToken, user: userData, organizations, current_organization } = response
      console.log('🔑 Extracted token:', authToken ? 'EXISTS' : 'MISSING')
      console.log('👤 Extracted user:', userData ? 'EXISTS' : 'MISSING')
      console.log('🏢 Organizations:', organizations)
      console.log('🏢 Current organization:', current_organization)

      // Get role and permissions from current organization
      let userRole = 'inspector' // default
      let userPermissions: Record<string, boolean> = {}

      if (organizations && organizations.length > 0) {
        // Find current organization or use first one
        const currentOrgMembership = organizations.find((org: any) =>
          org.organization_id === current_organization?.id
        ) || organizations[0]

        if (currentOrgMembership) {
          userRole = currentOrgMembership.role
          // Set permissions based on role
          userPermissions = getPermissionsForRole(userRole)
        }
      }

      // Merge user data with role and permissions
      const enrichedUser = {
        ...userData,
        role: userRole,
        permissions: userPermissions,
        organization: current_organization?.name || ''
      }

      // Store token and user data
      token.value = authToken
      user.value = enrichedUser
      localStorage.setItem('auth_token', authToken)

      console.log('👤 Final user object:', enrichedUser)
      console.log('💾 Token stored in localStorage:', localStorage.getItem('auth_token') ? 'SUCCESS' : 'FAILED')
      console.log('✅ Login process completed successfully')

      return { success: true }
    } catch (err: any) {
      console.error('❌ Login failed:', err)
      error.value = err.response?.data?.error || 'Login failed'
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  const register = async (userData: RegisterData) => {
    isLoading.value = true
    error.value = null

    try {
      const response = await apiUtils.post('/auth/register', userData)
      const { token: authToken, user: newUser } = response

      // Store token and user data
      token.value = authToken
      user.value = newUser
      localStorage.setItem('auth_token', authToken)

      return { success: true }
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Registration failed'
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  const logout = async () => {
    try {
      // Clear server-side session if token exists
      if (token.value) {
        try {
          await apiUtils.post('/auth/logout')
        } catch (err) {
          // Ignore logout API errors - clear local state anyway
          console.warn('Logout API call failed, clearing local state anyway:', err)
        }
      }
    } catch (err) {
      console.warn('Logout process encountered errors:', err)
    } finally {
      // Always clear local state regardless of API call success
      user.value = null
      token.value = null
      localStorage.removeItem('auth_token')
      error.value = null

      // Clear any other stores that depend on user data
      // This ensures a clean logout state
      console.log('✅ User logged out successfully')
    }
  }

  const fetchUser = async () => {
    if (!token.value) return

    try {
      isLoading.value = true

      const response = await apiUtils.get('/auth/profile')
      console.log('📥 Profile API response:', response)

      // Extract role and permissions from memberships
      let userRole = 'inspector' // default
      let userPermissions: Record<string, boolean> = {}
      let orgName = ''

      if (response.memberships && response.memberships.length > 0) {
        // Use first membership for now (could be enhanced for multi-org selection)
        const membership = response.memberships[0]
        userRole = membership.role
        userPermissions = getPermissionsForRole(userRole)
        orgName = membership.organization_name || ''
      }

      // Create enriched user object
      const enrichedUser = {
        id: response.id,
        name: response.name,
        email: response.email,
        role: userRole,
        permissions: userPermissions,
        organization: orgName,
        avatar: response.avatar_url || '',
        created_at: response.created_at,
        updated_at: response.updated_at
      }

      user.value = enrichedUser
      console.log('👤 Enriched user from profile:', enrichedUser)

      return { success: true }
    } catch (err: any) {
      console.error('❌ Profile fetch failed:', err)
      // Token might be expired or invalid
      logout()
      return { success: false, error: 'Authentication failed' }
    } finally {
      isLoading.value = false
    }
  }

  const updateProfile = async (profileData: Partial<User>) => {
    if (!user.value) return

    isLoading.value = true
    error.value = null

    try {
      const response = await apiUtils.put('/auth/profile', profileData)
      user.value = { ...user.value, ...response }
      return { success: true }
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Profile update failed'
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  const changePassword = async (passwordData: { current_password: string; new_password: string }) => {
    isLoading.value = true
    error.value = null

    try {
      await apiUtils.post('/auth/change-password', passwordData)
      return { success: true }
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Password change failed'
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  const hasPermission = (permission: string): boolean => {
    if (!user.value || !user.value.permissions) return false
    return user.value.permissions[permission] === true
  }

  const hasRole = (role: string): boolean => {
    return user.value?.role === role
  }

  const initializeAuth = async () => {
    if (token.value) {
      await fetchUser()
    }
    // No auto-login - users must explicitly log in
  }

  const clearError = () => {
    error.value = null
  }

  return {
    // State
    user,
    token,
    isLoading,
    error,

    // Getters
    isAuthenticated,
    userPermissions,

    // Actions
    login,
    register,
    logout,
    fetchUser,
    updateProfile,
    changePassword,
    hasPermission,
    hasRole,
    initializeAuth,
    clearError
  }
})