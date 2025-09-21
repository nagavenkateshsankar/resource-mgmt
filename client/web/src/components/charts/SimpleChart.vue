<template>
  <div class="chart-container">
    <div v-if="loading" class="chart-loading">
      <LoadingSpinner />
      <span>Loading chart data...</span>
    </div>

    <div v-else-if="error" class="chart-error">
      <AlertTriangleIcon class="w-5 h-5 text-destructive" />
      <span>{{ error }}</span>
    </div>

    <div v-else class="chart-content">
      <!-- Bar Chart -->
      <div v-if="type === 'bar'" class="bar-chart">
        <div class="chart-title" v-if="title">{{ title }}</div>
        <div class="bar-chart-container">
          <div
            v-for="(item, index) in chartData"
            :key="index"
            class="bar-item"
          >
            <div
              class="bar"
              :style="{
                height: `${(item.value / maxValue) * 100}%`,
                backgroundColor: item.color || 'hsl(var(--primary))'
              }"
            ></div>
            <div class="bar-label">{{ item.label }}</div>
            <div class="bar-value">{{ item.value }}</div>
          </div>
        </div>
      </div>

      <!-- Pie Chart (Simple CSS version) -->
      <div v-else-if="type === 'pie'" class="pie-chart">
        <div class="chart-title" v-if="title">{{ title }}</div>
        <div class="pie-chart-container">
          <div class="pie-visual">
            <div
              v-for="(item, index) in chartData"
              :key="index"
              class="pie-slice"
              :style="getPieSliceStyle(item, index)"
            ></div>
          </div>
          <div class="pie-legend">
            <div
              v-for="(item, index) in chartData"
              :key="index"
              class="legend-item"
            >
              <div
                class="legend-color"
                :style="{ backgroundColor: item.color || 'hsl(var(--primary))' }"
              ></div>
              <span class="legend-label">{{ item.label }}: {{ item.value }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Line Chart (Simple CSS version) -->
      <div v-else-if="type === 'line'" class="line-chart">
        <div class="chart-title" v-if="title">{{ title }}</div>
        <div class="line-chart-container">
          <svg :width="chartWidth" :height="chartHeight" class="line-svg">
            <!-- Grid lines -->
            <g class="grid">
              <line
                v-for="i in gridLines"
                :key="`h-${i}`"
                :x1="0"
                :y1="(chartHeight / gridLines) * i"
                :x2="chartWidth"
                :y2="(chartHeight / gridLines) * i"
                :stroke="getComputedStyle(document.documentElement).getPropertyValue('--muted-foreground')"
                stroke-width="1"
                opacity="0.3"
              />
              <line
                v-for="i in chartData.length"
                :key="`v-${i}`"
                :x1="(chartWidth / (chartData.length - 1)) * (i - 1)"
                :y1="0"
                :x2="(chartWidth / (chartData.length - 1)) * (i - 1)"
                :y2="chartHeight"
                :stroke="getComputedStyle(document.documentElement).getPropertyValue('--muted-foreground')"
                stroke-width="1"
                opacity="0.3"
              />
            </g>

            <!-- Line path -->
            <path
              :d="linePath"
              fill="none"
              :stroke="lineColor || 'hsl(var(--primary))'"
              stroke-width="2"
            />

            <!-- Data points -->
            <circle
              v-for="(point, index) in linePoints"
              :key="index"
              :cx="point.x"
              :cy="point.y"
              r="4"
              :fill="lineColor || 'hsl(var(--primary))'"
            />
          </svg>

          <!-- X-axis labels -->
          <div class="x-axis-labels">
            <span
              v-for="(item, index) in chartData"
              :key="index"
              class="x-label"
              :style="{ left: `${(100 / (chartData.length - 1)) * index}%` }"
            >
              {{ item.label }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { AlertTriangleIcon } from '@heroicons/vue/24/outline'
import LoadingSpinner from '../ui/LoadingSpinner.vue'

interface ChartData {
  label: string
  value: number
  color?: string
}

interface Props {
  type: 'bar' | 'pie' | 'line'
  data: ChartData[]
  title?: string
  loading?: boolean
  error?: string
  lineColor?: string
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  error: '',
  lineColor: 'hsl(var(--primary))'
})

// Chart dimensions for SVG
const chartWidth = ref(400)
const chartHeight = ref(200)
const gridLines = ref(5)

const chartData = computed(() => props.data || [])

const maxValue = computed(() => {
  if (chartData.value.length === 0) return 1
  return Math.max(...chartData.value.map(item => item.value))
})

const totalValue = computed(() => {
  return chartData.value.reduce((sum, item) => sum + item.value, 0)
})

// Pie chart calculations
const getPieSliceStyle = (item: ChartData, index: number) => {
  if (totalValue.value === 0) return {}

  const percentage = (item.value / totalValue.value) * 100
  const previousPercentage = chartData.value
    .slice(0, index)
    .reduce((sum, prevItem) => sum + (prevItem.value / totalValue.value) * 100, 0)

  return {
    background: `conic-gradient(
      ${item.color || 'hsl(var(--primary))'} 0deg ${percentage * 3.6}deg,
      transparent ${percentage * 3.6}deg 360deg
    )`,
    transform: `rotate(${previousPercentage * 3.6}deg)`
  }
}

// Line chart calculations
const linePoints = computed(() => {
  if (chartData.value.length === 0) return []

  return chartData.value.map((item, index) => ({
    x: (chartWidth.value / (chartData.value.length - 1)) * index,
    y: chartHeight.value - ((item.value / maxValue.value) * chartHeight.value)
  }))
})

const linePath = computed(() => {
  if (linePoints.value.length === 0) return ''

  const pathData = linePoints.value
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ')

  return pathData
})
</script>

<style scoped>
.chart-container {
  width: 100%;
  min-height: 200px;
  background: hsl(var(--background));
  border-radius: var(--border-radius-lg);
  padding: 1rem;
  box-shadow: var(--shadow-sm);
  border: 1px solid hsl(var(--border));
}

.chart-loading,
.chart-error {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 200px;
  color: hsl(var(--muted-foreground));
}

.chart-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: hsl(var(--foreground));
  margin-bottom: 1rem;
  text-align: center;
}

/* Bar Chart Styles */
.bar-chart-container {
  display: flex;
  align-items: end;
  gap: 1rem;
  height: 200px;
  padding: 1rem 0;
}

.bar-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
}

.bar {
  width: 100%;
  max-width: 40px;
  min-height: 4px;
  border-radius: 4px 4px 0 0;
  margin-bottom: 0.5rem;
  transition: all 0.3s ease;
}

.bar:hover {
  opacity: 0.8;
  transform: translateY(-2px);
}

.bar-label {
  font-size: 0.75rem;
  color: hsl(var(--muted-foreground));
  text-align: center;
  margin-top: auto;
  margin-bottom: 0.25rem;
}

.bar-value {
  font-size: 0.875rem;
  font-weight: 600;
  color: hsl(var(--foreground));
}

/* Pie Chart Styles */
.pie-chart-container {
  display: flex;
  align-items: center;
  gap: 2rem;
  justify-content: center;
}

.pie-visual {
  position: relative;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: conic-gradient(hsl(var(--muted)) 0deg 360deg);
}

.pie-slice {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  clip-path: polygon(50% 50%, 50% 0%, 100% 0%, 100% 100%, 50% 100%);
}

.pie-legend {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.legend-color {
  width: 12px;
  height: 12px;
  border-radius: 2px;
}

.legend-label {
  font-size: 0.875rem;
  color: hsl(var(--foreground));
}

/* Line Chart Styles */
.line-chart-container {
  position: relative;
}

.line-svg {
  width: 100%;
  height: 200px;
  margin-bottom: 1rem;
}

.grid line {
  opacity: 0.5;
}

.x-axis-labels {
  position: relative;
  display: flex;
  justify-content: space-between;
  margin-top: 0.5rem;
}

.x-label {
  position: absolute;
  transform: translateX(-50%);
  font-size: 0.75rem;
  color: hsl(var(--muted-foreground));
}

@media (max-width: 640px) {
  .chart-container {
    padding: 0.75rem;
  }

  .pie-chart-container {
    flex-direction: column;
    gap: 1rem;
  }

  .bar-chart-container {
    gap: 0.5rem;
  }
}
</style>