<template>
  <div class="file-upload-component">
    <div class="upload-area" :class="{ 'is-dragging': isDragging, 'has-error': hasError }">
      <div
        class="dropzone"
        @click="triggerFileInput"
        @dragover.prevent="handleDragOver"
        @dragleave.prevent="handleDragLeave"
        @drop.prevent="handleDrop"
      >
        <input
          ref="fileInput"
          type="file"
          :accept="acceptedTypes"
          :multiple="multiple"
          @change="handleFileSelect"
          class="hidden-input"
        />

        <div v-if="!selectedFiles.length" class="upload-prompt">
          <CloudArrowUpIcon class="upload-icon" />
          <p class="upload-text">
            <span class="upload-primary">Click to upload</span>
            or drag and drop
          </p>
          <p class="upload-secondary">{{ acceptedTypesText }}</p>
          <p v-if="maxSizeText" class="upload-size">Max file size: {{ maxSizeText }}</p>
        </div>

        <div v-else class="file-list">
          <div
            v-for="(file, index) in selectedFiles"
            :key="index"
            class="file-item"
          >
            <div class="file-info">
              <DocumentIcon v-if="!isImage(file)" class="file-icon" />
              <PhotoIcon v-else class="file-icon" />
              <div class="file-details">
                <p class="file-name">{{ file.name }}</p>
                <p class="file-size">{{ formatFileSize(file.size) }}</p>
              </div>
            </div>
            <button
              @click.stop="removeFile(index)"
              class="remove-button"
              type="button"
            >
              <XMarkIcon class="icon-sm" />
            </button>
          </div>
        </div>
      </div>

      <div v-if="hasError" class="error-message">
        {{ errorMessage }}
      </div>
    </div>

    <div v-if="selectedFiles.length > 0" class="upload-actions">
      <div class="description-section">
        <label for="file-description" class="description-label">
          Description (optional)
        </label>
        <textarea
          id="file-description"
          v-model="description"
          placeholder="Add a description for the uploaded files..."
          rows="2"
          class="description-input"
        ></textarea>
      </div>

      <div class="action-buttons">
        <button
          @click="clearFiles"
          type="button"
          class="btn btn-secondary"
          :disabled="isUploading"
        >
          Clear
        </button>
        <button
          @click="uploadFiles"
          type="button"
          class="btn btn-primary"
          :disabled="isUploading"
        >
          <ArrowUpTrayIcon v-if="!isUploading" class="icon-sm" />
          <LoadingSpinner v-else class="icon-sm" />
          {{ isUploading ? 'Uploading...' : 'Upload Files' }}
        </button>
      </div>
    </div>

    <!-- Upload Progress -->
    <div v-if="uploadProgress.length > 0" class="upload-progress">
      <h4 class="progress-title">Upload Progress</h4>
      <div
        v-for="(progress, index) in uploadProgress"
        :key="index"
        class="progress-item"
      >
        <div class="progress-info">
          <span class="progress-filename">{{ progress.filename }}</span>
          <span class="progress-percentage">{{ progress.percentage }}%</span>
        </div>
        <div class="progress-bar">
          <div
            class="progress-fill"
            :style="{ width: progress.percentage + '%' }"
            :class="{ 'is-complete': progress.percentage === 100, 'has-error': progress.error }"
          ></div>
        </div>
        <div v-if="progress.error" class="progress-error">
          {{ progress.error }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { apiUtils } from '@/utils/api'
import {
  CloudArrowUpIcon,
  DocumentIcon,
  PhotoIcon,
  XMarkIcon,
  ArrowUpTrayIcon
} from '@heroicons/vue/24/outline'
import LoadingSpinner from '../ui/LoadingSpinner.vue'

interface Props {
  inspectionId: string | number
  acceptedTypes?: string
  maxFileSize?: number // in MB
  multiple?: boolean
}

interface Emits {
  (event: 'upload-success', files: any[]): void
  (event: 'upload-error', error: string): void
}

const props = withDefaults(defineProps<Props>(), {
  acceptedTypes: 'image/*,.pdf,.doc,.docx,.txt',
  maxFileSize: 10,
  multiple: true
})

const emit = defineEmits<Emits>()

// State
const fileInput = ref<HTMLInputElement | null>(null)
const selectedFiles = ref<File[]>([])
const description = ref('')
const isDragging = ref(false)
const isUploading = ref(false)
const hasError = ref(false)
const errorMessage = ref('')
const uploadProgress = ref<Array<{ filename: string; percentage: number; error?: string }>>([])

// Computed
const acceptedTypesText = computed(() => {
  const types = props.acceptedTypes.split(',').map(type => type.trim())
  const friendlyTypes = types.map(type => {
    if (type === 'image/*') return 'Images'
    if (type === '.pdf') return 'PDF'
    if (type === '.doc' || type === '.docx') return 'Word Documents'
    if (type === '.txt') return 'Text Files'
    return type.replace('.', '').toUpperCase()
  })

  return `Supported: ${friendlyTypes.join(', ')}`
})

const maxSizeText = computed(() => {
  if (!props.maxFileSize) return null
  return props.maxFileSize > 1 ? `${props.maxFileSize}MB` : `${props.maxFileSize * 1024}KB`
})

// Methods
const triggerFileInput = () => {
  fileInput.value?.click()
}

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files) {
    addFiles(Array.from(target.files))
  }
}

const handleDragOver = (event: DragEvent) => {
  event.preventDefault()
  isDragging.value = true
}

const handleDragLeave = (event: DragEvent) => {
  event.preventDefault()
  isDragging.value = false
}

const handleDrop = (event: DragEvent) => {
  event.preventDefault()
  isDragging.value = false

  if (event.dataTransfer?.files) {
    addFiles(Array.from(event.dataTransfer.files))
  }
}

const addFiles = (files: File[]) => {
  clearError()

  // Validate files
  const validFiles: File[] = []

  for (const file of files) {
    // Check file size
    if (props.maxFileSize && file.size > props.maxFileSize * 1024 * 1024) {
      setError(`File "${file.name}" is too large. Maximum size is ${maxSizeText.value}`)
      continue
    }

    // Check file type
    if (!isValidFileType(file)) {
      setError(`File "${file.name}" is not a supported type.`)
      continue
    }

    validFiles.push(file)
  }

  if (props.multiple) {
    selectedFiles.value = [...selectedFiles.value, ...validFiles]
  } else {
    selectedFiles.value = validFiles.slice(0, 1)
  }
}

const isValidFileType = (file: File): boolean => {
  const acceptedTypes = props.acceptedTypes.split(',').map(type => type.trim())

  return acceptedTypes.some(type => {
    if (type.startsWith('.')) {
      return file.name.toLowerCase().endsWith(type.toLowerCase())
    }
    if (type.includes('*')) {
      const baseType = type.split('/')[0]
      return file.type.startsWith(baseType)
    }
    return file.type === type
  })
}

const isImage = (file: File): boolean => {
  return file.type.startsWith('image/')
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const removeFile = (index: number) => {
  selectedFiles.value.splice(index, 1)
  clearError()
}

const clearFiles = () => {
  selectedFiles.value = []
  description.value = ''
  clearError()
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

const setError = (message: string) => {
  hasError.value = true
  errorMessage.value = message
}

const clearError = () => {
  hasError.value = false
  errorMessage.value = ''
}

const uploadFiles = async () => {
  if (selectedFiles.value.length === 0) return

  isUploading.value = true
  uploadProgress.value = selectedFiles.value.map(file => ({
    filename: file.name,
    percentage: 0
  }))

  const uploadedFiles: any[] = []

  try {
    for (let i = 0; i < selectedFiles.value.length; i++) {
      const file = selectedFiles.value[i]

      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('description', description.value)

        // Simulate progress for demonstration
        const progressCallback = (percentage: number) => {
          uploadProgress.value[i].percentage = percentage
        }

        progressCallback(25)
        await new Promise(resolve => setTimeout(resolve, 200))

        progressCallback(50)
        await new Promise(resolve => setTimeout(resolve, 200))

        progressCallback(75)

        const response = await apiUtils.postFormData(
          `/inspections/${props.inspectionId}/attachments`,
          formData
        )

        progressCallback(100)
        uploadedFiles.push(response)

      } catch (error: any) {
        uploadProgress.value[i].error = error.response?.data?.error || 'Upload failed'
        uploadProgress.value[i].percentage = 0
      }
    }

    if (uploadedFiles.length > 0) {
      emit('upload-success', uploadedFiles)
      clearFiles()
      uploadProgress.value = []
    }

  } catch (error: any) {
    emit('upload-error', error.response?.data?.error || 'Upload failed')
  } finally {
    isUploading.value = false
  }
}

defineExpose({
  clearFiles,
  uploadFiles
})
</script>

<style scoped>
.file-upload-component {
  width: 100%;
}

.upload-area {
  border: 2px dashed var(--color-gray-300);
  border-radius: var(--border-radius-lg);
  background: var(--color-gray-50);
  transition: var(--transition);
}

.upload-area.is-dragging {
  border-color: var(--color-primary);
  background: var(--color-primary-50);
}

.upload-area.has-error {
  border-color: var(--color-error);
  background: hsl(var(--destructive) / 0.1);
}

.dropzone {
  padding: 2rem;
  text-align: center;
  cursor: pointer;
  min-height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.hidden-input {
  display: none;
}

.upload-prompt {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.upload-icon {
  width: 3rem;
  height: 3rem;
  color: var(--color-gray-400);
}

.upload-text {
  font-size: 1rem;
  color: var(--color-gray-700);
  margin: 0;
}

.upload-primary {
  font-weight: 600;
  color: var(--color-primary);
}

.upload-secondary {
  font-size: 0.875rem;
  color: var(--color-gray-500);
  margin: 0;
}

.upload-size {
  font-size: 0.75rem;
  color: var(--color-gray-400);
  margin: 0;
}

.file-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 100%;
}

.file-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem;
  background: white;
  border-radius: var(--border-radius);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--color-gray-200);
}

.file-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
}

.file-icon {
  width: 2rem;
  height: 2rem;
  color: var(--color-gray-500);
  flex-shrink: 0;
}

.file-details {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-gray-900);
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-size {
  font-size: 0.75rem;
  color: var(--color-gray-500);
  margin: 0;
}

.remove-button {
  padding: 0.5rem;
  background: none;
  border: none;
  color: var(--color-gray-400);
  cursor: pointer;
  border-radius: var(--border-radius);
  transition: var(--transition);
}

.remove-button:hover {
  color: var(--color-error);
  background: hsl(var(--destructive) / 0.1);
}

.error-message {
  padding: 0.75rem;
  background: hsl(var(--destructive) / 0.1);
  color: var(--color-error);
  font-size: 0.875rem;
  border-radius: var(--border-radius);
  margin-top: 0.5rem;
}

.upload-actions {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.description-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.description-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-gray-700);
}

.description-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--color-gray-300);
  border-radius: var(--border-radius);
  font-size: 0.875rem;
  resize: vertical;
  min-height: 60px;
}

.description-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.action-buttons {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

.upload-progress {
  margin-top: 1.5rem;
  padding: 1rem;
  background: white;
  border-radius: var(--border-radius-lg);
  border: 1px solid var(--color-gray-200);
}

.progress-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-gray-900);
  margin: 0 0 1rem;
}

.progress-item {
  margin-bottom: 1rem;
}

.progress-item:last-child {
  margin-bottom: 0;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.progress-filename {
  font-size: 0.875rem;
  color: var(--color-gray-700);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.progress-percentage {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-gray-600);
}

.progress-bar {
  width: 100%;
  height: 0.5rem;
  background: var(--color-gray-200);
  border-radius: 9999px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--color-primary);
  transition: width 0.3s ease;
  border-radius: 9999px;
}

.progress-fill.is-complete {
  background: var(--color-success);
}

.progress-fill.has-error {
  background: var(--color-error);
}

.progress-error {
  font-size: 0.75rem;
  color: var(--color-error);
  margin-top: 0.25rem;
}

@media (max-width: 640px) {
  .dropzone {
    padding: 1.5rem 1rem;
  }

  .action-buttons {
    flex-direction: column;
  }

  .file-item {
    padding: 0.5rem;
  }

  .file-info {
    gap: 0.5rem;
  }
}
</style>