import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Automatic IP Detection and Network configuration
const getLocalIP = async (): Promise<string> => {
  // For development, we can use a more reliable detection method
  const commonIPs = [
    '192.168.0.2',   // Current known working IP
    '192.168.1.1', '192.168.1.2', '192.168.1.3', '192.168.1.4',
    '192.168.0.1', '192.168.0.3', '192.168.0.4', '192.168.0.5',
    '10.0.0.1', '10.0.0.2', '172.16.0.1', '192.168.43.1'
  ];
  
  // Test each IP quickly
  for (const ip of commonIPs) {
    try {
      const response = await fetch(`http://${ip}:3001/api/health`, {
        method: 'GET',
        headers: { 'Cache-Control': 'no-cache' },
        signal: AbortSignal.timeout(3000)
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'ok') {
          console.log(`✅ Found working server at: ${ip}`);
          await AsyncStorage.setItem('lastWorkingIP', ip);
          return ip;
        }
      }
    } catch (error) {
      // Continue to next IP
    }
  }
  
  // If nothing works, return the known working IP as fallback
  return '192.168.0.2';
};

const NetworkConfig = {
  PORT: 3001,
  TIMEOUT: 10000,
  getServerIP: getLocalIP
};

// Simplified server connection
class ServerConnection {
  private static workingIP: string | null = null;
  
  static async findWorkingServer(): Promise<string> {
    console.log('🔍 Discovering server...');
    
    // Try cached IP first
    if (this.workingIP) {
      try {
        const response = await fetch(`http://${this.workingIP}:${NetworkConfig.PORT}/api/health`, {
          method: 'GET',
          signal: AbortSignal.timeout(3000)
        });
        if (response.ok) {
          console.log(`✅ Cached IP working: ${this.workingIP}`);
          return this.workingIP;
        }
      } catch (error) {
        this.workingIP = null;
      }
    }
    
    // Use automatic IP detection
    const detectedIP = await NetworkConfig.getServerIP();
    this.workingIP = detectedIP;
    return detectedIP;
  }
  
  static resetConnection() {
    this.workingIP = null;
  }
}

// Get API base URL
const getAPIBaseURL = async (): Promise<string> => {
  if (__DEV__) {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      const serverIP = await ServerConnection.findWorkingServer();
      return `http://${serverIP}:${NetworkConfig.PORT}/api`;
    } else {
      return `http://localhost:${NetworkConfig.PORT}/api`;
    }
  }
  return 'https://your-production-api.com/api';
};

// Initialize API with fallback
let currentBaseURL = `http://192.168.0.2:${NetworkConfig.PORT}/api`;

const initializeAPI = async (): Promise<string> => {
  try {
    console.log('🚀 Initializing API...');
    currentBaseURL = await getAPIBaseURL();
    api.defaults.baseURL = currentBaseURL;
    console.log(`✅ API initialized: ${currentBaseURL}`);
    return currentBaseURL;
  } catch (error) {
    console.error('❌ API initialization failed:', error);
    // Use fallback
    currentBaseURL = `http://192.168.0.2:${NetworkConfig.PORT}/api`;
    api.defaults.baseURL = currentBaseURL;
    console.log(`⚠️ Using fallback URL: ${currentBaseURL}`);
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
    
    // Auto-retry network errors (only once per request)
    if ((error.message === 'Network Error' || error.code === 'ECONNREFUSED') && !error.config?._autoRetried) {
      console.log('🔄 Connection failed, attempting recovery...');
      
      try {
        error.config._autoRetried = true;
        
        // Reset connection and find new server
        ServerConnection.resetConnection();
        const newBaseURL = await initializeAPI();
        error.config.baseURL = newBaseURL;
        
        console.log(`🔄 Retrying with ${newBaseURL}`);
        const retryResponse = await api.request(error.config);
        console.log('✅ Recovery successful!');
        return retryResponse;
        
      } catch (retryError: any) {
        console.log('❌ Recovery failed:', retryError?.message);
      }
    }
    
    // Provide helpful error message
    if (error.message === 'Network Error' || error.code === 'ECONNREFUSED') {
      const currentIP = currentBaseURL.match(/http:\/\/([^:]+):/)?.[1] || 'unknown';
      throw new Error(
        `Unable to connect to server at ${currentIP}:${NetworkConfig.PORT}\n\n` +
        `Quick fixes:\n` +
        `• Ensure backend server is running (npm run dev)\n` +
        `• Check both devices are on same WiFi network\n` +
        `• Restart the app and try again\n\n` +
        `Current server: ${currentBaseURL}`
      );
    }
    
    return Promise.reject(error);
  }
);

// Quick connection test function
const testConnection = async (): Promise<{ success: boolean; serverIP?: string; error?: string }> => {
  console.log('🔧 Testing connection...');
  
  try {
    const serverIP = await ServerConnection.findWorkingServer();
    const response = await fetch(`http://${serverIP}:${NetworkConfig.PORT}/api/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.status === 'ok') {
        console.log(`✅ Connection successful: ${serverIP}`);
        return { success: true, serverIP };
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

// Initialize immediately when module loads
initializeAPI().catch(console.error);

export default api;
export { 
  initializeAPI, 
  testConnection, 
  NetworkConfig,
  ServerConnection
};