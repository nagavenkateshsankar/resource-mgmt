/**
 * Data Table Manager
 * Handles data tables with sorting, filtering, pagination, and actions
 */

class DataTableManager {
    constructor() {
        this.tables = new Map();
        this.defaultConfig = {
            pageSize: 10,
            sortable: true,
            filterable: true,
            searchable: true,
            pagination: true,
            actions: [],
            columns: [],
            data: [],
            endpoint: null,
            autoLoad: true
        };
        
        this.init();
    }

    init() {
        console.log('DataTableManager initialized');
    }

    // Initialize a data table
    async initialize(tableId, config = {}) {
        const container = document.getElementById(tableId);
        if (!container) {
            throw new Error(`Table container '${tableId}' not found`);
        }

        const tableConfig = { ...this.defaultConfig, ...config };
        
        const table = {
            id: tableId,
            container,
            config: tableConfig,
            data: [],
            filteredData: [],
            currentPage: 1,
            totalPages: 1,
            sortColumn: null,
            sortDirection: 'asc',
            filters: new Map(),
            searchQuery: '',
            loading: false,
            error: null
        };

        this.tables.set(tableId, table);
        
        // Load initial data
        if (tableConfig.autoLoad) {
            await this.loadData(tableId);
        }
        
        // Render table
        this.renderTable(tableId);
        
        return table;
    }

    // Load data from endpoint or use provided data
    async loadData(tableId) {
        const table = this.tables.get(tableId);
        if (!table) return;

        table.loading = true;
        table.error = null;
        this.updateLoadingState(tableId);

        try {
            if (table.config.endpoint) {
                // Load from API
                const response = await this.fetchData(table.config.endpoint, {
                    page: table.currentPage,
                    pageSize: table.config.pageSize,
                    sort: table.sortColumn,
                    direction: table.sortDirection,
                    search: table.searchQuery,
                    filters: Object.fromEntries(table.filters)
                });
                
                table.data = response.data || response;
                table.totalPages = response.totalPages || Math.ceil(table.data.length / table.config.pageSize);
            } else {
                // Use provided data
                table.data = table.config.data || [];
            }

            this.applyFiltersAndSort(tableId);
            
        } catch (error) {
            console.error('Failed to load table data:', error);
            table.error = error.message;
        } finally {
            table.loading = false;
            this.renderTable(tableId);
        }
    }

    async fetchData(endpoint, params) {
        const url = new URL(endpoint, window.location.origin);
        Object.entries(params).forEach(([key, value]) => {
            if (value !== null && value !== undefined && value !== '') {
                url.searchParams.append(key, value);
            }
        });

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return response.json();
    }

    // Render the complete table
    renderTable(tableId) {
        const table = this.tables.get(tableId);
        if (!table) return;

        table.container.innerHTML = `
            <div class="data-table-wrapper">
                ${this.renderTableHeader(table)}
                ${this.renderTableContent(table)}
                ${this.renderTableFooter(table)}
            </div>
        `;

        this.setupTableEventListeners(tableId);
    }

    renderTableHeader(table) {
        const hasSearch = table.config.searchable;
        const hasFilters = table.config.filterable;
        const hasActions = table.config.actions.length > 0;

        if (!hasSearch && !hasFilters && !hasActions) {
            return '';
        }

        return `
            <div class="table-header">
                <div class="table-header-left">
                    ${hasSearch ? this.renderSearchBox(table) : ''}
                </div>
                <div class="table-header-right">
                    ${hasFilters ? this.renderFilterControls(table) : ''}
                    ${hasActions ? this.renderGlobalActions(table) : ''}
                </div>
            </div>
        `;
    }

    renderSearchBox(table) {
        return `
            <div class="table-search">
                <input type="text" 
                       class="form-control" 
                       placeholder="Search..." 
                       value="${table.searchQuery}"
                       data-table-search="${table.id}">
                <span class="search-icon">🔍</span>
            </div>
        `;
    }

    renderFilterControls(table) {
        return `
            <div class="table-filters">
                <button class="btn btn-secondary btn-sm" data-table-filter-toggle="${table.id}">
                    <span>Filters</span>
                    ${table.filters.size > 0 ? `<span class="filter-count">${table.filters.size}</span>` : ''}
                </button>
                <div class="filter-dropdown" data-table-filter-dropdown="${table.id}">
                    ${this.renderFilterOptions(table)}
                </div>
            </div>
        `;
    }

    renderFilterOptions(table) {
        return table.config.columns
            .filter(col => col.filterable !== false)
            .map(col => `
                <div class="filter-option">
                    <label>${col.title}</label>
                    ${this.renderFilterInput(col, table.filters.get(col.key) || '')}
                </div>
            `).join('');
    }

    renderFilterInput(column, currentValue) {
        if (column.filterType === 'select' && column.filterOptions) {
            return `
                <select class="form-control" data-filter-key="${column.key}">
                    <option value="">All</option>
                    ${column.filterOptions.map(option => `
                        <option value="${option.value}" ${currentValue === option.value ? 'selected' : ''}>
                            ${option.label}
                        </option>
                    `).join('')}
                </select>
            `;
        }
        
        return `
            <input type="text" 
                   class="form-control" 
                   data-filter-key="${column.key}" 
                   value="${currentValue}"
                   placeholder="Filter ${column.title}">
        `;
    }

    renderGlobalActions(table) {
        return `
            <div class="table-actions">
                ${table.config.actions.map(action => `
                    <button class="btn ${action.className || 'btn-primary'} btn-sm" 
                            data-table-action="${action.key}"
                            ${action.disabled ? 'disabled' : ''}>
                        ${action.icon ? `<span class="action-icon">${action.icon}</span>` : ''}
                        ${action.label}
                    </button>
                `).join('')}
            </div>
        `;
    }

    renderTableContent(table) {
        if (table.loading) {
            return `
                <div class="table-loading">
                    <div class="loading-spinner"></div>
                    <span>Loading...</span>
                </div>
            `;
        }

        if (table.error) {
            return `
                <div class="table-error">
                    <span class="error-icon">❌</span>
                    <span class="error-message">${table.error}</span>
                    <button class="btn btn-primary btn-sm" data-table-reload="${table.id}">
                        Retry
                    </button>
                </div>
            `;
        }

        if (table.filteredData.length === 0) {
            return `
                <div class="table-empty">
                    <span class="empty-icon">📭</span>
                    <span class="empty-message">No data available</span>
                </div>
            `;
        }

        return `
            <div class="table-scroll">
                <table class="data-table">
                    <thead>
                        <tr>
                            ${table.config.columns.map(col => this.renderColumnHeader(col, table)).join('')}
                            ${this.hasRowActions(table) ? '<th class="actions-column">Actions</th>' : ''}
                        </tr>
                    </thead>
                    <tbody>
                        ${this.renderTableRows(table)}
                    </tbody>
                </table>
            </div>
        `;
    }

    renderColumnHeader(column, table) {
        const sortable = table.config.sortable && column.sortable !== false;
        const isSorted = table.sortColumn === column.key;
        const sortDirection = isSorted ? table.sortDirection : '';

        return `
            <th class="table-column ${sortable ? 'sortable' : ''} ${isSorted ? 'sorted' : ''}" 
                data-column-key="${column.key}"
                ${sortable ? `data-table-sort="${table.id}"` : ''}>
                <span class="column-title">${column.title}</span>
                ${sortable ? `
                    <span class="sort-indicator">
                        ${isSorted ? (sortDirection === 'asc' ? '▲' : '▼') : '↕️'}
                    </span>
                ` : ''}
            </th>
        `;
    }

    renderTableRows(table) {
        const startIndex = (table.currentPage - 1) * table.config.pageSize;
        const endIndex = startIndex + table.config.pageSize;
        const pageData = table.filteredData.slice(startIndex, endIndex);

        return pageData.map(row => this.renderTableRow(row, table)).join('');
    }

    renderTableRow(row, table) {
        return `
            <tr class="table-row" data-row-id="${row.id || row._id || ''}">
                ${table.config.columns.map(col => this.renderTableCell(row, col)).join('')}
                ${this.hasRowActions(table) ? this.renderRowActions(row, table) : ''}
            </tr>
        `;
    }

    renderTableCell(row, column) {
        let cellValue = this.getCellValue(row, column.key);
        
        // Apply column formatter if provided
        if (column.formatter && typeof column.formatter === 'function') {
            cellValue = column.formatter(cellValue, row, column);
        } else if (column.type) {
            cellValue = this.formatCellValue(cellValue, column.type);
        }

        return `
            <td class="table-cell ${column.className || ''}" data-column="${column.key}">
                ${cellValue}
            </td>
        `;
    }

    getCellValue(row, key) {
        return key.split('.').reduce((obj, k) => obj && obj[k], row) || '';
    }

    formatCellValue(value, type) {
        if (value === null || value === undefined) return '';

        switch (type) {
            case 'date':
                return new Date(value).toLocaleDateString();
            case 'datetime':
                return new Date(value).toLocaleString();
            case 'currency':
                return new Intl.NumberFormat('en-US', { 
                    style: 'currency', 
                    currency: 'USD' 
                }).format(value);
            case 'number':
                return new Intl.NumberFormat().format(value);
            case 'boolean':
                return value ? '✅' : '❌';
            case 'badge':
                return `<span class="badge badge-${value.toLowerCase()}">${value}</span>`;
            default:
                return value.toString();
        }
    }

    hasRowActions(table) {
        return table.config.columns.some(col => col.actions && col.actions.length > 0) ||
               table.config.rowActions && table.config.rowActions.length > 0;
    }

    renderRowActions(row, table) {
        const actions = table.config.rowActions || [];
        
        if (actions.length === 0) return '<td class="actions-cell"></td>';

        return `
            <td class="actions-cell">
                <div class="row-actions">
                    ${actions.map(action => `
                        <button class="btn ${action.className || 'btn-secondary'} btn-xs" 
                                data-row-action="${action.key}"
                                data-row-id="${row.id || row._id || ''}"
                                ${action.disabled && action.disabled(row) ? 'disabled' : ''}>
                            ${action.icon ? `<span class="action-icon">${action.icon}</span>` : ''}
                            ${action.label}
                        </button>
                    `).join('')}
                </div>
            </td>
        `;
    }

    renderTableFooter(table) {
        if (!table.config.pagination && table.filteredData.length <= table.config.pageSize) {
            return '';
        }

        return `
            <div class="table-footer">
                <div class="table-info">
                    Showing ${Math.min((table.currentPage - 1) * table.config.pageSize + 1, table.filteredData.length)} 
                    to ${Math.min(table.currentPage * table.config.pageSize, table.filteredData.length)} 
                    of ${table.filteredData.length} entries
                </div>
                ${table.config.pagination ? this.renderPagination(table) : ''}
            </div>
        `;
    }

    renderPagination(table) {
        const totalPages = Math.ceil(table.filteredData.length / table.config.pageSize);
        const currentPage = table.currentPage;
        
        if (totalPages <= 1) return '';

        return `
            <div class="table-pagination">
                <button class="btn btn-secondary btn-sm" 
                        data-table-page="prev"
                        ${currentPage <= 1 ? 'disabled' : ''}>
                    Previous
                </button>
                
                ${this.renderPageNumbers(currentPage, totalPages)}
                
                <button class="btn btn-secondary btn-sm" 
                        data-table-page="next"
                        ${currentPage >= totalPages ? 'disabled' : ''}>
                    Next
                </button>
            </div>
        `;
    }

    renderPageNumbers(currentPage, totalPages) {
        const maxVisible = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
        let endPage = Math.min(totalPages, startPage + maxVisible - 1);
        
        if (endPage - startPage + 1 < maxVisible) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }

        const pages = [];
        
        if (startPage > 1) {
            pages.push(`<button class="btn btn-secondary btn-sm" data-table-page="1">1</button>`);
            if (startPage > 2) {
                pages.push(`<span class="pagination-ellipsis">...</span>`);
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            pages.push(`
                <button class="btn ${i === currentPage ? 'btn-primary' : 'btn-secondary'} btn-sm" 
                        data-table-page="${i}">
                    ${i}
                </button>
            `);
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                pages.push(`<span class="pagination-ellipsis">...</span>`);
            }
            pages.push(`<button class="btn btn-secondary btn-sm" data-table-page="${totalPages}">${totalPages}</button>`);
        }

        return pages.join('');
    }

    // Event handling
    setupTableEventListeners(tableId) {
        const table = this.tables.get(tableId);
        if (!table) return;

        const container = table.container;

        // Search
        const searchInput = container.querySelector(`[data-table-search="${tableId}"]`);
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.handleSearch(tableId, e.target.value);
            });
        }

        // Sorting
        container.addEventListener('click', (e) => {
            const sortButton = e.target.closest(`[data-table-sort="${tableId}"]`);
            if (sortButton) {
                const columnKey = sortButton.dataset.columnKey;
                this.handleSort(tableId, columnKey);
            }
        });

        // Pagination
        container.addEventListener('click', (e) => {
            const pageButton = e.target.closest(`[data-table-page]`);
            if (pageButton && !pageButton.disabled) {
                const page = pageButton.dataset.tablePage;
                this.handlePageChange(tableId, page);
            }
        });

        // Actions
        container.addEventListener('click', (e) => {
            const actionButton = e.target.closest(`[data-table-action]`);
            if (actionButton) {
                const actionKey = actionButton.dataset.tableAction;
                this.handleGlobalAction(tableId, actionKey);
            }

            const rowActionButton = e.target.closest(`[data-row-action]`);
            if (rowActionButton) {
                const actionKey = rowActionButton.dataset.rowAction;
                const rowId = rowActionButton.dataset.rowId;
                this.handleRowAction(tableId, actionKey, rowId);
            }
        });

        // Filters
        const filterToggle = container.querySelector(`[data-table-filter-toggle="${tableId}"]`);
        if (filterToggle) {
            filterToggle.addEventListener('click', () => {
                this.toggleFilters(tableId);
            });
        }

        // Filter inputs
        container.addEventListener('change', (e) => {
            const filterInput = e.target.closest(`[data-filter-key]`);
            if (filterInput) {
                const filterKey = filterInput.dataset.filterKey;
                this.handleFilter(tableId, filterKey, filterInput.value);
            }
        });

        // Reload
        const reloadButton = container.querySelector(`[data-table-reload="${tableId}"]`);
        if (reloadButton) {
            reloadButton.addEventListener('click', () => {
                this.reload(tableId);
            });
        }
    }

    // Data manipulation
    applyFiltersAndSort(tableId) {
        const table = this.tables.get(tableId);
        if (!table) return;

        let data = [...table.data];

        // Apply search
        if (table.searchQuery) {
            data = this.filterBySearch(data, table.searchQuery, table.config.columns);
        }

        // Apply filters
        table.filters.forEach((value, key) => {
            if (value) {
                data = data.filter(row => {
                    const cellValue = this.getCellValue(row, key);
                    return cellValue.toString().toLowerCase().includes(value.toLowerCase());
                });
            }
        });

        // Apply sorting
        if (table.sortColumn) {
            data.sort((a, b) => {
                const aValue = this.getCellValue(a, table.sortColumn);
                const bValue = this.getCellValue(b, table.sortColumn);
                
                let comparison = 0;
                if (aValue > bValue) comparison = 1;
                else if (aValue < bValue) comparison = -1;
                
                return table.sortDirection === 'desc' ? -comparison : comparison;
            });
        }

        table.filteredData = data;
        table.totalPages = Math.ceil(data.length / table.config.pageSize);
        
        // Adjust current page if necessary
        if (table.currentPage > table.totalPages && table.totalPages > 0) {
            table.currentPage = table.totalPages;
        }
    }

    filterBySearch(data, query, columns) {
        const searchableColumns = columns.filter(col => col.searchable !== false);
        
        return data.filter(row => {
            return searchableColumns.some(col => {
                const cellValue = this.getCellValue(row, col.key);
                return cellValue.toString().toLowerCase().includes(query.toLowerCase());
            });
        });
    }

    // Event handlers
    handleSearch(tableId, query) {
        const table = this.tables.get(tableId);
        if (!table) return;

        table.searchQuery = query;
        table.currentPage = 1;
        this.applyFiltersAndSort(tableId);
        this.renderTable(tableId);
    }

    handleSort(tableId, columnKey) {
        const table = this.tables.get(tableId);
        if (!table) return;

        if (table.sortColumn === columnKey) {
            table.sortDirection = table.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            table.sortColumn = columnKey;
            table.sortDirection = 'asc';
        }

        this.applyFiltersAndSort(tableId);
        this.renderTable(tableId);
    }

    handlePageChange(tableId, page) {
        const table = this.tables.get(tableId);
        if (!table) return;

        if (page === 'prev') {
            table.currentPage = Math.max(1, table.currentPage - 1);
        } else if (page === 'next') {
            table.currentPage = Math.min(table.totalPages, table.currentPage + 1);
        } else {
            table.currentPage = parseInt(page);
        }

        this.renderTable(tableId);
    }

    handleFilter(tableId, filterKey, value) {
        const table = this.tables.get(tableId);
        if (!table) return;

        if (value) {
            table.filters.set(filterKey, value);
        } else {
            table.filters.delete(filterKey);
        }

        table.currentPage = 1;
        this.applyFiltersAndSort(tableId);
        this.renderTable(tableId);
    }

    handleGlobalAction(tableId, actionKey) {
        const table = this.tables.get(tableId);
        if (!table) return;

        const action = table.config.actions.find(a => a.key === actionKey);
        if (action && action.onClick) {
            action.onClick(table);
        }

        this.emit('table:global-action', { tableId, actionKey, table });
    }

    handleRowAction(tableId, actionKey, rowId) {
        const table = this.tables.get(tableId);
        if (!table) return;

        const row = table.data.find(r => (r.id || r._id) === rowId);
        const action = table.config.rowActions?.find(a => a.key === actionKey);
        
        if (action && action.onClick) {
            action.onClick(row, table);
        }

        this.emit('table:row-action', { tableId, actionKey, rowId, row, table });
    }

    toggleFilters(tableId) {
        const table = this.tables.get(tableId);
        if (!table) return;

        const dropdown = table.container.querySelector(`[data-table-filter-dropdown="${tableId}"]`);
        if (dropdown) {
            dropdown.classList.toggle('show');
        }
    }

    // Public API
    reload(tableId) {
        this.loadData(tableId);
    }

    updateData(tableId, data) {
        const table = this.tables.get(tableId);
        if (!table) return;

        table.data = data;
        table.config.data = data;
        this.applyFiltersAndSort(tableId);
        this.renderTable(tableId);
    }

    addRow(tableId, row) {
        const table = this.tables.get(tableId);
        if (!table) return;

        table.data.unshift(row);
        this.applyFiltersAndSort(tableId);
        this.renderTable(tableId);
    }

    updateRow(tableId, rowId, updates) {
        const table = this.tables.get(tableId);
        if (!table) return;

        const rowIndex = table.data.findIndex(r => (r.id || r._id) === rowId);
        if (rowIndex >= 0) {
            table.data[rowIndex] = { ...table.data[rowIndex], ...updates };
            this.applyFiltersAndSort(tableId);
            this.renderTable(tableId);
        }
    }

    removeRow(tableId, rowId) {
        const table = this.tables.get(tableId);
        if (!table) return;

        table.data = table.data.filter(r => (r.id || r._id) !== rowId);
        this.applyFiltersAndSort(tableId);
        this.renderTable(tableId);
    }

    updateLoadingState(tableId) {
        const table = this.tables.get(tableId);
        if (!table) return;

        const loadingElement = table.container.querySelector('.table-loading');
        if (loadingElement) {
            loadingElement.style.display = table.loading ? 'block' : 'none';
        }
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
    destroy(tableId) {
        if (tableId) {
            this.tables.delete(tableId);
        } else {
            this.tables.clear();
        }
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataTableManager;
} else {
    window.DataTableManager = DataTableManager;
}