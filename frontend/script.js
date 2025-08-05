document.addEventListener('DOMContentLoaded', () => {
    // --- UI Elements ---
    const workspace = document.getElementById('workspace');
    const tableListContainer = document.getElementById('table-list');
    const tableWindowTemplate = document.getElementById('table-window-template');
    const deleteBtn = document.getElementById('delete-btn');
    const insertBtn = document.getElementById('insert-btn');
    const backBtn = document.getElementById('back-btn');
    const contextMenu = document.getElementById('context-menu');
    const contextEmptyBtn = document.getElementById('context-empty-btn');
    const contextDropBtn = document.getElementById('context-drop-btn');
    
    // --- State ---
    const API_BASE_URL = 'http://localhost:8000';
    let tableSchemas = {};
    let openWindows = {};
    let zIndexCounter = 10;
    let contextMenuTargetTable = null;

    let activeWindow = null;
    let interactionState = {
        isDraggingWindow: false,
        isResizingWindow: false,
        isSelectingCells: false,
        isEditingCell: false,
        selectionStartCell: null,
        currentSelection: [],
        selectedTableName: null,
        activeInsertRow: null
    };
    let offsetX = 0, offsetY = 0;

    // --- Main App Initialization ---
    async function initializeApp() {
        const username = sessionStorage.getItem('db_user');
        const password = sessionStorage.getItem('db_pass');
        const selectedDb = sessionStorage.getItem('selected_db');

        if (!username || !password || !selectedDb) {
            window.location.href = 'login.html';
            return;
        }

        try {
            const tbParams = new URLSearchParams({ username, password, db_name: selectedDb });
            const response = await fetch(`${API_BASE_URL}/connection/showtb?${tbParams.toString()}`);
            if (!response.ok) throw new Error('Could not fetch table structures.');
            
            tableSchemas = await response.json();
            populateBottomBar(Object.keys(tableSchemas));
            loadWindowsState();

        } catch (error) {
            console.error(error);
            tableListContainer.innerHTML = `<p class="text-red-400 text-center p-4">Error loading tables.</p>`;
        }
    }

    // --- UI Population ---
    function populateBottomBar(tableNames) {
        tableListContainer.innerHTML = '';
        if (tableNames.length === 0) {
            tableListContainer.innerHTML = '<p class="text-gray-500">No tables found.</p>';
            return;
        }
        tableNames.forEach(tableName => {
            const button = document.createElement('button');
            button.className = 'px-4 py-2 rounded-md bg-gray-700/60 text-white font-medium hover:bg-indigo-600 transition-colors';
            button.textContent = tableName;
            button.dataset.tableName = tableName;

            button.addEventListener('click', () => {
                if (openWindows[tableName]) {
                    const win = openWindows[tableName].element;
                    win.style.zIndex = zIndexCounter++;
                    const workspaceRect = workspace.getBoundingClientRect();
                    const winRect = win.getBoundingClientRect();
                    win.style.top = `${(workspaceRect.height - winRect.height) / 2}px`;
                    win.style.left = `${(workspaceRect.width - winRect.width) / 2}px`;
                } else {
                    createTableWindow(tableName, tableSchemas[tableName]);
                }
            });

            button.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                contextMenuTargetTable = tableName;
                const buttonRect = e.currentTarget.getBoundingClientRect();
                contextMenu.classList.remove('hidden');
                const menuRect = contextMenu.getBoundingClientRect();

                let top = buttonRect.top - menuRect.height - 8;
                let left = buttonRect.left + (buttonRect.width / 2) - (menuRect.width / 2);

                if (left < 5) left = 5;
                if (left + menuRect.width > window.innerWidth) left = window.innerWidth - menuRect.width - 5;
                if (top < 5) top = buttonRect.bottom + 8;

                contextMenu.style.top = `${top}px`;
                contextMenu.style.left = `${left}px`;
                lucide.createIcons();
            });

            tableListContainer.appendChild(button);
        });
    }

    function createTableWindow(tableName, schema, position = null) {
        const windowFragment = tableWindowTemplate.content.cloneNode(true);
        const newWindow = windowFragment.querySelector('.draggable-container');
        
        newWindow.id = `window-${tableName}`;
        
        if (position) {
            newWindow.style.left = position.left;
            newWindow.style.top = position.top;
            newWindow.style.width = position.width;
            newWindow.style.height = position.height;
            newWindow.style.zIndex = position.zIndex;
            zIndexCounter = Math.max(zIndexCounter, parseInt(position.zIndex) + 1);
        } else {
            const openCount = Object.keys(openWindows).length;
            newWindow.style.left = `${50 + (openCount * 40)}px`;
            newWindow.style.top = `${50 + (openCount * 40)}px`;
            newWindow.style.zIndex = zIndexCounter++;
        }

        newWindow.querySelector('.table-title').textContent = tableName;
        
        const tableBody = newWindow.querySelector('.table-body');
        tableBody.dataset.tableName = tableName; 
        const tableHead = newWindow.querySelector('.table-head');
        
        const headerRow = document.createElement('tr');
        schema.columns.forEach((col, colIndex) => {
            headerRow.innerHTML += `<th data-col-name="${col}" data-col-index="${colIndex}" class="p-3 font-semibold tracking-wider text-gray-300">${col}</th>`;
        });
        tableHead.appendChild(headerRow);

        openWindows[tableName] = {
            element: newWindow,
            columns: schema.columns,
            total_rows: schema.total_rows,
            loaded_rows: 0,
            current_page: 1,
            is_loading: false
        };

        workspace.appendChild(newWindow);
        fetchAndDisplayPage(tableName, true);

        const scrollWrapper = newWindow.querySelector('.table-scroll-wrapper');
        scrollWrapper.addEventListener('scroll', () => {
            const { scrollTop, scrollHeight, clientHeight } = scrollWrapper;
            if (scrollTop + clientHeight >= scrollHeight * 0.95) {
                fetchAndDisplayPage(tableName);
            }
        });

        newWindow.querySelector('.add-row-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            addInsertRow(tableName);
        });

        newWindow.querySelector('.close-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            newWindow.remove();
            delete openWindows[tableName];
            saveWindowsState();
        });
        
        setupWindowInteractions(newWindow);
        lucide.createIcons();
        saveWindowsState();
    }

    async function fetchAndDisplayPage(tableName, isInitial = false) {
        const tableState = openWindows[tableName];
        if (!tableState || tableState.is_loading || (tableState.loaded_rows >= tableState.total_rows && !isInitial)) {
            return;
        }

        tableState.is_loading = true;
        const { columns, current_page } = tableState;
        const tableBody = tableState.element.querySelector('.table-body');
        
        const username = sessionStorage.getItem('db_user');
        const password = sessionStorage.getItem('db_pass');
        const selectedDb = sessionStorage.getItem('selected_db');
        
        const pageParams = new URLSearchParams({ username, password, db_name: selectedDb, table_name: tableName, page: current_page });
        const response = await fetch(`${API_BASE_URL}/connection/get-page?${pageParams.toString()}`);
        
        if (response.ok) {
            const data = await response.json();
            data.rows.forEach((rowData, rowIndex) => {
                const tr = document.createElement('tr');
                tr.dataset.row = tableState.loaded_rows + rowIndex;
                columns.forEach((col, colIndex) => {
                    const cellValue = rowData[col] ?? '--';
                    tr.innerHTML += `<td data-row="${tableState.loaded_rows + rowIndex}" data-col-index="${colIndex}" class="p-3 whitespace-nowrap">${cellValue}</td>`;
                });
                tableBody.appendChild(tr);
            });
            
            tableState.loaded_rows += data.rows.length;
            tableState.current_page++;
            updateRowCount(tableName);
        }
        
        tableState.is_loading = false;
    }

    // --- Action Handlers ---
    function addInsertRow(tableName) {
        const tableState = openWindows[tableName];
        if (!tableState || tableState.element.querySelector('.insert-row')) {
            return;
        }
        
        const tableBody = tableState.element.querySelector('.table-body');
        const newRow = document.createElement('tr');
        newRow.className = 'insert-row';
        
        tableState.columns.forEach(colName => {
            const cell = document.createElement('td');
            cell.className = 'p-1';
            cell.innerHTML = `<input type="text" data-col-name="${colName}" placeholder="${colName}" class="w-full">`;
            newRow.appendChild(cell);
        });
        
        tableBody.prepend(newRow);
        interactionState.activeInsertRow = newRow;

        newRow.addEventListener('input', () => insertBtn.classList.remove('hidden'));
        newRow.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                handleInsert();
            }
        });
    }

    async function handleInsert() {
        const insertRow = interactionState.activeInsertRow;
        if (!insertRow) return;

        const tableName = insertRow.closest('tbody').dataset.tableName;
        const inputs = insertRow.querySelectorAll('input');
        const newRowData = {};
        
        inputs.forEach(input => {
            newRowData[input.dataset.colName] = input.value || null;
        });

        const username = sessionStorage.getItem('db_user');
        const password = sessionStorage.getItem('db_pass');
        const selectedDb = sessionStorage.getItem('selected_db');

        try {
            const response = await fetch(`${API_BASE_URL}/edit/insert`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, db_name: selectedDb, tb_name: tableName, data: newRowData })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to insert row.');
            }

            alert('Row inserted successfully!');
            
            const tableState = openWindows[tableName];
            const tableBody = tableState.element.querySelector('.table-body');
            const newTr = document.createElement('tr');
            newTr.dataset.row = tableState.total_rows;
            tableState.columns.forEach((col, colIndex) => {
                const cellValue = newRowData[col] ?? '--';
                newTr.innerHTML += `<td data-row="${tableState.total_rows}" data-col-index="${colIndex}" class="p-3 whitespace-nowrap">${cellValue}</td>`;
            });
            tableBody.prepend(newTr);

            tableState.total_rows++;
            tableState.loaded_rows++;
            updateRowCount(tableName);

            insertRow.remove();
            insertBtn.classList.add('hidden');
            interactionState.activeInsertRow = null;

        } catch (error) {
            console.error('Insert error:', error);
            alert(`Error: ${error.message}`);
        }
    }

    async function handleDelete() {
        if (interactionState.currentSelection.length === 0) return;

        const tableName = interactionState.selectedTableName;
        const tableSchema = tableSchemas[tableName];
        const primaryKeyColName = tableSchema.columns[0];
        const primaryKeyColIndex = 0;

        const rowsToDelete = new Set();
        interactionState.currentSelection.forEach(cell => rowsToDelete.add(cell.parentElement));

        const idsToDelete = Array.from(rowsToDelete).map(row => row.cells[primaryKeyColIndex].textContent);

        const username = sessionStorage.getItem('db_user');
        const password = sessionStorage.getItem('db_pass');
        const selectedDb = sessionStorage.getItem('selected_db');
        
        const deleteParams = new URLSearchParams({ username, password, db_name: selectedDb, tb_name: tableName, pk_col: primaryKeyColName, ids: idsToDelete.join(',') });

        try {
            const response = await fetch(`${API_BASE_URL}/edit/delete?${deleteParams.toString()}`);
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to delete rows.');
            }
            
            rowsToDelete.forEach(row => row.remove());
            const tableState = openWindows[tableName];
            tableState.total_rows -= rowsToDelete.size;
            tableState.loaded_rows -= rowsToDelete.size;
            updateRowCount(tableName);
            
            clearSelection();
            alert('Rows deleted successfully.');

        } catch (error) {
            console.error('Delete error:', error);
            alert(`Error: ${error.message}`);
        }
    }

    function makeCellEditable(cell) {
        if (interactionState.isEditingCell) return;
        interactionState.isEditingCell = true;
        
        const originalValue = cell.textContent;
        cell.textContent = '';

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'cell-editor';
        input.value = originalValue;
        
        cell.appendChild(input);
        input.focus();

        const finishEditing = (save) => {
            input.removeEventListener('blur', handleBlur);
            input.removeEventListener('keydown', handleKeyDown);

            const newValue = input.value;
            if (cell.contains(input)) {
                cell.removeChild(input);
            }
            
            cell.textContent = save ? newValue : originalValue;
            interactionState.isEditingCell = false;

            if (save && newValue !== originalValue) {
                handleCellUpdate(cell, newValue, originalValue);
            }
        };

        const handleBlur = () => finishEditing(false);
        const handleKeyDown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                finishEditing(true);
            } else if (e.key === 'Escape') {
                finishEditing(false);
            }
        };

        input.addEventListener('blur', handleBlur);
        input.addEventListener('keydown', handleKeyDown);
    }

    async function handleCellUpdate(cell, newValue, originalValue) {
        const tableName = cell.closest('tbody').dataset.tableName;
        const tableSchema = tableSchemas[tableName];
        const colIndex = cell.dataset.colIndex;
        const colToUpdate = tableSchema.columns[colIndex];
        
        const primaryKeyColName = tableSchema.columns[0];
        const primaryKeyColIndex = 0;
        const rowElement = cell.parentElement;
        const primaryKeyValue = rowElement.cells[primaryKeyColIndex].textContent;

        const username = sessionStorage.getItem('db_user');
        const password = sessionStorage.getItem('db_pass');
        const selectedDb = sessionStorage.getItem('selected_db');

        try {
            const response = await fetch(`${API_BASE_URL}/edit/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username, password,
                    db_name: selectedDb,
                    tb_name: tableName,
                    pk_col: primaryKeyColName,
                    pk_val: primaryKeyValue,
                    col_to_update: colToUpdate,
                    new_value: newValue
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to update cell.');
            }
        } catch (error) {
            console.error('Update error:', error);
            alert(`Error: ${error.message}`);
            cell.textContent = originalValue;
        }
    }

    async function handleTableAction(action, tableName) {
        const username = sessionStorage.getItem('db_user');
        const password = sessionStorage.getItem('db_pass');
        const selectedDb = sessionStorage.getItem('selected_db');

        const params = new URLSearchParams({ username, password, db_name: selectedDb, tb_name: tableName });
        
        try {
            const response = await fetch(`${API_BASE_URL}/empty/${action}?${params.toString()}`);
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || `Failed to ${action} table.`);
            }

            alert(`Table '${tableName}' has been ${action === 'drop' ? 'dropped' : 'emptied'} successfully.`);

            if (action === 'drop') {
                const buttonToRemove = tableListContainer.querySelector(`[data-table-name="${tableName}"]`);
                if (buttonToRemove) buttonToRemove.remove();
                if (openWindows[tableName]) {
                    openWindows[tableName].element.remove();
                    delete openWindows[tableName];
                }
                delete tableSchemas[tableName];
            } else {
                if (openWindows[tableName]) {
                    const tableBody = openWindows[tableName].element.querySelector('.table-body');
                    tableBody.innerHTML = '';
                    openWindows[tableName].loaded_rows = 0;
                    openWindows[tableName].total_rows = 0;
                    updateRowCount(tableName);
                }
            }

        } catch (error) {
            console.error(`${action} table error:`, error);
            alert(`Error: ${error.message}`);
        }
    }

    // --- Event Listeners ---
    function setupWindowInteractions(container) {
        const dragHandle = container.querySelector('.drag-handle');
        const resizeHandle = container.querySelector('.resize-handle');

        container.addEventListener('mousedown', () => container.style.zIndex = zIndexCounter++);

        dragHandle.addEventListener('mousedown', (e) => {
            activeWindow = container;
            interactionState.isDraggingWindow = true;
            offsetX = e.clientX - activeWindow.offsetLeft;
            offsetY = e.clientY - activeWindow.offsetTop;
        });

        resizeHandle.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            activeWindow = container;
            interactionState.isResizingWindow = true;
        });
    }

    document.addEventListener('mousedown', (e) => {
        if (interactionState.isEditingCell) return;
        if (e.target.tagName === 'TD' && !e.target.closest('.insert-row')) {
            e.preventDefault();
            clearSelection();
            interactionState.isSelectingCells = true;
            interactionState.selectionStartCell = e.target;
            interactionState.selectedTableName = e.target.closest('tbody').dataset.tableName;
            updateSelection(e.target);
            deleteBtn.classList.remove('hidden');
        } else if (!e.target.closest('.draggable-container') && !e.target.closest('#bottom-bar')) {
            clearSelection();
        }
    });

    document.addEventListener('mousemove', (e) => {
        document.body.style.userSelect = interactionState.isDraggingWindow || interactionState.isResizingWindow ? 'none' : '';
        if (interactionState.isDraggingWindow && activeWindow) {
            activeWindow.style.left = `${e.clientX - offsetX}px`;
            activeWindow.style.top = `${e.clientY - offsetY}px`;
        } else if (interactionState.isResizingWindow && activeWindow) {
            activeWindow.style.width = `${e.clientX - activeWindow.offsetLeft}px`;
            activeWindow.style.height = `${e.clientY - activeWindow.offsetTop}px`;
        } else if (interactionState.isSelectingCells && e.target.tagName === 'TD') {
            updateSelection(e.target);
        }
    });

    document.addEventListener('mouseup', () => {
        if (interactionState.isDraggingWindow || interactionState.isResizingWindow) {
            saveWindowsState();
        }
        interactionState.isDraggingWindow = false;
        interactionState.isResizingWindow = false;
        interactionState.isSelectingCells = false;
        activeWindow = null;
        interactionState.selectionStartCell = null;
        document.body.style.userSelect = '';
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Delete' && interactionState.currentSelection.length > 0) {
            handleDelete();
        }
    });

    workspace.addEventListener('dblclick', (e) => {
        const cell = e.target;
        if (cell.tagName === 'TD' && !cell.querySelector('input') && cell.dataset.colIndex !== '0') {
            makeCellEditable(cell);
        }
    });

    document.addEventListener('click', () => {
        contextMenu.classList.add('hidden');
    });

    deleteBtn.addEventListener('click', handleDelete);
    insertBtn.addEventListener('click', handleInsert);
    backBtn.addEventListener('click', () => {
        window.location.href = 'databases.html';
    });
    contextEmptyBtn.addEventListener('click', async () => {
        if (!contextMenuTargetTable) return;
        if (confirm(`Are you sure you want to EMPTY all data from the table "${contextMenuTargetTable}"? This cannot be undone.`)) {
            await handleTableAction('clear', contextMenuTargetTable);
        }
        contextMenu.classList.add('hidden');
    });
    contextDropBtn.addEventListener('click', async () => {
        if (!contextMenuTargetTable) return;
        if (confirm(`Are you sure you want to DROP the table "${contextMenuTargetTable}"? This will delete the table and all its data permanently.`)) {
            await handleTableAction('drop', contextMenuTargetTable);
        }
        contextMenu.classList.add('hidden');
    });

    // --- Helper Functions ---
    function clearSelection() {
        interactionState.currentSelection.forEach(cell => cell.classList.remove('selected'));
        interactionState.currentSelection = [];
        interactionState.selectedTableName = null;
        deleteBtn.classList.add('hidden');
    }

    function updateSelection(endCell) {
        clearSelection();
        deleteBtn.classList.remove('hidden');
        const startCell = interactionState.selectionStartCell;
        const tableBody = startCell.closest('tbody');
        if (!tableBody || !tableBody.contains(endCell)) return;
        
        interactionState.selectedTableName = tableBody.dataset.tableName;

        const startRowIndex = parseInt(startCell.dataset.row);
        const endRowIndex = parseInt(endCell.dataset.row);
        const minRow = Math.min(startRowIndex, endRowIndex);
        const maxRow = Math.max(startRowIndex, endRowIndex);

        for (let r = minRow; r <= maxRow; r++) {
            const row = tableBody.querySelector(`tr[data-row='${r}']`);
            if (row) {
                const cells = row.querySelectorAll('td');
                cells.forEach(cell => {
                    cell.classList.add('selected');
                    interactionState.currentSelection.push(cell);
                });
            }
        }
    }
    
    function updateRowCount(tableName) {
        const tableState = openWindows[tableName];
        if (tableState) {
            const rowCountEl = tableState.element.querySelector('.row-count');
            rowCountEl.textContent = `${tableState.loaded_rows} of ${tableState.total_rows} rows`;
        }
    }

    function saveWindowsState() {
        const selectedDb = sessionStorage.getItem('selected_db');
        if (!selectedDb) return;
        const stateKey = `open_windows_state_${selectedDb}`;
        const stateToSave = {};
        for (const tableName in openWindows) {
            const win = openWindows[tableName].element;
            stateToSave[tableName] = {
                left: win.style.left,
                top: win.style.top,
                width: win.style.width,
                height: win.style.height,
                zIndex: win.style.zIndex
            };
        }
        sessionStorage.setItem(stateKey, JSON.stringify(stateToSave));
    }

    function loadWindowsState() {
        const selectedDb = sessionStorage.getItem('selected_db');
        if (!selectedDb) return;
        const stateKey = `open_windows_state_${selectedDb}`;
        const savedState = JSON.parse(sessionStorage.getItem(stateKey));
        if (savedState) {
            for (const tableName in savedState) {
                if (tableSchemas[tableName]) {
                    createTableWindow(tableName, tableSchemas[tableName], savedState[tableName]);
                }
            }
        }
    }
    
    // --- Start Application ---
    initializeApp();
});
