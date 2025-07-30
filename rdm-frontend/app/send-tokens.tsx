import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { router } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
    ActivityIndicator,
} from 'react-native';
import { walletAPI } from '@/services/apiServices';

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

export default function SendTokensScreen() {
  const [sendMode, setSendMode] = useState<'self' | 'others'>('self');
  const [selectedPurse, setSelectedPurse] = useState('');
  const [fromPurse, setFromPurse] = useState('');
  const [amount, setAmount] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [showPurseDropdown, setShowPurseDropdown] = useState(false);
  const [showFromPurseDropdown, setShowFromPurseDropdown] = useState(false);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [transferLoading, setTransferLoading] = useState(false);

  useEffect(() => {
    fetchWallet();
  }, []);

  const fetchWallet = async () => {
    try {
      setLoading(true);
      const walletData = await walletAPI.getWallet();
      setWallet(walletData);
    } catch (error) {
      console.error('Error fetching wallet:', error);
      Alert.alert('Error', 'Failed to load wallet data');
    } finally {
      setLoading(false);
    }
  };

  const getAvailablePurses = () => {
    if (!wallet) return [];
    
    return [
      { name: 'Base Purse', balance: wallet.base_purse, color: '#6B7280', key: 'base' },
      { name: 'Reward Purse', balance: wallet.reward_purse, color: '#10B981', key: 'reward' },
    ];
  };

  const getSelfTransferPurses = () => {
    // For self-transfer, show only base and reward purses
    if (!wallet) return [];
    
    return [
      { name: 'Base Purse', balance: wallet.base_purse, color: '#6B7280', key: 'base' },
      { name: 'Reward Purse', balance: wallet.reward_purse, color: '#10B981', key: 'reward' },
    ];
  };

  const getFromPurses = () => {
    // For any transfer, show all purses with balance > 0
    return getAvailablePurses().filter(purse => purse.balance > 0);
  };

  const handleSendTokens = async () => {
    if (sendMode === 'self') {
      if (!selectedPurse || !fromPurse || !amount) {
        Alert.alert('Error', 'Please select source and destination purses and enter an amount');
        return;
      }
      
      if (selectedPurse === fromPurse) {
        Alert.alert('Error', 'Source and destination purses cannot be the same');
        return;
      }
      
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        Alert.alert('Error', 'Please enter a valid amount');
        return;
      }

      const sourcePurse = getFromPurses().find(p => p.key === fromPurse);
      if (!sourcePurse || sourcePurse.balance < numAmount) {
        Alert.alert('Error', 'Insufficient balance in source purse');
        return;
      }

      try {
        setTransferLoading(true);
        await walletAPI.transferTokens({
          to_purse: selectedPurse,
          from_purse: fromPurse,
          amount: numAmount,
          type: 'self-transfer'
        });
        
        Alert.alert('Success!', `${amount} tokens transferred from ${sourcePurse.name} to ${getSelfTransferPurses().find(p => p.key === selectedPurse)?.name}!`);
        await fetchWallet(); // Refresh wallet data
        
        // Reset form
        setAmount('');
        setSelectedPurse('');
        setFromPurse('');
      } catch (error) {
        console.error('Transfer error:', error);
        Alert.alert('Error', 'Failed to transfer tokens');
      } finally {
        setTransferLoading(false);
      }
    } else {
      if (!recipientName.trim() || !recipientAddress.trim() || !amount || !fromPurse) {
        Alert.alert('Error', 'Please fill in all fields');
        return;
      }
      
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        Alert.alert('Error', 'Please enter a valid amount');
        return;
      }

      const sourcePurse = getFromPurses().find(p => p.key === fromPurse);
      if (!sourcePurse || sourcePurse.balance < numAmount) {
        Alert.alert('Error', 'Insufficient balance in source purse');
        return;
      }

      try {
        setTransferLoading(true);
        await walletAPI.transferTokens({
          to_user_id: recipientAddress, // Using address as user ID for now
          to_purse: 'base', // Default to base purse for external transfers
          from_purse: fromPurse,
          amount: numAmount,
          type: 'peer'
        });
        
        Alert.alert('Success!', `${amount} tokens sent to ${recipientName}!`);
        await fetchWallet(); // Refresh wallet data
        
        // Reset form
        setAmount('');
        setRecipientName('');
        setRecipientAddress('');
        setFromPurse('');
      } catch (error) {
        console.error('Transfer error:', error);
        Alert.alert('Error', 'Failed to send tokens. Please check recipient address.');
      } finally {
        setTransferLoading(false);
      }
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.accent} />
        <ThemedText style={styles.loadingText}>Loading wallet...</ThemedText>
      </View>
    );
  }

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
              <ThemedText style={styles.cardTitle}>Transfer Between Your Purses</ThemedText>
              
              {/* From Purse Selection */}
              <View style={[styles.inputGroup, { zIndex: 1000 }]}>
                <ThemedText style={styles.inputLabel}>From Purse</ThemedText>
                <View style={styles.dropdownContainer}>
                  <TouchableOpacity 
                    style={styles.dropdownButton}
                    onPress={() => {
                      setShowFromPurseDropdown(!showFromPurseDropdown);
                      setShowPurseDropdown(false); // Close other dropdown
                    }}
                  >
                    <ThemedText style={styles.dropdownButtonText}>
                      {fromPurse ? getFromPurses().find(p => p.key === fromPurse)?.name || 'Choose source purse' : 'Choose source purse'}
                    </ThemedText>
                    <ThemedText style={styles.dropdownArrow}>
                      {showFromPurseDropdown ? '▲' : '▼'}
                    </ThemedText>
                  </TouchableOpacity>
                  
                  {showFromPurseDropdown && (
                    <View style={styles.dropdownList}>
                      {getFromPurses().map((purse, index) => (
                        <TouchableOpacity
                          key={index}
                          style={styles.dropdownItem}
                          onPress={() => {
                            setFromPurse(purse.key);
                            setShowFromPurseDropdown(false);
                          }}
                        >
                          <View style={[styles.purseIndicator, { backgroundColor: purse.color }]} />
                          <View style={styles.purseInfo}>
                            <ThemedText style={styles.purseName}>{purse.name}</ThemedText>
                            <ThemedText style={styles.purseBalance}>{purse.balance} tokens</ThemedText>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              </View>

              {/* To Purse Selection */}
              <View style={[styles.inputGroup, { zIndex: 999 }]}>
                <ThemedText style={styles.inputLabel}>To Purse</ThemedText>
                <View style={styles.dropdownContainer}>
                  <TouchableOpacity 
                    style={styles.dropdownButton}
                    onPress={() => {
                      setShowPurseDropdown(!showPurseDropdown);
                      setShowFromPurseDropdown(false); // Close other dropdown
                    }}
                  >
                    <ThemedText style={styles.dropdownButtonText}>
                      {selectedPurse ? getSelfTransferPurses().find(p => p.key === selectedPurse)?.name || 'Choose destination purse' : 'Choose destination purse'}
                    </ThemedText>
                    <ThemedText style={styles.dropdownArrow}>
                      {showPurseDropdown ? '▲' : '▼'}
                    </ThemedText>
                  </TouchableOpacity>
                  
                  {showPurseDropdown && (
                    <View style={styles.dropdownList}>
                      {getSelfTransferPurses().filter(purse => purse.key !== fromPurse).map((purse, index) => (
                        <TouchableOpacity
                          key={index}
                          style={styles.dropdownItem}
                          onPress={() => {
                            setSelectedPurse(purse.key);
                            setShowPurseDropdown(false);
                          }}
                        >
                          <View style={[styles.purseIndicator, { backgroundColor: purse.color }]} />
                          <View style={styles.purseInfo}>
                            <ThemedText style={styles.purseName}>{purse.name}</ThemedText>
                            <ThemedText style={styles.purseBalance}>{purse.balance} tokens</ThemedText>
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
                {fromPurse && (
                  <ThemedText style={styles.balanceHint}>
                    Available: {getFromPurses().find(p => p.key === fromPurse)?.balance || 0} tokens
                  </ThemedText>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Send to Others Form */}
        {sendMode === 'others' && (
          <View style={styles.section}>
            <View style={styles.formCard}>
              <ThemedText style={styles.cardTitle}>Send to Someone Else</ThemedText>
              
              {/* From Purse Selection */}
              <View style={[styles.inputGroup, { zIndex: 1000 }]}>
                <ThemedText style={styles.inputLabel}>From Purse</ThemedText>
                <View style={styles.dropdownContainer}>
                  <TouchableOpacity 
                    style={styles.dropdownButton}
                    onPress={() => setShowFromPurseDropdown(!showFromPurseDropdown)}
                  >
                    <ThemedText style={styles.dropdownButtonText}>
                      {fromPurse ? getFromPurses().find(p => p.key === fromPurse)?.name || 'Choose source purse' : 'Choose source purse'}
                    </ThemedText>
                    <ThemedText style={styles.dropdownArrow}>
                      {showFromPurseDropdown ? '▲' : '▼'}
                    </ThemedText>
                  </TouchableOpacity>
                  
                  {showFromPurseDropdown && (
                    <View style={styles.dropdownList}>
                      {getFromPurses().map((purse, index) => (
                        <TouchableOpacity
                          key={index}
                          style={styles.dropdownItem}
                          onPress={() => {
                            setFromPurse(purse.key);
                            setShowFromPurseDropdown(false);
                          }}
                        >
                          <View style={[styles.purseIndicator, { backgroundColor: purse.color }]} />
                          <View style={styles.purseInfo}>
                            <ThemedText style={styles.purseName}>{purse.name}</ThemedText>
                            <ThemedText style={styles.purseBalance}>{purse.balance} tokens</ThemedText>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              </View>

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
                <ThemedText style={styles.inputLabel}>Wallet Address (User ID)</ThemedText>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter recipient's user ID"
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
                {fromPurse && (
                  <ThemedText style={styles.balanceHint}>
                    Available: {getFromPurses().find(p => p.key === fromPurse)?.balance || 0} tokens
                  </ThemedText>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Send Button */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={[styles.sendButton, transferLoading && styles.sendButtonDisabled]}
            onPress={handleSendTokens}
            disabled={transferLoading}
          >
            {transferLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <ThemedText style={styles.sendButtonText}>💸 Send Tokens</ThemedText>
            )}
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
    zIndex: 1,
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
    zIndex: 9999,
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
    elevation: 10,
    zIndex: 99999,
    maxHeight: 200,
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

  // Loading styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
  },
  loadingText: {
    marginTop: 16,
    color: Colors.light.text,
    fontSize: 16,
  },

  // Balance hint
  balanceHint: {
    fontSize: 12,
    color: Colors.light.icon,
    marginTop: 4,
    fontStyle: 'italic',
  },

  // Send button disabled state
  sendButtonDisabled: {
    backgroundColor: '#ccc',
    shadowOpacity: 0,
    elevation: 0,
  },

  // Balance info styles
  balanceInfo: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  balanceText: {
    fontSize: 14,
    color: Colors.light.primary,
    fontWeight: '600',
  },
});
