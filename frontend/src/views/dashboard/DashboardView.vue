<template>
  <div class="dashboard-page" :class="themeClasses.bg.primary">
    <!-- Dashboard Header -->
    <div class="dashboard-header">
      <div class="header-content">
        <div class="welcome-section">
          <h1 class="dashboard-title" :class="themeClasses.text.primary">
            Welcome back, {{ user?.name?.split(' ')[0] || 'User' }}!
          </h1>
          <p class="dashboard-subtitle" :class="themeClasses.text.secondary">
            Here's what's happening with your inspections today
          </p>
        </div>
        <div class="quick-actions">
          <router-link to="/inspections/new" class="btn btn-primary">
            <PlusIcon class="icon-sm" />
            New Inspection
          </router-link>
        </div>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="stats-section">
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon total">
            <ClipboardDocumentListIcon class="icon-md" />
          </div>
          <div class="stat-content">
            <div class="stat-number">{{ stats.totalInspections }}</div>
            <div class="stat-label">Total Inspections</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon pending">
            <ClockIcon class="icon-md" />
          </div>
          <div class="stat-content">
            <div class="stat-number">{{ stats.pendingInspections }}</div>
            <div class="stat-label">Pending</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon completed">
            <CheckCircleIcon class="icon-md" />
          </div>
          <div class="stat-content">
            <div class="stat-number">{{ stats.completedInspections }}</div>
            <div class="stat-label">Completed</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon templates">
            <DocumentTextIcon class="icon-md" />
          </div>
          <div class="stat-content">
            <div class="stat-number">{{ stats.availableTemplates }}</div>
            <div class="stat-label">Templates</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="dashboard-content">
      <!-- Recent Inspections -->
      <div class="content-section">
        <div class="section-header">
          <h2 class="section-title" :class="themeClasses.text.primary">Recent Inspections</h2>
          <router-link to="/inspections" class="section-link">
            View All
            <ArrowRightIcon class="icon-sm" />
          </router-link>
        </div>

        <div class="inspections-list" v-if="recentInspections.length > 0">
          <div
            v-for="inspection in recentInspections"
            :key="inspection.id"
            class="inspection-card"
          >
            <div class="inspection-content">
              <div class="inspection-header">
                <div class="inspection-info">
                  <h3 class="inspection-title" :class="themeClasses.text.primary">{{ inspection.title }}</h3>
                  <p class="inspection-location" :class="themeClasses.text.secondary">{{ inspection.location }}</p>
                </div>
                <div class="inspection-status" :class="inspection.status">
                  {{ inspection.status.charAt(0).toUpperCase() + inspection.status.slice(1) }}
                </div>
              </div>

              <div class="inspection-meta">
                <div class="meta-left">
                  <div class="meta-item">
                    <CalendarIcon class="icon-sm" />
                    <span>{{ formatDate(inspection.created_at) }}</span>
                  </div>
                  <div class="meta-item">
                    <UserIcon class="icon-sm" />
                    <span>{{ inspection.inspector }}</span>
                  </div>
                  <div class="meta-item">
                    <ClipboardDocumentListIcon class="icon-sm" />
                    <span>{{ inspection.template }}</span>
                  </div>
                  <div class="meta-item">
                    <TagIcon class="icon-sm" />
                    <span class="category-badge" :class="`category-${inspection.templateCategory.toLowerCase()}`">
                      {{ inspection.templateCategory }}
                    </span>
                  </div>
                </div>
                <div class="inspection-actions">
                  <router-link
                    v-if="inspection.status === 'draft'"
                    :to="`/inspections/${inspection.id}/edit`"
                    class="btn btn-sm btn-primary"
                  >
                    <ArrowRightIcon class="icon-sm" />
                    Continue edit
                  </router-link>
                  <router-link
                    v-else
                    :to="`/inspections/${inspection.id}`"
                    class="btn btn-sm btn-secondary"
                  >
                    <EyeIcon class="icon-sm" />
                    View details
                  </router-link>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="empty-state">
          <ClipboardDocumentListIcon class="icon-xl text-muted-foreground" />
          <h3 class="empty-title" :class="themeClasses.text.primary">No inspections yet</h3>
          <p class="empty-description" :class="themeClasses.text.secondary">
            Get started by creating your first inspection
          </p>
          <router-link to="/inspections/new" class="btn btn-primary">
            Create Inspection
          </router-link>
        </div>
      </div>

      <!-- Quick Links -->
      <div class="content-section">
        <div class="section-header">
          <h2 class="section-title" :class="themeClasses.text.primary">Quick Links</h2>
        </div>

        <div class="quick-links-grid">
          <router-link to="/templates" class="quick-link-card">
            <div class="quick-link-icon">
              <DocumentTextIcon class="icon-lg" />
            </div>
            <div class="quick-link-content">
              <h3 class="quick-link-title" :class="themeClasses.text.primary">Templates</h3>
              <p class="quick-link-description" :class="themeClasses.text.secondary">Manage inspection templates</p>
            </div>
            <ArrowRightIcon class="icon-lg text-muted-foreground" />
          </router-link>

          <router-link to="/profile" class="quick-link-card">
            <div class="quick-link-icon">
              <UserCircleIcon class="icon-lg" />
            </div>
            <div class="quick-link-content">
              <h3 class="quick-link-title" :class="themeClasses.text.primary">Profile</h3>
              <p class="quick-link-description" :class="themeClasses.text.secondary">Update your settings</p>
            </div>
            <ArrowRightIcon class="icon-lg text-muted-foreground" />
          </router-link>

          <router-link to="/analytics" class="quick-link-card">
            <div class="quick-link-icon">
              <ChartBarIcon class="icon-lg" />
            </div>
            <div class="quick-link-content">
              <h3 class="quick-link-title" :class="themeClasses.text.primary">Analytics</h3>
              <p class="quick-link-description" :class="themeClasses.text.secondary">View detailed reports and insights</p>
            </div>
            <ArrowRightIcon class="icon-lg text-muted-foreground" />
          </router-link>

          <a href="#" class="quick-link-card" @click.prevent="exportData">
            <div class="quick-link-icon">
              <ArrowDownTrayIcon class="icon-lg" />
            </div>
            <div class="quick-link-content">
              <h3 class="quick-link-title" :class="themeClasses.text.primary">Export Data</h3>
              <p class="quick-link-description" :class="themeClasses.text.secondary">Download your inspection data</p>
            </div>
            <ArrowRightIcon class="icon-lg text-muted-foreground" />
          </a>

          <a href="#" class="quick-link-card" @click.prevent="viewHelp">
            <div class="quick-link-icon">
              <QuestionMarkCircleIcon class="icon-lg" />
            </div>
            <div class="quick-link-content">
              <h3 class="quick-link-title" :class="themeClasses.text.primary">Help</h3>
              <p class="quick-link-description" :class="themeClasses.text.secondary">Get support and tutorials</p>
            </div>
            <ArrowRightIcon class="icon-lg text-muted-foreground" />
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import { useTheme } from '@/composables/useTheme'
import { apiUtils } from '@/utils/api'

// Icons
import {
  PlusIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  ArrowRightIcon,
  CalendarIcon,
  UserIcon,
  UserCircleIcon,
  ArrowDownTrayIcon,
  QuestionMarkCircleIcon,
  EyeIcon,
  TagIcon,
  ChartBarIcon
} from '@heroicons/vue/24/outline'

const authStore = useAuthStore()
const appStore = useAppStore()
const { themeClasses } = useTheme()

// Computed
const user = computed(() => authStore.user)

// State
const isLoading = ref(false)
const error = ref(null)
const stats = ref({
  totalInspections: 0,
  pendingInspections: 0,
  completedInspections: 0,
  availableTemplates: 0
})

const recentInspections = ref([])

// Methods
const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

const exportData = () => {
  appStore.showInfoMessage('Export feature coming soon!')
}

const viewHelp = () => {
  appStore.showInfoMessage('Help documentation coming soon!')
}

// API Functions
const fetchDashboardStats = async () => {
  try {
    isLoading.value = true
    error.value = null

    // Fetch inspection stats
    const statsResponse = await apiUtils.get('/inspections/stats')

    // Fetch templates count
    const templatesResponse = await apiUtils.get('/templates')

    stats.value = {
      totalInspections: statsResponse.total || 0,
      pendingInspections: (statsResponse.in_progress || 0) + (statsResponse.draft || 0),
      completedInspections: statsResponse.completed || 0,
      availableTemplates: templatesResponse.templates?.length || 0
    }
  } catch (err) {
    console.error('Failed to fetch dashboard stats:', err)
    error.value = 'Failed to load dashboard statistics'
  } finally {
    isLoading.value = false
  }
}

const fetchRecentInspections = async () => {
  try {
    const response = await apiUtils.get('/inspections?limit=5')

    // Transform API response to match frontend structure
    recentInspections.value = response.inspections.map(inspection => ({
      id: inspection.id,
      title: `${inspection.template?.name || 'Untitled'} - ${inspection.site?.name || inspection.site?.address || 'Unknown Site'}`,
      location: inspection.site?.address || 'Unknown Location',
      status: inspection.status,
      created_at: inspection.created_at,
      inspector: inspection.inspector?.name || 'Unknown',
      template: inspection.template?.name || 'Unknown Template',
      templateCategory: inspection.template?.category || 'Unknown'
    }))
  } catch (err) {
    console.error('Failed to fetch recent inspections:', err)
    // Don't set error here, as this is secondary data
  }
}

const duplicateInspection = (id: string) => {
  appStore.showInfoMessage(`Duplicating inspection ${id}...`)
}

// Initialize
onMounted(() => {
  fetchDashboardStats()
  fetchRecentInspections()
})
</script>

<style scoped>
.dashboard-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1.5rem;
}

.dashboard-header {
  margin-bottom: 2rem;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 2rem;
}

.welcome-section {
  flex: 1;
}

.dashboard-title {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.dashboard-subtitle {
  font-size: 1rem;
}

.stats-section {
  margin-bottom: 3rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.stat-card {
  background: hsl(var(--background));
  border-radius: 0.75rem;
  padding: 1.5rem;
  box-shadow: var(--shadow-sm);
  border: 1px solid hsl(var(--border));
  display: flex;
  align-items: center;
  gap: 1rem;
}

.stat-icon {
  width: 3rem;
  height: 3rem;
  border-radius: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  padding: 0.6rem;
  position: relative;
  box-shadow: var(--shadow-sm);
}

.stat-icon.total {
  background: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.7));
  border: 1px solid hsl(var(--primary) / 0.2);
}

.stat-icon.pending {
  background: linear-gradient(135deg, hsl(var(--warning)), hsl(var(--warning) / 0.7));
  border: 1px solid hsl(var(--warning) / 0.2);
}

.stat-icon.completed {
  background: linear-gradient(135deg, hsl(var(--success)), hsl(var(--success) / 0.7));
  border: 1px solid hsl(var(--success) / 0.2);
}

.stat-icon.templates {
  background: linear-gradient(135deg, hsl(var(--info)), hsl(var(--info) / 0.7));
  border: 1px solid hsl(var(--info) / 0.2);
}

.stat-content {
  flex: 1;
}

.stat-number {
  font-size: 2rem;
  font-weight: 700;
  line-height: 1;
}

.stat-label {
  font-size: 0.875rem;
  font-weight: 500;
  margin-top: 0.25rem;
}

.dashboard-content {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 2rem;
}

.content-section {
  background: hsl(var(--background));
  border-radius: 0.75rem;
  box-shadow: var(--shadow-sm);
  border: 1px solid hsl(var(--border));
  overflow: hidden;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 1.5rem 1rem;
  border-bottom: 1px solid hsl(var(--border));
}

.section-title {
  font-size: 1.25rem;
  font-weight: 600;
}

.section-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: hsl(var(--primary));
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 500;
}

.section-link:hover {
  color: hsl(var(--primary) / 0.8);
}

.inspections-list {
  display: flex;
  flex-direction: column;
}

.inspection-card {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid hsl(var(--border));
}

.inspection-card:last-child {
  border-bottom: none;
}

.inspection-content {
  width: 100%;
}

.inspection-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.inspection-info {
  flex: 1;
  min-width: 0;
}

.inspection-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 0.125rem;
}

.inspection-location {
  font-size: 0.875rem;
}

.inspection-status {
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: capitalize;
  flex-shrink: 0;
}

.inspection-status.completed {
  background: hsl(var(--success) / 0.1);
  color: hsl(var(--success));
}

.inspection-status.pending {
  background: hsl(var(--warning) / 0.1);
  color: hsl(var(--warning));
}

.inspection-status.draft {
  background: hsl(var(--muted));
  color: hsl(var(--muted-foreground));
}

.inspection-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.meta-left {
  display: flex;
  gap: 1.5rem;
  align-items: center;
  flex-wrap: wrap;
  min-width: 0;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  flex-shrink: 0;
  white-space: nowrap;
}

.meta-item span {
  display: inline-block;
  min-width: 0;
}

.inspection-actions {
  flex-shrink: 0;
}

.category-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.625rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.category-safety {
  background-color: hsl(var(--destructive) / 0.1);
  color: hsl(var(--destructive));
}

.category-electrical {
  background-color: hsl(var(--warning) / 0.1);
  color: hsl(var(--warning));
}

.category-plumbing {
  background-color: hsl(var(--primary) / 0.1);
  color: hsl(var(--primary));
}

.category-structural {
  background-color: hsl(var(--accent) / 0.1);
  color: hsl(var(--accent));
}

.category-environmental {
  background-color: hsl(var(--success) / 0.1);
  color: hsl(var(--success));
}

.empty-state {
  padding: 3rem 1.5rem;
  text-align: center;
}

.empty-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 1rem 0 0.5rem;
}

.empty-description {
  margin-bottom: 1.5rem;
}

.quick-links-grid {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.quick-link-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border-radius: 0.5rem;
  text-decoration: none;
  color: inherit;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.quick-link-card:hover {
  background: hsl(var(--muted) / 0.5);
  border-color: hsl(var(--border));
}

.quick-link-icon {
}

.quick-link-content {
  flex: 1;
}

.quick-link-title {
  font-size: 0.875rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.quick-link-description {
  font-size: 0.75rem;
}

@media (max-width: 1024px) {
  .dashboard-content {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .dashboard-page {
    padding: 1rem;
  }

  .header-content {
    flex-direction: column;
    align-items: flex-start;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }

  .stat-card {
    padding: 1rem;
  }

  .stat-number {
    font-size: 1.5rem;
  }
}

/* Icon Size Control */
svg {
  flex-shrink: 0;
}

/* Force small arrow icons - only for section links */
.section-link svg {
  width: 8px !important;
  height: 8px !important;
  flex-shrink: 0;
}

/* Proper sizing for quick link icons */
.quick-link-icon svg {
  width: 1.5rem !important;
  height: 1.5rem !important;
  flex-shrink: 0;
}

/* Keep arrow icons in quick links smaller but visible */
.quick-link-card .icon-lg {
  width: 1.25rem !important;
  height: 1.25rem !important;
  flex-shrink: 0;
}

/* Ensure consistent text wrapping */
.inspection-title {
  word-break: break-word;
  hyphens: auto;
}

.meta-item span {
  font-size: 0.75rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  line-height: 1.2;
}

@media (max-width: 640px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .dashboard-title {
    font-size: 1.5rem;
  }

  .inspection-header {
    flex-direction: column;
    gap: 0.75rem;
    align-items: flex-start;
  }

  .inspection-meta {
    flex-direction: column;
    gap: 0.75rem;
    align-items: flex-start;
  }

  .meta-left {
    flex-direction: column;
    gap: 0.5rem;
    align-items: flex-start;
  }

  .inspection-actions {
    align-self: flex-start;
  }

  .meta-item span {
    white-space: normal;
  }
}
</style>