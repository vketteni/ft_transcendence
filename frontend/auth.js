export async function handleLoginRedirect() {
    try {
        const response = await fetch('/account/login/redirect', {
            method: 'GET',
            credentials: 'include', // Ensure cookies (if any) are sent with the request
        });
        
        if (!response.ok) {
            throw new Error('Failed to authenticate user.');
        }
        
        const data = await response.json();

        if (data.status === 'success') {
            // Save the token (if provided) and update the UI
            console.log('User:', data.user);
            localStorage.setItem('user', JSON.stringify(data.user));

            // Redirect to the provided URL or default to a fallback
            const redirectUrl = data.redirect_url; //|| 'http://localhost:3000'
            console.log('Redirect URL:', data.redirect_url);
            window.location.href = redirectUrl;

        } else {
            console.error(data.message);
            alert('Authentication failed: ' + data.message);
        }
    } catch (error) {
        console.error('Error during login redirect handling:', error);
        alert('An error occurred while processing your login. Please try again.');
    }
}