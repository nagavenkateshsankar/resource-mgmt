<template>
  <div class="projects-list">
    <!-- Page Header -->
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">Inspection Projects</h1>
        <p class="page-description">Manage and monitor inspection project workflows</p>
      </div>
      <div class="header-actions">
        <RouterLink
          to="/projects/create"
          class="btn btn-primary"
          v-if="userPermissions.can_create_projects"
        >
          <i class="icon-plus"></i>
          Create Project
        </RouterLink>
      </div>
    </div>

    <!-- Filters and Search -->
    <div class="filters-section">
      <div class="filters-row">
        <div class="search-box">
          <input
            v-model="filters.search"
            type="text"
            placeholder="Search projects..."
            class="search-input"
            @input="debouncedSearch"
          />
          <i class="icon-search"></i>
        </div>

        <div class="filter-group">
          <select v-model="filters.status" @change="loadProjects" class="filter-select">
            <option value="">All Status</option>
            <option value="planning">Planning</option>
            <option value="active">Active</option>
            <option value="review">Review</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select v-model="filters.priority" @change="loadProjects" class="filter-select">
            <option value="">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>

          <select v-model="filters.type" @change="loadProjects" class="filter-select">
            <option value="">All Types</option>
            <option value="regular">Regular</option>
            <option value="safety">Safety</option>
            <option value="compliance">Compliance</option>
            <option value="audit">Audit</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Projects Grid -->
    <div class="projects-grid" v-if="projects.length > 0">
      <div
        v-for="project in projects"
        :key="project.id"
        class="project-card"
        :class="[`status-${project.status}`, `priority-${project.priority}`]"
      >
        <!-- Project Header -->
        <div class="project-header">
          <div class="project-info">
            <h3 class="project-name">
              <RouterLink :to="`/projects/${project.id}`">
                {{ project.name }}
              </RouterLink>
            </h3>
            <div class="project-meta">
              <span class="project-code" v-if="project.project_code">
                {{ project.project_code }}
              </span>
              <span class="project-type">{{ formatType(project.type) }}</span>
            </div>
          </div>
          <div class="project-status">
            <span class="status-badge" :class="`status-${project.status}`">
              {{ formatStatus(project.status) }}
            </span>
            <span class="priority-badge" :class="`priority-${project.priority}`">
              {{ formatPriority(project.priority) }}
            </span>
          </div>
        </div>

        <!-- Project Progress -->
        <div class="project-progress">
          <div class="progress-info">
            <span class="progress-label">Progress</span>
            <span class="progress-percentage">{{ project.completion_percentage || 0 }}%</span>
          </div>
          <div class="progress-bar">
            <div
              class="progress-fill"
              :style="{ width: `${project.completion_percentage || 0}%` }"
            ></div>
          </div>
        </div>

        <!-- Project Stats -->
        <div class="project-stats">
          <div class="stat-item">
            <span class="stat-value">{{ project.total_assignments || 0 }}</span>
            <span class="stat-label">Assignments</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ project.completed_assignments || 0 }}</span>
            <span class="stat-label">Completed</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ project.total_inspections || 0 }}</span>
            <span class="stat-label">Inspections</span>
          </div>
        </div>

        <!-- Project Timeline -->
        <div class="project-timeline" v-if="project.start_date || project.due_date">
          <div class="timeline-item" v-if="project.start_date">
            <i class="icon-calendar"></i>
            <span>Started: {{ formatDate(project.start_date) }}</span>
          </div>
          <div class="timeline-item" v-if="project.due_date">
            <i class="icon-clock"></i>
            <span :class="{ 'overdue': isOverdue(project.due_date) }">
              Due: {{ formatDate(project.due_date) }}
            </span>
          </div>
        </div>

        <!-- Project Manager -->
        <div class="project-manager">
          <div class="manager-info">
            <img
              :src="project.manager?.avatar_url || '/default-avatar.png'"
              :alt="project.manager?.name"
              class="manager-avatar"
            />
            <span class="manager-name">{{ project.manager?.name }}</span>
          </div>
        </div>

        <!-- Action Menu -->
        <div class="project-actions">
          <div class="dropdown">
            <button class="dropdown-toggle" @click="toggleDropdown(project.id)">
              <i class="icon-more-vertical"></i>
            </button>
            <div
              class="dropdown-menu"
              :class="{ 'show': openDropdown === project.id }"
            >
              <RouterLink :to="`/projects/${project.id}`" class="dropdown-item">
                <i class="icon-eye"></i>
                View Details
              </RouterLink>
              <RouterLink
                :to="`/projects/${project.id}/edit`"
                class="dropdown-item"
                v-if="userPermissions.can_edit_projects"
              >
                <i class="icon-edit"></i>
                Edit Project
              </RouterLink>
              <RouterLink :to="`/projects/${project.id}/assignments`" class="dropdown-item">
                <i class="icon-users"></i>
                Assignments
              </RouterLink>
              <RouterLink :to="`/projects/${project.id}/progress`" class="dropdown-item">
                <i class="icon-bar-chart"></i>
                Progress Report
              </RouterLink>
              <button
                @click="archiveProject(project)"
                class="dropdown-item text-danger"
                v-if="userPermissions.can_delete_projects"
              >
                <i class="icon-archive"></i>
                Archive Project
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div class="empty-state" v-else-if="!loading">
      <div class="empty-icon">
        <i class="icon-folder"></i>
      </div>
      <h3>No Projects Found</h3>
      <p>Create your first inspection project to get started with workflow management.</p>
      <RouterLink
        to="/projects/create"
        class="btn btn-primary"
        v-if="userPermissions.can_create_projects"
      >
        Create Project
      </RouterLink>
    </div>

    <!-- Loading State -->
    <div class="loading-state" v-if="loading">
      <div class="spinner"></div>
      <p>Loading projects...</p>
    </div>

    <!-- Pagination -->
    <div class="pagination" v-if="pagination.total > pagination.limit">
      <button
        @click="changePage(pagination.page - 1)"
        :disabled="pagination.page <= 1"
        class="btn btn-outline"
      >
        Previous
      </button>

      <span class="pagination-info">
        Page {{ pagination.page }} of {{ Math.ceil(pagination.total / pagination.limit) }}
      </span>

      <button
        @click="changePage(pagination.page + 1)"
        :disabled="pagination.page >= Math.ceil(pagination.total / pagination.limit)"
        class="btn btn-outline"
      >
        Next
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useWorkflowStore } from '@/stores/workflow'
import { debounce } from 'lodash'

const router = useRouter()
const authStore = useAuthStore()
const workflowStore = useWorkflowStore()

// Reactive data
const projects = ref([])
const loading = ref(false)
const openDropdown = ref(null)

const filters = reactive({
  search: '',
  status: '',
  priority: '',
  type: '',
  manager_id: ''
})

const pagination = reactive({
  page: 1,
  limit: 12,
  total: 0
})

// Computed properties
const userPermissions = computed(() => authStore.userPermissions)

// Debounced search
const debouncedSearch = debounce(() => {
  pagination.page = 1
  loadProjects()
}, 300)

// Methods
const loadProjects = async () => {
  loading.value = true
  try {
    const response = await workflowStore.getProjects({
      ...filters,
      page: pagination.page,
      limit: pagination.limit
    })

    projects.value = response.data
    pagination.total = response.pagination.total
  } catch (error) {
    console.error('Error loading projects:', error)
  } finally {
    loading.value = false
  }
}

const changePage = (page) => {
  pagination.page = page
  loadProjects()
}

const toggleDropdown = (projectId) => {
  openDropdown.value = openDropdown.value === projectId ? null : projectId
}

const archiveProject = async (project) => {
  if (confirm(`Are you sure you want to archive "${project.name}"?`)) {
    try {
      await workflowStore.deleteProject(project.id)
      await loadProjects()
    } catch (error) {
      console.error('Error archiving project:', error)
    }
  }
}

// Utility functions
const formatStatus = (status) => {
  const statusMap = {
    planning: 'Planning',
    active: 'Active',
    review: 'In Review',
    completed: 'Completed',
    cancelled: 'Cancelled'
  }
  return statusMap[status] || status
}

const formatPriority = (priority) => {
  const priorityMap = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    critical: 'Critical'
  }
  return priorityMap[priority] || priority
}

const formatType = (type) => {
  const typeMap = {
    regular: 'Regular',
    safety: 'Safety',
    compliance: 'Compliance',
    audit: 'Audit'
  }
  return typeMap[type] || type
}

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString()
}

const isOverdue = (dueDate) => {
  return new Date(dueDate) < new Date()
}

// Close dropdown when clicking outside
const handleClickOutside = (event) => {
  if (!event.target.closest('.dropdown')) {
    openDropdown.value = null
  }
}

// Lifecycle
onMounted(() => {
  loadProjects()
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.projects-list {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
}

.header-content h1 {
  margin: 0 0 8px 0;
  font-size: 28px;
  font-weight: 600;
  color: #1a1a1a;
}

.header-content p {
  margin: 0;
  color: #666;
  font-size: 16px;
}

.filters-section {
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 24px;
}

.filters-row {
  display: flex;
  gap: 16px;
  align-items: center;
}

.search-box {
  position: relative;
  flex: 1;
  max-width: 400px;
}

.search-input {
  width: 100%;
  padding: 12px 16px 12px 40px;
  border: 1px solid #e1e5e9;
  border-radius: 8px;
  font-size: 14px;
}

.search-box .icon-search {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #666;
}

.filter-group {
  display: flex;
  gap: 12px;
}

.filter-select {
  padding: 12px 16px;
  border: 1px solid #e1e5e9;
  border-radius: 8px;
  font-size: 14px;
  min-width: 140px;
}

.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 24px;
  margin-bottom: 32px;
}

.project-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border-left: 4px solid #e1e5e9;
  transition: all 0.2s ease;
  position: relative;
}

.project-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.project-card.status-active {
  border-left-color: #10b981;
}

.project-card.status-planning {
  border-left-color: #f59e0b;
}

.project-card.status-review {
  border-left-color: #3b82f6;
}

.project-card.status-completed {
  border-left-color: #6b7280;
}

.project-card.priority-critical {
  border-left-color: #ef4444;
}

.project-card.priority-high {
  border-left-color: #f97316;
}

.project-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.project-name {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
}

.project-name a {
  color: #1a1a1a;
  text-decoration: none;
}

.project-name a:hover {
  color: #3b82f6;
}

.project-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #666;
}

.project-code {
  background: #f3f4f6;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 500;
}

.project-status {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-end;
}

.status-badge, .priority-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
}

.status-badge.status-active {
  background: #dcfce7;
  color: #166534;
}

.status-badge.status-planning {
  background: #fef3c7;
  color: #92400e;
}

.status-badge.status-review {
  background: #dbeafe;
  color: #1e40af;
}

.status-badge.status-completed {
  background: #f3f4f6;
  color: #374151;
}

.priority-badge.priority-high {
  background: #fed7aa;
  color: #9a3412;
}

.priority-badge.priority-critical {
  background: #fecaca;
  color: #991b1b;
}

.priority-badge.priority-medium {
  background: #fde68a;
  color: #92400e;
}

.priority-badge.priority-low {
  background: #e5e7eb;
  color: #374151;
}

.project-progress {
  margin-bottom: 16px;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 14px;
}

.progress-label {
  color: #666;
}

.progress-percentage {
  font-weight: 600;
  color: #1a1a1a;
}

.progress-bar {
  height: 6px;
  background: #f3f4f6;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #10b981, #059669);
  transition: width 0.3s ease;
}

.project-stats {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
  padding: 12px 0;
  border-top: 1px solid #f3f4f6;
  border-bottom: 1px solid #f3f4f6;
}

.stat-item {
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
}

.stat-label {
  font-size: 12px;
  color: #666;
  text-transform: uppercase;
}

.project-timeline {
  margin-bottom: 16px;
}

.timeline-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #666;
  margin-bottom: 4px;
}

.timeline-item.overdue {
  color: #ef4444;
}

.project-manager {
  margin-bottom: 16px;
}

.manager-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.manager-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
}

.manager-name {
  font-size: 14px;
  color: #666;
}

.project-actions {
  position: absolute;
  top: 16px;
  right: 16px;
}

.dropdown {
  position: relative;
}

.dropdown-toggle {
  background: none;
  border: none;
  padding: 8px;
  border-radius: 4px;
  cursor: pointer;
  color: #666;
}

.dropdown-toggle:hover {
  background: #f3f4f6;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  background: white;
  border: 1px solid #e1e5e9;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  min-width: 180px;
  z-index: 10;
  opacity: 0;
  visibility: hidden;
  transform: translateY(-8px);
  transition: all 0.2s ease;
}

.dropdown-menu.show {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  text-decoration: none;
  color: #374151;
  font-size: 14px;
  border: none;
  background: none;
  width: 100%;
  text-align: left;
  cursor: pointer;
}

.dropdown-item:hover {
  background: #f9fafb;
}

.dropdown-item.text-danger {
  color: #ef4444;
}

.empty-state {
  text-align: center;
  padding: 64px 32px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.empty-icon {
  font-size: 48px;
  color: #d1d5db;
  margin-bottom: 16px;
}

.empty-state h3 {
  margin: 0 0 8px 0;
  font-size: 20px;
  color: #374151;
}

.empty-state p {
  margin: 0 0 24px 0;
  color: #6b7280;
}

.loading-state {
  text-align: center;
  padding: 64px 32px;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #f3f4f6;
  border-top: 3px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-top: 32px;
}

.pagination-info {
  font-size: 14px;
  color: #666;
}

.btn {
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover {
  background: #2563eb;
}

.btn-outline {
  background: white;
  color: #374151;
  border: 1px solid #d1d5db;
}

.btn-outline:hover {
  background: #f9fafb;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .projects-grid {
    grid-template-columns: 1fr;
  }

  .filters-row {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-group {
    justify-content: space-between;
  }

  .page-header {
    flex-direction: column;
    gap: 16px;
  }
}
</style>