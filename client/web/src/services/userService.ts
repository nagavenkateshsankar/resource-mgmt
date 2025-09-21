import { apiUtils } from '@/utils/api'

export interface User {
  id: string
  organization_id: string
  name: string
  email: string
  role: 'admin' | 'supervisor' | 'inspector' | 'viewer'
  status: 'active' | 'inactive' | 'pending'
  permissions?: Record<string, any>
  is_org_admin?: boolean
  avatar?: string
  lastActive?: string
  inspectionsCount?: number
  created_at: string
  updated_at: string
}

export interface UpdateUserRequest {
  name?: string
  role?: string
  status?: string
  permissions?: Record<string, any>
}

export interface CreateUserRequest {
  name: string
  email: string
  password: string
  role: string
  permissions?: Record<string, any>
}

export interface GetUsersParams {
  role?: string
  status?: string
  limit?: number
  offset?: number
}

export interface GetUsersResponse {
  users: User[]
  total: number
  limit: number
  offset: number
}

export interface UserValidationResult {
  canEdit: boolean
  canDelete: boolean
  canToggleStatus: boolean
  canChangeRole: boolean
  reasons: string[]
}

export class UserService {
  /**
   * Validates what actions the current user can perform on a target user
   */
  static validateUserActions(
    currentUser: User,
    targetUser: User,
    adminCount: number
  ): UserValidationResult {
    const result: UserValidationResult = {
      canEdit: false,
      canDelete: false,
      canToggleStatus: false,
      canChangeRole: false,
      reasons: []
    }

    // Basic permission checks
    const isAdmin = currentUser.role === 'admin'
    const isSelfAction = currentUser.id === targetUser.id
    const isTargetAdmin = targetUser.role === 'admin'
    const isLastAdmin = isTargetAdmin && adminCount <= 1

    // Edit permissions (profile info only)
    if (isSelfAction || isAdmin) {
      result.canEdit = true
    } else {
      result.reasons.push('Only admins can edit other users')
    }

    // Role change permissions
    if (isAdmin && !isSelfAction) {
      if (!isLastAdmin) {
        result.canChangeRole = true
      } else {
        result.reasons.push('Cannot change role of the last administrator')
      }
    } else if (isSelfAction) {
      result.reasons.push('Cannot change your own role')
    } else {
      result.reasons.push('Only administrators can change user roles')
    }

    // Status toggle permissions
    if (isAdmin && !isSelfAction) {
      if (!isLastAdmin || targetUser.status === 'inactive') {
        result.canToggleStatus = true
      } else {
        result.reasons.push('Cannot deactivate the last active administrator')
      }
    } else if (isSelfAction) {
      result.reasons.push('Cannot change your own account status')
    } else {
      result.reasons.push('Only administrators can change user status')
    }

    // Delete permissions
    if (isAdmin && !isSelfAction) {
      if (!isLastAdmin) {
        result.canDelete = true
      } else {
        result.reasons.push('Cannot delete the last administrator')
      }
    } else if (isSelfAction) {
      result.reasons.push('Cannot delete your own account')
    } else {
      result.reasons.push('Only administrators can delete users')
    }

    return result
  }

  /**
   * Fetch all users with role-based filtering
   */
  static async getUsers(filters: {
    role?: string
    status?: string
    limit?: number
    offset?: number
  } = {}): Promise<{ users: User[], total: number }> {
    try {
      const params = new URLSearchParams()
      if (filters.role) params.append('role', filters.role)
      if (filters.status) params.append('status', filters.status)
      if (filters.limit) params.append('limit', filters.limit.toString())
      if (filters.offset) params.append('offset', filters.offset.toString())

      const response = await apiUtils.get(`/users?${params.toString()}`)
      return {
        users: response.users || [],
        total: response.total || 0
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
      throw new Error('Failed to load users')
    }
  }

  /**
   * Get organization admin count for validation
   */
  static async getAdminCount(): Promise<number> {
    try {
      const response = await apiUtils.get('/users/admin-count')
      return response.count || 0
    } catch (error) {
      console.error('Failed to get admin count:', error)
      return 0
    }
  }

  /**
   * Update user with comprehensive validation
   */
  static async updateUser(userId: string, updates: UpdateUserRequest): Promise<User> {
    try {
      const response = await apiUtils.put(`/users/${userId}`, updates)
      return response
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to update user'
      throw new Error(message)
    }
  }

  /**
   * Toggle user status with validation
   */
  static async toggleUserStatus(userId: string, newStatus: 'active' | 'inactive'): Promise<User> {
    try {
      const response = await apiUtils.put(`/users/${userId}/status`, { status: newStatus })
      return response
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to change user status'
      throw new Error(message)
    }
  }

  /**
   * Delete user with validation
   */
  static async deleteUser(userId: string): Promise<void> {
    try {
      await apiUtils.delete(`/users/${userId}`)
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to delete user'
      throw new Error(message)
    }
  }

  /**
   * Create/invite new user
   */
  static async createUser(userData: CreateUserRequest): Promise<User> {
    try {
      const response = await apiUtils.post('/users', userData)
      return response
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to create user'
      throw new Error(message)
    }
  }

  /**
   * Get available roles for current user context
   */
  static async getAvailableRoles(): Promise<string[]> {
    try {
      const response = await apiUtils.get('/users/roles')
      return response.roles || []
    } catch (error) {
      console.error('Failed to fetch roles:', error)
      return ['inspector', 'viewer'] // Default roles
    }
  }

  /**
   * Get available permissions
   */
  static async getAvailablePermissions(): Promise<Record<string, string>> {
    try {
      const response = await apiUtils.get('/users/permissions')
      return response.permissions || {}
    } catch (error) {
      console.error('Failed to fetch permissions:', error)
      return {}
    }
  }

  /**
   * Get a specific user by ID
   */
  static async getUser(userId: string): Promise<User> {
    try {
      const response = await apiUtils.get(`/users/${userId}`)
      return response
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to get user'
      throw new Error(message)
    }
  }

  /**
   * Validate role change specifically
   */
  static validateRoleChange(
    currentUser: User,
    targetUser: User,
    newRole: string,
    adminCount: number
  ): { valid: boolean; reason?: string } {
    // Only admins can change roles
    if (currentUser.role !== 'admin') {
      return { valid: false, reason: 'Only administrators can change user roles' }
    }

    // Can't change own role
    if (currentUser.id === targetUser.id) {
      return { valid: false, reason: 'Cannot change your own role' }
    }

    // Can't demote the last admin
    if (targetUser.role === 'admin' && newRole !== 'admin' && adminCount <= 1) {
      return { valid: false, reason: 'Cannot demote the last administrator' }
    }

    return { valid: true }
  }

  /**
   * Validate user deletion
   */
  static validateUserDeletion(
    currentUser: User,
    targetUser: User,
    adminCount: number
  ): { valid: boolean; reason?: string } {
    // Only admins can delete users
    if (currentUser.role !== 'admin') {
      return { valid: false, reason: 'Only administrators can delete users' }
    }

    // Can't delete self
    if (currentUser.id === targetUser.id) {
      return { valid: false, reason: 'Cannot delete your own account' }
    }

    // Can't delete the last admin
    if (targetUser.role === 'admin' && adminCount <= 1) {
      return { valid: false, reason: 'Cannot delete the last administrator' }
    }

    return { valid: true }
  }

  /**
   * Validate status change
   */
  static validateStatusChange(
    currentUser: User,
    targetUser: User,
    newStatus: string,
    adminCount: number
  ): { valid: boolean; reason?: string } {
    // Only admins can change status
    if (currentUser.role !== 'admin') {
      return { valid: false, reason: 'Only administrators can change user status' }
    }

    // Can't change own status to inactive
    if (currentUser.id === targetUser.id && newStatus !== 'active') {
      return { valid: false, reason: 'Cannot deactivate your own account' }
    }

    // Can't deactivate the last admin
    if (targetUser.role === 'admin' && newStatus !== 'active' && adminCount <= 1) {
      return { valid: false, reason: 'Cannot deactivate the last administrator' }
    }

    return { valid: true }
  }

  /**
   * Helper method to get display name for role
   */
  static getRoleDisplayName(role: string): string {
    const roleNames: Record<string, string> = {
      admin: 'Administrator',
      inspector: 'Inspector',
      supervisor: 'Supervisor',
      viewer: 'Viewer'
    }
    return roleNames[role] || role.charAt(0).toUpperCase() + role.slice(1)
  }

  /**
   * Helper method to get role color class
   */
  static getRoleColorClass(role: string): string {
    const roleColors: Record<string, string> = {
      admin: 'role-admin',
      inspector: 'role-inspector',
      supervisor: 'role-supervisor',
      viewer: 'role-viewer'
    }
    return roleColors[role] || 'role-default'
  }

  /**
   * Helper method to get status color class
   */
  static getStatusColorClass(status: string): string {
    const statusColors: Record<string, string> = {
      active: 'status-active',
      inactive: 'status-inactive',
      pending: 'status-pending'
    }
    return statusColors[status] || 'status-default'
  }

  /**
   * Generate temporary password for new users
   */
  static generateTemporaryPassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    const specialChars = '!@#$%^&*'
    let password = ''

    // Add at least one special character
    password += specialChars.charAt(Math.floor(Math.random() * specialChars.length))

    // Add remaining characters
    for (let i = 1; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }

    // Shuffle the password
    return password.split('').sort(() => 0.5 - Math.random()).join('')
  }

  /**
   * Format user creation date
   */
  static formatUserDate(dateString: string): string {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  /**
   * Format last active time
   */
  static formatLastActive(dateString: string | null): string {
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
}