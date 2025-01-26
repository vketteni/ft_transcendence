import { displayError, logErrorToService } from './errorHandler.js';
import { apiRequest } from './apiService.js';

// Function to update the login state
export function getLoginState() {
    if (localStorage.getItem('isLoggedIn') == "true")
        return true;
    else
        return false;
}

// Function to update the login state
export function setLoginState(state) {
    localStorage.setItem('isLoggedIn', state);
}

export async function handleLoginRedirect(code) {
    const response = await apiRequest(`/api/accounts/login/redirect/?code=${code}`);

    if (response.success) {
        console.log('Login successful:', response.data.user.username);
		localStorage.setItem('user', JSON.stringify(data.user));

		// Redirect to the provided URL or default to a fallback
		const redirectUrl = data.redirect_url; //|| 'https://localhost:3000'
		console.log('Redirect URL:', data.redirect_url);
		window.location.href = redirectUrl;
        // Update app state, e.g., save user info
    } else {
		displayError(response.message);
        logErrorToService(response.message);
        // Display an error message to the user
    }
}
