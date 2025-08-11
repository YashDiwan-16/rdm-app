import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Simple and reliable network helper for development
 */
export class NetworkHelper {
  private static readonly STORAGE_KEY = 'dev_server_config';
  private static readonly DEFAULT_PORT = 3001;
  
  /**
   * Get the best server URL for the current platform
   */
  static async getServerURL(): Promise<string> {
    // Try cached configuration first
    const cached = await this.getCachedConfig();
    if (cached) {
      const isWorking = await this.testServerHealth(cached);
      if (isWorking) {
        console.log('✅ Using cached server:', cached);
        return cached;
      }
    }

    // Platform-specific defaults
    const candidates = this.getServerCandidates();
    
    // Test each candidate
    for (const url of candidates) {
      console.log('🔍 Testing server:', url);
      const isWorking = await this.testServerHealth(url);
      if (isWorking) {
        console.log('✅ Found working server:', url);
        await this.cacheConfig(url);
        return url;
      }
    }

    // Return the most likely candidate as fallback
    const fallback = candidates[0];
    console.log('⚠️ No server responding, using fallback:', fallback);
    return fallback;
  }

  /**
   * Get server candidates based on platform
   */
  private static getServerCandidates(): string[] {
    const port = this.DEFAULT_PORT;
    
    if (Platform.OS === 'ios') {
      // iOS simulator prefers localhost, then network IPs
      return [
        `http://localhost:${port}/api`,
        `http://127.0.0.1:${port}/api`,
        `http://192.168.0.3:${port}/api`, // Current discovered IP
        `http://192.168.1.2:${port}/api`,
        `http://192.168.0.2:${port}/api`,
        `http://10.0.0.2:${port}/api`,
      ];
    } else if (Platform.OS === 'android') {
      // Android emulator and physical devices
      return [
        `http://10.0.2.2:${port}/api`, // Android emulator host
        `http://192.168.0.3:${port}/api`, // Current discovered IP
        `http://192.168.1.2:${port}/api`,
        `http://192.168.0.2:${port}/api`,
        `http://localhost:${port}/api`,
      ];
    } else {
      // Web/other platforms
      return [`http://localhost:${port}/api`];
    }
  }

  /**
   * Test if server is healthy with simple timeout
   */
  private static async testServerHealth(baseURL: string): Promise<boolean> {
    try {
      const healthURL = baseURL.replace('/api', '/api/health');
      
      // Create a promise that rejects after timeout
      const timeoutPromise = new Promise<Response>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 2000);
      });

      // Race between fetch and timeout
      const fetchPromise = fetch(healthURL, {
        method: 'GET',
        headers: { 'Cache-Control': 'no-cache' },
      });

      const response = await Promise.race([fetchPromise, timeoutPromise]);
      
      if (response.ok) {
        const data = await response.json();
        return data.status === 'ok';
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Cache working server configuration
   */
  private static async cacheConfig(serverURL: string): Promise<void> {
    try {
      const config = {
        url: serverURL,
        timestamp: Date.now(),
        platform: Platform.OS,
      };
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(config));
    } catch (error) {
      console.warn('Could not cache server config:', error);
    }
  }

  /**
   * Get cached server configuration if valid
   */
  private static async getCachedConfig(): Promise<string | null> {
    try {
      const cached = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (!cached) return null;

      const config = JSON.parse(cached);
      const age = Date.now() - config.timestamp;
      const maxAge = 30 * 60 * 1000; // 30 minutes

      // Return cached config if it's recent and for the same platform
      if (age < maxAge && config.platform === Platform.OS) {
        return config.url;
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Clear cached configuration
   */
  static async clearCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY);
      console.log('🗑️ Server cache cleared');
    } catch (error) {
      console.warn('Could not clear server cache:', error);
    }
  }

  /**
   * Get current cached server info for debugging
   */
  static async getDebugInfo(): Promise<any> {
    try {
      const cached = await AsyncStorage.getItem(this.STORAGE_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}