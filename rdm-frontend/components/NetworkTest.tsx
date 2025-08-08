import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { testConnection, initializeAPI, ServerConnection } from '../services/api';

const NetworkTest: React.FC = () => {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<string>('');

  const handleTestConnection = async () => {
    setTesting(true);
    setResult('Testing connection...');
    
    try {
      const testResult = await testConnection();
      
      if (testResult.success) {
        setResult(`✅ Connected successfully!\nServer: ${testResult.serverIP}:3001`);
      } else {
        setResult(`❌ Connection failed\nError: ${testResult.error}`);
      }
    } catch (error: any) {
      setResult(`❌ Test failed: ${error.message}`);
    }
    
    setTesting(false);
  };

  const handleResetConnection = async () => {
    setTesting(true);
    setResult('Resetting connection...');
    
    try {
      ServerConnection.resetConnection();
      await initializeAPI();
      setResult('✅ Connection reset successfully!');
    } catch (error: any) {
      setResult(`❌ Reset failed: ${error.message}`);
    }
    
    setTesting(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Network Diagnostics</Text>
      
      <TouchableOpacity
        style={styles.button}
        onPress={handleTestConnection}
        disabled={testing}
      >
        {testing ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Test Connection</Text>
        )}
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.button, styles.resetButton]}
        onPress={handleResetConnection}
        disabled={testing}
      >
        <Text style={styles.buttonText}>Reset Connection</Text>
      </TouchableOpacity>
      
      {result ? (
        <View style={styles.resultContainer}>
          <Text style={styles.resultText}>{result}</Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    margin: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  resetButton: {
    backgroundColor: '#FF6B6B',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultContainer: {
    marginTop: 15,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  resultText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});

export default NetworkTest;