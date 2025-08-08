import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
    ActivityIndicator,
} from 'react-native';
import { initializeAPI, testConnection, ServerConnection } from '@/services/api';

export function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isCheckingNetwork, setIsCheckingNetwork] = useState(false);
  const { login, isLoading } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    try {
      await login({ email, password });
      // Navigation is handled by AuthContext
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Login failed');
    }
  };

  const navigateToSignup = () => {
    router.push('/signup');
  };

  const handleNetworkDiagnostic = async () => {
    setIsCheckingNetwork(true);
    try {
      console.log('🔧 Testing network connection...');
      
      // Reset connection first to force fresh discovery
      ServerConnection.resetConnection();
      const result = await testConnection();
      
      if (result.success) {
        // Update API with working server
        await initializeAPI();
        
        Alert.alert(
          'Connection Fixed! ✅', 
          `Successfully connected to server at ${result.serverIP}:3001\n\n` +
          `Your app is now ready for login and signup!`,
          [{ text: 'Great!', style: 'default' }]
        );
      } else {
        Alert.alert(
          'Connection Failed ❌', 
          `Could not connect to any server.\n\n` +
          `Error: ${result.error}\n\n` +
          `Solutions:\n` +
          `• Ensure backend is running (npm run dev)\n` +
          `• Check WiFi connection\n` +
          `• Verify both devices on same network`,
          [
            { text: 'Help Me', onPress: () => showDetailedHelp() },
            { text: 'OK', style: 'default' }
          ]
        );
      }
    } catch (error: any) {
      Alert.alert(
        'Test Failed ❌', 
        `Network test encountered an error.\n\n` +
        `Error: ${error?.message || 'Unknown error'}\n\n` +
        `Please check your network settings.`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsCheckingNetwork(false);
    }
  };

  const showDetailedHelp = () => {
    Alert.alert(
      'Detailed Setup Help 🛠️',
      `Step-by-step troubleshooting:\n\n` +
      `1. BACKEND SERVER:\n` +
      `   • Open terminal in backend folder\n` +
      `   • Run: npm run dev\n` +
      `   • Look for "Server running on port 3001"\n\n` +
      `2. NETWORK CHECK:\n` +
      `   • Both devices on same WiFi\n` +
      `   • Try browser: http://192.168.0.2:3001/api/health\n\n` +
      `3. FIREWALL:\n` +
      `   • Temporarily disable Mac firewall\n` +
      `   • Or allow port 3001 in settings\n\n` +
      `4. STILL NOT WORKING?\n` +
      `   • Find your Mac's IP address\n` +
      `   • Restart both apps`,
      [{ text: 'Got It', style: 'default' }]
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <ThemedView style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <ThemedText style={styles.title}>Welcome Back</ThemedText>
            <ThemedText style={styles.subtitle}>
              Sign in to continue your mindful journey
            </ThemedText>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <ThemedText style={styles.label}>Email</ThemedText>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor={Colors.light.icon}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <ThemedText style={styles.label}>Password</ThemedText>
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor={Colors.light.icon}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              <ThemedText style={styles.buttonText}>
                {isLoading ? 'Signing In...' : 'Sign In'}
              </ThemedText>
            </TouchableOpacity>

            {/* Network Diagnostic Button */}
            <TouchableOpacity
              style={[styles.diagnosticButton, isCheckingNetwork && styles.buttonDisabled]}
              onPress={handleNetworkDiagnostic}
              disabled={isCheckingNetwork}
            >
              {isCheckingNetwork ? (
                <View style={styles.diagnosticLoadingContainer}>
                  <ActivityIndicator size="small" color={Colors.light.accent} />
                  <ThemedText style={styles.diagnosticLoadingText}>Testing servers...</ThemedText>
                </View>
              ) : (
                <ThemedText style={styles.diagnosticButtonText}>
                  🔧 Auto-Fix Network Connection
                </ThemedText>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <ThemedText style={styles.footerText}>
              Don&apos;t have an account?{' '}
            </ThemedText>
            <TouchableOpacity onPress={navigateToSignup}>
              <ThemedText style={styles.linkText}>Sign Up</ThemedText>
            </TouchableOpacity>
          </View>
        </ThemedView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.light.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.light.icon,
    textAlign: 'center',
    lineHeight: 24,
  },
  form: {
    flex: 1,
    justifyContent: 'center',
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.primary,
    marginBottom: 8,
  },
  input: {
    height: 56,
    borderWidth: 2,
    borderColor: Colors.light.lightBlue,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#fff',
    color: Colors.light.primary,
  },
  button: {
    height: 56,
    backgroundColor: Colors.light.accent,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: Colors.light.accent,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
  },
  footerText: {
    fontSize: 16,
    color: Colors.light.icon,
  },
  linkText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.accent,
  },
  diagnosticButton: {
    height: 48,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: Colors.light.accent,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  diagnosticButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.accent,
  },
  diagnosticLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  diagnosticLoadingText: {
    fontSize: 14,
    color: Colors.light.accent,
    marginLeft: 8,
  },
});
