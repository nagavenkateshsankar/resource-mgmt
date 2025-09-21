<template>
  <svg
    class="loading-spinner"
    :class="sizeClass"
    viewBox="0 0 24 24"
    fill="none"
  >
    <circle
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      stroke-width="2"
      fill="none"
      class="opacity-25"
    />
    <path
      fill="currentColor"
      class="opacity-75"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  size?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md'
})

const sizeClass = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'w-4 h-4'
    case 'lg':
      return 'w-8 h-8'
    default:
      return 'w-6 h-6'
  }
})
</script>

<style scoped>
.loading-spinner {
  animation: spin 1s linear infinite;
  flex-shrink: 0;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.w-4 {
  width: 1rem;
  height: 1rem;
}

.w-6 {
  width: 1.5rem;
  height: 1.5rem;
}

.w-8 {
  width: 2rem;
  height: 2rem;
}

.h-4 {
  height: 1rem;
}

.h-6 {
  height: 1.5rem;
}

.h-8 {
  height: 2rem;
}
</style>