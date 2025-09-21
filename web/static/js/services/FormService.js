/**
 * Form Service
 * Handles form validation, serialization, and state management
 */

class FormService {
    constructor() {
        this.forms = new Map();
        this.validators = new Map();
        this.defaultRules = {
            required: (value) => value !== null && value !== undefined && value.toString().trim() !== '',
            email: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
            minLength: (value, min) => value && value.length >= min,
            maxLength: (value, max) => value && value.length <= max,
            min: (value, min) => Number(value) >= min,
            max: (value, max) => Number(value) <= max,
            pattern: (value, pattern) => new RegExp(pattern).test(value)
        };
        
        this.init();
    }

    init() {
        console.log('FormService initialized');
    }

    // Register a form
    register(formId, options = {}) {
        const formElement = document.getElementById(formId);
        if (!formElement) {
            throw new Error(`Form element with id '${formId}' not found`);
        }

        const form = {
            id: formId,
            element: formElement,
            fields: new Map(),
            validators: new Map(),
            options: {
                validateOnChange: true,
                validateOnBlur: true,
                showErrors: true,
                ...options
            },
            errors: new Map(),
            isValid: false
        };

        this.forms.set(formId, form);
        this.setupFormListeners(form);
        
        return form;
    }

    // Add field validation rules
    addField(formId, fieldName, rules = {}) {
        const form = this.forms.get(formId);
        if (!form) throw new Error(`Form '${formId}' not registered`);

        const fieldElement = form.element.querySelector(`[name="${fieldName}"]`);
        if (!fieldElement) {
            console.warn(`Field '${fieldName}' not found in form '${formId}'`);
        }

        form.fields.set(fieldName, {
            name: fieldName,
            element: fieldElement,
            rules,
            value: fieldElement?.value || '',
            errors: []
        });

        if (fieldElement) {
            this.setupFieldListeners(form, fieldName);
        }
    }

    setupFormListeners(form) {
        form.element.addEventListener('submit', (e) => {
            e.preventDefault();
            this.validateForm(form.id);
            
            if (form.isValid && form.options.onSubmit) {
                form.options.onSubmit(this.serialize(form.id), form);
            }
        });
    }

    setupFieldListeners(form, fieldName) {
        const field = form.fields.get(fieldName);
        if (!field.element) return;

        if (form.options.validateOnChange) {
            field.element.addEventListener('input', () => {
                this.validateField(form.id, fieldName);
            });
        }

        if (form.options.validateOnBlur) {
            field.element.addEventListener('blur', () => {
                this.validateField(form.id, fieldName);
            });
        }
    }

    // Validate single field
    validateField(formId, fieldName) {
        const form = this.forms.get(formId);
        if (!form) return false;

        const field = form.fields.get(fieldName);
        if (!field) return false;

        const value = field.element ? field.element.value : field.value;
        const errors = [];

        // Apply validation rules
        Object.entries(field.rules).forEach(([rule, ruleValue]) => {
            const validator = this.defaultRules[rule];
            if (!validator) {
                console.warn(`Unknown validation rule: ${rule}`);
                return;
            }

            let isValid;
            if (typeof ruleValue === 'boolean' && ruleValue) {
                isValid = validator(value);
            } else {
                isValid = validator(value, ruleValue);
            }

            if (!isValid) {
                errors.push(this.getErrorMessage(rule, ruleValue, fieldName));
            }
        });

        // Custom validators
        if (form.validators.has(fieldName)) {
            const customValidator = form.validators.get(fieldName);
            try {
                const result = customValidator(value, field, form);
                if (result !== true) {
                    errors.push(typeof result === 'string' ? result : `Invalid ${fieldName}`);
                }
            } catch (error) {
                console.error('Custom validator error:', error);
                errors.push(`Validation error for ${fieldName}`);
            }
        }

        field.errors = errors;
        field.isValid = errors.length === 0;

        // Update UI
        if (form.options.showErrors) {
            this.updateFieldErrorDisplay(form, fieldName);
        }

        // Update form validity
        this.updateFormValidity(form);

        return field.isValid;
    }

    // Validate entire form
    validateForm(formId) {
        const form = this.forms.get(formId);
        if (!form) return false;

        let isValid = true;

        // Validate all fields
        form.fields.forEach((field, fieldName) => {
            const fieldValid = this.validateField(formId, fieldName);
            if (!fieldValid) isValid = false;
        });

        form.isValid = isValid;
        return isValid;
    }

    updateFormValidity(form) {
        let isValid = true;
        form.fields.forEach((field) => {
            if (!field.isValid) isValid = false;
        });
        form.isValid = isValid;
    }

    updateFieldErrorDisplay(form, fieldName) {
        const field = form.fields.get(fieldName);
        if (!field.element) return;

        // Remove existing error displays
        const existingErrors = field.element.parentNode.querySelectorAll('.form-error');
        existingErrors.forEach(error => error.remove());

        // Remove error class
        field.element.classList.remove('error', 'invalid');

        // Add errors if any
        if (field.errors.length > 0) {
            field.element.classList.add('error', 'invalid');

            const errorContainer = document.createElement('div');
            errorContainer.className = 'form-error';
            errorContainer.innerHTML = field.errors.map(error => 
                `<span class="error-message">${error}</span>`
            ).join('');

            field.element.parentNode.appendChild(errorContainer);
        }
    }

    getErrorMessage(rule, ruleValue, fieldName) {
        const messages = {
            required: `${fieldName} is required`,
            email: `${fieldName} must be a valid email address`,
            minLength: `${fieldName} must be at least ${ruleValue} characters`,
            maxLength: `${fieldName} must not exceed ${ruleValue} characters`,
            min: `${fieldName} must be at least ${ruleValue}`,
            max: `${fieldName} must not exceed ${ruleValue}`,
            pattern: `${fieldName} format is invalid`
        };

        return messages[rule] || `Invalid ${fieldName}`;
    }

    // Add custom validator for a field
    addValidator(formId, fieldName, validator) {
        const form = this.forms.get(formId);
        if (!form) throw new Error(`Form '${formId}' not registered`);

        form.validators.set(fieldName, validator);
    }

    // Add global validator
    addGlobalValidator(name, validator) {
        this.defaultRules[name] = validator;
    }

    // Form data handling
    serialize(formId) {
        const form = this.forms.get(formId);
        if (!form) return {};

        const data = {};

        // Get data from registered fields
        form.fields.forEach((field, fieldName) => {
            if (field.element) {
                if (field.element.type === 'checkbox') {
                    data[fieldName] = field.element.checked;
                } else if (field.element.type === 'radio') {
                    if (field.element.checked) {
                        data[fieldName] = field.element.value;
                    }
                } else {
                    data[fieldName] = field.element.value;
                }
            } else {
                data[fieldName] = field.value;
            }
        });

        // Get data from other form elements
        const formData = new FormData(form.element);
        for (const [key, value] of formData.entries()) {
            if (!data.hasOwnProperty(key)) {
                data[key] = value;
            }
        }

        return data;
    }

    populate(formId, data) {
        const form = this.forms.get(formId);
        if (!form) return;

        Object.entries(data).forEach(([fieldName, value]) => {
            const field = form.fields.get(fieldName);
            
            if (field && field.element) {
                if (field.element.type === 'checkbox') {
                    field.element.checked = Boolean(value);
                } else if (field.element.type === 'radio') {
                    if (field.element.value === value) {
                        field.element.checked = true;
                    }
                } else {
                    field.element.value = value;
                }
                field.value = value;
            } else {
                // Try to find element by name
                const element = form.element.querySelector(`[name="${fieldName}"]`);
                if (element) {
                    if (element.type === 'checkbox') {
                        element.checked = Boolean(value);
                    } else {
                        element.value = value;
                    }
                }
            }
        });
    }

    // Reset form
    reset(formId) {
        const form = this.forms.get(formId);
        if (!form) return;

        form.element.reset();

        // Clear field errors and values
        form.fields.forEach((field, fieldName) => {
            field.errors = [];
            field.isValid = true;
            field.value = '';
            
            if (form.options.showErrors) {
                this.updateFieldErrorDisplay(form, fieldName);
            }
        });

        form.isValid = false;
    }

    // Clear errors
    clearErrors(formId, fieldName = null) {
        const form = this.forms.get(formId);
        if (!form) return;

        if (fieldName) {
            const field = form.fields.get(fieldName);
            if (field) {
                field.errors = [];
                field.isValid = true;
                this.updateFieldErrorDisplay(form, fieldName);
            }
        } else {
            form.fields.forEach((field, name) => {
                field.errors = [];
                field.isValid = true;
                this.updateFieldErrorDisplay(form, name);
            });
        }

        this.updateFormValidity(form);
    }

    // Get form state
    getFormState(formId) {
        const form = this.forms.get(formId);
        if (!form) return null;

        return {
            isValid: form.isValid,
            data: this.serialize(formId),
            errors: this.getFormErrors(formId)
        };
    }

    getFormErrors(formId) {
        const form = this.forms.get(formId);
        if (!form) return {};

        const errors = {};
        form.fields.forEach((field, fieldName) => {
            if (field.errors.length > 0) {
                errors[fieldName] = field.errors;
            }
        });

        return errors;
    }

    // Utility methods
    isFormValid(formId) {
        const form = this.forms.get(formId);
        return form ? form.isValid : false;
    }

    hasErrors(formId, fieldName = null) {
        const form = this.forms.get(formId);
        if (!form) return false;

        if (fieldName) {
            const field = form.fields.get(fieldName);
            return field ? field.errors.length > 0 : false;
        }

        return !form.isValid;
    }

    // Cleanup
    unregister(formId) {
        const form = this.forms.get(formId);
        if (form) {
            // Remove event listeners if needed
            this.forms.delete(formId);
        }
    }

    destroy() {
        this.forms.clear();
        this.validators.clear();
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FormService;
} else {
    window.FormService = FormService;
}