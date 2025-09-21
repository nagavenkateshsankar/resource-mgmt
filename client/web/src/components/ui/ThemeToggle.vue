<template>
  <div class="theme-toggle-wrapper">
    <!-- Compact Toggle Button -->
    <button
      v-if="variant === 'compact'"
      @click="toggleTheme"
      :class="[
        'theme-toggle-compact',
        themeClasses.button.ghost,
        'p-2 rounded-lg transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        'ring-offset-background'
      ]"
      :title="getToggleTooltip()"
      :aria-label="getToggleAriaLabel()"
      data-testid="theme-toggle-compact"
    >
      <!-- Light Mode Icon -->
      <SunIcon
        v-if="resolvedTheme === 'light'"
        class="w-5 h-5 text-warning transition-transform duration-200 hover:rotate-12"
        data-testid="light-mode-icon"
      />
      <!-- Dark Mode Icon -->
      <MoonIcon
        v-else
        class="w-5 h-5 text-primary transition-transform duration-200 hover:-rotate-12"
        data-testid="dark-mode-icon"
      />
    </button>

    <!-- Dropdown Toggle -->
    <div v-else-if="variant === 'dropdown'" class="theme-toggle-dropdown relative">
      <button
        @click="toggleDropdown"
        :class="[
          'theme-toggle-trigger',
          themeClasses.button.ghost,
          'flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          'ring-offset-background',
          { 'bg-opacity-10': showDropdown }
        ]"
        :aria-expanded="showDropdown"
        :aria-haspopup="true"
        data-testid="theme-toggle-dropdown"
      >
        <component
          :is="getCurrentIcon()"
          class="w-4 h-4"
          :class="getCurrentIconColor()"
        />
        <span v-if="showLabel" class="text-sm font-medium">
          {{ getCurrentThemeLabel() }}
        </span>
        <ChevronDownIcon
          class="w-4 h-4 transition-transform duration-200"
          :class="{ 'rotate-180': showDropdown }"
        />
      </button>

      <!-- Dropdown Menu -->
      <transition
        enter-active-class="transition ease-out duration-100"
        enter-from-class="transform opacity-0 scale-95"
        enter-to-class="transform opacity-100 scale-100"
        leave-active-class="transition ease-in duration-75"
        leave-from-class="transform opacity-100 scale-100"
        leave-to-class="transform opacity-0 scale-95"
      >
        <div
          v-if="showDropdown"
          :class="[
            'theme-dropdown-menu absolute right-0 mt-2 py-1 rounded-lg shadow-lg ring-1 ring-border z-50',
            themeClasses.card.base,
            'min-w-[140px]'
          ]"
          data-testid="theme-dropdown-menu"
        >
          <button
            v-for="option in themeOptions"
            :key="option.value"
            @click="selectTheme(option.value)"
            :class="[
              'theme-option w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors duration-150',
              theme === option.value
                ? themeClasses.nav.active
                : themeClasses.nav.item,
              'hover:bg-opacity-80'
            ]"
            :data-testid="`theme-option-${option.value}`"
            :aria-pressed="theme === option.value"
          >
            <component
              :is="option.icon"
              class="w-4 h-4"
              :class="option.iconColor"
            />
            <span>{{ option.label }}</span>
            <CheckIcon
              v-if="theme === option.value"
              class="w-4 h-4 ml-auto text-primary"
              data-testid="selected-theme-check"
            />
          </button>
        </div>
      </transition>
    </div>

    <!-- Switch Toggle -->
    <div v-else-if="variant === 'switch'" class="theme-toggle-switch">
      <label class="flex items-center gap-3 cursor-pointer" data-testid="theme-toggle-switch">
        <span v-if="showLabel" :class="themeClasses.text.secondary" class="text-sm font-medium">
          Theme
        </span>
        <div class="relative">
          <input
            type="checkbox"
            :checked="isDark"
            @change="toggleLightDark"
            class="sr-only"
            :aria-label="getSwitchAriaLabel()"
          />
          <div
            :class="[
              'theme-switch-track w-11 h-6 rounded-full transition-colors duration-200 ease-in-out',
              'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
              isDark
                ? 'bg-primary'
                : 'bg-muted',
              'ring-offset-background'
            ]"
          >
            <div
              :class="[
                'theme-switch-thumb absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-transform duration-200 ease-in-out',
                'flex items-center justify-center',
                isDark
                  ? 'translate-x-5 bg-background'
                  : 'translate-x-0 bg-background'
              ]"
            >
              <SunIcon
                v-if="!isDark"
                class="w-3 h-3 text-warning"
              />
              <MoonIcon
                v-else
                class="w-3 h-3 text-primary"
              />
            </div>
          </div>
        </div>
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useTheme } from '@/composables/useTheme'
import type { Theme } from '@/stores/theme'

// Icons
import {
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
  ChevronDownIcon,
  CheckIcon
} from '@heroicons/vue/24/outline'

// Props
interface Props {
  variant?: 'compact' | 'dropdown' | 'switch'
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'compact',
  showLabel: false,
  size: 'md'
})

// Composables
const {
  theme,
  resolvedTheme,
  isDark,
  isLight,
  setTheme,
  toggleTheme,
  themeClasses,
  withThemeTransition
} = useTheme()

// Local state
const showDropdown = ref(false)

// Theme options for dropdown
const themeOptions = computed(() => [
  {
    value: 'light' as Theme,
    label: 'Light',
    icon: SunIcon,
    iconColor: 'text-warning'
  },
  {
    value: 'dark' as Theme,
    label: 'Dark',
    icon: MoonIcon,
    iconColor: 'text-primary'
  },
  {
    value: 'system' as Theme,
    label: 'System',
    icon: ComputerDesktopIcon,
    iconColor: 'text-muted-foreground'
  }
])

// Methods
const toggleDropdown = () => {
  showDropdown.value = !showDropdown.value
}

const selectTheme = (selectedTheme: Theme) => {
  withThemeTransition(() => {
    setTheme(selectedTheme)
  })
  showDropdown.value = false
}

const toggleLightDark = () => {
  withThemeTransition(() => {
    if (isDark.value) {
      setTheme('light')
    } else {
      setTheme('dark')
    }
  })
}

const getCurrentIcon = () => {
  const option = themeOptions.value.find(opt => opt.value === theme.value)
  return option?.icon || SunIcon
}

const getCurrentIconColor = () => {
  const option = themeOptions.value.find(opt => opt.value === theme.value)
  return option?.iconColor || 'text-muted-foreground'
}

const getCurrentThemeLabel = () => {
  const option = themeOptions.value.find(opt => opt.value === theme.value)
  return option?.label || 'Theme'
}

// Accessibility helpers
const getToggleTooltip = () => {
  if (theme.value === 'system') {
    return `Switch to light mode (currently following system: ${resolvedTheme.value})`
  }
  return `Switch to ${isDark.value ? 'light' : 'dark'} mode`
}

const getToggleAriaLabel = () => {
  return `Toggle theme. Current theme: ${theme.value === 'system' ? `system (${resolvedTheme.value})` : theme.value}`
}

const getSwitchAriaLabel = () => {
  return `Toggle between light and dark mode. Currently ${resolvedTheme.value} mode`
}

// Click outside handler for dropdown
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as Element
  if (showDropdown.value && !target.closest('.theme-toggle-dropdown')) {
    showDropdown.value = false
  }
}

// Keyboard navigation for dropdown
const handleKeydown = (event: KeyboardEvent) => {
  if (props.variant === 'dropdown' && showDropdown.value) {
    switch (event.key) {
      case 'Escape':
        showDropdown.value = false
        break
      case 'ArrowDown':
        event.preventDefault()
        // Focus next option
        break
      case 'ArrowUp':
        event.preventDefault()
        // Focus previous option
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        // Select focused option
        break
    }
  }
}

// Lifecycle
onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleKeydown)
})

// Emit events for parent components
const emit = defineEmits<{
  themeChange: [theme: Theme, resolvedTheme: string]
}>()

// Watch theme changes and emit events
const unwatchTheme = computed(() => theme.value)
const unwatchResolvedTheme = computed(() => resolvedTheme.value)

// Emit theme change events
const emitThemeChange = () => {
  emit('themeChange', theme.value, resolvedTheme.value)
}

// Watch for changes
import { watch } from 'vue'
watch([unwatchTheme, unwatchResolvedTheme], emitThemeChange)
</script>

<style scoped>
.theme-toggle-wrapper {
  display: inline-block !important;
}

.theme-toggle-compact {
  position: relative;
}

.theme-toggle-compact::before {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: inherit;
  padding: 2px;
  background: linear-gradient(45deg, transparent, hsl(var(--primary) / 0.1), transparent);
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask-composite: exclude;
  opacity: 0;
  transition: opacity 0.2s;
}

.theme-toggle-compact:hover::before {
  opacity: 1;
}

.theme-switch-track {
  position: relative;
}

.theme-switch-track:focus-within {
  outline: none;
}

.theme-switch-thumb {
  box-shadow: var(--shadow-sm);
}

/* Animation classes for icons */
.theme-toggle-compact:hover .w-5 {
  transform: scale(1.1) !important;
}

/* Smooth transitions */
* {
  transition-property: background-color, border-color, color, fill, stroke, opacity, box-shadow, transform;
}

/* Dark mode specific adjustments */
.dark .theme-dropdown-menu {
  background-color: hsl(var(--popover)) !important;
  border-color: hsl(var(--border)) !important;
}

.dark .theme-switch-track {
  box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.06) !important;
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .theme-toggle-compact,
  .theme-toggle-trigger,
  .theme-switch-track {
    border: 2px solid currentColor !important;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  * {
    transition-duration: 0.01ms !important;
  }
}
</style>