<template>
  <div class="inspection-create-page">
    <div class="page-header">
      <router-link to="/inspections" class="back-link">
        <ChevronLeftIcon class="icon-sm" />
        Back to Inspections
      </router-link>
      <h1 class="page-title">Create New Inspection</h1>
      <p class="page-subtitle">Select a template and fill out the inspection form</p>
    </div>

    <div class="inspection-content">
      <!-- Template Selection -->
      <div v-if="!selectedTemplate" class="template-selection">
        <h3 class="selection-title">Select Inspection Template</h3>

        <!-- Loading State -->
        <div v-if="isLoading" class="loading-state">
          <div class="loading-spinner"></div>
          <p>Loading templates...</p>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="error-state">
          <p>{{ error }}</p>
          <button @click="fetchTemplates" class="btn btn-primary">Try Again</button>
        </div>

        <!-- Templates Grid -->
        <div v-else-if="availableTemplates.length > 0" class="templates-grid">
          <div
            v-for="template in availableTemplates"
            :key="template.id"
            class="template-card"
            @click="selectTemplate(template)"
          >
            <div class="template-icon">
              <ClipboardDocumentCheckIcon class="icon-lg" />
            </div>
            <h4 class="template-name">{{ template.name }}</h4>
            <p class="template-description">{{ template.description }}</p>
            <div class="template-category">{{ template.category }}</div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="empty-state">
          <p>No templates available. Please create templates first.</p>
        </div>
      </div>

      <!-- Dynamic Form -->
      <div v-else class="form-container">
        <div class="selected-template">
          <button @click="changeTemplate" class="change-template-btn">
            <ArrowPathIcon class="icon-sm" />
            Change Template
          </button>
          <h3>{{ selectedTemplate.name }}</h3>
          <p>{{ selectedTemplate.description }}</p>
        </div>

        <DynamicForm
          :sections="templateSections"
          :initial-data="formData"
          :is-submitting="isSubmitting"
          @submit="handleSubmit"
          @cancel="handleCancel"
          @change="handleFormChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { apiUtils } from '@/utils/api'
import DynamicForm from '@/components/forms/DynamicForm.vue'
import {
  ChevronLeftIcon,
  ClipboardDocumentCheckIcon,
  ArrowPathIcon
} from '@heroicons/vue/24/outline'

const router = useRouter()
const appStore = useAppStore()

// State
const selectedTemplate = ref<any>(null)
const isSubmitting = ref(false)
const isLoading = ref(false)
const error = ref(null)
const formData = ref<Record<string, any>>({})

const availableTemplates = ref([])

// API Functions
const fetchTemplates = async () => {
  try {
    isLoading.value = true
    error.value = null

    const response = await apiUtils.get('/templates')

    // Transform API response to match frontend structure
    availableTemplates.value = response.templates.map(template => ({
      id: template.id,
      name: template.name,
      description: template.description,
      category: template.category,
      fields_schema: template.fields_schema
    }))
  } catch (err) {
    console.error('Failed to fetch templates:', err)
    error.value = 'Failed to load templates. Please try again later.'
  } finally {
    isLoading.value = false
  }
}

// Computed
const templateSections = computed(() => {
  return selectedTemplate.value?.fields_schema?.sections || []
})

// Methods
const selectTemplate = (template: any) => {
  // Redirect to site selection instead of loading form directly
  router.push(`/inspections/site-select/${template.id}`)
}

const changeTemplate = () => {
  selectedTemplate.value = null
  formData.value = {}
}

const handleSubmit = async (data: Record<string, any>) => {
  try {
    isSubmitting.value = true

    // Transform form data to match API structure
    const inspectionData = {
      template_id: selectedTemplate.value.id,
      site_name: data.site_name || 'Default Site',
      site_location: data.site_location || data.location || 'Unknown Location',
      inspector_id: 'auto', // Will be set by backend from auth token
      status: 'draft',
      due_date: data.due_date || null,
      inspection_data: data // Store all form data as inspection data
    }

    const response = await apiUtils.post('/inspections', inspectionData)

    appStore.showSuccessMessage('Inspection created successfully!')
    router.push(`/inspections/${response.id}`)

  } catch (err) {
    console.error('Failed to create inspection:', err)
    appStore.showErrorMessage('Failed to create inspection. Please try again.')
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

// Lifecycle
onMounted(() => {
  fetchTemplates()
})
</script>

<style scoped>
.inspection-create-page {
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

.template-selection {
  text-align: center;
}

.selection-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: hsl(var(--foreground));
  margin: 0 0 2rem;
}

.templates-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  max-width: 800px;
  margin: 0 auto;
}

.template-card {
  background: hsl(var(--background));
  border: 2px solid hsl(var(--border));
  border-radius: var(--border-radius-lg);
  padding: 2rem;
  cursor: pointer;
  transition: var(--transition);
  text-align: center;
}

.template-card:hover {
  border-color: hsl(var(--primary));
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.template-icon {
  color: hsl(var(--primary));
  margin-bottom: 1rem;
}

.template-name {
  font-size: 1.25rem;
  font-weight: 600;
  color: hsl(var(--foreground));
  margin: 0 0 0.5rem;
}

.template-description {
  color: hsl(var(--muted-foreground));
  margin: 0 0 1rem;
  font-size: 0.875rem;
}

.template-category {
  display: inline-block;
  background: hsl(var(--muted));
  color: hsl(var(--muted-foreground));
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
}

.form-container {
  max-width: 800px;
  margin: 0 auto;
}

.selected-template {
  background: hsl(var(--background));
  border-radius: var(--border-radius-lg);
  padding: 1.5rem;
  margin-bottom: 2rem;
  border: 1px solid hsl(var(--border));
  position: relative;
}

.change-template-btn {
  position: absolute;
  top: 1rem;
  right: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: none;
  border: 1px solid hsl(var(--border));
  color: hsl(var(--muted-foreground));
  padding: 0.5rem 1rem;
  border-radius: var(--border-radius);
  font-size: 0.875rem;
  cursor: pointer;
  transition: var(--transition);
}

.change-template-btn:hover {
  background: hsl(var(--muted));
  border-color: hsl(var(--border));
}

.selected-template h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: hsl(var(--foreground));
  margin: 0 0 0.5rem;
}

.selected-template p {
  color: hsl(var(--muted-foreground));
  margin: 0;
  font-size: 0.875rem;
}

/* Loading and Error States */
.loading-state,
.error-state,
.empty-state {
  text-align: center;
  padding: 3rem 2rem;
  color: hsl(var(--muted-foreground));
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

.error-state p,
.empty-state p {
  margin-bottom: 1rem;
  font-size: 0.875rem;
}

@media (max-width: 768px) {
  .inspection-create-page {
    padding: 1rem;
  }

  .page-title {
    font-size: 1.75rem;
  }

  .inspection-content {
    padding: 1.5rem;
  }

  .templates-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .template-card {
    padding: 1.5rem;
  }

  .change-template-btn {
    position: static;
    width: 100%;
    justify-content: center;
    margin-bottom: 1rem;
  }

  .selected-template {
    padding: 1.25rem;
  }
}
</style>