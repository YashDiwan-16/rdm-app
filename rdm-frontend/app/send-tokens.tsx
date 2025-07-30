import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface TokenWallet {
  name: string;
  balance: number;
  color: string;
}

export default function SendTokensScreen() {
  const [sendMode, setSendMode] = useState<'self' | 'others'>('self');
  const [selectedPurse, setSelectedPurse] = useState('');
  const [amount, setAmount] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [showPurseDropdown, setShowPurseDropdown] = useState(false);
  
  const [wallets] = useState<TokenWallet[]>([
    { name: 'Base Purse', balance: 150, color: Colors.light.accent },
    { name: 'Reward Purse', balance: 75, color: Colors.light.success },
  ]);

  const handleSendTokens = () => {
    if (sendMode === 'self') {
      if (!selectedPurse || !amount) {
        Alert.alert('Error', 'Please select a purse and enter an amount');
        return;
      }
      
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        Alert.alert('Error', 'Please enter a valid amount');
        return;
      }
      
      Alert.alert('Success!', `${amount} tokens sent to your ${selectedPurse}!`);
    } else {
      if (!recipientName.trim() || !recipientAddress.trim() || !amount) {
        Alert.alert('Error', 'Please fill in all fields');
        return;
      }
      
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        Alert.alert('Error', 'Please enter a valid amount');
        return;
      }
      
      Alert.alert('Success!', `${amount} tokens sent to ${recipientName}!`);
    }
    
    // Reset form
    setAmount('');
    setRecipientName('');
    setRecipientAddress('');
    setSelectedPurse('');
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
            <ThemedText style={styles.backButtonText}>← Back</ThemedText>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <ThemedText style={styles.title}>Send Tokens</ThemedText>
            <ThemedText style={styles.subtitle}>Transfer your earned tokens</ThemedText>
          </View>
        </View>

        {/* Send Mode Toggle */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Send To</ThemedText>
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[styles.toggleButton, sendMode === 'self' && styles.toggleButtonActive]}
              onPress={() => setSendMode('self')}
            >
              <ThemedText style={[styles.toggleText, sendMode === 'self' && styles.toggleTextActive]}>
                💼 To Self
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleButton, sendMode === 'others' && styles.toggleButtonActive]}
              onPress={() => setSendMode('others')}
            >
              <ThemedText style={[styles.toggleText, sendMode === 'others' && styles.toggleTextActive]}>
                👥 To Others
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        {/* Send to Self Form */}
        {sendMode === 'self' && (
          <View style={styles.section}>
            <View style={styles.formCard}>
              <ThemedText style={styles.cardTitle}>Transfer to Your Purse</ThemedText>
              
              {/* Purse Selection */}
              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>Select Purse</ThemedText>
                <View style={styles.dropdownContainer}>
                  <TouchableOpacity 
                    style={styles.dropdownButton}
                    onPress={() => setShowPurseDropdown(!showPurseDropdown)}
                  >
                    <ThemedText style={styles.dropdownButtonText}>
                      {selectedPurse || 'Choose your purse'}
                    </ThemedText>
                    <ThemedText style={styles.dropdownArrow}>
                      {showPurseDropdown ? '▲' : '▼'}
                    </ThemedText>
                  </TouchableOpacity>
                  
                  {showPurseDropdown && (
                    <View style={styles.dropdownList}>
                      {wallets.map((wallet, index) => (
                        <TouchableOpacity
                          key={index}
                          style={styles.dropdownItem}
                          onPress={() => {
                            setSelectedPurse(wallet.name);
                            setShowPurseDropdown(false);
                          }}
                        >
                          <View style={[styles.purseIndicator, { backgroundColor: wallet.color }]} />
                          <View style={styles.purseInfo}>
                            <ThemedText style={styles.purseName}>{wallet.name}</ThemedText>
                            <ThemedText style={styles.purseBalance}>{wallet.balance} tokens</ThemedText>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              </View>

              {/* Amount Input */}
              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>Amount</ThemedText>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter token amount"
                  placeholderTextColor="#999"
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>
        )}

        {/* Send to Others Form */}
        {sendMode === 'others' && (
          <View style={styles.section}>
            <View style={styles.formCard}>
              <ThemedText style={styles.cardTitle}>Send to Someone Else</ThemedText>
              
              {/* Recipient Name */}
              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>Recipient Name</ThemedText>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter recipient's name"
                  placeholderTextColor="#999"
                  value={recipientName}
                  onChangeText={setRecipientName}
                />
              </View>

              {/* Wallet Address */}
              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>Wallet Address</ThemedText>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter wallet address"
                  placeholderTextColor="#999"
                  value={recipientAddress}
                  onChangeText={setRecipientAddress}
                  autoCapitalize="none"
                />
              </View>

              {/* Amount Input */}
              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>Amount</ThemedText>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter token amount"
                  placeholderTextColor="#999"
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>
        )}

        {/* Send Button */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.sendButton}
            onPress={handleSendTokens}
          >
            <ThemedText style={styles.sendButtonText}>💸 Send Tokens</ThemedText>
          </TouchableOpacity>
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
  },

  // Section
  section: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.light.primary,
    marginBottom: 16,
  },

  // Toggle
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 4,
    borderWidth: 2,
    borderColor: Colors.light.lightBlue,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: Colors.light.accent,
    shadowColor: Colors.light.accent,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  toggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.primary,
  },
  toggleTextActive: {
    color: '#fff',
  },

  // Form
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    borderWidth: 2,
    borderColor: Colors.light.lightBlue,
    shadowColor: Colors.light.accent,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.primary,
    marginBottom: 20,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.primary,
    marginBottom: 8,
  },
  textInput: {
    height: 56,
    borderWidth: 2,
    borderColor: Colors.light.lightBlue,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#fff',
    color: Colors.light.primary,
  },

  // Dropdown
  dropdownContainer: {
    position: 'relative',
    zIndex: 1000,
  },
  dropdownButton: {
    height: 56,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: Colors.light.lightBlue,
    borderRadius: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownButtonText: {
    fontSize: 16,
    color: Colors.light.primary,
    fontWeight: '500',
  },
  dropdownArrow: {
    fontSize: 16,
    color: Colors.light.icon,
    fontWeight: 'bold',
  },
  dropdownList: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.light.lightBlue,
    shadowColor: Colors.light.accent,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1001,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  purseIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  purseInfo: {
    flex: 1,
  },
  purseName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.primary,
    marginBottom: 2,
  },
  purseBalance: {
    fontSize: 14,
    color: Colors.light.icon,
  },

  // Send Button
  sendButton: {
    height: 56,
    backgroundColor: Colors.light.accent,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.light.accent,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  sendButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },

  // Bottom padding
  bottomPadding: {
    height: 40,
  },
});
