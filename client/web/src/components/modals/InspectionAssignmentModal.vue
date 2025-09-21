<template>
  <ModalWrapper
    :show="isOpen"
    @close="$emit('close')"
    size="md"
  >
    <template #header>
      <h3 class="modal-title">
        {{ isStatusUpdate ? 'Update Status' : 'Assign Inspection' }}
      </h3>
    </template>

    <template #body>
      <form @submit.prevent="handleSubmit" class="assignment-form">
        <!-- Status Update Mode -->
        <div v-if="isStatusUpdate" class="form-section">
          <div class="form-group">
            <label for="status" class="form-label required">Status</label>
            <select
              id="status"
              v-model="formData.status"
              required
              class="form-select"
            >
              <option value="">Select Status</option>
              <option
                v-for="status in allowedStatusTransitions"
                :key="status.value"
                :value="status.value"
              >
                {{ status.label }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label for="status-notes" class="form-label">Notes</label>
            <textarea
              id="status-notes"
              v-model="formData.notes"
              placeholder="Add notes about this status change..."
              rows="3"
              class="form-textarea"
            ></textarea>
          </div>
        </div>

        <!-- Assignment Mode -->
        <div v-else class="form-section">
          <div class="form-group">
            <label for="inspector" class="form-label required">Inspector</label>
            <select
              id="inspector"
              v-model="formData.inspector_id"
              required
              class="form-select"
            >
              <option value="">Select Inspector</option>
              <option
                v-for="inspector in availableInspectors"
                :key="inspector.id"
                :value="inspector.id"
              >
                {{ inspector.name }} ({{ inspector.email }})
              </option>
            </select>
          </div>

          <div class="form-group">
            <label for="priority" class="form-label">Priority</label>
            <select
              id="priority"
              v-model="formData.priority"
              class="form-select"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="due-date" class="form-label">Due Date</label>
              <input
                id="due-date"
                type="date"
                v-model="formData.due_date"
                class="form-input"
              />
            </div>

            <div class="form-group">
              <label for="scheduled-for" class="form-label">Scheduled For</label>
              <input
                id="scheduled-for"
                type="datetime-local"
                v-model="formData.scheduled_for"
                class="form-input"
              />
            </div>
          </div>

          <div class="form-group">
            <label for="assignment-notes" class="form-label">Notes</label>
            <textarea
              id="assignment-notes"
              v-model="formData.notes"
              placeholder="Add assignment instructions or notes..."
              rows="3"
              class="form-textarea"
            ></textarea>
          </div>
        </div>
      </form>
    </template>

    <template #footer>
      <div class="modal-actions">
        <button
          type="button"
          @click="$emit('close')"
          class="btn btn-secondary"
          :disabled="isSubmitting"
        >
          Cancel
        </button>
        <button
          type="button"
          @click="handleSubmit"
          class="btn btn-primary"
          :disabled="isSubmitting || !isFormValid"
        >
          <LoadingSpinner v-if="isSubmitting" class="icon-sm" />
          {{ isSubmitting ? 'Processing...' : (isStatusUpdate ? 'Update Status' : 'Assign Inspection') }}
        </button>
      </div>
    </template>
  </ModalWrapper>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { apiUtils } from '@/utils/api'
import { useAuthStore } from '@/stores/auth'
import ModalWrapper from './ModalWrapper.vue'
import LoadingSpinner from '../ui/LoadingSpinner.vue'

interface Inspector {
  id: string
  name: string
  email: string
}

interface Props {
  isOpen: boolean
  inspectionId: string | number
  currentStatus?: string
  mode?: 'assign' | 'status'
}

interface Emits {
  (event: 'close'): void
  (event: 'success', data: any): void
  (event: 'error', message: string): void
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'assign',
  currentStatus: 'draft'
})

const emit = defineEmits<Emits>()
const authStore = useAuthStore()

// State
const isSubmitting = ref(false)
const availableInspectors = ref<Inspector[]>([])

const formData = ref({
  inspector_id: '',
  priority: 'medium',
  due_date: '',
  scheduled_for: '',
  notes: '',
  status: ''
})

// Computed
const isStatusUpdate = computed(() => props.mode === 'status')

const allowedStatusTransitions = computed(() => {
  const transitions: Record<string, Array<{ value: string; label: string }>> = {
    draft: [
      { value: 'assigned', label: 'Assigned' },
      { value: 'in_progress', label: 'In Progress' },
      { value: 'completed', label: 'Completed' }
    ],
    assigned: [
      { value: 'in_progress', label: 'In Progress' },
      { value: 'draft', label: 'Draft' },
      { value: 'completed', label: 'Completed' }
    ],
    in_progress: [
      { value: 'completed', label: 'Completed' },
      { value: 'assigned', label: 'Assigned' }
    ],
    completed: [
      { value: 'assigned', label: 'Assigned' }
    ]
  }

  return transitions[props.currentStatus] || []
})

const isFormValid = computed(() => {
  if (isStatusUpdate.value) {
    return formData.value.status !== ''
  } else {
    return formData.value.inspector_id !== ''
  }
})

// Methods
const fetchInspectors = async () => {
  try {
    const response = await apiUtils.get('/users?role=inspector')
    availableInspectors.value = response.users || []
  } catch (error) {
    console.error('Failed to fetch inspectors:', error)
  }
}

const handleSubmit = async () => {
  if (!isFormValid.value || isSubmitting.value) return

  isSubmitting.value = true

  try {
    let response

    if (isStatusUpdate.value) {
      // Update status
      response = await apiUtils.put(`/inspections/${props.inspectionId}/status`, {
        status: formData.value.status,
        notes: formData.value.notes
      })
    } else {
      // Assign inspection
      const assignmentData = {
        inspector_id: formData.value.inspector_id,
        assigned_by: authStore.user?.id || '',
        priority: formData.value.priority,
        notes: formData.value.notes
      }

      // Add optional dates
      if (formData.value.due_date) {
        assignmentData.due_date = new Date(formData.value.due_date).toISOString()
      }

      if (formData.value.scheduled_for) {
        assignmentData.scheduled_for = new Date(formData.value.scheduled_for).toISOString()
      }

      response = await apiUtils.post(`/inspections/${props.inspectionId}/assign`, assignmentData)
    }

    emit('success', response)
    resetForm()

  } catch (error: any) {
    const errorMessage = error.response?.data?.error ||
      (isStatusUpdate.value ? 'Failed to update status' : 'Failed to assign inspection')
    emit('error', errorMessage)
  } finally {
    isSubmitting.value = false
  }
}

const resetForm = () => {
  formData.value = {
    inspector_id: '',
    priority: 'medium',
    due_date: '',
    scheduled_for: '',
    notes: '',
    status: ''
  }
}

// Watchers
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    resetForm()
    if (!isStatusUpdate.value) {
      fetchInspectors()
    }
  }
})

// Lifecycle
onMounted(() => {
  if (!isStatusUpdate.value) {
    fetchInspectors()
  }
})
</script>

<style scoped>
.assignment-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: hsl(var(--foreground));
}

.form-label.required::after {
  content: '*';
  color: hsl(var(--destructive));
  margin-left: 0.25rem;
}

.form-input,
.form-select,
.form-textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid hsl(var(--border));
  border-radius: 0.375rem;
  font-size: 0.875rem;
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

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

.modal-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

@media (max-width: 640px) {
  .form-row {
    grid-template-columns: 1fr;
  }

  .modal-actions {
    flex-direction: column-reverse;
  }

  .modal-actions button {
    width: 100%;
    justify-content: center;
  }
}
</style>