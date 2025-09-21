<template>
  <div class="template-edit-page">
    <div class="page-header">
      <div class="header-content">
        <div class="title-section">
          <router-link :to="`/templates/${templateId}`" class="back-link">
            <ArrowLeftIcon class="icon-sm" />
            Back to Template
          </router-link>
          <h1 class="page-title">Edit Template</h1>
          <p class="page-subtitle" v-if="form.name">{{ form.name }}</p>
        </div>
        <div class="actions-section">
          <button @click="resetForm" class="btn btn-secondary" :disabled="!hasChanges">
            <ArrowPathIcon class="icon-sm" />
            Reset Changes
          </button>
          <button @click="previewTemplate" class="btn btn-secondary">
            <EyeIcon class="icon-sm" />
            Preview
          </button>
          <button @click="saveTemplate" class="btn btn-primary" :disabled="!isFormValid || saving">
            <CheckIcon class="icon-sm" v-if="!saving" />
            <div class="spinner-sm" v-else></div>
            {{ saving ? 'Saving...' : 'Save Template' }}
          </button>
        </div>
      </div>
    </div>

    <div class="template-form" v-if="template">
      <!-- Basic Information -->
      <div class="form-section">
        <div class="section-header">
          <h2 class="section-title">Basic Information</h2>
          <p class="section-description">Configure the template's basic details and settings</p>
        </div>

        <div class="form-grid">
          <div class="form-group">
            <label for="name" class="form-label">Template Name *</label>
            <input
              id="name"
              type="text"
              v-model="form.name"
              placeholder="Enter template name"
              class="form-input"
              :class="{ 'error': errors.name }"
            />
            <span class="error-message" v-if="errors.name">{{ errors.name }}</span>
          </div>

          <div class="form-group">
            <label for="category" class="form-label">Category *</label>
            <select id="category" v-model="form.category" class="form-select" :class="{ 'error': errors.category }">
              <option value="">Select category</option>
              <option value="safety">Safety</option>
              <option value="electrical">Electrical</option>
              <option value="plumbing">Plumbing</option>
              <option value="structural">Structural</option>
              <option value="environmental">Environmental</option>
            </select>
            <span class="error-message" v-if="errors.category">{{ errors.category }}</span>
          </div>

          <div class="form-group full-width">
            <label for="description" class="form-label">Description *</label>
            <textarea
              id="description"
              v-model="form.description"
              placeholder="Describe what this template is used for"
              class="form-textarea"
              rows="3"
              :class="{ 'error': errors.description }"
            ></textarea>
            <span class="error-message" v-if="errors.description">{{ errors.description }}</span>
          </div>

          <div class="form-group">
            <label for="estimatedTime" class="form-label">Estimated Time (minutes) *</label>
            <input
              id="estimatedTime"
              type="number"
              v-model.number="form.estimatedTime"
              placeholder="30"
              min="1"
              max="480"
              class="form-input"
              :class="{ 'error': errors.estimatedTime }"
            />
            <span class="error-message" v-if="errors.estimatedTime">{{ errors.estimatedTime }}</span>
          </div>

          <div class="form-group">
            <label class="form-label">Status</label>
            <div class="radio-group">
              <label class="radio-option">
                <input type="radio" v-model="form.status" value="active" />
                <span class="radio-label">Active</span>
              </label>
              <label class="radio-option">
                <input type="radio" v-model="form.status" value="draft" />
                <span class="radio-label">Draft</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- Questions Section -->
      <div class="form-section">
        <div class="section-header">
          <h2 class="section-title">Questions</h2>
          <p class="section-description">Add and configure inspection questions</p>
          <button @click="addQuestion" class="btn btn-primary btn-sm">
            <PlusIcon class="icon-sm" />
            Add Question
          </button>
        </div>

        <div class="questions-list" v-if="form.questions.length > 0">
          <div
            v-for="(question, index) in form.questions"
            :key="question.id || index"
            class="question-card"
            :class="{ 'expanded': expandedQuestions.includes(index) }"
          >
            <div class="question-header" @click="toggleQuestion(index)">
              <div class="question-info">
                <div class="question-number">{{ index + 1 }}</div>
                <div class="question-preview">
                  <h4 class="question-title">{{ question.title || 'Untitled Question' }}</h4>
                  <p class="question-type">{{ getQuestionTypeLabel(question.type) }}</p>
                </div>
              </div>
              <div class="question-actions">
                <button @click.stop="duplicateQuestion(index)" class="btn-icon" title="Duplicate">
                  <DocumentDuplicateIcon class="icon-sm" />
                </button>
                <button @click.stop="deleteQuestion(index)" class="btn-icon btn-danger" title="Delete">
                  <TrashIcon class="icon-sm" />
                </button>
                <ChevronDownIcon
                  class="icon-sm chevron"
                  :class="{ 'rotated': expandedQuestions.includes(index) }"
                />
              </div>
            </div>

            <div class="question-content" v-if="expandedQuestions.includes(index)">
              <div class="form-grid">
                <div class="form-group full-width">
                  <label class="form-label">Question Text *</label>
                  <input
                    type="text"
                    v-model="question.title"
                    placeholder="Enter your question"
                    class="form-input"
                  />
                </div>

                <div class="form-group full-width">
                  <label class="form-label">Description (Optional)</label>
                  <textarea
                    v-model="question.description"
                    placeholder="Additional context or instructions for this question"
                    class="form-textarea"
                    rows="2"
                  ></textarea>
                </div>

                <div class="form-group">
                  <label class="form-label">Question Type *</label>
                  <select v-model="question.type" class="form-select" @change="resetQuestionOptions(question)">
                    <option value="text">Text Input</option>
                    <option value="textarea">Long Text</option>
                    <option value="number">Number</option>
                    <option value="yes_no">Yes/No</option>
                    <option value="multiple_choice">Multiple Choice</option>
                    <option value="checkbox">Checkbox</option>
                    <option value="date">Date</option>
                    <option value="time">Time</option>
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label">Section</label>
                  <select v-model="question.section" class="form-select">
                    <option value="">Select or create section</option>
                    <option v-for="section in availableSections" :key="section" :value="section">
                      {{ section }}
                    </option>
                  </select>
                  <input
                    v-if="question.section === '' || !availableSections.includes(question.section)"
                    type="text"
                    v-model="question.customSection"
                    placeholder="Enter new section name"
                    class="form-input mt-2"
                    @input="updateQuestionSection(question)"
                  />
                  <p class="form-help">Group related questions together by section (e.g., "Fire Safety", "Structural Elements"). Questions in the same section will be grouped together in the inspection form.</p>
                </div>

                <div class="form-group">
                  <label class="form-label">Required</label>
                  <div class="checkbox-group">
                    <label class="checkbox-option">
                      <input type="checkbox" v-model="question.required" />
                      <span class="checkbox-label">This question is required</span>
                    </label>
                  </div>
                </div>

                <!-- Multiple Choice Options -->
                <div class="form-group full-width" v-if="question.type === 'multiple_choice' || question.type === 'checkbox'">
                  <label class="form-label">Answer Options</label>
                  <div class="options-list">
                    <div
                      v-for="(option, optionIndex) in question.options"
                      :key="optionIndex"
                      class="option-item"
                    >
                      <input
                        type="text"
                        v-model="question.options[optionIndex]"
                        placeholder="Enter option"
                        class="form-input"
                      />
                      <button
                        @click="removeOption(question, optionIndex)"
                        class="btn-icon btn-danger"
                        :disabled="question.options.length <= 2"
                        title="Remove option"
                      >
                        <TrashIcon class="icon-sm" />
                      </button>
                    </div>
                  </div>
                  <button @click="addOption(question)" class="btn btn-secondary btn-sm">
                    <PlusIcon class="icon-sm" />
                    Add Option
                  </button>
                </div>

                <!-- Question Preview -->
                <div class="form-group full-width">
                  <label class="form-label">Preview</label>
                  <div class="question-preview-box">
                    <QuestionPreview :question="question" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="empty-questions">
          <ClipboardDocumentListIcon class="icon-xl" />
          <h3>No Questions Added</h3>
          <p>Start building your template by adding your first question.</p>
          <button @click="addQuestion" class="btn btn-primary">
            <PlusIcon class="icon-sm" />
            Add First Question
          </button>
        </div>
      </div>

      <!-- Section Management -->
      <div class="form-section" v-if="availableSections.length > 0">
        <div class="section-header">
          <h2 class="section-title">Section Management</h2>
          <p class="section-description">Organize and manage question sections</p>
        </div>

        <div class="section-management">
          <div class="sections-list">
            <div
              v-for="(section, index) in availableSections"
              :key="section"
              class="section-item"
            >
              <div class="section-info">
                <div class="section-name" v-if="!editingSections[section]">
                  <TagIcon class="icon-sm" />
                  <span class="section-title-text">{{ section }}</span>
                  <span class="question-count">({{ getQuestionCountForSection(section) }} questions)</span>
                </div>
                <div class="section-edit" v-else>
                  <input
                    type="text"
                    v-model="sectionEditNames[section]"
                    class="form-input section-input"
                    @keyup.enter="saveSection(section)"
                    @keyup.escape="cancelEditSection(section)"
                    ref="sectionInput"
                  />
                </div>
              </div>

              <div class="section-actions">
                <button
                  v-if="!editingSections[section]"
                  @click="startEditSection(section)"
                  class="btn-icon"
                  title="Rename section"
                >
                  <PencilIcon class="icon-sm" />
                </button>
                <template v-else>
                  <button
                    @click="saveSection(section)"
                    class="btn-icon btn-success"
                    title="Save changes"
                  >
                    <CheckIcon class="icon-sm" />
                  </button>
                  <button
                    @click="cancelEditSection(section)"
                    class="btn-icon"
                    title="Cancel"
                  >
                    <XMarkIcon class="icon-sm" />
                  </button>
                </template>
                <button
                  v-if="!editingSections[section]"
                  @click="deleteSection(section)"
                  class="btn-icon btn-danger"
                  title="Delete section"
                >
                  <TrashIcon class="icon-sm" />
                </button>
              </div>
            </div>
          </div>

          <div class="section-help">
            <p class="help-text">
              <strong>Tips:</strong> Rename sections to better organize your questions.
              Deleting a section will move its questions to "No Section".
            </p>
          </div>
        </div>
      </div>

      <!-- Template Settings -->
      <div class="form-section">
        <div class="section-header">
          <h2 class="section-title">Advanced Settings</h2>
          <p class="section-description">Configure additional template options</p>
        </div>

        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">Allow Photos</label>
            <div class="checkbox-group">
              <label class="checkbox-option">
                <input type="checkbox" v-model="form.settings.allowPhotos" />
                <span class="checkbox-label">Enable photo uploads during inspection</span>
              </label>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Allow Comments</label>
            <div class="checkbox-group">
              <label class="checkbox-option">
                <input type="checkbox" v-model="form.settings.allowComments" />
                <span class="checkbox-label">Allow additional comments for each section</span>
              </label>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Auto-Save Progress</label>
            <div class="checkbox-group">
              <label class="checkbox-option">
                <input type="checkbox" v-model="form.settings.autoSave" />
                <span class="checkbox-label">Automatically save inspection progress</span>
              </label>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Require Digital Signature</label>
            <div class="checkbox-group">
              <label class="checkbox-option">
                <input type="checkbox" v-model="form.settings.requireSignature" />
                <span class="checkbox-label">Require inspector signature before completion</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-else class="loading-state">
      <div class="spinner"></div>
      <p>Loading template...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  EyeIcon,
  CheckIcon,
  PlusIcon,
  DocumentDuplicateIcon,
  TrashIcon,
  ChevronDownIcon,
  ClipboardDocumentListIcon,
  TagIcon,
  PencilIcon,
  XMarkIcon
} from '@heroicons/vue/24/outline'
import QuestionPreview from '@/components/QuestionPreview.vue'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()

const templateId = computed(() => route.params.id as string)
const saving = ref(false)
const template = ref(null)
const expandedQuestions = ref<number[]>([])

// Section editing state
const editingSections = ref<Record<string, boolean>>({})
const sectionEditNames = ref<Record<string, string>>({})

// Form data
const form = reactive({
  name: '',
  description: '',
  category: '',
  estimatedTime: 30,
  status: 'active',
  questions: [],
  settings: {
    allowPhotos: true,
    allowComments: true,
    autoSave: true,
    requireSignature: false
  }
})

// Original form data for comparison
const originalForm = ref(null)

// Form validation
const errors = reactive({
  name: '',
  description: '',
  category: '',
  estimatedTime: ''
})

const isFormValid = computed(() => {
  return form.name.trim() &&
         form.description.trim() &&
         form.category &&
         form.estimatedTime > 0 &&
         form.questions.length > 0
})

const hasChanges = computed(() => {
  if (!originalForm.value) return false
  return JSON.stringify(form) !== JSON.stringify(originalForm.value)
})

const availableSections = computed(() => {
  const sections = new Set<string>()
  form.questions.forEach(question => {
    if (question.section && question.section.trim()) {
      sections.add(question.section.trim())
    }
  })
  return Array.from(sections).sort()
})

// Methods
const loadTemplate = async () => {
  try {
    // Mock template data (in real app, this would be an API call)
    const templateData = {
      id: templateId.value,
      name: 'Building Safety Inspection',
      description: 'Comprehensive safety inspection covering structural integrity, fire safety, and general building conditions.',
      category: 'safety',
      estimatedTime: 60,
      status: 'active',
      questions: [
        {
          id: 1,
          title: "Overall building condition",
          description: "Assess the general condition of the building structure",
          type: "multiple_choice",
          required: true,
          section: "Structural Assessment",
          customSection: "",
          options: ["Excellent", "Good", "Fair", "Poor", "Critical"]
        },
        {
          id: 2,
          title: "Fire safety equipment present",
          description: "Check for presence of fire extinguishers, alarms, and exit signs",
          type: "yes_no",
          required: true,
          section: "Fire Safety",
          customSection: ""
        },
        {
          id: 3,
          title: "Emergency exit accessibility",
          description: "Verify that all emergency exits are clear and accessible",
          type: "yes_no",
          required: true,
          section: "Fire Safety",
          customSection: ""
        },
        {
          id: 4,
          title: "Foundation integrity",
          description: "Check for cracks, settling, or other structural issues in the foundation",
          type: "multiple_choice",
          required: true,
          section: "Structural Assessment",
          customSection: "",
          options: ["Excellent", "Good", "Needs Monitoring", "Requires Repair", "Critical"]
        }
      ],
      settings: {
        allowPhotos: true,
        allowComments: true,
        autoSave: true,
        requireSignature: false
      }
    }

    // Update form with template data
    Object.assign(form, templateData)
    originalForm.value = JSON.parse(JSON.stringify(templateData))
    template.value = templateData

    // Expand first question by default
    if (form.questions.length > 0) {
      expandedQuestions.value = [0]
    }
  } catch (error) {
    console.error('Failed to load template:', error)
    appStore.showErrorMessage('Failed to load template')
  }
}

const validateForm = () => {
  // Reset errors
  Object.keys(errors).forEach(key => errors[key] = '')

  if (!form.name.trim()) {
    errors.name = 'Template name is required'
  }

  if (!form.description.trim()) {
    errors.description = 'Description is required'
  }

  if (!form.category) {
    errors.category = 'Please select a category'
  }

  if (form.estimatedTime <= 0 || form.estimatedTime > 480) {
    errors.estimatedTime = 'Estimated time must be between 1 and 480 minutes'
  }

  return Object.values(errors).every(error => !error)
}

const saveTemplate = async () => {
  if (!validateForm()) {
    appStore.showErrorMessage('Please fix the errors before saving')
    return
  }

  saving.value = true
  try {
    // Mock save operation (in real app, this would be an API call)
    await new Promise(resolve => setTimeout(resolve, 1500))

    // Update original form data
    originalForm.value = JSON.parse(JSON.stringify(form))

    appStore.showSuccessMessage('Template saved successfully')
    router.push(`/templates/${templateId.value}`)
  } catch (error) {
    console.error('Failed to save template:', error)
    appStore.showErrorMessage('Failed to save template')
  } finally {
    saving.value = false
  }
}

const resetForm = () => {
  if (originalForm.value) {
    Object.assign(form, JSON.parse(JSON.stringify(originalForm.value)))
    appStore.showInfoMessage('Changes have been reset')
  }
}

const previewTemplate = () => {
  router.push(`/templates/${templateId.value}/preview`)
}

const toggleQuestion = (index: number) => {
  const expandedIndex = expandedQuestions.value.indexOf(index)
  if (expandedIndex > -1) {
    expandedQuestions.value.splice(expandedIndex, 1)
  } else {
    expandedQuestions.value.push(index)
  }
}

const addQuestion = () => {
  const newQuestion = {
    id: Date.now(),
    title: '',
    description: '',
    type: 'text',
    required: false,
    section: '',
    customSection: '',
    options: []
  }

  form.questions.push(newQuestion)

  // Expand the new question
  const newIndex = form.questions.length - 1
  if (!expandedQuestions.value.includes(newIndex)) {
    expandedQuestions.value.push(newIndex)
  }
}

const duplicateQuestion = (index: number) => {
  const questionToDuplicate = { ...form.questions[index] }
  questionToDuplicate.id = Date.now()
  questionToDuplicate.title = questionToDuplicate.title + ' (Copy)'

  form.questions.splice(index + 1, 0, questionToDuplicate)

  // Update expanded questions indices
  expandedQuestions.value = expandedQuestions.value.map(expandedIndex =>
    expandedIndex > index ? expandedIndex + 1 : expandedIndex
  )

  // Expand the duplicated question
  expandedQuestions.value.push(index + 1)
}

const deleteQuestion = (index: number) => {
  if (confirm('Are you sure you want to delete this question?')) {
    form.questions.splice(index, 1)

    // Update expanded questions indices
    expandedQuestions.value = expandedQuestions.value
      .filter(expandedIndex => expandedIndex !== index)
      .map(expandedIndex => expandedIndex > index ? expandedIndex - 1 : expandedIndex)
  }
}

const resetQuestionOptions = (question: any) => {
  if (question.type === 'multiple_choice' || question.type === 'checkbox') {
    if (!question.options || question.options.length === 0) {
      question.options = ['Option 1', 'Option 2']
    }
  } else {
    question.options = []
  }
}

const addOption = (question: any) => {
  if (!question.options) {
    question.options = []
  }
  question.options.push(`Option ${question.options.length + 1}`)
}

const removeOption = (question: any, optionIndex: number) => {
  if (question.options.length > 2) {
    question.options.splice(optionIndex, 1)
  }
}

const getQuestionTypeLabel = (type: string) => {
  const labels = {
    text: 'Text Input',
    textarea: 'Long Text',
    number: 'Number',
    yes_no: 'Yes/No',
    multiple_choice: 'Multiple Choice',
    checkbox: 'Checkbox',
    date: 'Date',
    time: 'Time'
  }
  return labels[type] || type
}

const updateQuestionSection = (question: any) => {
  if (question.customSection && question.customSection.trim()) {
    question.section = question.customSection.trim()
    question.customSection = ''
  }
}

// Section management methods
const getQuestionCountForSection = (section: string) => {
  return form.questions.filter(q => q.section === section).length
}

const startEditSection = (section: string) => {
  editingSections.value[section] = true
  sectionEditNames.value[section] = section
}

const cancelEditSection = (section: string) => {
  editingSections.value[section] = false
  delete sectionEditNames.value[section]
}

const saveSection = (oldSection: string) => {
  const newSection = sectionEditNames.value[oldSection]?.trim()

  if (!newSection || newSection === oldSection) {
    cancelEditSection(oldSection)
    return
  }

  // Check if new section name already exists
  if (availableSections.value.includes(newSection)) {
    appStore.showErrorMessage('A section with that name already exists')
    return
  }

  // Update all questions with this section
  form.questions.forEach(question => {
    if (question.section === oldSection) {
      question.section = newSection
    }
  })

  // Clean up editing state
  editingSections.value[oldSection] = false
  delete sectionEditNames.value[oldSection]

  appStore.showSuccessMessage(`Section renamed to "${newSection}"`)
}

const deleteSection = (section: string) => {
  const questionCount = getQuestionCountForSection(section)
  const message = questionCount > 0
    ? `Are you sure you want to delete "${section}"? This will move ${questionCount} questions to "No Section".`
    : `Are you sure you want to delete "${section}"?`

  if (confirm(message)) {
    // Move questions to no section
    form.questions.forEach(question => {
      if (question.section === section) {
        question.section = ''
      }
    })

    appStore.showSuccessMessage(`Section "${section}" deleted`)
  }
}

onMounted(() => {
  loadTemplate()
})
</script>

<style scoped>
.template-edit-page {
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

/* Form Sections */
.template-form {
  display: flex;
  flex-direction: column;
  gap: 3rem;
}

.form-section {
  background: hsl(var(--background));
  border-radius: 0.75rem;
  box-shadow: var(--shadow-sm);
  border: 1px solid hsl(var(--border));
  overflow: hidden;
}

.section-header {
  padding: 1.5rem 1.5rem 1rem;
  border-bottom: 1px solid hsl(var(--border));
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.section-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.section-description {
  font-size: 0.875rem;
  margin: 0;
  flex: 1;
}

/* Form Elements */
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
  padding: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group.full-width {
  grid-column: span 2;
}

.form-label {
  font-size: 0.875rem;
  font-weight: 500;
}

.form-input,
.form-select,
.form-textarea {
  padding: 0.75rem;
  border: 1px solid hsl(var(--border));
  border-radius: 0.375rem;
  font-size: 0.875rem;
  transition: all 0.2s;
  background: hsl(var(--background));
  color: hsl(var(--foreground));
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  outline: none;
  border-color: hsl(var(--primary));
  box-shadow: 0 0 0 3px hsl(var(--primary) / 0.1);
}

.form-input.error,
.form-select.error,
.form-textarea.error {
  border-color: hsl(var(--destructive));
}

.error-message {
  color: hsl(var(--destructive));
  font-size: 0.75rem;
  font-weight: 500;
}

.form-help {
  font-size: 0.75rem;
  line-height: 1.4;
  margin: 0;
}

.mt-2 {
  margin-top: 0.5rem;
}

.radio-group,
.checkbox-group {
  display: flex;
  gap: 1rem;
}

.radio-option,
.checkbox-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.radio-label,
.checkbox-label {
  font-size: 0.875rem;
}

/* Questions */
.questions-list {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.question-card {
  border: 1px solid hsl(var(--border));
  border-radius: 0.5rem;
  transition: all 0.2s;
}

.question-card.expanded {
  border-color: hsl(var(--primary));
  box-shadow: var(--shadow-sm);
}

.question-header {
  padding: 1rem 1.5rem;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.question-header:hover {
  background: hsl(var(--muted));
}

.question-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
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

.question-preview {
  flex: 1;
  min-width: 0;
}

.question-title {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.question-type {
  font-size: 0.75rem;
  margin: 0;
}

.question-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-icon {
  padding: 0.5rem;
  border: none;
  background: none;
  cursor: pointer;
  border-radius: 0.25rem;
  transition: all 0.2s;
}

.btn-icon:hover {
  background: hsl(var(--muted));
}

.btn-icon.btn-danger:hover {
  color: hsl(var(--destructive));
  background: hsl(var(--destructive) / 0.1);
}

.chevron {
  transition: transform 0.2s;
}

.chevron.rotated {
  transform: rotate(180deg);
}

.question-content {
  border-top: 1px solid hsl(var(--border));
  padding: 0;
}

.options-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.option-item {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.question-preview-box {
  padding: 1rem;
  border: 1px solid hsl(var(--border));
  border-radius: 0.375rem;
  background: hsl(var(--muted));
}

.empty-questions {
  padding: 3rem 1.5rem;
  text-align: center;
}

.empty-questions h3 {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 1rem 0 0.5rem;
}

.empty-questions p {
  margin-bottom: 1.5rem;
  font-size: 0.875rem;
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

.spinner-sm {
  width: 1rem;
  height: 1rem;
  border: 2px solid hsl(var(--muted));
  border-top: 2px solid hsl(var(--primary-foreground));
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Section Management */
.section-management {
  padding: 1.5rem;
}

.sections-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.section-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border: 1px solid hsl(var(--border));
  border-radius: 0.5rem;
  background: hsl(var(--muted));
  transition: all 0.2s;
}

.section-item:hover {
  border-color: hsl(var(--border));
  background: hsl(var(--background));
}

.section-info {
  flex: 1;
  min-width: 0;
}

.section-name {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.section-title-text {
  font-size: 1rem;
  font-weight: 600;
}

.question-count {
  font-size: 0.875rem;
  font-weight: 400;
}

.section-edit {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.section-input {
  max-width: 200px;
  font-size: 1rem;
  font-weight: 600;
}

.section-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.btn-success {
  color: hsl(var(--success));
}

.btn-success:hover {
  color: hsl(var(--success));
  background: hsl(var(--success) / 0.1);
}

.section-help {
  padding: 1rem;
  background: hsl(var(--muted));
  border: 1px solid hsl(var(--border));
  border-radius: 0.5rem;
}

.help-text {
  font-size: 0.875rem;
  color: hsl(var(--muted-foreground));
  margin: 0;
  line-height: 1.5;
}

/* Responsive */
@media (max-width: 768px) {
  .template-edit-page {
    padding: 1rem;
  }

  .header-content {
    flex-direction: column;
    gap: 1rem;
  }

  .actions-section {
    align-self: flex-start;
  }

  .form-grid {
    grid-template-columns: 1fr;
    padding: 1rem;
  }

  .form-group.full-width {
    grid-column: span 1;
  }

  .section-header {
    flex-direction: column;
    align-items: flex-start;
    padding: 1rem;
  }

  .questions-list {
    padding: 1rem;
  }

  .question-header {
    padding: 1rem;
  }

  .question-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .question-actions {
    flex-shrink: 0;
  }
}

@media (max-width: 480px) {
  .actions-section {
    flex-direction: column;
  }

  .radio-group,
  .checkbox-group {
    flex-direction: column;
  }

  .option-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }
}
</style>