import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Determine the base URL based on the platform
const getBaseURL = () => {
  if (__DEV__) {
    // Development environment
    const DEV_SERVER_IP = '192.168.0.3'; // Updated to your current IP address
    
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      // For Expo Go on physical device, use your computer's IP address
      // For iOS simulator or Android emulator, localhost should work
      return `http://${DEV_SERVER_IP}:3001/api`;
    } else {
      return 'http://localhost:3001/api'; // Web
    }
  }
  // Production environment - replace with your actual production URL
  return 'https://your-production-api.com/api';
};

const BASE_URL = getBaseURL();

console.log(`🔗 API Base URL: ${BASE_URL}`);
console.log(`📱 Platform: ${Platform.OS}`);
console.log(`🔧 Dev Mode: ${__DEV__}`);

// Create axios instance
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting auth token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Success: ${response.config.method?.toUpperCase()} ${response.config.url}`);
    return response;
  },
  async (error) => {
    console.log(`❌ API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url}`);
    console.log('Error details:', error.message);
    console.log('Base URL being used:', BASE_URL);
    
    if (error.response?.status === 401) {
      // Token expired or invalid, clear storage
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('userData');
    }
    return Promise.reject(error);
  }
);

export default api;
