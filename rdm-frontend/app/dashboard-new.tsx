import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { useGoals } from '@/hooks/useApi';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
    ActivityIndicator,
    Alert,
} from 'react-native';

export default function DashboardScreen() {
  const { user, logout } = useAuth();
  const { goals, loading } = useGoals();
  const router = useRouter();

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout },
      ]
    );
  };

  const navigateToSendTokens = () => {
    router.push('/send-tokens');
  };

  const navigateToCharity = () => {
    router.push('/charity');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.accent} />
        <ThemedText style={styles.loadingText}>Loading dashboard...</ThemedText>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <ThemedText style={styles.welcomeText}>Welcome back!</ThemedText>
          <ThemedText style={styles.emailText}>{user?.email}</ThemedText>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <ThemedText style={styles.logoutText}>Logout</ThemedText>
        </TouchableOpacity>
      </View>

      {/* Wallet Overview */}
      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Token Wallet</ThemedText>
        <View style={styles.walletGrid}>
          <View style={[styles.walletCard, { backgroundColor: Colors.light.primary }]}>
            <ThemedText style={styles.walletName}>Discipline</ThemedText>
            <ThemedText style={styles.walletBalance}>0</ThemedText>
          </View>
          <View style={[styles.walletCard, { backgroundColor: Colors.light.accent }]}>
            <ThemedText style={styles.walletName}>Focus</ThemedText>
            <ThemedText style={styles.walletBalance}>0</ThemedText>
          </View>
          <View style={[styles.walletCard, { backgroundColor: Colors.light.success }]}>
            <ThemedText style={styles.walletName}>Mindfulness</ThemedText>
            <ThemedText style={styles.walletBalance}>0</ThemedText>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Quick Actions</ThemedText>
        <View style={styles.actionGrid}>
          <TouchableOpacity style={styles.actionCard} onPress={navigateToSendTokens}>
            <ThemedText style={styles.actionEmoji}>💸</ThemedText>
            <ThemedText style={styles.actionText}>Send Tokens</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={navigateToCharity}>
            <ThemedText style={styles.actionEmoji}>❤️</ThemedText>
            <ThemedText style={styles.actionText}>Donate</ThemedText>
          </TouchableOpacity>
        </View>
      </View>

      {/* Goals */}
      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Available Goals</ThemedText>
        {goals.length === 0 ? (
          <View style={styles.emptyState}>
            <ThemedText style={styles.emptyText}>No goals available</ThemedText>
          </View>
        ) : (
          goals.map((goal) => (
            <View key={goal.id} style={styles.goalCard}>
              <View style={styles.goalHeader}>
                <ThemedText style={styles.goalName}>{goal.name}</ThemedText>
                <ThemedText style={styles.goalTokens}>
                  {goal.associated_tokens} tokens
                </ThemedText>
              </View>
              <ThemedText style={styles.goalDescription}>{goal.description}</ThemedText>
              <View style={styles.goalFooter}>
                <ThemedText style={styles.goalTime}>Target: {goal.target_time}</ThemedText>
                <ThemedText style={styles.goalType}>
                  {goal.is_default ? 'Default' : 'Custom'}
                </ThemedText>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
  },
  loadingText: {
    marginTop: 16,
    color: Colors.light.text,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingTop: 60,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.primary,
  },
  emailText: {
    fontSize: 14,
    color: Colors.light.icon,
    marginTop: 4,
  },
  logoutButton: {
    backgroundColor: '#FF4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  logoutText: {
    color: '#fff',
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.primary,
    marginBottom: 16,
  },
  walletGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  walletCard: {
    flex: 1,
    padding: 16,
    marginHorizontal: 4,
    borderRadius: 12,
    alignItems: 'center',
  },
  walletName: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  walletBalance: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  actionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionCard: {
    flex: 1,
    padding: 20,
    marginHorizontal: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.primary,
  },
  goalCard: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  goalName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.light.primary,
    flex: 1,
  },
  goalTokens: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.accent,
  },
  goalDescription: {
    fontSize: 14,
    color: Colors.light.text,
    marginBottom: 12,
    lineHeight: 20,
  },
  goalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalTime: {
    fontSize: 12,
    color: Colors.light.icon,
  },
  goalType: {
    fontSize: 12,
    color: Colors.light.icon,
    fontStyle: 'italic',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: Colors.light.icon,
  },
});
