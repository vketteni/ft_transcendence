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
        const response = await fetch('http://localhost:8000/accounts/refresh/', {
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
    showScreen('registration-screen'); // Redirect to login screen
}

export async function fetchGameData() {
    const token = await ensureAccessToken();

    try {
        const response = await fetch('http://localhost:8000/', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (response.ok) {
            const data = await response.json();
            console.log('Protected Data:', data);
            // Process game data...
        } else {
            console.error("Failed to fetch game data");
        }
    } catch (error) {
        console.error('Error fetching protected data:', error);
    }
}
