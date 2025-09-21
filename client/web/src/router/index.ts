import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // Public Routes
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomeView.vue'),
      meta: { requiresAuth: false }
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/auth/LoginView.vue'),
      meta: { requiresAuth: false }
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/views/auth/RegisterView.vue'),
      meta: { requiresAuth: false }
    },

    // Protected Routes - Dashboard
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('@/views/dashboard/DashboardView.vue'),
      meta: { requiresAuth: true }
    },

    // Protected Routes - Analytics
    {
      path: '/analytics',
      name: 'analytics',
      component: () => import('@/views/analytics/AnalyticsView.vue'),
      meta: { requiresAuth: true, requiresPermission: 'can_view_reports' }
    },

    // Protected Routes - Inspections
    {
      path: '/inspections',
      name: 'inspections',
      component: () => import('@/views/inspections/InspectionsList.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/inspections/new',
      name: 'inspection-create',
      component: () => import('@/views/inspections/InspectionCreate.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/inspections/create',
      name: 'inspection-create-with-site',
      component: () => import('@/views/inspections/InspectionCreateWithSite.vue'),
      meta: { requiresAuth: true, requiresRole: ['admin', 'supervisor', 'inspector'] }
    },
    {
      path: '/inspections/:id',
      name: 'inspection-detail',
      component: () => import('@/views/inspections/InspectionDetail.vue'),
      meta: { requiresAuth: true },
      props: true
    },
    {
      path: '/inspections/:id/edit',
      name: 'inspection-edit',
      component: () => import('@/views/inspections/InspectionEdit.vue'),
      meta: { requiresAuth: true },
      props: true
    },
    {
      path: '/inspections/:id/form',
      name: 'inspection-form',
      component: () => import('@/views/inspections/InspectionForm.vue'),
      meta: { requiresAuth: true },
      props: true
    },
    {
      path: '/inspections/site-select/:templateId',
      name: 'inspection-site-select',
      component: () => import('@/views/inspections/InspectionSiteSelect.vue'),
      meta: { requiresAuth: true, requiresRole: ['admin', 'supervisor', 'inspector'] },
      props: true
    },
    {
      path: '/inspections/new/:templateId',
      name: 'inspection-new-template',
      component: () => import('@/views/inspections/InspectionForm.vue'),
      meta: { requiresAuth: true, requiresRole: ['admin', 'supervisor', 'inspector'] },
      props: true
    },

    // Protected Routes - Sites
    {
      path: '/sites',
      name: 'sites',
      component: () => import('@/views/sites/SitesList.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/sites/new',
      name: 'site-new',
      component: () => import('@/views/sites/SiteForm.vue'),
      meta: { requiresAuth: true, requiresRole: ['admin', 'supervisor'] }
    },
    {
      path: '/sites/:id',
      name: 'site-detail',
      component: () => import('@/views/sites/SiteDetail.vue'),
      meta: { requiresAuth: true },
      props: true
    },
    {
      path: '/sites/:id/edit',
      name: 'site-edit',
      component: () => import('@/views/sites/SiteForm.vue'),
      meta: { requiresAuth: true, requiresRole: ['admin', 'supervisor'] },
      props: true
    },

    // Protected Routes - Templates
    {
      path: '/templates',
      name: 'templates',
      component: () => import('@/views/templates/TemplatesList.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/templates/new',
      name: 'template-new',
      component: () => import('@/views/templates/TemplateCreate.vue'),
      meta: { requiresAuth: true, requiresRole: ['admin', 'supervisor'] }
    },
    {
      path: '/templates/:id',
      name: 'template-detail',
      component: () => import('@/views/templates/TemplateDetail.vue'),
      meta: { requiresAuth: true },
      props: true
    },
    {
      path: '/templates/:id/edit',
      name: 'template-edit',
      component: () => import('@/views/templates/TemplateEdit.vue'),
      meta: { requiresAuth: true, requiresRole: ['admin', 'supervisor'] },
      props: true
    },
    {
      path: '/templates/:id/preview',
      name: 'template-preview',
      component: () => import('@/views/templates/TemplateDetail.vue'),
      meta: { requiresAuth: true },
      props: true
    },

    // Protected Routes - Assignments
    {
      path: '/assignments',
      name: 'assignments',
      component: () => import('@/views/assignments/AssignmentDashboard.vue'),
      meta: { requiresAuth: true, requiresRole: ['admin', 'supervisor'] }
    },
    {
      path: '/assignments/create',
      name: 'assignment-create',
      component: () => import('@/views/assignments/AssignmentWizard.vue'),
      meta: { requiresAuth: true, requiresRole: ['admin', 'supervisor'] }
    },

    // Protected Routes - Profile & Settings
    {
      path: '/profile',
      name: 'profile',
      component: () => import('@/views/auth/ProfileView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/views/settings/SettingsView.vue'),
      meta: { requiresAuth: true }
    },

    // Protected Routes - Admin
    {
      path: '/users',
      name: 'users',
      component: () => import('@/views/admin/UsersList.vue'),
      meta: { requiresAuth: true, requiresRole: 'admin' }
    },

    // Error Routes
    {
      path: '/offline',
      name: 'offline',
      component: () => import('@/views/OfflineView.vue'),
      meta: { requiresAuth: false }
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFoundView.vue'),
      meta: { requiresAuth: false }
    }
  ]
})

// Navigation guards
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  console.log('🛡️ Router guard:', {
    to: to.path,
    from: from.path,
    isAuthenticated: authStore.isAuthenticated,
    hasToken: !!authStore.token,
    hasUser: !!authStore.user
  })

  if (!authStore.isAuthenticated && authStore.token) {
    console.log('🔄 Token exists but user missing, fetching user...')
    try {
      await authStore.fetchUser()
      console.log('✅ User fetched successfully')
    } catch (error) {
      console.error('❌ Failed to fetch user, logging out:', error)
      authStore.logout()
    }
  }

  // Handle authentication requirement
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next({ name: 'login', query: { redirect: to.fullPath } })
    return
  }

  // Handle role requirement
  if (to.meta.requiresRole && authStore.isAuthenticated) {
    const userRole = authStore.user?.role
    const requiredRoles = Array.isArray(to.meta.requiresRole) ? to.meta.requiresRole : [to.meta.requiresRole]

    if (!userRole || !requiredRoles.includes(userRole)) {
      next({ name: 'dashboard' })
      return
    }
  }

  // Handle permission requirement
  if (to.meta.requiresPermission && authStore.isAuthenticated) {
    const hasPermission = authStore.hasPermission(to.meta.requiresPermission as string)
    if (!hasPermission) {
      next({ name: 'dashboard' })
      return
    }
  }

  // Redirect authenticated users away from auth pages
  if (!to.meta.requiresAuth && authStore.isAuthenticated && ['login', 'register'].includes(to.name as string)) {
    next({ name: 'dashboard' })
    return
  }

  next()
})

export default router