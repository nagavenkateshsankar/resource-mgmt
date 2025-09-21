/**
 * Template Builder - Drag and Drop Form Builder
 * Advanced form designer with field palette, property panel, and preview
 */

class TemplateBuilder {
    constructor() {
        this.currentTemplate = null;
        this.selectedField = null;
        this.draggedField = null;
        this.fieldTypes = this.getFieldTypes();
        this.isModalOpen = false;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupModalEventListeners();
    }

    // Open template builder modal
    openModal(templateData = null) {
        const modal = document.getElementById('template-builder-modal');
        if (!modal) {
            console.error('Template builder modal not found');
            return;
        }

        this.isModalOpen = true;
        modal.classList.add('active');
        document.body.classList.add('modal-open');

        // Initialize or load template
        if (templateData) {
            this.loadTemplate(templateData);
        } else {
            this.createNewTemplate();
        }

        // Initialize the builder components
        this.renderFieldPalette();
        this.initializeDragAndDrop();
        this.updateCanvasState();
    }

    // Close template builder modal
    closeModal() {
        const modal = document.getElementById('template-builder-modal');
        if (modal) {
            modal.classList.remove('active');
            document.body.classList.remove('modal-open');
        }
        this.isModalOpen = false;
        this.clearSelection();
    }

    setupModalEventListeners() {
        // Listen for modal open events
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-action="open-template-builder"]')) {
                e.preventDefault();
                this.openModal();
            }
        });

        // Modal close events
        document.addEventListener('click', (e) => {
            if (e.target.matches('#template-builder-modal .modal-close-btn') || 
                e.target.matches('#template-builder-modal [data-dismiss="modal"]')) {
                e.preventDefault();
                this.closeModal();
            }
        });

        // Save template events
        document.addEventListener('click', (e) => {
            if (e.target.matches('#save-template-btn')) {
                e.preventDefault();
                this.saveTemplate();
            }
            if (e.target.matches('#save-and-close-btn')) {
                e.preventDefault();
                this.saveTemplate(true);
            }
        });

        // Preview template events
        document.addEventListener('click', (e) => {
            if (e.target.matches('#preview-template-btn')) {
                e.preventDefault();
                this.previewTemplate();
            }
        });
    }

    createNewTemplate() {
        this.currentTemplate = {
            id: null,
            name: '',
            description: '',
            category: '',
            fields: [],
            version: '1.0',
            status: 'draft'
        };
        this.updateTemplateInfo();
    }

    loadTemplate(templateData) {
        this.currentTemplate = { ...templateData };
        this.updateTemplateInfo();
        this.renderFields();
    }

    updateTemplateInfo() {
        const nameInput = document.getElementById('template-name');
        const descInput = document.getElementById('template-description');
        const categorySelect = document.getElementById('template-category');
        const statusElement = document.getElementById('template-status');
        const versionElement = document.getElementById('template-version');

        if (nameInput) nameInput.value = this.currentTemplate.name || '';
        if (descInput) descInput.value = this.currentTemplate.description || '';
        if (categorySelect) categorySelect.value = this.currentTemplate.category || '';
        if (statusElement) statusElement.textContent = this.currentTemplate.status || 'Draft';
        if (versionElement) versionElement.textContent = `Version ${this.currentTemplate.version || '1.0'}`;
        
        this.updateFieldCount();
    }

    updateFieldCount() {
        const fieldCountElement = document.getElementById('field-count');
        if (fieldCountElement) {
            const count = this.currentTemplate?.fields?.length || 0;
            fieldCountElement.textContent = `${count} field${count !== 1 ? 's' : ''}`;
        }
    }

    updateCanvasState() {
        const canvas = document.getElementById('form-canvas');
        const dropZone = document.getElementById('canvas-drop-zone');
        
        if (!canvas || !dropZone) return;

        if (this.currentTemplate?.fields?.length > 0) {
            dropZone.querySelector('.drop-zone-placeholder')?.style.setProperty('display', 'none');
        } else {
            dropZone.querySelector('.drop-zone-placeholder')?.style.setProperty('display', 'flex');
        }
    }

    clearSelection() {
        this.selectedField = null;
        this.updatePropertiesPanel();
    }

    async saveTemplate(closeAfter = false) {
        if (!this.currentTemplate) return;

        // Get values from form
        const nameInput = document.getElementById('template-name');
        const descInput = document.getElementById('template-description');
        const categorySelect = document.getElementById('template-category');

        if (nameInput) this.currentTemplate.name = nameInput.value.trim();
        if (descInput) this.currentTemplate.description = descInput.value.trim();
        if (categorySelect) this.currentTemplate.category = categorySelect.value;

        // Validate required fields
        if (!this.currentTemplate.name) {
            alert('Please enter a template name');
            nameInput?.focus();
            return;
        }

        try {
            // Show saving status
            const saveStatus = document.getElementById('save-status');
            if (saveStatus) saveStatus.textContent = 'Saving...';

            // Save to API (mock for now)
            console.log('Saving template:', this.currentTemplate);
            
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            if (saveStatus) {
                saveStatus.textContent = 'Saved';
                setTimeout(() => saveStatus.textContent = '', 2000);
            }

            if (closeAfter) {
                this.closeModal();
            }
        } catch (error) {
            console.error('Failed to save template:', error);
            const saveStatus = document.getElementById('save-status');
            if (saveStatus) saveStatus.textContent = 'Save failed';
        }
    }

    previewTemplate() {
        if (!this.currentTemplate) return;

        const previewModal = document.getElementById('template-preview-modal');
        const previewContent = document.getElementById('template-preview-content');
        
        if (!previewModal || !previewContent) return;

        // Generate preview HTML
        let previewHTML = `<div class="template-preview-form">
            <h3>${this.currentTemplate.name || 'Untitled Template'}</h3>
            ${this.currentTemplate.description ? `<p class="template-description">${this.currentTemplate.description}</p>` : ''}
        `;

        if (this.currentTemplate.fields && this.currentTemplate.fields.length > 0) {
            previewHTML += '<div class="preview-fields">';
            this.currentTemplate.fields.forEach(field => {
                previewHTML += this.renderPreviewField(field);
            });
            previewHTML += '</div>';
        } else {
            previewHTML += '<p class="no-fields">No fields added to this template yet.</p>';
        }

        previewHTML += '</div>';
        previewContent.innerHTML = previewHTML;

        // Show preview modal
        previewModal.classList.add('active');
    }

    renderPreviewField(field) {
        // Simple preview rendering - can be enhanced
        return `<div class="preview-field">
            <label>${field.label || 'Field'}</label>
            <div class="field-preview">[${field.type.toUpperCase()} FIELD]</div>
        </div>`;
    }

    getFieldTypes() {
        return [
            {
                type: 'text',
                name: 'Text Input',
                icon: '📝',
                defaultProps: {
                    label: 'Text Field',
                    placeholder: 'Enter text...',
                    required: false,
                    maxLength: 255
                }
            },
            {
                type: 'textarea',
                name: 'Text Area',
                icon: '📄',
                defaultProps: {
                    label: 'Text Area',
                    placeholder: 'Enter details...',
                    required: false,
                    rows: 4
                }
            },
            {
                type: 'number',
                name: 'Number',
                icon: '🔢',
                defaultProps: {
                    label: 'Number Field',
                    placeholder: 'Enter number...',
                    required: false,
                    min: null,
                    max: null
                }
            },
            {
                type: 'select',
                name: 'Dropdown',
                icon: '📋',
                defaultProps: {
                    label: 'Select Option',
                    required: false,
                    options: ['Option 1', 'Option 2', 'Option 3']
                }
            },
            {
                type: 'radio',
                name: 'Radio Group',
                icon: '🔘',
                defaultProps: {
                    label: 'Radio Selection',
                    required: false,
                    options: ['Option 1', 'Option 2', 'Option 3']
                }
            },
            {
                type: 'checkbox',
                name: 'Checkboxes',
                icon: '☑️',
                defaultProps: {
                    label: 'Checkbox Group',
                    required: false,
                    options: ['Option 1', 'Option 2', 'Option 3']
                }
            },
            {
                type: 'date',
                name: 'Date Picker',
                icon: '📅',
                defaultProps: {
                    label: 'Date Field',
                    required: false
                }
            },
            {
                type: 'time',
                name: 'Time Picker',
                icon: '🕐',
                defaultProps: {
                    label: 'Time Field',
                    required: false
                }
            },
            {
                type: 'photo',
                name: 'Photo Upload',
                icon: '📷',
                defaultProps: {
                    label: 'Photo Field',
                    required: false,
                    multiple: false,
                    gpsTagging: true
                }
            },
            {
                type: 'signature',
                name: 'Digital Signature',
                icon: '✍️',
                defaultProps: {
                    label: 'Signature Field',
                    required: false
                }
            },
            {
                type: 'sketch',
                name: 'Sketch Pad',
                icon: '🎨',
                defaultProps: {
                    label: 'Sketch Field',
                    required: false,
                    width: 400,
                    height: 300
                }
            },
            {
                type: 'table',
                name: 'Data Table',
                icon: '📊',
                defaultProps: {
                    label: 'Data Table',
                    required: false,
                    columns: [
                        { name: 'Column 1', type: 'text' },
                        { name: 'Column 2', type: 'text' }
                    ],
                    minRows: 1,
                    maxRows: 10
                }
            },
            {
                type: 'calculation',
                name: 'Calculation',
                icon: '🧮',
                defaultProps: {
                    label: 'Calculated Field',
                    formula: '',
                    format: 'number'
                }
            },
            {
                type: 'section',
                name: 'Section Header',
                icon: '📑',
                defaultProps: {
                    title: 'Section Title',
                    description: 'Section description',
                    collapsible: false
                }
            },
            {
                type: 'rating',
                name: 'Rating Scale',
                icon: '⭐',
                defaultProps: {
                    label: 'Rating Field',
                    required: false,
                    maxRating: 5,
                    allowHalf: false
                }
            }
        ];
    }

    setupEventListeners() {
        // Template builder mode toggle
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-action="open-template-builder"]')) {
                this.openTemplateBuilder(e.target.dataset.templateId);
            }
            if (e.target.matches('[data-action="save-template"]')) {
                this.saveTemplate();
            }
            if (e.target.matches('[data-action="preview-template"]')) {
                this.previewTemplate();
            }
        });

        // Field selection
        document.addEventListener('click', (e) => {
            if (e.target.closest('[data-field-id]')) {
                const fieldElement = e.target.closest('[data-field-id]');
                this.selectField(fieldElement.dataset.fieldId);
            }
        });

        // Property panel updates
        document.addEventListener('input', (e) => {
            if (e.target.matches('[data-property]')) {
                this.updateFieldProperty(e.target.dataset.property, e.target.value, e.target.type);
            }
        });

        // Delete field
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-action="delete-field"]')) {
                this.deleteField(e.target.dataset.fieldId);
            }
        });
    }

    openTemplateBuilder(templateId = null) {
        // Show template builder modal
        const modal = this.createTemplateBuilderModal();
        document.body.appendChild(modal);
        
        if (templateId) {
            this.loadTemplate(templateId);
        } else {
            this.createNewTemplate();
        }
    }

    createTemplateBuilderModal() {
        const modal = document.createElement('div');
        modal.className = 'template-builder-modal';
        modal.innerHTML = `
            <div class="template-builder-overlay" data-action="close-template-builder"></div>
            <div class="template-builder-container">
                <div class="template-builder-header">
                    <div class="template-builder-title">
                        <h2>Template Builder</h2>
                        <div class="template-builder-actions">
                            <button class="btn btn-secondary" data-action="preview-template">
                                👁️ Preview
                            </button>
                            <button class="btn btn-primary" data-action="save-template">
                                💾 Save Template
                            </button>
                            <button class="btn btn-ghost" data-action="close-template-builder">
                                ✕
                            </button>
                        </div>
                    </div>
                    <div class="template-builder-meta">
                        <input type="text" id="template-name" placeholder="Template Name" class="form-control" />
                        <input type="text" id="template-description" placeholder="Template Description" class="form-control" />
                        <select id="template-category" class="form-control">
                            <option value="">Select Category</option>
                            <option value="safety">Safety</option>
                            <option value="quality">Quality</option>
                            <option value="environmental">Environmental</option>
                            <option value="equipment">Equipment</option>
                            <option value="maintenance">Maintenance</option>
                            <option value="compliance">Compliance</option>
                            <option value="commercial">Commercial</option>
                        </select>
                    </div>
                </div>
                
                <div class="template-builder-workspace">
                    <div class="template-builder-sidebar">
                        <div class="field-palette">
                            <h3>Field Types</h3>
                            <div class="field-palette-grid" id="field-palette">
                                ${this.renderFieldPaletteItems()}
                            </div>
                        </div>
                        
                        <div class="property-panel" id="property-panel">
                            <h3>Properties</h3>
                            <div class="property-panel-content">
                                <p class="text-muted">Select a field to edit its properties</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="template-builder-canvas">
                        <div class="canvas-header">
                            <h3>Form Canvas</h3>
                            <div class="canvas-tools">
                                <button class="btn btn-sm" data-action="add-section">+ Section</button>
                                <button class="btn btn-sm" data-action="clear-canvas">Clear All</button>
                            </div>
                        </div>
                        <div class="form-canvas" id="form-canvas">
                            <div class="canvas-drop-zone">
                                <p>Drag fields here to build your form</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        return modal;
    }

    renderFieldPaletteItems() {
        return this.fieldTypes.map(field => `
            <div class="field-palette-item" data-field-type="${field.type}" draggable="true">
                <div class="field-icon">${field.icon}</div>
                <div class="field-name">${field.name}</div>
            </div>
        `).join('');
    }

    initializeDragAndDrop() {
        document.addEventListener('dragstart', (e) => {
            if (e.target.matches('.field-palette-item')) {
                this.draggedField = {
                    type: e.target.dataset.fieldType,
                    ...this.fieldTypes.find(f => f.type === e.target.dataset.fieldType)
                };
                e.dataTransfer.effectAllowed = 'copy';
            }
        });

        document.addEventListener('dragover', (e) => {
            if (e.target.matches('.form-canvas, .canvas-drop-zone, .form-section')) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
            }
        });

        document.addEventListener('drop', (e) => {
            if (e.target.matches('.form-canvas, .canvas-drop-zone, .form-section')) {
                e.preventDefault();
                this.addFieldToCanvas(this.draggedField, e.target);
            }
        });
    }

    addFieldToCanvas(fieldType, targetElement) {
        const fieldId = 'field_' + Date.now();
        const field = {
            id: fieldId,
            type: fieldType.type,
            name: fieldId,
            ...fieldType.defaultProps
        };

        const fieldElement = this.createFieldElement(field);
        
        // Add to canvas
        const canvas = document.getElementById('form-canvas');
        if (canvas.querySelector('.canvas-drop-zone')) {
            canvas.removeChild(canvas.querySelector('.canvas-drop-zone'));
        }
        canvas.appendChild(fieldElement);

        // Add to template data
        if (!this.currentTemplate.sections) {
            this.currentTemplate.sections = [{
                name: 'Main Section',
                description: '',
                fields: []
            }];
        }
        
        this.currentTemplate.sections[0].fields.push(field);
        
        // Auto-select the new field
        this.selectField(fieldId);
    }

    createFieldElement(field) {
        const fieldElement = document.createElement('div');
        fieldElement.className = 'form-field-builder';
        fieldElement.dataset.fieldId = field.id;
        
        fieldElement.innerHTML = `
            <div class="field-controls">
                <button class="btn-field-control" data-action="move-up" title="Move Up">↑</button>
                <button class="btn-field-control" data-action="move-down" title="Move Down">↓</button>
                <button class="btn-field-control" data-action="duplicate-field" title="Duplicate">📋</button>
                <button class="btn-field-control btn-danger" data-action="delete-field" data-field-id="${field.id}" title="Delete">🗑️</button>
            </div>
            <div class="field-preview">
                ${this.renderFieldPreview(field)}
            </div>
        `;
        
        return fieldElement;
    }

    renderFieldPreview(field) {
        switch (field.type) {
            case 'text':
                return `
                    <label class="form-label">${field.label} ${field.required ? '*' : ''}</label>
                    <input type="text" class="form-control" placeholder="${field.placeholder}" disabled />
                `;
            
            case 'textarea':
                return `
                    <label class="form-label">${field.label} ${field.required ? '*' : ''}</label>
                    <textarea class="form-control" placeholder="${field.placeholder}" rows="${field.rows}" disabled></textarea>
                `;
            
            case 'number':
                return `
                    <label class="form-label">${field.label} ${field.required ? '*' : ''}</label>
                    <input type="number" class="form-control" placeholder="${field.placeholder}" min="${field.min || ''}" max="${field.max || ''}" disabled />
                `;
            
            case 'select':
                return `
                    <label class="form-label">${field.label} ${field.required ? '*' : ''}</label>
                    <select class="form-control" disabled>
                        <option>Choose option...</option>
                        ${field.options.map(option => `<option>${option}</option>`).join('')}
                    </select>
                `;
            
            case 'radio':
                return `
                    <fieldset class="form-fieldset">
                        <legend class="form-label">${field.label} ${field.required ? '*' : ''}</legend>
                        ${field.options.map((option, index) => `
                            <label class="form-radio">
                                <input type="radio" name="${field.name}" value="${option}" disabled />
                                <span>${option}</span>
                            </label>
                        `).join('')}
                    </fieldset>
                `;
            
            case 'checkbox':
                return `
                    <fieldset class="form-fieldset">
                        <legend class="form-label">${field.label} ${field.required ? '*' : ''}</legend>
                        ${field.options.map((option, index) => `
                            <label class="form-checkbox">
                                <input type="checkbox" value="${option}" disabled />
                                <span>${option}</span>
                            </label>
                        `).join('')}
                    </fieldset>
                `;
            
            case 'date':
                return `
                    <label class="form-label">${field.label} ${field.required ? '*' : ''}</label>
                    <input type="date" class="form-control" disabled />
                `;
            
            case 'time':
                return `
                    <label class="form-label">${field.label} ${field.required ? '*' : ''}</label>
                    <input type="time" class="form-control" disabled />
                `;
            
            case 'photo':
                return `
                    <label class="form-label">${field.label} ${field.required ? '*' : ''}</label>
                    <div class="photo-upload-preview">
                        <div class="photo-upload-placeholder">
                            📷 Photo Upload Area
                            ${field.gpsTagging ? '<br><small>📍 GPS tagging enabled</small>' : ''}
                        </div>
                    </div>
                `;
            
            case 'signature':
                return `
                    <label class="form-label">${field.label} ${field.required ? '*' : ''}</label>
                    <div class="signature-pad-preview">
                        ✍️ Digital Signature Area
                    </div>
                `;
            
            case 'sketch':
                return `
                    <label class="form-label">${field.label} ${field.required ? '*' : ''}</label>
                    <div class="sketch-pad-preview" style="width: ${field.width}px; height: ${field.height}px;">
                        🎨 Sketch Pad Area
                    </div>
                `;
            
            case 'rating':
                return `
                    <label class="form-label">${field.label} ${field.required ? '*' : ''}</label>
                    <div class="rating-preview">
                        ${'⭐'.repeat(field.maxRating)}
                    </div>
                `;
            
            case 'section':
                return `
                    <div class="section-header-preview">
                        <h3>${field.title}</h3>
                        ${field.description ? `<p>${field.description}</p>` : ''}
                    </div>
                `;
            
            default:
                return `<div class="field-preview-placeholder">Field Type: ${field.type}</div>`;
        }
    }

    selectField(fieldId) {
        // Remove previous selection
        document.querySelectorAll('.form-field-builder.selected').forEach(el => {
            el.classList.remove('selected');
        });
        
        // Add selection to new field
        const fieldElement = document.querySelector(`[data-field-id="${fieldId}"]`);
        if (fieldElement) {
            fieldElement.classList.add('selected');
        }
        
        // Find field in template data
        const field = this.findFieldById(fieldId);
        if (field) {
            this.selectedField = field;
            this.renderPropertyPanel(field);
        }
    }

    findFieldById(fieldId) {
        if (!this.currentTemplate.sections) return null;
        
        for (const section of this.currentTemplate.sections) {
            const field = section.fields.find(f => f.id === fieldId);
            if (field) return field;
        }
        return null;
    }

    renderPropertyPanel(field) {
        const panel = document.querySelector('.property-panel-content');
        if (!panel) return;
        
        const fieldTypeInfo = this.fieldTypes.find(f => f.type === field.type);
        
        panel.innerHTML = `
            <div class="property-group">
                <label class="property-label">Field Type</label>
                <div class="property-value">
                    ${fieldTypeInfo.icon} ${fieldTypeInfo.name}
                </div>
            </div>
            
            <div class="property-group">
                <label class="property-label">Field ID</label>
                <input type="text" class="form-control" value="${field.id}" data-property="id" />
            </div>
            
            <div class="property-group">
                <label class="property-label">Label</label>
                <input type="text" class="form-control" value="${field.label || ''}" data-property="label" />
            </div>
            
            ${field.type !== 'section' ? `
                <div class="property-group">
                    <label class="property-label">Required</label>
                    <label class="form-checkbox">
                        <input type="checkbox" ${field.required ? 'checked' : ''} data-property="required" />
                        <span>This field is required</span>
                    </label>
                </div>
            ` : ''}
            
            ${this.renderTypeSpecificProperties(field)}
            
            <div class="property-group">
                <button class="btn btn-danger btn-sm" data-action="delete-field" data-field-id="${field.id}">
                    🗑️ Delete Field
                </button>
            </div>
        `;
    }

    renderTypeSpecificProperties(field) {
        switch (field.type) {
            case 'text':
                return `
                    <div class="property-group">
                        <label class="property-label">Placeholder</label>
                        <input type="text" class="form-control" value="${field.placeholder || ''}" data-property="placeholder" />
                    </div>
                    <div class="property-group">
                        <label class="property-label">Max Length</label>
                        <input type="number" class="form-control" value="${field.maxLength || ''}" data-property="maxLength" />
                    </div>
                `;
            
            case 'textarea':
                return `
                    <div class="property-group">
                        <label class="property-label">Placeholder</label>
                        <input type="text" class="form-control" value="${field.placeholder || ''}" data-property="placeholder" />
                    </div>
                    <div class="property-group">
                        <label class="property-label">Rows</label>
                        <input type="number" class="form-control" value="${field.rows || 4}" data-property="rows" />
                    </div>
                `;
            
            case 'number':
                return `
                    <div class="property-group">
                        <label class="property-label">Placeholder</label>
                        <input type="text" class="form-control" value="${field.placeholder || ''}" data-property="placeholder" />
                    </div>
                    <div class="property-group">
                        <label class="property-label">Minimum Value</label>
                        <input type="number" class="form-control" value="${field.min || ''}" data-property="min" />
                    </div>
                    <div class="property-group">
                        <label class="property-label">Maximum Value</label>
                        <input type="number" class="form-control" value="${field.max || ''}" data-property="max" />
                    </div>
                `;
            
            case 'select':
            case 'radio':
            case 'checkbox':
                return `
                    <div class="property-group">
                        <label class="property-label">Options</label>
                        <div class="options-editor">
                            ${(field.options || []).map((option, index) => `
                                <div class="option-row">
                                    <input type="text" class="form-control" value="${option}" data-property="options" data-index="${index}" />
                                    <button type="button" class="btn btn-sm btn-danger" data-action="remove-option" data-index="${index}">×</button>
                                </div>
                            `).join('')}
                            <button type="button" class="btn btn-sm btn-secondary" data-action="add-option">+ Add Option</button>
                        </div>
                    </div>
                `;
            
            case 'photo':
                return `
                    <div class="property-group">
                        <label class="property-label">Multiple Photos</label>
                        <label class="form-checkbox">
                            <input type="checkbox" ${field.multiple ? 'checked' : ''} data-property="multiple" />
                            <span>Allow multiple photos</span>
                        </label>
                    </div>
                    <div class="property-group">
                        <label class="property-label">GPS Tagging</label>
                        <label class="form-checkbox">
                            <input type="checkbox" ${field.gpsTagging ? 'checked' : ''} data-property="gpsTagging" />
                            <span>Enable GPS tagging</span>
                        </label>
                    </div>
                `;
            
            case 'rating':
                return `
                    <div class="property-group">
                        <label class="property-label">Maximum Rating</label>
                        <input type="number" class="form-control" value="${field.maxRating || 5}" data-property="maxRating" min="1" max="10" />
                    </div>
                    <div class="property-group">
                        <label class="property-label">Allow Half Ratings</label>
                        <label class="form-checkbox">
                            <input type="checkbox" ${field.allowHalf ? 'checked' : ''} data-property="allowHalf" />
                            <span>Allow half-star ratings</span>
                        </label>
                    </div>
                `;
            
            case 'section':
                return `
                    <div class="property-group">
                        <label class="property-label">Title</label>
                        <input type="text" class="form-control" value="${field.title || ''}" data-property="title" />
                    </div>
                    <div class="property-group">
                        <label class="property-label">Description</label>
                        <textarea class="form-control" data-property="description" rows="3">${field.description || ''}</textarea>
                    </div>
                    <div class="property-group">
                        <label class="property-label">Collapsible</label>
                        <label class="form-checkbox">
                            <input type="checkbox" ${field.collapsible ? 'checked' : ''} data-property="collapsible" />
                            <span>Make section collapsible</span>
                        </label>
                    </div>
                `;
            
            default:
                return '';
        }
    }

    updateFieldProperty(property, value, inputType) {
        if (!this.selectedField) return;
        
        // Convert value based on input type
        if (inputType === 'checkbox') {
            value = document.querySelector(`[data-property="${property}"]`).checked;
        } else if (inputType === 'number') {
            value = value ? parseInt(value) : null;
        }
        
        // Special handling for options
        if (property === 'options') {
            const index = parseInt(document.querySelector(`[data-property="${property}"]`).dataset.index);
            if (!this.selectedField.options) this.selectedField.options = [];
            this.selectedField.options[index] = value;
        } else {
            this.selectedField[property] = value;
        }
        
        // Update preview
        this.updateFieldPreview(this.selectedField);
    }

    updateFieldPreview(field) {
        const fieldElement = document.querySelector(`[data-field-id="${field.id}"] .field-preview`);
        if (fieldElement) {
            fieldElement.innerHTML = this.renderFieldPreview(field);
        }
    }

    async saveTemplate() {
        const name = document.getElementById('template-name')?.value;
        const description = document.getElementById('template-description')?.value;
        const category = document.getElementById('template-category')?.value;
        
        if (!name) {
            alert('Please enter a template name');
            return;
        }
        
        const templateData = {
            name: name,
            description: description,
            category: category,
            fields_schema: this.currentTemplate
        };
        
        try {
            const response = await fetch('/api/v1/templates', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                },
                body: JSON.stringify(templateData)
            });
            
            if (response.ok) {
                alert('Template saved successfully!');
                this.closeTemplateBuilder();
                // Refresh templates list if visible
                window.dispatchEvent(new CustomEvent('templates-updated'));
            } else {
                const error = await response.json();
                alert('Error saving template: ' + (error.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error saving template:', error);
            alert('Error saving template: ' + error.message);
        }
    }

    previewTemplate() {
        const previewModal = this.createPreviewModal();
        document.body.appendChild(previewModal);
    }

    createPreviewModal() {
        const modal = document.createElement('div');
        modal.className = 'template-preview-modal';
        modal.innerHTML = `
            <div class="modal-overlay" data-action="close-preview"></div>
            <div class="modal-container">
                <div class="modal-header">
                    <h3>Template Preview</h3>
                    <button class="btn-close" data-action="close-preview">×</button>
                </div>
                <div class="modal-body">
                    <div class="form-preview">
                        ${this.renderTemplatePreview()}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" data-action="close-preview">Close</button>
                </div>
            </div>
        `;
        
        modal.addEventListener('click', (e) => {
            if (e.target.matches('[data-action="close-preview"]')) {
                modal.remove();
            }
        });
        
        return modal;
    }

    renderTemplatePreview() {
        if (!this.currentTemplate.sections || this.currentTemplate.sections.length === 0) {
            return '<p>No fields added to template yet.</p>';
        }
        
        return this.currentTemplate.sections.map(section => `
            <div class="form-section-preview">
                ${section.name !== 'Main Section' ? `<h4>${section.name}</h4>` : ''}
                ${section.description ? `<p>${section.description}</p>` : ''}
                ${section.fields.map(field => `
                    <div class="form-field-preview">
                        ${this.renderFieldPreview(field)}
                    </div>
                `).join('')}
            </div>
        `).join('');
    }

    createNewTemplate() {
        this.currentTemplate = {
            sections: []
        };
    }

    async loadTemplate(templateId) {
        try {
            const response = await fetch(`/api/v1/templates/${templateId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                }
            });
            
            if (response.ok) {
                const template = await response.json();
                this.currentTemplate = template.fields_schema || { sections: [] };
                
                // Populate form fields
                document.getElementById('template-name').value = template.name;
                document.getElementById('template-description').value = template.description || '';
                document.getElementById('template-category').value = template.category || '';
                
                // Render template on canvas
                this.renderTemplateOnCanvas();
            }
        } catch (error) {
            console.error('Error loading template:', error);
            alert('Error loading template: ' + error.message);
        }
    }

    renderTemplateOnCanvas() {
        const canvas = document.getElementById('form-canvas');
        canvas.innerHTML = '';
        
        if (!this.currentTemplate.sections || this.currentTemplate.sections.length === 0) {
            canvas.innerHTML = '<div class="canvas-drop-zone"><p>Drag fields here to build your form</p></div>';
            return;
        }
        
        this.currentTemplate.sections.forEach(section => {
            section.fields.forEach(field => {
                const fieldElement = this.createFieldElement(field);
                canvas.appendChild(fieldElement);
            });
        });
    }

    deleteField(fieldId) {
        if (!confirm('Are you sure you want to delete this field?')) return;
        
        // Remove from template data
        if (this.currentTemplate.sections) {
            this.currentTemplate.sections.forEach(section => {
                section.fields = section.fields.filter(f => f.id !== fieldId);
            });
        }
        
        // Remove from DOM
        const fieldElement = document.querySelector(`[data-field-id="${fieldId}"]`);
        if (fieldElement) {
            fieldElement.remove();
        }
        
        // Clear property panel if this field was selected
        if (this.selectedField?.id === fieldId) {
            this.selectedField = null;
            document.querySelector('.property-panel-content').innerHTML = 
                '<p class="text-muted">Select a field to edit its properties</p>';
        }
    }

    closeTemplateBuilder() {
        const modal = document.querySelector('.template-builder-modal');
        if (modal) {
            modal.remove();
        }
    }
}

// Initialize Template Builder
window.templateBuilder = new TemplateBuilder();