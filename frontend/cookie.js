export function getCookie(name) {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        // Check if the cookie name matches
        if (cookie.startsWith(name + '=')) {
            return decodeURIComponent(cookie.substring(name.length + 1));
        }
    }
    return null; // Return null if not found
}

export function setCookie(name, value, options = {}) {
    const { path = '/', domain, secure = false, sameSite = 'Lax', expires } = options;

    let cookieString = `${name}=${encodeURIComponent(value)}; Path=${path};`;

    if (domain) cookieString += ` Domain=${domain};`;
    if (secure) cookieString += ' Secure;';
    if (sameSite) cookieString += ` SameSite=${sameSite};`;
    if (expires) {
        const expiryDate = new Date(expires).toUTCString();
        cookieString += ` Expires=${expiryDate};`;
    }
    console.log("setCookie: ", cookieString);
    document.cookie = cookieString;
}

