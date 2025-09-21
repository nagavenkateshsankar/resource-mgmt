<template>
  <div class="site-form-page">
    <div class="page-header">
      <div class="header-left">
        <router-link to="/sites" class="back-btn">
          <ArrowLeftIcon class="icon-sm" />
          Back to Sites
        </router-link>
        <h1 class="page-title">{{ isEdit ? 'Edit Site' : 'Create New Site' }}</h1>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="loading-state">
      <div class="loading-spinner"></div>
      <p>{{ isEdit ? 'Loading site details...' : 'Preparing form...' }}</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      <BuildingOfficeIcon class="icon-xl" />
      <h3>Error</h3>
      <p>{{ error }}</p>
      <button @click="isEdit ? fetchSite() : initializeForm()" class="btn btn-primary">
        Try Again
      </button>
    </div>

    <!-- Site Form -->
    <form v-else @submit.prevent="handleSubmit" class="site-form">
      <div class="form-grid">
        <!-- Basic Information -->
        <div class="form-section">
          <h2 class="section-title">Basic Information</h2>
          <div class="form-group">
            <label for="name" class="form-label required">Site Name</label>
            <input
              id="name"
              v-model="form.name"
              type="text"
              class="form-input"
              placeholder="Enter site name"
              required
            />
          </div>

          <div class="form-group">
            <label for="type" class="form-label">Site Type</label>
            <select id="type" v-model="form.type" class="form-input">
              <option value="office">Office</option>
              <option value="warehouse">Warehouse</option>
              <option value="construction">Construction</option>
              <option value="facility">Facility</option>
              <option value="retail">Retail</option>
            </select>
          </div>

          <div class="form-group">
            <label for="status" class="form-label">Status</label>
            <select id="status" v-model="form.status" class="form-input">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>
        </div>

        <!-- Address Information -->
        <div class="form-section">
          <h2 class="section-title">Address Information</h2>
          <div class="form-group">
            <label for="address" class="form-label required">Street Address</label>
            <input
              id="address"
              v-model="form.address"
              type="text"
              class="form-input"
              placeholder="Enter street address"
              required
            />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="city" class="form-label">City</label>
              <input
                id="city"
                v-model="form.city"
                type="text"
                class="form-input"
                placeholder="Enter city"
              />
            </div>
            <div class="form-group">
              <label for="state" class="form-label">State</label>
              <input
                id="state"
                v-model="form.state"
                type="text"
                class="form-input"
                placeholder="Enter state"
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="zip_code" class="form-label">ZIP Code</label>
              <input
                id="zip_code"
                v-model="form.zip_code"
                type="text"
                class="form-input"
                placeholder="Enter ZIP code"
              />
            </div>
            <div class="form-group">
              <label for="country" class="form-label">Country</label>
              <input
                id="country"
                v-model="form.country"
                type="text"
                class="form-input"
                placeholder="Enter country"
              />
            </div>
          </div>
        </div>

        <!-- Contact Information -->
        <div class="form-section">
          <h2 class="section-title">Contact Information</h2>
          <div class="form-group">
            <label for="contact_name" class="form-label">Contact Person</label>
            <input
              id="contact_name"
              v-model="form.contact_name"
              type="text"
              class="form-input"
              placeholder="Enter contact person name"
            />
          </div>

          <div class="form-group">
            <label for="contact_email" class="form-label">Email</label>
            <input
              id="contact_email"
              v-model="form.contact_email"
              type="email"
              class="form-input"
              placeholder="Enter email address"
            />
          </div>

          <div class="form-group">
            <label for="contact_phone" class="form-label">Phone</label>
            <input
              id="contact_phone"
              v-model="form.contact_phone"
              type="tel"
              class="form-input"
              placeholder="Enter phone number"
            />
          </div>
        </div>

        <!-- GPS Coordinates (Optional) -->
        <div class="form-section">
          <h2 class="section-title">GPS Coordinates (Optional)</h2>
          <div class="form-row">
            <div class="form-group">
              <label for="latitude" class="form-label">Latitude</label>
              <input
                id="latitude"
                v-model.number="form.latitude"
                type="number"
                step="any"
                class="form-input"
                placeholder="Enter latitude"
              />
            </div>
            <div class="form-group">
              <label for="longitude" class="form-label">Longitude</label>
              <input
                id="longitude"
                v-model.number="form.longitude"
                type="number"
                step="any"
                class="form-input"
                placeholder="Enter longitude"
              />
            </div>
          </div>
        </div>

        <!-- Notes -->
        <div class="form-section full-width">
          <h2 class="section-title">Additional Notes</h2>
          <div class="form-group">
            <label for="notes" class="form-label">Notes</label>
            <textarea
              id="notes"
              v-model="form.notes"
              class="form-textarea"
              rows="4"
              placeholder="Enter any additional notes about this site"
            ></textarea>
          </div>
        </div>
      </div>

      <!-- Form Actions -->
      <div class="form-actions">
        <router-link to="/sites" class="btn btn-secondary">Cancel</router-link>
        <button type="submit" class="btn btn-primary" :disabled="isSubmitting">
          <span v-if="isSubmitting" class="btn-spinner"></span>
          {{ isSubmitting ? 'Saving...' : (isEdit ? 'Update Site' : 'Create Site') }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { apiUtils } from '@/utils/api'
import {
  ArrowLeftIcon,
  BuildingOfficeIcon
} from '@heroicons/vue/24/outline'
import { computed } from 'vue'

const route = useRoute()
const router = useRouter()

const isEdit = computed(() => !!route.params.id)

// State
const isLoading = ref(false)
const isSubmitting = ref(false)
const error = ref(null)

// Form data
const form = ref({
  name: '',
  address: '',
  city: '',
  state: '',
  zip_code: '',
  country: 'USA',
  type: 'office',
  status: 'active',
  contact_name: '',
  contact_email: '',
  contact_phone: '',
  latitude: null,
  longitude: null,
  notes: ''
})

// Methods
const initializeForm = () => {
  // Reset form for new site creation
  form.value = {
    name: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    country: 'USA',
    type: 'office',
    status: 'active',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    latitude: null,
    longitude: null,
    notes: ''
  }
}

const fetchSite = async () => {
  try {
    isLoading.value = true
    error.value = null

    const siteId = route.params.id
    const response = await apiUtils.get(`/sites/${siteId}`)
    const site = response.site

    // Populate form with existing site data
    form.value = {
      name: site.name || '',
      address: site.address || '',
      city: site.city || '',
      state: site.state || '',
      zip_code: site.zip_code || '',
      country: site.country || 'USA',
      type: site.type || 'office',
      status: site.status || 'active',
      contact_name: site.contact_name || '',
      contact_email: site.contact_email || '',
      contact_phone: site.contact_phone || '',
      latitude: site.latitude,
      longitude: site.longitude,
      notes: site.notes || ''
    }
  } catch (err) {
    console.error('Failed to fetch site:', err)
    error.value = 'Failed to load site details. Please try again later.'
  } finally {
    isLoading.value = false
  }
}

const handleSubmit = async () => {
  try {
    isSubmitting.value = true
    error.value = null

    // Prepare payload
    const payload = {
      ...form.value,
      // Convert empty strings to null for optional fields
      city: form.value.city || null,
      state: form.value.state || null,
      zip_code: form.value.zip_code || null,
      contact_name: form.value.contact_name || null,
      contact_email: form.value.contact_email || null,
      contact_phone: form.value.contact_phone || null,
      notes: form.value.notes || null,
      // Handle GPS coordinates
      latitude: form.value.latitude || null,
      longitude: form.value.longitude || null
    }

    if (isEdit.value) {
      // Update existing site
      const siteId = route.params.id
      await apiUtils.put(`/sites/${siteId}`, payload)
      router.push(`/sites/${siteId}`)
    } else {
      // Create new site
      const response = await apiUtils.post('/sites', payload)
      router.push(`/sites/${response.site.id}`)
    }
  } catch (err) {
    console.error('Failed to save site:', err)
    error.value = err.response?.data?.error || 'Failed to save site. Please try again.'
  } finally {
    isSubmitting.value = false
  }
}

// Lifecycle
onMounted(() => {
  if (isEdit.value) {
    fetchSite()
  } else {
    initializeForm()
  }
})
</script>

<style scoped>
.site-form-page {
  max-width: 1000px;
  margin: 0 auto;
  padding: 1.5rem;
  background: hsl(var(--background));
  color: hsl(var(--foreground));
}

/* Header */
.page-header {
  margin-bottom: 2rem;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
  font-size: 0.875rem;
  transition: color 0.2s;
  width: fit-content;
  color: hsl(var(--muted-foreground));
}

.back-btn:hover {
  color: hsl(var(--foreground));
}

.page-title {
  font-size: 1.875rem;
  font-weight: 700;
  margin: 0;
  color: hsl(var(--foreground));
}

/* Form */
.site-form {
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  border-radius: 0.75rem;
  padding: 2rem;
  box-shadow: var(--shadow);
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  margin-bottom: 2rem;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-section.full-width {
  grid-column: span 2;
}

.section-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid hsl(var(--border));
  color: hsl(var(--foreground));
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
  content: ' *';
  color: hsl(var(--destructive));
}

.form-input,
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
.form-textarea:focus {
  outline: none;
  ring: 2px;
  ring-color: hsl(var(--primary));
  border-color: hsl(var(--primary));
}

.form-textarea {
  resize: vertical;
  min-height: 100px;
}

/* Form Actions */
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding-top: 2rem;
  border-top: 1px solid hsl(var(--border));
}

.btn-spinner {
  display: inline-block;
  width: 1rem;
  height: 1rem;
  border: 2px solid hsl(var(--primary-foreground));
  border-top: 2px solid transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-right: 0.5rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Loading and Error States */
.loading-state,
.error-state {
  text-align: center;
  padding: 4rem 2rem;
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

.error-state h3 {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 1rem 0 0.5rem;
  color: hsl(var(--foreground));
}

.error-state p {
  margin-bottom: 2rem;
  font-size: 0.875rem;
  max-width: 24rem;
  margin-left: auto;
  margin-right: auto;
  color: hsl(var(--muted-foreground));
}

/* Responsive */
@media (max-width: 768px) {
  .site-form-page {
    padding: 1rem;
  }

  .site-form {
    padding: 1.5rem;
  }

  .form-grid {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }

  .form-section.full-width {
    grid-column: span 1;
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .form-actions {
    flex-direction: column-reverse;
  }
}

@media (max-width: 480px) {
  .site-form {
    padding: 1rem;
  }

  .form-grid {
    gap: 1rem;
  }
}
</style>