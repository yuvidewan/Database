document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const errorMessage = document.getElementById('error-message');

    // The base URL for your backend API, running on port 8000.
    const API_BASE_URL = 'http://localhost:8000';

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        errorMessage.textContent = '';
        errorMessage.classList.add('hidden');

        // 1. Get username and password from the form
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        // 2. Create a URLSearchParams object to build the query string
        const queryParams = new URLSearchParams({
            username: username,
            password: password
        });

        // 3. Construct the full URL for the POST request, including the query parameters
        //    This will hit your specific endpoint: POST /connection/show
        const requestUrl = `${API_BASE_URL}/connection/show?${queryParams.toString()}`;
        
        try {
            // 4. Make the fetch call with the correct URL and POST method
            const response = await fetch(requestUrl, {
                method: 'POST', 
                // Note: No body is needed since the data is in the URL
            });

            if (response.ok) {
                window.location.href = 'index.html';
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
