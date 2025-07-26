document.addEventListener('DOMContentLoaded', async () => {
    // --- UI Elements ---
    const workspace = document.getElementById('workspace');
    const tableListContainer = document.getElementById('table-list');
    const tableWindowTemplate = document.getElementById('table-window-template');
    
    const API_BASE_URL = 'http://localhost:8000';
    let allTablesData = {}; // To store all fetched data
    let openWindows = {}; // To track open windows
    let zIndexCounter = 10; // For stacking windows

    // --- State for Drag/Resize Interactions ---
    let activeWindow = null;
    let isDragging = false;
    let isResizing = false;
    let offsetX = 0;
    let offsetY = 0;

    // --- Main Application Logic ---
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
            if (!response.ok) throw new Error('Could not fetch table data.');
            
            allTablesData = await response.json();
            populateBottomBar(Object.keys(allTablesData));

        } catch (error) {
            console.error(error);
            const errorMsg = document.createElement('p');
            errorMsg.className = 'text-red-400 text-center p-4';
            errorMsg.textContent = 'Error loading data. Check console for details.';
            tableListContainer.appendChild(errorMsg);
        }
    }

    /**
     * Populates the bottom bar with buttons for each table.
     * @param {string[]} tableNames - An array of table names.
     */
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
                // Open window only if it's not already open
                if (!openWindows[tableName]) {
                    createTableWindow(tableName, allTablesData[tableName]);
                }
            });
            tableListContainer.appendChild(button);
        });
    }

    /**
     * Creates and displays a new draggable window for a table.
     * @param {string} tableName - The name of the table.
     * @param {object} tableData - The data for the table { columns, rows }.
     */
    function createTableWindow(tableName, tableData) {
        const windowFragment = tableWindowTemplate.content.cloneNode(true);
        const newWindow = windowFragment.querySelector('.draggable-container');
        
        newWindow.id = `window-${tableName}`;

        const openCount = Object.keys(openWindows).length;
        newWindow.style.left = `${50 + (openCount * 40)}px`;
        newWindow.style.top = `${50 + (openCount * 40)}px`;
        newWindow.style.zIndex = zIndexCounter++;

        newWindow.querySelector('.table-title').textContent = tableName;
        newWindow.querySelector('.row-count').textContent = `${tableData.rows.length} rows`;

        const tableHead = newWindow.querySelector('.table-head');
        const tableBody = newWindow.querySelector('.table-body');
        
        const headerRow = document.createElement('tr');
        tableData.columns.forEach(col => headerRow.innerHTML += `<th class="p-3 font-semibold tracking-wider text-gray-300">${col}</th>`);
        tableHead.appendChild(headerRow);

        tableData.rows.forEach(rowData => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-gray-800/70';
            tableData.columns.forEach(col => tr.innerHTML += `<td class="p-3 whitespace-nowrap">${rowData[col]}</td>`);
            tableBody.appendChild(tr);
        });

        newWindow.querySelector('.close-btn').addEventListener('click', () => {
            newWindow.remove();
            delete openWindows[tableName];
        });

        workspace.appendChild(newWindow);
        openWindows[tableName] = newWindow;
        setupWindowInteractions(newWindow);
        lucide.createIcons();
    }

    /**
     * Sets up mousedown listeners for a window to initiate dragging, resizing, and stacking.
     * @param {HTMLElement} container - The window element.
     */
    function setupWindowInteractions(container) {
        const dragHandle = container.querySelector('.drag-handle');
        const resizeHandle = container.querySelector('.resize-handle');

        container.addEventListener('mousedown', () => {
            container.style.zIndex = zIndexCounter++;
        });

        dragHandle.addEventListener('mousedown', (e) => {
            activeWindow = container;
            isDragging = true;
            isResizing = false;
            offsetX = e.clientX - activeWindow.offsetLeft;
            offsetY = e.clientY - activeWindow.offsetTop;
            document.body.style.userSelect = 'none';
        });

        resizeHandle.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            activeWindow = container;
            isResizing = true;
            isDragging = false;
            document.body.style.userSelect = 'none';
        });
    }

    // --- Global Event Listeners for Move and Up ---
    document.addEventListener('mousemove', (e) => {
        if (!activeWindow) return;

        if (isDragging) {
            let newX = e.clientX - offsetX;
            let newY = e.clientY - offsetY;
            newX = Math.max(0, Math.min(newX, workspace.clientWidth - activeWindow.offsetWidth));
            newY = Math.max(0, Math.min(newY, workspace.clientHeight - activeWindow.offsetHeight));
            activeWindow.style.left = `${newX}px`;
            activeWindow.style.top = `${newY}px`;
        } else if (isResizing) {
            const newWidth = e.clientX - activeWindow.offsetLeft;
            const newHeight = e.clientY - activeWindow.offsetTop;
            activeWindow.style.width = `${newWidth}px`;
            activeWindow.style.height = `${newHeight}px`;
        }
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
        isResizing = false;
        activeWindow = null;
        document.body.style.userSelect = '';
    });
    
    // Initialize the application
    initializeApp();
});
