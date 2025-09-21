export interface User {
  id: string
  name: string
  email: string
  role: string
  organization?: string
  avatar?: string
  permissions: Record<string, boolean>
  created_at?: string
  updated_at?: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  name: string
  email: string
  password: string
  organization?: string
}

export interface AuthResponse {
  success: boolean
  error?: string
}

export interface LoginResponse extends AuthResponse {
  token?: string
  user?: User
}

export interface RegisterResponse extends AuthResponse {
  token?: string
  user?: User
}