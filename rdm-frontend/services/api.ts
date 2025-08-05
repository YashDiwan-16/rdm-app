import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Network configuration with multiple IP detection strategies
const NetworkConfig = {
  // Primary IP (update this when your network changes)
  PRIMARY_IP: '192.168.0.2',
  
  // Backup IPs to try automatically
  BACKUP_IPS: [
    '192.168.0.1', '192.168.0.3', '192.168.0.4', '192.168.0.5',
    '192.168.1.1', '192.168.1.2', '192.168.1.3', '192.168.1.4',
    '10.0.0.1', '10.0.0.2', '172.16.0.1', '192.168.43.1'
  ],
  
  PORT: 3001,
  TIMEOUT: 5000
};

// Smart server discovery
class ServerDiscovery {
  private static workingIP: string | null = null;
  
  static async findWorkingServer(): Promise<string> {
    console.log('🔍 Starting server discovery...');
    
    // Step 1: Try cached working IP
    if (this.workingIP) {
      if (await this.testIP(this.workingIP)) {
        console.log(`✅ Cached IP working: ${this.workingIP}`);
        return this.workingIP;
      }
    }
    
    // Step 2: Try stored working IP
    const storedIP = await AsyncStorage.getItem('lastWorkingIP');
    if (storedIP && storedIP !== this.workingIP) {
      if (await this.testIP(storedIP)) {
        console.log(`✅ Stored IP working: ${storedIP}`);
        this.workingIP = storedIP;
        return storedIP;
      }
    }
    
    // Step 3: Try primary IP
    console.log(`🎯 Testing primary IP: ${NetworkConfig.PRIMARY_IP}`);
    if (await this.testIP(NetworkConfig.PRIMARY_IP)) {
      console.log(`✅ Primary IP working: ${NetworkConfig.PRIMARY_IP}`);
      this.workingIP = NetworkConfig.PRIMARY_IP;
      await AsyncStorage.setItem('lastWorkingIP', NetworkConfig.PRIMARY_IP);
      return NetworkConfig.PRIMARY_IP;
    }
    
    // Step 4: Try backup IPs
    console.log('🔄 Primary IP failed, trying backups...');
    for (const ip of NetworkConfig.BACKUP_IPS) {
      console.log(`🧪 Testing backup: ${ip}`);
      if (await this.testIP(ip)) {
        console.log(`✅ Backup IP working: ${ip}`);
        this.workingIP = ip;
        await AsyncStorage.setItem('lastWorkingIP', ip);
        return ip;
      }
    }
    
    // Step 5: All failed - return primary as fallback
    console.log('❌ All IPs failed, using primary as fallback');
    return NetworkConfig.PRIMARY_IP;
  }
  
  private static async testIP(ip: string): Promise<boolean> {
    try {
      const response = await axios.get(`http://${ip}:${NetworkConfig.PORT}/api/health`, {
        timeout: NetworkConfig.TIMEOUT,
        headers: { 'Cache-Control': 'no-cache' }
      });
      return response.data?.status === 'ok';
    } catch (error) {
      return false;
    }
  }
  
  static async testConnection(ip: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await axios.get(`http://${ip}:${NetworkConfig.PORT}/api/health`, {
        timeout: NetworkConfig.TIMEOUT
      });
      
      if (response.data?.status === 'ok') {
        return { success: true };
      } else {
        return { success: false, error: 'Invalid server response' };
      }
    } catch (error: any) {
      return { 
        success: false, 
        error: error.code === 'ENOTFOUND' ? 'Server not found' : 
               error.code === 'ECONNREFUSED' ? 'Connection refused' :
               error.code === 'TIMEOUT' ? 'Connection timeout' :
               error.message || 'Unknown error'
      };
    }
  }
}

// Get API base URL
const getAPIBaseURL = async (): Promise<string> => {
  if (__DEV__) {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      const serverIP = await ServerDiscovery.findWorkingServer();
      return `http://${serverIP}:${NetworkConfig.PORT}/api`;
    } else {
      return `http://localhost:${NetworkConfig.PORT}/api`;
    }
  }
  return 'https://your-production-api.com/api';
};

// Initialize API
let currentBaseURL = `http://${NetworkConfig.PRIMARY_IP}:${NetworkConfig.PORT}/api`;

const initializeAPI = async (): Promise<string> => {
  try {
    console.log('🚀 Initializing API...');
    currentBaseURL = await getAPIBaseURL();
    api.defaults.baseURL = currentBaseURL;
    console.log(`🔗 API Base URL: ${currentBaseURL}`);
    return currentBaseURL;
  } catch (error) {
    console.error('❌ API initialization failed:', error);
    throw error;
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

// Response interceptor with smart retry
api.interceptors.response.use(
  (response) => {
    console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
    return response;
  },
  async (error) => {
    const method = error.config?.method?.toUpperCase();
    const url = error.config?.url;
    console.log(`❌ ${method} ${url} - ${error.message}`);
    
    // Auto-retry on network error (once per request)
    if (error.message === 'Network Error' && !error.config?._autoRetried) {
      console.log('🔄 Network error detected, attempting auto-recovery...');
      
      try {
        error.config._autoRetried = true;
        
        // Force server rediscovery
        const newBaseURL = await initializeAPI();
        error.config.baseURL = newBaseURL;
        
        console.log(`🔄 Retrying ${method} ${url} with ${newBaseURL}`);
        const retryResponse = await api.request(error.config);
        console.log('✅ Auto-recovery successful!');
        return retryResponse;
        
      } catch (retryError: any) {
        console.log('❌ Auto-recovery failed:', retryError?.message);
      }
    }
    
    // Handle auth errors
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('userData');
    }
    
    // Enhanced error message
    if (error.message === 'Network Error') {
      const currentIP = currentBaseURL.match(/http:\/\/([^:]+):/)?.[1] || 'unknown';
      throw new Error(
        `Network connection failed to ${currentIP}:${NetworkConfig.PORT}\n\n` +
        `Troubleshooting steps:\n` +
        `1. Check backend server is running\n` +
        `2. Verify both devices on same WiFi\n` +
        `3. Try "Fix Connection" button below\n` +
        `4. Check firewall/antivirus settings\n\n` +
        `Current server: ${currentBaseURL}`
      );
    }
    
    return Promise.reject(error);
  }
);

// Manual diagnostics function
const runDiagnostics = async (): Promise<{
  success: boolean;
  results: Array<{ ip: string; success: boolean; error?: string; responseTime?: number }>;
  workingIP?: string;
}> => {
  const results: Array<{ ip: string; success: boolean; error?: string; responseTime?: number }> = [];
  const ipsToTest = [NetworkConfig.PRIMARY_IP, ...NetworkConfig.BACKUP_IPS];
  
  console.log('🔧 Running network diagnostics...');
  
  for (const ip of ipsToTest) {
    const startTime = Date.now();
    const result = await ServerDiscovery.testConnection(ip);
    const responseTime = Date.now() - startTime;
    
    results.push({
      ip,
      success: result.success,
      error: result.error,
      responseTime: result.success ? responseTime : undefined
    });
    
    if (result.success) {
      console.log(`✅ ${ip} - ${responseTime}ms`);
      return {
        success: true,
        results,
        workingIP: ip
      };
    } else {
      console.log(`❌ ${ip} - ${result.error}`);
    }
  }
  
  return { success: false, results };
};

// Initialize on app start
setTimeout(() => {
  initializeAPI().catch(console.error);
}, 1000);

export default api;
export { 
  initializeAPI, 
  runDiagnostics, 
  NetworkConfig,
  ServerDiscovery
};