// apiService.js
export async function apiRequest(url, options = {}) {
	console.log("apiRequest() called.");
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
        },
        credentials: 'include', // Include cookies for authentication
    };

    const finalOptions = { ...defaultOptions, ...options };

    try {
        const response = await fetch(url, finalOptions);

        if (!response.ok) {
            // Handle HTTP errors (4xx, 5xx)
            const errorDetails = await response.json();
            throw new Error(errorDetails.message || 'Something went wrong');
        }

        const data = await response.json();
		console.log("Successful api request.");
        return {
            success: true,
            data,
        };
    } catch (error) {
		console.log("Error api request.");
        return {
            success: false,
            message: error.message || 'Unexpected error',
			type: error.message.includes('Server') ? 'server' : 'client',
        };
    }
}
