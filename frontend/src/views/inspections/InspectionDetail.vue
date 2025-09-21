<template>
  <div class="inspection-detail-page">
    <!-- Loading State -->
    <div v-if="isLoading" class="loading-state">
      <div class="loading-spinner"></div>
      <p>Loading inspection details...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      <ExclamationTriangleIcon class="icon-xl" />
      <h3>Error Loading Inspection</h3>
      <p>{{ error }}</p>
      <button @click="fetchInspectionDetail" class="btn btn-primary">
        Try Again
      </button>
    </div>

    <!-- Content -->
    <div v-else>
    <!-- Header -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-left">
          <router-link to="/inspections" class="back-link">
            <ChevronLeftIcon class="icon-sm" />
            Back to Inspections
          </router-link>
          <div class="header-info">
            <h1 class="page-title">{{ inspection.title }}</h1>
            <div class="inspection-meta">
              <div class="meta-item">
                <MapPinIcon class="icon-sm" />
                <span>{{ inspection.location }}</span>
              </div>
              <div class="meta-item">
                <CalendarIcon class="icon-sm" />
                <span>{{ formatDate(inspection.date) }}</span>
              </div>
              <div class="meta-item">
                <UserIcon class="icon-sm" />
                <span>{{ inspection.inspector }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="header-actions">
          <span class="status-badge" :class="`status-${inspection.status}`">
            {{ inspection.status.charAt(0).toUpperCase() + inspection.status.slice(1) }}
          </span>
          <button v-if="inspection.status === 'draft'" class="btn btn-primary">
            <PlayIcon class="icon-sm" />
            Continue Inspection
          </button>
          <button v-if="inspection.status === 'completed'" class="btn btn-secondary">
            <DocumentArrowDownIcon class="icon-sm" />
            Export Report
          </button>
          <button class="btn btn-secondary">
            <PencilIcon class="icon-sm" />
            Edit
          </button>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="inspection-content">
      <!-- Summary Cards -->
      <div class="summary-section">
        <div class="summary-grid">
          <div class="summary-card">
            <div class="card-icon total">
              <ClipboardDocumentCheckIcon class="icon-md" />
            </div>
            <div class="card-content">
              <div class="card-number">{{ inspection.totalQuestions }}</div>
              <div class="card-label">Total Questions</div>
            </div>
          </div>
          <div class="summary-card">
            <div class="card-icon completed">
              <CheckCircleIcon class="icon-md" />
            </div>
            <div class="card-content">
              <div class="card-number">{{ inspection.completedQuestions }}</div>
              <div class="card-label">Completed</div>
            </div>
          </div>
          <div class="summary-card">
            <div class="card-icon issues">
              <ExclamationTriangleIcon class="icon-md" />
            </div>
            <div class="card-content">
              <div class="card-number">{{ inspection.issues }}</div>
              <div class="card-label">Issues Found</div>
            </div>
          </div>
          <div class="summary-card">
            <div class="card-icon progress">
              <ChartBarIcon class="icon-md" />
            </div>
            <div class="card-content">
              <div class="card-number">{{ completionPercentage }}%</div>
              <div class="card-label">Progress</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Content Grid -->
      <div class="content-grid">
        <!-- Left Column -->
        <div class="main-content">
          <!-- Progress Section -->
          <div class="content-section">
            <div class="section-header">
              <ChartBarIcon class="icon-md" />
              <h3>Inspection Progress</h3>
            </div>
            <div class="section-content">
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: completionPercentage + '%' }"></div>
              </div>
              <div class="progress-stats">
                <span>{{ inspection.completedQuestions }} of {{ inspection.totalQuestions }} questions completed</span>
              </div>
            </div>
          </div>

          <!-- Questions/Results Section -->
          <div class="content-section">
            <div class="section-header">
              <ClipboardDocumentListIcon class="icon-md" />
              <h3>Inspection Results</h3>
              <div class="section-actions">
                <!-- Future: Add section-based filtering here -->
              </div>
            </div>
            <div class="section-content">
              <div class="questions-list">
                <div
                  v-for="(question, index) in filteredQuestions"
                  :key="question.id"
                  class="question-item"
                >
                  <div class="question-header">
                    <div class="question-number">{{ index + 1 }}</div>
                    <div class="question-info">
                      <h4 class="question-title">{{ question.text }}</h4>
                      <div class="question-meta">
                        <span v-if="question.critical" class="critical-tag">Critical</span>
                      </div>
                    </div>
                    <div class="question-status">
                      <component
                        :is="getStatusIcon(question.status)"
                        class="icon-md"
                        :class="getStatusClass(question.status)"
                      />
                    </div>
                  </div>
                  <div v-if="question.response" class="question-response">
                    <div class="response-content">
                      <strong>Response:</strong> {{ question.response }}
                    </div>
                    <div v-if="question.notes" class="response-notes">
                      <strong>Notes:</strong> {{ question.notes }}
                    </div>
                    <div v-if="question.photos && question.photos.length > 0" class="response-photos">
                      <strong>Photos:</strong>
                      <div class="photo-grid">
                        <div
                          v-for="photo in question.photos"
                          :key="photo.id"
                          class="photo-item"
                        >
                          <img :src="photo.url" :alt="photo.caption" class="photo-image" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Column -->
        <div class="sidebar-content">
          <!-- Inspection Info -->
          <div class="info-card">
            <div class="info-header">
              <InformationCircleIcon class="icon-md" />
              <h3>Inspection Information</h3>
            </div>
            <div class="info-content">
              <div class="info-item">
                <span class="info-label">Template:</span>
                <span class="info-value">{{ inspection.template }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Started:</span>
                <span class="info-value">{{ formatDateTime(inspection.startedAt) }}</span>
              </div>
              <div v-if="inspection.completedAt" class="info-item">
                <span class="info-label">Completed:</span>
                <span class="info-value">{{ formatDateTime(inspection.completedAt) }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Duration:</span>
                <span class="info-value">{{ inspection.duration || 'In Progress' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">ID:</span>
                <span class="info-value">#{{ inspection.id }}</span>
              </div>
            </div>
          </div>

          <!-- Issues Summary -->
          <div v-if="inspection.issues > 0" class="info-card issues-card">
            <div class="info-header">
              <ExclamationTriangleIcon class="icon-md text-red-500" />
              <h3>Issues Identified</h3>
            </div>
            <div class="info-content">
              <div class="issue-stats">
                <div class="issue-stat critical">
                  <span class="issue-count">{{ criticalIssues }}</span>
                  <span class="issue-label">Critical</span>
                </div>
                <div class="issue-stat warning">
                  <span class="issue-count">{{ warningIssues }}</span>
                  <span class="issue-label">Warning</span>
                </div>
                <div class="issue-stat minor">
                  <span class="issue-count">{{ minorIssues }}</span>
                  <span class="issue-label">Minor</span>
                </div>
              </div>
            </div>
          </div>

          <!-- File Attachments -->
          <div class="info-card">
            <div class="info-header">
              <PaperClipIcon class="icon-md" />
              <h3>Attachments</h3>
            </div>
            <div class="info-content">
              <FileUpload
                :inspection-id="inspectionId"
                @upload-success="handleUploadSuccess"
                @upload-error="handleUploadError"
              />

              <!-- Existing Attachments -->
              <div v-if="attachments.length > 0" class="attachments-list">
                <h4 class="attachments-title">Uploaded Files</h4>
                <div
                  v-for="attachment in attachments"
                  :key="attachment.id"
                  class="attachment-item"
                >
                  <div class="attachment-info">
                    <DocumentIcon v-if="!attachment.file_type.startsWith('image/')" class="attachment-icon" />
                    <PhotoIcon v-else class="attachment-icon" />
                    <div class="attachment-details">
                      <p class="attachment-name">{{ attachment.file_name }}</p>
                      <p class="attachment-meta">
                        {{ formatFileSize(attachment.file_size) }}
                        <span v-if="attachment.description"> • {{ attachment.description }}</span>
                      </p>
                    </div>
                  </div>
                  <div class="attachment-actions">
                    <button
                      @click="downloadAttachment(attachment)"
                      class="attachment-btn"
                      title="Download"
                    >
                      <ArrowDownTrayIcon class="icon-sm" />
                    </button>
                    <button
                      @click="deleteAttachment(attachment)"
                      class="attachment-btn text-red-600"
                      title="Delete"
                    >
                      <TrashIcon class="icon-sm" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="actions-card">
            <div class="info-header">
              <CogIcon class="icon-md" />
              <h3>Actions</h3>
            </div>
            <div class="info-content">
              <div class="action-buttons">
                <button class="action-btn">
                  <ShareIcon class="icon-sm" />
                  Share Inspection
                </button>
                <button class="action-btn">
                  <PrinterIcon class="icon-sm" />
                  Print Report
                </button>
                <button class="action-btn">
                  <DocumentDuplicateIcon class="icon-sm" />
                  Duplicate
                </button>
                <button class="action-btn text-red-600">
                  <TrashIcon class="icon-sm" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { apiUtils } from '@/utils/api'
import { useAppStore } from '@/stores/app'
import FileUpload from '@/components/forms/FileUpload.vue'
import {
  ChevronLeftIcon,
  MapPinIcon,
  CalendarIcon,
  UserIcon,
  PlayIcon,
  DocumentArrowDownIcon,
  PencilIcon,
  ClipboardDocumentCheckIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
  InformationCircleIcon,
  CogIcon,
  ShareIcon,
  PrinterIcon,
  DocumentDuplicateIcon,
  TrashIcon,
  XCircleIcon,
  QuestionMarkCircleIcon,
  PaperClipIcon,
  DocumentIcon,
  PhotoIcon,
  ArrowDownTrayIcon
} from '@heroicons/vue/24/outline'

const route = useRoute()
const inspectionId = route.params.id as string
const appStore = useAppStore()

// State
const inspection = ref({
  id: '',
  title: '',
  location: '',
  date: '',
  inspector: '',
  status: '',
  template: '',
  startedAt: '',
  completedAt: '',
  duration: '',
  totalQuestions: 0,
  completedQuestions: 0,
  issues: 0
})
const isLoading = ref(false)
const error = ref(null)
const attachments = ref([])

const questions = ref([])

// API Functions
const fetchInspectionDetail = async () => {
  try {
    isLoading.value = true
    error.value = null

    const response = await apiUtils.get(`/inspections/${inspectionId}`)

    // Transform API response to match frontend structure
    inspection.value = {
      id: response.inspection.id,
      title: `${response.inspection.template?.name || 'Untitled'} - ${response.inspection.site_name || response.inspection.site_location}`,
      location: response.inspection.site_location,
      date: response.inspection.created_at,
      inspector: response.inspection.inspector?.name || 'Unknown',
      status: response.inspection.status,
      template: response.inspection.template?.name || 'Unknown Template',
      startedAt: response.inspection.created_at,
      completedAt: response.inspection.updated_at,
      duration: calculateDuration(response.inspection.created_at, response.inspection.updated_at),
      totalQuestions: 0, // Will be calculated from inspection data
      completedQuestions: 0, // Will be calculated from inspection data
      issues: 0 // Will be calculated from inspection data
    }

    // Transform inspection_data to questions format
    if (response.inspection.inspection_data && Array.isArray(response.inspection.inspection_data)) {
      questions.value = response.inspection.inspection_data.map((data, index) => ({
        id: data.id || index + 1,
        text: data.field_name || 'Unknown Question',
        critical: data.field_name?.toLowerCase().includes('critical') || data.field_name?.toLowerCase().includes('safety') || false,
        status: determineQuestionStatus(data.value),
        response: data.value || 'No response',
        notes: data.notes || '',
        photos: data.attachments || []
      }))

      // Update totals based on actual data
      inspection.value.totalQuestions = questions.value.length
      inspection.value.completedQuestions = questions.value.filter(q => q.response !== 'No response').length
      inspection.value.issues = questions.value.filter(q => q.status === 'fail' || q.status === 'warning').length
    }
  } catch (err) {
    console.error('Failed to fetch inspection detail:', err)
    error.value = 'Failed to load inspection details. Please try again later.'
  } finally {
    isLoading.value = false
  }
}

// Helper functions
const calculateDuration = (startDate: string, endDate: string) => {
  if (!startDate || !endDate) return 'In Progress'

  const start = new Date(startDate)
  const end = new Date(endDate)
  const diffMs = end.getTime() - start.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

  if (diffHours > 0) {
    return `${diffHours}h ${diffMinutes}m`
  }
  return `${diffMinutes}m`
}

const determineQuestionStatus = (value: any) => {
  if (!value || value === 'No response') return 'pending'

  const strValue = String(value).toLowerCase()
  if (strValue.includes('fail') || strValue.includes('no') || strValue.includes('issue') || strValue.includes('problem')) {
    return 'fail'
  }
  if (strValue.includes('warning') || strValue.includes('concern') || strValue.includes('attention')) {
    return 'warning'
  }
  if (strValue.includes('pass') || strValue.includes('yes') || strValue.includes('good') || strValue.includes('ok')) {
    return 'pass'
  }
  return 'pending'
}

// Computed
const filteredQuestions = computed(() => {
  return questions.value
})

const completionPercentage = computed(() => {
  return Math.round((inspection.value.completedQuestions / inspection.value.totalQuestions) * 100)
})

const criticalIssues = computed(() => {
  return questions.value.filter(q => q.critical && (q.status === 'fail' || q.status === 'warning')).length
})

const warningIssues = computed(() => {
  return questions.value.filter(q => !q.critical && q.status === 'warning').length
})

const minorIssues = computed(() => {
  return questions.value.filter(q => !q.critical && q.status === 'fail').length
})

// Methods
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const formatDateTime = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getStatusIcon = (status: string) => {
  const icons = {
    pass: CheckCircleIcon,
    fail: XCircleIcon,
    warning: ExclamationTriangleIcon,
    pending: QuestionMarkCircleIcon
  }
  return icons[status as keyof typeof icons] || QuestionMarkCircleIcon
}

const getStatusClass = (status: string) => {
  const classes = {
    pass: 'text-green-500',
    fail: 'text-red-500',
    warning: 'text-yellow-500',
    pending: 'text-gray-400'
  }
  return classes[status as keyof typeof classes] || 'text-gray-400'
}

// Attachment Methods
const fetchAttachments = async () => {
  try {
    const response = await apiUtils.get(`/inspections/${inspectionId}/attachments`)
    attachments.value = response.attachments || []
  } catch (err) {
    console.error('Failed to fetch attachments:', err)
  }
}

const handleUploadSuccess = (uploadedFiles: any[]) => {
  appStore.showSuccessMessage('Files uploaded successfully!')
  fetchAttachments() // Refresh the list
}

const handleUploadError = (error: string) => {
  appStore.showErrorMessage(error)
}

const downloadAttachment = async (attachment: any) => {
  try {
    await apiUtils.download(`/attachments/${attachment.id}/download`, attachment.file_name)
  } catch (err: any) {
    appStore.showErrorMessage('Failed to download file')
    console.error('Download error:', err)
  }
}

const deleteAttachment = async (attachment: any) => {
  if (!confirm(`Are you sure you want to delete "${attachment.file_name}"?`)) {
    return
  }

  try {
    await apiUtils.delete(`/attachments/${attachment.id}`)
    appStore.showSuccessMessage('File deleted successfully!')
    fetchAttachments() // Refresh the list
  } catch (err: any) {
    appStore.showErrorMessage('Failed to delete file')
    console.error('Delete error:', err)
  }
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Lifecycle
onMounted(() => {
  fetchInspectionDetail()
  fetchAttachments()
})
</script>

<style scoped>
.inspection-detail-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1.5rem;
  background: hsl(var(--muted));
  min-height: 100vh;
}

/* Header Styles */
.page-header {
  margin-bottom: 2rem;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 2rem;
}

.header-left {
  flex: 1;
}

.back-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--color-primary);
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 1rem;
  text-decoration: none;
  transition: var(--transition);
}

.back-link:hover {
  color: var(--color-primary-dark);
}

.header-info {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.page-title {
  font-size: 2rem;
  font-weight: 700;
  color: hsl(var(--foreground));
  margin: 0;
}

.inspection-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: hsl(var(--muted-foreground));
  font-size: 0.875rem;
}

.header-actions {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.status-badge {
  padding: 0.5rem 1rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.status-completed {
  background: hsl(var(--success) / 0.1);
  color: hsl(var(--success));
}

.status-draft {
  background: hsl(var(--warning) / 0.1);
  color: hsl(var(--warning));
}

.status-in-progress {
  background: hsl(var(--primary) / 0.1);
  color: hsl(var(--primary));
}

/* Content Styles */
.inspection-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

/* Summary Section */
.summary-section {
  background: hsl(var(--background));
  border-radius: var(--border-radius-lg);
  padding: 2rem;
  box-shadow: var(--shadow-sm);
  border: 1px solid hsl(var(--border));
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
}

.summary-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  background: hsl(var(--muted));
  border-radius: var(--border-radius);
  border: 1px solid hsl(var(--border));
}

.card-icon {
  padding: 0.75rem;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-icon.total {
  background: hsl(var(--primary) / 0.1);
  color: hsl(var(--primary));
}

.card-icon.completed {
  background: hsl(var(--success) / 0.1);
  color: hsl(var(--success));
}

.card-icon.issues {
  background: hsl(var(--warning) / 0.1);
  color: hsl(var(--warning));
}

.card-icon.progress {
  background: hsl(var(--primary) / 0.1);
  color: hsl(var(--primary));
}

.card-content {
  flex: 1;
}

.card-number {
  font-size: 1.75rem;
  font-weight: 700;
  color: hsl(var(--foreground));
  line-height: 1;
}

.card-label {
  font-size: 0.875rem;
  color: hsl(var(--muted-foreground));
  font-weight: 500;
  margin-top: 0.25rem;
}

/* Content Grid */
.content-grid {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 2rem;
}

/* Main Content */
.main-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.content-section {
  background: hsl(var(--background));
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-sm);
  border: 1px solid hsl(var(--border));
  overflow: hidden;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  border-bottom: 1px solid hsl(var(--border));
  background: hsl(var(--muted));
}

.section-header h3 {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1.125rem;
  font-weight: 600;
  color: hsl(var(--foreground));
  margin: 0;
}

.section-actions {
  display: flex;
  gap: 1rem;
}

.filter-select {
  padding: 0.5rem 0.75rem;
  border: 1px solid hsl(var(--border));
  border-radius: var(--border-radius);
  font-size: 0.875rem;
  background: hsl(var(--background));
  min-width: 150px;
}

.section-content {
  padding: 1.5rem;
}

/* Progress Bar */
.progress-bar {
  width: 100%;
  height: 0.75rem;
  background: hsl(var(--muted));
  border-radius: 9999px;
  overflow: hidden;
  margin-bottom: 1rem;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary), #34d399);
  transition: width 0.3s ease;
}

.progress-stats {
  color: hsl(var(--muted-foreground));
  font-size: 0.875rem;
  text-align: center;
}

/* Questions List */
.questions-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.question-item {
  border: 1px solid hsl(var(--border));
  border-radius: var(--border-radius);
  overflow: hidden;
}

.question-header {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1.25rem;
  background: hsl(var(--muted));
}

.question-number {
  background: var(--color-primary);
  color: white;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  font-weight: 600;
  flex-shrink: 0;
}

.question-info {
  flex: 1;
}

.question-title {
  font-size: 1rem;
  font-weight: 600;
  color: hsl(var(--foreground));
  margin: 0 0 0.5rem 0;
  line-height: 1.4;
}

.question-meta {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}


.critical-tag {
  background: hsl(var(--destructive) / 0.1);
  color: hsl(var(--destructive));
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.question-status {
  display: flex;
  align-items: center;
}

.question-response {
  padding: 1.25rem;
  border-top: 1px solid hsl(var(--border));
  background: hsl(var(--background));
}

.response-content,
.response-notes {
  margin-bottom: 1rem;
  line-height: 1.5;
}

.response-content:last-child,
.response-notes:last-child {
  margin-bottom: 0;
}

.response-photos {
  margin-top: 1rem;
}

.photo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.photo-item {
  border-radius: var(--border-radius);
  overflow: hidden;
  border: 1px solid hsl(var(--border));
}

.photo-image {
  width: 100%;
  height: 80px;
  object-fit: cover;
}

/* Sidebar */
.sidebar-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.info-card,
.actions-card {
  background: hsl(var(--background));
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-sm);
  border: 1px solid hsl(var(--border));
  overflow: hidden;
}

.info-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1.25rem;
  border-bottom: 1px solid hsl(var(--border));
  background: hsl(var(--muted));
}

.info-header h3 {
  font-size: 1rem;
  font-weight: 600;
  color: hsl(var(--foreground));
  margin: 0;
}

.info-content {
  padding: 1.25rem;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid hsl(var(--border));
}

.info-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.info-label {
  color: hsl(var(--muted-foreground));
  font-size: 0.875rem;
  font-weight: 500;
}

.info-value {
  color: hsl(var(--foreground));
  font-size: 0.875rem;
  font-weight: 600;
  text-align: right;
}

/* Issues Card */
.issues-card .info-header {
  background: hsl(var(--destructive) / 0.1);
  border-bottom-color: hsl(var(--destructive) / 0.2);
}

.issue-stats {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

.issue-stat {
  text-align: center;
  flex: 1;
}

.issue-count {
  display: block;
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
}

.issue-stat.critical .issue-count {
  color: hsl(var(--destructive));
}

.issue-stat.warning .issue-count {
  color: hsl(var(--warning));
}

.issue-stat.minor .issue-count {
  color: hsl(var(--muted-foreground));
}

.issue-label {
  font-size: 0.75rem;
  color: hsl(var(--muted-foreground));
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Action Buttons */
.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: hsl(var(--muted));
  border: 1px solid hsl(var(--border));
  border-radius: var(--border-radius);
  font-size: 0.875rem;
  font-weight: 500;
  color: hsl(var(--muted-foreground));
  cursor: pointer;
  transition: var(--transition);
  text-align: left;
}

.action-btn:hover {
  background: hsl(var(--muted));
  border-color: hsl(var(--border));
  opacity: 0.8;
}

.action-btn.text-red-600 {
  color: hsl(var(--destructive));
}

.action-btn.text-red-600:hover {
  background: hsl(var(--destructive) / 0.1);
  border-color: hsl(var(--destructive) / 0.2);
}

/* Color utilities */
.text-green-500 { color: hsl(var(--success)); }
.text-red-500 { color: hsl(var(--destructive)); }
.text-yellow-500 { color: hsl(var(--warning)); }
.text-gray-400 { color: hsl(var(--muted-foreground)); }

/* Responsive Design */
@media (max-width: 1024px) {
  .content-grid {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }

  .sidebar-content {
    order: -1;
  }
}

@media (max-width: 768px) {
  .inspection-detail-page {
    padding: 1rem;
  }

  .header-content {
    flex-direction: column;
    align-items: stretch;
    gap: 1.5rem;
  }

  .inspection-meta {
    flex-direction: column;
    gap: 0.75rem;
  }

  .header-actions {
    justify-content: stretch;
    flex-wrap: wrap;
  }

  .summary-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }

  .summary-card {
    padding: 1rem;
  }

  .card-number {
    font-size: 1.5rem;
  }

  .question-header {
    padding: 1rem;
  }

  .question-response {
    padding: 1rem;
  }
}

@media (max-width: 640px) {
  .summary-grid {
    grid-template-columns: 1fr;
  }

  .page-title {
    font-size: 1.5rem;
  }

  .section-header {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }

  .filter-select {
    min-width: auto;
  }

  .issue-stats {
    flex-direction: column;
    gap: 0.75rem;
  }
}

/* Loading and Error States */
.loading-state,
.error-state {
  text-align: center;
  padding: 4rem 2rem;
  color: hsl(var(--muted-foreground));
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.loading-spinner {
  width: 2rem;
  height: 2rem;
  border: 3px solid hsl(var(--muted));
  border-top: 3px solid hsl(var(--primary));
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-state h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: hsl(var(--foreground));
  margin: 1rem 0 0.5rem;
}

.error-state p {
  margin-bottom: 2rem;
  font-size: 0.875rem;
  max-width: 24rem;
  margin-left: auto;
  margin-right: auto;
}

/* Attachments Styles */
.attachments-list {
  margin-top: 1.5rem;
}

.attachments-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: hsl(var(--foreground));
  margin: 0 0 1rem 0;
}

.attachment-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem;
  border: 1px solid hsl(var(--border));
  border-radius: var(--border-radius);
  margin-bottom: 0.75rem;
  background: hsl(var(--background));
  transition: var(--transition);
}

.attachment-item:hover {
  border-color: hsl(var(--primary));
  box-shadow: var(--shadow-sm);
}

.attachment-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
  min-width: 0;
}

.attachment-icon {
  width: 1.5rem;
  height: 1.5rem;
  color: hsl(var(--muted-foreground));
  flex-shrink: 0;
}

.attachment-details {
  flex: 1;
  min-width: 0;
}

.attachment-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: hsl(var(--foreground));
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.attachment-meta {
  font-size: 0.75rem;
  color: hsl(var(--muted-foreground));
  margin: 0;
}

.attachment-actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}

.attachment-btn {
  padding: 0.5rem;
  background: none;
  border: none;
  color: hsl(var(--muted-foreground));
  cursor: pointer;
  border-radius: var(--border-radius);
  transition: var(--transition);
}

.attachment-btn:hover {
  color: hsl(var(--primary));
  background: hsl(var(--muted));
}

.attachment-btn.text-red-600:hover {
  color: hsl(var(--destructive));
  background: hsl(var(--destructive) / 0.1);
}
</style>