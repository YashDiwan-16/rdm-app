import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSegments } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (!isLoading) {
      const inAuthGroup = segments[0] === 'login' || segments[0] === 'signup';
      
      if (!isAuthenticated && !inAuthGroup) {
        // User is not authenticated and not on login/signup page
        router.replace('/login');
      } else if (isAuthenticated && inAuthGroup) {
        // User is authenticated but on login/signup page
        router.replace('/dashboard');
      }
    }
  }, [isAuthenticated, isLoading, segments, router]);

  if (isLoading) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: Colors.light.background
      }}>
        <ActivityIndicator size="large" color={Colors.light.accent} />
        <ThemedText style={{ marginTop: 16, color: Colors.light.text }}>
          Loading...
        </ThemedText>
      </View>
    );
  }

  return <>{children}</>;
};
