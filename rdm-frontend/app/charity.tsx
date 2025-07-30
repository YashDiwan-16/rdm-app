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

export default function CharityScreen() {
  const [selectedWallet, setSelectedWallet] = useState('');
  const [showWalletDropdown, setShowWalletDropdown] = useState(false);
  const [category, setCategory] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [country, setCountry] = useState('');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [institution, setInstitution] = useState('');
  const [amount, setAmount] = useState('');
  const [address, setAddress] = useState('');
  
  const [wallets] = useState<TokenWallet[]>([
    { name: 'Base Purse', balance: 150, color: Colors.light.accent },
    { name: 'Reward Purse', balance: 75, color: Colors.light.success },
  ]);

  const categories = [
    'Education',
    'Healthcare',
    'Environment',
    'Poverty Relief',
    'Disaster Relief',
    'Animal Welfare',
    'Human Rights',
    'Arts & Culture',
  ];

  const countries = [
    'United States',
    'United Kingdom',
    'Canada',
    'Australia',
    'Germany',
    'France',
    'Japan',
    'India',
    'Brazil',
    'South Africa',
  ];

  const handleDonate = () => {
    if (!selectedWallet || !category || !country || !institution.trim() || !amount || !address.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    const selectedWalletData = wallets.find(w => w.name === selectedWallet);
    if (selectedWalletData && numAmount > selectedWalletData.balance) {
      Alert.alert('Error', `Insufficient balance. You have ${selectedWalletData.balance} tokens in your ${selectedWallet}`);
      return;
    }
    
    Alert.alert(
      'Donation Successful! 🎉', 
      `${amount} tokens donated to ${institution} in ${country} for ${category}!`,
      [
        {
          text: 'OK',
          onPress: () => {
            // Reset form
            setSelectedWallet('');
            setCategory('');
            setCountry('');
            setInstitution('');
            setAmount('');
            setAddress('');
          }
        }
      ]
    );
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
            <ThemedText style={styles.title}>Charity Purse</ThemedText>
            <ThemedText style={styles.subtitle}>Make a difference with your tokens</ThemedText>
          </View>
        </View>

        {/* Donation Form */}
        <View style={styles.section}>
          <View style={styles.formCard}>
            <ThemedText style={styles.cardTitle}>🤝 Donate to Charity</ThemedText>
            
            {/* Wallet Selection */}
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Select Your Wallet</ThemedText>
              <View style={styles.dropdownContainer}>
                <TouchableOpacity 
                  style={styles.dropdownButton}
                  onPress={() => setShowWalletDropdown(!showWalletDropdown)}
                >
                  <ThemedText style={styles.dropdownButtonText}>
                    {selectedWallet || 'Choose your wallet'}
                  </ThemedText>
                  <ThemedText style={styles.dropdownArrow}>
                    {showWalletDropdown ? '▲' : '▼'}
                  </ThemedText>
                </TouchableOpacity>
                
                {showWalletDropdown && (
                  <View style={styles.dropdownList}>
                    {wallets.map((wallet, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setSelectedWallet(wallet.name);
                          setShowWalletDropdown(false);
                        }}
                      >
                        <View style={[styles.walletIndicator, { backgroundColor: wallet.color }]} />
                        <View style={styles.walletInfo}>
                          <ThemedText style={styles.walletName}>{wallet.name}</ThemedText>
                          <ThemedText style={styles.walletBalance}>{wallet.balance} tokens available</ThemedText>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>

            {/* Category Selection */}
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Category</ThemedText>
              <View style={styles.dropdownContainer}>
                <TouchableOpacity 
                  style={styles.dropdownButton}
                  onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
                >
                  <ThemedText style={styles.dropdownButtonText}>
                    {category || 'Select charity category'}
                  </ThemedText>
                  <ThemedText style={styles.dropdownArrow}>
                    {showCategoryDropdown ? '▲' : '▼'}
                  </ThemedText>
                </TouchableOpacity>
                
                {showCategoryDropdown && (
                  <View style={styles.dropdownList}>
                    {categories.map((cat, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setCategory(cat);
                          setShowCategoryDropdown(false);
                        }}
                      >
                        <ThemedText style={styles.dropdownItemText}>{cat}</ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>

            {/* Country Selection */}
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Country</ThemedText>
              <View style={styles.dropdownContainer}>
                <TouchableOpacity 
                  style={styles.dropdownButton}
                  onPress={() => setShowCountryDropdown(!showCountryDropdown)}
                >
                  <ThemedText style={styles.dropdownButtonText}>
                    {country || 'Select country'}
                  </ThemedText>
                  <ThemedText style={styles.dropdownArrow}>
                    {showCountryDropdown ? '▲' : '▼'}
                  </ThemedText>
                </TouchableOpacity>
                
                {showCountryDropdown && (
                  <View style={styles.dropdownList}>
                    {countries.map((countryOption, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setCountry(countryOption);
                          setShowCountryDropdown(false);
                        }}
                      >
                        <ThemedText style={styles.dropdownItemText}>{countryOption}</ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>

            {/* Institution Name */}
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Institution Name</ThemedText>
              <TextInput
                style={styles.textInput}
                placeholder="Enter charity/institution name"
                placeholderTextColor="#999"
                value={institution}
                onChangeText={setInstitution}
              />
            </View>

            {/* Amount Input */}
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Donation Amount</ThemedText>
              <TextInput
                style={styles.textInput}
                placeholder="Enter token amount"
                placeholderTextColor="#999"
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
              />
            </View>

            {/* Institution Address */}
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Institution Wallet Address</ThemedText>
              <TextInput
                style={[styles.textInput, styles.textInputMultiline]}
                placeholder="Enter institution's wallet address"
                placeholderTextColor="#999"
                value={address}
                onChangeText={setAddress}
                autoCapitalize="none"
                multiline
                numberOfLines={3}
              />
            </View>
          </View>
        </View>

        {/* Donation Summary */}
        {selectedWallet && amount && (
          <View style={styles.section}>
            <View style={styles.summaryCard}>
              <ThemedText style={styles.summaryTitle}>Donation Summary</ThemedText>
              <View style={styles.summaryRow}>
                <ThemedText style={styles.summaryLabel}>From:</ThemedText>
                <ThemedText style={styles.summaryValue}>{selectedWallet}</ThemedText>
              </View>
              <View style={styles.summaryRow}>
                <ThemedText style={styles.summaryLabel}>Amount:</ThemedText>
                <ThemedText style={styles.summaryValue}>{amount} tokens</ThemedText>
              </View>
              {category && (
                <View style={styles.summaryRow}>
                  <ThemedText style={styles.summaryLabel}>Category:</ThemedText>
                  <ThemedText style={styles.summaryValue}>{category}</ThemedText>
                </View>
              )}
              {country && (
                <View style={styles.summaryRow}>
                  <ThemedText style={styles.summaryLabel}>Country:</ThemedText>
                  <ThemedText style={styles.summaryValue}>{country}</ThemedText>
                </View>
              )}
              {institution && (
                <View style={styles.summaryRow}>
                  <ThemedText style={styles.summaryLabel}>To:</ThemedText>
                  <ThemedText style={styles.summaryValue}>{institution}</ThemedText>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Donate Button */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.donateButton}
            onPress={handleDonate}
          >
            <ThemedText style={styles.donateButtonText}>❤️ Donate Now</ThemedText>
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
    fontSize: 20,
    fontWeight: '600',
    color: Colors.light.primary,
    marginBottom: 24,
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
  textInputMultiline: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 16,
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
  dropdownItemText: {
    fontSize: 16,
    color: Colors.light.primary,
    fontWeight: '500',
    flex: 1,
  },
  walletIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  walletInfo: {
    flex: 1,
  },
  walletName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.primary,
    marginBottom: 2,
  },
  walletBalance: {
    fontSize: 14,
    color: Colors.light.icon,
  },

  // Summary Card
  summaryCard: {
    backgroundColor: Colors.light.lightBlue,
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: Colors.light.accent,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.primary,
    marginBottom: 16,
    textAlign: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 16,
    color: Colors.light.icon,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 16,
    color: Colors.light.primary,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },

  // Donate Button
  donateButton: {
    height: 56,
    backgroundColor: Colors.light.success,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.light.success,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  donateButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },

  // Bottom padding
  bottomPadding: {
    height: 40,
  },
});
