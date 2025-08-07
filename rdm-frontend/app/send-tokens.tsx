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
    ActivityIndicator,
    Modal,
} from 'react-native';
import { walletAPI } from '@/services/apiServices';
import { useWallet } from '@/contexts/WalletContext';

export default function SendTokensScreen() {
  const { wallet, isLoading, refreshWallet } = useWallet();
  const [sendMode, setSendMode] = useState<'self' | 'charity'>('self');
  const [selectedPurse, setSelectedPurse] = useState('');
  const [fromPurse, setFromPurse] = useState('');
  const [amount, setAmount] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [showPurseDropdown, setShowPurseDropdown] = useState(false);
  const [showFromPurseDropdown, setShowFromPurseDropdown] = useState(false);
  const [transferLoading, setTransferLoading] = useState(false);
  const [selectedPercentage, setSelectedPercentage] = useState<string>('');
  const [showHistory, setShowHistory] = useState(false);
  const [transactionHistory, setTransactionHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);


  const getSelfTransferPurses = () => {
    // For self-transfer, show all purses except charity (charity is destination only)
    if (!wallet) return [];
    
    return [
      { name: 'Base Purse', balance: wallet.base_purse, color: '#6B7280', key: 'base' },
      { name: 'Reward Purse', balance: wallet.reward_purse, color: '#10B981', key: 'reward' },
      { name: 'Remorse Purse', balance: wallet.remorse_purse, color: '#EF4444', key: 'remorse' },
    ];
  };

  const getFromPurses = () => {
    // For transfers TO charity, show base, reward, and remorse purses with balance > 0
    return [
      { name: 'Base Purse', balance: wallet?.base_purse || 0, color: '#6B7280', key: 'base' },
      { name: 'Reward Purse', balance: wallet?.reward_purse || 0, color: '#10B981', key: 'reward' },
      { name: 'Remorse Purse', balance: wallet?.remorse_purse || 0, color: '#EF4444', key: 'remorse' },
    ].filter(purse => purse.balance > 0);
  };


  const loadTransactionHistory = async () => {
    try {
      setHistoryLoading(true);
      const history = await walletAPI.getTransactionHistory();
      setTransactionHistory(history);
    } catch (error) {
      console.error('Error loading transaction history:', error);
      Alert.alert('Error', 'Failed to load transaction history');
    } finally {
      setHistoryLoading(false);
    }
  };

  const calculatePercentageAmount = (percentage: string) => {
    if (!fromPurse || !wallet) return 0;
    
    const sourcePurse = getFromPurses().find(p => p.key === fromPurse);
    if (!sourcePurse) return 0;
    
    const balance = sourcePurse.balance;
    
    switch (percentage) {
      case 'max':
        return balance;
      case '50':
        return parseFloat((balance * 0.5).toFixed(2));
      case '25':
        return parseFloat((balance * 0.25).toFixed(2));
      default:
        return 0;
    }
  };

  const handlePercentageSelect = (percentage: string) => {
    setSelectedPercentage(percentage);
    const calculatedAmount = calculatePercentageAmount(percentage);
    setAmount(calculatedAmount.toString());
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

      const sourcePurse = getFromPurses().find(p => p.key === fromPurse) || getSelfTransferPurses().find(p => p.key === fromPurse);
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
        
        const destPurse = getSelfTransferPurses().find(p => p.key === selectedPurse);
        Alert.alert('Success!', `${amount} tokens transferred from ${sourcePurse.name} to ${destPurse?.name}!`);
        await refreshWallet(); // Refresh wallet data
        
        // Reset form
        setAmount('');
        setSelectedPurse('');
        setFromPurse('');
        setSelectedPercentage('');
      } catch (error) {
        console.error('Transfer error:', error);
        Alert.alert('Error', 'Failed to transfer tokens');
      } finally {
        setTransferLoading(false);
      }
    } else if (sendMode === 'charity') {
      if (!fromPurse || !amount) {
        Alert.alert('Error', 'Please select source purse and enter an amount');
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
          to_purse: 'charity',
          from_purse: fromPurse,
          amount: numAmount,
          type: 'self-transfer' // Charity is treated as self-transfer to charity purse
        });
        
        Alert.alert('Success!', `${amount} tokens moved from ${sourcePurse.name} to Charity Purse for future donations!`);
        await refreshWallet(); // Refresh wallet data
        
        // Reset form
        setAmount('');
        setFromPurse('');
        setSelectedPercentage('');
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
        await refreshWallet(); // Refresh wallet data
        
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

  if (isLoading) {
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
            <ThemedText style={styles.backButtonText}>←</ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.historyButton}
            onPress={() => {
              setShowHistory(true);
              loadTransactionHistory();
            }}
          >
            <ThemedText style={styles.historyButtonText}>📊</ThemedText>
          </TouchableOpacity>
        </View>

        {/* Send Mode Toggle */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Send Tokens </ThemedText>
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[styles.toggleButton, sendMode === 'self' && styles.toggleButtonActive]}
              onPress={() => {
                setSendMode('self');
                setAmount('');
                setSelectedPercentage('');
                setFromPurse('');
                setSelectedPurse('');
              }}
            >
              <ThemedText style={[styles.toggleText, sendMode === 'self' && styles.toggleTextActive]}>
                💼 Between Purses
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleButton, sendMode === 'charity' && styles.toggleButtonActive]}
              onPress={() => {
                setSendMode('charity');
                setAmount('');
                setSelectedPercentage('');
                setFromPurse('');
                setSelectedPurse('');
              }}
            >
              <ThemedText style={[styles.toggleText, sendMode === 'charity' && styles.toggleTextActive]}>
                ❤️ To Charity
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
                
                {/* Percentage Buttons for Self Transfer */}
                {fromPurse && (
                  <View style={styles.percentageContainer}>
                    <TouchableOpacity
                      style={[styles.percentageButton, selectedPercentage === '25' && styles.percentageButtonActive]}
                      onPress={() => handlePercentageSelect('25')}
                    >
                      <ThemedText style={[styles.percentageText, selectedPercentage === '25' && styles.percentageTextActive]}>25%</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.percentageButton, selectedPercentage === '50' && styles.percentageButtonActive]}
                      onPress={() => handlePercentageSelect('50')}
                    >
                      <ThemedText style={[styles.percentageText, selectedPercentage === '50' && styles.percentageTextActive]}>50%</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.percentageButton, selectedPercentage === 'max' && styles.percentageButtonActive]}
                      onPress={() => handlePercentageSelect('max')}
                    >
                      <ThemedText style={[styles.percentageText, selectedPercentage === 'max' && styles.percentageTextActive]}>MAX</ThemedText>
                    </TouchableOpacity>
                  </View>
                )}

                <TextInput
                  style={styles.textInput}
                  placeholder="Enter token amount"
                  placeholderTextColor="#999"
                  value={amount}
                  onChangeText={(text) => {
                    setAmount(text);
                    setSelectedPercentage(''); // Clear percentage selection when typing manually
                  }}
                  keyboardType="numeric"
                />
                {fromPurse && (
                  <ThemedText style={styles.balanceHint}>
                    Available: {getSelfTransferPurses().find(p => p.key === fromPurse)?.balance || 0} tokens
                  </ThemedText>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Send to Charity Form */}
        {sendMode === 'charity' && (
          <View style={styles.section}>
            <View style={styles.formCard}>
              <ThemedText style={styles.cardTitle}>Move Tokens to Charity</ThemedText>
              
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
                            setAmount(''); // Reset amount when changing source purse
                            setSelectedPercentage(''); // Reset percentage
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

              {/* Amount Input with Percentage Options */}
              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>Amount</ThemedText>
                
                {/* Percentage Buttons */}
                {fromPurse && (
                  <View style={styles.percentageContainer}>
                    <TouchableOpacity
                      style={[styles.percentageButton, selectedPercentage === '25' && styles.percentageButtonActive]}
                      onPress={() => handlePercentageSelect('25')}
                    >
                      <ThemedText style={[styles.percentageText, selectedPercentage === '25' && styles.percentageTextActive]}>25%</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.percentageButton, selectedPercentage === '50' && styles.percentageButtonActive]}
                      onPress={() => handlePercentageSelect('50')}
                    >
                      <ThemedText style={[styles.percentageText, selectedPercentage === '50' && styles.percentageTextActive]}>50%</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.percentageButton, selectedPercentage === 'max' && styles.percentageButtonActive]}
                      onPress={() => handlePercentageSelect('max')}
                    >
                      <ThemedText style={[styles.percentageText, selectedPercentage === 'max' && styles.percentageTextActive]}>MAX</ThemedText>
                    </TouchableOpacity>
                  </View>
                )}

                <TextInput
                  style={styles.textInput}
                  placeholder="Enter token amount"
                  placeholderTextColor="#999"
                  value={amount}
                  onChangeText={(text) => {
                    setAmount(text);
                    setSelectedPercentage(''); // Clear percentage selection when typing manually
                  }}
                  keyboardType="numeric"
                />
                {fromPurse && (
                  <ThemedText style={styles.balanceHint}>
                    Available: {getFromPurses().find(p => p.key === fromPurse)?.balance || 0} tokens
                  </ThemedText>
                )}
              </View>

              {/* Destination Info */}
              <View style={styles.charityInfoContainer}>
                <ThemedText style={styles.charityInfoTitle}>🎁 Destination: Charity Purse</ThemedText>
                <ThemedText style={styles.charityInfoText}>
                  Tokens will be moved to your Charity Purse, ready for future donations to worthy causes.
                </ThemedText>
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
              <ThemedText style={styles.sendButtonText}>
                {sendMode === 'charity' ? '❤️ Move to Charity' : '💸 Transfer Tokens'}
              </ThemedText>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
      
      {/* Transaction History Modal */}
      <Modal
        visible={showHistory}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <ThemedText style={styles.modalTitle}>Transaction History</ThemedText>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowHistory(false)}
            >
              <ThemedText style={styles.closeButtonText}>✕</ThemedText>
            </TouchableOpacity>
          </View>
          
          <ScrollView 
            style={styles.modalContent}
            contentContainerStyle={styles.modalContentContainer}
            showsVerticalScrollIndicator={false}
          >
            {historyLoading ? (
              <View style={styles.historyLoadingContainer}>
                <ActivityIndicator size="large" color={Colors.light.accent} />
                <ThemedText style={styles.historyLoadingText}>Loading history...</ThemedText>
              </View>
            ) : transactionHistory.length === 0 ? (
              <View style={styles.emptyHistoryContainer}>
                <ThemedText style={styles.emptyHistoryText}>No transactions yet</ThemedText>
                <ThemedText style={styles.emptyHistorySubText}>Your token transfers will appear here</ThemedText>
              </View>
            ) : (
              transactionHistory.map((transaction, index) => (
                <View key={index} style={styles.historyCard}>
                  <View style={styles.historyHeader}>
                    <ThemedText style={styles.historyDate}>
                      {new Date(transaction.created_at).toLocaleDateString()}
                    </ThemedText>
                    <ThemedText style={[styles.historyAmount, transaction.is_sent ? styles.sentAmount : styles.receivedAmount]}>
                      {transaction.is_sent ? '-' : '+'}{transaction.amount} RDM
                    </ThemedText>
                  </View>
                  
                  <View style={styles.historyDetail}>
                    <View style={styles.historyInfo}>
                      <ThemedText style={styles.historyType}>
                        {transaction.is_self_transfer ? (
                          transaction.to_purse === 'charity' ? '❤️ To Charity Purse' : 
                          `💼 ${transaction.from_purse} → ${transaction.to_purse}`
                        ) : transaction.is_sent ? (
                          `📤 Sent to ${transaction.other_party_email || 'Someone'}`
                        ) : (
                          `📥 Received from ${transaction.other_party_email || 'Someone'}`
                        )}
                      </ThemedText>
                      <ThemedText style={styles.historyTime}>
                        {new Date(transaction.created_at).toLocaleTimeString()}
                      </ThemedText>
                    </View>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </Modal>
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
    marginHorizontal: 60, // Add margin to prevent overlap with back and history buttons
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

  // Percentage button styles
  percentageContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  percentageButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.light.lightBlue,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  percentageButtonActive: {
    backgroundColor: Colors.light.accent,
    borderColor: Colors.light.accent,
  },
  percentageText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.primary,
  },
  percentageTextActive: {
    color: '#fff',
  },

  // Charity info styles
  charityInfoContainer: {
    backgroundColor: '#f0f9ff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0f2fe',
    marginTop: 8,
  },
  charityInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.primary,
    marginBottom: 8,
  },
  charityInfoText: {
    fontSize: 14,
    color: Colors.light.icon,
    lineHeight: 20,
  },

  // History button
  historyButton: {
    position: 'absolute',
    right: 24,
    top: 70,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyButtonText: {
    fontSize: 20,
    color: '#fff',
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
    backgroundColor: '#fff',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.primary,
    flex: 1,
    textAlign: 'center',
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
  modalContentContainer: {
    paddingBottom: 40,
    flexGrow: 1,
  },

  // History styles
  historyLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  historyLoadingText: {
    marginTop: 16,
    color: Colors.light.text,
    fontSize: 16,
  },
  emptyHistoryContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyHistoryText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.icon,
    marginBottom: 8,
  },
  emptyHistorySubText: {
    fontSize: 14,
    color: Colors.light.icon,
    textAlign: 'center',
  },
  historyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  historyDate: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.primary,
  },
  historyAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  sentAmount: {
    color: '#EF4444', // Red for sent
  },
  receivedAmount: {
    color: '#10B981', // Green for received
  },
  historyDetail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyInfo: {
    flex: 1,
  },
  historyType: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.primary,
    marginBottom: 4,
  },
  historyTime: {
    fontSize: 12,
    color: Colors.light.icon,
  },
});
