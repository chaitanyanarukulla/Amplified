/**
 * Centralized API utility for making authenticated requests
 */

const API_BASE_URL = 'http://localhost:8000';

/**
 * Make an authenticated API request
 * @param {string} endpoint - API endpoint (e.g., '/voice-profile')
 * @param {object} options - Fetch options
 * @returns {Promise<Response>}
 */
export const apiRequest = async (endpoint, options = {}) => {
    const token = localStorage.getItem('auth_token');

    // Determine if the body is FormData (has append method)
    const isFormData = options.body && typeof options.body.append === 'function';

    const headers = {
        // Only set JSON content type when not sending FormData
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...options.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
    });

    // Handle 401 Unauthorized - token expired or invalid
    if (response.status === 401) {
        localStorage.removeItem('auth_token');
        window.location.reload(); // Force re-auth
    }

    return response;
};

/**
 * GET request
 */
export const apiGet = async (endpoint) => {
    return apiRequest(endpoint, { method: 'GET' });
};

/**
 * POST request
 */
export const apiPost = async (endpoint, data) => {
    return apiRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify(data),
    });
};

/**
 * PUT request
 */
export const apiPut = async (endpoint, data) => {
    return apiRequest(endpoint, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
};

/**
 * DELETE request
 */
export const apiDelete = async (endpoint) => {
    return apiRequest(endpoint, { method: 'DELETE' });
};

/**
 * Upload file with authentication
 */
export const apiUpload = async (endpoint, formData) => {
    const token = localStorage.getItem('auth_token');

    const headers = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers,
        body: formData, // Don't set Content-Type for FormData
    });

    if (response.status === 401) {
        localStorage.removeItem('auth_token');
        window.location.reload();
    }

    return response;
};
