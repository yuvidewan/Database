document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const errorMessage = document.getElementById('error-message');

    // FIX: API_BASE_URL is no longer needed
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        errorMessage.textContent = '';
        errorMessage.classList.add('hidden');

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        const queryParams = new URLSearchParams({ username, password });
        // FIX: Use relative path
        const requestUrl = `/connection/test?${queryParams.toString()}`;
        
        try {
            const response = await fetch(requestUrl, { method: 'GET' });

            if (response.ok) {
                sessionStorage.setItem('db_user', username);
                sessionStorage.setItem('db_pass', password);
                window.location.href = '/databases.html'; // Use absolute path from root
            } else {
                const errorData = await response.json();
                errorMessage.textContent = errorData.detail || 'Connection failed.';
                errorMessage.classList.remove('hidden');
            }
        } catch (error) {
            console.error('Request failed:', error);
            errorMessage.textContent = 'Could not connect to the server.';
            errorMessage.classList.remove('hidden');
        }
    });
});
