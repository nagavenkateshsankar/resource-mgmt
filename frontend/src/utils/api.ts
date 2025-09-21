import axios from 'axios'

// Create axios instance with default config
export const api = axios.create({
  baseURL: '/api/v1',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    // Add timestamp to prevent caching
    if (config.method === 'get') {
      config.params = {
        ...config.params,
        _t: Date.now()
      }
    }

    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    // Handle common errors
    if (error.response?.status === 401) {
      // Clear invalid token
      localStorage.removeItem('auth_token')
      delete api.defaults.headers.common['Authorization']

      // Redirect to login if not already there
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }

    // Network error handling
    if (!error.response) {
      console.error('Network error:', error.message)

      // Check if we're offline
      if (!navigator.onLine) {
        error.message = 'You are currently offline. Please check your internet connection.'
      } else {
        error.message = 'Network error. Please try again later.'
      }
    }

    return Promise.reject(error)
  }
)

// API utility functions
export const apiUtils = {
  // Generic GET request
  get: <T = any>(url: string, params?: any): Promise<T> => {
    return api.get(url, { params }).then(response => response.data)
  },

  // Generic POST request
  post: <T = any>(url: string, data?: any): Promise<T> => {
    return api.post(url, data).then(response => response.data)
  },

  // POST FormData request
  postFormData: <T = any>(url: string, formData: FormData, onProgress?: (progress: number) => void): Promise<T> => {
    return api.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          onProgress(progress)
        }
      }
    }).then(response => response.data)
  },

  // Generic PUT request
  put: <T = any>(url: string, data?: any): Promise<T> => {
    return api.put(url, data).then(response => response.data)
  },

  // Generic DELETE request
  delete: <T = any>(url: string): Promise<T> => {
    return api.delete(url).then(response => response.data)
  },

  // File upload
  upload: <T = any>(url: string, file: File, onProgress?: (progress: number) => void): Promise<T> => {
    const formData = new FormData()
    formData.append('file', file)

    return api.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          onProgress(progress)
        }
      }
    }).then(response => response.data)
  },

  // Download file
  download: async (url: string, filename?: string): Promise<void> => {
    const response = await api.get(url, {
      responseType: 'blob'
    })

    const blob = new Blob([response.data])
    const downloadUrl = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = filename || 'download'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(downloadUrl)
  }
}

// Export default instance
export default api