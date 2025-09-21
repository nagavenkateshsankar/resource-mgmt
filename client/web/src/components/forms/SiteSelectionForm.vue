<template>
  <div class="site-selection-form">
    <div class="form-header">
      <h3 class="form-title">Select Site Location</h3>
      <p class="form-subtitle">Choose the site where this inspection will be conducted</p>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="loading-state">
      <div class="loading-spinner"></div>
      <p>Loading sites...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      <p class="error-message">{{ error }}</p>
      <button @click="fetchSites" class="btn btn-secondary">Try Again</button>
    </div>

    <!-- Site Selection -->
    <div v-else class="site-form">
      <!-- Site Selection Mode -->
      <div class="selection-mode">
        <div class="mode-tabs">
          <button
            type="button"
            @click="selectionMode = 'existing'"
            class="mode-tab"
            :class="{ active: selectionMode === 'existing' }"
          >
            <BuildingOfficeIcon class="icon-sm" />
            Select Existing Site
          </button>
          <button
            type="button"
            @click="selectionMode = 'new'"
            class="mode-tab"
            :class="{ active: selectionMode === 'new' }"
          >
            <PlusIcon class="icon-sm" />
            Create New Site
          </button>
        </div>
      </div>

      <!-- Existing Sites Selection -->
      <div v-if="selectionMode === 'existing'" class="existing-sites-section">
        <!-- Search Sites -->
        <div class="search-section">
          <input
            v-model="searchTerm"
            type="text"
            placeholder="Search sites by name or address..."
            class="search-input"
          />
        </div>

        <!-- Sites List -->
        <div v-if="filteredSites.length > 0" class="sites-list">
          <div
            v-for="site in filteredSites"
            :key="site.id"
            @click="selectExistingSite(site)"
            class="site-item"
            :class="{ selected: selectedSite?.id === site.id }"
          >
            <div class="site-icon">
              <component :is="getTypeIcon(site.type)" class="icon-md" />
            </div>
            <div class="site-info">
              <div class="site-name">{{ site.name }}</div>
              <div class="site-address">{{ getFullAddress(site) }}</div>
              <div class="site-meta">
                <span class="site-type">{{ site.type.charAt(0).toUpperCase() + site.type.slice(1) }}</span>
                <span class="site-status" :class="`status-${site.status}`">{{ site.status }}</span>
              </div>
            </div>
            <div class="site-actions">
              <CheckCircleIcon v-if="selectedSite?.id === site.id" class="icon-sm text-success" />
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else-if="sites.length === 0" class="empty-state">
          <BuildingOfficeIcon class="icon-xl" />
          <h4>No Sites Available</h4>
          <p>Create your first site to continue with inspections.</p>
          <button @click="selectionMode = 'new'" class="btn btn-primary">
            <PlusIcon class="icon-sm" />
            Create Site
          </button>
        </div>

        <!-- No Search Results -->
        <div v-else class="empty-state">
          <MagnifyingGlassIcon class="icon-xl" />
          <h4>No Sites Found</h4>
          <p>No sites match your search criteria.</p>
          <button @click="searchTerm = ''" class="btn btn-secondary">Clear Search</button>
        </div>
      </div>

      <!-- New Site Creation -->
      <div v-if="selectionMode === 'new'" class="new-site-section">
        <div class="form-group">
          <label for="site_name" class="form-label">Site Name *</label>
          <input
            id="site_name"
            v-model="newSiteForm.name"
            type="text"
            class="form-input"
            placeholder="Enter site name"
            required
          />
        </div>

        <div class="form-group">
          <label for="site_address" class="form-label">Address *</label>
          <div class="address-input-group">
            <input
              id="site_address"
              v-model="newSiteForm.address"
              type="text"
              class="form-input"
              placeholder="Enter street address"
              required
            />
            <button
              type="button"
              @click="getCurrentLocation"
              class="location-btn"
              title="Use current location"
              :disabled="isLoadingLocation"
            >
              <MapPinIcon class="icon-sm" />
            </button>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="site_city" class="form-label">City</label>
            <input
              id="site_city"
              v-model="newSiteForm.city"
              type="text"
              class="form-input"
              placeholder="Enter city"
            />
          </div>
          <div class="form-group">
            <label for="site_state" class="form-label">State</label>
            <input
              id="site_state"
              v-model="newSiteForm.state"
              type="text"
              class="form-input"
              placeholder="Enter state"
            />
          </div>
        </div>

        <div class="form-group">
          <label for="site_type" class="form-label">Site Type</label>
          <select id="site_type" v-model="newSiteForm.type" class="form-input">
            <option value="office">Office</option>
            <option value="warehouse">Warehouse</option>
            <option value="construction">Construction</option>
            <option value="facility">Facility</option>
            <option value="retail">Retail</option>
          </select>
        </div>
      </div>

      <!-- Form Actions -->
      <div class="form-actions">
        <button type="button" @click="$emit('cancel')" class="btn btn-secondary">
          <ChevronLeftIcon class="icon-sm" />
          Back
        </button>
        <button
          type="button"
          @click="handleSubmit"
          :disabled="!isFormValid"
          class="btn btn-primary"
          :class="{ loading: isSubmitting }"
        >
          <span v-if="isSubmitting" class="btn-spinner"></span>
          {{ selectionMode === 'new' ? 'Create Site & Continue' : 'Continue to Template' }}
          <ChevronRightIcon v-if="!isSubmitting" class="icon-sm" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { apiUtils } from '@/utils/api'
import {
  MapPinIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  BuildingOfficeIcon,
  PlusIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
  HomeIcon,
  BuildingStorefrontIcon,
  TruckIcon,
  WrenchScrewdriverIcon
} from '@heroicons/vue/24/outline'

// Props
interface Props {
  templateId: string
}
const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  submit: [data: { site_id: string; template_id: string }]
  cancel: []
}>()

// State
const isLoading = ref(false)
const isSubmitting = ref(false)
const isLoadingLocation = ref(false)
const error = ref('')
const selectionMode = ref<'existing' | 'new'>('existing')
const searchTerm = ref('')

const sites = ref<Array<any>>([])
const selectedSite = ref<any>(null)

const newSiteForm = ref({
  name: '',
  address: '',
  city: '',
  state: '',
  type: 'office'
})

// Computed
const filteredSites = computed(() => {
  if (!searchTerm.value) return sites.value

  const search = searchTerm.value.toLowerCase()
  return sites.value.filter(site =>
    site.name.toLowerCase().includes(search) ||
    site.address.toLowerCase().includes(search) ||
    site.city?.toLowerCase().includes(search)
  )
})

const isFormValid = computed(() => {
  if (selectionMode.value === 'existing') {
    return selectedSite.value != null
  } else {
    return newSiteForm.value.name.trim() && newSiteForm.value.address.trim()
  }
})

// Methods
const fetchSites = async () => {
  try {
    isLoading.value = true
    error.value = ''

    const response = await apiUtils.get('/sites/active')
    sites.value = response.sites || []

  } catch (err: any) {
    console.error('Failed to fetch sites:', err)
    error.value = 'Failed to load sites. Please try again.'
  } finally {
    isLoading.value = false
  }
}

const selectExistingSite = (site: any) => {
  selectedSite.value = site
}

const getCurrentLocation = async () => {
  if (!navigator.geolocation) {
    alert('Geolocation is not supported by this browser.')
    return
  }

  isLoadingLocation.value = true

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      try {
        const { latitude, longitude } = position.coords
        newSiteForm.value.address = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
      } catch (error) {
        console.error('Error getting location:', error)
      } finally {
        isLoadingLocation.value = false
      }
    },
    (error) => {
      console.error('Error getting location:', error)
      alert('Unable to get your location. Please enter manually.')
      isLoadingLocation.value = false
    }
  )
}

const createNewSite = async () => {
  try {
    const siteData = {
      name: newSiteForm.value.name.trim(),
      address: newSiteForm.value.address.trim(),
      city: newSiteForm.value.city.trim() || null,
      state: newSiteForm.value.state.trim() || null,
      type: newSiteForm.value.type,
      status: 'active'
    }

    const response = await apiUtils.post('/sites', siteData)
    return response.site
  } catch (err: any) {
    console.error('Failed to create site:', err)
    throw new Error(err.response?.data?.error || 'Failed to create site')
  }
}

const handleSubmit = async () => {
  if (!isFormValid.value) return

  try {
    isSubmitting.value = true

    let siteId: string

    if (selectionMode.value === 'existing') {
      siteId = selectedSite.value.id
    } else {
      // Create new site
      const newSite = await createNewSite()
      siteId = newSite.id
    }

    emit('submit', {
      site_id: siteId,
      template_id: props.templateId
    })

  } catch (err: any) {
    console.error('Error submitting site selection:', err)
    error.value = err.message || 'Failed to process site selection'
  } finally {
    isSubmitting.value = false
  }
}

const getTypeIcon = (type: string) => {
  const icons = {
    office: BuildingOfficeIcon,
    warehouse: TruckIcon,
    construction: WrenchScrewdriverIcon,
    facility: HomeIcon,
    retail: BuildingStorefrontIcon
  }
  return icons[type as keyof typeof icons] || BuildingOfficeIcon
}

const getFullAddress = (site: any) => {
  let address = site.address
  if (site.city) address += `, ${site.city}`
  if (site.state) address += `, ${site.state}`
  return address
}

// Lifecycle
onMounted(() => {
  fetchSites()
})
</script>

<style scoped>
.site-selection-form {
  max-width: 600px;
  margin: 0 auto;
  padding: 2rem;
  background: hsl(var(--background));
  border-radius: 8px;
  box-shadow: var(--shadow);
}

.form-header {
  text-align: center;
  margin-bottom: 2rem;
}

.form-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: hsl(var(--foreground));
  margin-bottom: 0.5rem;
}

.form-subtitle {
  color: hsl(var(--muted-foreground));
  font-size: 0.875rem;
}

/* Selection Mode */
.selection-mode {
  margin-bottom: 2rem;
}

.mode-tabs {
  display: flex;
  background: hsl(var(--muted));
  border-radius: 8px;
  padding: 0.25rem;
}

.mode-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: transparent;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  color: hsl(var(--muted-foreground));
  cursor: pointer;
  transition: all 0.2s;
}

.mode-tab.active {
  background: hsl(var(--background));
  color: hsl(var(--foreground));
  box-shadow: var(--shadow-sm);
}

/* Search */
.search-section {
  margin-bottom: 1rem;
}

.search-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid hsl(var(--border));
  border-radius: 6px;
  font-size: 0.875rem;
}

.search-input:focus {
  outline: none;
  border-color: hsl(var(--primary));
  box-shadow: 0 0 0 3px hsl(var(--primary) / 0.1);
}

/* Sites List */
.sites-list {
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
}

.site-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border-bottom: 1px solid hsl(var(--muted));
  cursor: pointer;
  transition: all 0.2s;
}

.site-item:last-child {
  border-bottom: none;
}

.site-item:hover {
  background: hsl(var(--muted) / 0.5);
}

.site-item.selected {
  background: hsl(var(--primary) / 0.1);
  border-color: hsl(var(--primary));
}

.site-icon {
  flex-shrink: 0;
  padding: 0.75rem;
  background: hsl(var(--muted));
  border-radius: 8px;
  color: hsl(var(--muted-foreground));
}

.site-info {
  flex: 1;
}

.site-name {
  font-weight: 600;
  color: hsl(var(--foreground));
  margin-bottom: 0.25rem;
}

.site-address {
  font-size: 0.875rem;
  color: hsl(var(--muted-foreground));
  margin-bottom: 0.5rem;
}

.site-meta {
  display: flex;
  gap: 1rem;
  font-size: 0.75rem;
}

.site-type {
  color: hsl(var(--muted-foreground));
  text-transform: capitalize;
}

.site-status {
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  font-weight: 500;
  text-transform: uppercase;
}

.status-active {
  background: hsl(var(--success) / 0.1);
  color: hsl(var(--success));
}

.status-inactive {
  background: hsl(var(--destructive) / 0.1);
  color: hsl(var(--destructive));
}

.status-maintenance {
  background: hsl(var(--warning) / 0.1);
  color: hsl(var(--warning));
}

/* New Site Form */
.new-site-section {
  margin-bottom: 2rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-label {
  display: block;
  font-weight: 500;
  color: hsl(var(--foreground));
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
}

.form-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid hsl(var(--border));
  border-radius: 6px;
  font-size: 0.875rem;
  transition: all 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: hsl(var(--primary));
  box-shadow: 0 0 0 3px hsl(var(--primary) / 0.1);
}

.address-input-group {
  display: flex;
  gap: 0.5rem;
}

.location-btn {
  padding: 0.75rem;
  background: hsl(var(--muted));
  border: 1px solid hsl(var(--border));
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.15s;
  flex-shrink: 0;
}

.location-btn:hover:not(:disabled) {
  background: hsl(var(--muted) / 0.8);
}

.location-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Loading and Error States */
.loading-state,
.error-state,
.empty-state {
  text-align: center;
  padding: 3rem 2rem;
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

.error-message {
  color: hsl(var(--destructive));
  margin-bottom: 1rem;
}

.empty-state h4 {
  font-size: 1.125rem;
  font-weight: 600;
  color: hsl(var(--foreground));
  margin: 1rem 0 0.5rem;
}

.empty-state p {
  margin-bottom: 1.5rem;
}

/* Form Actions */
.form-actions {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid hsl(var(--border));
}

.btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  font-weight: 500;
  text-decoration: none;
  transition: all 0.15s;
  cursor: pointer;
  border: none;
  font-size: 0.875rem;
}

.btn-primary {
  background: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
}

.btn-primary:hover:not(:disabled) {
  background: hsl(var(--primary) / 0.9);
}

.btn-primary:disabled {
  background: hsl(var(--muted));
  cursor: not-allowed;
}

.btn-primary.loading {
  cursor: not-allowed;
}

.btn-secondary {
  background: hsl(var(--muted));
  color: hsl(var(--muted-foreground));
  border: 1px solid hsl(var(--border));
}

.btn-secondary:hover {
  background: hsl(var(--muted) / 0.8);
}

.btn-spinner {
  display: inline-block;
  width: 1rem;
  height: 1rem;
  border: 2px solid hsl(var(--primary-foreground));
  border-top: 2px solid transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

/* Icon Sizes */
.icon-sm {
  width: 1rem;
  height: 1rem;
}

.icon-md {
  width: 1.5rem;
  height: 1.5rem;
}

.icon-xl {
  width: 4rem;
  height: 4rem;
}

/* Utility Classes */
.text-success {
  color: hsl(var(--success));
}

/* Responsive */
@media (max-width: 768px) {
  .site-selection-form {
    padding: 1.5rem;
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .form-actions {
    flex-direction: column-reverse;
  }
}
</style>