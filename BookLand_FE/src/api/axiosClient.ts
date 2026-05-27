import axios from 'axios';
import { toast } from 'react-toastify';

const axiosClient = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});


// Request Interceptor
axiosClient.interceptors.request.use(
    async (config) => {
        // Determine if we are in admin area, shipper area, or shop area to use appropriate token
        const isAdminCallback = window.location.pathname.startsWith('/admin');
        const isShipperCallback = window.location.pathname.startsWith('/shop/shipper') && !window.location.pathname.startsWith('/shop/shipper/login');
        const tokenKey = isAdminCallback ? 'adminToken' : isShipperCallback ? 'shipperToken' : 'customerToken';
        let token = localStorage.getItem(tokenKey);

        // Auto Refresh Token for Customer (Shop) - not admin, not shipper
        if (!isAdminCallback && !isShipperCallback) {
            const refreshToken = localStorage.getItem('customerRefreshToken');
            const hasRefreshToken = refreshToken && refreshToken !== 'undefined';
            let shouldRefresh = false;

            if (token) {
                try {
                    const { jwtDecode } = await import('jwt-decode');
                    const decoded: any = jwtDecode(token);
                    const now = Date.now() / 1000;
                    
                    // If token is about to expire (less than 5 minutes)
                    if (decoded.exp && decoded.exp - now < 300) {
                        shouldRefresh = true;
                    }
                } catch (error) {
                    console.error('Error decoding token, attempting refresh', error);
                    shouldRefresh = true;
                }
            } else if (hasRefreshToken) {
                // No access token but we have a refresh token
                shouldRefresh = true;
            }

            if (shouldRefresh && hasRefreshToken) {
                try {
                    const response = await axios.post(`${import.meta.env.VITE_API_URL}/auth/refresh`, {
                        token: refreshToken
                    });

                    if (response.data && response.data.code === 1000 && response.data.result) {
                        const { token: newToken } = response.data.result;
                        if (newToken) {
                            localStorage.setItem('customerToken', newToken);
                            token = newToken;
                            console.log('Successfully refreshed customer access token');
                        }
                    } else {
                        throw new Error("Refresh token response failed");
                    }
                } catch (refreshError) {
                    console.error('Failed to refresh customer token', refreshError);
                    localStorage.removeItem('customerToken');
                    localStorage.removeItem('customerRefreshToken');
                    localStorage.removeItem('customerUserId');
                    if (!window.location.pathname.includes('/shop/login')) {
                        window.location.href = '/shop/login';
                    }
                }
            }
        }

        // Auto Refresh Token for Admin
        if (isAdminCallback) {
            const refreshToken = localStorage.getItem('adminRefreshToken');
            const hasRefreshToken = refreshToken && refreshToken !== 'undefined';
            let shouldRefresh = false;

            if (token) {
                try {
                    const { jwtDecode } = await import('jwt-decode');
                    const decoded: any = jwtDecode(token);
                    const now = Date.now() / 1000;

                    // If token is about to expire (less than 5 minutes)
                    if (decoded.exp && decoded.exp - now < 300) {
                        shouldRefresh = true;
                    }
                } catch (error) {
                    console.error('Error decoding admin token, attempting refresh', error);
                    shouldRefresh = true;
                }
            } else if (hasRefreshToken) {
                // No access token but we have a refresh token
                shouldRefresh = true;
            }

            if (shouldRefresh && hasRefreshToken) {
                try {
                    const response = await axios.post(`${import.meta.env.VITE_API_URL}/auth/refresh`, {
                        token: refreshToken
                    });

                    if (response.data && response.data.code === 1000 && response.data.result) {
                        const { token: newToken } = response.data.result;
                        if (newToken) {
                            localStorage.setItem('adminToken', newToken);
                            token = newToken;
                            console.log('Successfully refreshed admin access token');
                        }
                    } else {
                        throw new Error("Admin refresh token response failed");
                    }
                } catch (refreshError) {
                    console.error('Failed to refresh admin token', refreshError);
                    localStorage.removeItem('adminToken');
                    localStorage.removeItem('adminRefreshToken');
                    if (!window.location.pathname.includes('/admin/login')) {
                        window.location.href = '/admin/login';
                    }
                }
            }
        }

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response Interceptor
axiosClient.interceptors.response.use(
    (response) => {
        return response.data ? response.data : response;
    },
    (error) => {
        
        // Handle common errors (401, 403, etc.)
        if (error.response) {
            const status = error.response.status;
            // const data = error.response.data;

            // Handle Backend Error Codes if present
            // if (data && data.code && data.message) {
                 // toast.error(data.message); // Disabled automatic toast
                 // return Promise.reject(error);
            // }

            // Fallback for standard HTTP errors
            switch (status) {
                case 400:
                    // toast.error('Bad Request: Please check your input.');
                    break;
                case 401:
                    // toast.error('Unauthorized access. Please login.');
                    if (window.location.pathname.startsWith('/admin')) {
                        if (!window.location.pathname.includes('/admin/login')) {
                            localStorage.removeItem('adminToken');
                            localStorage.removeItem('adminRefreshToken');
                            window.location.href = '/admin/login';
                        }
                    } else if (window.location.pathname.startsWith('/shop/shipper')) {
                        if (!window.location.pathname.includes('/shop/shipper/login')) {
                            localStorage.removeItem('shipperToken');
                            localStorage.removeItem('shipperRefreshToken');
                            window.location.href = '/shop/shipper/login';
                        }
                    } else {
                        if (!window.location.pathname.includes('/shop/login')) {
                            localStorage.removeItem('customerToken');
                            localStorage.removeItem('customerRefreshToken');
                            localStorage.removeItem('customerUserId');
                            window.location.href = '/shop/login';
                        }
                    }
                    break;
                case 403:
                    // toast.error('Forbidden: You do not have permission.');
                    break;
                case 404:
                    // toast.error('Not Found: The requested resource could not be found.');
                    break;
                case 500:
                    // Keep 500 as it's usually a server crash
                    toast.error('Internal Server Error: Something went wrong on the server.');
                    break;
                default:
                    // toast.error(`An error occurred: ${status}`);
                    break;
            }
        } else if (error.request) {
            toast.error('No response received from server. Please check your network connection.');
        } else {
            toast.error(`Error setting up request: ${error.message}`);
        }
        
        return Promise.reject(error);
    }
);

export default axiosClient;
