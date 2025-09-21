<template>
  <div class="analytics-view">
    <AnalyticsDashboard />
  </div>
</template>

<script setup lang="ts">
import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard.vue'
</script>

<style scoped>
.analytics-view {
  min-height: 100vh;
  background: var(--color-gray-50);
}
</style>