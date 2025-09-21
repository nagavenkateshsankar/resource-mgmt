<template>
  <div class="inspection-create-page">
    <div class="page-header">
      <router-link to="/sites" class="back-link">
        <ChevronLeftIcon class="icon-sm" />
        Back to Sites
      </router-link>
      <h1 class="page-title">Create New Inspection</h1>
      <p v-if="selectedSite" class="page-subtitle">
        For site: <strong>{{ selectedSite.name }}</strong> - Select a template to continue
      </p>
      <p v-else class="page-subtitle">Select a template and fill out the inspection form</p>
    </div>

    <div class="inspection-content">
      <!-- Template Selection -->
      <div class="template-selection">
        <h3 class="selection-title">Select Inspection Template</h3>

        <!-- Site Info (if available) -->
        <div v-if="selectedSite" class="site-info-card">
          <div class="site-info">
            <h4>{{ selectedSite.name }}</h4>
            <p>{{ selectedSite.address }}, {{ selectedSite.city }}, {{ selectedSite.state }}</p>
          </div>
        </div>

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
            <div class="template-meta">
              <span class="field-count">{{ template.sections?.length || 0 }} sections</span>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="empty-state">
          <p>No templates available. Please create templates first.</p>
          <router-link to="/templates" class="btn btn-primary">
            Go to Templates
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { apiUtils } from '@/utils/api'
import {
  ChevronLeftIcon,
  ClipboardDocumentCheckIcon
} from '@heroicons/vue/24/outline'

const router = useRouter()
const route = useRoute()
const appStore = useAppStore()

// State
const isLoading = ref(false)
const error = ref(null)
const availableTemplates = ref([])
const selectedSite = ref<any>(null)
const siteId = ref<string | null>(null)

// Get site_id from query params
onMounted(() => {
  siteId.value = route.query.site_id as string
  if (siteId.value) {
    fetchSiteDetails()
  }
  fetchTemplates()
})

// Fetch site details if site_id is provided
const fetchSiteDetails = async () => {
  if (!siteId.value) return

  try {
    const response = await apiUtils.get(`/sites/${siteId.value}`)
    selectedSite.value = response.site
  } catch (err) {
    console.warn('Could not fetch site details:', err)
    // Don't show error for site fetch - just proceed without site info
  }
}

// Fetch available templates
const fetchTemplates = async () => {
  try {
    isLoading.value = true
    error.value = null

    const response = await apiUtils.get('/templates')
    availableTemplates.value = response.templates || response || []
  } catch (err) {
    console.error('Error fetching templates:', err)
    error.value = 'Failed to load templates. Please try again.'
  } finally {
    isLoading.value = false
  }
}

// Select template and navigate to inspection form
const selectTemplate = (template: any) => {
  // Navigate to the working route with template and site
  const params = {
    templateId: template.id
  }

  const query: any = {}
  if (siteId.value) {
    query.site_id = siteId.value
  }

  router.push({
    name: 'inspection-new-template',
    params,
    query
  })
}
</script>

<style scoped>
.inspection-create-page {
  padding: 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 2rem;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
  margin-bottom: 1rem;
  font-size: 0.875rem;
  transition: color 0.2s;
}

.back-link:hover {
  color: hsl(var(--primary));
}

.page-title {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.page-subtitle {
  font-size: 1rem;
}

.site-info-card {
  background: hsl(var(--muted));
  border: 1px solid hsl(var(--border));
  border-radius: 0.5rem;
  padding: 1rem;
  margin-bottom: 2rem;
}

.site-info h4 {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.site-info p {
  font-size: 0.875rem;
}

.selection-title {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
}

.loading-state,
.error-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  text-align: center;
}

.loading-spinner {
  width: 2rem;
  height: 2rem;
  border: 2px solid hsl(var(--muted));
  border-top: 2px solid hsl(var(--primary));
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.templates-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.template-card {
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  border-radius: 0.75rem;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.2s;
}

.template-card:hover {
  border-color: hsl(var(--primary));
  box-shadow: var(--shadow);
  transform: translateY(-2px);
}

.template-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  background: hsl(var(--muted));
  border-radius: 0.5rem;
  color: hsl(var(--primary));
  margin-bottom: 1rem;
}

.template-name {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.template-description {
  font-size: 0.875rem;
  margin-bottom: 1rem;
  line-height: 1.4;
}

.template-category {
  display: inline-block;
  background: hsl(var(--muted));
  font-size: 0.75rem;
  font-weight: 500;
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  margin-bottom: 0.75rem;
}

.template-meta {
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 0.75rem;
  color: hsl(var(--muted-foreground));
}

.field-count {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 0.5rem;
  font-weight: 500;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
}

.btn-primary:hover {
  background: hsl(var(--primary));
  opacity: 0.9;
}

@media (max-width: 768px) {
  .inspection-create-page {
    padding: 1rem;
  }

  .templates-grid {
    grid-template-columns: 1fr;
  }
}
</style>