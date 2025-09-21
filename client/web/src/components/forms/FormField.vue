<template>
  <div class="form-field">
    <label :for="fieldId" class="field-label">
      {{ field.label }}
      <span v-if="field.required" class="required-indicator">*</span>
    </label>

    <!-- Text Input -->
    <input
      v-if="field.type === 'text' || field.type === 'email'"
      :id="fieldId"
      :type="field.type"
      :value="modelValue"
      @input="handleInput"
      @blur="handleBlur"
      :placeholder="field.placeholder || ''"
      :required="field.required"
      class="form-input"
      :class="{ 'is-invalid': showError }"
    />

    <!-- Number Input -->
    <input
      v-else-if="field.type === 'number'"
      :id="fieldId"
      type="number"
      :value="modelValue"
      @input="handleInput"
      @blur="handleBlur"
      :placeholder="field.placeholder || ''"
      :required="field.required"
      class="form-input"
      :class="{ 'is-invalid': showError }"
    />

    <!-- Date Input -->
    <input
      v-else-if="field.type === 'date'"
      :id="fieldId"
      type="date"
      :value="modelValue"
      @input="handleInput"
      @blur="handleBlur"
      :required="field.required"
      class="form-input"
      :class="{ 'is-invalid': showError }"
    />

    <!-- Textarea -->
    <textarea
      v-else-if="field.type === 'textarea'"
      :id="fieldId"
      :value="modelValue"
      @input="handleInput"
      @blur="handleBlur"
      :placeholder="field.placeholder || ''"
      :required="field.required"
      rows="4"
      class="form-input form-textarea"
      :class="{ 'is-invalid': showError }"
    ></textarea>

    <!-- Select Dropdown -->
    <select
      v-else-if="field.type === 'select'"
      :id="fieldId"
      :value="modelValue"
      @change="handleSelectChange"
      @blur="handleBlur"
      :required="field.required"
      class="form-input form-select"
      :class="{ 'is-invalid': showError }"
    >
      <option value="">{{ field.placeholder || 'Select an option' }}</option>
      <option
        v-for="option in field.options"
        :key="option"
        :value="option"
      >
        {{ option }}
      </option>
    </select>

    <!-- Radio Buttons -->
    <div
      v-else-if="field.type === 'radio'"
      class="radio-group"
      :class="{ 'is-invalid': showError }"
    >
      <label
        v-for="option in field.options"
        :key="option"
        class="radio-option"
      >
        <input
          :name="fieldId"
          type="radio"
          :value="option"
          :checked="modelValue === option"
          @change="handleRadioChange"
          @blur="handleBlur"
          :required="field.required"
          class="radio-input"
        />
        <span class="radio-label">{{ option }}</span>
      </label>
    </div>

    <!-- Checkbox -->
    <label
      v-else-if="field.type === 'checkbox'"
      class="checkbox-container"
      :class="{ 'is-invalid': showError }"
    >
      <input
        :id="fieldId"
        type="checkbox"
        :checked="modelValue"
        @change="handleCheckboxChange"
        @blur="handleBlur"
        class="checkbox-input"
      />
      <span class="checkbox-label">{{ field.placeholder || field.label }}</span>
    </label>

    <!-- Error Message -->
    <div v-if="showError" class="error-message">
      {{ errorMessage }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

interface FormField {
  name: string
  type: string
  label: string
  required?: boolean
  options?: string[]
  placeholder?: string
}

interface Props {
  field: FormField
  modelValue: any
}

interface Emits {
  (event: 'update:modelValue', value: any): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const touched = ref(false)

const fieldId = computed(() => `field-${props.field.name}`)

const showError = computed(() => {
  return touched.value && props.field.required && isEmpty(props.modelValue)
})

const errorMessage = computed(() => {
  if (showError.value) {
    return `${props.field.label} is required`
  }
  return ''
})

const isEmpty = (value: any): boolean => {
  return value === null || value === undefined || value === '' || value === false
}

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement | HTMLTextAreaElement
  const value = props.field.type === 'number' ?
    (target.value === '' ? null : Number(target.value)) :
    target.value
  emit('update:modelValue', value)
}

const handleSelectChange = (event: Event) => {
  const target = event.target as HTMLSelectElement
  emit('update:modelValue', target.value)
}

const handleRadioChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.value)
}

const handleCheckboxChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.checked)
}

const handleBlur = () => {
  touched.value = true
}
</script>

<style scoped>
.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.field-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-gray-700);
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.required-indicator {
  color: var(--color-error);
  font-weight: 600;
}

.form-input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid var(--color-gray-300);
  border-radius: var(--border-radius);
  font-size: 1rem;
  background: white;
  transition: var(--transition);
}

.form-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-input.is-invalid {
  border-color: var(--color-error);
}

.form-input.is-invalid:focus {
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}

.form-textarea {
  resize: vertical;
  min-height: 100px;
}

.form-select {
  cursor: pointer;
}

.radio-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.5rem 0;
}

.radio-group.is-invalid {
  border: 1px solid var(--color-error);
  border-radius: var(--border-radius);
  padding: 0.75rem;
  background: hsl(var(--destructive) / 0.1);
}

.radio-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.875rem;
}

.radio-input {
  margin: 0;
  cursor: pointer;
}

.radio-label {
  cursor: pointer;
  color: var(--color-gray-700);
}

.checkbox-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  padding: 0.5rem 0;
  font-size: 0.875rem;
}

.checkbox-container.is-invalid {
  color: var(--color-error);
}

.checkbox-input {
  margin: 0;
  cursor: pointer;
}

.checkbox-label {
  cursor: pointer;
  color: var(--color-gray-700);
}

.checkbox-container.is-invalid .checkbox-label {
  color: var(--color-error);
}

.error-message {
  font-size: 0.75rem;
  color: var(--color-error);
  margin-top: 0.25rem;
}

@media (max-width: 640px) {
  .radio-group {
    gap: 0.5rem;
  }

  .form-input {
    padding: 0.625rem 0.875rem;
    font-size: 0.875rem;
  }
}
</style>