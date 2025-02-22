import { showScreen } from "./showScreen.js";

// Check if access token is expired and refresh if needed
async function ensureAccessToken() {
    const accessToken = localStorage.getItem('access_token');
    if (!accessToken || isTokenExpired(accessToken)) {
        console.log("Access token expired, refreshing...");
        await refreshAccessToken();
    }
    return localStorage.getItem('access_token');
}

// Decode JWT payload and check expiration
function isTokenExpired(token) {
    const payload = JSON.parse(atob(token.split('.')[1])); // Decode JWT payload
    const expiry = payload.exp * 1000; // Convert to milliseconds
    return Date.now() >= expiry;
}

// Refresh access token using refresh token stored in HTTP-only cookie
async function refreshAccessToken() {
    try {
        const response = await fetch('https://localhost:3000/accounts/refresh/', {
            method: 'POST',
            credentials: 'include', // Include refresh token cookie
        });

        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('access_token', data.access_token);
        } else {
            console.error("Failed to refresh token, logging out...");
            logout(); // Clear tokens and redirect to login
        }
    } catch (error) {
        console.error('Error refreshing token:', error);
        logout(); // Handle errors and redirect to login
    }
}

// Logout function
function logout() {
    localStorage.removeItem('access_token');
    alert("Session expired. Please log in again.");
    showScreen('signup-screen'); // Redirect to login screen
}

