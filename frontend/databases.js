document.addEventListener('DOMContentLoaded', async () => {
    const dbListContainer = document.getElementById('database-list');
    const loadingMessage = document.getElementById('loading-message');
    const errorMessage = document.getElementById('error-message');
    const API_BASE_URL = 'http://localhost:8000';

    // Retrieve credentials from session storage
    const username = sessionStorage.getItem('db_user');
    const password = sessionStorage.getItem('db_pass');

    if (!username || !password) {
        // If no credentials, redirect back to login
        window.location.href = 'login.html';
        return;
    }

    try {
        const queryParams = new URLSearchParams({ username, password });
        // Fetch databases from your new endpoint
        const response = await fetch(`${API_BASE_URL}/connection/showdb?${queryParams.toString()}`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch databases.');
        }

        const databases = await response.json();
        loadingMessage.remove(); // Remove loading message

        // Create a clickable item for each database
        databases.forEach(dbName => {
            const dbItem = document.createElement('button');
            dbItem.className = 'w-full text-left p-3 rounded-md bg-gray-700/50 hover:bg-indigo-600/60 text-white font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500';
            dbItem.textContent = dbName;
            
            dbItem.addEventListener('click', () => {
                // Save the selected database and go to the main table view
                sessionStorage.setItem('selected_db', dbName);
                window.location.href = 'index.html';
            });
            
            dbListContainer.appendChild(dbItem);
        });

    } catch (error) {
        loadingMessage.remove();
        errorMessage.textContent = 'Could not load databases. Please check the connection and try again.';
        errorMessage.classList.remove('hidden');
        console.error('Error fetching databases:', error);
    }
});
