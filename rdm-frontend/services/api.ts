import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { NetworkHelper } from './networkHelper';

// Network configuration
const NetworkConfig = {
  PORT: 3001,
  TIMEOUT: 10000,
};

// Get API base URL using the reliable network helper
const getAPIBaseURL = async (): Promise<string> => {
  if (__DEV__) {
    return await NetworkHelper.getServerURL();
  }
  return 'https://your-production-api.com/api';
};

// Initialize API with platform-appropriate defaults
let currentBaseURL = `http://localhost:${NetworkConfig.PORT}/api`;

const initializeAPI = async (): Promise<string> => {
  try {
    console.log('🚀 Initializing API...');
    currentBaseURL = await getAPIBaseURL();
    api.defaults.baseURL = currentBaseURL;
    console.log(`✅ API initialized: ${currentBaseURL}`);
    return currentBaseURL;
  } catch (error) {
    console.error('❌ API initialization failed:', error);
    // Smart fallback based on platform
    const fallbackURL = Platform.OS === 'ios' ? 
      `http://localhost:${NetworkConfig.PORT}/api` : 
      `http://192.168.0.2:${NetworkConfig.PORT}/api`;
    
    currentBaseURL = fallbackURL;
    api.defaults.baseURL = currentBaseURL;
    console.log(`⚠️ Using ${Platform.OS} fallback URL: ${currentBaseURL}`);
    return currentBaseURL;
  }
};

// Create axios instance
const api = axios.create({
  baseURL: currentBaseURL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      console.log(`📤 ${config.method?.toUpperCase()} ${config.url}`);
    } catch (error) {
      console.error('Error getting auth token:', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor with auto-recovery
api.interceptors.response.use(
  (response) => {
    console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
    return response;
  },
  async (error) => {
    const method = error.config?.method?.toUpperCase();
    const url = error.config?.url;
    console.log(`❌ ${method} ${url} - ${error.message}`);
    
    // Handle auth errors first
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('userData');
      return Promise.reject(error);
    }
    
    // Auto-retry network errors with better logic (only once per request)
    const isNetworkError = error.message === 'Network Error' || 
                          error.code === 'ECONNREFUSED' || 
                          error.name === 'AbortError' ||
                          error.message?.includes('Failed to fetch');
                          
    if (isNetworkError && !error.config?._autoRetried) {
      console.log('🔄 Connection failed, attempting recovery...');
      
      try {
        error.config._autoRetried = true;
        
        // Clear cache and find new server
        await NetworkHelper.clearCache();
        const newBaseURL = await initializeAPI();
        
        // Update the request config
        const retryConfig = {
          ...error.config,
          baseURL: newBaseURL,
          timeout: 10000 // Increase timeout for retry
        };
        
        console.log(`🔄 Retrying with ${newBaseURL}`);
        const retryResponse = await api.request(retryConfig);
        console.log('✅ Recovery successful!');
        return retryResponse;
        
      } catch (retryError: any) {
        console.log('❌ Recovery failed:', retryError?.message);
        // Don't throw the retry error, throw a more user-friendly message
      }
    }
    
    // Provide helpful error message for network issues (reuse the existing check)
    if (isNetworkError) {
      const currentIP = currentBaseURL.match(/http:\/\/([^:]+):/)?.[1] || 'unknown';
      
      // Check if we're in development and suggest simple fixes
      if (__DEV__) {
        throw new Error(
          `Cannot connect to development server.\n\n` +
          `• Make sure backend is running: npm run dev\n` +
          `• Check IP address: ${currentIP}\n` +
          `• Try restarting both frontend and backend`
        );
      } else {
        throw new Error('Network connection failed. Please check your internet connection.');
      }
    }
    
    return Promise.reject(error);
  }
);

// Quick connection test function
const testConnection = async (): Promise<{ success: boolean; serverURL?: string; error?: string }> => {
  console.log('🔧 Testing connection...');
  
  try {
    const serverURL = await NetworkHelper.getServerURL();
    
    // Test the server directly
    const healthURL = serverURL.replace('/api', '/api/health');
    const timeoutPromise = new Promise<Response>((_, reject) => {
      setTimeout(() => reject(new Error('Timeout')), 3000);
    });

    const fetchPromise = fetch(healthURL, {
      method: 'GET',
      headers: { 'Cache-Control': 'no-cache' },
    });

    const response = await Promise.race([fetchPromise, timeoutPromise]);
    
    if (response.ok) {
      const data = await response.json();
      if (data.status === 'ok') {
        console.log(`✅ Connection successful: ${serverURL}`);
        return { success: true, serverURL };
      }
    }
    
    throw new Error('Server responded but health check failed');
  } catch (error: any) {
    console.log(`❌ Connection test failed: ${error.message}`);
    return { 
      success: false, 
      error: error.message || 'Connection failed'
    };
  }
};

// Initialize API when module loads with error handling
initializeAPI().catch((error) => {
  console.warn('⚠️ Initial API setup failed, will retry on first request:', error.message);
});

export default api;
export { 
  initializeAPI, 
  testConnection, 
  NetworkConfig,
  NetworkHelper
};