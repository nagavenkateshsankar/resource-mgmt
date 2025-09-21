/**
 * Modal Management System
 * Handles modal lifecycle, stacking, and interactions
 */

class ModalManager {
    constructor() {
        this.modals = new Map();
        this.activeModals = [];
        this.zIndexBase = 10000;
        this.bodyScrollPosition = 0;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.registerExistingModals();
        console.log('ModalManager initialized');
    }

    setupEventListeners() {
        // Global event delegation for modal triggers
        document.addEventListener('click', this.handleGlobalClick.bind(this));
        document.addEventListener('keydown', this.handleKeydown.bind(this));
        
        // Handle data attributes
        document.addEventListener('click', (event) => {
            const trigger = event.target.closest('[data-modal-trigger]');
            if (trigger) {
                event.preventDefault();
                const modalId = trigger.getAttribute('data-modal-trigger');
                this.show(modalId);
            }
            
            const closer = event.target.closest('[data-modal-close]');
            if (closer) {
                event.preventDefault();
                const modalId = closer.getAttribute('data-modal-close');
                if (modalId) {
                    this.hide(modalId);
                } else {
                    this.hideTop();
                }
            }
        });
    }

    registerExistingModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            this.register(modal.id, modal);
        });
    }

    // Modal registration
    register(id, element, options = {}) {
        if (!element) {
            element = document.getElementById(id);
        }
        
        if (!element) {
            console.warn(`Modal element not found: ${id}`);
            return;
        }
        
        const modalConfig = {
            id,
            element,
            options: {
                backdrop: true,
                keyboard: true,
                focus: true,
                ...options
            },
            isVisible: false
        };
        
        this.modals.set(id, modalConfig);
        this.setupModalElement(element, modalConfig);
        
        return modalConfig;
    }

    setupModalElement(element, config) {
        // Add necessary attributes
        element.setAttribute('role', 'dialog');
        element.setAttribute('aria-modal', 'true');
        element.setAttribute('aria-hidden', 'true');
        
        if (!element.getAttribute('aria-labelledby')) {
            const title = element.querySelector('.modal-title');
            if (title) {
                title.id = title.id || `${config.id}-title`;
                element.setAttribute('aria-labelledby', title.id);
            }
        }
        
        // Setup backdrop clicks
        const backdrop = element.querySelector('.modal-backdrop');
        if (backdrop && config.options.backdrop) {
            backdrop.addEventListener('click', () => {
                this.hide(config.id);
            });
        }
    }

    // Show modal
    show(id, data = {}) {
        const config = this.modals.get(id);
        if (!config) {
            console.error(`Modal not found: ${id}`);
            return false;
        }

        if (config.isVisible) {
            console.warn(`Modal already visible: ${id}`);
            return true;
        }

        try {
            // Prepare modal
            this.prepareModal(config, data);
            
            // Add to active stack
            this.activeModals.push(id);
            
            // Lock body scroll if first modal
            if (this.activeModals.length === 1) {
                this.lockBodyScroll();
            }
            
            // Set z-index for stacking
            const zIndex = this.zIndexBase + this.activeModals.length * 10;
            config.element.style.zIndex = zIndex;
            
            // Show modal
            config.element.classList.add('active');
            config.element.setAttribute('aria-hidden', 'false');
            config.isVisible = true;
            
            // Focus management
            if (config.options.focus) {
                this.focusModal(config);
            }
            
            // Animation
            this.animateIn(config);
            
            // Emit events
            this.emit('modal:show', { id, modal: config, data });
            this.emit(`modal:show:${id}`, { modal: config, data });
            
            return true;
            
        } catch (error) {
            console.error('Error showing modal:', error);
            return false;
        }
    }

    // Hide modal
    hide(id) {
        const config = this.modals.get(id);
        if (!config || !config.isVisible) {
            return false;
        }

        try {
            // Remove from active stack
            const index = this.activeModals.indexOf(id);
            if (index > -1) {
                this.activeModals.splice(index, 1);
            }
            
            // Animation out
            this.animateOut(config);
            
            // Actually hide after animation
            setTimeout(() => {
                config.element.classList.remove('active');
                config.element.setAttribute('aria-hidden', 'true');
                config.isVisible = false;
                
                // Restore focus to previous element
                this.restoreFocus(config);
                
                // Unlock body scroll if no modals left
                if (this.activeModals.length === 0) {
                    this.unlockBodyScroll();
                }
                
                // Emit events
                this.emit('modal:hide', { id, modal: config });
                this.emit(`modal:hide:${id}`, { modal: config });
                
            }, 300); // Match CSS animation duration
            
            return true;
            
        } catch (error) {
            console.error('Error hiding modal:', error);
            return false;
        }
    }

    // Hide top modal
    hideTop() {
        if (this.activeModals.length > 0) {
            const topModal = this.activeModals[this.activeModals.length - 1];
            return this.hide(topModal);
        }
        return false;
    }

    // Hide all modals
    hideAll() {
        const activeModals = [...this.activeModals];
        activeModals.forEach(id => this.hide(id));
    }

    // Toggle modal
    toggle(id, data = {}) {
        const config = this.modals.get(id);
        if (!config) return false;
        
        return config.isVisible ? this.hide(id) : this.show(id, data);
    }

    // Modal preparation
    prepareModal(config, data) {
        // Store previous focus
        config.previousFocus = document.activeElement;
        
        // Pass data to modal
        if (data && Object.keys(data).length > 0) {
            this.populateModalData(config, data);
        }
        
        // Custom prepare hook
        if (config.options.onPrepare) {
            config.options.onPrepare(config, data);
        }
    }

    populateModalData(config, data) {
        const element = config.element;
        
        // Update title
        if (data.title) {
            const titleElement = element.querySelector('.modal-title');
            if (titleElement) titleElement.textContent = data.title;
        }
        
        // Update body
        if (data.body || data.content) {
            const bodyElement = element.querySelector('.modal-body');
            if (bodyElement) {
                bodyElement.innerHTML = data.body || data.content;
            }
        }
        
        // Update buttons
        if (data.buttons) {
            this.updateModalButtons(element, data.buttons);
        }
    }

    updateModalButtons(element, buttons) {
        const footer = element.querySelector('.modal-footer');
        if (!footer) return;
        
        footer.innerHTML = buttons.map(button => `
            <button type="button" 
                    class="btn ${button.class || 'btn-secondary'}" 
                    ${button.action ? `data-action="${button.action}"` : ''}
                    ${button.dismiss ? `data-modal-close="${element.id}"` : ''}>
                ${button.text}
            </button>
        `).join('');
    }

    // Focus management
    focusModal(config) {
        // Find first focusable element
        const focusable = config.element.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        if (focusable.length > 0) {
            setTimeout(() => focusable[0].focus(), 100);
        }
    }

    restoreFocus(config) {
        if (config.previousFocus && typeof config.previousFocus.focus === 'function') {
            setTimeout(() => config.previousFocus.focus(), 100);
        }
    }

    // Body scroll management
    lockBodyScroll() {
        this.bodyScrollPosition = window.pageYOffset;
        document.body.style.position = 'fixed';
        document.body.style.top = `-${this.bodyScrollPosition}px`;
        document.body.style.width = '100%';
        document.body.classList.add('modal-open');
    }

    unlockBodyScroll() {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.classList.remove('modal-open');
        window.scrollTo(0, this.bodyScrollPosition);
    }

    // Animations
    animateIn(config) {
        const dialog = config.element.querySelector('.modal-dialog');
        if (dialog) {
            dialog.style.animation = 'modalSlideIn 0.3s ease';
        }
    }

    animateOut(config) {
        const dialog = config.element.querySelector('.modal-dialog');
        if (dialog) {
            dialog.style.animation = 'modalSlideOut 0.3s ease';
        }
    }

    // Event handling
    handleGlobalClick(event) {
        // Handle backdrop clicks
        if (event.target.classList.contains('modal') && this.activeModals.length > 0) {
            const topModalId = this.activeModals[this.activeModals.length - 1];
            const config = this.modals.get(topModalId);
            if (config && config.options.backdrop) {
                this.hide(topModalId);
            }
        }
    }

    handleKeydown(event) {
        if (event.key === 'Escape' && this.activeModals.length > 0) {
            const topModalId = this.activeModals[this.activeModals.length - 1];
            const config = this.modals.get(topModalId);
            if (config && config.options.keyboard) {
                this.hide(topModalId);
            }
        }
        
        // Trap focus in modal
        if (event.key === 'Tab' && this.activeModals.length > 0) {
            this.handleTabKey(event);
        }
    }

    handleTabKey(event) {
        const topModalId = this.activeModals[this.activeModals.length - 1];
        const modal = document.getElementById(topModalId);
        if (!modal) return;
        
        const focusableElements = modal.querySelectorAll(
            'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"]):not(:disabled)'
        );
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        if (event.shiftKey) {
            if (document.activeElement === firstElement) {
                event.preventDefault();
                lastElement.focus();
            }
        } else {
            if (document.activeElement === lastElement) {
                event.preventDefault();
                firstElement.focus();
            }
        }
    }

    // Event emitter
    emit(eventType, data = {}) {
        const event = new CustomEvent(eventType, {
            detail: data,
            bubbles: true,
            cancelable: true
        });
        document.dispatchEvent(event);
    }

    // Dynamic modal creation
    create(id, options = {}) {
        const modalHtml = `
            <div class="modal" id="${id}" data-modal="${id}">
                <div class="modal-backdrop"></div>
                <div class="modal-dialog ${options.size ? `modal-${options.size}` : ''}">
                    <div class="modal-content">
                        ${options.showHeader !== false ? `
                            <div class="modal-header">
                                <h5 class="modal-title">${options.title || 'Modal'}</h5>
                                <button type="button" class="modal-close" data-modal-close="${id}">
                                    <span>&times;</span>
                                </button>
                            </div>
                        ` : ''}
                        <div class="modal-body">
                            ${options.content || ''}
                        </div>
                        ${options.showFooter !== false ? `
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-modal-close="${id}">Close</button>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
        
        // Add to DOM
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = modalHtml;
        const modalElement = tempDiv.firstElementChild;
        document.body.appendChild(modalElement);
        
        // Register modal
        return this.register(id, modalElement, options);
    }

    // Utility methods
    isVisible(id) {
        const config = this.modals.get(id);
        return config ? config.isVisible : false;
    }

    getModal(id) {
        return this.modals.get(id);
    }

    getAllModals() {
        return Array.from(this.modals.keys());
    }

    getActiveModals() {
        return [...this.activeModals];
    }

    // Cleanup
    destroy(id) {
        if (id) {
            // Destroy specific modal
            const config = this.modals.get(id);
            if (config) {
                this.hide(id);
                config.element.remove();
                this.modals.delete(id);
            }
        } else {
            // Destroy all modals
            this.hideAll();
            this.modals.clear();
            this.activeModals = [];
            this.unlockBodyScroll();
        }
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModalManager;
} else {
    window.ModalManager = ModalManager;
}