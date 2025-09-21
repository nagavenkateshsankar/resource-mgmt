<template>
  <div class="inspection-status-workflow">
    <div class="status-header">
      <h4 class="status-title">Inspection Status</h4>
      <span class="current-status-badge" :class="`status-${currentStatus}`">
        {{ getStatusDisplayName(currentStatus) }}
      </span>
    </div>

    <!-- Status Workflow Steps -->
    <div class="status-workflow">
      <div
        v-for="(step, index) in workflowSteps"
        :key="step.status"
        class="workflow-step"
        :class="{
          'step-completed': isStepCompleted(step.status),
          'step-current': step.status === currentStatus,
          'step-upcoming': isStepUpcoming(step.status)
        }"
      >
        <div class="step-indicator">
          <CheckIcon v-if="isStepCompleted(step.status)" class="icon-sm text-success" />
          <ClockIcon v-else-if="step.status === currentStatus" class="icon-sm text-primary" />
          <span v-else class="step-number">{{ index + 1 }}</span>
        </div>
        <div class="step-content">
          <div class="step-name">{{ step.name }}</div>
          <div class="step-description">{{ step.description }}</div>
        </div>
      </div>
    </div>

    <!-- Action Buttons -->
    <div v-if="canTransition" class="status-actions">
      <h5 class="actions-title">Available Actions</h5>
      <div class="actions-buttons">
        <button
          v-for="action in availableActions"
          :key="action.toStatus"
          @click="handleStatusTransition(action.toStatus)"
          :class="['btn', action.buttonClass]"
          :disabled="isUpdating"
        >
          <component :is="action.icon" class="icon-sm" />
          {{ action.label }}
        </button>
      </div>
    </div>

    <!-- Status History -->
    <div v-if="statusHistory.length > 0" class="status-history">
      <h5 class="history-title">Status History</h5>
      <div class="history-list">
        <div
          v-for="entry in statusHistory"
          :key="entry.id"
          class="history-entry"
        >
          <div class="history-status">
            <span class="status-badge" :class="`status-${entry.status}`">
              {{ getStatusDisplayName(entry.status) }}
            </span>
          </div>
          <div class="history-details">
            <div class="history-user">{{ entry.user_name }}</div>
            <div class="history-date">{{ formatDate(entry.created_at) }}</div>
            <div v-if="entry.notes" class="history-notes">{{ entry.notes }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  CheckIcon,
  ClockIcon,
  PlayIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
  PencilIcon
} from '@heroicons/vue/24/outline'
import { apiUtils } from '@/utils/api'

// Props
interface Props {
  inspectionId: string
  currentStatus: string
  userRole: string
  canEdit: boolean
}
const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  statusUpdated: [newStatus: string]
}>()

// State
const isUpdating = ref(false)
const statusHistory = ref<Array<any>>([])

// Workflow Configuration
const workflowSteps = [
  {
    status: 'draft',
    name: 'Draft',
    description: 'Inspection form created but not started'
  },
  {
    status: 'in_progress',
    name: 'In Progress',
    description: 'Inspector is actively conducting the inspection'
  },
  {
    status: 'requires_review',
    name: 'Requires Review',
    description: 'Inspection completed, awaiting supervisor review'
  },
  {
    status: 'approved',
    name: 'Approved',
    description: 'Inspection reviewed and approved'
  }
]

// Status transitions based on current status and user role
const statusTransitions = {
  draft: {
    inspector: [
      { toStatus: 'in_progress', label: 'Start Inspection', buttonClass: 'btn-primary', icon: PlayIcon }
    ],
    supervisor: [
      { toStatus: 'in_progress', label: 'Start Inspection', buttonClass: 'btn-primary', icon: PlayIcon }
    ],
    admin: [
      { toStatus: 'in_progress', label: 'Start Inspection', buttonClass: 'btn-primary', icon: PlayIcon }
    ]
  },
  in_progress: {
    inspector: [
      { toStatus: 'requires_review', label: 'Submit for Review', buttonClass: 'btn-primary', icon: EyeIcon },
      { toStatus: 'draft', label: 'Save as Draft', buttonClass: 'btn-secondary', icon: PencilIcon }
    ],
    supervisor: [
      { toStatus: 'requires_review', label: 'Submit for Review', buttonClass: 'btn-primary', icon: EyeIcon },
      { toStatus: 'approved', label: 'Approve Directly', buttonClass: 'btn-success', icon: CheckCircleIcon }
    ],
    admin: [
      { toStatus: 'requires_review', label: 'Submit for Review', buttonClass: 'btn-primary', icon: EyeIcon },
      { toStatus: 'approved', label: 'Approve Directly', buttonClass: 'btn-success', icon: CheckCircleIcon }
    ]
  },
  requires_review: {
    supervisor: [
      { toStatus: 'approved', label: 'Approve', buttonClass: 'btn-success', icon: CheckCircleIcon },
      { toStatus: 'rejected', label: 'Reject', buttonClass: 'btn-danger', icon: XCircleIcon },
      { toStatus: 'in_progress', label: 'Send Back for Changes', buttonClass: 'btn-warning', icon: PencilIcon }
    ],
    admin: [
      { toStatus: 'approved', label: 'Approve', buttonClass: 'btn-success', icon: CheckCircleIcon },
      { toStatus: 'rejected', label: 'Reject', buttonClass: 'btn-danger', icon: XCircleIcon },
      { toStatus: 'in_progress', label: 'Send Back for Changes', buttonClass: 'btn-warning', icon: PencilIcon }
    ]
  },
  approved: {
    admin: [
      { toStatus: 'requires_review', label: 'Reopen for Review', buttonClass: 'btn-warning', icon: EyeIcon }
    ]
  },
  rejected: {
    supervisor: [
      { toStatus: 'in_progress', label: 'Reopen for Changes', buttonClass: 'btn-primary', icon: PencilIcon }
    ],
    admin: [
      { toStatus: 'in_progress', label: 'Reopen for Changes', buttonClass: 'btn-primary', icon: PencilIcon },
      { toStatus: 'approved', label: 'Override and Approve', buttonClass: 'btn-success', icon: CheckCircleIcon }
    ]
  }
}

// Computed
const availableActions = computed(() => {
  const transitions = statusTransitions[props.currentStatus as keyof typeof statusTransitions]
  if (!transitions) return []

  return transitions[props.userRole as keyof typeof transitions] || []
})

const canTransition = computed(() => {
  return props.canEdit && availableActions.value.length > 0
})

// Methods
const isStepCompleted = (status: string): boolean => {
  const currentIndex = workflowSteps.findIndex(step => step.status === props.currentStatus)
  const stepIndex = workflowSteps.findIndex(step => step.status === status)
  return stepIndex < currentIndex || props.currentStatus === 'approved'
}

const isStepUpcoming = (status: string): boolean => {
  const currentIndex = workflowSteps.findIndex(step => step.status === props.currentStatus)
  const stepIndex = workflowSteps.findIndex(step => step.status === status)
  return stepIndex > currentIndex
}

const getStatusDisplayName = (status: string): string => {
  const statusNames: Record<string, string> = {
    draft: 'Draft',
    in_progress: 'In Progress',
    requires_review: 'Requires Review',
    completed: 'Completed',
    approved: 'Approved',
    rejected: 'Rejected'
  }
  return statusNames[status] || status
}

const handleStatusTransition = async (newStatus: string) => {
  if (isUpdating.value) return

  const action = availableActions.value.find(a => a.toStatus === newStatus)
  if (!action) return

  // For reject/approve actions, ask for confirmation and notes
  let notes = ''
  if (newStatus === 'rejected') {
    notes = prompt('Please provide a reason for rejection:') || ''
    if (!notes.trim()) {
      alert('Rejection reason is required.')
      return
    }
  } else if (newStatus === 'approved') {
    notes = prompt('Optional approval notes:') || ''
  }

  try {
    isUpdating.value = true

    await apiUtils.patch(`/inspections/${props.inspectionId}`, {
      status: newStatus,
      notes: notes
    })

    emit('statusUpdated', newStatus)

    // Refresh status history
    await fetchStatusHistory()

  } catch (error) {
    console.error('Error updating inspection status:', error)
    alert('Failed to update inspection status. Please try again.')
  } finally {
    isUpdating.value = false
  }
}

const fetchStatusHistory = async () => {
  try {
    const response = await apiUtils.get(`/inspections/${props.inspectionId}/status-history`)
    statusHistory.value = response.history || []
  } catch (error) {
    console.error('Error fetching status history:', error)
    // Non-critical error, continue without history
  }
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleString()
}

// Initialize
fetchStatusHistory()
</script>

<style scoped>
.inspection-status-workflow {
  background: hsl(var(--background));
  border-radius: 8px;
  padding: 1.5rem;
  border: 1px solid hsl(var(--border));
}

.status-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.status-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: hsl(var(--foreground));
}

.current-status-badge {
  padding: 0.375rem 0.75rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.status-workflow {
  margin-bottom: 2rem;
}

.workflow-step {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 0.5rem;
  transition: all 0.15s;
}

.step-completed {
  background: hsl(var(--success) / 0.1);
  border: 1px solid hsl(var(--success) / 0.2);
}

.step-current {
  background: hsl(var(--primary) / 0.1);
  border: 1px solid hsl(var(--primary) / 0.2);
}

.step-upcoming {
  background: hsl(var(--muted));
  border: 1px solid hsl(var(--border));
}

.step-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  background: hsl(var(--muted));
  flex-shrink: 0;
}

.step-completed .step-indicator {
  background: hsl(var(--success));
  color: hsl(var(--success-foreground));
}

.step-current .step-indicator {
  background: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
}

.step-number {
  font-size: 0.875rem;
  font-weight: 600;
  color: hsl(var(--muted-foreground));
}

.step-content {
  flex: 1;
}

.step-name {
  font-weight: 500;
  color: hsl(var(--foreground));
  margin-bottom: 0.25rem;
}

.step-description {
  font-size: 0.875rem;
  color: hsl(var(--muted-foreground));
}

.status-actions {
  margin-bottom: 2rem;
}

.actions-title {
  font-size: 1rem;
  font-weight: 500;
  color: hsl(var(--foreground));
  margin-bottom: 1rem;
}

.actions-buttons {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.status-history {
  border-top: 1px solid hsl(var(--border));
  padding-top: 1.5rem;
}

.history-title {
  font-size: 1rem;
  font-weight: 500;
  color: hsl(var(--foreground));
  margin-bottom: 1rem;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.history-entry {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background: hsl(var(--muted));
  border-radius: 6px;
}

.history-status {
  flex-shrink: 0;
}

.history-details {
  flex: 1;
}

.history-user {
  font-weight: 500;
  color: hsl(var(--foreground));
}

.history-date {
  font-size: 0.875rem;
  color: hsl(var(--muted-foreground));
  margin-top: 0.25rem;
}

.history-notes {
  font-size: 0.875rem;
  color: hsl(var(--muted-foreground));
  margin-top: 0.5rem;
  font-style: italic;
}

/* Status Badge Colors */
.status-draft { background: hsl(var(--warning) / 0.1); color: hsl(var(--warning)); }
.status-in_progress { background: hsl(var(--primary) / 0.1); color: hsl(var(--primary)); }
.status-requires_review { background: hsl(var(--warning) / 0.1); color: hsl(var(--warning)); }
.status-completed { background: hsl(var(--success) / 0.1); color: hsl(var(--success)); }
.status-approved { background: hsl(var(--success) / 0.1); color: hsl(var(--success)); }
.status-rejected { background: hsl(var(--destructive) / 0.1); color: hsl(var(--destructive)); }

.status-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Button Styles */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-weight: 500;
  text-decoration: none;
  transition: all 0.15s;
  cursor: pointer;
  border: none;
  font-size: 0.875rem;
}

.btn-primary { background: hsl(var(--primary)); color: hsl(var(--primary-foreground)); }
.btn-primary:hover:not(:disabled) { background: hsl(var(--primary)); opacity: 0.9; }

.btn-secondary { background: hsl(var(--muted-foreground)); color: hsl(var(--muted)); }
.btn-secondary:hover:not(:disabled) { background: hsl(var(--muted-foreground)); opacity: 0.9; }

.btn-success { background: hsl(var(--success)); color: hsl(var(--success-foreground)); }
.btn-success:hover:not(:disabled) { background: hsl(var(--success)); opacity: 0.9; }

.btn-warning { background: hsl(var(--warning)); color: hsl(var(--warning-foreground)); }
.btn-warning:hover:not(:disabled) { background: hsl(var(--warning)); opacity: 0.9; }

.btn-danger { background: hsl(var(--destructive)); color: hsl(var(--destructive-foreground)); }
.btn-danger:hover:not(:disabled) { background: hsl(var(--destructive)); opacity: 0.9; }

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.icon-sm {
  width: 1rem;
  height: 1rem;
}
</style>