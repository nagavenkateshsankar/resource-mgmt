<template>
  <div class="not-found-page">
    <div class="not-found-container">
      <div class="error-illustration">
        <div class="error-number">404</div>
        <div class="error-icon">
          <ExclamationTriangleIcon class="icon-xl text-yellow-500" />
        </div>
      </div>

      <h1 class="error-title">Page Not Found</h1>

      <p class="error-description">
        Sorry, we couldn't find the page you're looking for. The page may have been moved,
        deleted, or you may have entered an incorrect URL.
      </p>

      <div class="error-actions">
        <router-link to="/" class="btn btn-primary">
          <HomeIcon class="icon-sm" />
          Go Home
        </router-link>

        <button @click="goBack" class="btn btn-secondary">
          <ArrowLeftIcon class="icon-sm" />
          Go Back
        </button>
      </div>

      <div class="helpful-links">
        <h3 class="links-title">Try these instead:</h3>
        <div class="links-grid">
          <router-link to="/dashboard" class="help-link">
            <ChartPieIcon class="icon-sm" />
            <span>Dashboard</span>
          </router-link>

          <router-link to="/inspections" class="help-link">
            <ClipboardDocumentListIcon class="icon-sm" />
            <span>Inspections</span>
          </router-link>

          <router-link to="/templates" class="help-link">
            <DocumentTextIcon class="icon-sm" />
            <span>Templates</span>
          </router-link>

          <router-link to="/profile" class="help-link">
            <UserCircleIcon class="icon-sm" />
            <span>Profile</span>
          </router-link>
        </div>
      </div>

      <div class="search-section">
        <h3 class="search-title">Looking for something specific?</h3>
        <div class="search-container">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search for inspections, templates..."
            class="search-input"
            @keyup.enter="handleSearch"
          />
          <button @click="handleSearch" class="search-button">
            <MagnifyingGlassIcon class="icon-sm" />
            Search
          </button>
        </div>
      </div>
    </div>

    <!-- Background Pattern -->
    <div class="background-pattern"></div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'

// Icons
import {
  ExclamationTriangleIcon,
  HomeIcon,
  ArrowLeftIcon,
  ChartPieIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  UserCircleIcon,
  MagnifyingGlassIcon
} from '@heroicons/vue/24/outline'

const router = useRouter()
const appStore = useAppStore()

const searchQuery = ref('')

const goBack = () => {
  if (window.history.length > 1) {
    router.go(-1)
  } else {
    router.push('/')
  }
}

const handleSearch = () => {
  if (searchQuery.value.trim()) {
    // In a real app, this would redirect to a search results page
    // For now, we'll just show a message and redirect to dashboard
    appStore.showInfoMessage(`Searching for "${searchQuery.value}"...`)
    router.push('/dashboard')
  }
}
</script>

<style scoped>
.not-found-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  padding: 2rem 1rem;
  position: relative;
  overflow: hidden;
}

.not-found-container {
  max-width: 600px;
  width: 100%;
  text-align: center;
  background: white;
  border-radius: 1.5rem;
  padding: 3rem 2rem;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  position: relative;
  z-index: 10;
}

.error-illustration {
  position: relative;
  margin-bottom: 2rem;
  display: inline-block;
}

.error-number {
  font-size: 8rem;
  font-weight: 900;
  color: #e2e8f0;
  line-height: 1;
  margin-bottom: -1rem;
  font-family: 'Arial Black', sans-serif;
}

.error-icon {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.error-title {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 1rem;
}

.error-description {
  font-size: 1.125rem;
  line-height: 1.6;
  margin-bottom: 2rem;
}

.error-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-bottom: 3rem;
  flex-wrap: wrap;
}

.helpful-links {
  margin-bottom: 2rem;
}

.links-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 1rem;
}

.links-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 1rem;
}

.help-link {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  text-decoration: none;
  transition: all 0.2s;
  font-size: 0.875rem;
  font-weight: 500;
}

.help-link:hover {
  background: #f1f5f9;
  border-color: #3b82f6;
  color: #3b82f6;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
}

.search-section {
  border-top: 1px solid #e5e7eb;
  padding-top: 2rem;
}

.search-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 1rem;
}

.search-container {
  display: flex;
  gap: 0.5rem;
  max-width: 400px;
  margin: 0 auto;
}

.search-input {
  flex: 1;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 1rem;
  transition: all 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.search-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.search-button:hover {
  background: #2563eb;
}

.background-pattern {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  opacity: 0.05;
  background-image:
    radial-gradient(circle at 25% 25%, #3b82f6 2px, transparent 2px),
    radial-gradient(circle at 75% 75%, #3b82f6 2px, transparent 2px);
  background-size: 50px 50px;
  background-position: 0 0, 25px 25px;
}

@media (max-width: 640px) {
  .not-found-container {
    padding: 2rem 1.5rem;
  }

  .error-number {
    font-size: 6rem;
  }

  .error-title {
    font-size: 2rem;
  }

  .error-description {
    font-size: 1rem;
  }

  .error-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .links-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .search-container {
    flex-direction: column;
  }
}
</style>