<template>
  <div class="template-create-page">
    <div class="page-header">
      <div class="header-content">
        <div class="header-left">
          <router-link to="/templates" class="back-link">
            <ChevronLeftIcon class="icon-sm" />
            Back to Templates
          </router-link>
          <h1 class="page-title">Create New Template</h1>
          <p class="page-subtitle">Design a custom inspection template step by step</p>
        </div>
      </div>
    </div>

    <!-- Progress Steps -->
    <div class="progress-steps">
      <div class="step" :class="{ active: currentStep >= 1, completed: currentStep > 1 }">
        <div class="step-number">1</div>
        <span class="step-label">Basic Info</span>
      </div>
      <div class="step-divider"></div>
      <div class="step" :class="{ active: currentStep >= 2, completed: currentStep > 2 }">
        <div class="step-number">2</div>
        <span class="step-label">Sections & Questions</span>
      </div>
      <div class="step-divider"></div>
      <div class="step" :class="{ active: currentStep >= 3, completed: currentStep > 3 }">
        <div class="step-number">3</div>
        <span class="step-label">Preview</span>
      </div>
    </div>

    <div class="template-form-container">
      <!-- Step 1: Basic Information -->
      <div v-if="currentStep === 1" class="form-section">
        <div class="section-header">
          <DocumentTextIcon class="icon-md section-icon" />
          <div>
            <h3 class="section-title">Basic Information</h3>
            <p class="section-description">Set up the basic details for your inspection template</p>
          </div>
        </div>

        <div class="section-content">
          <div class="form-grid">
            <div class="form-group">
              <label for="template-name" class="form-label">Template Name *</label>
              <input
                id="template-name"
                type="text"
                v-model="templateForm.name"
                placeholder="e.g., Building Safety Inspection"
                class="form-input"
                required
              />
            </div>

            <div class="form-group">
              <label for="template-category" class="form-label">Category *</label>
              <select id="template-category" v-model="templateForm.category" class="form-select" required>
                <option value="">Select a category</option>
                <option value="safety">Safety</option>
                <option value="electrical">Electrical</option>
                <option value="plumbing">Plumbing</option>
                <option value="structural">Structural</option>
                <option value="environmental">Environmental</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label for="template-description" class="form-label">Description</label>
            <textarea
              id="template-description"
              v-model="templateForm.description"
              placeholder="Describe what this template is used for and what it covers..."
              class="form-textarea"
              rows="3"
            ></textarea>
          </div>

          <div class="form-grid">
            <div class="form-group">
              <label for="estimated-time" class="form-label">Estimated Time (minutes)</label>
              <input
                id="estimated-time"
                type="number"
                v-model="templateForm.estimatedTime"
                placeholder="30"
                class="form-input"
                min="5"
                max="300"
              />
            </div>

            <div class="form-group">
              <label class="form-label">Template Status</label>
              <div class="radio-group">
                <label class="radio-option">
                  <input type="radio" v-model="templateForm.status" value="draft" />
                  <span class="radio-label">Draft</span>
                </label>
                <label class="radio-option">
                  <input type="radio" v-model="templateForm.status" value="active" />
                  <span class="radio-label">Active</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div class="step-actions">
          <button @click="nextStep" class="btn btn-primary" :disabled="!canProceedFromStep1">
            Next: Add Sections & Questions
            <ArrowRightIcon class="icon-sm" />
          </button>
        </div>
      </div>

      <!-- Step 2: Sections & Questions -->
      <div v-else-if="currentStep === 2" class="form-section">
        <div class="section-header">
          <div class="section-header-content">
            <div class="section-header-title-row">
              <TagIcon class="icon-md section-icon" />
              <h3 class="section-title">Sections & Questions</h3>
            </div>
            <p class="section-description">Organize your inspection into sections and add questions</p>
          </div>
        </div>

        <div class="section-content">
          <div v-if="templateForm.sections.length === 0" class="empty-sections">
            <TagIcon class="icon-xl" />
            <h4>No Sections Added</h4>
            <p>Start by adding sections to organize your inspection questions (e.g., "Fire Safety", "Structural Elements").</p>
            <button @click="addSection" class="btn btn-primary">
              <PlusIcon class="icon-sm" />
              Add First Section
            </button>
          </div>

          <div v-else class="sections-with-questions-builder">
            <div
              v-for="(section, sectionIndex) in templateForm.sections"
              :key="section.id"
              class="section-builder"
            >
              <!-- Section Header -->
              <div class="section-builder-header">
                <div class="section-number">{{ sectionIndex + 1 }}</div>
                <div class="section-info">
                  <div class="form-group">
                    <input
                      type="text"
                      v-model="section.name"
                      placeholder="Section name (e.g., Fire Safety, Electrical Systems)"
                      class="form-input section-name-input"
                    />
                  </div>
                  <div class="form-group" v-if="section.description !== undefined">
                    <textarea
                      v-model="section.description"
                      placeholder="Brief description (optional)"
                      class="form-textarea section-description-input"
                      rows="2"
                    ></textarea>
                  </div>
                </div>
                <div class="section-header-actions">
                  <button
                    @click="moveSection(sectionIndex, -1)"
                    :disabled="sectionIndex === 0"
                    class="btn-icon"
                    title="Move section up"
                  >
                    <ChevronUpIcon class="icon-sm" />
                  </button>
                  <button
                    @click="moveSection(sectionIndex, 1)"
                    :disabled="sectionIndex === templateForm.sections.length - 1"
                    class="btn-icon"
                    title="Move section down"
                  >
                    <ChevronDownIcon class="icon-sm" />
                  </button>
                  <button
                    @click="duplicateSection(sectionIndex)"
                    class="btn-icon"
                    title="Duplicate section"
                  >
                    <DocumentDuplicateIcon class="icon-sm" />
                  </button>
                  <button
                    @click="deleteSection(sectionIndex)"
                    class="btn-icon btn-danger"
                    title="Delete section"
                  >
                    <TrashIcon class="icon-sm" />
                  </button>
                </div>
              </div>

              <!-- Questions in Section -->
              <div class="section-questions">
                <div class="questions-header">
                  <span class="questions-label">Questions ({{ section.questions.length }})</span>
                </div>

                <div v-if="section.questions.length === 0" class="empty-questions-inline">
                  <p>No questions in this section yet.</p>
                  <button @click="addQuestion(sectionIndex)" class="btn btn-sm btn-primary">
                    <PlusIcon class="icon-sm" />
                    Add First Question
                  </button>
                </div>

                <div v-else class="questions-list-compact">
                  <div
                    v-for="(question, questionIndex) in section.questions"
                    :key="question.id"
                    class="question-builder"
                  >
                    <!-- Question Builder Header (similar to section header) -->
                    <div class="question-builder-header">
                      <div class="question-number">{{ questionIndex + 1 }}</div>
                      <div class="question-info">
                        <div class="form-group">
                          <input
                            type="text"
                            v-model="question.title"
                            placeholder="Enter your question (e.g., Is the fire safety equipment accessible?)"
                            class="form-input question-title-input"
                          />
                        </div>
                        <div class="question-meta-row">
                          <div class="question-requirement-group">
                            <span class="requirement-label">Requirement:</span>
                            <div class="question-type-radio">
                              <label class="radio-option">
                                <input
                                  type="radio"
                                  :name="`question-type-${question.id}`"
                                  :value="true"
                                  v-model="question.required"
                                  class="radio-input"
                                />
                                <span class="radio-label">Mandatory</span>
                              </label>
                              <label class="radio-option">
                                <input
                                  type="radio"
                                  :name="`question-type-${question.id}`"
                                  :value="false"
                                  v-model="question.required"
                                  class="radio-input"
                                />
                                <span class="radio-label">Optional</span>
                              </label>
                            </div>
                          </div>
                          <select
                            v-model="question.type"
                            class="form-select question-type-select"
                            @change="resetQuestionOptions(question)"
                          >
                            <option value="text">Text</option>
                            <option value="textarea">Long Text</option>
                            <option value="number">Number</option>
                            <option value="yes_no">Yes/No</option>
                            <option value="multiple_choice">Multiple Choice</option>
                            <option value="checkbox">Checkbox</option>
                            <option value="date">Date</option>
                            <option value="time">Time</option>
                            <option value="rating">Rating</option>
                          </select>
                        </div>
                      </div>
                      <div class="question-header-actions">
                        <button
                          @click="moveQuestionUp(sectionIndex, questionIndex)"
                          :disabled="questionIndex === 0"
                          class="btn-icon"
                          title="Move question up"
                        >
                          <ChevronUpIcon class="icon-sm" />
                        </button>
                        <button
                          @click="moveQuestionDown(sectionIndex, questionIndex)"
                          :disabled="questionIndex === section.questions.length - 1"
                          class="btn-icon"
                          title="Move question down"
                        >
                          <ChevronDownIcon class="icon-sm" />
                        </button>
                        <button
                          @click="duplicateQuestion(sectionIndex, questionIndex)"
                          class="btn-icon"
                          title="Duplicate question"
                        >
                          <DocumentDuplicateIcon class="icon-sm" />
                        </button>
                        <button
                          @click="deleteQuestion(sectionIndex, questionIndex)"
                          class="btn-icon btn-danger"
                          title="Delete question"
                        >
                          <TrashIcon class="icon-sm" />
                        </button>
                      </div>
                    </div>

                    <!-- Question Options (when applicable) -->
                    <div v-if="question.type === 'multiple_choice' || question.type === 'checkbox'" class="question-options">
                      <div class="options-compact">
                        <div
                          v-for="(option, optionIndex) in question.options"
                          :key="optionIndex"
                          class="option-compact"
                        >
                          <input
                            type="text"
                            v-model="question.options[optionIndex]"
                            placeholder="Option"
                            class="form-input option-input"
                          />
                          <button
                            @click="removeOption(question, optionIndex)"
                            class="btn-icon btn-danger btn-xs"
                            :disabled="question.options.length <= 2"
                            title="Remove"
                          >
                            <TrashIcon class="icon-xs" />
                          </button>
                        </div>
                        <button @click="addOption(question)" class="btn btn-xs btn-secondary">
                          <PlusIcon class="icon-xs" />
                          Add Option
                        </button>
                      </div>
                    </div>

                    <!-- Rating Scale Options -->
                    <div v-if="question.type === 'rating'" class="rating-options">
                      <div class="rating-settings">
                        <input
                          type="number"
                          v-model="question.ratingMin"
                          placeholder="Min"
                          class="form-input rating-input"
                          min="1"
                          max="5"
                        />
                        <span>to</span>
                        <input
                          type="number"
                          v-model="question.ratingMax"
                          placeholder="Max"
                          class="form-input rating-input"
                          min="2"
                          max="10"
                        />
                        <input
                          type="text"
                          v-model="question.ratingLowLabel"
                          placeholder="Low label"
                          class="form-input rating-label-input"
                        />
                        <input
                          type="text"
                          v-model="question.ratingHighLabel"
                          placeholder="High label"
                          class="form-input rating-label-input"
                        />
                      </div>
                    </div>
                  </div>

                  <!-- Add Question Button at the end of questions -->
                  <div class="add-question-bottom">
                    <button @click="addQuestion(sectionIndex)" class="btn btn-sm btn-secondary">
                      <PlusIcon class="icon-sm" />
                      Add Question
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Simple Add Section (only show when sections exist) -->
          <div v-if="templateForm.sections.length > 0" class="add-section-simple">
            <div class="simple-placeholder">
              <div class="placeholder-section-number">{{ templateForm.sections.length + 1 }}</div>
              <div class="placeholder-content">
                <button @click="addSection" class="btn btn-secondary btnSection">
                  <PlusIcon class="icon-sm" />
                  Add Section
                </button>
                <p class="placeholder-hint">Add another section to organize more questions</p>
              </div>
              <div class="section-questions"></div>
            </div>
          </div>
        </div>

        <div class="step-actions">
          <button @click="prevStep" class="btn btn-secondary">
            <ArrowLeftIcon class="icon-sm" />
            Back
          </button>
          <button @click="nextStep" class="btn btn-primary" :disabled="!canProceedFromStep2">
            Next: Preview Template
            <ArrowRightIcon class="icon-sm" />
          </button>
        </div>
      </div>

      <!-- Step 3: Preview -->
      <div v-else-if="currentStep === 3" class="form-section">
        <div class="section-header">
          <EyeIcon class="icon-md section-icon" />
          <div>
            <h3 class="section-title">Template Preview</h3>
            <p class="section-description">Review your template before saving</p>
          </div>
        </div>

        <!-- Error Message -->
        <div v-if="error" class="error-message">
          <ExclamationTriangleIcon class="icon-sm" />
          <span>{{ error }}</span>
        </div>

        <div class="section-content">
          <!-- Template Summary -->
          <div class="template-summary">
            <div class="summary-header">
              <h4>{{ templateForm.name || 'Untitled Template' }}</h4>
              <div class="template-meta">
                <span class="template-category">{{ templateForm.category || 'No Category' }}</span>
                <span class="template-time">{{ templateForm.estimatedTime || 0 }} minutes</span>
                <span class="template-status">{{ templateForm.status === 'active' ? 'Active' : 'Draft' }}</span>
              </div>
            </div>
            <p v-if="templateForm.description" class="template-description">{{ templateForm.description }}</p>
          </div>

          <!-- Template Structure -->
          <div class="template-structure">
            <div class="structure-stats">
              <div class="stat">
                <span class="stat-number">{{ templateForm.sections.length }}</span>
                <span class="stat-label">Sections</span>
              </div>
              <div class="stat">
                <span class="stat-number">{{ totalQuestions }}</span>
                <span class="stat-label">Questions</span>
              </div>
              <div class="stat">
                <span class="stat-number">{{ requiredQuestions }}</span>
                <span class="stat-label">Mandatory</span>
              </div>
            </div>

            <!-- Sections Preview -->
            <div class="sections-preview">
              <div
                v-for="(section, index) in templateForm.sections"
                :key="section.id"
                class="section-preview"
              >
                <div class="section-preview-header">
                  <div class="section-preview-number">{{ index + 1 }}</div>
                  <div class="section-preview-info">
                    <h5>{{ section.name || 'Untitled Section' }}</h5>
                    <p v-if="section.description">{{ section.description }}</p>
                    <span class="questions-count">{{ section.questions.length }} questions</span>
                  </div>
                </div>

                <div v-if="section.questions.length > 0" class="questions-preview">
                  <div
                    v-for="(question, qIndex) in section.questions"
                    :key="question.id"
                    class="question-preview-item"
                  >
                    <div class="question-preview-header">
                      <span class="question-preview-number">{{ qIndex + 1 }}</span>
                      <span class="question-preview-title">{{ question.title || 'Untitled Question' }}</span>
                      <span class="question-preview-type">{{ getQuestionTypeLabel(question.type) }}</span>
                      <span v-if="question.required" class="required-indicator">Mandatory</span>
                    </div>

                    <!-- Show options for multiple choice/checkbox -->
                    <div v-if="(question.type === 'multiple_choice' || question.type === 'checkbox') && question.options" class="question-preview-options">
                      <span class="options-label">Options:</span>
                      <span class="options-list">{{ question.options.join(', ') }}</span>
                    </div>

                    <!-- Show rating scale -->
                    <div v-if="question.type === 'rating'" class="question-preview-rating">
                      <span class="rating-scale">{{ question.ratingMin || 1 }} to {{ question.ratingMax || 5 }}</span>
                      <span v-if="question.ratingLowLabel || question.ratingHighLabel" class="rating-labels">
                        ({{ question.ratingLowLabel || 'Low' }} - {{ question.ratingHighLabel || 'High' }})
                      </span>
                    </div>
                  </div>
                </div>

                <div v-else class="no-questions-preview">
                  <p>No questions in this section</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Validation Messages -->
          <div v-if="validationIssues.length > 0" class="validation-issues">
            <h5>⚠️ Issues to Address:</h5>
            <ul>
              <li v-for="issue in validationIssues" :key="issue">{{ issue }}</li>
            </ul>
          </div>
        </div>

        <div class="step-actions">
          <button @click="prevStep" class="btn btn-secondary">
            <ArrowLeftIcon class="icon-sm" />
            Back to Edit
          </button>
          <div class="save-actions">
            <button @click="saveTemplate('draft')" class="btn btn-secondary">
              <DocumentArrowDownIcon class="icon-sm" />
              Save as Draft
            </button>
            <button @click="saveTemplate('active')" class="btn btn-primary" :disabled="!canSaveTemplate || isLoading">
              <CheckIcon v-if="!isLoading" class="icon-sm" />
              <div v-else class="loading-spinner" style="width: 1rem; height: 1rem; border-width: 2px;"></div>
              {{ isLoading ? 'Creating...' : 'Create Template' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { apiUtils } from '@/utils/api'
import {
  ChevronLeftIcon,
  DocumentTextIcon,
  TagIcon,
  ClipboardDocumentCheckIcon,
  PlusIcon,
  ClipboardDocumentListIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  DocumentDuplicateIcon,
  TrashIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  DocumentArrowDownIcon,
  CheckIcon,
  EyeIcon,
  ExclamationTriangleIcon
} from '@heroicons/vue/24/outline'
import QuestionPreview from '@/components/QuestionPreview.vue'

const router = useRouter()

// API state
const isLoading = ref(false)
const error = ref(null)

// Current step in the wizard
const currentStep = ref(1)

// Form state
const templateForm = reactive({
  name: '',
  description: '',
  category: '',
  estimatedTime: 30,
  status: 'draft',
  sections: []
})

// Section and question IDs
let sectionIdCounter = 1
let questionIdCounter = 1

// Expanded questions state
const expandedQuestions = ref({})

// Computed properties for step validation
const canProceedFromStep1 = computed(() => {
  return templateForm.name.trim() && templateForm.category
})

const canProceedFromStep2 = computed(() => {
  return templateForm.sections.length > 0 &&
         templateForm.sections.every(section => section.name.trim())
})

const canSaveTemplate = computed(() => {
  return canProceedFromStep1.value &&
         canProceedFromStep2.value &&
         templateForm.sections.some(section => section.questions.length > 0)
})

// Preview step computed properties
const totalQuestions = computed(() => {
  return templateForm.sections.reduce((total, section) => total + section.questions.length, 0)
})

const requiredQuestions = computed(() => {
  return templateForm.sections.reduce((total, section) =>
    total + section.questions.filter(q => q.required).length, 0)
})

const validationIssues = computed(() => {
  const issues = []

  // Check for empty sections
  const emptySections = templateForm.sections.filter(section => section.questions.length === 0)
  if (emptySections.length > 0) {
    issues.push(`${emptySections.length} section(s) have no questions`)
  }

  // Check for untitled sections
  const untitledSections = templateForm.sections.filter(section => !section.name.trim())
  if (untitledSections.length > 0) {
    issues.push(`${untitledSections.length} section(s) need names`)
  }

  // Check for untitled questions
  const untitledQuestions = templateForm.sections.reduce((total, section) =>
    total + section.questions.filter(q => !q.title.trim()).length, 0)
  if (untitledQuestions > 0) {
    issues.push(`${untitledQuestions} question(s) need titles`)
  }

  // Check for multiple choice/checkbox questions without options
  const questionsWithoutOptions = templateForm.sections.reduce((total, section) => {
    return total + section.questions.filter(q =>
      (q.type === 'multiple_choice' || q.type === 'checkbox') &&
      (!q.options || q.options.length < 2 || q.options.some(opt => !opt.trim()))
    ).length
  }, 0)
  if (questionsWithoutOptions > 0) {
    issues.push(`${questionsWithoutOptions} multiple choice/checkbox question(s) need at least 2 valid options`)
  }

  return issues
})

// Step navigation
const nextStep = () => {
  if (currentStep.value < 3) {
    currentStep.value++
  }
}

const prevStep = () => {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

// Section management
const addSection = () => {
  templateForm.sections.push({
    id: sectionIdCounter++,
    name: '',
    description: '',
    questions: []
  })
}

const deleteSection = (index: number) => {
  if (confirm('Are you sure you want to delete this section and all its questions?')) {
    templateForm.sections.splice(index, 1)
  }
}

const duplicateSection = (index: number) => {
  const sectionToDuplicate = JSON.parse(JSON.stringify(templateForm.sections[index]))
  sectionToDuplicate.id = sectionIdCounter++
  sectionToDuplicate.name = sectionToDuplicate.name + ' (Copy)'

  // Assign new IDs to all questions
  sectionToDuplicate.questions.forEach(question => {
    question.id = questionIdCounter++
  })

  templateForm.sections.splice(index + 1, 0, sectionToDuplicate)
}

const moveSection = (index: number, direction: number) => {
  const newIndex = index + direction
  if (newIndex >= 0 && newIndex < templateForm.sections.length) {
    const sections = templateForm.sections
    const temp = sections[index]
    sections[index] = sections[newIndex]
    sections[newIndex] = temp
  }
}

// Question management
const addQuestion = (sectionIndex: number) => {
  const newQuestion = {
    id: questionIdCounter++,
    title: '',
    description: '',
    type: 'text',
    required: true,
    options: [],
    ratingMin: 1,
    ratingMax: 5,
    ratingLowLabel: 'Poor',
    ratingHighLabel: 'Excellent'
  }

  templateForm.sections[sectionIndex].questions.push(newQuestion)

  // Auto-expand the new question
  const questionIndex = templateForm.sections[sectionIndex].questions.length - 1
  nextTick(() => {
    expandedQuestions.value[`${sectionIndex}-${questionIndex}`] = true
  })
}

const deleteQuestion = (sectionIndex: number, questionIndex: number) => {
  if (confirm('Are you sure you want to delete this question?')) {
    templateForm.sections[sectionIndex].questions.splice(questionIndex, 1)
    // Clean up expanded state
    delete expandedQuestions.value[`${sectionIndex}-${questionIndex}`]
  }
}

const duplicateQuestion = (sectionIndex: number, questionIndex: number) => {
  const questionToDuplicate = JSON.parse(JSON.stringify(templateForm.sections[sectionIndex].questions[questionIndex]))
  questionToDuplicate.id = questionIdCounter++
  questionToDuplicate.title = questionToDuplicate.title + ' (Copy)'

  templateForm.sections[sectionIndex].questions.splice(questionIndex + 1, 0, questionToDuplicate)
}

const moveQuestionUp = (sectionIndex: number, questionIndex: number) => {
  if (questionIndex > 0) {
    const questions = templateForm.sections[sectionIndex].questions
    const questionToMove = questions.splice(questionIndex, 1)[0]
    questions.splice(questionIndex - 1, 0, questionToMove)
  }
}

const moveQuestionDown = (sectionIndex: number, questionIndex: number) => {
  const questions = templateForm.sections[sectionIndex].questions
  if (questionIndex < questions.length - 1) {
    const questionToMove = questions.splice(questionIndex, 1)[0]
    questions.splice(questionIndex + 1, 0, questionToMove)
  }
}

const toggleQuestion = (sectionIndex: number, questionIndex: number) => {
  const key = `${sectionIndex}-${questionIndex}`
  expandedQuestions.value[key] = !expandedQuestions.value[key]
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
    time: 'Time',
    rating: 'Rating Scale'
  }
  return labels[type] || type
}

const saveTemplate = async (status: string) => {
  if (isLoading.value) return

  try {
    isLoading.value = true
    error.value = null

    // Convert frontend template format to backend API format
    const fieldsSchema = {
      sections: templateForm.sections.map(section => ({
        name: section.name,
        description: section.description || '',
        fields: section.questions.map(question => ({
          name: question.title.toLowerCase().replace(/[^a-z0-9]/g, '_'),
          label: question.title,
          type: question.type,
          required: question.required,
          ...(question.options && { options: question.options }),
          ...(question.placeholder && { placeholder: question.placeholder }),
          ...(question.description && { description: question.description }),
          ...(question.min && { min: question.min }),
          ...(question.max && { max: question.max }),
          ...(question.rows && { rows: question.rows })
        }))
      }))
    }

    const templateData = {
      name: templateForm.name,
      description: templateForm.description,
      category: templateForm.category,
      fields_schema: fieldsSchema
    }

    // Create template via API
    const response = await apiUtils.post('/templates', templateData)

    // Success notification
    alert(`Template "${templateForm.name}" ${status === 'draft' ? 'saved as draft' : 'created'} successfully!`)

    // Navigate back to templates list
    router.push('/templates')

  } catch (err) {
    console.error('Failed to save template:', err)
    error.value = err.response?.data?.error || 'Failed to save template. Please try again.'
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.template-create-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1.5rem;
}

@media (max-width: 768px) {
  .template-create-page {
    max-width: 100% !important;
    padding: 1rem !important;
    margin: 0 !important;
  }
}

.page-header {
  margin-bottom: 2rem;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 2rem;
}

.header-left {
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
  color: #3b82f6;
}

.page-title {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.page-subtitle {
  font-size: 1rem;
  margin: 0;
}

/* Progress Steps */
.progress-steps {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 3rem;
  padding: 1.5rem;
  background: hsl(var(--background));
  border-radius: 0.75rem;
  box-shadow: var(--shadow-sm);
  border: 1px solid hsl(var(--border));
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  opacity: 0.5;
  transition: all 0.3s;
}

.step.active {
  opacity: 1;
}

.step.completed {
  opacity: 1;
}

.step-number {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  background: hsl(var(--muted));
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  transition: all 0.3s;
}

.step.active .step-number {
  background: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
}

.step.completed .step-number {
  background: hsl(var(--success));
  color: hsl(var(--success-foreground));
}

.step-label {
  font-size: 0.875rem;
  font-weight: 500;
}

.step-divider {
  width: 4rem;
  height: 2px;
  background: hsl(var(--border));
  margin: 0 1rem;
  margin-bottom: 25px;
}

/* Form Sections */
.template-form-container {
  display: flex;
  flex-direction: column;
  gap: 2rem;
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
  align-items: flex-start;
  gap: 1rem;
}

.section-header-content {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.section-header-title-row {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.section-icon {
  color: hsl(var(--primary));
  flex-shrink: 0;
}

.section-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  text-align: left;
}

.section-description {
  font-size: 0.875rem;
  margin: 0;
  flex: 1;
  text-align: left;
}

.section-content {
  padding: 1.5rem;
}

/* Form Elements */
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
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

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

.radio-group {
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

.checkbox-group {
  display: flex;
  gap: 1rem;
}

/* Step Actions */
.step-actions {
  padding: 1.5rem;
  border-top: 1px solid hsl(var(--border));
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.save-actions {
  display: flex;
  gap: 0.75rem;
}

/* Empty States */
.empty-sections,
.empty-questions {
  text-align: center;
  padding: 2rem 0rem;
}

.empty-sections h4,
.empty-questions p {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 1rem 0 0.5rem;
}

.empty-sections p {
  margin-bottom: 1.5rem;
  font-size: 0.875rem;
  font-weight: 400;
}

/* Sections */
.sections-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.section-item {
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  padding: 1.5rem;
  background: #f9fafb;
  display: flex;
  gap: 1.5rem;
  align-items: flex-start;
}

.section-content-area {
  flex: 1;
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}

.section-number {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  background: #3b82f6;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  font-weight: 600;
  flex-shrink: 0;
}

.section-form {
  flex: 1;
}

.section-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex-shrink: 0;
}

/* Questions */
.sections-with-questions {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.section-with-questions {
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  overflow: hidden;
}

.section-questions-header {
  padding: 1rem 1.5rem;
  background: #f8fafc;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.section-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.section-name {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0;
}

.questions-count {
  font-size: 0.875rem;
  font-weight: 400;
}

.questions-list {
  display: flex;
  flex-direction: column;
}

.question-item {
  border-bottom: 1px solid #f3f4f6;
}

.question-item:last-child {
  border-bottom: none;
}

.question-header {
  padding: 1rem 1.5rem;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  transition: background 0.2s;
}

.question-header:hover {
  background: #f9fafb;
}

.question-info {
  display: flex;
  gap: 1rem;
  flex: 1;
  min-width: 0;
  align-items: flex-start;
}

.question-number {
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  background: #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
  flex-shrink: 0;
}

.question-expanded .question-number {
  background: #3b82f6;
  color: white;
}

.question-preview {
  flex: 1;
  min-width: 0;
}

.question-title {
  font-size: 0.875rem;
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
  flex-shrink: 0;
}

.question-form {
  padding: 1.5rem;
  border-top: 1px solid #f3f4f6;
  background: #fafafa;
}

.chevron {
  transition: transform 0.2s;
}

.chevron.rotated {
  transform: rotate(180deg);
}

/* Button Icons */
.btn-icon {
  padding: 0.5rem;
  border: none;
  background: none;
  cursor: pointer;
  border-radius: 0.25rem;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-icon:hover {
  background: #f3f4f6;
}

.btn-icon.btn-danger:hover {
  color: #ef4444;
  background: #fef2f2;
}

.btn-icon:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Options List */
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

/* Question Preview */
.question-preview-box {
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  background: white;
}

/* Responsive */
@media (max-width: 768px) {
  .template-create-page {
    padding: 1rem;
  }

  .header-content {
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }

  .progress-steps {
    padding: 1rem;
  }

  .step-divider {
    width: 2rem;
    margin: 0 0.5rem;
    margin-bottom: 25px;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .form-group.full-width {
    grid-column: span 1;
  }

  .section-header {
    grid-template-columns: 1fr;
    gap: 0.75rem;
    padding: 1rem;
  }

  .section-header button {
    justify-self: start;
    width: auto;
  }

  .section-header-content {
    gap: 0.75rem;
  }

  .section-title {
    font-size: 1.125rem;
    margin-bottom: 0;
  }

  .section-description {
    margin-bottom: 0;
    line-height: 1.4;
  }

  .section-content {
    padding: 1rem;
  }

  .section-item {
    flex-direction: column;
    gap: 1rem;
  }

  .section-content-area {
    flex-direction: column;
    gap: 1rem;
  }

  .section-actions {
    flex-direction: row;
    align-self: flex-start;
  }

  .step-actions {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .save-actions {
    width: 100%;
    justify-content: space-between;
  }

  .section-questions-header {
    flex-direction: column;
    gap: 0.75rem;
    align-items: flex-start;
  }

  .question-header {
    flex-direction: column;
    gap: 0.75rem;
    align-items: flex-start;
  }

  .question-info {
    width: 100%;
  }

  .question-actions {
    width: 100%;
    justify-content: flex-end;
  }
}

/* Sections & Questions Builder */
.sections-with-questions-builder {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

/* Question Builder Layout (similar to sections) */
.question-builder {
  border: 1px solid hsl(var(--border));
  border-radius: 0.5rem;
  overflow: hidden;
  background: hsl(var(--muted));
  margin-bottom: 1rem;
}

.question-builder-header {
  padding: 1rem;
  background: hsl(var(--background));
  border-bottom: 1px solid hsl(var(--border));
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  width: 100%;
}

.question-builder .question-number {
  background: hsl(var(--success));
  color: hsl(var(--success-foreground));
  margin-top: 0.5rem;
}

.question-info {
  flex: 1;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.question-info .form-group {
  width: 100%;
}

.question-title-input {
  font-size: 1rem;
  font-weight: 500;
  width: 100%;
}

.question-meta-row {
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
}

.question-type-select {
  width: 180px;
  flex-shrink: 0;
}

.question-requirement-group {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.requirement-label {
  font-size: 0.875rem;
  font-weight: 500;
  white-space: nowrap;
}

.question-type-radio {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.question-type-radio .radio-option {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.875rem;
  white-space: nowrap;
  cursor: pointer;
}

.radio-input {
  width: 1rem;
  height: 1rem;
  border: 2px solid hsl(var(--border));
  border-radius: 50%;
  background: hsl(var(--background));
  cursor: pointer;
  transition: all 0.2s;
}

.radio-input:checked {
  border-color: hsl(var(--primary));
  background: hsl(var(--primary));
  box-shadow: inset 0 0 0 2px hsl(var(--background));
}

.radio-input:focus {
  outline: none;
  border-color: hsl(var(--primary));
  box-shadow: 0 0 0 3px hsl(var(--primary) / 0.1);
}

.radio-label {
  font-weight: 500;
}

.question-header-actions {
  display: flex;
  gap: 0.25rem;
  flex-shrink: 0;
  flex-direction: column;
}

.question-options {
  padding: 1rem;
  border-top: 1px solid hsl(var(--border));
  background: hsl(var(--background));
}

.rating-options {
  padding: 1rem;
  border-top: 1px solid hsl(var(--border));
  background: hsl(var(--background));
}

.section-builder {
  border: 1px solid hsl(var(--border));
  border-radius: 0.75rem;
  overflow: hidden;
  width: 100%;
}

.section-builder-header {
  padding: 1.5rem;
  background: hsl(var(--muted));
  border-bottom: 1px solid hsl(var(--border));
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  width: 100%;
}

.section-builder .section-number {
  background: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
  margin-top: 0.5rem;
}

.section-info {
  flex: 1;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.section-info .form-group {
  width: 100%;
}

.section-name-input {
  font-size: 1.125rem;
  font-weight: 600;
  width: 100%;
}

.section-description-input {
  font-size: 0.875rem;
  background: hsl(var(--muted));
  width: 100%;
}

.section-header-actions {
  display: flex;
  gap: 0.25rem;
  flex-shrink: 0;
  flex-direction: column;
}

/* Question Actions Styling */
.question-actions {
  display: flex;
  gap: 0.25rem;
  flex-shrink: 0;
  align-items: center;
}

.section-questions {
  padding: 1.5rem;
}

.questions-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.questions-label {
  font-size: 1rem;
  font-weight: 600;
}

.empty-questions-inline {
  text-align: center;
  padding: 1.5rem;
  border: 1px dashed hsl(var(--border));
  border-radius: 0.375rem;
  background: hsl(var(--muted));
}

.questions-list-compact {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.question-compact {
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  padding: 1rem;
  background: #fafafa;
}

/* question-compact-header styles now handled by Tailwind classes */

.question-compact .question-number {
  background: #e5e7eb;
  margin-top: 0.25rem;
}

.question-form-compact {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.question-main-row {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.question-title-input {
  flex: 1;
  min-width: 200px;
}

.question-type-select {
  width: 150px;
  flex-shrink: 0;
}

.required-checkbox {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.875rem;
  white-space: nowrap;
  flex-shrink: 0;
}

.question-options {
  margin-top: 0.5rem;
}

.options-compact {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.option-compact {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.option-input {
  flex: 1;
  min-width: 0;
}

.rating-options {
  margin-top: 0.5rem;
}

.rating-settings {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
}

.rating-input {
  width: 60px;
  flex-shrink: 0;
}

.rating-label-input {
  width: 120px;
  flex-shrink: 0;
}

.question-actions {
  display: flex;
  gap: 0.25rem;
  flex-shrink: 0;
}

/* Add Question/Section buttons at bottom */
.add-question-bottom {
  padding-top: 1rem;
  margin-top: 1rem;
  border-top: 1px dashed hsl(var(--border));
  display: flex;
  justify-content: center;
}

/* Simple Add Section */
.add-section-simple {
  margin-top: 2rem;
}

.simple-placeholder {
  padding: 2rem;
  border: 1px dashed hsl(var(--border));
  border-radius: 0.5rem;
  background: hsl(var(--muted));
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.placeholder-section-number {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  background: hsl(var(--muted));
  color: hsl(var(--muted-foreground));
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  flex-shrink: 0;
  margin-top: 0.5rem;
}

.placeholder-content {
  flex: 1;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  position: relative;
}

.placeholder-hint {
  font-size: 0.875rem;
  margin: 3rem 0 0;
  font-style: italic;
}

.btnSection {
  position: relative;
  /* Remove absolute positioning and transforms to prevent hover movement */
  top: 0;
  margin: 0 auto;
  display: block;
  /* Ensure button stays centered without transform issues */
}

.btn-xs {
  padding: 0.25rem 0.375rem;
  font-size: 0.75rem;
}

.icon-xs {
  width: 0.875rem;
  height: 0.875rem;
}

/* Preview Styles */
.template-summary {
  background: hsl(var(--muted));
  border: 1px solid hsl(var(--border));
  border-radius: 0.5rem;
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.summary-header h4 {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 0.75rem;
}

.template-meta {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.template-category,
.template-time,
.template-status {
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.template-category {
  background: hsl(var(--primary) / 0.1);
  color: hsl(var(--primary));
}

.template-time {
  background: hsl(var(--secondary) / 0.1);
  color: hsl(var(--secondary));
}

.template-status {
  background: hsl(var(--success) / 0.1);
  color: hsl(var(--success));
}

.template-description {
  font-size: 0.875rem;
  margin: 0;
  margin-top: 0.75rem;
  line-height: 1.5;
}

.template-structure {
  margin-bottom: 2rem;
}

.structure-stats {
  display: flex;
  gap: 2rem;
  margin-bottom: 2rem;
  justify-content: center;
}

.stat {
  text-align: center;
}

.stat-number {
  display: block;
  font-size: 2rem;
  font-weight: 700;
  color: hsl(var(--primary));
}

.stat-label {
  font-size: 0.875rem;
  font-weight: 500;
}

.sections-preview {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.section-preview {
  border: 1px solid hsl(var(--border));
  border-radius: 0.5rem;
  padding: 1.5rem;
  background: hsl(var(--background));
}

.section-preview-header {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  align-items: flex-start;
}

.section-preview-number {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  background: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  flex-shrink: 0;
}

.section-preview-info h5 {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0 0 0.25rem;
}

.section-preview-info p {
  font-size: 0.875rem;
  margin: 0 0 0.25rem;
}

.questions-count {
  font-size: 0.75rem;
  font-weight: 500;
}

.questions-preview {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.question-preview-item {
  border: 1px solid hsl(var(--border));
  border-radius: 0.375rem;
  padding: 1rem;
  background: hsl(var(--muted));
}

.question-preview-header {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  margin-bottom: 0.5rem;
  flex-wrap: wrap;
}

.question-preview-number {
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  background: hsl(var(--muted));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
  flex-shrink: 0;
}

.question-preview-title {
  font-weight: 600;
  flex: 1;
  min-width: 0;
}

.question-preview-type {
  background: hsl(var(--muted));
  padding: 0.125rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;
  flex-shrink: 0;
}

.required-indicator {
  background: hsl(var(--destructive) / 0.1);
  color: hsl(var(--destructive));
  padding: 0.125rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;
  flex-shrink: 0;
}

.question-preview-options,
.question-preview-rating {
  font-size: 0.875rem;
  margin-top: 0.5rem;
}

.options-label,
.rating-scale {
  font-weight: 500;
}

.options-list {
  margin-left: 0.5rem;
}

.rating-labels {
  margin-left: 0.5rem;
  font-style: italic;
}

.no-questions-preview {
  text-align: center;
  font-style: italic;
  padding: 1rem;
}

.validation-issues {
  background: hsl(var(--destructive) / 0.1);
  border: 1px solid hsl(var(--destructive) / 0.3);
  border-radius: 0.5rem;
  padding: 1rem;
  margin-bottom: 2rem;
}

.validation-issues h5 {
  color: hsl(var(--destructive));
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 0.5rem;
}

.validation-issues ul {
  margin: 0;
  padding-left: 1.25rem;
  color: hsl(var(--destructive));
}

.validation-issues li {
  font-size: 0.875rem;
  margin-bottom: 0.25rem;
}

@media (max-width: 480px) {
  .progress-steps {
    flex-direction: column;
    gap: 1rem;
  }

  .step-divider {
    width: 2px;
    height: 1rem;
    margin: 0;
  }

  .save-actions {
    flex-direction: column;
  }

  .question-main-row {
    flex-direction: column !important;
    gap: 0.75rem !important;
    align-items: stretch !important;
  }

  .question-title-input {
    min-width: auto;
    width: 100%;
  }

  .question-type-select {
    width: 100%;
    flex-shrink: 1;
  }

  .required-checkbox {
    align-self: flex-start;
    white-space: normal;
  }

  .rating-settings {
    flex-direction: column;
    align-items: stretch;
  }

  .rating-input,
  .rating-label-input {
    width: 100%;
  }

  .structure-stats {
    gap: 1rem;
  }

  .template-meta {
    flex-direction: column;
    gap: 0.5rem;
    align-items: flex-start;
  }
}

/* Mobile-first responsive design */
.question-main-row {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  align-items: stretch;
}

.question-title-input,
.question-type-select {
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

/* Desktop Three Column Grid Layout (lg and up) */
.desktop-question-grid {
  display: grid;
  grid-template-columns: 60px 1fr 160px;
  gap: 1.5rem;
  align-items: flex-start;
  padding: 0.5rem 0;
}

.serial-number-column {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding-top: 0.625rem; /* Align with input field */
}

.serial-number-column .question-number {
  background: #3b82f6;
  color: white;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  font-weight: 600;
}

.question-details-column {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-width: 0; /* Prevent overflow */
}

.question-row {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.question-input {
  width: 100%;
  min-width: 0;
}

.required-checkbox-inline {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.checkbox-input {
  border-radius: 0.25rem;
  border: 1px solid #d1d5db;
}

.checkbox-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.checkbox-label {
  font-weight: 500;
}

.type-dropdown {
  width: 100%;
  min-width: 0;
}

.action-icons-column {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  align-items: center;
  padding-top: 0.25rem;
  background: #f8fafc;
  border-radius: 0.375rem;
  padding: 0.5rem 0.25rem;
}

.action-icons-column .btn-icon {
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.375rem;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.action-icons-column .btn-icon:hover {
  background: #f3f4f6;
  border-color: #e5e7eb;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.action-icons-column .btn-icon.btn-danger:hover {
  background: #fef2f2;
  color: #ef4444;
  border-color: #fecaca;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(239, 68, 68, 0.1);
}

.action-icons-column .btn-icon:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-icons-column .btn-icon:disabled:hover {
  transform: none;
  box-shadow: none;
}

/* Responsive adjustments for better spacing */
@media screen and (min-width: 1200px) {
  .desktop-question-grid {
    grid-template-columns: 80px 1fr 180px;
    gap: 2rem;
  }

  .question-row {
    display: grid;
    grid-template-columns: 2fr auto 1fr;
    gap: 1rem;
    align-items: center;
  }

  .required-checkbox-inline {
    justify-self: center;
    white-space: nowrap;
  }
}

/* Error Message */
.error-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
  background: hsl(var(--destructive) / 0.1);
  border: 1px solid hsl(var(--destructive) / 0.3);
  border-radius: 0.5rem;
  color: hsl(var(--destructive));
  font-size: 0.875rem;
}

.error-message .icon-sm {
  flex-shrink: 0;
}
</style>