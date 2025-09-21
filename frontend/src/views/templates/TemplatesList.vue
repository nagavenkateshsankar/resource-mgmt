<template>
  <div class="templates-page" :class="themeClasses.bg.primary">
    <div class="page-header">
      <h1 class="page-title" :class="themeClasses.text.primary">Templates</h1>
      <router-link
        v-if="canCreateTemplates"
        to="/templates/new"
        class="btn btn-primary"
      >
        <PlusIcon class="icon-sm" />
        New Template
      </router-link>
    </div>

    <!-- Search and Filters -->
    <div class="filters-section">
      <div class="filter-group">
        <label for="category-filter" class="filter-label">Category</label>
        <select id="category-filter" v-model="selectedCategory" class="filter-select">
          <option value="">All Categories</option>
          <option value="Safety">Safety</option>
          <option value="Equipment">Equipment</option>
          <option value="Compliance">Compliance</option>
          <option value="Maintenance">Maintenance</option>
          <option value="Environmental">Environmental</option>
        </select>
      </div>
      <div class="filter-group">
        <label for="search" class="filter-label">Search</label>
        <input
          id="search"
          type="text"
          v-model="searchTerm"
          placeholder="Search templates..."
          class="filter-input"
        />
      </div>
    </div>

    <div class="templates-content">
      <!-- Loading State -->
      <div v-if="isLoading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>Loading templates...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="error-state">
        <DocumentTextIcon class="icon-xl" />
        <h3 :class="themeClasses.text.primary">Error Loading Templates</h3>
        <p :class="themeClasses.text.secondary">{{ error }}</p>
        <button @click="fetchTemplates" class="btn btn-primary">
          Try Again
        </button>
      </div>

      <!-- Templates Grid -->
      <div v-else-if="filteredTemplates.length > 0" class="templates-grid">
        <div
          v-for="template in filteredTemplates"
          :key="template.id"
          class="template-card"
        >
          <div class="template-header">
            <div class="template-icon">
              <component :is="getCategoryIcon(template.category)" class="icon-md" />
            </div>
            <div class="template-actions">
              <button class="template-menu-btn" title="More actions">
                <EllipsisVerticalIcon class="icon-sm" />
              </button>
            </div>
          </div>

          <div class="template-body">
            <h3 class="template-title" :class="themeClasses.text.primary">{{ template.name }}</h3>
            <p class="template-description" :class="themeClasses.text.secondary">{{ template.description }}</p>

            <div class="template-meta">
              <div class="meta-item">
                <TagIcon class="icon-sm" />
                <span class="category-badge" :class="`category-${template.category}`">
                  {{ template.category.charAt(0).toUpperCase() + template.category.slice(1) }}
                </span>
              </div>
              <div class="meta-item">
                <ClipboardDocumentCheckIcon class="icon-sm" />
                <span>{{ template.questions }} questions</span>
              </div>
              <div class="meta-item">
                <ClockIcon class="icon-sm" />
                <span>~{{ template.estimatedTime }} min</span>
              </div>
            </div>

            <div class="template-stats">
              <div class="stat">
                <span class="stat-number">{{ template.usageCount }}</span>
                <span class="stat-label">times used</span>
              </div>
              <div class="stat">
                <span class="stat-number">{{ formatDate(template.lastUsed) }}</span>
                <span class="stat-label">last used</span>
              </div>
            </div>
          </div>

          <div class="template-footer">
            <router-link
              :to="`/templates/${template.id}/preview`"
              class="btn btn-secondary btn-sm"
            >
              <EyeIcon class="icon-sm" />
              Preview
            </router-link>
            <router-link
              :to="`/inspections/site-select/${template.id}`"
              class="btn btn-primary btn-sm"
            >
              <PlayIcon class="icon-sm" />
              Use Template
            </router-link>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="empty-state">
        <DocumentTextIcon class="icon-xl" />
        <h3 :class="themeClasses.text.primary">No Templates Found</h3>
        <p :class="themeClasses.text.secondary">{{ searchTerm || selectedCategory ? 'No templates match your filters.' : 'No inspection templates available yet.' }}</p>
        <router-link to="/templates/new" class="btn btn-primary">
          <PlusIcon class="icon-sm" />
          Create First Template
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useTheme } from '@/composables/useTheme'
import { apiUtils } from '@/utils/api'
import {
  PlusIcon,
  DocumentTextIcon,
  EyeIcon,
  PlayIcon,
  TagIcon,
  ClipboardDocumentCheckIcon,
  ClockIcon,
  EllipsisVerticalIcon,
  WrenchScrewdriverIcon,
  BoltIcon,
  HomeIcon,
  ShieldCheckIcon,
  BeakerIcon
} from '@heroicons/vue/24/outline'

const authStore = useAuthStore()
const { themeClasses } = useTheme()
const canCreateTemplates = computed(() => {
  const userRole = authStore.user?.role
  return userRole === 'admin' || userRole === 'supervisor' || authStore.hasPermission('can_create_templates')
})

// State
const templates = ref([])
const isLoading = ref(false)
const error = ref(null)

// Filters
const selectedCategory = ref('')
const searchTerm = ref('')

// Computed
const filteredTemplates = computed(() => {
  let filtered = templates.value

  if (selectedCategory.value) {
    filtered = filtered.filter(template =>
      template.category === selectedCategory.value
    )
  }

  if (searchTerm.value) {
    const search = searchTerm.value.toLowerCase()
    filtered = filtered.filter(template =>
      template.name.toLowerCase().includes(search) ||
      template.description.toLowerCase().includes(search) ||
      template.category.toLowerCase().includes(search)
    )
  }

  return filtered
})

// Methods
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - date.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays === 1) return 'yesterday'
  if (diffDays <= 7) return `${diffDays} days ago`
  if (diffDays <= 30) return `${Math.ceil(diffDays / 7)} weeks ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const getCategoryIcon = (category: string) => {
  const icons = {
    safety: ShieldCheckIcon,
    electrical: BoltIcon,
    plumbing: WrenchScrewdriverIcon,
    structural: HomeIcon,
    environmental: BeakerIcon
  }
  return icons[category as keyof typeof icons] || DocumentTextIcon
}

// API Functions
const fetchTemplates = async () => {
  try {
    isLoading.value = true
    error.value = null

    const response = await apiUtils.get('/templates')

    // Transform API response to match frontend structure
    templates.value = response.templates.map(template => ({
      id: template.id,
      name: template.name,
      description: template.description,
      category: template.category.toLowerCase(),
      questions: countQuestions(template.fields_schema),
      estimatedTime: estimateTime(template.fields_schema),
      usageCount: 0, // TODO: Add usage tracking to backend
      lastUsed: formatApiDate(template.updated_at)
    }))
  } catch (err) {
    console.error('Failed to fetch templates:', err)
    error.value = 'Failed to load templates. Please try again later.'
  } finally {
    isLoading.value = false
  }
}

// Helper functions
const countQuestions = (fieldsSchema) => {
  if (!fieldsSchema || !fieldsSchema.sections) return 0
  return fieldsSchema.sections.reduce((total, section) => {
    return total + (section.fields ? section.fields.length : 0)
  }, 0)
}

const estimateTime = (fieldsSchema) => {
  const questionCount = countQuestions(fieldsSchema)
  // Rough estimate: 1-2 minutes per question
  return Math.max(15, Math.round(questionCount * 1.5))
}

const formatApiDate = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - date.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays === 1) return 'yesterday'
  if (diffDays <= 7) return `${diffDays} days ago`
  if (diffDays <= 30) return `${Math.ceil(diffDays / 7)} weeks ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Lifecycle
onMounted(() => {
  fetchTemplates()
})
</script>

<style scoped>
.templates-page {
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
.templates-content {
  background: transparent;
}

/* Templates Grid */
.templates-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
}

.template-card {
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  border-radius: 0.75rem;
  padding: 1.5rem;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.template-card:hover {
  border-color: hsl(var(--primary));
  box-shadow: var(--shadow);
  transform: translateY(-2px);
}

.template-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.template-icon {
  padding: 0.75rem;
  border-radius: 0.5rem;
  background: hsl(var(--muted));
  color: hsl(var(--muted-foreground));
}

.template-menu-btn {
  background: none;
  border: none;
  color: hsl(var(--muted-foreground));
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 0.25rem;
  transition: all 0.2s;
}

.template-menu-btn:hover {
  color: hsl(var(--foreground));
  background: hsl(var(--muted));
}

.template-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.template-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0;
}

.template-description {
  font-size: 0.875rem;
  line-height: 1.5;
  margin: 0;
  flex: 1;
}

.template-meta {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: hsl(var(--muted-foreground));
  font-size: 0.75rem;
}

.category-badge {
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.625rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.category-safety {
  background: hsl(var(--success) / 0.1);
  color: hsl(var(--success));
}

.category-electrical {
  background: hsl(var(--warning) / 0.1);
  color: hsl(var(--warning));
}

.category-plumbing {
  background: hsl(var(--primary) / 0.1);
  color: hsl(var(--primary));
}

.category-structural {
  background: hsl(var(--secondary) / 0.1);
  color: hsl(var(--secondary));
}

.category-environmental {
  background: hsl(var(--success) / 0.1);
  color: hsl(var(--success));
}

.template-stats {
  display: flex;
  justify-content: space-between;
  padding: 0.75rem 0;
  border-top: 1px solid hsl(var(--border));
  margin-top: 0.5rem;
}

.stat {
  text-align: center;
  flex: 1;
}

.stat-number {
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
}

.stat-label {
  font-size: 0.625rem;
  color: hsl(var(--muted-foreground));
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.template-footer {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid hsl(var(--border));
}

.template-footer .btn {
  flex: 1;
  justify-content: center;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  color: hsl(var(--muted-foreground));
}

.empty-state h3 {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 1rem 0 0.5rem;
}

.empty-state p {
  margin-bottom: 2rem;
  font-size: 0.875rem;
  max-width: 24rem;
  margin-left: auto;
  margin-right: auto;
}

/* Responsive */
@media (max-width: 768px) {
  .templates-page {
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

  .templates-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .template-stats {
    flex-direction: column;
    gap: 0.5rem;
    text-align: left;
  }

  .template-footer {
    flex-direction: column;
  }

  .empty-state {
    padding: 2rem 1rem;
  }
}

@media (max-width: 480px) {
  .template-card {
    padding: 1rem;
  }

  .template-header {
    margin-bottom: 0.75rem;
  }

  .template-body {
    gap: 0.75rem;
  }
}

/* Loading and Error States */
.loading-state,
.error-state {
  text-align: center;
  padding: 4rem 2rem;
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

.error-state h3 {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 1rem 0 0.5rem;
}

.error-state p {
  margin-bottom: 2rem;
  font-size: 0.875rem;
  max-width: 24rem;
  margin-left: auto;
  margin-right: auto;
}
</style>