<template>
  <div class="inspection-form-page">
    <div class="page-header">
      <router-link to="/inspections" class="back-link">
        <ChevronLeftIcon class="icon-sm" />
        Back to Inspections
      </router-link>
      <h1 class="page-title">{{ templateName }}</h1>
      <p class="page-subtitle">Complete the inspection form below</p>
      <div v-if="siteDisplayName" class="site-info">
        <MapPinIcon class="icon-sm" />
        <span>{{ siteDisplayName }}</span>
      </div>
    </div>

    <div class="inspection-content">
      <div v-if="isLoading" class="loading-state">
        <LoadingSpinner size="lg" />
        <p>Loading inspection template...</p>
      </div>

      <div v-else-if="error" class="error-state">
        <ExclamationTriangleIcon class="icon-xl text-red-500" />
        <h3>Error Loading Template</h3>
        <p>{{ error }}</p>
        <button @click="loadTemplate" class="btn btn-primary">
          Try Again
        </button>
      </div>

      <DynamicForm
        v-else-if="templateSections.length > 0"
        :sections="templateSections"
        :initial-data="formData"
        :is-submitting="isSubmitting"
        @submit="handleSubmit"
        @cancel="handleCancel"
        @change="handleFormChange"
      />

      <div v-else class="empty-state">
        <DocumentTextIcon class="icon-lg text-gray-400" />
        <h3>No Template Found</h3>
        <p>The inspection template could not be loaded.</p>
        <router-link to="/inspections" class="btn btn-primary">
          Back to Inspections
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'
import { apiUtils } from '@/utils/api'
import DynamicForm from '@/components/forms/DynamicForm.vue'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
import {
  ChevronLeftIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  MapPinIcon
} from '@heroicons/vue/24/outline'

const router = useRouter()
const route = useRoute()
const appStore = useAppStore()
const authStore = useAuthStore()

// Get template ID from route params
const templateId = computed(() => route.params.templateId || route.params.id)

// State
const isLoading = ref(true)
const isSubmitting = ref(false)
const error = ref('')
const templateData = ref<any>(null)
const formData = ref<Record<string, any>>({})


// Computed
const templateName = computed(() => {
  return templateData.value?.name || 'Inspection Form'
})

const templateSections = computed(() => {
  return templateData.value?.fields_schema?.sections || []
})

const siteDisplayName = computed(() => {
  const siteName = route.query.site_name as string
  const siteLocation = route.query.site_location as string

  if (siteName && siteLocation) {
    return `${siteName} - ${siteLocation}`
  } else if (siteName) {
    return siteName
  } else if (siteLocation) {
    return siteLocation
  }
  return ''
})

// Methods
const loadTemplate = async () => {
  try {
    isLoading.value = true
    error.value = ''

    if (!templateId.value) {
      error.value = 'Template ID is required'
      return
    }

    // Fetch template data from API
    const response = await apiUtils.get(`/templates/${templateId.value}`)
    templateData.value = response.template

    // Initialize form with current user data and site data from URL
    formData.value = {
      inspector_name: authStore.user?.name || authStore.user?.email || '', // Get from auth store
      inspection_date: new Date().toISOString().split('T')[0],
      site_location: route.query.site_location as string || '',
      site_name: route.query.site_name as string || ''
    }

  } catch (err: any) {
    error.value = err.response?.data?.error || 'Failed to load inspection template'
    console.error('Error loading template:', err)
  } finally {
    isLoading.value = false
  }
}

const handleSubmit = async (data: Record<string, any>) => {
  try {
    isSubmitting.value = true

    // Prepare inspection data for API submission
    const inspectionPayload = {
      template_id: templateId.value as string,
      inspector_id: authStore.user?.id || '1101148598645817345', // fallback to admin for testing
      site_id: route.query.site_id as string || '',
      site_location: data.site_location || 'Default Site',
      site_name: data.site_name || '',
      status: 'draft',
      priority: data.priority || 'medium',
      notes: data.notes || data.safety_recommendations || '',
      inspection_data: data
    }

    // Submit inspection to API
    const response = await apiUtils.post('/inspections', inspectionPayload)

    console.log('Inspection created:', response)
    appStore.showSuccessMessage('Inspection saved successfully!')
    router.push('/inspections')

  } catch (err: any) {
    const errorMessage = err.response?.data?.error || 'Failed to save inspection'
    appStore.showErrorMessage(errorMessage)
    console.error('Error saving inspection:', err)
  } finally {
    isSubmitting.value = false
  }
}

const handleCancel = () => {
  router.push('/inspections')
}

const handleFormChange = (data: Record<string, any>) => {
  formData.value = { ...data }
}

// Initialize
onMounted(() => {
  loadTemplate()
})
</script>

<style scoped>
.inspection-form-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1.5rem;
  min-height: calc(100vh - 4rem);
}

.page-header {
  margin-bottom: 2rem;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--color-primary);
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 1rem;
  transition: var(--transition);
}

.back-link:hover {
  color: var(--color-primary-dark);
}

.page-title {
  font-size: 2rem;
  font-weight: 700;
  color: hsl(var(--foreground));
  margin: 0 0 0.5rem;
}

.page-subtitle {
  color: hsl(var(--muted-foreground));
  font-size: 1rem;
  margin: 0;
}

.inspection-content {
  background: hsl(var(--muted));
  border-radius: var(--border-radius-lg);
  padding: 2rem;
  min-height: 400px;
}

.loading-state,
.error-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 3rem 1rem;
  gap: 1rem;
}

.loading-state p {
  color: hsl(var(--muted-foreground));
  margin: 0;
}

.error-state h3,
.empty-state h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: hsl(var(--foreground));
  margin: 0;
}

.error-state p,
.empty-state p {
  color: hsl(var(--muted-foreground));
  margin: 0;
  max-width: 400px;
}

@media (max-width: 768px) {
  .inspection-form-page {
    padding: 1rem;
  }

  .page-title {
    font-size: 1.75rem;
  }

  .inspection-content {
    padding: 1.5rem;
  }

  .loading-state,
  .error-state,
  .empty-state {
    padding: 2rem 1rem;
  }
}
</style>