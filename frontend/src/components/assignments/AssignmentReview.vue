<template>
  <div class="assignment-review">
    <!-- Review Summary -->
    <div class="review-summary">
      <h3 class="summary-title">Assignment Summary</h3>
      <div class="summary-grid">
        <div class="summary-card">
          <div class="summary-icon">
            <BuildingOfficeIcon class="icon-lg text-primary" />
          </div>
          <div class="summary-content">
            <span class="summary-label">Sites Selected</span>
            <span class="summary-value">{{ selectedSites.length }}</span>
          </div>
        </div>

        <div class="summary-card">
          <div class="summary-icon">
            <DocumentTextIcon class="icon-lg text-success" />
          </div>
          <div class="summary-content">
            <span class="summary-label">Templates Selected</span>
            <span class="summary-value">{{ selectedTemplates.length }}</span>
          </div>
        </div>

        <div class="summary-card">
          <div class="summary-icon">
            <ClipboardDocumentListIcon class="icon-lg text-secondary" />
          </div>
          <div class="summary-content">
            <span class="summary-label">Total Assignments</span>
            <span class="summary-value">{{ estimatedCount }}</span>
          </div>
        </div>

        <div class="summary-card">
          <div class="summary-icon">
            <ArrowPathIcon class="icon-lg text-warning" />
          </div>
          <div class="summary-content">
            <span class="summary-label">Workflow Type</span>
            <span class="summary-value">{{ workflowTypeLabel }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Selected Sites Preview -->
    <div class="review-section">
      <h3 class="section-title">
        <BuildingOfficeIcon class="icon-sm" />
        Selected Sites ({{ selectedSites.length }})
      </h3>
      <div class="sites-preview">
        <div
          v-for="site in selectedSites"
          :key="site.id"
          class="preview-item site-item"
        >
          <div class="item-info">
            <h4 class="item-name">{{ site.name }}</h4>
            <p class="item-detail">{{ site.address }}</p>
          </div>
          <div class="item-meta">
            <span class="meta-id">#{{ site.id.slice(-8) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Selected Templates Preview -->
    <div class="review-section">
      <h3 class="section-title">
        <DocumentTextIcon class="icon-sm" />
        Selected Templates ({{ selectedTemplates.length }})
      </h3>
      <div class="templates-preview">
        <div
          v-for="template in selectedTemplates"
          :key="template.id"
          class="preview-item template-item"
        >
          <div class="item-info">
            <h4 class="item-name">{{ template.name }}</h4>
            <p class="item-detail">{{ template.description || 'No description available' }}</p>
          </div>
          <div class="item-meta">
            <span class="meta-badge version-badge">v{{ template.version }}</span>
            <span class="meta-badge field-badge">{{ template.fields?.length || 0 }} fields</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Assignment Configuration -->
    <div class="review-section">
      <h3 class="section-title">
        <CogIcon class="icon-sm" />
        Assignment Configuration
      </h3>
      <div class="config-form">
        <div class="form-group">
          <label for="due-date" class="form-label">Due Date (Optional)</label>
          <input
            id="due-date"
            v-model="dueDate"
            type="date"
            class="form-input"
            :min="today"
          />
          <p class="form-help">Set a deadline for these assignments</p>
        </div>

        <div class="form-group">
          <label for="assigned-to" class="form-label">Assign To (Optional)</label>
          <input
            id="assigned-to"
            v-model="assignedTo"
            type="text"
            placeholder="Enter assignee name or email"
            class="form-input"
          />
          <p class="form-help">Leave blank to assign later</p>
        </div>

        <div class="form-group">
          <label for="notes" class="form-label">Notes (Optional)</label>
          <textarea
            id="notes"
            v-model="notes"
            placeholder="Add any additional notes or instructions for these assignments..."
            class="form-textarea"
            rows="3"
          ></textarea>
          <p class="form-help">These notes will be included with each assignment</p>
        </div>
      </div>
    </div>

    <!-- Assignment Matrix Preview -->
    <div class="review-section">
      <h3 class="section-title">
        <TableCellsIcon class="icon-sm" />
        Assignment Matrix Preview
      </h3>
      <div class="matrix-preview">
        <div class="matrix-info">
          <p class="matrix-description">
            The following {{ estimatedCount }} assignments will be created:
          </p>
        </div>

        <div class="matrix-table-container">
          <table class="matrix-table">
            <thead>
              <tr>
                <th class="matrix-header">Site</th>
                <th class="matrix-header">Template</th>
                <th class="matrix-header">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(assignment, index) in assignmentMatrix"
                :key="`${assignment.siteId}-${assignment.templateId}`"
                class="matrix-row"
                :class="{ 'row-alternate': index % 2 === 1 }"
              >
                <td class="matrix-cell">
                  <div class="cell-content">
                    <span class="cell-name">{{ assignment.siteName }}</span>
                    <span class="cell-detail">{{ assignment.siteAddress }}</span>
                  </div>
                </td>
                <td class="matrix-cell">
                  <div class="cell-content">
                    <span class="cell-name">{{ assignment.templateName }}</span>
                    <span class="cell-detail">v{{ assignment.templateVersion }}</span>
                  </div>
                </td>
                <td class="matrix-cell">
                  <span class="status-badge status-pending">Pending</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="assignmentMatrix.length > 10" class="matrix-truncated">
          <p>Showing first 10 assignments. {{ assignmentMatrix.length - 10 }} more will be created.</p>
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="review-actions">
      <button @click="$emit('back')" class="btn btn-secondary btn-lg">
        <ArrowLeftIcon class="icon-sm" />
        Back to Selection
      </button>
      <button
        @click="handleCreateAssignments"
        :disabled="isCreating"
        class="btn btn-primary btn-lg"
      >
        <template v-if="isCreating">
          <div class="button-spinner"></div>
          Creating Assignments...
        </template>
        <template v-else>
          <CheckIcon class="icon-sm" />
          Create {{ estimatedCount }} Assignments
        </template>
      </button>
    </div>

    <!-- Creation Progress -->
    <div v-if="isCreating" class="creation-progress">
      <div class="progress-content">
        <div class="progress-icon">
          <div class="progress-spinner"></div>
        </div>
        <div class="progress-text">
          <h4>Creating Assignments...</h4>
          <p>Please wait while we create {{ estimatedCount }} assignments for you.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Site, Template } from '@/stores/assignment'
import {
  BuildingOfficeIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  ArrowPathIcon,
  CogIcon,
  TableCellsIcon,
  ArrowLeftIcon,
  CheckIcon
} from '@heroicons/vue/24/outline'

// Props
interface Props {
  selectedSites: Site[]
  selectedTemplates: Template[]
  workflowType: 'site_first' | 'inspection_first' | null
  estimatedCount: number
  isCreating: boolean
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  back: []
  'create-assignments': [data: {
    due_date?: string
    assigned_to?: string
    notes?: string
  }]
}>()

// Local state
const dueDate = ref('')
const assignedTo = ref('')
const notes = ref('')

// Computed
const today = computed(() => {
  return new Date().toISOString().split('T')[0]
})

const workflowTypeLabel = computed(() => {
  switch (props.workflowType) {
    case 'site_first':
      return 'Site-First'
    case 'inspection_first':
      return 'Inspection-First'
    default:
      return 'Unknown'
  }
})

const assignmentMatrix = computed(() => {
  const matrix: Array<{
    siteId: string
    siteName: string
    siteAddress: string
    templateId: string
    templateName: string
    templateVersion: string
  }> = []

  props.selectedSites.forEach(site => {
    props.selectedTemplates.forEach(template => {
      matrix.push({
        siteId: site.id,
        siteName: site.name,
        siteAddress: site.address,
        templateId: template.id,
        templateName: template.name,
        templateVersion: template.version
      })
    })
  })

  // Return only first 10 for preview
  return matrix.slice(0, 10)
})

// Methods
const handleCreateAssignments = () => {
  const assignmentData: any = {}

  if (dueDate.value) {
    assignmentData.due_date = dueDate.value
  }

  if (assignedTo.value.trim()) {
    assignmentData.assigned_to = assignedTo.value.trim()
  }

  if (notes.value.trim()) {
    assignmentData.notes = notes.value.trim()
  }

  emit('create-assignments', assignmentData)
}
</script>

<style scoped>
.assignment-review {
  max-width: 100%;
}

/* Review Summary */
.review-summary {
  margin-bottom: 2rem;
}

.summary-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: hsl(var(--foreground));
  margin-bottom: 1rem;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.summary-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  border-radius: 0.75rem;
  box-shadow: var(--shadow-sm);
}

.summary-icon {
  flex-shrink: 0;
}

.summary-content {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.summary-label {
  font-size: 0.875rem;
  color: hsl(var(--muted-foreground));
  font-weight: 500;
}

.summary-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: hsl(var(--foreground));
}

/* Review Sections */
.review-section {
  margin-bottom: 2rem;
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  border-radius: 0.75rem;
  padding: 1.5rem;
  box-shadow: var(--shadow-sm);
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.125rem;
  font-weight: 600;
  color: hsl(var(--foreground));
  margin-bottom: 1rem;
}

/* Preview Items */
.sites-preview,
.templates-preview {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-height: 300px;
  overflow-y: auto;
}

.preview-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 1rem;
  border: 1px solid hsl(var(--border));
  border-radius: 0.5rem;
  background: hsl(var(--muted));
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: hsl(var(--foreground));
  margin: 0 0 0.25rem 0;
}

.item-detail {
  font-size: 0.75rem;
  color: hsl(var(--muted-foreground));
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.item-meta {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-shrink: 0;
  margin-left: 1rem;
}

.meta-id {
  font-size: 0.75rem;
  color: hsl(var(--muted-foreground));
  background: hsl(var(--muted));
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-family: monospace;
}

.meta-badge {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-weight: 500;
}

.version-badge {
  background: hsl(var(--primary) / 0.1);
  color: hsl(var(--primary));
}

.field-badge {
  background: hsl(var(--success) / 0.1);
  color: hsl(var(--success));
}

/* Configuration Form */
.config-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: hsl(var(--foreground));
}

.form-input,
.form-textarea {
  padding: 0.75rem;
  border: 1px solid hsl(var(--border));
  border-radius: 0.5rem;
  font-size: 0.875rem;
  background: hsl(var(--background));
  color: hsl(var(--foreground));
  transition: border-color 0.2s;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: hsl(var(--primary));
  ring: 2px;
  ring-color: hsl(var(--primary));
  ring-opacity: 0.2;
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

.form-help {
  font-size: 0.75rem;
  color: hsl(var(--muted-foreground));
  margin: 0;
}

/* Matrix Preview */
.matrix-preview {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.matrix-description {
  color: hsl(var(--muted-foreground));
  margin: 0;
}

.matrix-table-container {
  overflow-x: auto;
  border-radius: 0.5rem;
  border: 1px solid hsl(var(--border));
}

.matrix-table {
  width: 100%;
  border-collapse: collapse;
  background: hsl(var(--background));
}

.matrix-header {
  background: hsl(var(--muted));
  padding: 0.75rem;
  text-align: left;
  font-size: 0.875rem;
  font-weight: 600;
  color: hsl(var(--foreground));
  border-bottom: 1px solid hsl(var(--border));
}

.matrix-row:hover {
  background: hsl(var(--muted));
}

.row-alternate {
  background: hsl(var(--muted) / 0.5);
}

.matrix-cell {
  padding: 0.75rem;
  border-bottom: 1px solid hsl(var(--border));
  font-size: 0.875rem;
}

.cell-content {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.cell-name {
  font-weight: 500;
  color: hsl(var(--foreground));
}

.cell-detail {
  font-size: 0.75rem;
  color: hsl(var(--muted-foreground));
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

.status-pending {
  background: hsl(var(--warning) / 0.1);
  color: hsl(var(--warning));
}

.matrix-truncated {
  text-align: center;
  padding: 1rem;
  background: hsl(var(--muted));
  border-radius: 0.5rem;
  color: hsl(var(--muted-foreground));
  font-size: 0.875rem;
}

.matrix-truncated p {
  margin: 0;
}

/* Actions */
.review-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid hsl(var(--border));
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

/* Creation Progress */
.creation-progress {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: hsl(var(--background) / 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.progress-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  text-align: center;
  padding: 2rem;
  background: hsl(var(--background));
  border-radius: 1rem;
  box-shadow: var(--shadow-lg);
  border: 1px solid hsl(var(--border));
}

.progress-spinner {
  width: 3rem;
  height: 3rem;
  border: 4px solid hsl(var(--muted));
  border-top: 4px solid hsl(var(--primary));
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.progress-text h4 {
  font-size: 1.25rem;
  font-weight: 600;
  color: hsl(var(--foreground));
  margin: 0 0 0.5rem 0;
}

.progress-text p {
  color: hsl(var(--muted-foreground));
  margin: 0;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Responsive */
@media (max-width: 768px) {
  .summary-grid {
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  }

  .summary-card {
    padding: 1rem;
    flex-direction: column;
    text-align: center;
    gap: 0.75rem;
  }

  .review-section {
    padding: 1rem;
  }

  .preview-item {
    flex-direction: column;
    gap: 0.75rem;
    align-items: flex-start;
  }

  .item-meta {
    margin-left: 0;
    align-self: flex-start;
  }

  .matrix-table-container {
    font-size: 0.75rem;
  }

  .matrix-cell {
    padding: 0.5rem;
  }

  .review-actions {
    flex-direction: column-reverse;
    gap: 1rem;
  }

  .review-actions .btn {
    width: 100%;
  }

  .progress-content {
    margin: 1rem;
    padding: 1.5rem;
  }
}
</style>