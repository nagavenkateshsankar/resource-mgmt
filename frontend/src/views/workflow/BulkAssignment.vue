<template>
  <div class="bulk-assignment">
    <!-- Page Header -->
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">Bulk Assignment</h1>
        <p class="page-description">Assign multiple inspections to inspectors efficiently</p>
      </div>
      <div class="header-actions">
        <RouterLink to="/assignments" class="btn btn-outline">
          <i class="icon-arrow-left"></i>
          Back to Assignments
        </RouterLink>
      </div>
    </div>

    <form @submit.prevent="submitAssignment" class="assignment-form">
      <!-- Assignment Details -->
      <div class="form-section">
        <h2 class="section-title">Assignment Details</h2>
        <div class="form-grid">
          <div class="form-group">
            <label for="name" class="form-label required">Assignment Name</label>
            <input
              id="name"
              v-model="formData.name"
              type="text"
              class="form-input"
              placeholder="Enter assignment name"
              required
            />
          </div>

          <div class="form-group">
            <label for="project" class="form-label">Project</label>
            <select id="project" v-model="formData.project_id" class="form-select">
              <option value="">Select a project (optional)</option>
              <option
                v-for="project in availableProjects"
                :key="project.id"
                :value="project.id"
              >
                {{ project.name }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label for="priority" class="form-label">Priority</label>
            <select id="priority" v-model="formData.priority" class="form-select">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          <div class="form-group">
            <label for="template" class="form-label required">Template</label>
            <select id="template" v-model="formData.template_id" class="form-select" required>
              <option value="">Select a template</option>
              <option
                v-for="template in availableTemplates"
                :key="template.id"
                :value="template.id"
              >
                {{ template.name }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label for="start_date" class="form-label">Start Date</label>
            <input
              id="start_date"
              v-model="formData.start_date"
              type="datetime-local"
              class="form-input"
            />
          </div>

          <div class="form-group">
            <label for="due_date" class="form-label">Due Date</label>
            <input
              id="due_date"
              v-model="formData.due_date"
              type="datetime-local"
              class="form-input"
            />
          </div>

          <div class="form-group col-span-2">
            <label for="description" class="form-label">Description</label>
            <textarea
              id="description"
              v-model="formData.description"
              class="form-textarea"
              rows="3"
              placeholder="Enter assignment description"
            ></textarea>
          </div>

          <div class="form-group col-span-2">
            <label for="instructions" class="form-label">Instructions</label>
            <textarea
              id="instructions"
              v-model="formData.instructions"
              class="form-textarea"
              rows="4"
              placeholder="Enter specific instructions for inspectors"
            ></textarea>
          </div>
        </div>
      </div>

      <!-- Site Selection -->
      <div class="form-section">
        <h2 class="section-title">Site Selection</h2>
        <div class="site-selection">
          <div class="search-filter">
            <input
              v-model="siteSearch"
              type="text"
              placeholder="Search sites..."
              class="search-input"
            />
            <div class="filter-buttons">
              <button
                type="button"
                @click="selectAllSites"
                class="btn btn-outline btn-sm"
              >
                Select All
              </button>
              <button
                type="button"
                @click="clearSiteSelection"
                class="btn btn-outline btn-sm"
              >
                Clear All
              </button>
            </div>
          </div>

          <div class="sites-grid">
            <div
              v-for="site in filteredSites"
              :key="site.id"
              class="site-card"
              :class="{ 'selected': selectedSites.includes(site.id) }"
              @click="toggleSiteSelection(site.id)"
            >
              <div class="site-header">
                <div class="site-info">
                  <h4 class="site-name">{{ site.name }}</h4>
                  <p class="site-address">{{ site.address }}</p>
                </div>
                <div class="site-checkbox">
                  <input
                    type="checkbox"
                    :checked="selectedSites.includes(site.id)"
                    @change="toggleSiteSelection(site.id)"
                    @click.stop
                  />
                </div>
              </div>
              <div class="site-meta">
                <span class="site-type">{{ site.type }}</span>
                <span class="site-status" :class="`status-${site.status}`">
                  {{ site.status }}
                </span>
              </div>
            </div>
          </div>

          <div v-if="filteredSites.length === 0" class="empty-sites">
            <p>No sites found matching your search criteria.</p>
          </div>
        </div>
      </div>

      <!-- Inspector Assignment -->
      <div class="form-section">
        <h2 class="section-title">Inspector Assignment</h2>
        <div class="assignment-strategy">
          <div class="strategy-selector">
            <label class="radio-option">
              <input
                type="radio"
                value="manual"
                v-model="assignmentStrategy"
                @change="resetInspectorAssignments"
              />
              <span>Manual Assignment</span>
            </label>
            <label class="radio-option">
              <input
                type="radio"
                value="auto"
                v-model="assignmentStrategy"
                @change="autoAssignInspectors"
              />
              <span>Auto Assignment (by workload)</span>
            </label>
            <label class="radio-option">
              <input
                type="radio"
                value="equal"
                v-model="assignmentStrategy"
                @change="equalDistribution"
              />
              <span>Equal Distribution</span>
            </label>
          </div>

          <!-- Manual Assignment -->
          <div v-if="assignmentStrategy === 'manual'" class="manual-assignment">
            <div class="inspector-assignments">
              <div
                v-for="(assignment, index) in inspectorAssignments"
                :key="index"
                class="assignment-row"
              >
                <div class="inspector-select">
                  <select
                    v-model="assignment.inspector_id"
                    class="form-select"
                    @change="updateAssignmentSites(index)"
                  >
                    <option value="">Select Inspector</option>
                    <option
                      v-for="inspector in availableInspectors"
                      :key="inspector.id"
                      :value="inspector.id"
                    >
                      {{ inspector.name }} ({{ getInspectorWorkload(inspector.id) }})
                    </option>
                  </select>
                </div>

                <div class="site-assignment">
                  <div class="assigned-sites">
                    <span v-if="assignment.site_ids.length === 0" class="no-sites">
                      No sites assigned
                    </span>
                    <div v-else class="site-tags">
                      <span
                        v-for="siteId in assignment.site_ids"
                        :key="siteId"
                        class="site-tag"
                      >
                        {{ getSiteName(siteId) }}
                        <button
                          type="button"
                          @click="removeSiteFromAssignment(index, siteId)"
                          class="remove-site"
                        >
                          ×
                        </button>
                      </span>
                    </div>
                  </div>

                  <select
                    @change="addSiteToAssignment(index, $event.target.value)"
                    class="form-select site-selector"
                  >
                    <option value="">Add site...</option>
                    <option
                      v-for="siteId in getUnassignedSites(index)"
                      :key="siteId"
                      :value="siteId"
                    >
                      {{ getSiteName(siteId) }}
                    </option>
                  </select>
                </div>

                <button
                  type="button"
                  @click="removeInspectorAssignment(index)"
                  class="btn btn-danger btn-sm"
                  v-if="inspectorAssignments.length > 1"
                >
                  <i class="icon-trash"></i>
                </button>
              </div>
            </div>

            <button
              type="button"
              @click="addInspectorAssignment"
              class="btn btn-outline"
            >
              <i class="icon-plus"></i>
              Add Inspector
            </button>
          </div>

          <!-- Auto Assignment Display -->
          <div v-else class="auto-assignment-display">
            <div class="assignment-summary">
              <h4>Assignment Summary</h4>
              <div class="summary-grid">
                <div
                  v-for="assignment in inspectorAssignments"
                  :key="assignment.inspector_id"
                  class="summary-item"
                >
                  <div class="inspector-info">
                    <img
                      :src="getInspectorAvatar(assignment.inspector_id)"
                      :alt="getInspectorName(assignment.inspector_id)"
                      class="inspector-avatar"
                    />
                    <div>
                      <h5>{{ getInspectorName(assignment.inspector_id) }}</h5>
                      <p>{{ assignment.site_ids.length }} sites assigned</p>
                    </div>
                  </div>
                  <div class="workload-info">
                    <span class="workload-text">
                      {{ getInspectorWorkload(assignment.inspector_id) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Assignment Options -->
      <div class="form-section">
        <h2 class="section-title">Assignment Options</h2>
        <div class="options-grid">
          <div class="form-group">
            <label for="estimated_hours" class="form-label">Estimated Hours per Site</label>
            <input
              id="estimated_hours"
              v-model.number="formData.estimated_hours"
              type="number"
              min="1"
              max="24"
              class="form-input"
            />
          </div>

          <div class="form-group">
            <label class="checkbox-label">
              <input
                type="checkbox"
                v-model="formData.requires_acceptance"
              />
              <span>Requires Inspector Acceptance</span>
            </label>
          </div>

          <div class="form-group">
            <label class="checkbox-label">
              <input
                type="checkbox"
                v-model="formData.allow_reassignment"
              />
              <span>Allow Reassignment</span>
            </label>
          </div>

          <div class="form-group">
            <label class="checkbox-label">
              <input
                type="checkbox"
                v-model="formData.notify_on_overdue"
              />
              <span>Notify on Overdue</span>
            </label>
          </div>
        </div>
      </div>

      <!-- Form Actions -->
      <div class="form-actions">
        <button type="button" @click="saveDraft" class="btn btn-outline">
          Save as Draft
        </button>
        <button
          type="submit"
          class="btn btn-primary"
          :disabled="!canSubmit || loading"
        >
          <span v-if="loading" class="loading-spinner"></span>
          {{ loading ? 'Creating...' : 'Create Assignment' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useWorkflowStore } from '@/stores/workflow'
import { useSitesStore } from '@/stores/sites'
import { useTemplateStore } from '@/stores/templates'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const workflowStore = useWorkflowStore()
const sitesStore = useSitesStore()
const templateStore = useTemplateStore()
const authStore = useAuthStore()

// Reactive data
const loading = ref(false)
const siteSearch = ref('')
const assignmentStrategy = ref('manual')

const formData = reactive({
  name: '',
  description: '',
  project_id: '',
  priority: 'medium',
  template_id: '',
  start_date: '',
  due_date: '',
  instructions: '',
  estimated_hours: 4,
  requires_acceptance: true,
  allow_reassignment: true,
  notify_on_overdue: true
})

const selectedSites = ref([])
const inspectorAssignments = ref([
  {
    inspector_id: '',
    site_ids: []
  }
])

// Data sources
const availableProjects = ref([])
const availableTemplates = ref([])
const availableSites = ref([])
const availableInspectors = ref([])
const inspectorWorkloads = ref([])

// Computed properties
const filteredSites = computed(() => {
  if (!siteSearch.value) return availableSites.value

  return availableSites.value.filter(site =>
    site.name.toLowerCase().includes(siteSearch.value.toLowerCase()) ||
    site.address.toLowerCase().includes(siteSearch.value.toLowerCase())
  )
})

const canSubmit = computed(() => {
  return (
    formData.name &&
    formData.template_id &&
    selectedSites.value.length > 0 &&
    inspectorAssignments.value.some(a => a.inspector_id && a.site_ids.length > 0)
  )
})

// Methods
const loadData = async () => {
  loading.value = true
  try {
    await Promise.all([
      loadProjects(),
      loadTemplates(),
      loadSites(),
      loadInspectors(),
      loadWorkloads()
    ])
  } catch (error) {
    console.error('Error loading data:', error)
  } finally {
    loading.value = false
  }
}

const loadProjects = async () => {
  try {
    const response = await workflowStore.getProjects({ status: 'active' })
    availableProjects.value = response.data || []
  } catch (error) {
    console.error('Error loading projects:', error)
  }
}

const loadTemplates = async () => {
  try {
    const response = await templateStore.getTemplates()
    availableTemplates.value = response.data || []
  } catch (error) {
    console.error('Error loading templates:', error)
  }
}

const loadSites = async () => {
  try {
    const response = await sitesStore.getSites()
    availableSites.value = response.data || []
  } catch (error) {
    console.error('Error loading sites:', error)
  }
}

const loadInspectors = async () => {
  try {
    // This would need to be implemented in the auth/user store
    // For now, using mock data
    availableInspectors.value = []
  } catch (error) {
    console.error('Error loading inspectors:', error)
  }
}

const loadWorkloads = async () => {
  try {
    const response = await workflowStore.getWorkloads()
    inspectorWorkloads.value = response.data || []
  } catch (error) {
    console.error('Error loading workloads:', error)
  }
}

// Site selection methods
const toggleSiteSelection = (siteId) => {
  const index = selectedSites.value.indexOf(siteId)
  if (index > -1) {
    selectedSites.value.splice(index, 1)
    // Remove from all inspector assignments
    inspectorAssignments.value.forEach(assignment => {
      const siteIndex = assignment.site_ids.indexOf(siteId)
      if (siteIndex > -1) {
        assignment.site_ids.splice(siteIndex, 1)
      }
    })
  } else {
    selectedSites.value.push(siteId)
  }
}

const selectAllSites = () => {
  selectedSites.value = [...filteredSites.value.map(site => site.id)]
}

const clearSiteSelection = () => {
  selectedSites.value = []
  inspectorAssignments.value.forEach(assignment => {
    assignment.site_ids = []
  })
}

// Inspector assignment methods
const addInspectorAssignment = () => {
  inspectorAssignments.value.push({
    inspector_id: '',
    site_ids: []
  })
}

const removeInspectorAssignment = (index) => {
  const assignment = inspectorAssignments.value[index]
  // Return sites to selected pool
  assignment.site_ids.forEach(siteId => {
    if (!selectedSites.value.includes(siteId)) {
      selectedSites.value.push(siteId)
    }
  })
  inspectorAssignments.value.splice(index, 1)
}

const updateAssignmentSites = (index) => {
  // Clear existing sites for this assignment
  inspectorAssignments.value[index].site_ids = []
}

const addSiteToAssignment = (assignmentIndex, siteId) => {
  if (siteId && !inspectorAssignments.value[assignmentIndex].site_ids.includes(siteId)) {
    inspectorAssignments.value[assignmentIndex].site_ids.push(siteId)
  }
}

const removeSiteFromAssignment = (assignmentIndex, siteId) => {
  const assignment = inspectorAssignments.value[assignmentIndex]
  const index = assignment.site_ids.indexOf(siteId)
  if (index > -1) {
    assignment.site_ids.splice(index, 1)
  }
}

const getUnassignedSites = (currentAssignmentIndex) => {
  const assignedSites = new Set()

  inspectorAssignments.value.forEach((assignment, index) => {
    if (index !== currentAssignmentIndex) {
      assignment.site_ids.forEach(siteId => assignedSites.add(siteId))
    }
  })

  return selectedSites.value.filter(siteId => !assignedSites.has(siteId))
}

const resetInspectorAssignments = () => {
  inspectorAssignments.value = [
    {
      inspector_id: '',
      site_ids: []
    }
  ]
}

const autoAssignInspectors = () => {
  // Auto-assign based on workload
  const availableInspectorsList = getAvailableInspectorsSorted()
  const sitesPerInspector = Math.ceil(selectedSites.value.length / availableInspectorsList.length)

  inspectorAssignments.value = []

  let siteIndex = 0
  availableInspectorsList.forEach(inspector => {
    const sitesToAssign = selectedSites.value.slice(siteIndex, siteIndex + sitesPerInspector)
    if (sitesToAssign.length > 0) {
      inspectorAssignments.value.push({
        inspector_id: inspector.id,
        site_ids: [...sitesToAssign]
      })
      siteIndex += sitesPerInspector
    }
  })
}

const equalDistribution = () => {
  // Distribute sites equally among available inspectors
  const availableInspectorsList = getAvailableInspectorsSorted()
  inspectorAssignments.value = []

  availableInspectorsList.forEach((inspector, index) => {
    inspectorAssignments.value.push({
      inspector_id: inspector.id,
      site_ids: []
    })
  })

  // Distribute sites round-robin
  selectedSites.value.forEach((siteId, index) => {
    const assignmentIndex = index % inspectorAssignments.value.length
    inspectorAssignments.value[assignmentIndex].site_ids.push(siteId)
  })
}

const getAvailableInspectorsSorted = () => {
  return availableInspectors.value
    .filter(inspector => {
      const workload = getInspectorWorkloadData(inspector.id)
      return workload?.is_available && workload.current_daily_load < workload.max_daily_inspections
    })
    .sort((a, b) => {
      const workloadA = getInspectorWorkloadData(a.id)
      const workloadB = getInspectorWorkloadData(b.id)
      return (workloadA?.current_daily_load || 0) - (workloadB?.current_daily_load || 0)
    })
}

// Utility methods
const getSiteName = (siteId) => {
  const site = availableSites.value.find(s => s.id === siteId)
  return site?.name || 'Unknown Site'
}

const getInspectorName = (inspectorId) => {
  const inspector = availableInspectors.value.find(i => i.id === inspectorId)
  return inspector?.name || 'Unknown Inspector'
}

const getInspectorAvatar = (inspectorId) => {
  const inspector = availableInspectors.value.find(i => i.id === inspectorId)
  return inspector?.avatar_url || '/default-avatar.png'
}

const getInspectorWorkload = (inspectorId) => {
  const workload = getInspectorWorkloadData(inspectorId)
  if (!workload) return 'No data'

  const capacity = Math.round((workload.current_daily_load / workload.max_daily_inspections) * 100)
  return `${workload.current_daily_load}/${workload.max_daily_inspections} (${capacity}%)`
}

const getInspectorWorkloadData = (inspectorId) => {
  return inspectorWorkloads.value.find(w => w.inspector_id === inspectorId)
}

// Form submission
const submitAssignment = async () => {
  if (!canSubmit.value) return

  loading.value = true
  try {
    const assignmentData = {
      ...formData,
      site_ids: selectedSites.value,
      inspector_assignments: inspectorAssignments.value.filter(a =>
        a.inspector_id && a.site_ids.length > 0
      )
    }

    await workflowStore.createBulkAssignment(assignmentData)
    router.push('/assignments')
  } catch (error) {
    console.error('Error creating assignment:', error)
  } finally {
    loading.value = false
  }
}

const saveDraft = () => {
  // Save to localStorage for draft functionality
  localStorage.setItem('bulk_assignment_draft', JSON.stringify({
    formData,
    selectedSites: selectedSites.value,
    inspectorAssignments: inspectorAssignments.value,
    assignmentStrategy: assignmentStrategy.value
  }))

  // Show success message
  alert('Draft saved successfully!')
}

// Load draft on mount
const loadDraft = () => {
  const draft = localStorage.getItem('bulk_assignment_draft')
  if (draft) {
    try {
      const parsed = JSON.parse(draft)
      Object.assign(formData, parsed.formData)
      selectedSites.value = parsed.selectedSites || []
      inspectorAssignments.value = parsed.inspectorAssignments || [{ inspector_id: '', site_ids: [] }]
      assignmentStrategy.value = parsed.assignmentStrategy || 'manual'
    } catch (error) {
      console.error('Error loading draft:', error)
    }
  }
}

// Lifecycle
onMounted(() => {
  loadData()
  loadDraft()
})

// Watch for site selection changes to update assignments
watch(selectedSites, (newSites, oldSites) => {
  // Remove unselected sites from assignments
  const removedSites = oldSites.filter(site => !newSites.includes(site))
  removedSites.forEach(siteId => {
    inspectorAssignments.value.forEach(assignment => {
      const index = assignment.site_ids.indexOf(siteId)
      if (index > -1) {
        assignment.site_ids.splice(index, 1)
      }
    })
  })
}, { deep: true })
</script>

<style scoped>
.bulk-assignment {
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
  color: hsl(var(--foreground));
}

.header-content p {
  margin: 0;
  color: hsl(var(--muted-foreground));
  font-size: 16px;
}

.assignment-form {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.form-section {
  background: hsl(var(--background));
  border-radius: 12px;
  padding: 24px;
  box-shadow: var(--shadow);
  border: 1px solid hsl(var(--border));
}

.section-title {
  margin: 0 0 20px 0;
  font-size: 20px;
  font-weight: 600;
  color: hsl(var(--foreground));
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.form-grid .col-span-2 {
  grid-column: span 2;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-label {
  margin-bottom: 8px;
  font-weight: 500;
  color: hsl(var(--foreground));
}

.form-label.required::after {
  content: ' *';
  color: hsl(var(--destructive));
}

.form-input,
.form-select,
.form-textarea {
  padding: 12px 16px;
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  font-size: 14px;
  background: hsl(var(--background));
  color: hsl(var(--foreground));
  transition: border-color 0.2s ease;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  outline: none;
  border-color: hsl(var(--primary));
  box-shadow: 0 0 0 3px hsl(var(--primary) / 0.1);
}

.site-selection {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.search-filter {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.search-input {
  flex: 1;
  max-width: 400px;
  padding: 12px 16px;
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  font-size: 14px;
  background: hsl(var(--background));
  color: hsl(var(--foreground));
}

.filter-buttons {
  display: flex;
  gap: 8px;
}

.sites-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  max-height: 400px;
  overflow-y: auto;
}

.site-card {
  border: 2px solid hsl(var(--border));
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: hsl(var(--background));
}

.site-card:hover {
  border-color: hsl(var(--primary));
}

.site-card.selected {
  border-color: hsl(var(--primary));
  background: hsl(var(--primary) / 0.1);
}

.site-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.site-name {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: hsl(var(--foreground));
}

.site-address {
  margin: 0;
  font-size: 14px;
  color: hsl(var(--muted-foreground));
}

.site-meta {
  display: flex;
  gap: 8px;
  font-size: 12px;
}

.site-type {
  background: hsl(var(--muted));
  padding: 2px 8px;
  border-radius: 4px;
  color: hsl(var(--muted-foreground));
}

.site-status {
  padding: 2px 8px;
  border-radius: 4px;
  text-transform: uppercase;
  font-weight: 500;
}

.site-status.status-active {
  background: hsl(var(--success) / 0.1);
  color: hsl(var(--success));
}

.strategy-selector {
  display: flex;
  gap: 24px;
  margin-bottom: 20px;
}

.radio-option {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.radio-option input[type="radio"] {
  margin: 0;
}

.manual-assignment {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.inspector-assignments {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.assignment-row {
  display: grid;
  grid-template-columns: 250px 1fr auto;
  gap: 16px;
  align-items: flex-start;
  padding: 16px;
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  background: hsl(var(--background));
}

.assigned-sites {
  min-height: 40px;
}

.site-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.site-tag {
  background: hsl(var(--primary) / 0.1);
  color: hsl(var(--primary));
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.remove-site {
  background: none;
  border: none;
  color: hsl(var(--destructive));
  cursor: pointer;
  font-size: 14px;
  padding: 0;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.site-selector {
  margin-top: 8px;
}

.no-sites {
  color: hsl(var(--muted-foreground));
  font-style: italic;
  font-size: 14px;
}

.auto-assignment-display {
  margin-top: 20px;
}

.assignment-summary h4 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  background: hsl(var(--background));
}

.inspector-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.inspector-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}

.inspector-info h5 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: hsl(var(--foreground));
}

.inspector-info p {
  margin: 0;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

.workload-info {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

.options-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  margin: 0;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  padding: 20px 0;
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
  background: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
}

.btn-primary:hover:not(:disabled) {
  background: hsl(var(--primary) / 0.9);
}

.btn-outline {
  background: hsl(var(--background));
  color: hsl(var(--foreground));
  border: 1px solid hsl(var(--border));
}

.btn-outline:hover {
  background: hsl(var(--muted));
}

.btn-danger {
  background: hsl(var(--destructive));
  color: hsl(var(--destructive-foreground));
}

.btn-danger:hover {
  background: hsl(var(--destructive) / 0.9);
}

.btn-sm {
  padding: 8px 16px;
  font-size: 12px;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid hsl(var(--primary-foreground) / 0.5);
  border-top: 2px solid hsl(var(--primary-foreground));
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.empty-sites {
  text-align: center;
  padding: 40px;
  color: hsl(var(--muted-foreground));
  font-style: italic;
}

@media (max-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr;
  }

  .form-grid .col-span-2 {
    grid-column: span 1;
  }

  .assignment-row {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .search-filter {
    flex-direction: column;
    align-items: stretch;
  }

  .strategy-selector {
    flex-direction: column;
    gap: 12px;
  }

  .page-header {
    flex-direction: column;
    gap: 16px;
  }

  .form-actions {
    flex-direction: column;
  }
}
</style>