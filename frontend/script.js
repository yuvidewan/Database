document.addEventListener('DOMContentLoaded', () => {
    const workspace = document.getElementById('workspace');
    const tableListContainer = document.getElementById('table-list');
    const tableWindowTemplate = document.getElementById('table-window-template');
    const deleteBtn = document.getElementById('delete-btn');
    const insertBtn = document.getElementById('insert-btn');
    const backBtn = document.getElementById('back-btn');
    
    const API_BASE_URL = 'http://localhost:8000';
    let tableSchemas = {};
    let openWindows = {};
    let zIndexCounter = 10;

    let activeWindow = null;
    let interactionState = {
        isDraggingWindow: false,
        isResizingWindow: false,
        isSelectingCells: false,
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
            
            // FIX: Restore window states on refresh
            loadWindowsState();

        } catch (error) {
            console.error(error);
            tableListContainer.innerHTML = `<p class="text-red-400 text-center p-4">Error loading tables.</p>`;
        }
    }

    function populateBottomBar(tableNames) {
        if (tableNames.length === 0) {
            tableListContainer.innerHTML = '<p class="text-gray-500">No tables found.</p>';
            return;
        }
        tableNames.forEach(tableName => {
            const button = document.createElement('button');
            button.className = 'px-4 py-2 rounded-md bg-gray-700/60 text-white font-medium hover:bg-indigo-600 transition-colors';
            button.textContent = tableName;
            button.addEventListener('click', () => {
                // FIX: Bring to front/center if already open, else create new
                if (openWindows[tableName]) {
                    const win = openWindows[tableName].element;
                    win.style.zIndex = zIndexCounter++;
                    // Center the window
                    const workspaceRect = workspace.getBoundingClientRect();
                    const winRect = win.getBoundingClientRect();
                    win.style.top = `${(workspaceRect.height - winRect.height) / 2}px`;
                    win.style.left = `${(workspaceRect.width - winRect.width) / 2}px`;
                } else {
                    createTableWindow(tableName, tableSchemas[tableName]);
                }
            });
            tableListContainer.appendChild(button);
        });
    }

    function createTableWindow(tableName, schema, position = null) {
        const windowFragment = tableWindowTemplate.content.cloneNode(true);
        const newWindow = windowFragment.querySelector('.draggable-container');
        
        newWindow.id = `window-${tableName}`;
        
        // FIX: Restore position or set initial position
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
            headerRow.innerHTML += `<th data-col="${colIndex}" class="p-3 font-semibold tracking-wider text-gray-300">${col}</th>`;
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
            saveWindowsState(); // Save state on close
        });
        
        setupWindowInteractions(newWindow);
        lucide.createIcons();
        saveWindowsState(); // Save state on create
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
                    tr.innerHTML += `<td data-row="${tableState.loaded_rows + rowIndex}" data-col="${colIndex}" class="p-3 whitespace-nowrap">${cellValue}</td>`;
                });
                tableBody.appendChild(tr);
            });
            
            tableState.loaded_rows += data.rows.length;
            tableState.current_page++;
            updateRowCount(tableName);
        }
        
        tableState.is_loading = false;
    }
    
    // --- Insert Row Logic ---
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
        // FIX: Allow insert with Enter key
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
            
            // FIX: Update UI without refresh
            const tableState = openWindows[tableName];
            const tableBody = tableState.element.querySelector('.table-body');
            const newTr = document.createElement('tr');
            newTr.dataset.row = tableState.total_rows; // Assign a new row index
            tableState.columns.forEach((col, colIndex) => {
                const cellValue = newRowData[col] ?? '--';
                newTr.innerHTML += `<td data-row="${tableState.total_rows}" data-col="${colIndex}" class="p-3 whitespace-nowrap">${cellValue}</td>`;
            });
            tableBody.prepend(newTr); // Add new row to the top of the table

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

    insertBtn.addEventListener('click', handleInsert);

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

    // --- Global Listeners ---
    document.addEventListener('mousedown', (e) => {
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
            saveWindowsState(); // Save state after move/resize
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

    deleteBtn.addEventListener('click', handleDelete);
    // FIX: Add event listener for the back button
    backBtn.addEventListener('click', () => {
        window.location.href = 'databases.html';
    });

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
            
            // FIX: Update UI without refresh
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

    // --- NEW: Helper functions for state and UI ---
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
        // FIX: Use a dynamic key for sessionStorage
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
        // FIX: Use a dynamic key for sessionStorage
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
    
    initializeApp();
});
