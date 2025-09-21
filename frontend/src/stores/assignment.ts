import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { apiUtils } from '@/utils/api'
import { useAuthStore } from '@/stores/auth'

// Types for assignment workflow
export interface Site {
  id: string
  name: string
  address: string
  coordinates?: {
    latitude: number
    longitude: number
  }
  organization_id: string
  created_at: string
  updated_at: string
}

export interface Template {
  id: string
  name: string
  description: string
  version: string
  fields: any[]
  organization_id: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Assignment {
  id: string
  inspection_id: string
  site_id: string
  template_id: string
  site_name: string
  template_name: string
  assigned_by: string
  assigned_to: string
  assigner_name: string
  inspector_name: string
  status: 'pending' | 'in_progress' | 'completed' | 'overdue'
  due_date?: string
  created_at: string
  updated_at: string
}

export interface BulkAssignmentRequest {
  name: string
  description?: string
  project_id?: string
  priority?: string
  template_id: string
  site_ids: string[]
  inspector_assignments: Array<{
    inspector_id: string
    site_ids: string[]
  }>
  start_date?: string
  due_date?: string
  estimated_hours?: number
  instructions?: string
  requires_acceptance?: boolean
  allow_reassignment?: boolean
  notify_on_overdue?: boolean
  metadata?: Record<string, any>
}

export interface BulkAssignmentResponse {
  success: boolean
  created_assignments: Assignment[]
  failed_assignments?: Array<{
    site_id: string
    template_id: string
    error: string
  }>
  total_created: number
  total_failed: number
}

export const useAssignmentStore = defineStore('assignment', () => {
  // State
  const sites = ref<Site[]>([])
  const templates = ref<Template[]>([])
  const assignments = ref<Assignment[]>([])
  const selectedSites = ref<string[]>([])
  const selectedTemplates = ref<string[]>([])
  const workflowType = ref<'site_first' | 'inspection_first' | null>(null)
  const isLoading = ref(false)
  const isCreatingAssignments = ref(false)
  const error = ref<string | null>(null)

  // Current workflow state
  const currentStep = ref<'workflow_selection' | 'site_selection' | 'template_selection' | 'assignment_creation' | 'completed'>('workflow_selection')

  // Getters
  const isAuthenticated = computed(() => {
    const authStore = useAuthStore()
    return authStore.isAuthenticated
  })

  const currentOrganizationId = computed(() => {
    const authStore = useAuthStore()
    // Since we don't have organization_id in user, we'll need to get it from a different source
    // For now, we'll use the default organization UUID
    return '00000000-0000-0000-0000-000000000001' // Default organization UUID
  })

  const selectedSitesData = computed(() => {
    return sites.value.filter(site => selectedSites.value.includes(site.id))
  })

  const selectedTemplatesData = computed(() => {
    return templates.value.filter(template => selectedTemplates.value.includes(template.id))
  })

  const pendingAssignments = computed(() => {
    return assignments.value.filter(assignment => assignment.status === 'pending')
  })

  const completedAssignments = computed(() => {
    return assignments.value.filter(assignment => assignment.status === 'completed')
  })

  const canCreateAssignments = computed(() => {
    return selectedSites.value.length > 0 &&
           selectedTemplates.value.length > 0 &&
           workflowType.value !== null
  })

  const estimatedAssignmentCount = computed(() => {
    return selectedSites.value.length * selectedTemplates.value.length
  })

  // Actions
  const fetchSites = async () => {
    if (!isAuthenticated.value) return { success: false, error: 'Not authenticated' }

    isLoading.value = true
    error.value = null

    try {
      console.log('🏗️ Fetching sites from API...')
      const response = await apiUtils.get('/sites')
      console.log('✅ Sites API response:', response)
      sites.value = response.sites || response || []
      console.log(`📊 Loaded ${sites.value.length} sites`)
      return { success: true }
    } catch (err: any) {
      console.error('❌ Failed to fetch sites:', err)
      console.error('Error details:', {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message
      })

      // Better error handling for authentication issues
      if (err.response?.status === 401) {
        error.value = 'Authentication required. Please log in to access sites.'
      } else if (err.response?.status === 403) {
        error.value = 'Permission denied. You may not have access to view sites.'
      } else {
        error.value = err.response?.data?.error || err.message || 'Failed to fetch sites'
      }

      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  const fetchTemplates = async () => {
    if (!isAuthenticated.value) return { success: false, error: 'Not authenticated' }

    isLoading.value = true
    error.value = null

    try {
      console.log('📝 Fetching templates from API...')
      const response = await apiUtils.get('/templates')
      console.log('✅ Templates API response:', response)
      templates.value = response.templates || response || []
      console.log(`📊 Loaded ${templates.value.length} templates`)
      return { success: true }
    } catch (err: any) {
      console.error('❌ Failed to fetch templates:', err)
      console.error('Error details:', {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message
      })

      // Better error handling for authentication issues
      if (err.response?.status === 401) {
        error.value = 'Authentication required. Please log in to access templates.'
      } else if (err.response?.status === 403) {
        error.value = 'Permission denied. You may not have access to view templates.'
      } else {
        error.value = err.response?.data?.error || err.message || 'Failed to fetch templates'
      }

      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  const fetchAssignments = async () => {
    if (!isAuthenticated.value) return { success: false, error: 'Not authenticated' }

    const orgId = currentOrganizationId.value

    if (!orgId) {
      error.value = 'Organization ID not found'
      return { success: false, error: error.value }
    }

    isLoading.value = true
    error.value = null

    try {
      console.log('🔍 Fetching assignments from API...')
      const response = await apiUtils.get('/assignments')
      console.log('📦 API response received:', response)
      console.log('📦 Response type:', typeof response)
      console.log('📦 Response is array:', Array.isArray(response))
      console.log('📦 Response.assignments:', response?.assignments)
      console.log('📦 Response.assignments is array:', Array.isArray(response?.assignments))

      // Ensure we always set an array
      let assignmentsData = []

      if (Array.isArray(response)) {
        assignmentsData = response
      } else if (response && Array.isArray(response.assignments)) {
        assignmentsData = response.assignments
      } else if (response && Array.isArray(response.data)) {
        assignmentsData = response.data
      } else {
        console.warn('⚠️ API response is not in expected format, using empty array')
        assignmentsData = []
      }

      console.log('✅ Final assignments data:', assignmentsData)
      console.log('✅ Final assignments data is array:', Array.isArray(assignmentsData))
      console.log('✅ Final assignments data length:', assignmentsData.length)

      // Process assignments to add template_name, site_name, and user names for frontend compatibility
      const processedAssignments = assignmentsData.map((assignment: any) => {
        // Extract template name from the template relationship
        const templateName = assignment.template?.name || 'Unknown Template'

        // Extract site names from metadata site_details
        let siteNames = 'Unknown Site'
        if (assignment.metadata?.site_details && Array.isArray(assignment.metadata.site_details)) {
          const siteNamesList = assignment.metadata.site_details.map((site: any) => site.name || 'Unknown Site')
          siteNames = siteNamesList.join(', ')
        }

        // Extract user names from preloaded user relationships
        const assignerName = assignment.assigner?.name || assignment.assigner?.email || 'Unknown Assigner'
        const inspectorName = assignment.inspector?.name || assignment.inspector?.email || 'Unknown Inspector'

        return {
          ...assignment,
          template_name: templateName,
          site_name: siteNames,
          assigner_name: assignerName,
          inspector_name: inspectorName
        }
      })

      assignments.value = processedAssignments
      return { success: true }
    } catch (err: any) {
      console.error('❌ Error fetching assignments:', err)
      error.value = err.response?.data?.error || 'Failed to fetch assignments'
      // On error, ensure assignments remains an empty array
      assignments.value = []
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  const createBulkAssignments = async (requestData: Partial<BulkAssignmentRequest> = {}) => {
    if (!isAuthenticated.value) return { success: false, error: 'Not authenticated' }
    if (!canCreateAssignments.value) return { success: false, error: 'Invalid selection' }

    const orgId = currentOrganizationId.value

    if (!orgId) {
      error.value = 'Organization ID not found'
      return { success: false, error: error.value }
    }

    isCreatingAssignments.value = true
    error.value = null

    try {
      // For now, use the first selected template. In a real implementation,
      // we'd need to create separate assignments for each template.
      const templateId = selectedTemplates.value[0]
      if (!templateId) {
        error.value = 'No template selected'
        return { success: false, error: error.value }
      }

      // Create a default inspector assignment - assign all sites to the current user
      // In a real implementation, this would come from user selection
      const authStore = useAuthStore()
      const inspectorAssignments = [{
        inspector_id: authStore.user?.id || 'admin-user',
        site_ids: selectedSites.value
      }]

      const payload: BulkAssignmentRequest = {
        name: `Bulk Assignment - ${new Date().toLocaleDateString()}`,
        description: `Bulk assignment created via assignment wizard`,
        template_id: templateId,
        site_ids: selectedSites.value,
        inspector_assignments: inspectorAssignments,
        requires_acceptance: false,
        allow_reassignment: true,
        notify_on_overdue: true,
        ...requestData
      }

      const response = await apiUtils.post(
        '/assignments',
        payload
      )

      // Backend returns { data: Assignment[] } on success
      if (response.data && Array.isArray(response.data)) {
        // Add new assignments to the store
        assignments.value = [...assignments.value, ...response.data]

        // Reset workflow state
        resetWorkflow()
        currentStep.value = 'completed'

        return {
          success: true,
          data: response
        }
      } else {
        error.value = 'Failed to create assignments'
        return { success: false, error: error.value, data: response }
      }
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to create assignments'
      return { success: false, error: error.value }
    } finally {
      isCreatingAssignments.value = false
    }
  }

  const deleteAssignment = async (assignmentId: string) => {
    if (!isAuthenticated.value) return { success: false, error: 'Not authenticated' }

    const orgId = currentOrganizationId.value

    if (!orgId) {
      error.value = 'Organization ID not found'
      return { success: false, error: error.value }
    }

    isLoading.value = true
    error.value = null

    try {
      await apiUtils.delete(`/assignments/${assignmentId}`)

      // Remove from local state
      assignments.value = assignments.value.filter(assignment => assignment.id !== assignmentId)

      return { success: true }
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to delete assignment'
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  // Workflow management
  const setWorkflowType = (type: 'site_first' | 'inspection_first') => {
    workflowType.value = type
    resetSelections()

    if (type === 'site_first') {
      currentStep.value = 'site_selection'
    } else {
      currentStep.value = 'template_selection'
    }
  }

  const toggleSiteSelection = (siteId: string) => {
    const index = selectedSites.value.indexOf(siteId)
    if (index > -1) {
      selectedSites.value.splice(index, 1)
    } else {
      selectedSites.value.push(siteId)
    }
  }

  const toggleTemplateSelection = (templateId: string) => {
    const index = selectedTemplates.value.indexOf(templateId)
    if (index > -1) {
      selectedTemplates.value.splice(index, 1)
    } else {
      selectedTemplates.value.push(templateId)
    }
  }

  const selectAllSites = () => {
    selectedSites.value = sites.value.map(site => site.id)
  }

  const deselectAllSites = () => {
    selectedSites.value = []
  }

  const selectAllTemplates = () => {
    selectedTemplates.value = templates.value.map(template => template.id)
  }

  const deselectAllTemplates = () => {
    selectedTemplates.value = []
  }

  const proceedToNextStep = () => {
    if (currentStep.value === 'site_selection' && workflowType.value === 'site_first') {
      currentStep.value = 'template_selection'
    } else if (currentStep.value === 'template_selection' && workflowType.value === 'inspection_first') {
      currentStep.value = 'site_selection'
    } else if (
      (currentStep.value === 'template_selection' && workflowType.value === 'site_first') ||
      (currentStep.value === 'site_selection' && workflowType.value === 'inspection_first')
    ) {
      currentStep.value = 'assignment_creation'
    }
  }

  const goBackToPreviousStep = () => {
    if (currentStep.value === 'assignment_creation') {
      if (workflowType.value === 'site_first') {
        currentStep.value = 'template_selection'
      } else {
        currentStep.value = 'site_selection'
      }
    } else if (currentStep.value === 'template_selection' && workflowType.value === 'site_first') {
      currentStep.value = 'site_selection'
    } else if (currentStep.value === 'site_selection' && workflowType.value === 'inspection_first') {
      currentStep.value = 'template_selection'
    } else {
      currentStep.value = 'workflow_selection'
    }
  }

  const resetWorkflow = () => {
    resetSelections()
    workflowType.value = null
    currentStep.value = 'workflow_selection'
  }

  const resetSelections = () => {
    selectedSites.value = []
    selectedTemplates.value = []
  }

  const clearError = () => {
    error.value = null
  }

  // Initialize data when store is created
  const initializeStore = async () => {
    console.log('🚀 Initializing assignment store...')
    console.log('Authentication status:', isAuthenticated.value)

    // Always add mock data for testing
    loadMockData()

    if (isAuthenticated.value) {
      console.log('👤 User is authenticated, fetching data...')
      const [sitesResult, templatesResult, assignmentsResult] = await Promise.all([
        fetchSites(),
        fetchTemplates(),
        fetchAssignments()
      ])

      console.log('📊 Store initialization results:', {
        sites: sitesResult,
        templates: templatesResult,
        assignments: assignmentsResult
      })

      // If API calls failed but we have mock data, keep the mock data
      if (!sitesResult.success && sites.value.length > 0) {
        console.log('📋 Using mock sites data due to API failure')
      }
      if (!templatesResult.success && templates.value.length > 0) {
        console.log('📋 Using mock templates data due to API failure')
      }
    } else {
      console.log('❌ User is not authenticated, using mock data for testing')
      error.value = 'Using test data - please log in for real data'
    }
  }

  // Load mock data for testing
  const loadMockData = () => {
    console.log('📋 Loading mock data for testing...')

    // Mock sites data
    sites.value = [
      {
        id: 'site-001',
        name: 'Downtown Office Building',
        address: '123 Main Street, Downtown',
        coordinates: {
          latitude: 40.7128,
          longitude: -74.0060
        },
        organization_id: '00000000-0000-0000-0000-000000000001',
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z'
      },
      {
        id: 'site-002',
        name: 'Warehouse Facility A',
        address: '456 Industrial Blvd, Industrial District',
        coordinates: {
          latitude: 40.7589,
          longitude: -73.9851
        },
        organization_id: '00000000-0000-0000-0000-000000000001',
        created_at: '2024-01-16T14:30:00Z',
        updated_at: '2024-01-16T14:30:00Z'
      },
      {
        id: 'site-003',
        name: 'Retail Store Branch',
        address: '789 Shopping Plaza, Retail Zone',
        organization_id: '00000000-0000-0000-0000-000000000001',
        created_at: '2024-01-17T09:15:00Z',
        updated_at: '2024-01-17T09:15:00Z'
      }
    ]

    // Mock templates data
    templates.value = [
      {
        id: 'template-001',
        name: 'Safety Inspection Checklist',
        description: 'Comprehensive safety inspection for all facilities',
        version: '1.2',
        fields: [
          { name: 'fire_exits', type: 'boolean', label: 'Fire exits clear and marked' },
          { name: 'emergency_lighting', type: 'boolean', label: 'Emergency lighting functional' },
          { name: 'safety_equipment', type: 'text', label: 'Safety equipment status' }
        ],
        organization_id: '00000000-0000-0000-0000-000000000001',
        is_active: true,
        created_at: '2024-01-10T08:00:00Z',
        updated_at: '2024-01-20T16:00:00Z'
      },
      {
        id: 'template-002',
        name: 'Building Maintenance Inspection',
        description: 'Regular building maintenance and infrastructure check',
        version: '2.1',
        fields: [
          { name: 'hvac_system', type: 'boolean', label: 'HVAC system operational' },
          { name: 'plumbing', type: 'boolean', label: 'Plumbing systems functional' },
          { name: 'electrical', type: 'text', label: 'Electrical system status' },
          { name: 'structural', type: 'text', label: 'Structural integrity notes' }
        ],
        organization_id: '00000000-0000-0000-0000-000000000001',
        is_active: true,
        created_at: '2024-01-12T12:00:00Z',
        updated_at: '2024-01-18T14:00:00Z'
      },
      {
        id: 'template-003',
        name: 'Environmental Compliance Check',
        description: 'Environmental standards and compliance verification',
        version: '1.0',
        fields: [
          { name: 'waste_disposal', type: 'boolean', label: 'Waste disposal compliance' },
          { name: 'air_quality', type: 'number', label: 'Air quality measurements' },
          { name: 'water_systems', type: 'boolean', label: 'Water systems compliant' }
        ],
        organization_id: '00000000-0000-0000-0000-000000000001',
        is_active: true,
        created_at: '2024-01-14T11:00:00Z',
        updated_at: '2024-01-19T13:00:00Z'
      }
    ]

    console.log(`📋 Mock data loaded: ${sites.value.length} sites, ${templates.value.length} templates`)
  }

  return {
    // State
    sites,
    templates,
    assignments,
    selectedSites,
    selectedTemplates,
    workflowType,
    currentStep,
    isLoading,
    isCreatingAssignments,
    error,

    // Getters
    isAuthenticated,
    currentOrganizationId,
    selectedSitesData,
    selectedTemplatesData,
    pendingAssignments,
    completedAssignments,
    canCreateAssignments,
    estimatedAssignmentCount,

    // Actions
    fetchSites,
    fetchTemplates,
    fetchAssignments,
    createBulkAssignments,
    deleteAssignment,
    setWorkflowType,
    toggleSiteSelection,
    toggleTemplateSelection,
    selectAllSites,
    deselectAllSites,
    selectAllTemplates,
    deselectAllTemplates,
    proceedToNextStep,
    goBackToPreviousStep,
    resetWorkflow,
    resetSelections,
    clearError,
    initializeStore,
    loadMockData
  }
})