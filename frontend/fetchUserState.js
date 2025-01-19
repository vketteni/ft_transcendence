import { getCookie } from "./cookie.js";
import { setLoginState } from "./auth.js";
import { updateTopBar } from "./topBar.js";
import { showScreen } from "./showScreen.js";

let loginHandled = false;

export async function fetchUserState(loginWindow = null) {
	try {

		const response = await fetch('/api/accounts/user/status/poll/', {
			method: 'GET',
			credentials: 'include',
		  });
		  console.log(getCookie('browser_id'));
		const data = await response.json();

		if (loginHandled) {
			// If login was already handled, stop further processing
			console.log('Login already handled, ignoring further responses.');
			return;
		}

		if (data.logged_in) {
			console.log('Polling detected successful login.');
			loginHandled = true;
			console.log("loginWindow: ", loginWindow, "loginWindow.closed: ", loginWindow.closed);
			localStorage.setItem('access_token', data.access_token);
			if (loginWindow && !loginWindow.closed) loginWindow.close();
			setLoginState(data.logged_in);
			updateTopBar();
			showScreen('category-screen');
			alert(`Welcome, ${data.user.username}!`);


		} else if (data.error) {
			console.log('Polling detected login failure.');
			loginHandled = true;
			if (loginWindow && !loginWindow.closed) loginWindow.close();
			alert(`Login failed: ${data.error}`);
		} else if (data.timeout) {
			console.log('Polling timed out. Sending a new request.');
			fetchUserState(loginWindow); // Restart Polling
		}
	} catch (error) {
		console.error('Error during Polling:', error);
	}
};