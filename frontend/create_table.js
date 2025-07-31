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
        const dataTypeSelect = newRow.querySelector('.data-type');
        const lengthContainer = newRow.querySelector('.length-container');

        // Event listener to update inputs when data type changes
        dataTypeSelect.addEventListener('change', () => {
            updateLengthInputs(dataTypeSelect.value, lengthContainer);
        });
        
        newRow.querySelector('.remove-column-btn').addEventListener('click', () => {
            newRow.remove();
        });
        
        columnsContainer.appendChild(newRow);
        updateLengthInputs(dataTypeSelect.value, lengthContainer); // Set initial state
    };

    const updateLengthInputs = (dataType, container) => {
        container.innerHTML = ''; // Clear previous inputs
        switch (dataType) {
            case 'VARCHAR':
                container.innerHTML = `<input type="text" class="length-value bg-gray-700/80" placeholder="">`;
                break;
            case 'DECIMAL':
                container.innerHTML = `
                    <input type="text" class="length-value-1 bg-gray-700/80" placeholder="T">
                    <span class="text-gray-400">,</span>
                    <input type="text" class="length-value-2 bg-gray-700/80" placeholder="D">
                `;
                break;
            // For INT, TEXT, DATE, etc., the container remains empty
            default:
                break;
        }
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

            const dataType = row.querySelector('.data-type').value;
            let length = null;

            // Gather length/precision based on data type
            if (dataType === 'VARCHAR') {
                const lengthInput = row.querySelector('.length-value');
                if (lengthInput) length = lengthInput.value.trim();
            } else if (dataType === 'DECIMAL') {
                const totalInput = row.querySelector('.length-value-1');
                const decimalInput = row.querySelector('.length-value-2');
                if (totalInput && decimalInput && totalInput.value && decimalInput.value) {
                    length = `${totalInput.value.trim()},${decimalInput.value.trim()}`;
                }
            }

            columns.push({
                name: name,
                data_type: dataType,
                length: length,
                not_nullable: row.querySelector('.allow-null').checked,
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
            window.location.href = 'index.html';

        } catch (error) {
            console.error('Create table error:', error);
            alert(`Error: ${error.message}`);
        }
    });

    createColumnRow();
    lucide.createIcons();
});
