<template>
  <div class="sites-page">
    <div class="page-header">
      <h1 class="page-title">Sites</h1>
      <router-link
        v-if="canManageSites"
        to="/sites/new"
        class="btn btn-primary"
      >
        <PlusIcon class="icon-sm" />
        New Site
      </router-link>
    </div>

    <!-- Search and Filters -->
    <div class="filters-section">
      <div class="filter-group">
        <label for="type-filter" class="filter-label">Type</label>
        <select id="type-filter" v-model="selectedType" class="filter-select">
          <option value="">All Types</option>
          <option value="office">Office</option>
          <option value="warehouse">Warehouse</option>
          <option value="construction">Construction</option>
          <option value="facility">Facility</option>
          <option value="retail">Retail</option>
        </select>
      </div>
      <div class="filter-group">
        <label for="status-filter" class="filter-label">Status</label>
        <select id="status-filter" v-model="selectedStatus" class="filter-select">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="maintenance">Maintenance</option>
        </select>
      </div>
      <div class="filter-group">
        <label for="search" class="filter-label">Search</label>
        <input
          id="search"
          type="text"
          v-model="searchTerm"
          placeholder="Search sites..."
          class="filter-input"
        />
      </div>
    </div>

    <div class="sites-content">
      <!-- Loading State -->
      <div v-if="isLoading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>Loading sites...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="error-state">
        <BuildingOfficeIcon class="icon-xl" />
        <h3>Error Loading Sites</h3>
        <p>{{ error }}</p>
        <button @click="fetchSites" class="btn btn-primary">
          Try Again
        </button>
      </div>

      <!-- Sites Grid -->
      <div v-else-if="filteredSites.length > 0" class="sites-grid">
        <div
          v-for="site in filteredSites"
          :key="site.id"
          class="site-card"
        >
          <div class="site-header">
            <div class="site-icon">
              <component :is="getTypeIcon(site.type)" class="icon-md" />
            </div>
            <div class="site-actions">
              <button class="site-menu-btn" title="More actions">
                <EllipsisVerticalIcon class="icon-sm" />
              </button>
            </div>
          </div>

          <div class="site-body">
            <h3 class="site-title">{{ site.name }}</h3>
            <p class="site-address">{{ site.full_address }}</p>

            <div class="site-meta">
              <div class="meta-item">
                <TagIcon class="icon-sm" />
                <span class="type-badge" :class="`type-${site.type}`">
                  {{ site.type.charAt(0).toUpperCase() + site.type.slice(1) }}
                </span>
              </div>
              <div class="meta-item">
                <CheckCircleIcon v-if="site.status === 'active'" class="icon-sm text-green-500" />
                <XCircleIcon v-else-if="site.status === 'inactive'" class="icon-sm text-red-500" />
                <WrenchScrewdriverIcon v-else class="icon-sm text-yellow-500" />
                <span :class="getStatusClass(site.status)">{{ site.status.charAt(0).toUpperCase() + site.status.slice(1) }}</span>
              </div>
              <div v-if="site.contact_name" class="meta-item">
                <UserIcon class="icon-sm" />
                <span>{{ site.contact_name }}</span>
              </div>
            </div>

            <div class="site-stats">
              <div class="stat">
                <span class="stat-number">{{ site.total_inspections || 0 }}</span>
                <span class="stat-label">inspections</span>
              </div>
              <div class="stat">
                <span class="stat-number">{{ site.pending_inspections || 0 }}</span>
                <span class="stat-label">pending</span>
              </div>
            </div>
          </div>

          <div class="site-footer">
            <router-link
              :to="`/sites/${site.id}`"
              class="btn btn-secondary btn-sm"
            >
              <EyeIcon class="icon-sm" />
              View Details
            </router-link>
            <router-link
              :to="`/inspections/create?site_id=${site.id}`"
              class="btn btn-primary btn-sm"
            >
              <ClipboardDocumentCheckIcon class="icon-sm" />
              New Inspection
            </router-link>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="empty-state">
        <BuildingOfficeIcon class="icon-xl" />
        <h3>No Sites Found</h3>
        <p>{{ searchTerm || selectedType || selectedStatus ? 'No sites match your filters.' : 'No sites available yet.' }}</p>
        <router-link v-if="canManageSites" to="/sites/new" class="btn btn-primary">
          <PlusIcon class="icon-sm" />
          Create First Site
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { apiUtils } from '@/utils/api'
import {
  PlusIcon,
  BuildingOfficeIcon,
  EyeIcon,
  TagIcon,
  ClipboardDocumentCheckIcon,
  EllipsisVerticalIcon,
  WrenchScrewdriverIcon,
  HomeIcon,
  BuildingStorefrontIcon,
  TruckIcon,
  CheckCircleIcon,
  XCircleIcon,
  UserIcon
} from '@heroicons/vue/24/outline'

const authStore = useAuthStore()
const canManageSites = computed(() => {
  const userRole = authStore.user?.role
  return userRole === 'admin' || userRole === 'supervisor' || authStore.hasPermission('can_manage_sites')
})

// State
const sites = ref([])
const isLoading = ref(false)
const error = ref(null)

// Filters
const selectedType = ref('')
const selectedStatus = ref('')
const searchTerm = ref('')

// Computed
const filteredSites = computed(() => {
  let filtered = sites.value

  if (selectedType.value) {
    filtered = filtered.filter(site =>
      site.type === selectedType.value
    )
  }

  if (selectedStatus.value) {
    filtered = filtered.filter(site =>
      site.status === selectedStatus.value
    )
  }

  if (searchTerm.value) {
    const search = searchTerm.value.toLowerCase()
    filtered = filtered.filter(site =>
      site.name.toLowerCase().includes(search) ||
      site.address.toLowerCase().includes(search) ||
      site.city?.toLowerCase().includes(search) ||
      site.contact_name?.toLowerCase().includes(search)
    )
  }

  return filtered
})

// Methods
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

const getStatusClass = (status: string) => {
  const classes = {
    active: 'text-green-600',
    inactive: 'text-red-600',
    maintenance: 'text-yellow-600'
  }
  return classes[status as keyof typeof classes] || 'text-gray-600'
}

// API Functions
const fetchSites = async () => {
  try {
    isLoading.value = true
    error.value = null

    const response = await apiUtils.get('/sites')

    // Transform API response to match frontend structure
    sites.value = response.sites.map(site => ({
      id: site.id,
      name: site.name,
      address: site.address,
      city: site.city,
      state: site.state,
      zip_code: site.zip_code,
      country: site.country,
      full_address: getFullAddress(site),
      type: site.type || 'office',
      status: site.status || 'active',
      contact_name: site.contact_name,
      contact_email: site.contact_email,
      contact_phone: site.contact_phone,
      latitude: site.latitude,
      longitude: site.longitude,
      notes: site.notes,
      created_at: site.created_at,
      total_inspections: 0, // TODO: Add from backend stats
      pending_inspections: 0 // TODO: Add from backend stats
    }))
  } catch (err) {
    console.error('Failed to fetch sites:', err)
    error.value = 'Failed to load sites. Please try again later.'
  } finally {
    isLoading.value = false
  }
}

// Helper functions
const getFullAddress = (site) => {
  let address = site.address
  if (site.city) address += `, ${site.city}`
  if (site.state) address += `, ${site.state}`
  if (site.zip_code) address += ` ${site.zip_code}`
  return address
}

// Lifecycle
onMounted(() => {
  fetchSites()
})
</script>

<style scoped>
.sites-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1.5rem;
  background: hsl(var(--background));
  color: hsl(var(--foreground));
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.page-title {
  font-size: 2rem;
  font-weight: 700;
  color: hsl(var(--foreground));
}

/* Filters */
.filters-section {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: hsl(var(--background));
  border-radius: 0.75rem;
  box-shadow: var(--shadow-sm);
  border: 1px solid hsl(var(--border));
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.filter-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: hsl(var(--foreground));
}

.filter-select,
.filter-input {
  padding: 0.5rem 0.75rem;
  border: 1px solid hsl(var(--border));
  border-radius: 0.375rem;
  font-size: 0.875rem;
  min-width: 150px;
  background: hsl(var(--background));
  color: hsl(var(--foreground));
}

.filter-select:focus,
.filter-input:focus {
  outline: none;
  ring: 2px;
  ring-color: hsl(var(--primary));
  border-color: hsl(var(--primary));
}

/* Content */
.sites-content {
  background: transparent;
}

/* Sites Grid */
.sites-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
}

.site-card {
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  border-radius: 0.75rem;
  padding: 1.5rem;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  height: 100%;
  box-shadow: var(--shadow-sm);
}

.site-card:hover {
  border-color: hsl(var(--primary));
  box-shadow: var(--shadow);
  transform: translateY(-2px);
}

.site-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.site-icon {
  padding: 0.75rem;
  border-radius: 0.5rem;
  background: hsl(var(--muted));
  color: hsl(var(--muted-foreground));
}

.site-menu-btn {
  background: none;
  border: none;
  color: hsl(var(--muted-foreground));
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 0.25rem;
  transition: all 0.2s;
}

.site-menu-btn:hover {
  background: hsl(var(--muted));
}

.site-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.site-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0;
  color: hsl(var(--foreground));
}

.site-address {
  font-size: 0.875rem;
  line-height: 1.5;
  margin: 0;
  flex: 1;
  color: hsl(var(--muted-foreground));
}

.site-meta {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
}

.type-badge {
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.625rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.type-office {
  background: hsl(var(--primary) / 0.1);
  color: hsl(var(--primary));
}

.type-warehouse {
  background: hsl(var(--warning) / 0.1);
  color: hsl(var(--warning));
}

.type-construction {
  background: hsl(264 50% 88% / 0.3);
  color: hsl(264 50% 40%);
}

.type-facility {
  background: hsl(var(--success) / 0.1);
  color: hsl(var(--success));
}

.type-retail {
  background: hsl(330 50% 88% / 0.3);
  color: hsl(330 50% 40%);
}

.site-stats {
  display: flex;
  justify-content: space-between;
  padding: 0.75rem 0;
  border-top: 1px solid hsl(var(--border));
  margin-top: 0.5rem;
}

.stat {
  text-align: center;
  flex: 1;
}

.stat-number {
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  color: hsl(var(--foreground));
}

.stat-label {
  font-size: 0.625rem;
  color: hsl(var(--muted-foreground));
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.site-footer {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid hsl(var(--border));
}

.site-footer .btn {
  flex: 1;
  justify-content: center;
}

/* Status colors */
.text-green-500 { color: hsl(var(--success)); }
.text-green-600 { color: hsl(var(--success)); }
.text-red-500 { color: hsl(var(--destructive)); }
.text-red-600 { color: hsl(var(--destructive)); }
.text-yellow-500 { color: hsl(var(--warning)); }
.text-yellow-600 { color: hsl(var(--warning)); }
.text-gray-600 { color: hsl(var(--muted-foreground)); }

/* Empty State */
.empty-state {
  text-align: center;
  padding: 4rem 2rem;
}

.empty-state h3 {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 1rem 0 0.5rem;
  color: hsl(var(--foreground));
}

.empty-state p {
  margin-bottom: 2rem;
  font-size: 0.875rem;
  max-width: 24rem;
  margin-left: auto;
  margin-right: auto;
  color: hsl(var(--muted-foreground));
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

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
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
  .sites-page {
    padding: 1rem;
  }

  .page-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .filters-section {
    flex-direction: column;
  }

  .filter-select,
  .filter-input {
    min-width: auto;
  }

  .sites-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .site-stats {
    flex-direction: column;
    gap: 0.5rem;
    text-align: left;
  }

  .site-footer {
    flex-direction: column;
  }

  .empty-state {
    padding: 2rem 1rem;
  }
}

@media (max-width: 480px) {
  .site-card {
    padding: 1rem;
  }

  .site-header {
    margin-bottom: 0.75rem;
  }

  .site-body {
    gap: 0.75rem;
  }
}
</style>