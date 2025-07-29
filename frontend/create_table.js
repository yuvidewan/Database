document.addEventListener('DOMContentLoaded', () => {
    const columnsContainer = document.getElementById('columns-container');
    const addColumnBtn = document.getElementById('add-column-btn');
    const createTableBtn = document.getElementById('create-table-btn');
    const tableNameInput = document.getElementById('table-name');
    const columnRowTemplate = document.getElementById('column-row-template');
    
    const API_BASE_URL = 'http://localhost:8000';

    const createColumnRow = () => {
        const rowFragment = columnRowTemplate.content.cloneNode(true);
        const newRow = rowFragment.querySelector('.column-row');
        
        // Add event listener to the remove button
        newRow.querySelector('.remove-column-btn').addEventListener('click', () => {
            newRow.remove();
        });
        
        columnsContainer.appendChild(newRow);
    };

    addColumnBtn.addEventListener('click', createColumnRow);

    createTableBtn.addEventListener('click', async () => {
        const tableName = tableNameInput.value.trim();
        if (!tableName) {
            alert('Please enter a table name.');
            return;
        }

        const columnRows = columnsContainer.querySelectorAll('.column-row');
        if (columnRows.length === 0) {
            alert('Please add at least one column.');
            return;
        }

        const columns = [];
        let hasPrimaryKey = false;

        for (const row of columnRows) {
            const name = row.querySelector('.column-name').value.trim();
            if (!name) {
                alert('All columns must have a name.');
                return;
            }

            const isPrimaryKey = row.querySelector('.primary-key').checked;
            if (isPrimaryKey) hasPrimaryKey = true;

            columns.push({
                name: name,
                data_type: row.querySelector('.data-type').value,
                length: row.querySelector('.length-value').value.trim() || null,
                allow_null: row.querySelector('.allow-null').checked,
                is_primary_key: isPrimaryKey,
                auto_increment: row.querySelector('.auto-increment').checked,
            });
        }

        if (!hasPrimaryKey) {
            if (!confirm("Warning: You haven't defined a Primary Key. Are you sure you want to continue?")) {
                return;
            }
        }

        const username = sessionStorage.getItem('db_user');
        const password = sessionStorage.getItem('db_pass');
        const selectedDb = sessionStorage.getItem('selected_db');

        const payload = {
            username,
            password,
            db_name: selectedDb,
            table_name: tableName,
            columns: columns
        };

        try {
            // The URL now correctly points to /create/table
            const response = await fetch(`${API_BASE_URL}/create/table`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to create table.');
            }

            alert(`Table '${tableName}' created successfully!`);
            // FIX: Redirect back to the main workspace for the current database
            window.location.href = 'index.html'; 

        } catch (error) {
            console.error('Create table error:', error);
            alert(`Error: ${error.message}`);
        }
    });

    // Add one column row by default
    createColumnRow();
    lucide.createIcons();
});
