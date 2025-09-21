/**
 * Form Manager
 * Handles dynamic form generation, validation, and submission
 */

class FormManager {
    constructor() {
        this.forms = new Map();
        this.validators = new Map();
        this.fieldTypes = new Map();
        
        this.init();
    }

    init() {
        this.registerDefaultFieldTypes();
        this.registerDefaultValidators();
        
        console.log('FormManager initialized');
    }

    registerDefaultFieldTypes() {
        // Text input
        this.registerFieldType('text', (field, value) => `
            <div class="form-group">
                <label class="form-label" for="${field.name}">
                    ${field.label}${field.required ? ' *' : ''}
                </label>
                <input type="text" 
                       id="${field.name}" 
                       name="${field.name}" 
                       class="form-control ${field.className || ''}" 
                       value="${value || ''}"
                       placeholder="${field.placeholder || ''}"
                       ${field.required ? 'required' : ''}
                       ${field.disabled ? 'disabled' : ''}>
                ${field.help ? `<small class="form-help">${field.help}</small>` : ''}
            </div>
        `);

        // Email input
        this.registerFieldType('email', (field, value) => `
            <div class="form-group">
                <label class="form-label" for="${field.name}">
                    ${field.label}${field.required ? ' *' : ''}
                </label>
                <input type="email" 
                       id="${field.name}" 
                       name="${field.name}" 
                       class="form-control ${field.className || ''}" 
                       value="${value || ''}"
                       placeholder="${field.placeholder || ''}"
                       ${field.required ? 'required' : ''}
                       ${field.disabled ? 'disabled' : ''}>
                ${field.help ? `<small class="form-help">${field.help}</small>` : ''}
            </div>
        `);

        // Number input
        this.registerFieldType('number', (field, value) => `
            <div class="form-group">
                <label class="form-label" for="${field.name}">
                    ${field.label}${field.required ? ' *' : ''}
                </label>
                <input type="number" 
                       id="${field.name}" 
                       name="${field.name}" 
                       class="form-control ${field.className || ''}" 
                       value="${value || ''}"
                       placeholder="${field.placeholder || ''}"
                       ${field.min !== undefined ? `min="${field.min}"` : ''}
                       ${field.max !== undefined ? `max="${field.max}"` : ''}
                       ${field.step !== undefined ? `step="${field.step}"` : ''}
                       ${field.required ? 'required' : ''}
                       ${field.disabled ? 'disabled' : ''}>
                ${field.help ? `<small class="form-help">${field.help}</small>` : ''}
            </div>
        `);

        // Textarea
        this.registerFieldType('textarea', (field, value) => `
            <div class="form-group">
                <label class="form-label" for="${field.name}">
                    ${field.label}${field.required ? ' *' : ''}
                </label>
                <textarea id="${field.name}" 
                          name="${field.name}" 
                          class="form-control ${field.className || ''}" 
                          rows="${field.rows || 3}"
                          placeholder="${field.placeholder || ''}"
                          ${field.required ? 'required' : ''}
                          ${field.disabled ? 'disabled' : ''}>${value || ''}</textarea>
                ${field.help ? `<small class="form-help">${field.help}</small>` : ''}
            </div>
        `);

        // Select dropdown
        this.registerFieldType('select', (field, value) => `
            <div class="form-group">
                <label class="form-label" for="${field.name}">
                    ${field.label}${field.required ? ' *' : ''}
                </label>
                <select id="${field.name}" 
                        name="${field.name}" 
                        class="form-control ${field.className || ''}"
                        ${field.required ? 'required' : ''}
                        ${field.disabled ? 'disabled' : ''}
                        ${field.multiple ? 'multiple' : ''}>
                    ${!field.required ? '<option value="">Select an option</option>' : ''}
                    ${(field.options || []).map(option => `
                        <option value="${option.value}" ${value === option.value ? 'selected' : ''}>
                            ${option.label}
                        </option>
                    `).join('')}
                </select>
                ${field.help ? `<small class="form-help">${field.help}</small>` : ''}
            </div>
        `);

        // Radio buttons
        this.registerFieldType('radio', (field, value) => `
            <div class="form-group">
                <fieldset class="form-fieldset">
                    <legend class="form-legend">
                        ${field.label}${field.required ? ' *' : ''}
                    </legend>
                    <div class="radio-group">
                        ${(field.options || []).map((option, index) => `
                            <div class="radio-option">
                                <input type="radio" 
                                       id="${field.name}_${index}" 
                                       name="${field.name}" 
                                       value="${option.value}"
                                       ${value === option.value ? 'checked' : ''}
                                       ${field.required ? 'required' : ''}
                                       ${field.disabled ? 'disabled' : ''}>
                                <label for="${field.name}_${index}" class="radio-label">
                                    ${option.label}
                                </label>
                            </div>
                        `).join('')}
                    </div>
                    ${field.help ? `<small class="form-help">${field.help}</small>` : ''}
                </fieldset>
            </div>
        `);

        // Checkboxes
        this.registerFieldType('checkbox', (field, value) => {
            const values = Array.isArray(value) ? value : (value ? [value] : []);
            return `
                <div class="form-group">
                    <fieldset class="form-fieldset">
                        <legend class="form-legend">
                            ${field.label}${field.required ? ' *' : ''}
                        </legend>
                        <div class="checkbox-group">
                            ${(field.options || []).map((option, index) => `
                                <div class="checkbox-option">
                                    <input type="checkbox" 
                                           id="${field.name}_${index}" 
                                           name="${field.name}" 
                                           value="${option.value}"
                                           ${values.includes(option.value) ? 'checked' : ''}
                                           ${field.disabled ? 'disabled' : ''}>
                                    <label for="${field.name}_${index}" class="checkbox-label">
                                        ${option.label}
                                    </label>
                                </div>
                            `).join('')}
                        </div>
                        ${field.help ? `<small class="form-help">${field.help}</small>` : ''}
                    </fieldset>
                </div>
            `;
        });

        // Date input
        this.registerFieldType('date', (field, value) => {
            const dateValue = value ? new Date(value).toISOString().split('T')[0] : '';
            return `
                <div class="form-group">
                    <label class="form-label" for="${field.name}">
                        ${field.label}${field.required ? ' *' : ''}
                    </label>
                    <input type="date" 
                           id="${field.name}" 
                           name="${field.name}" 
                           class="form-control ${field.className || ''}" 
                           value="${dateValue}"
                           ${field.min ? `min="${field.min}"` : ''}
                           ${field.max ? `max="${field.max}"` : ''}
                           ${field.required ? 'required' : ''}
                           ${field.disabled ? 'disabled' : ''}>
                    ${field.help ? `<small class="form-help">${field.help}</small>` : ''}
                </div>
            `;
        });

        // File upload
        this.registerFieldType('file', (field, value) => `
            <div class="form-group">
                <label class="form-label" for="${field.name}">
                    ${field.label}${field.required ? ' *' : ''}
                </label>
                <input type="file" 
                       id="${field.name}" 
                       name="${field.name}" 
                       class="form-control ${field.className || ''}"
                       ${field.accept ? `accept="${field.accept}"` : ''}
                       ${field.multiple ? 'multiple' : ''}
                       ${field.required ? 'required' : ''}
                       ${field.disabled ? 'disabled' : ''}>
                ${field.help ? `<small class="form-help">${field.help}</small>` : ''}
                ${value ? `<div class="current-file">Current: ${value}</div>` : ''}
            </div>
        `);

        // Hidden field
        this.registerFieldType('hidden', (field, value) => `
            <input type="hidden" 
                   id="${field.name}" 
                   name="${field.name}" 
                   value="${value || ''}">
        `);
    }

    registerDefaultValidators() {
        this.registerValidator('required', (value, field) => {
            if (field.type === 'checkbox') {
                return Array.isArray(value) ? value.length > 0 : Boolean(value);
            }
            return value !== null && value !== undefined && value.toString().trim() !== '';
        });

        this.registerValidator('email', (value) => {
            if (!value) return true; // Let required handle empty values
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        });

        this.registerValidator('minLength', (value, field) => {
            if (!value) return true;
            return value.toString().length >= field.minLength;
        });

        this.registerValidator('maxLength', (value, field) => {
            if (!value) return true;
            return value.toString().length <= field.maxLength;
        });

        this.registerValidator('min', (value, field) => {
            if (!value) return true;
            return Number(value) >= field.min;
        });

        this.registerValidator('max', (value, field) => {
            if (!value) return true;
            return Number(value) <= field.max;
        });

        this.registerValidator('pattern', (value, field) => {
            if (!value) return true;
            return new RegExp(field.pattern).test(value);
        });
    }

    // Register custom field type
    registerFieldType(type, renderer) {
        this.fieldTypes.set(type, renderer);
    }

    // Register custom validator
    registerValidator(name, validator) {
        this.validators.set(name, validator);
    }

    // Create a form
    createForm(containerId, config) {
        const container = document.getElementById(containerId);
        if (!container) {
            throw new Error(`Container '${containerId}' not found`);
        }

        const form = {
            id: containerId,
            container,
            config: {
                fields: [],
                sections: [],
                submitText: 'Submit',
                resetText: 'Reset',
                showReset: true,
                className: '',
                ...config
            },
            data: {},
            errors: new Map(),
            isValid: false,
            isDirty: false
        };

        this.forms.set(containerId, form);
        this.renderForm(containerId);
        this.setupFormEventListeners(containerId);

        return form;
    }

    // Render the form
    renderForm(formId, data = {}) {
        const form = this.forms.get(formId);
        if (!form) return;

        form.data = { ...form.data, ...data };

        let formHTML = `<form class="dynamic-form ${form.config.className}" data-form-id="${formId}">`;

        if (form.config.sections && form.config.sections.length > 0) {
            // Render sectioned form
            formHTML += form.config.sections.map(section => this.renderSection(section, form)).join('');
        } else {
            // Render flat form
            formHTML += form.config.fields.map(field => this.renderField(field, form)).join('');
        }

        // Form actions
        formHTML += this.renderFormActions(form);
        formHTML += '</form>';

        form.container.innerHTML = formHTML;
    }

    renderSection(section, form) {
        return `
            <div class="form-section ${section.className || ''}">
                ${section.title ? `<h3 class="section-title">${section.title}</h3>` : ''}
                ${section.description ? `<p class="section-description">${section.description}</p>` : ''}
                <div class="section-fields">
                    ${(section.fields || []).map(field => this.renderField(field, form)).join('')}
                </div>
            </div>
        `;
    }

    renderField(field, form) {
        const renderer = this.fieldTypes.get(field.type || 'text');
        if (!renderer) {
            console.warn(`Unknown field type: ${field.type}`);
            return '';
        }

        const value = form.data[field.name] || field.defaultValue || '';
        const fieldHTML = renderer(field, value);
        
        // Add error display
        const error = form.errors.get(field.name);
        if (error) {
            return fieldHTML.replace('</div>', `<div class="field-error">${error}</div></div>`);
        }

        return fieldHTML;
    }

    renderFormActions(form) {
        return `
            <div class="form-actions">
                ${form.config.showReset ? `
                    <button type="button" class="btn btn-secondary" data-form-reset>
                        ${form.config.resetText}
                    </button>
                ` : ''}
                <button type="submit" class="btn btn-primary">
                    ${form.config.submitText}
                </button>
            </div>
        `;
    }

    // Setup event listeners
    setupFormEventListeners(formId) {
        const form = this.forms.get(formId);
        if (!form) return;

        const formElement = form.container.querySelector('form');
        if (!formElement) return;

        // Form submission
        formElement.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSubmit(formId);
        });

        // Form reset
        const resetButton = formElement.querySelector('[data-form-reset]');
        if (resetButton) {
            resetButton.addEventListener('click', () => {
                this.resetForm(formId);
            });
        }

        // Field change events
        formElement.addEventListener('input', (e) => {
            if (e.target.name) {
                this.handleFieldChange(formId, e.target.name, this.getFieldValue(e.target));
            }
        });

        formElement.addEventListener('change', (e) => {
            if (e.target.name) {
                this.handleFieldChange(formId, e.target.name, this.getFieldValue(e.target));
            }
        });
    }

    getFieldValue(element) {
        if (element.type === 'checkbox') {
            if (element.name.includes('[]') || document.querySelectorAll(`[name="${element.name}"]`).length > 1) {
                // Multiple checkboxes with same name
                const checkboxes = document.querySelectorAll(`[name="${element.name}"]:checked`);
                return Array.from(checkboxes).map(cb => cb.value);
            }
            return element.checked ? element.value : null;
        }
        
        if (element.type === 'radio') {
            return element.checked ? element.value : null;
        }

        if (element.type === 'file') {
            return element.files.length > 0 ? element.files : null;
        }

        return element.value;
    }

    handleFieldChange(formId, fieldName, value) {
        const form = this.forms.get(formId);
        if (!form) return;

        form.data[fieldName] = value;
        form.isDirty = true;

        // Clear field error
        form.errors.delete(fieldName);
        this.updateFieldError(formId, fieldName, null);

        // Validate field if configured
        if (form.config.validateOnChange) {
            this.validateField(formId, fieldName);
        }

        this.emit('form:field-changed', { formId, fieldName, value, form });
    }

    handleSubmit(formId) {
        const form = this.forms.get(formId);
        if (!form) return;

        // Validate form
        const isValid = this.validateForm(formId);
        
        if (isValid) {
            const formData = this.getFormData(formId);
            
            if (form.config.onSubmit) {
                form.config.onSubmit(formData, form);
            }
            
            this.emit('form:submit', { formId, data: formData, form });
        } else {
            this.emit('form:validation-failed', { formId, errors: form.errors, form });
        }
    }

    // Validation
    validateForm(formId) {
        const form = this.forms.get(formId);
        if (!form) return false;

        let isValid = true;
        const allFields = this.getAllFields(form);

        allFields.forEach(field => {
            const fieldValid = this.validateField(formId, field.name);
            if (!fieldValid) isValid = false;
        });

        form.isValid = isValid;
        return isValid;
    }

    validateField(formId, fieldName) {
        const form = this.forms.get(formId);
        if (!form) return false;

        const field = this.findField(form, fieldName);
        if (!field) return true;

        const value = form.data[fieldName];
        const errors = [];

        // Built-in validators
        Object.keys(field).forEach(key => {
            const validator = this.validators.get(key);
            if (validator && !validator(value, field)) {
                errors.push(this.getValidationMessage(key, field));
            }
        });

        // Custom validator
        if (field.validator && typeof field.validator === 'function') {
            const result = field.validator(value, field, form);
            if (result !== true) {
                errors.push(typeof result === 'string' ? result : `Invalid ${field.label || fieldName}`);
            }
        }

        const error = errors.length > 0 ? errors[0] : null;
        form.errors.set(fieldName, error);
        this.updateFieldError(formId, fieldName, error);

        return errors.length === 0;
    }

    getValidationMessage(validatorKey, field) {
        const messages = {
            required: `${field.label || field.name} is required`,
            email: `${field.label || field.name} must be a valid email address`,
            minLength: `${field.label || field.name} must be at least ${field.minLength} characters`,
            maxLength: `${field.label || field.name} must not exceed ${field.maxLength} characters`,
            min: `${field.label || field.name} must be at least ${field.min}`,
            max: `${field.label || field.name} must not exceed ${field.max}`,
            pattern: `${field.label || field.name} format is invalid`
        };

        return messages[validatorKey] || `Invalid ${field.label || field.name}`;
    }

    updateFieldError(formId, fieldName, error) {
        const form = this.forms.get(formId);
        if (!form) return;

        const fieldContainer = form.container.querySelector(`[name="${fieldName}"]`)?.closest('.form-group');
        if (!fieldContainer) return;

        // Remove existing error
        const existingError = fieldContainer.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }

        // Add new error
        if (error) {
            const errorElement = document.createElement('div');
            errorElement.className = 'field-error';
            errorElement.textContent = error;
            fieldContainer.appendChild(errorElement);
        }
    }

    // Utility methods
    getAllFields(form) {
        let fields = [...(form.config.fields || [])];
        
        if (form.config.sections) {
            form.config.sections.forEach(section => {
                fields = fields.concat(section.fields || []);
            });
        }
        
        return fields;
    }

    findField(form, fieldName) {
        const allFields = this.getAllFields(form);
        return allFields.find(field => field.name === fieldName);
    }

    // Data management
    getFormData(formId) {
        const form = this.forms.get(formId);
        return form ? { ...form.data } : {};
    }

    setFormData(formId, data) {
        const form = this.forms.get(formId);
        if (!form) return;

        form.data = { ...form.data, ...data };
        this.renderForm(formId, form.data);
    }

    getFieldValue(formId, fieldName) {
        const form = this.forms.get(formId);
        return form ? form.data[fieldName] : undefined;
    }

    setFieldValue(formId, fieldName, value) {
        const form = this.forms.get(formId);
        if (!form) return;

        form.data[fieldName] = value;
        
        // Update UI
        const fieldElement = form.container.querySelector(`[name="${fieldName}"]`);
        if (fieldElement) {
            if (fieldElement.type === 'checkbox' || fieldElement.type === 'radio') {
                fieldElement.checked = fieldElement.value === value;
            } else {
                fieldElement.value = value;
            }
        }
    }

    resetForm(formId) {
        const form = this.forms.get(formId);
        if (!form) return;

        form.data = {};
        form.errors.clear();
        form.isDirty = false;
        form.isValid = false;

        this.renderForm(formId);
        this.emit('form:reset', { formId, form });
    }

    // Form state
    isFormValid(formId) {
        const form = this.forms.get(formId);
        return form ? form.isValid : false;
    }

    isFormDirty(formId) {
        const form = this.forms.get(formId);
        return form ? form.isDirty : false;
    }

    getFormErrors(formId) {
        const form = this.forms.get(formId);
        return form ? Object.fromEntries(form.errors) : {};
    }

    // Event emitter
    emit(eventType, data) {
        const event = new CustomEvent(eventType, {
            detail: data,
            bubbles: true
        });
        document.dispatchEvent(event);
    }

    // Cleanup
    destroyForm(formId) {
        this.forms.delete(formId);
    }

    destroy() {
        this.forms.clear();
        this.validators.clear();
        this.fieldTypes.clear();
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FormManager;
} else {
    window.FormManager = FormManager;
}