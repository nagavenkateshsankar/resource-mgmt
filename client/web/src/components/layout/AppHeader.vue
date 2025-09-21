<template>
  <header class="app-header">
    <div class="header-container">
      <!-- Logo and App Name -->
      <div class="header-left">
        <router-link to="/dashboard" class="logo">
          <div class="logo-icon">
            <svg viewBox="0 0 24 24" fill="currentColor" class="icon-lg">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <span class="app-name">Site Inspector</span>
        </router-link>
      </div>

      <!-- Navigation Menu (Desktop) -->
      <nav class="header-nav" v-if="!isMobile">
        <template v-for="item in navigationItems" :key="item.name">
          <!-- Dropdown menu for grouped items -->
          <div v-if="item.children" class="nav-dropdown" :class="{ active: isDropdownActive(item) }" data-dropdown>
            <button @click="toggleDropdown(item.name)" class="nav-link dropdown-trigger" :class="{ active: isDropdownActive(item) }" data-dropdown-trigger>
              <component :is="item.icon" class="nav-icon icon-sm" />
              <span>{{ item.label }}</span>
              <ChevronDownIcon v-if="openDropdown !== item.name" class="dropdown-arrow icon-sm" />
              <ChevronUpIcon v-else class="dropdown-arrow icon-sm" />
            </button>

            <!-- Dropdown content -->
            <transition name="dropdown">
              <div v-if="openDropdown === item.name" class="dropdown-content" data-dropdown-content>
                <router-link
                  v-for="child in item.children"
                  :key="child.name"
                  :to="child.path"
                  class="dropdown-item"
                  :class="{ active: route.path.startsWith(child.path) }"
                  @click="closeDropdown"
                >
                  <component :is="child.icon" class="dropdown-icon icon-sm" />
                  <span>{{ child.label }}</span>
                </router-link>
              </div>
            </transition>
          </div>

          <!-- Regular navigation link -->
          <router-link
            v-else
            :to="item.path"
            class="nav-link"
            :class="{ active: route.path.startsWith(item.path) }"
          >
            <component :is="item.icon" class="nav-icon icon-sm" />
            <span>{{ item.label }}</span>
          </router-link>
        </template>
      </nav>

      <!-- User Menu -->
      <div class="header-right">


        <!-- Notifications -->
        <button
          @click="toggleNotifications"
          class="icon-button"
          :class="{ active: showNotifications }"
        >
          <BellIcon class="nav-icon" />
          <span v-if="unreadCount > 0" class="notification-badge">{{ unreadCount }}</span>
        </button>

        <!-- User Profile Menu (Desktop only) -->
        <div v-if="!isMobile" class="user-menu" ref="userMenuRef">
          <button
            @click="toggleUserMenu"
            class="user-button"
            :class="{ active: showUserMenu }"
          >
            <div class="user-avatar">
              <img
                v-if="user?.avatar"
                :src="user.avatar"
                :alt="user.name"
                class="avatar-image"
              />
              <UserCircleIcon v-else class="icon-xl text-muted-foreground" />
            </div>
            <div class="user-info" v-if="!isMobile">
              <span class="user-name">{{ user?.name || 'User' }}</span>
              <span class="user-role">{{ user?.role || 'Inspector' }}</span>
            </div>
            <ChevronDownIcon class="icon-sm ml-2" />
          </button>

          <!-- User Dropdown Menu -->
          <div v-if="showUserMenu" class="user-dropdown">
            <router-link to="/profile" class="dropdown-item" @click="closeUserMenu">
              <UserIcon class="icon-sm" />
              <span>Profile</span>
            </router-link>
            <router-link to="/settings" class="dropdown-item" @click="closeUserMenu">
              <CogIcon class="icon-sm" />
              <span>Settings</span>
            </router-link>
            <button @click="handleLogout" class="dropdown-item logout-item">
              <ArrowRightOnRectangleIcon class="icon-sm" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- PWA Settings Modal -->
    <div v-if="showPWASettings" class="settings-modal-overlay" @click="closePWASettings">
      <div @click.stop>
        <PWASettings @close="closePWASettings" />
      </div>
    </div>

    <!-- Notifications Panel -->
    <div v-if="showNotifications" class="notifications-panel">
      <div class="notifications-header">
        <h3>Notifications</h3>
        <button @click="clearAllNotifications" class="clear-all-btn">Clear All</button>
      </div>
      <div class="notifications-list">
        <div
          v-for="notification in notifications"
          :key="notification.id"
          class="notification-item"
          :class="notification.type"
        >
          <div class="notification-content">
            <h4>{{ notification.title }}</h4>
            <p>{{ notification.message }}</p>
          </div>
          <button @click="removeNotification(notification.id)" class="remove-btn">
            <XMarkIcon class="icon-sm" />
          </button>
        </div>
        <div v-if="notifications.length === 0" class="no-notifications">
          No new notifications
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import { useTheme } from '@/composables/useTheme'
import PWASettings from '@/components/ui/PWASettings.vue'
import ThemeToggle from '@/components/ui/ThemeToggle.vue'

// Icons
import {
  BellIcon,
  UserCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  UserIcon,
  ArrowRightOnRectangleIcon,
  XMarkIcon,
  HomeIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  BuildingOfficeIcon,
  UsersIcon,
  CogIcon,
  ClipboardDocumentCheckIcon,
  WrenchScrewdriverIcon
} from '@heroicons/vue/24/outline'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const appStore = useAppStore()
const { themeClasses, isDark } = useTheme()

// Reactive state
const showUserMenu = ref(false)
const showNotifications = ref(false)
const showPWASettings = ref(false)
const userMenuRef = ref<HTMLElement>()

// Dropdown state
const openDropdown = ref<string | null>(null)

// Computed properties
const user = computed(() => authStore.user)
const isMobile = computed(() => appStore.isMobile)
const notifications = computed(() => appStore.notifications)
const unreadCount = computed(() => notifications.value.length)

// Navigation items based on user role
const navigationItems = computed(() => {
  const userRole = authStore.user?.role || 'viewer'

  // Base items available to all users
  const baseItems = [
    { name: 'dashboard', path: '/dashboard', label: 'Dashboard', icon: HomeIcon },
    { name: 'inspections', path: '/inspections', label: 'Inspections', icon: ClipboardDocumentListIcon }
  ]

  // Management items for admin and supervisor
  const managementItems = [
    {
      name: 'manage',
      label: 'Manage',
      icon: WrenchScrewdriverIcon,
      children: [
        { name: 'sites', path: '/sites', label: 'Sites', icon: BuildingOfficeIcon },
        { name: 'templates', path: '/templates', label: 'Templates', icon: DocumentTextIcon },
        { name: 'assignments', path: '/assignments', label: 'Assignments', icon: ClipboardDocumentCheckIcon }
      ]
    }
  ]

  // Add Users to management for admin
  if (userRole === 'admin') {
    managementItems[0].children.push({
      name: 'users',
      path: '/users',
      label: 'Users',
      icon: UsersIcon
    })
  }

  // Role-specific items
  if (userRole === 'admin') {
    return [
      ...baseItems,
      ...managementItems,
      // Settings in header will be moved to user dropdown
    ]
  }

  if (userRole === 'supervisor') {
    return [
      ...baseItems,
      ...managementItems
    ]
  }

  if (userRole === 'inspector') {
    // Inspector gets only limited manage items
    const inspectorManageItems = [
      {
        name: 'manage',
        label: 'Manage',
        icon: WrenchScrewdriverIcon,
        children: [
          { name: 'templates', path: '/templates', label: 'Templates', icon: DocumentTextIcon }
        ]
      }
    ]

    return [
      ...baseItems,
      ...inspectorManageItems
    ]
  }

  // Viewer role (default) - only basic items
  const viewerManageItems = [
    {
      name: 'manage',
      label: 'Manage',
      icon: WrenchScrewdriverIcon,
      children: [
        { name: 'templates', path: '/templates', label: 'Templates', icon: DocumentTextIcon }
      ]
    }
  ]

  return [
    ...baseItems,
    ...viewerManageItems
  ]
})

// Methods
const toggleUserMenu = () => {
  showUserMenu.value = !showUserMenu.value
  if (showUserMenu.value) {
    showNotifications.value = false
  }
}


const closePWASettings = () => {
  showPWASettings.value = false
}

const toggleNotifications = () => {
  showNotifications.value = !showNotifications.value
  if (showNotifications.value) {
    showUserMenu.value = false
  }
}

const closeUserMenu = () => {
  showUserMenu.value = false
}

const closeNotifications = () => {
  showNotifications.value = false
}

const handleLogout = async () => {
  authStore.logout()
  router.push('/login')
  closeUserMenu()
}

const removeNotification = (id: string) => {
  appStore.removeNotification(id)
}

const clearAllNotifications = () => {
  appStore.clearNotifications()
  closeNotifications()
}

// Dropdown methods
const toggleDropdown = (name: string) => {
  openDropdown.value = openDropdown.value === name ? null : name
  if (openDropdown.value) {
    showUserMenu.value = false
    showNotifications.value = false
  }
}

const closeDropdown = () => {
  openDropdown.value = null
}

const isDropdownActive = (item: any) => {
  if (!item.children) return false
  return item.children.some((child: any) => route.path.startsWith(child.path))
}

// Close dropdowns when clicking outside
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as Element

  // Close user menu if clicking outside
  if (userMenuRef.value && !userMenuRef.value.contains(event.target as Node)) {
    showUserMenu.value = false
  }

  // Close notifications if clicking outside
  if (showNotifications.value && !target.closest('.notifications-panel, .icon-button')) {
    showNotifications.value = false
  }

  // Close navigation dropdown if clicking outside
  if (openDropdown.value && !target.closest('[data-dropdown]')) {
    openDropdown.value = null
  }

  // PWA settings modal has its own click outside handler
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.app-header {
  background-color: hsl(var(--background)) !important;
  border-bottom: 1px solid hsl(var(--border)) !important;
  position: sticky !important;
  top: 0 !important;
  z-index: 50 !important;
  box-shadow: var(--shadow-sm) !important;
  transition: all 0.3s ease !important;
}

.header-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.5rem;
  height: 4rem;
  width: 100%;
}

.header-left {
  display: flex;
  align-items: center;
}

.logo {
  display: flex !important;
  align-items: center !important;
  gap: 0.75rem !important;
  text-decoration: none !important;
  color: hsl(var(--foreground)) !important;
  font-weight: 600 !important;
  font-size: 1.25rem !important;
  transition: color 0.3s ease !important;
}

.logo-icon {
  color: hsl(var(--primary)) !important;
  transition: color 0.3s ease !important;
}

.header-nav {
  display: flex !important;
  align-items: center !important;
  gap: 2rem !important;
  margin-left: 3rem !important;
  margin-right: 3rem !important;
  flex: 1 !important;
  justify-content: center !important;
  max-width: none !important;
}

.nav-link {
  display: flex !important;
  align-items: center !important;
  gap: 0.75rem !important;
  padding: 0.75rem 1.5rem !important;
  border-radius: 0.5rem !important;
  text-decoration: none !important;
  color: hsl(var(--muted-foreground)) !important;
  font-weight: 500 !important;
  transition: all 0.3s ease !important;
  white-space: nowrap !important;
  min-width: fit-content !important;
  font-size: 0.875rem !important;
}

.nav-link:hover,
.nav-link.active {
  color: hsl(var(--primary)) !important;
  background-color: hsl(var(--accent)) !important;
  transform: translateY(-1px) !important;
}

.nav-icon {
  width: 1.25rem !important;
  height: 1.25rem !important;
  flex-shrink: 0 !important;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.icon-button {
  position: relative;
  padding: 0.5rem;
  border: none;
  background: none;
  border-radius: 0.5rem;
  color: hsl(var(--muted-foreground)) !important;
  cursor: pointer;
  transition: all 0.3s ease;
}

.icon-button:hover,
.icon-button.active {
  color: hsl(var(--primary)) !important;
  background-color: hsl(var(--accent)) !important;
}


.notification-badge {
  position: absolute;
  top: 0.25rem;
  right: 0.25rem;
  background: hsl(var(--destructive));
  color: hsl(var(--destructive-foreground));
  border-radius: 9999px;
  padding: 0.125rem 0.375rem;
  font-size: 0.75rem;
  font-weight: 600;
  min-width: 1.25rem;
  text-align: center;
}

.user-menu {
  position: relative;
}

.user-button {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem;
  border: none;
  background: none;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
}

.user-button:hover,
.user-button.active {
  background-color: hsl(var(--accent)) !important;
}

.user-avatar {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: hsl(var(--muted)) !important;
}

.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
}

.user-name {
  font-weight: 500;
  color: hsl(var(--foreground)) !important;
  font-size: 0.875rem;
}

.user-role {
  font-size: 0.75rem;
  color: hsl(var(--muted-foreground)) !important;
}

.user-dropdown {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  background-color: hsl(var(--popover)) !important;
  border: 1px solid hsl(var(--border)) !important;
  border-radius: 0.5rem;
  box-shadow: var(--shadow-lg) !important;
  min-width: 12rem;
  z-index: 50;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.75rem 1rem;
  border: none;
  background: none;
  text-decoration: none;
  color: hsl(var(--popover-foreground)) !important;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.dropdown-item:hover {
  background-color: hsl(var(--accent)) !important;
}


.notifications-panel {
  position: absolute;
  top: 100%;
  right: 1rem;
  background-color: hsl(var(--popover)) !important;
  border: 1px solid hsl(var(--border)) !important;
  border-radius: 0.5rem;
  box-shadow: var(--shadow-lg) !important;
  width: 24rem;
  max-height: 24rem;
  overflow: hidden;
  z-index: 50;
}

.notifications-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid hsl(var(--border));
}

.notifications-header h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: hsl(var(--foreground)) !important;
}

.clear-all-btn {
  color: hsl(var(--primary)) !important;
  background: none;
  border: none;
  font-size: 0.875rem;
  cursor: pointer;
  transition: color 0.3s ease;
}

.notifications-list {
  max-height: 20rem;
  overflow-y: auto;
}

.notification-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  border-bottom: 1px solid hsl(var(--border));
}

.notification-item:last-child {
  border-bottom: none;
}

.notification-item.success {
  border-left: 4px solid hsl(var(--success));
}

.notification-item.error {
  border-left: 4px solid hsl(var(--destructive));
}

.notification-item.warning {
  border-left: 4px solid hsl(var(--warning));
}

.notification-item.info {
  border-left: 4px solid hsl(var(--info));
}

.notification-content {
  flex: 1;
}

.notification-content h4 {
  font-size: 0.875rem;
  font-weight: 500;
  color: hsl(var(--foreground));
  margin-bottom: 0.25rem;
}

.notification-content p {
  font-size: 0.75rem;
  color: hsl(var(--muted-foreground));
}

.remove-btn {
  color: hsl(var(--muted-foreground));
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 0.25rem;
}

.remove-btn:hover {
  color: hsl(var(--muted-foreground));
  background-color: hsl(var(--muted));
}

.no-notifications {
  padding: 2rem;
  text-align: center;
  color: hsl(var(--muted-foreground));
  font-size: 0.875rem;
}

.settings-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: hsl(var(--background) / 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
  backdrop-filter: blur(4px);
}

/* Desktop Navigation Dropdown Styles */
.nav-dropdown {
  position: relative;
  display: inline-block;
}

.dropdown-trigger {
  background: none !important;
  border: none !important;
  cursor: pointer !important;
  display: flex !important;
  align-items: center !important;
  gap: 0.75rem !important;
  padding: 0.75rem 1.5rem !important;
  border-radius: 0.5rem !important;
  text-decoration: none !important;
  color: hsl(var(--muted-foreground)) !important;
  font-weight: 500 !important;
  transition: all 0.3s ease !important;
  white-space: nowrap !important;
  min-width: fit-content !important;
  font-size: 0.875rem !important;
}

.dropdown-trigger:hover,
.dropdown-trigger.active {
  color: hsl(var(--primary)) !important;
  background-color: hsl(var(--primary) / 0.1) !important;
  transform: translateY(-1px) !important;
}

.dropdown-arrow {
  width: 1rem;
  height: 1rem;
  transition: transform 0.2s;
  pointer-events: none; /* Prevent arrow from receiving click events */
}

.dropdown-content {
  position: absolute;
  top: calc(100% + 0.5rem);
  left: 0;
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  border-radius: 0.75rem;
  box-shadow: var(--shadow-lg);
  padding: 0.5rem;
  min-width: 200px;
  z-index: 100;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  text-decoration: none;
  color: hsl(var(--foreground));
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: 0.5rem;
  transition: all 0.2s;
  white-space: nowrap;
}

.dropdown-item:hover {
  background: hsl(var(--muted));
  color: hsl(var(--primary));
}

.dropdown-item.active {
  background: hsl(var(--primary) / 0.1);
  color: hsl(var(--primary));
}

.dropdown-icon {
  width: 1.25rem;
  height: 1.25rem;
  flex-shrink: 0;
}

/* Dropdown animations */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(-10px);
}

.dropdown-enter-to,
.dropdown-leave-from {
  opacity: 1;
  transform: scale(1) translateY(0);
}

/* Logout button styling */
.logout-item {
  color: hsl(0 84.2% 60.2%) !important;
}

.logout-item:hover {
  background: hsl(0 84.2% 60.2% / 0.1) !important;
  border-color: hsl(0 84.2% 60.2% / 0.2) !important;
}

.logout-item .icon-sm {
  color: hsl(0 84.2% 60.2%) !important;
}

/* Tablet breakpoint - reduce spacing but keep navigation */
@media (max-width: 1024px) {
  .header-nav {
    gap: 1rem !important;
    margin-left: 1.5rem !important;
    margin-right: 1.5rem !important;
  }

  .nav-link {
    padding: 0.5rem 1rem !important;
    font-size: 0.8rem !important;
  }

  .user-info {
    display: none; /* Hide user name/role on smaller screens */
  }
}

/* Further reduce spacing at smaller tablet sizes */
@media (max-width: 900px) {
  .header-container {
    padding: 0 1rem;
  }

  .header-nav {
    gap: 0.75rem !important;
    margin-left: 1rem !important;
    margin-right: 1rem !important;
  }

  .nav-link {
    padding: 0.5rem 0.75rem !important;
  }

  .app-name {
    font-size: 1rem !important;
  }

  .logo {
    gap: 0.5rem !important;
  }
}

/* Mobile breakpoint - hide navigation completely */
@media (max-width: 768px) {
  .header-container {
    padding: 0 0.75rem;
  }

  .header-nav {
    display: none;
  }

  .app-name {
    display: none;
  }

  .notifications-panel {
    right: 0.75rem;
    width: calc(100vw - 1.5rem);
    max-width: 20rem;
  }
}
</style>