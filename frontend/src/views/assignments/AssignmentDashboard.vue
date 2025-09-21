<template>
  <div class="assignment-dashboard">
    <!-- Page Header -->
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">Assignment Dashboard</h1>
        <p class="page-subtitle">
          Manage and track inspection assignments across all sites
        </p>
      </div>
      <div class="header-actions">
        <router-link to="/assignments/create" class="btn btn-primary">
          <PlusIcon class="icon-sm" />
          Create Assignments
        </router-link>
      </div>
    </div>

    <!-- Dashboard Stats -->
    <div class="dashboard-stats">
      <div class="stat-card">
        <div class="stat-icon">
          <ClipboardDocumentListIcon class="icon-lg text-primary" />
        </div>
        <div class="stat-content">
          <span class="stat-value">{{ assignments.length }}</span>
          <span class="stat-label">Total Assignments</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon">
          <ClockIcon class="icon-lg text-warning" />
        </div>
        <div class="stat-content">
          <span class="stat-value">{{ pendingAssignments.length }}</span>
          <span class="stat-label">Pending</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon">
          <ArrowPathIcon class="icon-lg text-warning" />
        </div>
        <div class="stat-content">
          <span class="stat-value">{{ inProgressAssignments.length }}</span>
          <span class="stat-label">In Progress</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon">
          <CheckCircleIcon class="icon-lg text-success" />
        </div>
        <div class="stat-content">
          <span class="stat-value">{{ completedAssignments.length }}</span>
          <span class="stat-label">Completed</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon">
          <ExclamationTriangleIcon class="icon-lg text-destructive" />
        </div>
        <div class="stat-content">
          <span class="stat-value">{{ overdueAssignments.length }}</span>
          <span class="stat-label">Overdue</span>
        </div>
      </div>
    </div>

    <!-- Filters and Search -->
    <div class="filters-section">
      <div class="filters-row">
        <div class="search-group">
          <MagnifyingGlassIcon class="search-icon" />
          <input
            v-model="searchTerm"
            type="text"
            placeholder="Search by site name, template, or assignee..."
            class="search-input"
          />
        </div>

        <div class="filter-group">
          <select v-model="statusFilter" class="filter-select">
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>

        <div class="filter-group">
          <select v-model="sortBy" class="filter-select">
            <option value="created_at">Sort by Created Date</option>
            <option value="due_date">Sort by Due Date</option>
            <option value="site_name">Sort by Site Name</option>
            <option value="template_name">Sort by Template</option>
            <option value="status">Sort by Status</option>
          </select>
        </div>

        <div class="filter-group">
          <select v-model="sortOrder" class="filter-select">
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </div>
      </div>

      <!-- Filter Summary -->
      <div v-if="hasActiveFilters" class="filter-summary">
        <div class="filter-tags">
          <span v-if="searchTerm" class="filter-tag">
            Search: "{{ searchTerm }}"
            <button @click="searchTerm = ''" class="filter-tag-remove">
              <XMarkIcon class="icon-xs" />
            </button>
          </span>
          <span v-if="statusFilter" class="filter-tag">
            Status: {{ statusFilter }}
            <button @click="statusFilter = ''" class="filter-tag-remove">
              <XMarkIcon class="icon-xs" />
            </button>
          </span>
        </div>
        <button @click="clearFilters" class="btn btn-sm btn-secondary">
          Clear All Filters
        </button>
      </div>
    </div>

    <!-- Assignment Content -->
    <div class="assignment-content">
      <!-- Loading State -->
      <div v-if="isLoading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>Loading assignments...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="error-state">
        <ExclamationTriangleIcon class="icon-xl" />
        <h3>Error Loading Assignments</h3>
        <p>{{ error }}</p>
        <button @click="fetchAssignments" class="btn btn-primary">
          Try Again
        </button>
      </div>

      <!-- Assignments List -->
      <div v-else-if="filteredAssignments.length > 0" class="assignments-list">
        <div
          v-for="assignment in paginatedAssignments"
          :key="assignment.id"
          class="assignment-card"
          :class="`status-${assignment.status}`"
        >
          <!-- Assignment Header -->
          <div class="assignment-header">
            <div class="assignment-info">
              <h3 class="assignment-title">
                {{ assignment.template_name || 'Unknown Template' }} at {{ assignment.site_name || 'Unknown Site' }}
              </h3>
              <div class="assignment-meta">
                <span class="assignment-id">#{{ assignment.id?.slice(-8) || 'Unknown' }}</span>
                <span class="assignment-date">{{ assignment.created_at ? formatDate(assignment.created_at) : 'No date' }}</span>
              </div>
            </div>
            <div class="assignment-status">
              <span
                class="status-badge"
                :class="`status-${assignment.status}`"
              >
                {{ getStatusLabel(assignment.status) }}
              </span>
            </div>
          </div>

          <!-- Assignment Details -->
          <div class="assignment-details">
            <div class="details-row">
              <div class="detail-item">
                <BuildingOfficeIcon class="icon-sm" />
                <span>{{ assignment.site_name || 'Unknown Site' }}</span>
              </div>
              <div class="detail-item">
                <DocumentTextIcon class="icon-sm" />
                <span>{{ assignment.template_name || 'Unknown Template' }}</span>
              </div>
              <div class="detail-item" v-if="assignment.inspector_name">
                <UserIcon class="icon-sm" />
                <span>{{ assignment.inspector_name || 'Unknown Inspector' }}</span>
              </div>
              <div class="detail-item" v-if="assignment.due_date">
                <CalendarIcon class="icon-sm" />
                <span>Due {{ assignment.due_date ? formatDate(assignment.due_date) : 'No due date' }}</span>
              </div>
            </div>
          </div>

          <!-- Assignment Actions -->
          <div class="assignment-actions">
            <router-link
              :to="`/inspections/${assignment.inspection_id}`"
              class="btn btn-sm btn-secondary"
              v-if="assignment.inspection_id"
            >
              <EyeIcon class="icon-sm" />
              View Inspection
            </router-link>
            <button
              @click="openDeleteModal(assignment)"
              class="btn btn-sm btn-danger"
              :disabled="assignment.status === 'completed'"
            >
              <TrashIcon class="icon-sm" />
              Delete
            </button>
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
            ({{ filteredAssignments.length }} assignments)
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
        <ClipboardDocumentListIcon class="icon-xl" />
        <h3>No Assignments Found</h3>
        <p>{{ hasActiveFilters ? 'No assignments match your search criteria.' : 'You haven\'t created any assignments yet.' }}</p>
        <router-link to="/assignments/create" class="btn btn-primary">
          <PlusIcon class="icon-sm" />
          Create First Assignment
        </router-link>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteModal" class="modal-overlay" @click="closeDeleteModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3 class="modal-title">Delete Assignment</h3>
          <button @click="closeDeleteModal" class="modal-close">
            <XMarkIcon class="icon-sm" />
          </button>
        </div>
        <div class="modal-body">
          <p>Are you sure you want to delete this assignment?</p>
          <div class="assignment-to-delete" v-if="assignmentToDelete">
            <strong>{{ assignmentToDelete.template_name }}</strong> at <strong>{{ assignmentToDelete.site_name }}</strong>
          </div>
          <p class="warning-text">This action cannot be undone.</p>
        </div>
        <div class="modal-actions">
          <button @click="closeDeleteModal" class="btn btn-secondary">
            Cancel
          </button>
          <button
            @click="confirmDelete"
            :disabled="isDeleting"
            class="btn btn-danger"
          >
            <template v-if="isDeleting">
              <div class="button-spinner"></div>
              Deleting...
            </template>
            <template v-else>
              Delete Assignment
            </template>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useAssignmentStore } from '@/stores/assignment'
import { storeToRefs } from 'pinia'
import type { Assignment } from '@/stores/assignment'
import {
  PlusIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  BuildingOfficeIcon,
  DocumentTextIcon,
  UserIcon,
  CalendarIcon,
  EyeIcon,
  TrashIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/vue/24/outline'

// Store
const assignmentStore = useAssignmentStore()
const { assignments, isLoading, error } = storeToRefs(assignmentStore)

// Local state
const searchTerm = ref('')
const statusFilter = ref('')
const sortBy = ref('created_at')
const sortOrder = ref('desc')
const currentPage = ref(1)
const itemsPerPage = 20

// Delete modal state
const showDeleteModal = ref(false)
const assignmentToDelete = ref<Assignment | null>(null)
const isDeleting = ref(false)

// Computed properties with defensive checks
const pendingAssignments = computed(() => {
  try {
    return (assignments.value || []).filter(a => a?.status === 'pending')
  } catch (error) {
    console.error('Error computing pending assignments:', error)
    return []
  }
})

const inProgressAssignments = computed(() => {
  try {
    return (assignments.value || []).filter(a => a?.status === 'in_progress')
  } catch (error) {
    console.error('Error computing in progress assignments:', error)
    return []
  }
})

const completedAssignments = computed(() => {
  try {
    return (assignments.value || []).filter(a => a?.status === 'completed')
  } catch (error) {
    console.error('Error computing completed assignments:', error)
    return []
  }
})

const overdueAssignments = computed(() => {
  try {
    return (assignments.value || []).filter(a => a?.status === 'overdue')
  } catch (error) {
    console.error('Error computing overdue assignments:', error)
    return []
  }
})

const hasActiveFilters = computed(() =>
  searchTerm.value || statusFilter.value
)

const filteredAssignments = computed(() => {
  try {
    // Defensive check for assignments
    if (!assignments.value || !Array.isArray(assignments.value)) {
      return []
    }

    let filtered = [...assignments.value]

    // Apply search filter
    if (searchTerm.value) {
      const search = searchTerm.value.toLowerCase()
      filtered = filtered.filter(assignment => {
        try {
          const siteName = assignment?.site_name?.toLowerCase() || ''
          const templateName = assignment?.template_name?.toLowerCase() || ''
          const assignedTo = assignment?.assigned_to?.toLowerCase() || ''
          const id = assignment?.id?.toLowerCase() || ''

          return siteName.includes(search) ||
                 templateName.includes(search) ||
                 assignedTo.includes(search) ||
                 id.includes(search)
        } catch (error) {
          console.error('Error filtering assignment:', assignment, error)
          return false
        }
      })
    }

    // Apply status filter
    if (statusFilter.value) {
      filtered = filtered.filter(assignment => {
        try {
          return assignment?.status === statusFilter.value
        } catch (error) {
          console.error('Error status filtering assignment:', assignment, error)
          return false
        }
      })
    }

    // Apply sorting
    filtered.sort((a, b) => {
      try {
        let aValue: any
        let bValue: any

        switch (sortBy.value) {
          case 'created_at':
          case 'due_date':
            aValue = new Date(a?.[sortBy.value] || 0).getTime()
            bValue = new Date(b?.[sortBy.value] || 0).getTime()
            break
          case 'site_name':
          case 'template_name':
          case 'status':
            aValue = a?.[sortBy.value] || ''
            bValue = b?.[sortBy.value] || ''
            break
          default:
            return 0
        }

        if (sortOrder.value === 'asc') {
          return aValue > bValue ? 1 : -1
        } else {
          return aValue < bValue ? 1 : -1
        }
      } catch (error) {
        console.error('Error sorting assignments:', a, b, error)
        return 0
      }
    })

    return filtered
  } catch (error) {
    console.error('Error in filteredAssignments computed:', error)
    return []
  }
})

const paginatedAssignments = computed(() => {
  try {
    const filtered = filteredAssignments.value || []
    const start = (currentPage.value - 1) * itemsPerPage
    const end = start + itemsPerPage
    return filtered.slice(start, end)
  } catch (error) {
    console.error('Error in paginatedAssignments computed:', error)
    return []
  }
})

const totalPages = computed(() => {
  try {
    const filtered = filteredAssignments.value || []
    return Math.ceil(filtered.length / itemsPerPage)
  } catch (error) {
    console.error('Error in totalPages computed:', error)
    return 1
  }
})

// Methods
const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'pending':
      return 'Pending'
    case 'in_progress':
      return 'In Progress'
    case 'completed':
      return 'Completed'
    case 'overdue':
      return 'Overdue'
    default:
      return status.charAt(0).toUpperCase() + status.slice(1)
  }
}

const clearFilters = () => {
  searchTerm.value = ''
  statusFilter.value = ''
  currentPage.value = 1
}

const fetchAssignments = async () => {
  await assignmentStore.fetchAssignments()
}

// Delete modal methods
const openDeleteModal = (assignment: Assignment) => {
  assignmentToDelete.value = assignment
  showDeleteModal.value = true
}

const closeDeleteModal = () => {
  showDeleteModal.value = false
  assignmentToDelete.value = null
}

const confirmDelete = async () => {
  if (!assignmentToDelete.value) return

  isDeleting.value = true
  const result = await assignmentStore.deleteAssignment(assignmentToDelete.value.id)

  if (result.success) {
    closeDeleteModal()
  }

  isDeleting.value = false
}

// Watch for filter changes to reset pagination
watch([searchTerm, statusFilter], () => {
  currentPage.value = 1
})

// Initialize
onMounted(async () => {
  try {
    // Always fetch fresh assignments data when component mounts
    console.log('🔄 AssignmentDashboard mounted, fetching assignments...')
    console.log('📊 Current assignments state:', assignments.value)
    console.log('📊 Current loading state:', isLoading.value)
    console.log('📊 Current error state:', error.value)

    await assignmentStore.fetchAssignments()

    console.log('✅ Assignment fetch completed')
    console.log('📊 Updated assignments state:', assignments.value)
    console.log('📊 Updated loading state:', isLoading.value)
    console.log('📊 Updated error state:', error.value)
  } catch (mountError) {
    console.error('❌ Error in AssignmentDashboard onMounted:', mountError)
  }
})
</script>

<style scoped>
.assignment-dashboard {
  max-width: 1400px;
  margin: 0 auto;
  padding: 1.5rem;
}

/* Page Header */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
}

.header-content {
  flex: 1;
}

.page-title {
  font-size: 2.25rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  color: hsl(var(--foreground));
}

.page-subtitle {
  font-size: 1.125rem;
  margin: 0;
  color: hsl(var(--muted-foreground));
}

.header-actions {
  flex-shrink: 0;
  margin-left: 2rem;
}

/* Dashboard Stats */
.dashboard-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  border-radius: 0.75rem;
  box-shadow: var(--shadow-sm);
}

.stat-icon {
  flex-shrink: 0;
}

.stat-content {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: hsl(var(--foreground));
}

.stat-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: hsl(var(--muted-foreground));
}

/* Filters */
.filters-section {
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  border-radius: 0.75rem;
  padding: 1.5rem;
  margin-bottom: 2rem;
  box-shadow: var(--shadow-sm);
}

.filters-row {
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
}

.search-group {
  position: relative;
  flex: 2;
  min-width: 250px;
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
  background: hsl(var(--muted));
  color: hsl(var(--foreground));
}

.search-input:focus {
  outline: none;
  ring: 2px;
  ring-color: hsl(var(--primary));
  border-color: hsl(var(--primary));
  background: hsl(var(--background));
}

.filter-group {
  flex-shrink: 0;
}

.filter-select {
  padding: 0.75rem;
  border: 1px solid hsl(var(--border));
  border-radius: 0.5rem;
  font-size: 0.875rem;
  background: hsl(var(--muted));
  color: hsl(var(--foreground));
  min-width: 150px;
}

.filter-select:focus {
  outline: none;
  ring: 2px;
  ring-color: hsl(var(--primary));
  border-color: hsl(var(--primary));
  background: hsl(var(--background));
}

.filter-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid hsl(var(--border));
}

.filter-tags {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.filter-tag {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: hsl(var(--primary) / 0.1);
  color: hsl(var(--primary));
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 500;
}

.filter-tag-remove {
  background: none;
  border: none;
  color: hsl(var(--primary));
  cursor: pointer;
  padding: 0.125rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.filter-tag-remove:hover {
  background: hsl(var(--primary) / 0.2);
}

/* Assignment Content */
.assignment-content {
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  border-radius: 0.75rem;
  padding: 1.5rem;
  box-shadow: var(--shadow-sm);
}

/* Assignments List */
.assignments-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.assignment-card {
  padding: 1.5rem;
  border: 1px solid hsl(var(--border));
  border-radius: 0.75rem;
  background: hsl(var(--muted) / 0.5);
  transition: all 0.2s;
  border-left: 4px solid hsl(var(--border));
}

.assignment-card:hover {
  box-shadow: var(--shadow);
}

.assignment-card.status-pending {
  border-left-color: hsl(var(--warning));
}

.assignment-card.status-in_progress {
  border-left-color: hsl(var(--primary));
}

.assignment-card.status-completed {
  border-left-color: hsl(var(--success));
}

.assignment-card.status-overdue {
  border-left-color: hsl(var(--destructive));
}

.assignment-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.assignment-info {
  flex: 1;
}

.assignment-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
  line-height: 1.4;
  color: hsl(var(--foreground));
}

.assignment-meta {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.assignment-id {
  font-size: 0.75rem;
  background: hsl(var(--muted));
  color: hsl(var(--muted-foreground));
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-family: monospace;
}

.assignment-date {
  font-size: 0.75rem;
  color: hsl(var(--muted-foreground));
}

.assignment-status {
  flex-shrink: 0;
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

.status-badge.status-pending {
  background: hsl(var(--warning) / 0.1);
  color: hsl(var(--warning));
}

.status-badge.status-in_progress {
  background: hsl(var(--primary) / 0.1);
  color: hsl(var(--primary));
}

.status-badge.status-completed {
  background: hsl(var(--success) / 0.1);
  color: hsl(var(--success));
}

.status-badge.status-overdue {
  background: hsl(var(--destructive) / 0.1);
  color: hsl(var(--destructive));
}

.assignment-details {
  margin-bottom: 1rem;
}

.details-row {
  display: flex;
  gap: 2rem;
  align-items: center;
  flex-wrap: wrap;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: hsl(var(--muted-foreground));
}

.assignment-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  align-items: center;
}

/* Pagination */
.pagination {
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
  text-align: center;
  color: hsl(var(--muted-foreground));
}

/* Loading and Error States */
.loading-state,
.error-state,
.empty-state {
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

.error-state h3,
.empty-state h3 {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 1rem 0 0.5rem;
  color: hsl(var(--foreground));
}

.error-state p,
.empty-state p {
  margin-bottom: 2rem;
  font-size: 0.875rem;
  max-width: 24rem;
  margin-left: auto;
  margin-right: auto;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  background: hsl(var(--background));
  border-radius: 0.75rem;
  box-shadow: var(--shadow-lg);
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 1.5rem 0;
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
  color: hsl(var(--foreground));
}

.modal-close {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 0.375rem;
}

.modal-close:hover {
  background: hsl(var(--muted));
}

.modal-body {
  padding: 1.5rem;
}

.assignment-to-delete {
  background: hsl(var(--muted));
  padding: 1rem;
  border-radius: 0.5rem;
  margin: 1rem 0;
  border-left: 4px solid hsl(var(--destructive));
}

.warning-text {
  color: hsl(var(--destructive));
  font-weight: 500;
  margin-top: 1rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 0 1.5rem 1.5rem;
}

.button-spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-right: 0.5rem;
}

/* Responsive */
@media (max-width: 768px) {
  .assignment-dashboard {
    padding: 1rem;
  }

  .page-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .header-actions {
    margin-left: 0;
  }

  .dashboard-stats {
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
  }

  .stat-card {
    padding: 1rem;
    flex-direction: column;
    text-align: center;
    gap: 0.75rem;
  }

  .filters-row {
    flex-direction: column;
    align-items: stretch;
  }

  .search-group {
    min-width: auto;
  }

  .filter-summary {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .assignment-header {
    flex-direction: column;
    gap: 0.75rem;
    align-items: flex-start;
  }

  .assignment-meta {
    flex-direction: column;
    gap: 0.5rem;
    align-items: flex-start;
  }

  .details-row {
    flex-direction: column;
    gap: 0.75rem;
    align-items: flex-start;
  }

  .assignment-actions {
    justify-content: flex-start;
    flex-wrap: wrap;
  }

  .pagination {
    flex-direction: column;
    gap: 0.75rem;
  }

  .pagination-info {
    order: -1;
  }

  .modal-content {
    margin: 0.5rem;
  }

  .modal-actions {
    flex-direction: column-reverse;
    gap: 0.5rem;
  }

  .modal-actions .btn {
    width: 100%;
  }
}
</style>