<template>
  <div class="settings-page bg-background">
    <div class="settings-header">
      <h1 class="page-title text-foreground">Settings</h1>
      <p class="page-description text-muted-foreground">Manage your preferences and system information</p>
    </div>

    <div class="settings-container">
      <!-- Theme Section -->
      <div class="settings-section card border-border">
        <div class="section-header">
          <SwatchIcon class="section-icon text-muted-foreground" />
          <div class="section-title">
            <h2 class="text-foreground">Theme & Appearance</h2>
            <p class="text-muted-foreground">Customize the look and feel of your interface</p>
          </div>
        </div>

        <div class="section-content">
          <div class="setting-group">
            <label class="setting-label text-foreground">Color Theme</label>
            <p class="setting-description text-muted-foreground">Choose your preferred color scheme</p>
            <div class="theme-options">
              <button
                v-for="option in themeOptions"
                :key="option.value"
                @click="setTheme(option.value)"
                :class="[
                  'theme-option',
                  'card border-border',
                  { 'active bg-accent text-accent-foreground': theme === option.value }
                ]"
              >
                <component :is="option.icon" class="theme-icon text-muted-foreground" />
                <div class="theme-info">
                  <span class="theme-name text-foreground">{{ option.label }}</span>
                  <span class="theme-desc text-muted-foreground">{{ option.description }}</span>
                </div>
                <CheckIcon v-if="theme === option.value" class="check-icon text-primary" />
              </button>
            </div>
          </div>

          <div class="setting-group">
            <label class="setting-label text-foreground">Current Theme</label>
            <div class="current-theme-display bg-muted rounded-lg p-4">
              <div class="theme-preview">
                <div class="preview-header" :class="{ 'dark': isDark }">
                  <div class="preview-dot"></div>
                  <div class="preview-dot"></div>
                  <div class="preview-dot"></div>
                </div>
                <div class="preview-content" :class="{ 'dark': isDark }">
                  <div class="preview-text"></div>
                  <div class="preview-text short"></div>
                </div>
              </div>
              <div class="theme-status">
                <span class="current-theme text-foreground font-semibold">{{ getCurrentThemeLabel() }}</span>
                <span class="resolved-theme text-muted-foreground">{{ resolvedTheme === 'dark' ? 'Dark Mode' : 'Light Mode' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- System Information Section -->
      <div class="settings-section card border-border">
        <div class="section-header">
          <InformationCircleIcon class="section-icon text-muted-foreground" />
          <div class="section-title">
            <h2 class="text-foreground">System Information</h2>
            <p class="text-muted-foreground">View app status, storage, and performance details</p>
          </div>
        </div>

        <div class="section-content">
          <PWASettings @close="() => {}" :embedded="true" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useTheme } from '@/composables/useTheme'
import PWASettings from '@/components/ui/PWASettings.vue'

// Icons
import {
  SwatchIcon,
  InformationCircleIcon,
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
  CheckIcon
} from '@heroicons/vue/24/outline'

const {
  theme,
  resolvedTheme,
  isDark,
  setTheme,
  themeClasses
} = useTheme()

// Theme options
const themeOptions = computed(() => [
  {
    value: 'light',
    label: 'Light',
    description: 'Clean and bright interface',
    icon: SunIcon
  },
  {
    value: 'dark',
    label: 'Dark',
    description: 'Easy on the eyes in low light',
    icon: MoonIcon
  },
  {
    value: 'system',
    label: 'System',
    description: 'Follow your system preference',
    icon: ComputerDesktopIcon
  }
])

// Methods
const getCurrentThemeLabel = () => {
  const option = themeOptions.value.find(opt => opt.value === theme.value)
  return option?.label || 'Unknown'
}
</script>

<style scoped>
.settings-page {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.settings-header {
  margin-bottom: 2rem;
}

.page-title {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.page-description {
  font-size: 1rem;
  margin: 0;
}

.settings-container {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;
}

/* Desktop: Two-column layout */
@media (min-width: 1024px) {
  .settings-container {
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
    align-items: start;
  }
}

.settings-section {
  border-radius: 1rem;
  overflow: hidden;
  border-width: 1px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.5rem;
  background-color: hsl(var(--muted));
  border-bottom: 1px solid hsl(var(--border));
  margin: -1px -1px 0 -1px; /* Negative margins to extend background to card edges */
}

.section-icon {
  width: 2rem;
  height: 2rem;
  flex-shrink: 0;
}

.section-title h2 {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.section-title p {
  margin: 0;
  font-size: 0.875rem;
}

.section-content {
  padding: 1.5rem;
}

.setting-group {
  margin-bottom: 1.5rem;
}

.setting-group:last-child {
  margin-bottom: 0;
}

.setting-label {
  display: block;
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.setting-description {
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

.theme-options {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.theme-option {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border-radius: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.theme-option:hover {
  background-color: hsl(var(--accent));
}

.theme-option.active {
  background-color: hsl(var(--primary) / 0.1);
}

.theme-icon {
  width: 2rem;
  height: 2rem;
}

.theme-option.active .theme-icon {
}

.theme-info {
  flex: 1;
}

.theme-name {
  display: block;
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.theme-desc {
  display: block;
  font-size: 0.875rem;
}

.check-icon {
  width: 1.5rem;
  height: 1.5rem;
}

.current-theme-display {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 1.5rem;
  border-radius: 0.75rem;
}

.theme-preview {
  width: 120px;
  height: 80px;
  border-radius: 0.5rem;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.preview-header {
  height: 24px;
  background-color: hsl(var(--muted));
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0 0.5rem;
}

.preview-header.dark {
  background-color: hsl(var(--card));
}

.preview-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #9ca3af;
}

.preview-content {
  height: 56px;
  background-color: hsl(var(--background));
  padding: 0.5rem;
}

.preview-content.dark {
  background-color: hsl(var(--card));
}

.preview-text {
  height: 8px;
  background-color: hsl(var(--muted));
  border-radius: 2px;
  margin-bottom: 0.25rem;
}

.preview-content.dark .preview-text {
  background-color: hsl(var(--muted));
}

.preview-text.short {
  width: 60%;
}

.theme-status {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.current-theme {
  font-weight: 600;
}

.resolved-theme {
  font-size: 0.875rem;
}


/* Tablet: Single column but larger spacing */
@media (min-width: 769px) and (max-width: 1023px) {
  .settings-page {
    padding: 2rem 1.5rem;
  }

  .settings-container {
    grid-template-columns: 1fr;
    gap: 2rem;
    max-width: 800px;
    margin: 0 auto;
  }
}

/* Mobile: Compact single column */
@media (max-width: 768px) {
  .settings-page {
    padding: 1rem;
  }

  .settings-container {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }

  .section-header {
    /* padding: 1.5rem 1.5rem 1rem; */
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .section-content {
    padding: 1.5rem;
  }

  .current-theme-display {
    flex-direction: column;
    text-align: center;
    gap: 1rem;
  }

  .section-icon {
    width: 1.75rem;
    height: 1.75rem;
  }

  .section-title h2 {
    font-size: 1.25rem;
  }
}
</style>