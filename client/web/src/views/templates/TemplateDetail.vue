<template>
  <div class="template-detail-page">
    <div class="page-header">
      <div class="header-content">
        <div class="title-section">
          <router-link to="/templates" class="back-link">
            <ArrowLeftIcon class="icon-sm" />
            Back to Templates
          </router-link>
          <h1 class="page-title">{{ isPreview ? 'Template Preview' : 'Template Details' }}</h1>
          <p class="page-subtitle" v-if="template">{{ template.name }}</p>
        </div>
        <div class="actions-section" v-if="template && !isPreview">
          <router-link
            :to="`/templates/${template.id}/edit`"
            class="btn btn-secondary"
            v-if="canEditTemplates"
          >
            <PencilIcon class="icon-sm" />
            Edit Template
          </router-link>
          <router-link
            :to="`/inspections/new?template=${template.id}`"
            class="btn btn-primary"
          >
            <PlayIcon class="icon-sm" />
            Use Template
          </router-link>
        </div>
      </div>
    </div>

    <div class="template-content" v-if="template">
      <!-- Template Info -->
      <div class="template-info-card">
        <div class="template-header">
          <div class="template-icon">
            <component :is="getCategoryIcon(template.category)" class="icon-lg" />
          </div>
          <div class="template-meta">
            <div class="meta-item">
              <TagIcon class="icon-sm" />
              <span class="category-badge" :class="`category-${template.category}`">
                {{ template.category.charAt(0).toUpperCase() + template.category.slice(1) }}
              </span>
            </div>
            <div class="meta-item">
              <ClipboardDocumentCheckIcon class="icon-sm" />
              <span>{{ template.questions }} questions</span>
            </div>
            <div class="meta-item">
              <ClockIcon class="icon-sm" />
              <span>~{{ template.estimatedTime }} minutes</span>
            </div>
            <div class="meta-item" v-if="!isPreview">
              <ChartBarIcon class="icon-sm" />
              <span>Used {{ template.usageCount }} times</span>
            </div>
          </div>
        </div>
        <div class="template-description">
          <h3>Description</h3>
          <p>{{ template.description }}</p>
        </div>
      </div>

      <!-- Template Questions Preview -->
      <div class="questions-preview-card">
        <div class="card-header">
          <h3>{{ isPreview ? 'Preview Questions' : 'Template Questions' }}</h3>
          <p class="card-subtitle">{{ isPreview ? 'Sample of questions included in this template' : 'All questions in this template' }}</p>
        </div>

        <div class="questions-list">
          <div
            v-for="(question, index) in displayQuestions"
            :key="index"
            class="question-item"
          >
            <div class="question-number">{{ index + 1 }}</div>
            <div class="question-content">
              <h4 class="question-title">{{ question.title }}</h4>
              <p class="question-description" v-if="question.description">{{ question.description }}</p>

              <div class="question-type">
                <component :is="getQuestionIcon(question.type)" class="icon-sm" />
                <span class="type-label">{{ getQuestionTypeLabel(question.type) }}</span>
                <span class="required-badge" v-if="question.required">Required</span>
              </div>

              <!-- Question Options Preview -->
              <div class="question-options" v-if="question.type === 'multiple_choice' && question.options">
                <div class="option-item" v-for="option in question.options" :key="option">
                  <div class="option-radio"></div>
                  <span>{{ option }}</span>
                </div>
              </div>

              <div class="question-input-preview" v-else-if="question.type === 'text'">
                <div class="input-placeholder">Text input field</div>
              </div>

              <div class="question-input-preview" v-else-if="question.type === 'textarea'">
                <div class="textarea-placeholder">Large text area</div>
              </div>

              <div class="question-input-preview" v-else-if="question.type === 'number'">
                <div class="input-placeholder">Number input field</div>
              </div>

              <div class="question-input-preview" v-else-if="question.type === 'yes_no'">
                <div class="option-item">
                  <div class="option-radio"></div>
                  <span>Yes</span>
                </div>
                <div class="option-item">
                  <div class="option-radio"></div>
                  <span>No</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="load-more" v-if="isPreview && template.questions > displayQuestions.length">
          <p class="load-more-text">
            {{ template.questions - displayQuestions.length }} more questions available...
          </p>
          <router-link :to="`/templates/${template.id}`" class="btn btn-secondary btn-sm">
            View Full Template
          </router-link>
        </div>
      </div>

      <!-- Actions -->
      <div class="template-actions" v-if="isPreview">
        <router-link
          :to="`/inspections/new?template=${template.id}`"
          class="btn btn-primary btn-lg"
        >
          <PlayIcon class="icon-sm" />
          Use This Template
        </router-link>
        <router-link :to="`/templates/${template.id}`" class="btn btn-secondary btn-lg">
          <DocumentTextIcon class="icon-sm" />
          View Full Details
        </router-link>
      </div>
    </div>

    <!-- Loading State -->
    <div v-else-if="isLoading" class="loading-state">
      <div class="spinner"></div>
      <p>Loading template...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      <ExclamationTriangleIcon class="icon-xl" />
      <h3>Error Loading Template</h3>
      <p>{{ error }}</p>
      <button @click="fetchTemplate(route.params.id as string)" class="btn btn-primary">
        Try Again
      </button>
    </div>

    <!-- Empty State -->
    <div v-else class="empty-state">
      <DocumentTextIcon class="icon-xl" />
      <h3>Template Not Found</h3>
      <p>The requested template could not be found.</p>
      <router-link to="/templates" class="btn btn-primary">
        Back to Templates
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { apiUtils } from '@/utils/api'
import {
  ArrowLeftIcon,
  PencilIcon,
  PlayIcon,
  TagIcon,
  ClipboardDocumentCheckIcon,
  ClockIcon,
  ChartBarIcon,
  DocumentTextIcon,
  WrenchScrewdriverIcon,
  BoltIcon,
  HomeIcon,
  ShieldCheckIcon,
  BeakerIcon,
  ChatBubbleLeftEllipsisIcon,
  DocumentIcon,
  HashtagIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/vue/24/outline'

const route = useRoute()
const authStore = useAuthStore()

const isPreview = computed(() => route.name === 'template-preview')
const canEditTemplates = computed(() => authStore.hasPermission('can_create_templates'))

// State
const template = ref(null)
const isLoading = ref(false)
const error = ref(null)

const displayQuestions = computed(() => {
  if (!template.value || !template.value.fieldsSchema || !template.value.fieldsSchema.sections) {
    return []
  }

  let allQuestions = []

  // Extract questions from all sections
  template.value.fieldsSchema.sections.forEach(section => {
    if (section.fields) {
      section.fields.forEach(field => {
        allQuestions.push({
          title: field.label || field.name,
          description: field.description || '',
          type: mapFieldType(field.type),
          required: field.required || false,
          options: field.options || []
        })
      })
    }
  })

  if (isPreview.value) {
    return allQuestions.slice(0, 3) // Show only first 3 questions for preview
  }
  return allQuestions // Show all questions for full view
})

// Map backend field types to frontend display types
const mapFieldType = (backendType: string) => {
  const typeMap = {
    text: 'text',
    textarea: 'textarea',
    number: 'number',
    select: 'multiple_choice',
    radio: 'multiple_choice',
    checkbox: 'yes_no',
    email: 'text',
    phone: 'text',
    date: 'text',
    time: 'text',
    datetime: 'text',
    file: 'text'
  }
  return typeMap[backendType] || 'text'
}

// API Functions
const fetchTemplate = async (id: string) => {
  try {
    isLoading.value = true
    error.value = null

    const response = await apiUtils.get(`/templates/${id}`)

    // Extract template from wrapped response
    const templateResponse = response.template

    // Transform API response to match frontend structure
    const templateData = {
      id: templateResponse.id,
      name: templateResponse.name,
      description: templateResponse.description,
      category: templateResponse.category.toLowerCase(),
      questions: countQuestions(templateResponse.fields_schema),
      estimatedTime: estimateTime(templateResponse.fields_schema),
      usageCount: 0, // TODO: Add usage tracking to backend
      lastUsed: formatApiDate(templateResponse.updated_at),
      fieldsSchema: templateResponse.fields_schema
    }

    template.value = templateData
  } catch (err) {
    console.error('Failed to fetch template:', err)
    error.value = 'Failed to load template. Please try again later.'
  } finally {
    isLoading.value = false
  }
}

// Helper functions
const countQuestions = (fieldsSchema) => {
  if (!fieldsSchema || !fieldsSchema.sections) return 0
  return fieldsSchema.sections.reduce((total, section) => {
    return total + (section.fields ? section.fields.length : 0)
  }, 0)
}

const estimateTime = (fieldsSchema) => {
  const questionCount = countQuestions(fieldsSchema)
  // Rough estimate: 1-2 minutes per question
  return Math.max(15, Math.round(questionCount * 1.5))
}

const formatApiDate = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - date.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays === 1) return 'yesterday'
  if (diffDays <= 7) return `${diffDays} days ago`
  if (diffDays <= 30) return `${Math.ceil(diffDays / 7)} weeks ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const getCategoryIcon = (category: string) => {
  const icons = {
    safety: ShieldCheckIcon,
    electrical: BoltIcon,
    plumbing: WrenchScrewdriverIcon,
    structural: HomeIcon,
    environmental: BeakerIcon
  }
  return icons[category] || DocumentTextIcon
}

const getQuestionIcon = (type: string) => {
  const icons = {
    text: ChatBubbleLeftEllipsisIcon,
    textarea: DocumentIcon,
    number: HashtagIcon,
    multiple_choice: ClipboardDocumentCheckIcon,
    yes_no: CheckCircleIcon
  }
  return icons[type] || ClipboardDocumentCheckIcon
}

const getQuestionTypeLabel = (type: string) => {
  const labels = {
    text: 'Text Input',
    textarea: 'Long Text',
    number: 'Number',
    multiple_choice: 'Multiple Choice',
    yes_no: 'Yes/No'
  }
  return labels[type] || type
}

onMounted(() => {
  // Load template data
  fetchTemplate(route.params.id as string)
})
</script>

<style scoped>
.template-detail-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1.5rem;
}

.page-header {
  margin-bottom: 2rem;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 2rem;
}

.title-section {
  flex: 1;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 0.75rem;
  transition: color 0.2s;
}

.back-link:hover {
  color: hsl(var(--primary));
}

.page-title {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.page-subtitle {
  font-size: 1.125rem;
  margin: 0;
}

.actions-section {
  display: flex;
  gap: 0.75rem;
  flex-shrink: 0;
}

.template-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

/* Template Info Card */
.template-info-card {
  background: hsl(var(--background));
  border-radius: 0.75rem;
  padding: 2rem;
  box-shadow: var(--shadow-sm);
  border: 1px solid hsl(var(--border));
}

.template-header {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.template-icon {
  width: 4rem;
  height: 4rem;
  border-radius: 0.75rem;
  background: hsl(var(--muted));
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.template-meta {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.category-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.category-safety {
  background: hsl(var(--success) / 0.1);
  color: hsl(var(--success));
}

.category-electrical {
  background: hsl(var(--warning) / 0.1);
  color: hsl(var(--warning));
}

.category-plumbing {
  background: hsl(var(--primary) / 0.1);
  color: hsl(var(--primary));
}

.category-structural {
  background: hsl(var(--secondary) / 0.1);
  color: hsl(var(--secondary));
}

.category-environmental {
  background: hsl(var(--success) / 0.1);
  color: hsl(var(--success));
}

.template-description h3 {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
}

.template-description p {
  line-height: 1.6;
  margin: 0;
}

/* Questions Preview Card */
.questions-preview-card {
  background: hsl(var(--background));
  border-radius: 0.75rem;
  box-shadow: var(--shadow-sm);
  border: 1px solid hsl(var(--border));
  overflow: hidden;
}

.card-header {
  padding: 1.5rem 1.5rem 1rem;
  border-bottom: 1px solid hsl(var(--border));
}

.card-header h3 {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.card-subtitle {
  font-size: 0.875rem;
  margin: 0;
}

.questions-list {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.question-item {
  display: flex;
  gap: 1rem;
  padding: 1.5rem;
  border: 1px solid hsl(var(--border));
  border-radius: 0.5rem;
  background: hsl(var(--muted));
}

.question-number {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  background: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  font-weight: 600;
  flex-shrink: 0;
}

.question-content {
  flex: 1;
}

.question-title {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.question-description {
  font-size: 0.875rem;
  margin-bottom: 1rem;
  line-height: 1.5;
}

.question-type {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.type-label {
  font-size: 0.75rem;
  font-weight: 500;
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

.question-options {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.option-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.option-radio {
  width: 1rem;
  height: 1rem;
  border: 2px solid hsl(var(--border));
  border-radius: 50%;
  flex-shrink: 0;
}

.question-input-preview {
  margin-top: 0.5rem;
}

.input-placeholder,
.textarea-placeholder {
  padding: 0.75rem;
  border: 1px solid hsl(var(--border));
  border-radius: 0.375rem;
  background: hsl(var(--muted));
  color: hsl(var(--muted-foreground));
  font-size: 0.875rem;
  font-style: italic;
}

.textarea-placeholder {
  height: 4rem;
  display: flex;
  align-items: center;
}

.load-more {
  padding: 1.5rem;
  text-align: center;
  border-top: 1px solid hsl(var(--border));
  background: hsl(var(--muted));
}

.load-more-text {
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

/* Template Actions */
.template-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  padding: 2rem;
}

.template-actions .btn {
  min-width: 200px;
}

/* Loading State */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
}

.spinner {
  width: 2rem;
  height: 2rem;
  border: 3px solid hsl(var(--muted));
  border-top: 3px solid hsl(var(--primary));
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Responsive */
@media (max-width: 768px) {
  .template-detail-page {
    padding: 1rem;
  }

  .header-content {
    flex-direction: column;
    gap: 1rem;
  }

  .actions-section {
    align-self: flex-start;
  }

  .template-info-card {
    padding: 1.5rem;
  }

  .template-header {
    flex-direction: column;
    gap: 1rem;
  }

  .template-meta {
    flex-direction: column;
    gap: 0.75rem;
  }

  .questions-list {
    padding: 1rem;
    gap: 1.5rem;
  }

  .question-item {
    flex-direction: column;
    gap: 0.75rem;
    padding: 1rem;
  }

  .question-number {
    align-self: flex-start;
  }

  .template-actions {
    flex-direction: column;
    padding: 1.5rem;
  }

  .template-actions .btn {
    min-width: auto;
  }
}

@media (max-width: 480px) {
  .template-info-card {
    padding: 1rem;
  }

  .questions-list {
    padding: 0.75rem;
  }

  .question-item {
    padding: 0.75rem;
  }

  .template-actions {
    padding: 1rem;
  }
}
</style>