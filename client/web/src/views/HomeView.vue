<template>
  <div class="home-page">
    <div class="hero-section">
      <div class="hero-content">
        <div class="logo-container">
          <svg viewBox="0 0 24 24" fill="currentColor" class="logo-icon">
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <h1 class="hero-title">Site Inspector</h1>
        <p class="hero-subtitle">
          Professional site inspection management made simple
        </p>
        <div class="hero-actions">
          <router-link to="/login" class="btn btn-primary btn-lg">
            Get Started
          </router-link>
          <router-link to="/register" class="btn btn-secondary btn-lg">
            Sign Up
          </router-link>
        </div>
      </div>
    </div>

    <div class="features-section">
      <div class="container">
        <h2 class="section-title">Key Features</h2>
        <div class="features-grid">
          <div class="feature-card">
            <div class="feature-icon">
              <ClipboardDocumentListIcon class="icon-lg" />
            </div>
            <h3 class="feature-title">Digital Inspections</h3>
            <p class="feature-description">
              Create and conduct comprehensive site inspections with customizable forms and templates.
            </p>
          </div>

          <div class="feature-card">
            <div class="feature-icon">
              <WifiIcon class="icon-lg" />
            </div>
            <h3 class="feature-title">Offline Support</h3>
            <p class="feature-description">
              Work seamlessly even without internet connection. Data syncs automatically when back online.
            </p>
          </div>

          <div class="feature-card">
            <div class="feature-icon">
              <CameraIcon class="icon-lg" />
            </div>
            <h3 class="feature-title">Photo Documentation</h3>
            <p class="feature-description">
              Capture and attach photos directly to inspection items for complete visual documentation.
            </p>
          </div>

          <div class="feature-card">
            <div class="feature-icon">
              <DocumentTextIcon class="icon-lg" />
            </div>
            <h3 class="feature-title">Report Generation</h3>
            <p class="feature-description">
              Generate professional PDF reports instantly with all inspection data and photos.
            </p>
          </div>

          <div class="feature-card">
            <div class="feature-icon">
              <UsersIcon class="icon-lg" />
            </div>
            <h3 class="feature-title">Team Collaboration</h3>
            <p class="feature-description">
              Share inspections and templates across your team for consistent quality standards.
            </p>
          </div>

          <div class="feature-card">
            <div class="feature-icon">
              <ChartBarIcon class="icon-lg" />
            </div>
            <h3 class="feature-title">Analytics Dashboard</h3>
            <p class="feature-description">
              Track inspection trends and performance metrics with comprehensive analytics.
            </p>
          </div>
        </div>
      </div>
    </div>

    <div class="cta-section">
      <div class="container">
        <div class="cta-content">
          <h2 class="cta-title">Ready to streamline your inspections?</h2>
          <p class="cta-description">
            Join thousands of professionals who trust Site Inspector for their inspection needs.
          </p>
          <div class="cta-actions">
            <router-link to="/register" class="btn btn-primary btn-lg">
              Start Free Trial
            </router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  ClipboardDocumentListIcon,
  WifiIcon,
  CameraIcon,
  DocumentTextIcon,
  UsersIcon,
  ChartBarIcon
} from '@heroicons/vue/24/outline'
</script>

<style scoped>
.home-page {
  min-height: 100vh;
}

.hero-section {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 4rem 1rem;
  text-align: center;
  position: relative;
  overflow: hidden;
}

.hero-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image:
    radial-gradient(circle at 25% 25%, rgba(255, 255, 255, 0.1) 2px, transparent 2px),
    radial-gradient(circle at 75% 75%, rgba(255, 255, 255, 0.1) 2px, transparent 2px);
  background-size: 50px 50px;
  background-position: 0 0, 25px 25px;
}

.hero-content {
  position: relative;
  z-index: 1;
  max-width: 800px;
  margin: 0 auto;
}

.logo-container {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 5rem;
  height: 5rem;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  margin-bottom: 2rem;
}

.logo-icon {
  width: 3rem;
  height: 3rem;
  color: white;
}

.hero-title {
  font-size: 3.5rem;
  font-weight: 700;
  margin-bottom: 1rem;
  background: linear-gradient(45deg, #ffffff, #e0e7ff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-subtitle {
  font-size: 1.5rem;
  margin-bottom: 3rem;
  opacity: 0.9;
  line-height: 1.4;
}

.hero-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.features-section {
  padding: 5rem 0;
  background: white;
}

.section-title {
  text-align: center;
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 3rem;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
}

.feature-card {
  text-align: center;
  padding: 2rem;
  border-radius: 1rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  transition: all 0.3s ease;
}

.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  border-color: #3b82f6;
}

.feature-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 4rem;
  height: 4rem;
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: white;
  border-radius: 50%;
  margin-bottom: 1.5rem;
}

.feature-title {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 1rem;
}

.feature-description {
  line-height: 1.6;
}

.cta-section {
  background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
  color: white;
  padding: 5rem 1rem;
  text-align: center;
}

.cta-content {
  max-width: 600px;
  margin: 0 auto;
}

.cta-title {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 1rem;
}

.cta-description {
  font-size: 1.25rem;
  opacity: 0.9;
  margin-bottom: 2rem;
  line-height: 1.6;
}

.cta-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

@media (max-width: 768px) {
  .hero-section {
    padding: 3rem 1rem;
  }

  .hero-title {
    font-size: 2.5rem;
  }

  .hero-subtitle {
    font-size: 1.25rem;
  }

  .hero-actions {
    flex-direction: column;
    align-items: center;
  }

  .features-section {
    padding: 3rem 0;
  }

  .section-title {
    font-size: 2rem;
  }

  .features-grid {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }

  .feature-card {
    padding: 1.5rem;
  }

  .cta-section {
    padding: 3rem 1rem;
  }

  .cta-title {
    font-size: 2rem;
  }

  .cta-description {
    font-size: 1.125rem;
  }
}
</style>