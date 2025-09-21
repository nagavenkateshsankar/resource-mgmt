<template>
  <div class="attachment-uploader">
    <!-- Upload Controls -->
    <div class="upload-controls">
      <!-- Camera Button (Mobile) -->
      <button
        v-if="isMobile"
        @click="capturePhoto"
        type="button"
        class="upload-btn camera-btn"
        :disabled="isUploading"
      >
        <CameraIcon class="icon-sm" />
        <span>Take Photo</span>
      </button>

      <!-- File Upload Button -->
      <button
        @click="selectFile"
        type="button"
        class="upload-btn file-btn"
        :disabled="isUploading"
      >
        <PhotoIcon class="icon-sm" />
        <span>{{ isMobile ? 'Choose Photo' : 'Upload Photo' }}</span>
      </button>

      <!-- Hidden File Input -->
      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        multiple
        @change="handleFileSelect"
        style="display: none"
      />

      <!-- Hidden Camera Input -->
      <input
        ref="cameraInput"
        type="file"
        accept="image/*"
        capture="environment"
        @change="handleCameraCapture"
        style="display: none"
      />
    </div>

    <!-- Attachments Preview -->
    <div v-if="attachments.length > 0" class="attachments-preview">
      <div
        v-for="(attachment, index) in attachments"
        :key="attachment.id"
        class="attachment-item"
        :class="{ 'uploading': attachment.status === 'uploading' }"
      >
        <!-- Image Preview -->
        <div class="attachment-preview">
          <img
            :src="attachment.preview"
            :alt="`Attachment ${index + 1}`"
            class="attachment-image"
            @click="viewAttachment(attachment)"
          />

          <!-- Upload Progress -->
          <div v-if="attachment.status === 'uploading'" class="upload-progress">
            <div class="progress-bar">
              <div
                class="progress-fill"
                :style="{ width: attachment.progress + '%' }"
              ></div>
            </div>
            <span class="progress-text">{{ attachment.progress }}%</span>
          </div>

          <!-- Status Icons -->
          <div class="attachment-status">
            <CheckCircleIcon
              v-if="attachment.status === 'uploaded'"
              class="icon-sm status-success"
            />
            <ExclamationCircleIcon
              v-if="attachment.status === 'error'"
              class="icon-sm status-error"
            />
          </div>
        </div>

        <!-- Attachment Info -->
        <div class="attachment-info">
          <span class="attachment-name">{{ attachment.name }}</span>
          <span class="attachment-size">{{ formatFileSize(attachment.size) }}</span>
        </div>

        <!-- Delete Button -->
        <button
          @click="removeAttachment(attachment.id)"
          type="button"
          class="delete-btn"
          :disabled="attachment.status === 'uploading'"
        >
          <XMarkIcon class="icon-sm" />
        </button>
      </div>
    </div>

    <!-- Error Message -->
    <div v-if="error" class="error-message">
      <ExclamationTriangleIcon class="icon-sm" />
      <span>{{ error }}</span>
    </div>

    <!-- Upload Limit Info -->
    <div v-if="maxFiles > 1" class="upload-info">
      {{ attachments.length }} / {{ maxFiles }} photos
    </div>
  </div>

  <!-- Full Screen Image Viewer -->
  <div v-if="viewingAttachment" class="image-viewer-overlay" @click="closeViewer">
    <div class="image-viewer" @click.stop>
      <div class="viewer-header">
        <h3>{{ viewingAttachment.name }}</h3>
        <button @click="closeViewer" class="close-btn">
          <XMarkIcon class="icon-md" />
        </button>
      </div>
      <div class="viewer-content">
        <img :src="viewingAttachment.preview" :alt="viewingAttachment.name" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  CameraIcon,
  PhotoIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/vue/24/outline'

// Props
interface Props {
  fieldId: string
  fieldName?: string
  maxFiles?: number
  maxFileSize?: number // in MB
  inspectionId?: string
  existingAttachments?: Attachment[]
}

const props = withDefaults(defineProps<Props>(), {
  maxFiles: 5,
  maxFileSize: 10,
  fieldName: '',
  existingAttachments: () => []
})

// Emits
const emit = defineEmits<{
  'attachments-changed': [attachments: Attachment[]]
  'upload-complete': [attachment: Attachment]
  'upload-error': [error: string]
}>()

// Types
interface Attachment {
  id: string
  name: string
  size: number
  type: string
  preview: string
  file?: File
  status: 'pending' | 'uploading' | 'uploaded' | 'error'
  progress: number
  serverUrl?: string
  fieldId: string
  fieldName: string
}

// State
const attachments = ref<Attachment[]>([])
const isUploading = ref(false)
const error = ref('')
const fileInput = ref<HTMLInputElement>()
const cameraInput = ref<HTMLInputElement>()
const viewingAttachment = ref<Attachment | null>(null)

// Computed
const isMobile = computed(() => {
  return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
})

// Methods
const generateId = () => {
  return 'att_' + Math.random().toString(36).substr(2, 9)
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const validateFile = (file: File): string | null => {
  // Check file type
  if (!file.type.startsWith('image/')) {
    return 'Only image files are allowed'
  }

  // Check file size (convert MB to bytes)
  const maxSizeBytes = props.maxFileSize * 1024 * 1024
  if (file.size > maxSizeBytes) {
    return `File size must be less than ${props.maxFileSize}MB`
  }

  // Check max files limit
  if (attachments.value.length >= props.maxFiles) {
    return `Maximum ${props.maxFiles} files allowed`
  }

  return null
}

const createFilePreview = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target?.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

const addAttachment = async (file: File) => {
  const validationError = validateFile(file)
  if (validationError) {
    error.value = validationError
    setTimeout(() => error.value = '', 3000)
    return
  }

  try {
    error.value = ''
    const preview = await createFilePreview(file)

    const attachment: Attachment = {
      id: generateId(),
      name: file.name,
      size: file.size,
      type: file.type,
      preview,
      file,
      status: 'pending',
      progress: 0,
      fieldId: props.fieldId,
      fieldName: props.fieldName
    }

    attachments.value.push(attachment)
    emit('attachments-changed', attachments.value)

    // Auto-upload if inspection exists
    if (props.inspectionId) {
      uploadAttachment(attachment)
    }
  } catch (err) {
    error.value = 'Failed to process file'
  }
}

const uploadAttachment = async (attachment: Attachment) => {
  if (!props.inspectionId || !attachment.file) return

  attachment.status = 'uploading'
  attachment.progress = 0
  isUploading.value = true

  try {
    const formData = new FormData()
    formData.append('file', attachment.file)
    formData.append('field_id', attachment.fieldId)
    formData.append('field_name', attachment.fieldName)

    // Simulate upload progress
    const progressInterval = setInterval(() => {
      if (attachment.progress < 90) {
        attachment.progress += 10
      }
    }, 100)

    const response = await fetch(`/api/v1/inspections/${props.inspectionId}/attachments`, {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      }
    })

    clearInterval(progressInterval)

    if (!response.ok) {
      throw new Error('Upload failed')
    }

    const result = await response.json()

    attachment.status = 'uploaded'
    attachment.progress = 100
    attachment.serverUrl = result.url
    attachment.file = undefined // Clear file object to save memory

    emit('upload-complete', attachment)
  } catch (err) {
    attachment.status = 'error'
    attachment.progress = 0
    emit('upload-error', 'Failed to upload attachment')
  } finally {
    isUploading.value = false
  }
}

const selectFile = () => {
  fileInput.value?.click()
}

const capturePhoto = () => {
  cameraInput.value?.click()
}

const handleFileSelect = (event: Event) => {
  const files = (event.target as HTMLInputElement).files
  if (files) {
    Array.from(files).forEach(addAttachment)
  }
  // Clear input to allow selecting the same file again
  if (fileInput.value) fileInput.value.value = ''
}

const handleCameraCapture = (event: Event) => {
  const files = (event.target as HTMLInputElement).files
  if (files && files[0]) {
    addAttachment(files[0])
  }
  // Clear input
  if (cameraInput.value) cameraInput.value.value = ''
}

const removeAttachment = (id: string) => {
  const index = attachments.value.findIndex(att => att.id === id)
  if (index !== -1) {
    attachments.value.splice(index, 1)
    emit('attachments-changed', attachments.value)
  }
}

const viewAttachment = (attachment: Attachment) => {
  viewingAttachment.value = attachment
}

const closeViewer = () => {
  viewingAttachment.value = null
}

// Initialize with existing attachments
onMounted(() => {
  if (props.existingAttachments.length > 0) {
    attachments.value = [...props.existingAttachments]
  }
})

// Expose public methods
defineExpose({
  attachments: readonly(attachments),
  uploadAll: () => {
    attachments.value
      .filter(att => att.status === 'pending')
      .forEach(uploadAttachment)
  }
})
</script>

<style scoped>
.attachment-uploader {
  width: 100%;
}

.upload-controls {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.upload-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: 1px solid hsl(var(--border));
  border-radius: 0.5rem;
  background: hsl(var(--background));
  color: hsl(var(--foreground));
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
}

.upload-btn:hover:not(:disabled) {
  border-color: hsl(var(--primary));
  background: hsl(var(--muted));
}

.upload-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.camera-btn {
  background: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
  border-color: hsl(var(--primary));
}

.camera-btn:hover:not(:disabled) {
  background: hsl(var(--primary) / 0.9);
}

.attachments-preview {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.attachment-item {
  border: 1px solid hsl(var(--border));
  border-radius: 0.5rem;
  overflow: hidden;
  background: hsl(var(--background));
  transition: all 0.2s;
}

.attachment-item:hover {
  box-shadow: var(--shadow);
}

.attachment-item.uploading {
  border-color: hsl(var(--primary));
}

.attachment-preview {
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
}

.attachment-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  cursor: pointer;
  transition: transform 0.2s;
}

.attachment-image:hover {
  transform: scale(1.05);
}

.upload-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 0.25rem;
}

.progress-bar {
  height: 4px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 0.25rem;
}

.progress-fill {
  height: 100%;
  background: hsl(var(--primary));
  transition: width 0.3s;
}

.progress-text {
  font-size: 0.75rem;
  text-align: center;
  display: block;
}

.attachment-status {
  position: absolute;
  top: 0.25rem;
  right: 0.25rem;
}

.status-success {
  color: hsl(var(--success));
}

.status-error {
  color: hsl(var(--destructive));
}

.attachment-info {
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.attachment-name {
  font-size: 0.75rem;
  font-weight: 500;
  color: hsl(var(--foreground));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.attachment-size {
  font-size: 0.625rem;
  color: hsl(var(--muted-foreground));
}

.delete-btn {
  position: absolute;
  top: 0.25rem;
  left: 0.25rem;
  width: 1.5rem;
  height: 1.5rem;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s;
}

.attachment-item:hover .delete-btn {
  opacity: 1;
}

.delete-btn:hover {
  background: hsl(var(--destructive));
}

.error-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: hsl(var(--destructive) / 0.1);
  border: 1px solid hsl(var(--destructive) / 0.2);
  border-radius: 0.5rem;
  color: hsl(var(--destructive));
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

.upload-info {
  font-size: 0.75rem;
  color: hsl(var(--muted-foreground));
  text-align: center;
}

/* Image Viewer */
.image-viewer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.image-viewer {
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  border-radius: 0.5rem;
  max-width: 90vw;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.viewer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  border-bottom: 1px solid hsl(var(--border));
}

.viewer-header h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: hsl(var(--foreground));
  margin: 0;
}

.close-btn {
  border: none;
  background: none;
  color: hsl(var(--muted-foreground));
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 0.25rem;
}

.close-btn:hover {
  background: hsl(var(--muted));
  color: hsl(var(--foreground));
}

.viewer-content {
  padding: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.viewer-content img {
  max-width: 100%;
  max-height: 70vh;
  object-fit: contain;
}

@media (max-width: 768px) {
  .upload-controls {
    flex-direction: column;
  }

  .attachments-preview {
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 0.75rem;
  }

  .image-viewer {
    max-width: 95vw;
    max-height: 95vh;
  }

  .viewer-content img {
    max-height: 60vh;
  }
}
</style>