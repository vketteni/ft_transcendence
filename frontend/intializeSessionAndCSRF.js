export async function initializeSessionAndCSRF() {
    try {
        const response = await fetch('/api/accounts/csrf-token/', {
            method: 'GET',
            credentials: 'include', // Ensures cookies (csrftoken and sessionid) are sent
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status} - ${response.statusText}`);
        }

        const data = await response.json();
        console.log('CSRF Token:', data.csrftoken);
    } catch (error) {
        console.error('Error initializing CSRF and session:', error);
    }
}

