// errorHandler.js
export function displayError(message) {
    const errorDiv = document.getElementById('error-display');
    errorDiv.textContent = message;
    errorDiv.classList.add('visible');
}

export function logErrorToService(error) {
    console.error('Logging error:', error);
    // Send to a monitoring service
}
