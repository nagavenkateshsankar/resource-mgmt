<template>
  <form @submit.prevent="handleSubmit" class="dynamic-form">
    <div v-for="section in sections" :key="section.name" class="form-section">
      <h3 class="section-title">{{ section.name }}</h3>

      <div class="section-fields">
        <FormField
          v-for="field in section.fields"
          :key="field.name"
          :field="field"
          :model-value="formData[field.name]"
          @update:model-value="updateField(field.name, $event)"
        />
      </div>
    </div>

    <div class="form-actions">
      <button
        type="button"
        @click="$emit('cancel')"
        class="btn btn-secondary"
        :disabled="isSubmitting"
      >
        Cancel
      </button>
      <button
        type="submit"
        class="btn btn-primary"
        :disabled="isSubmitting || !isValid"
      >
        <LoadingSpinner v-if="isSubmitting" class="icon-sm" />
        {{ isSubmitting ? 'Saving...' : 'Save Inspection' }}
      </button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import FormField from './FormField.vue'
import LoadingSpinner from '../ui/LoadingSpinner.vue'

interface FormFieldConfig {
  name: string
  type: string
  label: string
  required?: boolean
  options?: string[]
  placeholder?: string
}

interface FormSection {
  name: string
  fields: FormFieldConfig[]
}

interface Props {
  sections: FormSection[]
  initialData?: Record<string, any>
  isSubmitting?: boolean
}

interface Emits {
  (event: 'submit', data: Record<string, any>): void
  (event: 'cancel'): void
  (event: 'change', data: Record<string, any>): void
}

const props = withDefaults(defineProps<Props>(), {
  initialData: () => ({}),
  isSubmitting: false
})

const emit = defineEmits<Emits>()

// Helper function - must be defined before use
const getDefaultValue = (type: string) => {
  switch (type) {
    case 'text':
    case 'textarea':
    case 'email':
      return ''
    case 'number':
      return null
    case 'date':
      return ''
    case 'select':
    case 'radio':
      return ''
    case 'checkbox':
      return false
    default:
      return ''
  }
}

// Form data state
const formData = ref<Record<string, any>>({
  ...props.initialData
})

// Initialize empty fields from schema
watch(() => props.sections, (newSections) => {
  newSections.forEach(section => {
    section.fields.forEach(field => {
      if (!(field.name in formData.value)) {
        formData.value[field.name] = getDefaultValue(field.type)
      }
    })
  })
}, { immediate: true })

// Validation
const requiredFields = computed(() => {
  const fields: string[] = []
  props.sections.forEach(section => {
    section.fields.forEach(field => {
      if (field.required) {
        fields.push(field.name)
      }
    })
  })
  return fields
})

const isValid = computed(() => {
  return requiredFields.value.every(fieldName => {
    const value = formData.value[fieldName]
    return value !== null && value !== undefined && value !== ''
  })
})

// Methods
const updateField = (fieldName: string, value: any) => {
  formData.value[fieldName] = value
  emit('change', { ...formData.value })
}

const handleSubmit = () => {
  if (isValid.value && !props.isSubmitting) {
    emit('submit', { ...formData.value })
  }
}
</script>

<style scoped>
.dynamic-form {
  max-width: 800px;
  margin: 0 auto;
}

.form-section {
  background: hsl(var(--background));
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-sm);
  border: 1px solid hsl(var(--border));
  margin-bottom: 2rem;
  overflow: hidden;
}

.section-title {
  background: hsl(var(--muted));
  color: hsl(var(--foreground));
  font-size: 1.125rem;
  font-weight: 600;
  padding: 1.25rem 1.5rem;
  margin: 0;
  border-bottom: 1px solid hsl(var(--border));
}

.section-fields {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  padding: 2rem 0;
  border-top: 1px solid hsl(var(--border));
  margin-top: 2rem;
}

@media (max-width: 640px) {
  .dynamic-form {
    margin: 0;
  }

  .section-title {
    padding: 1rem 1.25rem;
    font-size: 1rem;
  }

  .section-fields {
    padding: 1.25rem;
    gap: 1.25rem;
  }

  .form-actions {
    flex-direction: column-reverse;
    padding: 1.5rem 0;
  }

  .form-actions button {
    width: 100%;
    justify-content: center;
  }
}
</style>