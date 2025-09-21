<template>
  <div class="assignment-wizard">
    <!-- Header -->
    <div class="wizard-header">
      <h1 class="wizard-title">Create Assignments</h1>
      <p class="wizard-subtitle">
        Choose your workflow to bulk assign inspections to sites
      </p>
    </div>

    <!-- Progress Indicator -->
    <div class="wizard-progress">
      <div class="progress-steps">
        <div
          class="progress-step"
          :class="{
            'active': currentStep === 'workflow_selection',
            'completed': getStepIndex(currentStep) > 0
          }"
        >
          <div class="step-number">1</div>
          <span class="step-label">Workflow</span>
        </div>
        <div
          class="progress-step"
          :class="{
            'active': isStepActive('selection_1'),
            'completed': isStepCompleted('selection_1')
          }"
        >
          <div class="step-number">2</div>
          <span class="step-label">{{ getStep2Label() }}</span>
        </div>
        <div
          class="progress-step"
          :class="{
            'active': isStepActive('selection_2'),
            'completed': isStepCompleted('selection_2')
          }"
        >
          <div class="step-number">3</div>
          <span class="step-label">{{ getStep3Label() }}</span>
        </div>
        <div
          class="progress-step"
          :class="{
            'active': currentStep === 'assignment_creation',
            'completed': currentStep === 'completed'
          }"
        >
          <div class="step-number">4</div>
          <span class="step-label">Review</span>
        </div>
      </div>
    </div>

    <!-- Wizard Content -->
    <div class="wizard-content">
      <!-- Step 1: Workflow Selection -->
      <div v-if="currentStep === 'workflow_selection'" class="workflow-selection">
        <h2 class="step-title">Choose Your Assignment Workflow</h2>
        <p class="step-description">
          Select how you want to create your assignments. Each workflow is optimized for different use cases.
        </p>

        <div class="workflow-options">
          <div
            class="workflow-option"
            :class="{ 'selected': workflowType === 'site_first' }"
            @click="selectWorkflow('site_first')"
          >
            <div class="workflow-icon">
              <BuildingOfficeIcon class="icon-xl" />
            </div>
            <h3 class="workflow-title">Site-First Workflow</h3>
            <p class="workflow-description">
              Start by selecting a site, then choose multiple inspection templates for that site.
              Perfect when you want to schedule multiple types of inspections for a specific location.
            </p>
            <div class="workflow-example">
              <span class="example-label">Example:</span>
              One office building → Safety + Electrical + Fire inspections
            </div>
          </div>

          <div
            class="workflow-option"
            :class="{ 'selected': workflowType === 'inspection_first' }"
            @click="selectWorkflow('inspection_first')"
          >
            <div class="workflow-icon">
              <ClipboardDocumentListIcon class="icon-xl" />
            </div>
            <h3 class="workflow-title">Inspection-First Workflow</h3>
            <p class="workflow-description">
              Start by selecting an inspection template, then choose multiple sites for that inspection type.
              Ideal for rolling out the same inspection across multiple locations.
            </p>
            <div class="workflow-example">
              <span class="example-label">Example:</span>
              Fire Safety inspection → Office A + Office B + Warehouse C
            </div>
          </div>
        </div>

        <div class="workflow-actions">
          <button
            @click="proceedToNextStep"
            :disabled="!workflowType"
            class="btn btn-primary btn-lg"
          >
            Continue
            <ArrowRightIcon class="icon-sm" />
          </button>
        </div>
      </div>

      <!-- Step 2: Site Selection -->
      <div v-if="currentStep === 'site_selection'" class="site-selection">
        <div class="step-header">
          <h2 class="step-title">
            {{ workflowType === 'site_first' ? 'Select Site' : 'Select Sites for Inspection' }}
          </h2>
          <p class="step-description">
            {{ workflowType === 'site_first'
              ? 'Choose the site where you want to conduct inspections.'
              : 'Choose all sites where you want to conduct this inspection.'
            }}
          </p>
        </div>

        <SiteSelection
          :multiple="workflowType === 'inspection_first'"
          :selected-sites="selectedSites"
          @update:selected-sites="updateSelectedSites"
        />

        <div class="step-actions">
          <button @click="goBackToPreviousStep" class="btn btn-secondary">
            <ArrowLeftIcon class="icon-sm" />
            Back
          </button>
          <button
            @click="proceedToNextStep"
            :disabled="selectedSites.length === 0"
            class="btn btn-primary"
          >
            Continue ({{ selectedSites.length }} selected)
            <ArrowRightIcon class="icon-sm" />
          </button>
        </div>
      </div>

      <!-- Step 3: Template Selection -->
      <div v-if="currentStep === 'template_selection'" class="template-selection">
        <div class="step-header">
          <h2 class="step-title">
            {{ workflowType === 'site_first' ? 'Select Inspection Templates' : 'Select Inspection Template' }}
          </h2>
          <p class="step-description">
            {{ workflowType === 'site_first'
              ? 'Choose all inspection types you want to conduct at the selected site.'
              : 'Choose the inspection template you want to use at all selected sites.'
            }}
          </p>
        </div>

        <TemplateSelection
          :multiple="workflowType === 'site_first'"
          :selected-templates="selectedTemplates"
          @update:selected-templates="updateSelectedTemplates"
        />

        <div class="step-actions">
          <button @click="goBackToPreviousStep" class="btn btn-secondary">
            <ArrowLeftIcon class="icon-sm" />
            Back
          </button>
          <button
            @click="proceedToNextStep"
            :disabled="selectedTemplates.length === 0"
            class="btn btn-primary"
          >
            Continue ({{ selectedTemplates.length }} selected)
            <ArrowRightIcon class="icon-sm" />
          </button>
        </div>
      </div>

      <!-- Step 4: Assignment Creation / Review -->
      <div v-if="currentStep === 'assignment_creation'" class="assignment-creation">
        <div class="step-header">
          <h2 class="step-title">Review & Create Assignments</h2>
          <p class="step-description">
            Review your selections and configure assignment details before creating.
          </p>
        </div>

        <AssignmentReview
          :selected-sites="selectedSitesData"
          :selected-templates="selectedTemplatesData"
          :workflow-type="workflowType"
          :estimated-count="estimatedAssignmentCount"
          @create-assignments="handleCreateAssignments"
          @back="goBackToPreviousStep"
          :is-creating="isCreatingAssignments"
        />
      </div>

      <!-- Step 5: Completion -->
      <div v-if="currentStep === 'completed'" class="assignment-completion">
        <div class="completion-content">
          <div class="completion-icon">
            <CheckCircleIcon class="icon-xl text-success" />
          </div>
          <h2 class="completion-title">Assignments Created Successfully!</h2>
          <p class="completion-description">
            Your assignments have been created and are ready for execution.
          </p>

          <div class="completion-summary" v-if="lastCreationResult">
            <div class="summary-stat">
              <span class="stat-number">{{ lastCreationResult.total_created }}</span>
              <span class="stat-label">Assignments Created</span>
            </div>
            <div class="summary-stat" v-if="lastCreationResult.total_failed > 0">
              <span class="stat-number text-red-600">{{ lastCreationResult.total_failed }}</span>
              <span class="stat-label">Failed</span>
            </div>
          </div>

          <div class="completion-actions">
            <router-link to="/assignments" class="btn btn-primary">
              View All Assignments
            </router-link>
            <button @click="startNewWorkflow" class="btn btn-secondary">
              Create More Assignments
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Error Display -->
    <div v-if="error" class="error-banner">
      <ExclamationTriangleIcon class="icon-sm" />
      <span>{{ error }}</span>
      <button @click="clearError" class="error-close">
        <XMarkIcon class="icon-sm" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useAssignmentStore } from '@/stores/assignment'
import { storeToRefs } from 'pinia'
import {
  BuildingOfficeIcon,
  ClipboardDocumentListIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XMarkIcon
} from '@heroicons/vue/24/outline'

// Import child components
import SiteSelection from '@/components/assignments/SiteSelection.vue'
import TemplateSelection from '@/components/assignments/TemplateSelection.vue'
import AssignmentReview from '@/components/assignments/AssignmentReview.vue'

// Store
const assignmentStore = useAssignmentStore()
const {
  currentStep,
  workflowType,
  selectedSites,
  selectedTemplates,
  selectedSitesData,
  selectedTemplatesData,
  estimatedAssignmentCount,
  isCreatingAssignments,
  error
} = storeToRefs(assignmentStore)

// Local state
const lastCreationResult = ref(null)

// Step management
const getStepIndex = (step: string): number => {
  const steps = ['workflow_selection', 'site_selection', 'template_selection', 'assignment_creation', 'completed']
  return steps.indexOf(step)
}

const isStepActive = (stepType: string): boolean => {
  if (stepType === 'selection_1') {
    return (workflowType.value === 'site_first' && currentStep.value === 'site_selection') ||
           (workflowType.value === 'inspection_first' && currentStep.value === 'template_selection')
  }
  if (stepType === 'selection_2') {
    return (workflowType.value === 'site_first' && currentStep.value === 'template_selection') ||
           (workflowType.value === 'inspection_first' && currentStep.value === 'site_selection')
  }
  return false
}

const isStepCompleted = (stepType: string): boolean => {
  const currentIndex = getStepIndex(currentStep.value)
  if (stepType === 'selection_1') {
    return currentIndex > 1
  }
  if (stepType === 'selection_2') {
    return currentIndex > 2
  }
  return false
}

const getStep2Label = (): string => {
  return workflowType.value === 'site_first' ? 'Sites' : 'Templates'
}

const getStep3Label = (): string => {
  return workflowType.value === 'site_first' ? 'Templates' : 'Sites'
}

// Workflow actions
const selectWorkflow = (type: 'site_first' | 'inspection_first') => {
  assignmentStore.setWorkflowType(type)
}

const proceedToNextStep = () => {
  assignmentStore.proceedToNextStep()
}

const goBackToPreviousStep = () => {
  assignmentStore.goBackToPreviousStep()
}

const updateSelectedSites = (sites: string[]) => {
  // Clear existing site selections and update
  assignmentStore.deselectAllSites()
  sites.forEach(siteId => {
    assignmentStore.toggleSiteSelection(siteId)
  })
}

const updateSelectedTemplates = (templates: string[]) => {
  // Clear existing template selections and update
  assignmentStore.deselectAllTemplates()
  templates.forEach(templateId => {
    assignmentStore.toggleTemplateSelection(templateId)
  })
}

const handleCreateAssignments = async (assignmentData: any) => {
  const result = await assignmentStore.createBulkAssignments(assignmentData)

  if (result.success) {
    lastCreationResult.value = result.data
  }
}

const startNewWorkflow = () => {
  lastCreationResult.value = null
  assignmentStore.resetWorkflow()
}

const clearError = () => {
  assignmentStore.clearError()
}

// Initialize store when component mounts
onMounted(async () => {
  await assignmentStore.initializeStore()
})
</script>

<style scoped>
.assignment-wizard {
  max-width: 1000px;
  margin: 0 auto;
  padding: 1.5rem;
}

/* Header */
.wizard-header {
  text-align: center;
  margin-bottom: 2rem;
}

.wizard-title {
  font-size: 2.25rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  color: hsl(var(--foreground));
}

.wizard-subtitle {
  font-size: 1.125rem;
  margin: 0;
  color: hsl(var(--muted-foreground));
}

/* Progress Indicator */
.wizard-progress {
  margin-bottom: 3rem;
}

.progress-steps {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 2rem;
  position: relative;
}

.progress-steps::before {
  content: '';
  position: absolute;
  top: 1.25rem;
  left: 10%;
  right: 10%;
  height: 2px;
  background: hsl(var(--border));
  z-index: 0;
}

.progress-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  position: relative;
  z-index: 1;
}

.step-number {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  background: hsl(var(--muted));
  color: hsl(var(--muted-foreground));
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.875rem;
  transition: all 0.2s;
}

.progress-step.active .step-number {
  background: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
}

.progress-step.completed .step-number {
  background: hsl(var(--success));
  color: hsl(var(--primary-foreground));
}

.step-label {
  font-size: 0.875rem;
  font-weight: 500;
  text-align: center;
  color: hsl(var(--muted-foreground));
}

.progress-step.active .step-label,
.progress-step.completed .step-label {
}

/* Wizard Content */
.wizard-content {
  background: hsl(var(--background));
  border-radius: 1rem;
  padding: 2rem;
  box-shadow: var(--shadow);
  border: 1px solid hsl(var(--border));
  min-height: 500px;
}

/* Step Common Styles */
.step-title {
  font-size: 1.875rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  color: hsl(var(--foreground));
}

.step-description {
  font-size: 1.125rem;
  margin-bottom: 2rem;
  line-height: 1.6;
  color: hsl(var(--muted-foreground));
}

.step-header {
  text-align: center;
  margin-bottom: 2rem;
}

.step-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid hsl(var(--border));
}

/* Workflow Selection */
.workflow-selection {
  text-align: center;
}

.workflow-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  margin-bottom: 3rem;
}

.workflow-option {
  border: 2px solid hsl(var(--border));
  border-radius: 1rem;
  padding: 2rem;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
  background: hsl(var(--background));
}

.workflow-option:hover {
  border-color: hsl(var(--primary));
  box-shadow: var(--shadow);
}

.workflow-option.selected {
  border-color: hsl(var(--primary));
  background: hsl(var(--primary) / 0.1);
}

.workflow-icon {
  margin-bottom: 1.5rem;
}

.workflow-option.selected .workflow-icon {
  color: hsl(var(--primary));
}

.workflow-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: hsl(var(--foreground));
}

.workflow-description {
  line-height: 1.6;
  margin-bottom: 1.5rem;
  color: hsl(var(--muted-foreground));
}

.workflow-example {
  padding: 1rem;
  background: hsl(var(--muted));
  border-radius: 0.5rem;
  font-size: 0.875rem;
  text-align: left;
  color: hsl(var(--muted-foreground));
}

.example-label {
  font-weight: 600;
  color: hsl(var(--foreground));
}

.workflow-actions {
  display: flex;
  justify-content: center;
}

/* Assignment Completion */
.assignment-completion {
  text-align: center;
}

.completion-content {
  padding: 2rem 0;
}

.completion-icon {
  margin-bottom: 1.5rem;
}

.completion-title {
  font-size: 1.875rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  color: hsl(var(--foreground));
}

.completion-description {
  font-size: 1.125rem;
  margin-bottom: 2rem;
  color: hsl(var(--muted-foreground));
}

.completion-summary {
  display: flex;
  justify-content: center;
  gap: 3rem;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: hsl(var(--muted));
  border-radius: 0.75rem;
}

.summary-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.stat-number {
  font-size: 2rem;
  font-weight: 700;
  color: hsl(var(--success));
}

.stat-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: hsl(var(--muted-foreground));
}

.completion-actions {
  display: flex;
  justify-content: center;
  gap: 1rem;
}

/* Error Banner */
.error-banner {
  position: fixed;
  top: 1rem;
  right: 1rem;
  background: hsl(var(--destructive) / 0.1);
  border: 1px solid hsl(var(--destructive) / 0.3);
  color: hsl(var(--destructive));
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  box-shadow: var(--shadow);
  z-index: 1000;
  max-width: 400px;
}

.error-close {
  background: none;
  border: none;
  color: hsl(var(--destructive));
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 0.25rem;
  margin-left: auto;
}

.error-close:hover {
  background: hsl(var(--destructive) / 0.2);
}

/* Responsive */
@media (max-width: 768px) {
  .assignment-wizard {
    padding: 1rem;
  }

  .wizard-title {
    font-size: 1.875rem;
  }

  .wizard-subtitle {
    font-size: 1rem;
  }

  .progress-steps {
    gap: 1rem;
  }

  .step-number {
    width: 2rem;
    height: 2rem;
    font-size: 0.75rem;
  }

  .step-label {
    font-size: 0.75rem;
  }

  .wizard-content {
    padding: 1.5rem;
  }

  .workflow-options {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }

  .workflow-option {
    padding: 1.5rem;
  }

  .step-actions {
    flex-direction: column-reverse;
    gap: 1rem;
  }

  .step-actions .btn {
    width: 100%;
  }

  .completion-summary {
    flex-direction: column;
    gap: 1rem;
  }

  .completion-actions {
    flex-direction: column;
    gap: 1rem;
  }

  .completion-actions .btn {
    width: 100%;
  }
}
</style>