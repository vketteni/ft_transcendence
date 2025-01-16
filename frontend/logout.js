import { apiRequest } from './apiService.js';
import { setLoginState } from './auth.js';
import { getCookie } from './getCookie.js';
import { updateTopBar } from './topBar.js';

export async function handleLogout() {
    try {

		const csrftoken = getCookie('csrftoken');
		const response = await fetch('/api/accounts/logout/', {
		  method: 'GET',
		  credentials: 'include',
		  headers: {
			'X-CSRFToken': csrftoken,
			'Content-Type': 'application/json',
		  },
		  // body: JSON.stringify(...), if needed
		});
		const data = await response.json();

        if (data.logged_in == false) {
            console.log('Logout successful:', data.logged_in);
            // Clear or reset any local state indicating the user is authenticated
			alert(`Logged out!`);
            setLoginState(data.logged_in);
			updateTopBar();
            // // Optionally redirect user or show a "Logged out" screen
            // window.location.href = '/';
        } else {
            console.error('Logout error:', data.logged_in);
            alert(`Logout failed: ${data.logged_in}`);
        }
    } catch (error) {
        console.error('Network or server error during logout:', error);
        alert('An error occurred while logging out. Please try again.');
    }
}

