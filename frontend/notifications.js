// notification.js
export function showNotification(type, message) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

// Usage
showNotification('success', 'Login successful');
showNotification('error', 'Login failed');
