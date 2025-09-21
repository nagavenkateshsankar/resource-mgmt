<template>
  <div class="inspections-page">
    <div class="page-header">
      <h1 class="page-title">Inspections</h1>
      <div class="header-actions">
        <button @click="activeTab = 'assigned'" class="btn btn-secondary" :class="{ 'btn-primary': activeTab === 'assigned' }">
          <ClipboardDocumentCheckIcon class="icon-sm" />
          Assigned Inspections
        </button>
        <button @click="activeTab = 'templates'" class="btn btn-secondary" :class="{ 'btn-primary': activeTab === 'templates' }">
          <DocumentTextIcon class="icon-sm" />
          New from Templates
        </button>
      </div>
    </div>

    <!-- Filters -->
    <div class="filters-section">
      <div class="filter-group">
        <label for="status-filter" class="filter-label">Status</label>
        <select id="status-filter" v-model="selectedStatus" class="filter-select">
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="in_progress">In Progress</option>
          <option value="requires_review">Requires Review</option>
          <option value="completed">Completed</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>
      <div class="filter-group">
        <label for="search" class="filter-label">Search</label>
        <input
          id="search"
          type="text"
          v-model="searchTerm"
          placeholder="Search inspections..."
          class="filter-input"
        />
      </div>
    </div>

    <div class="inspections-content">
      <!-- Loading State -->
      <div v-if="isLoading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>Loading {{ activeTab === 'assigned' ? 'assignments' : 'templates' }}...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="error-state">
        <ExclamationTriangleIcon class="icon-xl" />
        <h3>Error Loading {{ activeTab === 'assigned' ? 'Assignments' : 'Templates' }}</h3>
        <p>{{ error }}</p>
        <button @click="activeTab === 'assigned' ? fetchAssignments() : fetchTemplates()" class="btn btn-primary">
          Try Again
        </button>
      </div>

      <!-- Assigned Inspections Tab -->
      <div v-else-if="activeTab === 'assigned'">
        <!-- Assignments List -->
        <div v-if="assignments.length > 0" class="assignments-list">
          <div
            v-for="assignment in assignments"
            :key="assignment.id"
            class="assignment-card"
          >
            <div class="assignment-header">
              <div class="assignment-info">
                <h3 class="assignment-title">{{ assignment.template?.name || 'Untitled Template' }}</h3>
                <p class="assignment-location">{{ assignment.site?.name || assignment.site?.address || 'Unknown Site' }}</p>
              </div>
              <div class="assignment-status">
                <span class="status-badge status-pending">
                  Assigned
                </span>
              </div>
            </div>

            <div class="assignment-meta">
              <div class="meta-left">
                <div class="meta-item">
                  <CalendarIcon class="icon-sm" />
                  <span>Due: {{ formatDate(assignment.due_date) }}</span>
                </div>
                <div class="meta-item">
                  <UserIcon class="icon-sm" />
                  <span>{{ assignment.assigned_to?.name || 'Unknown User' }}</span>
                </div>
                <div class="meta-item">
                  <TagIcon class="icon-sm" />
                  <span class="category-badge" :class="`category-${assignment.template?.category?.toLowerCase() || 'unknown'}`">
                    {{ assignment.template?.category || 'Unknown' }}
                  </span>
                </div>
              </div>
              <div class="assignment-actions">
                <button
                  @click="startInspectionFromAssignment(assignment)"
                  class="btn btn-primary btn-sm"
                >
                  <ArrowRightIcon class="icon-sm" />
                  Start Inspection
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty Assignments State -->
        <div v-else class="empty-state">
          <ClipboardDocumentCheckIcon class="icon-xl" />
          <h3>No Assignments Found</h3>
          <p>You don't have any inspection assignments at the moment.</p>
        </div>
      </div>

      <!-- Templates Tab -->
      <div v-else-if="activeTab === 'templates'">
        <!-- Templates List -->
        <div v-if="templates.length > 0" class="templates-list">
          <div
            v-for="template in templates"
            :key="template.id"
            class="template-card"
          >
            <div class="template-header">
              <div class="template-info">
                <h3 class="template-title">{{ template.name }}</h3>
                <p class="template-description">{{ template.description || 'No description available' }}</p>
              </div>
              <div class="template-category">
                <span class="category-badge" :class="`category-${template.category?.toLowerCase() || 'unknown'}`">
                  {{ template.category || 'Unknown' }}
                </span>
              </div>
            </div>

            <div class="template-meta">
              <div class="meta-left">
                <div class="meta-item">
                  <CalendarIcon class="icon-sm" />
                  <span>Updated: {{ formatDate(template.updated_at) }}</span>
                </div>
                <div class="meta-item">
                  <UserIcon class="icon-sm" />
                  <span>Created by: {{ template.created_by?.name || 'Unknown' }}</span>
                </div>
              </div>
              <div class="template-actions">
                <button
                  @click="createInspectionFromTemplate(template.id)"
                  class="btn btn-primary btn-sm"
                >
                  <PlusIcon class="icon-sm" />
                  Create Inspection
                </button>
                <router-link
                  :to="`/templates/${template.id}`"
                  class="btn btn-secondary btn-sm"
                >
                  <EyeIcon class="icon-sm" />
                  View Template
                </router-link>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty Templates State -->
        <div v-else class="empty-state">
          <DocumentTextIcon class="icon-xl" />
          <h3>No Templates Found</h3>
          <p>No inspection templates are available to create new inspections.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { apiUtils } from '@/utils/api'
import {
  PlusIcon,
  CalendarIcon,
  UserIcon,
  ClipboardDocumentListIcon,
  EyeIcon,
  ArrowRightIcon,
  TagIcon,
  ExclamationTriangleIcon,
  ClipboardDocumentCheckIcon,
  DocumentTextIcon
} from '@heroicons/vue/24/outline'

// State
const inspections = ref([])
const templates = ref([])
const assignments = ref([])
const isLoading = ref(false)
const error = ref(null)
const activeTab = ref('assigned')

// API Functions
const fetchAssignments = async () => {
  try {
    isLoading.value = true
    error.value = null

    const response = await apiUtils.get('/assignments')
    assignments.value = response.assignments || []
  } catch (err) {
    console.error('Failed to fetch assignments:', err)
    error.value = 'Failed to load assignments. Please try again later.'
  } finally {
    isLoading.value = false
  }
}

const fetchTemplates = async () => {
  try {
    isLoading.value = true
    error.value = null

    const response = await apiUtils.get('/templates')
    templates.value = response.templates || []
  } catch (err) {
    console.error('Failed to fetch templates:', err)
    error.value = 'Failed to load templates. Please try again later.'
  } finally {
    isLoading.value = false
  }
}

const fetchInspections = async () => {
  try {
    isLoading.value = true
    error.value = null

    const response = await apiUtils.get('/inspections')

    // Transform API response to match frontend structure
    inspections.value = response.inspections.map(inspection => ({
      id: inspection.id,
      title: `${inspection.template?.name || 'Untitled'} - ${inspection.site?.name || inspection.site?.address}`,
      location: inspection.site?.address,
      status: inspection.status,
      date: inspection.created_at,
      inspector: inspection.inspector?.name || 'Unknown',
      template: inspection.template?.name || 'Unknown Template',
      templateCategory: inspection.template?.category || 'Unknown'
    }))
  } catch (err) {
    console.error('Failed to fetch inspections:', err)
    error.value = 'Failed to load inspections. Please try again later.'
  } finally {
    isLoading.value = false
  }
}

const createInspectionFromTemplate = async (templateId: string) => {
  try {
    // Navigate to site selection with template pre-selected
    window.location.href = `/inspections/site-select/${templateId}`
  } catch (err) {
    console.error('Failed to create inspection from template:', err)
    error.value = 'Failed to create inspection. Please try again later.'
  }
}

const startInspectionFromAssignment = async (assignment: any) => {
  try {
    const response = await apiUtils.post('/inspections/from-assignment', {
      assignment_id: assignment.id
    })

    if (response.inspection) {
      // Navigate to the new inspection
      window.location.href = `/inspections/${response.inspection.id}/edit`
    }
  } catch (err) {
    console.error('Failed to start inspection from assignment:', err)
    error.value = 'Failed to start inspection. Please try again later.'
  }
}

// Helper function
const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

// Filters
const selectedStatus = ref('')
const searchTerm = ref('')

// Computed
const filteredInspections = computed(() => {
  let filtered = inspections.value

  if (selectedStatus.value) {
    filtered = filtered.filter(inspection =>
      inspection.status === selectedStatus.value
    )
  }

  if (searchTerm.value) {
    const search = searchTerm.value.toLowerCase()
    filtered = filtered.filter(inspection =>
      inspection.title.toLowerCase().includes(search) ||
      inspection.location.toLowerCase().includes(search) ||
      inspection.inspector.toLowerCase().includes(search)
    )
  }

  return filtered
})

// Methods

// Watch for tab changes
const loadDataForActiveTab = async () => {
  if (activeTab.value === 'assigned') {
    await fetchAssignments()
  } else if (activeTab.value === 'templates') {
    await fetchTemplates()
  }
}

// Initialize
onMounted(() => {
  loadDataForActiveTab()
})

// Watch for tab changes to load appropriate data
watch(activeTab, () => {
  loadDataForActiveTab()
})
</script>

<style scoped>
.inspections-page {
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
}

.filter-select,
.filter-input {
  padding: 0.5rem 0.75rem;
  border: 1px solid hsl(var(--border));
  border-radius: 0.375rem;
  font-size: 0.875rem;
  min-width: 150px;
}

.filter-select:focus,
.filter-input:focus {
  outline: none;
  ring: 2px;
  ring-color: hsl(var(--primary));
  border-color: hsl(var(--primary));
}

/* Content */
.inspections-content {
  background: hsl(var(--background));
  border-radius: 0.75rem;
  padding: 1.5rem;
  box-shadow: var(--shadow-sm);
  border: 1px solid hsl(var(--border));
}

/* Inspections List */
.inspections-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.inspection-card {
  border: 1px solid hsl(var(--border));
  border-radius: 0.5rem;
  padding: 1.5rem;
  transition: all 0.2s;
}

.inspection-card:hover {
  border-color: hsl(var(--primary));
  box-shadow: var(--shadow);
}

.inspection-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.5rem;
}

.inspection-info {
  flex: 1;
}

.inspection-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 0.125rem;
}

.inspection-location {
  font-size: 0.875rem;
  margin: 0;
}

.inspection-status {
  margin-left: 1rem;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.status-completed {
  background-color: hsl(var(--success) / 0.1);
  color: hsl(var(--success));
}

.status-pending {
  background-color: hsl(var(--warning) / 0.1);
  color: hsl(var(--warning));
}

.status-draft {
  background-color: hsl(var(--muted));
}

.inspection-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.meta-left {
  display: flex;
  gap: 1.5rem;
  align-items: center;
  flex-wrap: wrap;
  min-width: 0;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.inspection-actions {
  flex-shrink: 0;
}

.category-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.category-safety {
  background-color: hsl(var(--destructive) / 0.1);
  color: hsl(var(--destructive));
}

.category-electrical {
  background-color: hsl(var(--warning) / 0.1);
  color: hsl(var(--warning));
}

.category-plumbing {
  background-color: hsl(var(--primary) / 0.1);
  color: hsl(var(--primary));
}

.category-structural {
  background-color: hsl(var(--primary) / 0.1);
  color: hsl(var(--primary));
}

.category-environmental {
  background-color: hsl(var(--success) / 0.1);
  color: hsl(var(--success));
}

/* Loading and Error States */
.loading-state,
.error-state {
  text-align: center;
  padding: 4rem 2rem;
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

/* Empty State */
.empty-state {
  text-align: center;
  padding: 3rem 1rem;
}

.empty-state h3 {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 1rem 0 0.5rem;
}

.empty-state p {
  margin-bottom: 2rem;
  font-size: 0.875rem;
}

/* Header Actions */
.header-actions {
  display: flex;
  gap: 0.5rem;
}

/* Assignment and Template Cards */
.assignment-card,
.template-card {
  border: 1px solid hsl(var(--border));
  border-radius: 0.5rem;
  padding: 1.5rem;
  transition: all 0.2s;
}

.assignment-card:hover,
.template-card:hover {
  border-color: hsl(var(--primary));
  box-shadow: var(--shadow);
}

.assignment-header,
.template-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.5rem;
}

.assignment-info,
.template-info {
  flex: 1;
}

.assignment-title,
.template-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 0.125rem;
}

.assignment-location,
.template-description {
  font-size: 0.875rem;
  margin: 0;
}

.assignment-status,
.template-category {
  margin-left: 1rem;
}

.assignment-meta,
.template-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.assignment-actions,
.template-actions {
  flex-shrink: 0;
  display: flex;
  gap: 0.5rem;
}

.assignments-list,
.templates-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* Status badge variations */
.status-assigned {
  background-color: hsl(var(--primary) / 0.1);
  color: hsl(var(--primary));
}

.category-unknown {
  background-color: hsl(var(--muted));
}

/* Responsive */
@media (max-width: 768px) {
  .inspections-page {
    padding: 1rem;
  }

  .page-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .header-actions {
    flex-direction: column;
  }

  .filters-section {
    flex-direction: column;
  }

  .filter-select,
  .filter-input {
    min-width: auto;
  }

  .inspection-header {
    flex-direction: column;
    gap: 0.75rem;
  }

  .inspection-status {
    margin-left: 0;
    align-self: flex-start;
  }

  .inspection-meta {
    flex-direction: column;
    gap: 0.75rem;
    align-items: flex-start;
  }

  .meta-left {
    flex-direction: column;
    gap: 0.5rem;
    align-items: flex-start;
  }

  .inspection-actions {
    align-self: flex-start;
  }
}
</style>