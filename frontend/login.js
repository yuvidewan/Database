document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const errorMessage = document.getElementById('error-message');

    // The base URL for your backend API, running on port 8000.
    const API_BASE_URL = 'http://localhost:8000';

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        errorMessage.textContent = '';
        errorMessage.classList.add('hidden');

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        const queryParams = new URLSearchParams({ username, password });
        const requestUrl = `${API_BASE_URL}/connection/test?${queryParams.toString()}`;
        
        try {
            const response = await fetch(requestUrl, { method: 'GET' });

            if (response.ok) {
                // --- NEW: Save credentials and redirect to databases page ---
                sessionStorage.setItem('db_user', username);
                sessionStorage.setItem('db_pass', password);
                window.location.href = 'databases.html'; // Redirect to the new page
            } else {
                const errorData = await response.json();
                errorMessage.textContent = errorData.detail || 'Connection failed.';
                errorMessage.classList.remove('hidden');
            }
        } catch (error) {
            console.error('Request failed:', error);
            errorMessage.textContent = 'Could not connect to the server. Is it running?';
            errorMessage.classList.remove('hidden');
        }
    });
});
