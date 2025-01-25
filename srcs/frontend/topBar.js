import { isLoggedIn } from "./auth.js";

export function updateTopBar() {
    const loggedInLinks = document.querySelectorAll('.logged-in');
    const loggedOutLinks = document.querySelectorAll('.logged-out');
    
    if (isLoggedIn) {
        // Show logged-in links and hide logged-out links
        loggedInLinks.forEach(link => link.style.display = 'block');
        loggedOutLinks.forEach(link => link.style.display = 'none');
    } else {
        // Show logged-out links and hide logged-in links
        loggedInLinks.forEach(link => link.style.display = 'none')
        loggedOutLinks.forEach(link => link.style.display = 'block')
	}
}