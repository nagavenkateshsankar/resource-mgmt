<template>
  <div class="site-selection">
    <!-- Search and Filters -->
    <div class="selection-filters">
      <div class="filter-row">
        <div class="search-group">
          <MagnifyingGlassIcon class="search-icon" />
          <input
            v-model="searchTerm"
            type="text"
            placeholder="Search sites by name or address..."
            class="search-input"
          />
        </div>
        <div class="filter-group" v-if="multiple">
          <select v-model="sortBy" class="sort-select">
            <option value="name">Sort by Name</option>
            <option value="address">Sort by Address</option>
            <option value="created_at">Sort by Date Created</option>
          </select>
        </div>
      </div>

      <!-- Selection Controls (for multiple selection) -->
      <div v-if="multiple" class="selection-controls">
        <div class="selection-summary">
          <span class="selection-count">
            {{ selectedSites.length }} of {{ filteredSites.length }} sites selected
          </span>
        </div>
        <div class="selection-actions">
          <button
            @click="selectAllFiltered"
            :disabled="allFilteredSelected"
            class="btn btn-sm btn-secondary"
          >
            <CheckIcon class="icon-sm" />
            Select All
          </button>
          <button
            @click="deselectAll"
            :disabled="selectedSites.length === 0"
            class="btn btn-sm btn-secondary"
          >
            <XMarkIcon class="icon-sm" />
            Clear All
          </button>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="loading-state">
      <div class="loading-spinner"></div>
      <p>Loading sites...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      <ExclamationTriangleIcon class="icon-xl" />
      <h3>Error Loading Sites</h3>
      <p>{{ error }}</p>
      <button @click="fetchSites" class="btn btn-primary">
        Try Again
      </button>
    </div>

    <!-- Sites List -->
    <div v-else-if="filteredSites.length > 0" class="sites-list">
      <div
        v-for="site in paginatedSites"
        :key="site.id"
        class="site-card"
        :class="{
          'selected': isSelected(site.id),
          'selectable': multiple,
          'single-select': !multiple
        }"
        @click="handleSiteClick(site.id)"
      >
        <!-- Selection Checkbox (for multiple selection) -->
        <div v-if="multiple" class="site-checkbox">
          <input
            type="checkbox"
            :id="`site-${site.id}`"
            :checked="isSelected(site.id)"
            @change="toggleSelection(site.id)"
            @click.stop
            class="checkbox-input"
          />
          <label :for="`site-${site.id}`" class="checkbox-label"></label>
        </div>

        <!-- Radio Button (for single selection) -->
        <div v-else class="site-radio">
          <input
            type="radio"
            :id="`site-${site.id}`"
            :value="site.id"
            :checked="isSelected(site.id)"
            @change="selectSingle(site.id)"
            name="site-selection"
            class="radio-input"
          />
          <label :for="`site-${site.id}`" class="radio-label"></label>
        </div>

        <!-- Site Info -->
        <div class="site-info">
          <div class="site-header">
            <h3 class="site-name">{{ site.name }}</h3>
            <div class="site-meta">
              <span class="site-id">#{{ site.id.slice(-8) }}</span>
            </div>
          </div>

          <div class="site-details">
            <div class="site-address">
              <MapPinIcon class="icon-sm" />
              <span>{{ site.address }}</span>
            </div>

            <div class="site-stats">
              <div class="stat-item">
                <CalendarIcon class="icon-sm" />
                <span>Created {{ formatDate(site.created_at) }}</span>
              </div>
            </div>
          </div>

          <!-- Coordinates (if available) -->
          <div v-if="site.coordinates" class="site-coordinates">
            <GlobeAltIcon class="icon-sm" />
            <span>{{ site.coordinates.latitude.toFixed(6) }}, {{ site.coordinates.longitude.toFixed(6) }}</span>
          </div>
        </div>

        <!-- Selected Indicator -->
        <div v-if="isSelected(site.id)" class="selected-indicator">
          <CheckCircleIcon class="icon-lg text-primary" />
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="pagination">
        <button
          @click="currentPage = Math.max(1, currentPage - 1)"
          :disabled="currentPage === 1"
          class="pagination-btn"
        >
          <ChevronLeftIcon class="icon-sm" />
          Previous
        </button>

        <div class="pagination-info">
          Page {{ currentPage }} of {{ totalPages }}
          ({{ filteredSites.length }} sites)
        </div>

        <button
          @click="currentPage = Math.min(totalPages, currentPage + 1)"
          :disabled="currentPage === totalPages"
          class="pagination-btn"
        >
          Next
          <ChevronRightIcon class="icon-sm" />
        </button>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="empty-state">
      <BuildingOfficeIcon class="icon-xl" />
      <h3>No Sites Found</h3>
      <p>{{ searchTerm ? 'No sites match your search criteria.' : 'No sites are available for assignment.' }}</p>
      <router-link to="/sites/new" class="btn btn-primary">
        <PlusIcon class="icon-sm" />
        Create First Site
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useAssignmentStore } from '@/stores/assignment'
import { storeToRefs } from 'pinia'
import {
  MagnifyingGlassIcon,
  CheckIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  MapPinIcon,
  CalendarIcon,
  GlobeAltIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  BuildingOfficeIcon,
  PlusIcon
} from '@heroicons/vue/24/outline'

// Props
interface Props {
  multiple?: boolean
  selectedSites: string[]
}

const props = withDefaults(defineProps<Props>(), {
  multiple: true
})

// Emits
const emit = defineEmits<{
  'update:selected-sites': [sites: string[]]
}>()

// Store
const assignmentStore = useAssignmentStore()
const { sites, isLoading, error } = storeToRefs(assignmentStore)

// Local state
const searchTerm = ref('')
const sortBy = ref('name')
const currentPage = ref(1)
const itemsPerPage = 10

// Computed properties
const filteredSites = computed(() => {
  let filtered = [...sites.value]

  // Apply search filter
  if (searchTerm.value) {
    const search = searchTerm.value.toLowerCase()
    filtered = filtered.filter(site =>
      site.name.toLowerCase().includes(search) ||
      site.address.toLowerCase().includes(search)
    )
  }

  // Apply sorting
  filtered.sort((a, b) => {
    switch (sortBy.value) {
      case 'name':
        return a.name.localeCompare(b.name)
      case 'address':
        return a.address.localeCompare(b.address)
      case 'created_at':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      default:
        return 0
    }
  })

  return filtered
})

const paginatedSites = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return filteredSites.value.slice(start, end)
})

const totalPages = computed(() => {
  return Math.ceil(filteredSites.value.length / itemsPerPage)
})

const allFilteredSelected = computed(() => {
  if (!props.multiple || filteredSites.value.length === 0) return false
  return filteredSites.value.every(site => props.selectedSites.includes(site.id))
})

// Selection methods
const isSelected = (siteId: string): boolean => {
  return props.selectedSites.includes(siteId)
}

const toggleSelection = (siteId: string) => {
  if (!props.multiple) return

  const newSelection = [...props.selectedSites]
  const index = newSelection.indexOf(siteId)

  if (index > -1) {
    newSelection.splice(index, 1)
  } else {
    newSelection.push(siteId)
  }

  emit('update:selected-sites', newSelection)
}

const selectSingle = (siteId: string) => {
  if (props.multiple) return
  emit('update:selected-sites', [siteId])
}

const handleSiteClick = (siteId: string) => {
  if (props.multiple) {
    toggleSelection(siteId)
  } else {
    selectSingle(siteId)
  }
}

const selectAllFiltered = () => {
  if (!props.multiple) return

  const filteredIds = filteredSites.value.map(site => site.id)
  const newSelection = [...new Set([...props.selectedSites, ...filteredIds])]
  emit('update:selected-sites', newSelection)
}

const deselectAll = () => {
  emit('update:selected-sites', [])
}

// Helper functions
const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const fetchSites = async () => {
  await assignmentStore.fetchSites()
}

// Watch for search changes to reset pagination
watch(searchTerm, () => {
  currentPage.value = 1
})

// Initialize
onMounted(async () => {
  if (sites.value.length === 0) {
    await fetchSites()
  }
})
</script>

<style scoped>
.site-selection {
  max-width: 100%;
}

/* Filters */
.selection-filters {
  background: hsl(var(--muted));
  border-radius: 0.75rem;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  border: 1px solid hsl(var(--border));
}

.filter-row {
  display: flex;
  gap: 1rem;
  align-items: center;
  margin-bottom: 1rem;
}

.search-group {
  position: relative;
  flex: 1;
}

.search-icon {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  width: 1.25rem;
  height: 1.25rem;
  color: hsl(var(--muted-foreground));
}

.search-input {
  width: 100%;
  padding: 0.75rem 0.75rem 0.75rem 2.5rem;
  border: 1px solid hsl(var(--border));
  border-radius: 0.5rem;
  font-size: 0.875rem;
  background: hsl(var(--background));
  color: hsl(var(--foreground));
}

.search-input:focus {
  outline: none;
  ring: 2px;
  ring-color: hsl(var(--primary));
  border-color: hsl(var(--primary));
}

.filter-group {
  flex-shrink: 0;
}

.sort-select {
  padding: 0.75rem;
  border: 1px solid hsl(var(--border));
  border-radius: 0.5rem;
  font-size: 0.875rem;
  background: hsl(var(--background));
  color: hsl(var(--foreground));
  min-width: 150px;
}

.selection-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 1rem;
  border-top: 1px solid hsl(var(--border));
}

.selection-summary {
  font-size: 0.875rem;
  color: hsl(var(--muted-foreground));
  font-weight: 500;
}

.selection-actions {
  display: flex;
  gap: 0.5rem;
}

/* Sites List */
.sites-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.site-card {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1.5rem;
  border: 2px solid hsl(var(--border));
  border-radius: 0.75rem;
  background: hsl(var(--background));
  transition: all 0.2s;
  position: relative;
}

.site-card.selectable {
  cursor: pointer;
}

.site-card.single-select {
  cursor: pointer;
}

.site-card:hover {
  border-color: hsl(var(--primary));
  box-shadow: var(--shadow);
}

.site-card.selected {
  border-color: hsl(var(--primary));
  background: hsl(var(--primary) / 0.1);
}

/* Selection Controls */
.site-checkbox,
.site-radio {
  flex-shrink: 0;
  margin-top: 0.25rem;
}

.checkbox-input,
.radio-input {
  width: 1.25rem;
  height: 1.25rem;
  accent-color: hsl(var(--primary));
}

.checkbox-label,
.radio-label {
  cursor: pointer;
}

/* Site Info */
.site-info {
  flex: 1;
  min-width: 0;
}

.site-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.75rem;
}

.site-name {
  font-size: 1.125rem;
  font-weight: 600;
  color: hsl(var(--foreground));
  margin: 0;
}

.site-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.site-id {
  font-size: 0.75rem;
  color: hsl(var(--muted-foreground));
  background: hsl(var(--muted));
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-mono: true;
}

.site-details {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.site-address {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: hsl(var(--muted-foreground));
  font-size: 0.875rem;
}

.site-stats {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  color: hsl(var(--muted-foreground));
  font-size: 0.75rem;
}

.site-coordinates {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: hsl(var(--muted-foreground));
  font-size: 0.75rem;
  margin-top: 0.5rem;
  font-family: monospace;
}

/* Selected Indicator */
.selected-indicator {
  position: absolute;
  top: 1rem;
  right: 1rem;
}

/* Pagination */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid hsl(var(--border));
}

.pagination-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: 1px solid hsl(var(--border));
  background: hsl(var(--background));
  color: hsl(var(--foreground));
  border-radius: 0.375rem;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
}

.pagination-btn:hover:not(:disabled) {
  border-color: hsl(var(--primary));
  color: hsl(var(--primary));
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination-info {
  font-size: 0.875rem;
  color: hsl(var(--muted-foreground));
  text-align: center;
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

.error-state h3,
.empty-state h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: hsl(var(--foreground));
  margin: 1rem 0 0.5rem;
}

.error-state p,
.empty-state p {
  margin-bottom: 2rem;
  font-size: 0.875rem;
  max-width: 24rem;
  margin-left: auto;
  margin-right: auto;
}

/* Responsive */
@media (max-width: 768px) {
  .selection-filters {
    padding: 1rem;
  }

  .filter-row {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
  }

  .selection-controls {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .selection-actions {
    justify-content: center;
  }

  .site-card {
    padding: 1rem;
    gap: 0.75rem;
  }

  .site-header {
    flex-direction: column;
    gap: 0.5rem;
    align-items: flex-start;
  }

  .site-stats {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .pagination {
    flex-direction: column;
    gap: 0.75rem;
  }

  .pagination-info {
    order: -1;
  }
}
</style>