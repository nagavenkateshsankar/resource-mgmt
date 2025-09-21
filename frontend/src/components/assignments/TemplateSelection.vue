<template>
  <div class="template-selection">
    <!-- Search and Filters -->
    <div class="selection-filters">
      <div class="filter-row">
        <div class="search-group">
          <MagnifyingGlassIcon class="search-icon" />
          <input
            v-model="searchTerm"
            type="text"
            placeholder="Search templates by name or description..."
            class="search-input"
          />
        </div>
        <div class="filter-group">
          <select v-model="statusFilter" class="filter-select">
            <option value="">All Templates</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
        <div class="filter-group" v-if="multiple">
          <select v-model="sortBy" class="sort-select">
            <option value="name">Sort by Name</option>
            <option value="version">Sort by Version</option>
            <option value="created_at">Sort by Date Created</option>
            <option value="updated_at">Sort by Last Updated</option>
          </select>
        </div>
      </div>

      <!-- Selection Controls (for multiple selection) -->
      <div v-if="multiple" class="selection-controls">
        <div class="selection-summary">
          <span class="selection-count">
            {{ selectedTemplates.length }} of {{ filteredTemplates.length }} templates selected
          </span>
        </div>
        <div class="selection-actions">
          <button
            @click="selectAllFiltered"
            :disabled="allFilteredSelected"
            class="btn btn-sm btn-secondary"
          >
            <CheckIcon class="icon-sm" />
            Select All
          </button>
          <button
            @click="deselectAll"
            :disabled="selectedTemplates.length === 0"
            class="btn btn-sm btn-secondary"
          >
            <XMarkIcon class="icon-sm" />
            Clear All
          </button>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="loading-state">
      <div class="loading-spinner"></div>
      <p>Loading templates...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      <ExclamationTriangleIcon class="icon-xl" />
      <h3>Error Loading Templates</h3>
      <p>{{ error }}</p>
      <button @click="fetchTemplates" class="btn btn-primary">
        Try Again
      </button>
    </div>

    <!-- Templates List -->
    <div v-else-if="filteredTemplates.length > 0" class="templates-list">
      <div
        v-for="template in paginatedTemplates"
        :key="template.id"
        class="template-card"
        :class="{
          'selected': isSelected(template.id),
          'selectable': multiple,
          'single-select': !multiple,
          'inactive': !template.is_active
        }"
        @click="handleTemplateClick(template.id)"
      >
        <!-- Selection Checkbox (for multiple selection) -->
        <div v-if="multiple" class="template-checkbox">
          <input
            type="checkbox"
            :id="`template-${template.id}`"
            :checked="isSelected(template.id)"
            @change="toggleSelection(template.id)"
            @click.stop
            class="checkbox-input"
            :disabled="!template.is_active"
          />
          <label :for="`template-${template.id}`" class="checkbox-label"></label>
        </div>

        <!-- Radio Button (for single selection) -->
        <div v-else class="template-radio">
          <input
            type="radio"
            :id="`template-${template.id}`"
            :value="template.id"
            :checked="isSelected(template.id)"
            @change="selectSingle(template.id)"
            name="template-selection"
            class="radio-input"
            :disabled="!template.is_active"
          />
          <label :for="`template-${template.id}`" class="radio-label"></label>
        </div>

        <!-- Template Info -->
        <div class="template-info">
          <div class="template-header">
            <div class="template-title-section">
              <h3 class="template-name">{{ template.name }}</h3>
              <div class="template-badges">
                <span class="version-badge">v{{ template.version }}</span>
                <span
                  class="status-badge"
                  :class="template.is_active ? 'status-active' : 'status-inactive'"
                >
                  {{ template.is_active ? 'Active' : 'Inactive' }}
                </span>
              </div>
            </div>
            <div class="template-meta">
              <span class="template-id">#{{ template.id.slice(-8) }}</span>
            </div>
          </div>

          <div class="template-description" v-if="template.description">
            <p>{{ template.description }}</p>
          </div>

          <div class="template-details">
            <div class="template-stats">
              <div class="stat-item">
                <DocumentTextIcon class="icon-sm" />
                <span>{{ template.fields?.length || 0 }} fields</span>
              </div>
              <div class="stat-item">
                <CalendarIcon class="icon-sm" />
                <span>Created {{ formatDate(template.created_at) }}</span>
              </div>
              <div class="stat-item" v-if="template.updated_at !== template.created_at">
                <ClockIcon class="icon-sm" />
                <span>Updated {{ formatDate(template.updated_at) }}</span>
              </div>
            </div>

            <!-- Template Fields Preview -->
            <div v-if="template.fields && template.fields.length > 0" class="template-fields">
              <div class="fields-header">
                <span class="fields-label">Field Types:</span>
              </div>
              <div class="fields-preview">
                <span
                  v-for="fieldType in getUniqueFieldTypes(template.fields)"
                  :key="fieldType"
                  class="field-type-badge"
                  :class="`field-${fieldType.toLowerCase()}`"
                >
                  {{ fieldType }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Selected Indicator -->
        <div v-if="isSelected(template.id)" class="selected-indicator">
          <CheckCircleIcon class="icon-lg text-primary" />
        </div>

        <!-- Inactive Overlay -->
        <div v-if="!template.is_active" class="inactive-overlay">
          <ExclamationTriangleIcon class="icon-sm" />
          <span>Inactive</span>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="pagination">
        <button
          @click="currentPage = Math.max(1, currentPage - 1)"
          :disabled="currentPage === 1"
          class="pagination-btn"
        >
          <ChevronLeftIcon class="icon-sm" />
          Previous
        </button>

        <div class="pagination-info">
          Page {{ currentPage }} of {{ totalPages }}
          ({{ filteredTemplates.length }} templates)
        </div>

        <button
          @click="currentPage = Math.min(totalPages, currentPage + 1)"
          :disabled="currentPage === totalPages"
          class="pagination-btn"
        >
          Next
          <ChevronRightIcon class="icon-sm" />
        </button>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="empty-state">
      <DocumentTextIcon class="icon-xl" />
      <h3>No Templates Found</h3>
      <p>{{ searchTerm || statusFilter ? 'No templates match your search criteria.' : 'No templates are available for assignment.' }}</p>
      <router-link to="/templates/new" class="btn btn-primary">
        <PlusIcon class="icon-sm" />
        Create First Template
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useAssignmentStore } from '@/stores/assignment'
import { storeToRefs } from 'pinia'
import {
  MagnifyingGlassIcon,
  CheckIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  CalendarIcon,
  ClockIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon
} from '@heroicons/vue/24/outline'

// Props
interface Props {
  multiple?: boolean
  selectedTemplates: string[]
}

const props = withDefaults(defineProps<Props>(), {
  multiple: true
})

// Emits
const emit = defineEmits<{
  'update:selected-templates': [templates: string[]]
}>()

// Store
const assignmentStore = useAssignmentStore()
const { templates, isLoading, error } = storeToRefs(assignmentStore)

// Local state
const searchTerm = ref('')
const statusFilter = ref('')
const sortBy = ref('name')
const currentPage = ref(1)
const itemsPerPage = 8

// Computed properties
const filteredTemplates = computed(() => {
  let filtered = [...templates.value]

  // Apply search filter
  if (searchTerm.value) {
    const search = searchTerm.value.toLowerCase()
    filtered = filtered.filter(template =>
      template.name.toLowerCase().includes(search) ||
      (template.description && template.description.toLowerCase().includes(search))
    )
  }

  // Apply status filter
  if (statusFilter.value) {
    if (statusFilter.value === 'active') {
      filtered = filtered.filter(template => template.is_active)
    } else if (statusFilter.value === 'inactive') {
      filtered = filtered.filter(template => !template.is_active)
    }
  }

  // Apply sorting
  filtered.sort((a, b) => {
    switch (sortBy.value) {
      case 'name':
        return a.name.localeCompare(b.name)
      case 'version':
        return a.version.localeCompare(b.version)
      case 'created_at':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      case 'updated_at':
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      default:
        return 0
    }
  })

  return filtered
})

const paginatedTemplates = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return filteredTemplates.value.slice(start, end)
})

const totalPages = computed(() => {
  return Math.ceil(filteredTemplates.value.length / itemsPerPage)
})

const allFilteredSelected = computed(() => {
  if (!props.multiple || filteredTemplates.value.length === 0) return false
  const activeTemplates = filteredTemplates.value.filter(t => t.is_active)
  return activeTemplates.every(template => props.selectedTemplates.includes(template.id))
})

// Selection methods
const isSelected = (templateId: string): boolean => {
  return props.selectedTemplates.includes(templateId)
}

const toggleSelection = (templateId: string) => {
  if (!props.multiple) return

  const template = templates.value.find(t => t.id === templateId)
  if (!template?.is_active) return

  const newSelection = [...props.selectedTemplates]
  const index = newSelection.indexOf(templateId)

  if (index > -1) {
    newSelection.splice(index, 1)
  } else {
    newSelection.push(templateId)
  }

  emit('update:selected-templates', newSelection)
}

const selectSingle = (templateId: string) => {
  if (props.multiple) return

  const template = templates.value.find(t => t.id === templateId)
  if (!template?.is_active) return

  emit('update:selected-templates', [templateId])
}

const handleTemplateClick = (templateId: string) => {
  const template = templates.value.find(t => t.id === templateId)
  if (!template?.is_active) return

  if (props.multiple) {
    toggleSelection(templateId)
  } else {
    selectSingle(templateId)
  }
}

const selectAllFiltered = () => {
  if (!props.multiple) return

  const activeFilteredIds = filteredTemplates.value
    .filter(template => template.is_active)
    .map(template => template.id)

  const newSelection = [...new Set([...props.selectedTemplates, ...activeFilteredIds])]
  emit('update:selected-templates', newSelection)
}

const deselectAll = () => {
  emit('update:selected-templates', [])
}

// Helper functions
const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const getUniqueFieldTypes = (fields: any[]): string[] => {
  if (!fields || !Array.isArray(fields)) return []

  const types = fields.map(field => field.type || field.field_type || 'Unknown')
  return [...new Set(types)].slice(0, 5) // Limit to 5 types for display
}

const fetchTemplates = async () => {
  await assignmentStore.fetchTemplates()
}

// Watch for search changes to reset pagination
watch([searchTerm, statusFilter], () => {
  currentPage.value = 1
})

// Initialize
onMounted(async () => {
  if (templates.value.length === 0) {
    await fetchTemplates()
  }
})
</script>

<style scoped>
.template-selection {
  max-width: 100%;
}

/* Filters */
.selection-filters {
  background: hsl(var(--muted));
  border-radius: 0.75rem;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  border: 1px solid hsl(var(--border));
}

.filter-row {
  display: flex;
  gap: 1rem;
  align-items: center;
  margin-bottom: 1rem;
}

.search-group {
  position: relative;
  flex: 2;
}

.search-icon {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  width: 1.25rem;
  height: 1.25rem;
  color: hsl(var(--muted-foreground));
}

.search-input {
  width: 100%;
  padding: 0.75rem 0.75rem 0.75rem 2.5rem;
  border: 1px solid hsl(var(--border));
  border-radius: 0.5rem;
  font-size: 0.875rem;
  background: hsl(var(--background));
  color: hsl(var(--foreground));
}

.search-input:focus {
  outline: none;
  ring: 2px;
  ring-color: hsl(var(--primary));
  border-color: hsl(var(--primary));
}

.filter-group {
  flex-shrink: 0;
}

.filter-select,
.sort-select {
  padding: 0.75rem;
  border: 1px solid hsl(var(--border));
  border-radius: 0.5rem;
  font-size: 0.875rem;
  background: hsl(var(--background));
  color: hsl(var(--foreground));
  min-width: 150px;
}

.selection-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 1rem;
  border-top: 1px solid hsl(var(--border));
}

.selection-summary {
  font-size: 0.875rem;
  color: hsl(var(--muted-foreground));
  font-weight: 500;
}

.selection-actions {
  display: flex;
  gap: 0.5rem;
}

/* Templates List */
.templates-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
}

.template-card {
  display: flex;
  flex-direction: column;
  padding: 1.5rem;
  border: 2px solid hsl(var(--border));
  border-radius: 0.75rem;
  background: hsl(var(--background));
  transition: all 0.2s;
  position: relative;
  min-height: 200px;
}

.template-card.selectable {
  cursor: pointer;
}

.template-card.single-select {
  cursor: pointer;
}

.template-card:hover:not(.inactive) {
  border-color: hsl(var(--primary));
  box-shadow: var(--shadow);
}

.template-card.selected {
  border-color: hsl(var(--primary));
  background: hsl(var(--primary) / 0.1);
}

.template-card.inactive {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Selection Controls */
.template-checkbox,
.template-radio {
  position: absolute;
  top: 1rem;
  left: 1rem;
  z-index: 2;
}

.checkbox-input,
.radio-input {
  width: 1.25rem;
  height: 1.25rem;
  accent-color: hsl(var(--primary));
}

.checkbox-input:disabled,
.radio-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.checkbox-label,
.radio-label {
  cursor: pointer;
}

/* Template Info */
.template-info {
  flex: 1;
  margin-left: 2.5rem;
  margin-top: 0.5rem;
}

.template-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.75rem;
}

.template-title-section {
  flex: 1;
}

.template-name {
  font-size: 1.125rem;
  font-weight: 600;
  color: hsl(var(--foreground));
  margin: 0 0 0.5rem 0;
  line-height: 1.4;
}

.template-badges {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.version-badge {
  font-size: 0.75rem;
  color: hsl(var(--muted-foreground));
  background: hsl(var(--muted));
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-weight: 500;
}

.status-badge {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.status-active {
  background: hsl(var(--success) / 0.1);
  color: hsl(var(--success));
}

.status-inactive {
  background: hsl(var(--destructive) / 0.1);
  color: hsl(var(--destructive));
}

.template-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.template-id {
  font-size: 0.75rem;
  color: hsl(var(--muted-foreground));
  background: hsl(var(--muted));
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-family: monospace;
}

.template-description {
  margin-bottom: 1rem;
}

.template-description p {
  color: hsl(var(--muted-foreground));
  font-size: 0.875rem;
  line-height: 1.5;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.template-details {
  margin-top: auto;
}

.template-stats {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  color: hsl(var(--muted-foreground));
  font-size: 0.75rem;
}

.template-fields {
  border-top: 1px solid hsl(var(--border));
  padding-top: 0.75rem;
}

.fields-header {
  margin-bottom: 0.5rem;
}

.fields-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: hsl(var(--muted-foreground));
}

.fields-preview {
  display: flex;
  gap: 0.25rem;
  flex-wrap: wrap;
}

.field-type-badge {
  font-size: 0.625rem;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.field-text {
  background: hsl(var(--primary) / 0.1);
  color: hsl(var(--primary));
}

.field-number {
  background: hsl(var(--success) / 0.1);
  color: hsl(var(--success));
}

.field-select {
  background: hsl(var(--warning) / 0.1);
  color: hsl(var(--warning));
}

.field-checkbox {
  background: hsl(var(--secondary) / 0.1);
  color: hsl(var(--secondary));
}

.field-date {
  background: hsl(var(--accent) / 0.1);
  color: hsl(var(--accent));
}

.field-file {
  background: hsl(var(--info) / 0.1);
  color: hsl(var(--info));
}

/* Selected Indicator */
.selected-indicator {
  position: absolute;
  top: 1rem;
  right: 1rem;
}

/* Inactive Overlay */
.inactive-overlay {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  background: hsl(var(--destructive) / 0.1);
  color: hsl(var(--destructive));
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;
}

/* Pagination */
.pagination {
  grid-column: 1 / -1;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid hsl(var(--border));
}

.pagination-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: 1px solid hsl(var(--border));
  background: hsl(var(--background));
  color: hsl(var(--foreground));
  border-radius: 0.375rem;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
}

.pagination-btn:hover:not(:disabled) {
  border-color: hsl(var(--primary));
  color: hsl(var(--primary));
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination-info {
  font-size: 0.875rem;
  color: hsl(var(--muted-foreground));
  text-align: center;
}

/* Loading and Error States */
.loading-state,
.error-state,
.empty-state {
  grid-column: 1 / -1;
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

.error-state h3,
.empty-state h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: hsl(var(--foreground));
  margin: 1rem 0 0.5rem;
}

.error-state p,
.empty-state p {
  margin-bottom: 2rem;
  font-size: 0.875rem;
  max-width: 24rem;
  margin-left: auto;
  margin-right: auto;
}

/* Responsive */
@media (max-width: 768px) {
  .selection-filters {
    padding: 1rem;
  }

  .filter-row {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
  }

  .selection-controls {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .selection-actions {
    justify-content: center;
  }

  .templates-list {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .template-card {
    padding: 1rem;
    min-height: auto;
  }

  .template-info {
    margin-left: 2rem;
  }

  .template-stats {
    flex-direction: column;
    gap: 0.5rem;
  }

  .pagination {
    flex-direction: column;
    gap: 0.75rem;
  }

  .pagination-info {
    order: -1;
  }
}

@media (max-width: 480px) {
  .template-header {
    flex-direction: column;
    gap: 0.5rem;
    align-items: flex-start;
  }

  .template-badges {
    align-self: flex-start;
  }
}
</style>