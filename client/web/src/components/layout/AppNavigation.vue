<template>
  <nav class="app-navigation">
    <!-- Regular navigation items -->
    <template v-for="item in navigationItems" :key="item.name">
      <!-- Dropdown menu for grouped items -->
      <div v-if="item.children" class="nav-dropdown" :class="{ active: isDropdownActive(item) }" data-dropdown>
        <button @click="toggleDropdown(item.name)" class="nav-item dropdown-trigger" data-dropdown-trigger>
          <component :is="item.icon" class="nav-icon" />
          <span class="nav-label">{{ item.label }}</span>
        </button>

        <!-- Mobile Popup Modal (outside dropdown for full screen) -->
      </div>

      <!-- Regular navigation link -->
      <router-link
        v-else
        :to="item.path"
        class="nav-item"
        :class="{ active: isActive(item.path) }"
      >
        <component :is="item.icon" class="nav-icon" />
        <span class="nav-label">{{ item.label }}</span>
        <div v-if="item.badge && item.badge > 0" class="nav-badge">{{ item.badge }}</div>
      </router-link>
    </template>

    <!-- Mobile Popup Modal -->
    <transition name="modal">
      <div v-if="openDropdown" class="mobile-popup-overlay" @click="closeDropdown">
        <div class="mobile-popup-content" @click.stop>
          <div class="mobile-popup-header">
            <h3 class="mobile-popup-title">{{ getDropdownTitle() }}</h3>
            <button @click="closeDropdown" class="mobile-popup-close">
              <XMarkIcon class="icon-md" />
            </button>
          </div>
          <div class="mobile-popup-body">
            <template v-for="child in getDropdownItems()" :key="child.name">
              <!-- Router link items -->
              <router-link
                v-if="child.path"
                :to="child.path"
                class="mobile-popup-item"
                :class="{ active: isActive(child.path) }"
                @click="closeDropdown"
              >
                <component :is="child.icon" class="mobile-popup-icon" />
                <span>{{ child.label }}</span>
                <ChevronRightIcon class="mobile-popup-arrow" />
              </router-link>

              <!-- Button items (like logout) -->
              <button
                v-else
                @click="child.action"
                class="mobile-popup-item mobile-popup-button"
                :class="{ 'logout-item': child.name === 'logout' }"
              >
                <component :is="child.icon" class="mobile-popup-icon" />
                <span>{{ child.label }}</span>
                <ChevronRightIcon class="mobile-popup-arrow" />
              </button>
            </template>
          </div>
        </div>
      </div>
    </transition>
  </nav>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useTheme } from '@/composables/useTheme'

// Icons
import {
  HomeIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  BuildingOfficeIcon,
  UserCircleIcon,
  UsersIcon,
  ClipboardDocumentCheckIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  XMarkIcon,
  CogIcon,
  WrenchScrewdriverIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/vue/24/outline'

import {
  HomeIcon as HomeSolidIcon,
  ClipboardDocumentListIcon as ClipboardSolidIcon,
  DocumentTextIcon as DocumentSolidIcon,
  BuildingOfficeIcon as BuildingOfficeSolidIcon,
  UserCircleIcon as UserSolidIcon,
  UsersIcon as UsersSolidIcon,
  ClipboardDocumentCheckIcon as ClipboardDocumentCheckSolidIcon,
  CogIcon as CogSolidIcon,
  WrenchScrewdriverIcon as WrenchScrewdriverSolidIcon
} from '@heroicons/vue/24/solid'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const { themeClasses, isDark } = useTheme()

// Dropdown state
const openDropdown = ref<string | null>(null)

const toggleDropdown = (name: string) => {
  openDropdown.value = openDropdown.value === name ? null : name
}

const closeDropdown = () => {
  openDropdown.value = null
}

// Global click handler - assigned to window to ensure it works
const handleGlobalClick = (event: Event) => {
  if (!openDropdown.value) return

  const target = event.target as Element

  // Check if click is inside any navigation dropdown using data attribute
  const clickedInDropdown = target.closest('[data-dropdown]')

  // If click is outside all dropdowns, close the open dropdown
  if (!clickedInDropdown) {
    closeDropdown()
  }
}

// Assign to window for global access
if (typeof window !== 'undefined') {
  (window as any).handleDropdownClick = handleGlobalClick
}

const isDropdownActive = (item: any) => {
  if (!item.children) return false
  return item.children.some((child: any) => isActive(child.path))
}

// Navigation items based on user role
const navigationItems = computed(() => {
  const userRole = authStore.user?.role || 'viewer'

  // Base items available to all users
  const baseItems = [
    {
      name: 'dashboard',
      path: '/dashboard',
      label: 'Dashboard',
      icon: isActive('/dashboard') ? HomeSolidIcon : HomeIcon
    },
    {
      name: 'inspections',
      path: '/inspections',
      label: 'Inspections',
      icon: isActive('/inspections') ? ClipboardSolidIcon : ClipboardDocumentListIcon
    }
  ]

  // Management items for admin and supervisor
  const managementItems = [
    {
      name: 'manage',
      label: 'Manage',
      icon: isDropdownActive({ children: [
        { path: '/sites' },
        { path: '/templates' },
        { path: '/assignments' }
      ] }) ? WrenchScrewdriverSolidIcon : WrenchScrewdriverIcon,
      children: [
        {
          name: 'sites',
          path: '/sites',
          label: 'Sites',
          icon: isActive('/sites') ? BuildingOfficeSolidIcon : BuildingOfficeIcon
        },
        {
          name: 'templates',
          path: '/templates',
          label: 'Templates',
          icon: isActive('/templates') ? DocumentSolidIcon : DocumentTextIcon
        },
        {
          name: 'assignments',
          path: '/assignments',
          label: 'Assignments',
          icon: isActive('/assignments') ? ClipboardDocumentCheckSolidIcon : ClipboardDocumentCheckIcon
        }
      ]
    }
  ]

  // Profile items (formerly Settings items)
  const profileItems = [
    {
      name: 'profile',
      label: 'Profile',
      icon: isDropdownActive({ children: [
        { path: '/profile' }
      ] }) ? UserSolidIcon : UserCircleIcon,
      children: [
        {
          name: 'profile',
          path: '/profile',
          label: 'Profile',
          icon: isActive('/profile') ? UserSolidIcon : UserCircleIcon
        },
        {
          name: 'settings',
          path: '/settings',
          label: 'Settings',
          icon: CogIcon
        },
        {
          name: 'logout',
          label: 'Logout',
          icon: ArrowRightOnRectangleIcon,
          action: handleLogout
        }
      ]
    }
  ]

  // Role-specific items
  if (userRole === 'admin') {
    // Admin gets Users in manage dropdown (add at end: Sites, Templates, Assignments, Users)
    managementItems[0].children.push({
      name: 'users',
      path: '/users',
      label: 'Users',
      icon: isActive('/users') ? UsersSolidIcon : UsersIcon
    })

    return [
      ...baseItems,
      ...managementItems,
      ...profileItems
    ]
  }

  if (userRole === 'supervisor') {
    return [
      ...baseItems,
      ...managementItems,
      ...profileItems
    ]
  }

  if (userRole === 'inspector') {
    // Inspector gets only limited manage items
    const inspectorManageItems = [
      {
        name: 'manage',
        label: 'Manage',
        icon: isDropdownActive({ children: [
          { path: '/templates' }
        ] }) ? WrenchScrewdriverSolidIcon : WrenchScrewdriverIcon,
        children: [
          {
            name: 'templates',
            path: '/templates',
            label: 'Templates',
            icon: isActive('/templates') ? DocumentSolidIcon : DocumentTextIcon
          }
        ]
      }
    ]

    return [
      ...baseItems,
      ...inspectorManageItems,
      ...profileItems
    ]
  }

  // Viewer role (default) - only basic items
  const viewerManageItems = [
    {
      name: 'manage',
      label: 'Manage',
      icon: isDropdownActive({ children: [
        { path: '/templates' }
      ] }) ? WrenchScrewdriverSolidIcon : WrenchScrewdriverIcon,
      children: [
        {
          name: 'templates',
          path: '/templates',
          label: 'Templates',
          icon: isActive('/templates') ? DocumentSolidIcon : DocumentTextIcon
        }
      ]
    }
  ]

  return [
    ...baseItems,
    ...viewerManageItems,
    ...profileItems
  ]
})

const isActive = (path: string): boolean => {
  if (path === '/dashboard') {
    return route.path === '/dashboard'
  }
  return route.path.startsWith(path)
}

// Mobile popup click outside handler
const handleMobilePopupClick = (event: Event) => {
  if (!openDropdown.value) return

  const target = event.target as Element

  // Check if click is inside the popup content (not on overlay)
  const clickedInPopupContent = target.closest('.mobile-popup-content')

  // If clicked on overlay (outside content), close popup
  if (!clickedInPopupContent && target.closest('.mobile-popup-overlay')) {
    closeDropdown()
  }
}

// Lifecycle hooks with mobile popup handler
onMounted(() => {
  document.addEventListener('click', handleMobilePopupClick)
})

onUnmounted(() => {
  document.removeEventListener('click', handleMobilePopupClick)
})

// Helper methods for mobile popup
const getDropdownTitle = () => {
  const item = navigationItems.value.find(item => item.name === openDropdown.value)
  return item?.label || ''
}

const getDropdownItems = () => {
  const item = navigationItems.value.find(item => item.name === openDropdown.value)
  return item?.children || []
}

// Logout function
const handleLogout = async () => {
  authStore.logout()
  router.push('/login')
  closeDropdown()
}

// Close dropdown when navigating
router.afterEach(() => {
  closeDropdown()
})
</script>

<style scoped>
.app-navigation {
  position: fixed !important;
  bottom: 0 !important;
  left: 0 !important;
  right: 0 !important;
  background-color: hsl(var(--background)) !important;
  border-top: 1px solid hsl(var(--border)) !important;
  display: flex !important;
  justify-content: space-around !important;
  align-items: center !important;
  padding: 0.5rem 0 !important;
  z-index: 50 !important;
  box-shadow: var(--shadow-lg) !important;
  transition: all 0.3s ease !important;
}

.nav-item {
  position: relative !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  gap: 0.25rem !important;
  padding: 0.5rem 0.75rem !important;
  text-decoration: none !important;
  color: hsl(var(--muted-foreground)) !important;
  font-size: 0.75rem !important;
  font-weight: 500 !important;
  transition: all 0.3s ease !important;
  min-width: 60px !important;
  border-radius: 0.5rem !important;
}

.nav-item.active {
  color: hsl(var(--primary)) !important;
}

.nav-icon {
  width: 1.5rem;
  height: 1.5rem;
  transition: transform 0.2s;
}

.nav-item.active .nav-icon {
  transform: scale(1.1);
}

.nav-label {
  font-size: 0.625rem;
  line-height: 1;
  text-align: center;
  margin-top: 0.125rem;
}

.nav-badge {
  position: absolute;
  top: 0.25rem;
  right: 0.5rem;
  background: hsl(var(--destructive));
  color: hsl(var(--destructive-foreground));
  border-radius: 9999px;
  padding: 0.125rem 0.375rem;
  font-size: 0.625rem;
  font-weight: 600;
  min-width: 1rem;
  text-align: center;
  line-height: 1;
}

/* Desktop screens - enhanced navigation */
@media (min-width: 768px) {
  .app-navigation {
    /* Navigation remains visible on all screen sizes */
    justify-content: center;
    padding: 0.75rem 0;
  }

  .nav-item {
    padding: 0.75rem 1rem;
    min-width: 80px;
  }

  .nav-icon {
    width: 1.75rem;
    height: 1.75rem;
  }

  .nav-label {
    font-size: 0.75rem;
  }
}

/* Mobile Navigation Dropdown Button Styles */
.nav-dropdown {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.dropdown-trigger {
  background: none !important;
  border: none !important;
  cursor: pointer !important;
  position: relative !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  gap: 0.25rem !important;
  padding: 0.5rem 0.75rem !important;
  text-decoration: none !important;
  color: hsl(var(--muted-foreground)) !important;
  font-size: 0.75rem !important;
  font-weight: 500 !important;
  transition: all 0.3s ease !important;
  min-width: 60px !important;
  border-radius: 0.5rem !important;
}

.dropdown-trigger.active,
.nav-dropdown.active .dropdown-trigger {
  color: hsl(var(--primary)) !important;
}

.dropdown-arrow {
  width: 0.75rem;
  height: 0.75rem;
  margin-top: -0.125rem;
}

/* Mobile Popup Modal Styles */
.mobile-popup-overlay {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  background: hsl(var(--background) / 0.95) !important;
  backdrop-filter: blur(8px) !important;
  z-index: 1000 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  padding: 1rem !important;
}

.mobile-popup-content {
  background: hsl(var(--card)) !important;
  border: 1px solid hsl(var(--border)) !important;
  border-radius: 1rem !important;
  box-shadow: var(--shadow-xl) !important;
  width: 100% !important;
  max-width: 400px !important;
  max-height: 80vh !important;
  overflow: hidden !important;
}

.mobile-popup-header {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  padding: 1.5rem !important;
  border-bottom: 1px solid hsl(var(--border)) !important;
  background: hsl(var(--muted) / 0.3) !important;
}

.mobile-popup-title {
  font-size: 1.25rem !important;
  font-weight: 600 !important;
  color: hsl(var(--foreground)) !important;
  margin: 0 !important;
}

.mobile-popup-close {
  background: none !important;
  border: none !important;
  cursor: pointer !important;
  padding: 0.5rem !important;
  border-radius: 0.5rem !important;
  color: hsl(var(--muted-foreground)) !important;
  transition: all 0.2s !important;
}

.mobile-popup-close:hover {
  background: hsl(var(--accent)) !important;
  color: hsl(var(--foreground)) !important;
}

.mobile-popup-close svg {
  width: 1.25rem !important;
  height: 1.25rem !important;
}

.mobile-popup-body {
  padding: 1rem !important;
}

.mobile-popup-item {
  display: flex !important;
  align-items: center !important;
  gap: 1rem !important;
  padding: 1rem !important;
  border-radius: 0.75rem !important;
  text-decoration: none !important;
  color: hsl(var(--foreground)) !important;
  transition: all 0.2s !important;
  margin-bottom: 0.5rem !important;
  border: 1px solid transparent !important;
}

.mobile-popup-item:hover {
  background: hsl(var(--accent)) !important;
  border-color: hsl(var(--border)) !important;
  transform: translateX(4px) !important;
}

.mobile-popup-item.active {
  background: hsl(var(--primary) / 0.1) !important;
  color: hsl(var(--primary)) !important;
  border-color: hsl(var(--primary) / 0.2) !important;
}

.mobile-popup-icon {
  width: 1.5rem !important;
  height: 1.5rem !important;
  flex-shrink: 0 !important;
}

.mobile-popup-arrow {
  width: 1rem !important;
  height: 1rem !important;
  margin-left: auto !important;
  color: hsl(var(--muted-foreground)) !important;
}

.mobile-popup-button {
  background: none !important;
  border: none !important;
  text-align: left !important;
  width: 100% !important;
  cursor: pointer !important;
}

.logout-item {
  color: hsl(0 84.2% 60.2%) !important;
}

.logout-item:hover {
  background: hsl(0 84.2% 60.2% / 0.1) !important;
  border-color: hsl(0 84.2% 60.2% / 0.2) !important;
}

.logout-item .mobile-popup-icon,
.logout-item .mobile-popup-arrow {
  color: hsl(0 84.2% 60.2%) !important;
}

/* Modal animations */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease !important;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0 !important;
}

.modal-enter-from .mobile-popup-content,
.modal-leave-to .mobile-popup-content {
  transform: scale(0.9) translateY(20px) !important;
}

.modal-enter-to,
.modal-leave-from {
  opacity: 1 !important;
}

.modal-enter-to .mobile-popup-content,
.modal-leave-from .mobile-popup-content {
  transform: scale(1) translateY(0) !important;
}

/* Safe area for devices with home indicator */
@media (display-mode: standalone) {
  .app-navigation {
    padding-bottom: env(safe-area-inset-bottom);
  }
}

/* Handle different screen sizes */
@media (max-width: 375px) {
  .nav-item,
  .dropdown-trigger {
    padding: 0.5rem 0.5rem;
    min-width: 50px;
  }

  .nav-icon {
    width: 1.25rem;
    height: 1.25rem;
  }

  .nav-label {
    font-size: 0.5rem;
  }

  .dropdown-content {
    min-width: 180px;
    left: 0;
    transform: translateX(0);
    right: 0;
    margin: 0 0.5rem 0.5rem;
  }

  .dropdown-item {
    padding: 0.5rem 0.75rem;
    font-size: 0.8125rem;
  }

  .dropdown-icon {
    width: 1rem;
    height: 1rem;
  }
}

/* Hide mobile popup on desktop screens */
@media (min-width: 768px) {
  .mobile-popup-overlay {
    display: none !important;
  }

  .dropdown-trigger {
    padding: 0.75rem 1rem;
    min-width: 80px;
  }
}
</style>