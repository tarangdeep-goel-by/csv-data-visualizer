import axios, { AxiosInstance } from 'axios';
import { config } from '../config';

// Create axios instance with base URL
export const api: AxiosInstance = axios.create({
  baseURL: config.API_BASE_URL,
  timeout: 30000, // 30 seconds timeout
  // Don't set default Content-Type - let axios handle it based on request data
});

// Export isAxiosError function
export const isAxiosError = axios.isAxiosError;

// Request interceptor for content type handling and debugging
api.interceptors.request.use(
  (config) => {
    // Set content type based on request data
    if (config.data instanceof FormData) {
      // For FormData, let axios set the content type automatically (with boundary)
      delete config.headers['Content-Type'];
    } else {
      // For other requests, default to JSON
      config.headers['Content-Type'] = 'application/json';
    }
    
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`, {
      contentType: config.headers['Content-Type'],
      dataType: config.data?.constructor?.name
    });
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default api; 