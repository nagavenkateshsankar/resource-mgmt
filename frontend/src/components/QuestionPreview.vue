<template>
  <div class="question-preview">
    <div class="question-header">
      <h4 class="question-title">{{ question.title || 'Untitled Question' }}</h4>
      <span class="required-badge" v-if="question.required">Required</span>
    </div>

    <p class="question-description" v-if="question.description">{{ question.description }}</p>

    <!-- Text Input Preview -->
    <div v-if="question.type === 'text'" class="input-preview">
      <input
        type="text"
        placeholder="Text input field"
        disabled
        class="preview-input"
      />
    </div>

    <!-- Textarea Preview -->
    <div v-else-if="question.type === 'textarea'" class="input-preview">
      <textarea
        placeholder="Large text area"
        disabled
        rows="3"
        class="preview-textarea"
      ></textarea>
    </div>

    <!-- Number Input Preview -->
    <div v-else-if="question.type === 'number'" class="input-preview">
      <input
        type="number"
        placeholder="Number input field"
        disabled
        class="preview-input"
      />
    </div>

    <!-- Date Input Preview -->
    <div v-else-if="question.type === 'date'" class="input-preview">
      <input
        type="date"
        disabled
        class="preview-input"
      />
    </div>

    <!-- Time Input Preview -->
    <div v-else-if="question.type === 'time'" class="input-preview">
      <input
        type="time"
        disabled
        class="preview-input"
      />
    </div>

    <!-- Yes/No Preview -->
    <div v-else-if="question.type === 'yes_no'" class="options-preview">
      <label class="option-item">
        <input type="radio" name="preview-yes-no" disabled />
        <span>Yes</span>
      </label>
      <label class="option-item">
        <input type="radio" name="preview-yes-no" disabled />
        <span>No</span>
      </label>
    </div>

    <!-- Multiple Choice Preview -->
    <div v-else-if="question.type === 'multiple_choice' && question.options" class="options-preview">
      <label v-for="(option, index) in question.options" :key="index" class="option-item">
        <input type="radio" :name="`preview-mc-${question.id}`" disabled />
        <span>{{ option || `Option ${index + 1}` }}</span>
      </label>
    </div>

    <!-- Checkbox Preview -->
    <div v-else-if="question.type === 'checkbox' && question.options" class="options-preview">
      <label v-for="(option, index) in question.options" :key="index" class="option-item">
        <input type="checkbox" disabled />
        <span>{{ option || `Option ${index + 1}` }}</span>
      </label>
    </div>

    <!-- Empty state for multiple choice/checkbox without options -->
    <div v-else-if="(question.type === 'multiple_choice' || question.type === 'checkbox') && (!question.options || question.options.length === 0)" class="empty-options">
      <p class="empty-text">No options configured</p>
    </div>

    <!-- Default fallback -->
    <div v-else class="input-preview">
      <input
        type="text"
        placeholder="Input field"
        disabled
        class="preview-input"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
interface Question {
  id?: number | string
  title: string
  description?: string
  type: string
  required: boolean
  options?: string[]
}

defineProps<{
  question: Question
}>()
</script>

<style scoped>
.question-preview {
  font-family: inherit;
}

.question-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.question-title {
  font-size: 1rem;
  font-weight: 600;
  color: hsl(var(--foreground));
  margin: 0;
  flex: 1;
}

.required-badge {
  background: hsl(var(--destructive) / 0.1);
  color: hsl(var(--destructive));
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.625rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.question-description {
  color: hsl(var(--muted-foreground));
  font-size: 0.875rem;
  margin-bottom: 1rem;
  line-height: 1.5;
}

.input-preview {
  margin-bottom: 0.5rem;
}

.preview-input,
.preview-textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid hsl(var(--border));
  border-radius: 0.375rem;
  background: hsl(var(--muted));
  color: hsl(var(--muted-foreground));
  font-size: 0.875rem;
  cursor: not-allowed;
}

.preview-textarea {
  resize: vertical;
  min-height: 4rem;
}

.options-preview {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.option-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: hsl(var(--foreground));
  cursor: not-allowed;
}

.option-item input {
  cursor: not-allowed;
}

.empty-options {
  padding: 1rem;
  text-align: center;
  border: 1px dashed hsl(var(--border));
  border-radius: 0.375rem;
  background: hsl(var(--muted));
}

.empty-text {
  color: hsl(var(--muted-foreground));
  font-size: 0.875rem;
  font-style: italic;
  margin: 0;
}
</style>