import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { NetworkHelper } from '@/services/networkHelper';
import { testConnection, initializeAPI } from '@/services/api';

export default function NetworkDebugScreen() {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  useEffect(() => {
    loadDebugInfo();
  }, []);

  const loadDebugInfo = async () => {
    const info = await NetworkHelper.getDebugInfo();
    setDebugInfo(info);
  };

  const addResult = (message: string) => {
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const clearResults = () => {
    setResults([]);
  };

  const testNetworkConnection = async () => {
    setTesting(true);
    clearResults();
    
    addResult('🚀 Starting network diagnostics...');
    
    try {
      const result = await testConnection();
      
      if (result.success) {
        addResult(`✅ SUCCESS: Connected to ${result.serverURL}`);
        Alert.alert(
          'Connection Successful! 🎉',
          `Server found at: ${result.serverURL}\\n\\nYou can now try logging in again.`,
          [
            { text: 'Go to Login', onPress: () => router.replace('/login') },
            { text: 'Stay Here', style: 'cancel' }
          ]
        );
      } else {
        addResult(`❌ FAILED: ${result.error}`);
        addResult('💡 Try the "Reset Network" option below');
      }
    } catch (error: any) {
      addResult(`❌ ERROR: ${error.message}`);
    }
    
    setTesting(false);
  };

  const resetNetworkSettings = async () => {
    setTesting(true);
    addResult('🔄 Resetting network settings...');
    
    try {
      await NetworkHelper.clearCache();
      addResult('✅ Network cache cleared');
      
      await initializeAPI();
      addResult('✅ API reinitialized');
      
      await loadDebugInfo();
      addResult('🔄 Debug info refreshed');
      
      Alert.alert(
        'Network Reset Complete',
        'Network settings have been reset. Try the connection test now.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      addResult(`❌ Reset failed: ${error.message}`);
    }
    
    setTesting(false);
  };

  const showDetailedDebugInfo = () => {
    const info = debugInfo ? JSON.stringify(debugInfo, null, 2) : 'No debug info available';
    Alert.alert('Detailed Debug Info', info);
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ThemedText style={styles.backButtonText}>←</ThemedText>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <ThemedText style={styles.title}>Network Debug</ThemedText>
            <ThemedText style={styles.subtitle}>Fix connection issues</ThemedText>
          </View>
        </View>

        {/* Current Status */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Current Status</ThemedText>
          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <ThemedText style={styles.statusLabel}>Cached Server:</ThemedText>
              <ThemedText style={styles.statusValue}>
                {debugInfo?.url || 'None'}
              </ThemedText>
            </View>
            <View style={styles.statusRow}>
              <ThemedText style={styles.statusLabel}>Platform:</ThemedText>
              <ThemedText style={styles.statusValue}>
                {debugInfo?.platform || 'Unknown'}
              </ThemedText>
            </View>
            <View style={styles.statusRow}>
              <ThemedText style={styles.statusLabel}>Cache Age:</ThemedText>
              <ThemedText style={styles.statusValue}>
                {debugInfo?.timestamp ? 
                  `${Math.round((Date.now() - debugInfo.timestamp) / 1000 / 60)}m ago` : 
                  'No cache'
                }
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Actions</ThemedText>
          
          <TouchableOpacity
            style={[styles.actionButton, testing && styles.actionButtonDisabled]}
            onPress={testNetworkConnection}
            disabled={testing}
          >
            {testing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <ThemedText style={styles.actionButtonText}>
                🔍 Test Connection
              </ThemedText>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.resetButton, testing && styles.actionButtonDisabled]}
            onPress={resetNetworkSettings}
            disabled={testing}
          >
            <ThemedText style={styles.actionButtonText}>
              🔄 Reset Network Settings
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.debugButton]}
            onPress={showDetailedDebugInfo}
          >
            <ThemedText style={styles.actionButtonText}>
              🐛 Show Debug Details
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* Results */}
        {results.length > 0 && (
          <View style={styles.section}>
            <View style={styles.resultsHeader}>
              <ThemedText style={styles.sectionTitle}>Test Results</ThemedText>
              <TouchableOpacity onPress={clearResults}>
                <ThemedText style={styles.clearButton}>Clear</ThemedText>
              </TouchableOpacity>
            </View>
            <View style={styles.resultsContainer}>
              {results.map((result, index) => (
                <Text key={index} style={styles.resultText}>
                  {result}
                </Text>
              ))}
            </View>
          </View>
        )}

        {/* Quick Setup Guide */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Quick Setup Guide</ThemedText>
          <View style={styles.guideCard}>
            <ThemedText style={styles.guideStep}>
              1. 🖥️ Start backend server: cd backend && npm run dev
            </ThemedText>
            <ThemedText style={styles.guideStep}>
              2. 📶 Make sure both devices are on same WiFi network
            </ThemedText>
            <ThemedText style={styles.guideStep}>
              3. 🔄 Try \"Reset Network Settings\" button above
            </ThemedText>
            <ThemedText style={styles.guideStep}>
              4. 🔍 Run \"Test Connection\" to find your server
            </ThemedText>
            <ThemedText style={styles.guideStep}>
              5. 🎉 Once connected, go back to login screen
            </ThemedText>
          </View>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  
  // Header
  header: {
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 24,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    left: 24,
    top: 70,
    zIndex: 1,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.accent,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.light.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.light.icon,
    textAlign: 'center',
  },

  // Sections
  section: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.primary,
    marginBottom: 16,
  },

  // Status Card
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: Colors.light.lightBlue,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.primary,
    flex: 1,
  },
  statusValue: {
    fontSize: 14,
    color: Colors.light.icon,
    fontFamily: 'monospace',
    flex: 1,
    textAlign: 'right',
  },

  // Action Buttons
  actionButton: {
    backgroundColor: Colors.light.accent,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: Colors.light.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonDisabled: {
    backgroundColor: '#ccc',
    shadowOpacity: 0,
    elevation: 0,
  },
  resetButton: {
    backgroundColor: '#F59E0B',
  },
  debugButton: {
    backgroundColor: '#6B7280',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },

  // Results
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  clearButton: {
    fontSize: 14,
    color: Colors.light.accent,
    fontWeight: '500',
  },
  resultsContainer: {
    backgroundColor: '#000',
    borderRadius: 8,
    padding: 12,
    maxHeight: 200,
  },
  resultText: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#00FF00',
    marginBottom: 4,
  },

  // Guide Card
  guideCard: {
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0f2fe',
  },
  guideStep: {
    fontSize: 14,
    color: Colors.light.primary,
    marginBottom: 8,
    lineHeight: 20,
  },

  // Bottom padding
  bottomPadding: {
    height: 40,
  },
});