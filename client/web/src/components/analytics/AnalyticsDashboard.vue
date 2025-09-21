<template>
  <div class="analytics-dashboard">
    <!-- Dashboard Header -->
    <div class="dashboard-header">
      <div class="header-content">
        <h1 class="dashboard-title">Analytics Dashboard</h1>
        <p class="dashboard-subtitle">Comprehensive inspection metrics and insights</p>
      </div>

      <div class="header-actions">
        <div class="filter-section">
          <select v-model="selectedTimeRange" @change="applyFilters" class="filter-select">
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>

          <button @click="showExportModal = true" class="btn btn-secondary">
            <DocumentArrowDownIcon class="w-4 h-4" />
            Export Report
          </button>

          <button @click="refreshData" class="btn btn-primary" :disabled="loading">
            <ArrowPathIcon class="w-4 h-4" :class="{ 'animate-spin': loading }" />
            Refresh
          </button>
        </div>
      </div>
    </div>

    <!-- Error State -->
    <div v-if="error" class="error-container">
      <AlertTriangleIcon class="w-8 h-8 text-destructive" />
      <h3>Failed to load analytics data</h3>
      <p>{{ error }}</p>
      <button @click="refreshData" class="btn btn-primary">Try Again</button>
    </div>

    <!-- Dashboard Content -->
    <div v-else class="dashboard-content">
      <!-- Key Metrics Overview -->
      <div class="metrics-overview">
        <div class="metric-card">
          <div class="metric-icon total">
            <ClipboardDocumentListIcon class="w-6 h-6" />
          </div>
          <div class="metric-content">
            <div class="metric-value">{{ dashboardData?.inspection_stats?.total || 0 }}</div>
            <div class="metric-label">Total Inspections</div>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-icon completed">
            <CheckCircleIcon class="w-6 h-6" />
          </div>
          <div class="metric-content">
            <div class="metric-value">{{ dashboardData?.inspection_stats?.completed || 0 }}</div>
            <div class="metric-label">Completed</div>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-icon in-progress">
            <ClockIcon class="w-6 h-6" />
          </div>
          <div class="metric-content">
            <div class="metric-value">{{ dashboardData?.inspection_stats?.in_progress || 0 }}</div>
            <div class="metric-label">In Progress</div>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-icon overdue">
            <ExclamationTriangleIcon class="w-6 h-6" />
          </div>
          <div class="metric-content">
            <div class="metric-value">{{ dashboardData?.inspection_stats?.overdue || 0 }}</div>
            <div class="metric-label">Overdue</div>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-icon due-today">
            <CalendarDaysIcon class="w-6 h-6" />
          </div>
          <div class="metric-content">
            <div class="metric-value">{{ dashboardData?.inspection_stats?.due_today || 0 }}</div>
            <div class="metric-label">Due Today</div>
          </div>
        </div>
      </div>

      <!-- Charts Section -->
      <div class="charts-section">
        <div class="chart-row">
          <!-- Status Distribution -->
          <div class="chart-container">
            <SimpleChart
              type="pie"
              title="Status Distribution"
              :data="statusChartData"
              :loading="loading"
            />
          </div>

          <!-- Priority Distribution -->
          <div class="chart-container">
            <SimpleChart
              type="pie"
              title="Priority Distribution"
              :data="priorityChartData"
              :loading="loading"
            />
          </div>
        </div>

        <!-- Trend Analysis -->
        <div class="chart-row">
          <div class="chart-container full-width">
            <SimpleChart
              type="line"
              title="Inspection Trends (Created vs Completed)"
              :data="trendChartData"
              :loading="loading"
            />
          </div>
        </div>
      </div>

      <!-- Tables Section -->
      <div class="tables-section">
        <!-- Top Performers -->
        <div class="table-container">
          <h3 class="table-title">Top Performing Inspectors</h3>
          <div v-if="loading" class="table-loading">
            <LoadingSpinner />
          </div>
          <div v-else-if="topInspectors.length === 0" class="table-empty">
            <UserGroupIcon class="w-12 h-12 text-muted-foreground" />
            <p>No inspector data available</p>
          </div>
          <div v-else class="table-content">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Inspector</th>
                  <th>Total</th>
                  <th>Completed</th>
                  <th>In Progress</th>
                  <th>Completion Rate</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="inspector in topInspectors" :key="inspector.inspector_id">
                  <td class="inspector-name">{{ inspector.inspector_name || 'Unknown' }}</td>
                  <td>{{ inspector.total }}</td>
                  <td class="text-success">{{ inspector.completed }}</td>
                  <td class="text-warning">{{ inspector.in_progress }}</td>
                  <td>
                    <div class="progress-container">
                      <div class="progress-bar">
                        <div
                          class="progress-fill"
                          :style="{ width: `${inspector.completion_rate}%` }"
                        ></div>
                      </div>
                      <span class="progress-text">{{ inspector.completion_rate.toFixed(1) }}%</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Recent Activity -->
        <div class="table-container">
          <h3 class="table-title">Recent Activity</h3>
          <div v-if="loading" class="table-loading">
            <LoadingSpinner />
          </div>
          <div v-else-if="recentActivity.length === 0" class="table-empty">
            <ClockIcon class="w-12 h-12 text-muted-foreground" />
            <p>No recent activity</p>
          </div>
          <div v-else class="table-content">
            <div class="activity-list">
              <div
                v-for="activity in recentActivity"
                :key="activity.id"
                class="activity-item"
              >
                <div class="activity-icon" :class="activity.type">
                  <CheckCircleIcon v-if="activity.type === 'completed'" class="w-5 h-5" />
                  <PlayIcon v-else-if="activity.type === 'started'" class="w-5 h-5" />
                  <UserPlusIcon v-else-if="activity.type === 'assigned'" class="w-5 h-5" />
                  <PlusIcon v-else class="w-5 h-5" />
                </div>
                <div class="activity-content">
                  <div class="activity-description">{{ activity.description }}</div>
                  <div class="activity-time">{{ formatDate(activity.created_at) }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Export Modal -->
    <ModalWrapper :show="showExportModal" @close="showExportModal = false" size="md">
      <template #header>
        <h3 class="modal-title">Export Report</h3>
      </template>

      <template #body>
        <div class="export-form">
          <div class="form-group">
            <label class="form-label">Export Format</label>
            <select v-model="exportFormat" class="form-select">
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Date Range</label>
            <div class="date-range">
              <input
                type="date"
                v-model="exportDateRange.start"
                class="form-input"
                placeholder="Start date"
              />
              <span>to</span>
              <input
                type="date"
                v-model="exportDateRange.end"
                class="form-input"
                placeholder="End date"
              />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Filters</label>
            <select v-model="exportFilters.status" class="form-select">
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="modal-actions">
          <button @click="showExportModal = false" class="btn btn-secondary">
            Cancel
          </button>
          <button @click="exportReport" class="btn btn-primary" :disabled="exporting">
            <LoadingSpinner v-if="exporting" class="w-4 h-4" />
            {{ exporting ? 'Exporting...' : 'Export' }}
          </button>
        </div>
      </template>
    </ModalWrapper>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  ClipboardDocumentListIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CalendarDaysIcon,
  DocumentArrowDownIcon,
  ArrowPathIcon,
  AlertTriangleIcon,
  UserGroupIcon,
  PlayIcon,
  UserPlusIcon,
  PlusIcon
} from '@heroicons/vue/24/outline'
import { apiUtils } from '@/utils/api'
import SimpleChart from '../charts/SimpleChart.vue'
import LoadingSpinner from '../ui/LoadingSpinner.vue'
import ModalWrapper from '../modals/ModalWrapper.vue'

// Types
interface InspectionStats {
  total: number
  draft: number
  assigned: number
  in_progress: number
  completed: number
  overdue: number
  due_today: number
  due_this_week: number
}

interface ChartDataItem {
  status?: string
  priority?: string
  count: number
  color: string
}

interface TrendDataItem {
  date: string
  created: number
  completed: number
}

interface InspectorStats {
  inspector_id: string
  inspector_name: string
  total: number
  completed: number
  in_progress: number
  completion_rate: number
}

interface RecentActivityItem {
  id: number
  type: string
  description: string
  created_at: string
  site_location: string
  inspector_id: string
}

interface DashboardData {
  inspection_stats: InspectionStats
  status_chart: ChartDataItem[]
  priority_chart: ChartDataItem[]
  trend_data: TrendDataItem[]
  recent_activity: RecentActivityItem[]
  top_inspectors: InspectorStats[]
}

// State
const loading = ref(false)
const error = ref('')
const dashboardData = ref<DashboardData | null>(null)
const selectedTimeRange = ref('30')
const showExportModal = ref(false)
const exportFormat = ref('csv')
const exporting = ref(false)

const exportDateRange = ref({
  start: '',
  end: ''
})

const exportFilters = ref({
  status: ''
})

// Computed
const statusChartData = computed(() => {
  if (!dashboardData.value?.status_chart) return []
  return dashboardData.value.status_chart.map(item => ({
    label: item.status || 'Unknown',
    value: item.count,
    color: item.color
  }))
})

const priorityChartData = computed(() => {
  if (!dashboardData.value?.priority_chart) return []
  return dashboardData.value.priority_chart.map(item => ({
    label: item.priority || 'Unknown',
    value: item.count,
    color: item.color
  }))
})

const trendChartData = computed(() => {
  if (!dashboardData.value?.trend_data) return []
  return dashboardData.value.trend_data.map(item => ({
    label: item.date,
    value: item.created + item.completed, // Combined for simplicity in line chart
    color: 'hsl(var(--primary))'
  }))
})

const topInspectors = computed(() => dashboardData.value?.top_inspectors || [])
const recentActivity = computed(() => dashboardData.value?.recent_activity || [])

// Methods
const fetchDashboardData = async () => {
  loading.value = true
  error.value = ''

  try {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(endDate.getDate() - parseInt(selectedTimeRange.value))

    const params = new URLSearchParams({
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0]
    })

    const response = await apiUtils.get(`/analytics/dashboard?${params}`)
    dashboardData.value = response.data
  } catch (err: any) {
    error.value = err.response?.data?.error || 'Failed to load dashboard data'
    console.error('Failed to fetch dashboard data:', err)
  } finally {
    loading.value = false
  }
}

const refreshData = () => {
  fetchDashboardData()
}

const applyFilters = () => {
  fetchDashboardData()
}

const exportReport = async () => {
  exporting.value = true

  try {
    const params = new URLSearchParams()

    if (exportDateRange.value.start) {
      params.append('start_date', exportDateRange.value.start)
    }
    if (exportDateRange.value.end) {
      params.append('end_date', exportDateRange.value.end)
    }
    if (exportFilters.value.status) {
      params.append('status', exportFilters.value.status)
    }

    const response = await fetch(
      `/api/v1/analytics/export/${exportFormat.value}?${params}`,
      {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      }
    )

    if (!response.ok) {
      throw new Error('Export failed')
    }

    // Download the file
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `inspection_report.${exportFormat.value}`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)

    showExportModal.value = false
  } catch (err) {
    console.error('Export failed:', err)
    error.value = 'Failed to export report'
  } finally {
    exporting.value = false
  }
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - date.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays === 1) {
    return 'Yesterday'
  } else if (diffDays < 7) {
    return `${diffDays} days ago`
  } else {
    return date.toLocaleDateString()
  }
}

// Lifecycle
onMounted(() => {
  fetchDashboardData()
})
</script>

<style scoped>
.analytics-dashboard {
  min-height: 100vh;
  background: hsl(var(--muted));
  padding: 2rem;
}

.dashboard-header {
  background: hsl(var(--background));
  border-radius: var(--border-radius-lg);
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: var(--shadow-sm);
  border: 1px solid hsl(var(--border));
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.header-content h1 {
  font-size: 2rem;
  font-weight: 700;
  color: hsl(var(--foreground));
  margin: 0;
}

.header-content p {
  color: hsl(var(--muted-foreground));
  margin: 0.5rem 0 0;
}

.filter-section {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.filter-select {
  padding: 0.5rem 1rem;
  border: 1px solid hsl(var(--border));
  border-radius: var(--border-radius);
  background: hsl(var(--background));
  color: hsl(var(--foreground));
}

.error-container {
  background: hsl(var(--background));
  border-radius: var(--border-radius-lg);
  padding: 3rem;
  text-align: center;
  box-shadow: var(--shadow-sm);
  border: 1px solid hsl(var(--border));
}

.error-container h3 {
  margin: 1rem 0 0.5rem;
  color: hsl(var(--foreground));
}

.error-container p {
  color: hsl(var(--muted-foreground));
  margin-bottom: 1.5rem;
}

.metrics-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.metric-card {
  background: hsl(var(--background));
  border-radius: var(--border-radius-lg);
  padding: 1.5rem;
  box-shadow: var(--shadow-sm);
  border: 1px solid hsl(var(--border));
  display: flex;
  align-items: center;
  gap: 1rem;
}

.metric-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--border-radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.metric-icon.total { background: hsl(var(--primary)); }
.metric-icon.completed { background: hsl(var(--success)); }
.metric-icon.in-progress { background: hsl(var(--warning)); }
.metric-icon.overdue { background: hsl(var(--destructive)); }
.metric-icon.due-today { background: hsl(var(--info)); }

.metric-value {
  font-size: 2rem;
  font-weight: 700;
  color: hsl(var(--foreground));
  line-height: 1;
}

.metric-label {
  font-size: 0.875rem;
  color: hsl(var(--muted-foreground));
  margin-top: 0.25rem;
}

.charts-section {
  margin-bottom: 2rem;
}

.chart-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.chart-row .full-width {
  grid-column: 1 / -1;
}

.chart-container {
  background: hsl(var(--background));
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-sm);
  border: 1px solid hsl(var(--border));
}

.tables-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 1.5rem;
}

.table-container {
  background: hsl(var(--background));
  border-radius: var(--border-radius-lg);
  padding: 1.5rem;
  box-shadow: var(--shadow-sm);
  border: 1px solid hsl(var(--border));
}

.table-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: hsl(var(--foreground));
  margin: 0 0 1rem;
}

.table-loading,
.table-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: hsl(var(--muted-foreground));
  gap: 1rem;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid hsl(var(--border));
}

.data-table th {
  font-weight: 600;
  color: hsl(var(--foreground));
  background: hsl(var(--muted));
}

.inspector-name {
  font-weight: 500;
  color: hsl(var(--foreground));
}

.progress-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.progress-bar {
  flex: 1;
  height: 8px;
  background: hsl(var(--muted));
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: hsl(var(--success));
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 0.875rem;
  font-weight: 500;
  color: hsl(var(--foreground));
  min-width: 40px;
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.activity-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: var(--border-radius);
  background: hsl(var(--muted));
}

.activity-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.activity-icon.completed { background: hsl(var(--success)); }
.activity-icon.started { background: hsl(var(--warning)); }
.activity-icon.assigned { background: hsl(var(--info)); }
.activity-icon.created { background: hsl(var(--primary)); }

.activity-description {
  font-weight: 500;
  color: hsl(var(--foreground));
}

.activity-time {
  font-size: 0.75rem;
  color: hsl(var(--muted-foreground));
}

.export-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-label {
  font-weight: 500;
  color: hsl(var(--foreground));
}

.form-select,
.form-input {
  padding: 0.75rem;
  border: 1px solid hsl(var(--border));
  border-radius: var(--border-radius);
  background: hsl(var(--background));
  color: hsl(var(--foreground));
}

.date-range {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.modal-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

@media (max-width: 768px) {
  .analytics-dashboard {
    padding: 1rem;
  }

  .dashboard-header {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-section {
    flex-wrap: wrap;
  }

  .chart-row {
    grid-template-columns: 1fr;
  }

  .tables-section {
    grid-template-columns: 1fr;
  }

  .data-table {
    font-size: 0.875rem;
  }

  .date-range {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>