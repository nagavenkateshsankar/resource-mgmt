<template>
  <div class="inspection-site-select-page">
    <div class="page-header">
      <router-link :to="backLink" class="back-link">
        <ChevronLeftIcon class="icon-sm" />
        {{ backLinkText }}
      </router-link>
      <h1 class="page-title">Create New Inspection</h1>
      <p class="page-subtitle">Follow the steps below to create your inspection</p>
    </div>

    <div class="site-select-content">
      <div v-if="isLoading" class="loading-state">
        <LoadingSpinner size="lg" />
        <p>Loading template information...</p>
      </div>

      <div v-else-if="error" class="error-state">
        <ExclamationTriangleIcon class="icon-xl text-red-500" />
        <h3>Error Loading Template</h3>
        <p>{{ error }}</p>
        <router-link to="/templates" class="btn btn-primary">
          Back to Templates
        </router-link>
      </div>

      <div v-else-if="templateData" class="inspection-wizard">
        <!-- Step 1: Template Selected -->
        <div class="wizard-step">
          <div class="step-header completed">
            <div class="step-indicator">
              <CheckIcon class="step-icon" />
            </div>
            <div class="step-info">
              <h3 class="step-title">Template Selected</h3>
            </div>
          </div>

          <!-- Template Preview Card -->
          <div class="template-preview-card">
            <div class="template-header">
              <div class="template-icon">
                <component :is="getCategoryIcon(templateData.category)" class="icon-lg" />
              </div>
              <div class="template-info">
                <h4 class="template-name">{{ templateData.name }}</h4>
                <p class="template-description">{{ templateData.description }}</p>
                <div class="template-meta">
                  <span class="category-badge" :class="`category-${templateData.category.toLowerCase()}`">
                    {{ templateData.category }}
                  </span>
                  <span class="sections-count">{{ sectionsCount }} sections</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Step Connector -->
          <div class="step-connector completed"></div>
        </div>

        <!-- Step 2: Site Selection -->
        <div class="wizard-step">
          <div class="step-header active">
            <div class="step-indicator">
              <div class="step-dot"></div>
            </div>
            <div class="step-info">
              <h3 class="step-title">Select Site Location</h3>
              <p class="step-description">Choose where this inspection will be conducted</p>
            </div>
          </div>

          <!-- Site Selection Form -->
          <div class="site-selection-section">
            <SiteSelectionForm
              :template-id="templateId"
              @submit="handleSiteSubmit"
              @cancel="handleCancel"
            />
          </div>

          <!-- Step Connector (continuation) -->
          <div class="step-connector-continuation"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { apiUtils } from '@/utils/api'
import SiteSelectionForm from '@/components/forms/SiteSelectionForm.vue'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
import {
  ChevronLeftIcon,
  ExclamationTriangleIcon,
  BuildingOfficeIcon,
  CogIcon,
  ShieldCheckIcon,
  WrenchScrewdriverIcon,
  CheckIcon
} from '@heroicons/vue/24/outline'

const router = useRouter()
const route = useRoute()

// State
const isLoading = ref(true)
const error = ref('')
const templateData = ref<any>(null)

// Computed
const templateId = computed(() => route.params.templateId as string)

const sectionsCount = computed(() => {
  return templateData.value?.fields_schema?.sections?.length || 0
})

const backLink = computed(() => {
  // Check if user came from templates page or inspections page
  const referrer = document.referrer
  if (referrer.includes('/templates')) {
    return '/templates'
  }
  return '/inspections/new'
})

const backLinkText = computed(() => {
  return backLink.value === '/templates' ? 'Back to Templates' : 'Back to Template Selection'
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

    const response = await apiUtils.get(`/templates/${templateId.value}`)
    templateData.value = response.template

  } catch (err: any) {
    error.value = err.response?.data?.error || 'Failed to load template'
    console.error('Error loading template:', err)
  } finally {
    isLoading.value = false
  }
}

const handleSiteSubmit = (siteData: any) => {
  // Navigate to inspection form with site data
  router.push({
    name: 'inspection-new-template',
    params: { templateId: templateId.value },
    query: {
      site_id: siteData.site_id
    }
  })
}

const handleCancel = () => {
  router.push(backLink.value)
}

const getCategoryIcon = (category: string) => {
  const iconMap: Record<string, any> = {
    Safety: ShieldCheckIcon,
    Equipment: CogIcon,
    Compliance: ShieldCheckIcon,
    Maintenance: WrenchScrewdriverIcon,
    Environmental: BuildingOfficeIcon
  }
  return iconMap[category] || BuildingOfficeIcon
}

// Lifecycle
onMounted(() => {
  loadTemplate()
})
</script>

<style scoped>
.inspection-site-select-page {
  min-height: 100vh;
  background: hsl(var(--background));
}

.page-header {
  background: hsl(var(--background));
  border-bottom: 1px solid hsl(var(--border));
  padding: 2rem 0;
  margin-bottom: 2rem;
}

.page-header > * {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1.5rem;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
  font-size: 0.875rem;
  margin-bottom: 1rem;
  transition: color 0.15s;
}

.back-link:hover {
}

.page-title {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.page-subtitle {
  font-size: 1rem;
}

.site-select-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1.5rem;
}

.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
}

.loading-state p,
.error-state p {
  margin: 1rem 0;
}

.error-state h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: hsl(var(--destructive));
  margin: 1rem 0;
}

.inspection-wizard {
  max-width: 800px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.wizard-step {
  position: relative;
}

.wizard-step:not(:last-child) {
  margin-bottom: 0;
}

.step-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
  position: relative;
  z-index: 2;
}

.step-indicator {
  flex-shrink: 0;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 3;
}

.step-header.completed .step-indicator {
  background: hsl(var(--success));
  color: hsl(var(--success-foreground));
}

.step-header.active .step-indicator {
  background: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
}

.step-icon {
  width: 1rem;
  height: 1rem;
}

.step-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: currentColor;
}

.step-info {
  flex: 1;
}

.step-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.step-header.completed .step-title {
  color: hsl(var(--success));
}

.step-header.active .step-title {
  color: hsl(var(--primary));
}

.step-description {
  font-size: 0.875rem;
  color: hsl(var(--muted-foreground));
}

.step-connector {
  position: absolute;
  top: 1.5rem;
  left: 0.625rem;
  width: 2px;
  height: calc(100% + 1.5rem);
  z-index: 1;
}

.step-connector.completed {
  background: hsl(var(--success));
}

.step-connector-continuation {
  position: absolute;
  top: 1.5rem;
  left: 0.625rem;
  width: 2px;
  height: 1.5rem;
  background: hsl(var(--border));
  z-index: 1;
}

.template-preview-card {
  background: hsl(var(--card));
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid hsl(var(--border));
  margin-left: 2.5rem;
}

.site-selection-section {
  margin-left: 2.5rem;
}

.template-header {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}

.template-icon {
  flex-shrink: 0;
  padding: 1rem;
  background: hsl(var(--muted));
  border-radius: 12px;
}

.template-info {
  flex: 1;
}

.template-name {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.template-description {
  font-size: 0.875rem;
  line-height: 1.5;
  margin-bottom: 1rem;
}

.template-meta {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.category-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.category-safety { background: hsl(var(--warning) / 0.1); color: hsl(var(--warning)); }
.category-equipment { background: hsl(var(--primary) / 0.1); color: hsl(var(--primary)); }
.category-compliance { background: hsl(var(--success) / 0.1); color: hsl(var(--success)); }
.category-maintenance { background: hsl(var(--destructive) / 0.1); color: hsl(var(--destructive)); }
.category-environmental { background: hsl(var(--primary) / 0.1); color: hsl(var(--primary)); }

.sections-count {
  font-size: 0.875rem;
}

.icon-sm {
  width: 1rem;
  height: 1rem;
}

.icon-lg {
  width: 2rem;
  height: 2rem;
}

.icon-xl {
  width: 4rem;
  height: 4rem;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  font-weight: 500;
  text-decoration: none;
  transition: all 0.15s;
  cursor: pointer;
  border: none;
  font-size: 0.875rem;
}

.btn-primary {
  background: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
}

.btn-primary:hover {
  background: hsl(var(--primary));
  opacity: 0.9;
}
</style>