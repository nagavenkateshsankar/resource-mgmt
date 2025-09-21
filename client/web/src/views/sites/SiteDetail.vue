<template>
  <div class="site-detail-page">
    <!-- Loading State -->
    <div v-if="isLoading" class="loading-state">
      <div class="loading-spinner"></div>
      <p>Loading site details...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      <BuildingOfficeIcon class="icon-xl" />
      <h3>Error Loading Site</h3>
      <p>{{ error }}</p>
      <router-link to="/sites" class="btn btn-primary">
        Back to Sites
      </router-link>
    </div>

    <!-- Site Details -->
    <div v-else-if="site" class="site-detail-content">
      <!-- Header -->
      <div class="site-header">
        <div class="header-left">
          <router-link to="/sites" class="back-btn">
            <ArrowLeftIcon class="icon-sm" />
            Back to Sites
          </router-link>
          <div class="site-title-section">
            <div class="site-icon">
              <component :is="getTypeIcon(site.type)" class="icon-lg" />
            </div>
            <div>
              <h1 class="site-title">{{ site.name }}</h1>
              <div class="site-status">
                <CheckCircleIcon v-if="site.status === 'active'" class="icon-sm text-green-500" />
                <XCircleIcon v-else-if="site.status === 'inactive'" class="icon-sm text-red-500" />
                <WrenchScrewdriverIcon v-else class="icon-sm text-yellow-500" />
                <span :class="getStatusClass(site.status)">{{ site.status.charAt(0).toUpperCase() + site.status.slice(1) }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="header-actions" v-if="canManageSites">
          <router-link :to="`/sites/${site.id}/edit`" class="btn btn-secondary">
            <PencilIcon class="icon-sm" />
            Edit Site
          </router-link>
          <router-link :to="`/inspections/create?site_id=${site.id}`" class="btn btn-primary">
            <ClipboardDocumentCheckIcon class="icon-sm" />
            New Inspection
          </router-link>
        </div>
      </div>

      <!-- Content Grid -->
      <div class="content-grid">
        <!-- Site Information -->
        <div class="info-section">
          <h2 class="section-title">Site Information</h2>
          <div class="info-card">
            <div class="info-row">
              <label>Address</label>
              <div class="info-value">
                <MapPinIcon class="icon-sm" />
                <span>{{ getFullAddress(site) }}</span>
              </div>
            </div>
            <div class="info-row">
              <label>Type</label>
              <div class="info-value">
                <span class="type-badge" :class="`type-${site.type}`">
                  {{ site.type.charAt(0).toUpperCase() + site.type.slice(1) }}
                </span>
              </div>
            </div>
            <div v-if="site.contact_name" class="info-row">
              <label>Contact Person</label>
              <div class="info-value">
                <UserIcon class="icon-sm" />
                <span>{{ site.contact_name }}</span>
              </div>
            </div>
            <div v-if="site.contact_email" class="info-row">
              <label>Email</label>
              <div class="info-value">
                <EnvelopeIcon class="icon-sm" />
                <a :href="`mailto:${site.contact_email}`" class="link">{{ site.contact_email }}</a>
              </div>
            </div>
            <div v-if="site.contact_phone" class="info-row">
              <label>Phone</label>
              <div class="info-value">
                <PhoneIcon class="icon-sm" />
                <a :href="`tel:${site.contact_phone}`" class="link">{{ site.contact_phone }}</a>
              </div>
            </div>
            <div v-if="site.notes" class="info-row">
              <label>Notes</label>
              <div class="info-value">
                <span class="notes">{{ site.notes }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Site Statistics -->
        <div class="stats-section">
          <h2 class="section-title">Statistics</h2>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-icon">
                <ClipboardDocumentCheckIcon class="icon-md" />
              </div>
              <div class="stat-content">
                <div class="stat-number">{{ siteStats?.total_inspections || 0 }}</div>
                <div class="stat-label">Total Inspections</div>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon text-green-600">
                <CheckCircleIcon class="icon-md" />
              </div>
              <div class="stat-content">
                <div class="stat-number">{{ siteStats?.completed_inspections || 0 }}</div>
                <div class="stat-label">Completed</div>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon text-yellow-600">
                <ClockIcon class="icon-md" />
              </div>
              <div class="stat-content">
                <div class="stat-number">{{ siteStats?.pending_inspections || 0 }}</div>
                <div class="stat-label">Pending</div>
              </div>
            </div>
            <div v-if="siteStats?.critical_issues" class="stat-card">
              <div class="stat-icon text-red-600">
                <ExclamationTriangleIcon class="icon-md" />
              </div>
              <div class="stat-content">
                <div class="stat-number">{{ siteStats.critical_issues }}</div>
                <div class="stat-label">Critical Issues</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Recent Inspections -->
        <div class="inspections-section">
          <div class="section-header">
            <h2 class="section-title">Recent Inspections</h2>
            <router-link :to="`/inspections?site_id=${site.id}`" class="view-all-link">
              View All
            </router-link>
          </div>

          <div v-if="isLoadingInspections" class="loading-state-small">
            <div class="loading-spinner-small"></div>
            <p>Loading inspections...</p>
          </div>

          <div v-else-if="recentInspections.length === 0" class="empty-inspections">
            <ClipboardDocumentCheckIcon class="icon-lg" />
            <p>No inspections found for this site</p>
            <router-link :to="`/inspections/create?site_id=${site.id}`" class="btn btn-primary btn-sm">
              Create First Inspection
            </router-link>
          </div>

          <div v-else class="inspections-list">
            <div
              v-for="inspection in recentInspections"
              :key="inspection.id"
              class="inspection-item"
            >
              <div class="inspection-content">
                <div class="inspection-header">
                  <h4 class="inspection-title">{{ inspection.template?.name || 'Unknown Template' }}</h4>
                  <span class="inspection-status" :class="`status-${inspection.status}`">
                    {{ inspection.status.replace('_', ' ').charAt(0).toUpperCase() + inspection.status.replace('_', ' ').slice(1) }}
                  </span>
                </div>
                <div class="inspection-meta">
                  <span class="inspector">{{ inspection.inspector?.name || 'Unassigned' }}</span>
                  <span class="date">{{ formatDate(inspection.created_at) }}</span>
                </div>
              </div>
              <router-link :to="`/inspections/${inspection.id}`" class="btn btn-secondary btn-sm">
                View
              </router-link>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { apiUtils } from '@/utils/api'
import {
  ArrowLeftIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  CheckCircleIcon,
  XCircleIcon,
  WrenchScrewdriverIcon,
  ClipboardDocumentCheckIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  PencilIcon,
  HomeIcon,
  BuildingStorefrontIcon,
  TruckIcon
} from '@heroicons/vue/24/outline'
import { computed } from 'vue'

const route = useRoute()
const authStore = useAuthStore()

const canManageSites = computed(() => {
  const userRole = authStore.user?.role
  return userRole === 'admin' || userRole === 'supervisor' || authStore.hasPermission('can_manage_sites')
})

// State
const site = ref(null)
const siteStats = ref(null)
const recentInspections = ref([])
const isLoading = ref(false)
const isLoadingInspections = ref(false)
const error = ref(null)

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

const getFullAddress = (siteData) => {
  let address = siteData.address
  if (siteData.city) address += `, ${siteData.city}`
  if (siteData.state) address += `, ${siteData.state}`
  if (siteData.zip_code) address += ` ${siteData.zip_code}`
  return address
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

// API Functions
const fetchSite = async () => {
  try {
    isLoading.value = true
    error.value = null

    const siteId = route.params.id
    const response = await apiUtils.get(`/sites/${siteId}`)
    site.value = response.site

    // Fetch site statistics
    const statsResponse = await apiUtils.get(`/sites/${siteId}/stats`)
    siteStats.value = statsResponse.stats

  } catch (err) {
    console.error('Failed to fetch site:', err)
    error.value = 'Failed to load site details. Please try again later.'
  } finally {
    isLoading.value = false
  }
}

const fetchRecentInspections = async () => {
  try {
    isLoadingInspections.value = true
    const siteId = route.params.id
    const response = await apiUtils.get(`/sites/${siteId}/inspections?limit=5`)
    recentInspections.value = response.inspections
  } catch (err) {
    console.error('Failed to fetch inspections:', err)
  } finally {
    isLoadingInspections.value = false
  }
}

// Lifecycle
onMounted(() => {
  fetchSite()
  fetchRecentInspections()
})
</script>

<style scoped>
.site-detail-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1.5rem;
  background: hsl(var(--background));
  color: hsl(var(--foreground));
}

/* Header */
.site-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  gap: 1rem;
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
  color: hsl(var(--muted-foreground));
}

.back-btn:hover {
  color: hsl(var(--foreground));
}

.site-title-section {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.site-icon {
  padding: 1rem;
  border-radius: 0.75rem;
  background: hsl(var(--muted));
  color: hsl(var(--muted-foreground));
}

.site-title {
  font-size: 1.875rem;
  font-weight: 700;
  margin: 0 0 0.5rem 0;
  color: hsl(var(--foreground));
}

.site-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

/* Content Grid */
.content-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}

.inspections-section {
  grid-column: span 2;
}

/* Sections */
.section-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 1rem 0;
  color: hsl(var(--foreground));
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.view-all-link {
  color: hsl(var(--primary));
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 500;
}

.view-all-link:hover {
  color: hsl(var(--primary) / 0.8);
}

/* Info Card */
.info-card {
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  border-radius: 0.75rem;
  padding: 1.5rem;
  box-shadow: var(--shadow-sm);
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 0.75rem 0;
  border-bottom: 1px solid hsl(var(--border));
}

.info-row:last-child {
  border-bottom: none;
}

.info-row label {
  font-weight: 500;
  min-width: 80px;
  color: hsl(var(--foreground));
}

.info-value {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  text-align: right;
  color: hsl(var(--muted-foreground));
}

.link {
  color: hsl(var(--primary));
  text-decoration: none;
}

.link:hover {
  color: hsl(var(--primary) / 0.8);
}

.notes {
  text-align: left;
  width: 100%;
  white-space: pre-wrap;
}

.type-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
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

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
}

.stat-card {
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  border-radius: 0.75rem;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  box-shadow: var(--shadow-sm);
}

.stat-icon {
}

.stat-content {
  flex: 1;
}

.stat-number {
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1;
  color: hsl(var(--foreground));
}

.stat-label {
  font-size: 0.75rem;
  color: hsl(var(--muted-foreground));
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-top: 0.25rem;
}

/* Status colors */
.text-green-500 { color: hsl(var(--success)); }
.text-green-600 { color: hsl(var(--success)); }
.text-red-500 { color: hsl(var(--destructive)); }
.text-red-600 { color: hsl(var(--destructive)); }
.text-yellow-500 { color: hsl(var(--warning)); }
.text-yellow-600 { color: hsl(var(--warning)); }
.text-gray-600 { color: hsl(var(--muted-foreground)); }

/* Inspections List */
.inspections-list {
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  border-radius: 0.75rem;
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}

.inspection-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid hsl(var(--border));
}

.inspection-item:last-child {
  border-bottom: none;
}

.inspection-content {
  flex: 1;
}

.inspection-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.inspection-title {
  font-weight: 600;
  margin: 0;
  font-size: 0.875rem;
  color: hsl(var(--foreground));
}

.inspection-status {
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.625rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.status-draft {
  background: hsl(var(--muted));
  color: hsl(var(--muted-foreground));
}

.status-in_progress {
  background: hsl(var(--primary) / 0.1);
  color: hsl(var(--primary));
}

.status-completed {
  background: hsl(var(--success) / 0.1);
  color: hsl(var(--success));
}

.status-approved {
  background: hsl(var(--success) / 0.1);
  color: hsl(var(--success));
}

.status-requires_review {
  background: hsl(var(--warning) / 0.1);
  color: hsl(var(--warning));
}

.inspection-meta {
  display: flex;
  gap: 1rem;
  font-size: 0.75rem;
  color: hsl(var(--muted-foreground));
}

.empty-inspections {
  text-align: center;
  padding: 3rem;
}

.empty-inspections p {
  margin: 1rem 0;
  color: hsl(var(--muted-foreground));
}

/* Loading States */
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

.loading-state-small {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 2rem;
}

.loading-spinner-small {
  width: 1rem;
  height: 1rem;
  border: 2px solid hsl(var(--muted));
  border-top: 2px solid hsl(var(--primary));
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
  .site-detail-page {
    padding: 1rem;
  }

  .site-header {
    flex-direction: column;
    align-items: stretch;
  }

  .content-grid {
    grid-template-columns: 1fr;
  }

  .inspections-section {
    grid-column: span 1;
  }

  .site-title-section {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .header-actions {
    width: 100%;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .info-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .info-value {
    text-align: left;
  }
}

@media (max-width: 480px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .inspection-item {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }

  .inspection-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
}
</style>