import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { useGoals } from '@/hooks/useApi';
import { walletAPI, goalsAPI } from '@/services/apiServices';
import api from '@/services/api';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
    ActivityIndicator,
    Alert,
    Modal,
    TextInput,
} from 'react-native';
import { Calendar } from 'react-native-calendars';

interface Wallet {
  id: string;
  user_id: string;
  discipline_purse: number;
  focus_purse: number;
  mindfulness_purse: number;
  base_purse: number;
  reward_purse: number;
  remorse_purse: number;
  created_at: string;
  updated_at: string;
}

export default function DashboardScreen() {
  const { user, logout } = useAuth();
  const { goals, loading, fetchGoals } = useGoals();
  const router = useRouter();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [walletLoading, setWalletLoading] = useState(true);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [newTask, setNewTask] = useState({
    name: '',
    description: '',
    target_time: '',
  });
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');

  useEffect(() => {
    fetchWallet();
  }, []);

  const fetchWallet = async () => {
    try {
      setWalletLoading(true);
      const walletData = await walletAPI.getWallet();
      setWallet(walletData);
    } catch (error) {
      console.error('Error fetching wallet:', error);
    } finally {
      setWalletLoading(false);
    }
  };

  const handleCreateTask = async () => {
    if (!newTask.name || !newTask.description || !newTask.target_time) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      await goalsAPI.createCustomGoal({
        name: newTask.name,
        description: newTask.description,
        associated_tokens: 10, // Default token value
        target_time: newTask.target_time,
      });
      
      setNewTask({ name: '', description: '', target_time: '' });
      setSelectedDate('');
      setShowCreateTask(false);
      fetchGoals(); // Refresh goals list
      Alert.alert('Success', 'Task created successfully!');
    } catch (error) {
      console.error('Error creating task:', error);
      Alert.alert('Error', 'Failed to create task');
    }
  };

  const handleDayPress = (day: any) => {
    setSelectedDate(day.dateString);
    // Create a full datetime string (end of selected day)
    const targetDateTime = `${day.dateString}T23:59:59.000Z`;
    setNewTask({...newTask, target_time: targetDateTime});
    // Don't auto-close calendar to allow user to see selection and use confirm button
  };

  const formatDateDisplay = (dateString: string) => {
    if (!dateString) return 'Select target date';
    try {
      // Extract just the date part from ISO string
      const datePart = dateString.split('T')[0];
      const date = new Date(datePart);
      return date.toLocaleDateString();
    } catch {
      return 'Select target date';
    }
  };

  const formatTargetTime = (targetTime: string) => {
    try {
      const date = new Date(targetTime);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    } catch {
      return targetTime;
    }
  };

  const handleCompleteGoal = async (goalId: string) => {
    try {
      const response = await goalsAPI.completeGoal({ goal_id: goalId, completed: true });
      console.log('Goal completion response:', response);
      
      Alert.alert(
        'Goal Completed! 🎉', 
        `Congratulations! You have earned ${response.tokens_awarded || 0} tokens. Would you like to manage your tokens now?`,
        [
          { text: 'Later', style: 'cancel' },
          { 
            text: 'Send Tokens', 
            style: 'default',
            onPress: () => {
              fetchWallet(); // Refresh wallet to show updated tokens
              fetchGoals(); // Refresh goals
              router.push('/send-tokens');
            }
          },
        ]
      );
    } catch (error: any) {
      console.error('Error completing goal:', error);
      
      let errorMessage = 'Failed to complete goal';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Error', errorMessage);
    }
  };

  // const testNetworkConnection = async () => {
  //   try {
  //     Alert.alert('Testing Connection', 'Testing network connection to backend...');
  //     const response = await api.get('/goals');
  //     const customGoals = response.data.filter((goal: any) => !goal.is_default);
  //     Alert.alert(
  //       'Connection Success! ✅', 
  //       `Successfully connected to backend!\nFound ${customGoals.length} custom goals.`
  //     );
  //   } catch (error: any) {
  //     console.error('Network test failed:', error);
  //     Alert.alert(
  //       'Connection Failed ❌', 
  //       `Could not connect to backend:\n${error.message}\n\nCheck if backend is running and network is accessible.`
  //     );
  //   }
  // };

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

  if (loading || walletLoading) {
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
        <View style={styles.headerButtons}>
          {/* <TouchableOpacity style={styles.testButton} onPress={testNetworkConnection}>
            <ThemedText style={styles.testButtonText}>Test API</ThemedText>
          </TouchableOpacity> */}
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <ThemedText style={styles.logoutText}>Logout</ThemedText>
          </TouchableOpacity>
        </View>
      </View>

      {/* Wallet Overview */}
      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Token Wallet</ThemedText>
        
        {/* Total Portfolio */}
        <View style={styles.portfolioCard}>
          <ThemedText style={styles.portfolioLabel}>Total Portfolio</ThemedText>
          <ThemedText style={styles.portfolioValue}>
            {wallet ? 
              (wallet.discipline_purse + wallet.focus_purse + wallet.mindfulness_purse + 
               (wallet.base_purse || 0) + (wallet.reward_purse || 0) + (wallet.remorse_purse || 0)) : 0
            }
          </ThemedText>
        </View>

        {/* Main Token Purses */}
        {/* <View style={styles.walletGrid}>
          <View style={[styles.walletCard, { backgroundColor: Colors.light.primary }]}>
            <ThemedText style={styles.walletName}>Discipline</ThemedText>
            <ThemedText style={styles.walletBalance}>
              {wallet?.discipline_purse || 0}
            </ThemedText>
          </View>
          <View style={[styles.walletCard, { backgroundColor: Colors.light.accent }]}>
            <ThemedText style={styles.walletName}>Focus</ThemedText>
            <ThemedText style={styles.walletBalance}>
              {wallet?.focus_purse || 0}
            </ThemedText>
          </View>
          <View style={[styles.walletCard, { backgroundColor: Colors.light.success }]}>
            <ThemedText style={styles.walletName}>Mindfulness</ThemedText>
            <ThemedText style={styles.walletBalance}>
              {wallet?.mindfulness_purse || 0}
            </ThemedText>
          </View>
        </View> */}

        {/* Additional Purses */}
        <View style={styles.walletGrid}>
          <View style={[styles.walletCard, { backgroundColor: '#6B7280' }]}>
            <ThemedText style={styles.walletName}>Base Purse</ThemedText>
            <ThemedText style={styles.walletBalance}>
              {wallet?.base_purse || 0}
            </ThemedText>
          </View>
          <View style={[styles.walletCard, { backgroundColor: '#10B981' }]}>
            <ThemedText style={styles.walletName}>Reward Purse</ThemedText>
            <ThemedText style={styles.walletBalance}>
              {wallet?.reward_purse || 0}
            </ThemedText>
          </View>
          <View style={[styles.walletCard, { backgroundColor: '#EF4444' }]}>
            <ThemedText style={styles.walletName}>Remorse Purse</ThemedText>
            <ThemedText style={styles.walletBalance}>
              {wallet?.remorse_purse || 0}
            </ThemedText>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Quick Actions</ThemedText>
        <View style={styles.actionGrid}>
          <TouchableOpacity style={styles.actionCard} onPress={() => setShowCreateTask(true)}>
            <ThemedText style={styles.actionEmoji}>➕</ThemedText>
            <ThemedText style={styles.actionText}>Create Task</ThemedText>
          </TouchableOpacity>
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
        <ThemedText style={styles.sectionTitle}>My Custom Goals</ThemedText>
        {goals.filter(goal => !goal.is_default).length === 0 ? (
          <View style={styles.emptyState}>
            <ThemedText style={styles.emptyText}>No custom goals created yet</ThemedText>
            <ThemedText style={styles.emptySubText}>Tap &quot;Create Task&quot; to add your first goal!</ThemedText>
          </View>
        ) : (
          goals
            .filter(goal => !goal.is_default)
            .map((goal) => (
            <View key={goal.id} style={styles.goalCard}>
              <View style={styles.goalHeader}>
                <ThemedText style={styles.goalName}>{goal.name}</ThemedText>
                <ThemedText style={styles.goalTokens}>
                  {goal.associated_tokens} tokens
                </ThemedText>
              </View>
              <ThemedText style={styles.goalDescription}>{goal.description}</ThemedText>
              <View style={styles.goalFooter}>
                <View>
                  <ThemedText style={styles.goalTime}>Target: {formatTargetTime(goal.target_time)}</ThemedText>
                  <ThemedText style={styles.goalType}>Custom</ThemedText>
                </View>
                {goal.is_claimed ? (
                  <View style={styles.claimedButton}>
                    <ThemedText style={styles.claimedButtonText}>✓ Claimed</ThemedText>
                  </View>
                ) : (
                  <TouchableOpacity 
                    style={styles.completeButton}
                    onPress={() => handleCompleteGoal(goal.id)}
                  >
                    <ThemedText style={styles.completeButtonText}>Claim</ThemedText>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        )}
      </View>

      {/* Create Task Modal */}
      <Modal
        visible={showCreateTask}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <ThemedText style={styles.modalTitle}>Create New Task</ThemedText>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => {
                setShowCreateTask(false);
                setNewTask({ name: '', description: '', target_time: '' });
                setSelectedDate('');
              }}
            >
              <ThemedText style={styles.closeButtonText}>✕</ThemedText>
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalContent}>
            <View style={styles.inputContainer}>
              <ThemedText style={styles.inputLabel}>Task Name</ThemedText>
              <TextInput
                style={styles.input}
                value={newTask.name}
                onChangeText={(text) => setNewTask({...newTask, name: text})}
                placeholder="Enter task name"
                placeholderTextColor={Colors.light.icon}
              />
            </View>

            <View style={styles.inputContainer}>
              <ThemedText style={styles.inputLabel}>Description</ThemedText>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={newTask.description}
                onChangeText={(text) => setNewTask({...newTask, description: text})}
                placeholder="Enter task description"
                placeholderTextColor={Colors.light.icon}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.inputContainer}>
              <ThemedText style={styles.inputLabel}>Target Date</ThemedText>
              <TouchableOpacity 
                style={styles.datePickerButton}
                onPress={() => setShowCalendar(true)}
              >
                <ThemedText style={newTask.target_time ? styles.datePickerText : styles.datePickerPlaceholder}>
                  {formatDateDisplay(newTask.target_time)}
                </ThemedText>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={styles.createTaskButton}
              onPress={handleCreateTask}
            >
              <ThemedText style={styles.createTaskButtonText}>Create Task</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Calendar Popup Modal */}
      <Modal
        visible={showCalendar}
        animationType="slide"
        presentationStyle="pageSheet"
        transparent={true}
      >
        <View style={styles.calendarModalOverlay}>
          <View style={styles.calendarModal}>
            <View style={styles.calendarModalHeader}>
              <ThemedText style={styles.calendarModalTitle}>Select Target Date</ThemedText>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowCalendar(false)}
              >
                <ThemedText style={styles.closeButtonText}>✕</ThemedText>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.calendarWrapper} showsVerticalScrollIndicator={false}>
              <Calendar
                onDayPress={handleDayPress}
                markedDates={{
                  [selectedDate]: {
                    selected: true,
                    selectedColor: Colors.light.primary,
                  }
                }}
                minDate={new Date().toISOString().split('T')[0]}
                theme={{
                  selectedDayBackgroundColor: Colors.light.primary,
                  selectedDayTextColor: '#ffffff',
                  todayTextColor: Colors.light.accent,
                  dayTextColor: Colors.light.text,
                  textDisabledColor: Colors.light.icon,
                  dotColor: Colors.light.accent,
                  arrowColor: Colors.light.primary,
                  calendarBackground: '#ffffff',
                  textSectionTitleColor: Colors.light.primary,
                  monthTextColor: Colors.light.primary,
                  textDayFontWeight: '500',
                  textMonthFontWeight: 'bold',
                  textDayHeaderFontWeight: '600',
                }}
              />
            </ScrollView>
            
            <View style={styles.calendarModalActions}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowCalendar(false)}
              >
                <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
              </TouchableOpacity>
              {selectedDate && (
                <TouchableOpacity 
                  style={styles.confirmButton}
                  onPress={() => setShowCalendar(false)}
                >
                  <ThemedText style={styles.confirmButtonText}>Confirm</ThemedText>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
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
    flexWrap: 'wrap',
  },
  actionCard: {
    flex: 1,
    padding: 20,
    marginHorizontal: 4,
    backgroundColor: '#fff',
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minWidth: '30%',
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
  emptySubText: {
    fontSize: 14,
    color: Colors.light.icon,
    marginTop: 8,
    textAlign: 'center',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  testButton: {
    backgroundColor: Colors.light.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  testButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  // Portfolio styles
  portfolioCard: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  portfolioLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.icon,
    marginBottom: 8,
  },
  portfolioValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.light.primary,
  },
  // Complete button styles
  completeButton: {
    backgroundColor: Colors.light.accent,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  // Claimed button styles
  claimedButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  claimedButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.primary,
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 18,
    color: Colors.light.icon,
  },
  modalContent: {
    flex: 1,
    padding: 24,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.primary,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: Colors.light.text,
    backgroundColor: '#fff',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  createTaskButton: {
    backgroundColor: Colors.light.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  createTaskButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Date picker styles
  datePickerButton: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  datePickerText: {
    fontSize: 16,
    color: Colors.light.text,
  },
  // Add placeholder styling for when no date is selected
  datePickerPlaceholder: {
    fontSize: 16,
    color: Colors.light.icon,
  },
  // Calendar styles
  calendarContainer: {
    marginTop: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  calendarActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  cancelButton: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 10,
  },
  cancelButtonText: {
    color: Colors.light.text,
    fontSize: 14,
    fontWeight: '600',
  },
  // Calendar Modal styles
  calendarModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  calendarModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  calendarModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  calendarModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.primary,
  },
  calendarWrapper: {
    padding: 16,
    maxHeight: 400, // Limit height to make it scrollable if needed
  },
  calendarModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  confirmButton: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
