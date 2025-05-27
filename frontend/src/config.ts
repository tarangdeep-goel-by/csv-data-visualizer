// Configuration for different environments
export const config = {
  // Use environment variable if available, otherwise fallback to development URL
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  
  // Other configuration options
  MAX_FILE_SIZE_MB: 50,
  ALLOWED_FILE_TYPES: ['.csv'],
  
  // Development flag
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
}; 