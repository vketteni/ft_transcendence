import { DOM } from './dom.js';

export async function handleLoginRedirect() {
    try {
        const response = await fetch('/accounts/login/redirect', {
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

// Save tokens
export function saveTokens(accessToken, refreshToken) {
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
}

// Retrieve tokens
export function getAccessToken() {
    return localStorage.getItem('access_token');
}

export function getRefreshToken() {
    return localStorage.getItem('refresh_token');
}

// Clear tokens on logout
export function clearTokens() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
}

export function isAuthenticated() {
    const token = getAccessToken();
    return !!token; // Return true if token exists
}

export function checkAuthentication() {
    if (!isAuthenticated()) {
        alert("You need to log in.");
        showScreen('login-screen');
    } else {
        showScreen('category-screen');
    }
}
