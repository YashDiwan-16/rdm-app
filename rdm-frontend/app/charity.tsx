import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { router } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
    ActivityIndicator,
    Modal,
    TextInput,
} from 'react-native';
import { charityAPI } from '@/services/apiServices';
import { useWallet } from '@/contexts/WalletContext';

interface CharityOrganization {
  id: string;
  name: string;
  category: string;
  description: string;
  wallet_address: string;
  allocation_percentage: number;
  logo_url?: string;
  website_url?: string;
  is_active: boolean;
}

export default function CharityScreen() {
  const { wallet, refreshWallet } = useWallet();
  const [organizations, setOrganizations] = useState<CharityOrganization[]>([]);
  const [loading, setLoading] = useState(true);
  const [donating, setDonating] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<CharityOrganization | null>(null);
  const [showDonationModal, setShowDonationModal] = useState(false);
  const [selectedPercentage, setSelectedPercentage] = useState<string>('');
  const [customAmount, setCustomAmount] = useState<string>('');
  const [showHistory, setShowHistory] = useState(false);
  const [donationHistory, setDonationHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Helper function to format amounts consistently
  const formatAmount = (amount: any) => {
    const num = parseFloat(amount);
    return isNaN(num) ? '0.00' : num.toFixed(2);
  };

  // Demo wallet balances for organizations (in real app, this would come from blockchain)
  const [orgWalletBalances] = useState<{[key: string]: number}>({
    // These would be real wallet addresses in production
    '0x1234567890ABCDEF1234567890ABCDEF12345678': 15420, // ISKCON
    '0x2345678901BCDEF12345678901BCDEF123456789': 8750,  // American Cancer Society
    '0x3456789012CDEF123456789012CDEF12345678AB': 12300, // Senior Citizens Welfare
    '0x456789013DEF123456789013DEF123456789ABC': 5680,  // Global Education Initiative
  });

  useEffect(() => {
    loadCharityData();
  }, []);

  const loadCharityData = async () => {
    try {
      setLoading(true);
      const orgsData = await charityAPI.getOrganizations();
      setOrganizations(orgsData);
    } catch (error) {
      console.error('Error loading charity data:', error);
      Alert.alert('Error', 'Failed to load charity information');
    } finally {
      setLoading(false);
    }
  };

  const loadDonationHistory = async () => {
    try {
      setHistoryLoading(true);
      const history = await charityAPI.getDonationHistory();
      setDonationHistory(history);
    } catch (error) {
      console.error('Error loading donation history:', error);
      Alert.alert('Error', 'Failed to load donation history');
    } finally {
      setHistoryLoading(false);
    }
  };

  const getCharityPurseBalance = () => {
    return wallet?.charity_purse || 0;
  };

  const calculateDonationAmount = (percentage: string) => {
    const charityBalance = getCharityPurseBalance();
    
    switch (percentage) {
      case 'max':
        return charityBalance;
      case '50':
        return parseFloat((charityBalance * 0.5).toFixed(2));
      case '25':
        return parseFloat((charityBalance * 0.25).toFixed(2));
      default:
        return 0;
    }
  };

  const getFinalDonationAmount = () => {
    // If custom amount is entered, use that
    if (customAmount) {
      return parseFloat(customAmount) || 0;
    }
    // Otherwise use the selected percentage
    return calculateDonationAmount(selectedPercentage);
  };

  const getOrganizationWalletBalance = (walletAddress: string) => {
    return orgWalletBalances[walletAddress] || 0;
  };

  const handleOrganizationSelect = (org: CharityOrganization) => {
    setSelectedOrg(org);
    setSelectedPercentage('');
    setCustomAmount('');
    setShowDonationModal(true);
  };

  const handleDonate = async () => {
    if (!selectedOrg || (!selectedPercentage && !customAmount)) {
      Alert.alert('Incomplete Selection', 'Please select or enter donation amount.');
      return;
    }

    const donationAmount = getFinalDonationAmount();
    const charityBalance = getCharityPurseBalance();
    
    if (donationAmount <= 0) {
      Alert.alert('Invalid Amount', 'Donation amount must be greater than 0.');
      return;
    }

    if (donationAmount > charityBalance) {
      Alert.alert('Insufficient Tokens', 'Not enough tokens in charity purse.');
      return;
    }

    Alert.alert(
      'Confirm Donation',
      `Send ${donationAmount} RDM from your Charity Purse to ${selectedOrg.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          style: 'default',
          onPress: async () => {
            try {
              setDonating(true);
              const donationPayload = {
                organization_id: selectedOrg.id,
                amount: donationAmount,
                from_purse: 'charity'
              };
              await charityAPI.donateToOrganization(donationPayload);
              
              // Close donation modal and show success modal
              setShowDonationModal(false);
              setSelectedOrg(null);
              setSelectedPercentage('');
              setCustomAmount('');
              await refreshWallet();
              
              // Show simple success message
              Alert.alert('Donation Successful!', `Successfully donated ${donationAmount.toFixed(2)} RDM to ${selectedOrg.name}`);
            } catch (error: any) {
              console.error('Donation error:', error);
              const errorMessage = error.response?.data?.error || 'Failed to process donation';
              Alert.alert('Donation Failed', errorMessage);
            } finally {
              setDonating(false);
            }
          }
        }
      ]
    );
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'faith-based': return '🙏';
      case 'healthcare': return '🏥';
      case 'elderly-care': return '👴';
      case 'education': return '📚';
      case 'environment': return '🌱';
      case 'poverty-relief': return '🤝';
      case 'disaster-relief': return '🚨';
      case 'animal-welfare': return '🐾';
      default: return '❤️';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'faith-based': return '#8B5CF6';
      case 'healthcare': return '#EF4444';
      case 'elderly-care': return '#F59E0B';
      case 'education': return '#3B82F6';
      case 'environment': return '#10B981';
      case 'poverty-relief': return '#6B7280';
      case 'disaster-relief': return '#DC2626';
      case 'animal-welfare': return '#EC4899';
      default: return Colors.light.primary;
    }
  };

  const getCharityBalance = () => {
    const charityBalance = getCharityPurseBalance();
    return charityBalance;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
        <ThemedText style={styles.loadingText}>Loading organizations...</ThemedText>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ThemedText style={styles.backButtonText}>←</ThemedText>
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Donate to Charity</ThemedText>
        <TouchableOpacity 
          style={styles.historyButton} 
          onPress={() => {
            setShowHistory(true);
            loadDonationHistory();
          }}
        >
          <ThemedText style={styles.historyButtonText}>📋</ThemedText>
        </TouchableOpacity>
      </View>

      {/* Charity Purse Balance */}
      <View style={styles.balanceCard}>
        <ThemedText style={styles.balanceLabel}>Charity Purse Balance</ThemedText>
        <ThemedText style={styles.balanceAmount}>
          {formatAmount(getCharityBalance())} RDM
        </ThemedText>
        <ThemedText style={styles.balanceSubtext}>
          {getCharityBalance() > 0 
            ? `Available to send to charity organizations`
            : 'Transfer tokens to charity purse to donate'
          }
        </ThemedText>
      </View>

      {/* Organizations List */}
      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Choose Organization</ThemedText>
        
        {organizations.length === 0 ? (
          <View style={styles.emptyState}>
            <ThemedText style={styles.emptyText}>No charity organizations available</ThemedText>
          </View>
        ) : organizations.map((org) => {
          const balance = getOrganizationWalletBalance(org.wallet_address);
          
          return (
            <TouchableOpacity
              key={org.id}
              style={styles.organizationCard}
              onPress={() => handleOrganizationSelect(org)}
              disabled={getCharityBalance() <= 0}
            >
              <View style={styles.orgHeader}>
                <View style={styles.orgIconContainer}>
                  <ThemedText style={styles.orgIcon}>
                    {getCategoryIcon(org.category)}
                  </ThemedText>
                </View>
                <View style={styles.orgInfo}>
                  <ThemedText style={styles.orgName}>{org.name}</ThemedText>
                  <ThemedText style={styles.orgCategory}>
                    {org.category.replace('-', ' ')} • {org.allocation_percentage}% allocation
                  </ThemedText>
                </View>
                <View style={styles.orgBalance}>
                  <ThemedText style={styles.orgBalanceAmount}>
                    {balance.toLocaleString()} RDM
                  </ThemedText>
                  <ThemedText style={styles.orgBalanceLabel}>Wallet Balance</ThemedText>
                </View>
              </View>
              
              <ThemedText style={styles.orgDescription} numberOfLines={2}>
                {org.description}
              </ThemedText>
              
              <View style={styles.orgFooter}>
                <View 
                  style={[styles.categoryBadge, { backgroundColor: getCategoryColor(org.category) }]}
                >
                  <ThemedText style={styles.categoryBadgeText}>
                    {org.category.replace('-', ' ')}
                  </ThemedText>
                </View>
                
                <ThemedText style={[
                  styles.donateIndicator,
                  getCharityBalance() <= 0 && styles.donateIndicatorDisabled
                ]}>
                  {getCharityBalance() > 0 ? 'Tap to donate →' : 'No balance'}
                </ThemedText>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Donation Modal */}
      <Modal
        visible={showDonationModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => {
                setShowDonationModal(false);
                setSelectedOrg(null);
                setSelectedPercentage('');
                setCustomAmount('');
              }}
            >
              <ThemedText style={styles.closeButtonText}>✕</ThemedText>
            </TouchableOpacity>
            <ThemedText style={styles.modalTitle}>Donate to Charity</ThemedText>
            <View style={styles.placeholder} />
          </View>

          <ScrollView style={styles.modalContent} contentContainerStyle={styles.modalScrollContent}>
            {selectedOrg && (
              <>
                {/* Organization Info */}
                <View style={styles.selectedOrgCard}>
                  <View style={styles.selectedOrgHeader}>
                    <ThemedText style={styles.selectedOrgIcon}>
                      {getCategoryIcon(selectedOrg.category)}
                    </ThemedText>
                    <View style={styles.selectedOrgInfo}>
                      <ThemedText style={styles.selectedOrgName}>{selectedOrg.name}</ThemedText>
                      <ThemedText style={styles.selectedOrgCategory}>
                        {selectedOrg.category.replace('-', ' ')}
                      </ThemedText>
                    </View>
                  </View>
                  <ThemedText style={styles.selectedOrgDescription}>
                    {selectedOrg.description}
                  </ThemedText>
                </View>

                {/* Source Info */}
                <View style={styles.sourceCard}>
                  <ThemedText style={styles.sourceTitle}>From: Charity Purse</ThemedText>
                  <ThemedText style={styles.sourceBalance}>
                    Available: {formatAmount(getCharityBalance())} RDM
                  </ThemedText>
                </View>

                {/* Amount Selection */}
                <View style={styles.selectionSection}>
                  <ThemedText style={styles.selectionTitle}>Choose Amount</ThemedText>
                  {getCharityBalance() > 0 ? (
                    <>
                      <View style={styles.percentageOptions}>
                        {['25', '50', 'max'].map((percentage) => {
                          const amount = calculateDonationAmount(percentage);
                          return (
                            <TouchableOpacity
                              key={percentage}
                              style={[
                                styles.percentageOption,
                                selectedPercentage === percentage && styles.percentageOptionSelected
                              ]}
                              onPress={() => {
                                setSelectedPercentage(percentage);
                                setCustomAmount('');
                              }}
                            >
                              <ThemedText style={[
                                styles.percentageText,
                                selectedPercentage === percentage && styles.percentageTextSelected
                              ]}>
                                {percentage === 'max' ? 'MAX' : `${percentage}%`}
                              </ThemedText>
                              <ThemedText style={[
                                styles.percentageAmount,
                                selectedPercentage === percentage && styles.percentageAmountSelected
                              ]}>
                                {formatAmount(amount)} RDM
                              </ThemedText>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                      
                      {/* Custom Amount Input */}
                      <View style={styles.customAmountSection}>
                        <ThemedText style={styles.customAmountLabel}>Or enter custom amount:</ThemedText>
                        <View style={styles.customAmountContainer}>
                          <TextInput
                            style={styles.customAmountInput}
                            value={customAmount}
                            onChangeText={(text) => {
                              setCustomAmount(text);
                              if (text) setSelectedPercentage('');
                            }}
                            placeholder="Enter amount"
                            placeholderTextColor={Colors.light.icon}
                            keyboardType="numeric"
                            maxLength={10}
                          />
                          <ThemedText style={styles.customAmountSuffix}>RDM</ThemedText>
                        </View>
                      </View>
                    </>
                  ) : (
                    <View style={styles.noTokensMessage}>
                      <ThemedText style={styles.noTokensText}>
                        Transfer tokens to your Charity Purse to make donations
                      </ThemedText>
                    </View>
                  )}
                </View>

                {/* Send Button */}
                {(selectedPercentage || customAmount) && getCharityBalance() > 0 && (
                  <View style={styles.donateButtonContainer}>
                    <TouchableOpacity
                      style={[styles.donateButton, donating && styles.donateButtonDisabled]}
                      onPress={handleDonate}
                      disabled={donating}
                    >
                      {donating ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <ThemedText style={styles.donateButtonText}>
                          ❤️ Send {formatAmount(getFinalDonationAmount())} RDM
                        </ThemedText>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* History Modal */}
      <Modal
        visible={showHistory}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowHistory(false)}
            >
              <ThemedText style={styles.closeButtonText}>✕</ThemedText>
            </TouchableOpacity>
            <ThemedText style={styles.modalTitle}>Donation History</ThemedText>
            <View style={styles.placeholder} />
          </View>

          <ScrollView style={styles.modalContent}>
            {historyLoading ? (
              <View style={styles.historyLoading}>
                <ActivityIndicator size="large" color={Colors.light.primary} />
                <ThemedText style={styles.loadingText}>Loading history...</ThemedText>
              </View>
            ) : donationHistory.length === 0 ? (
              <View style={styles.emptyHistory}>
                <ThemedText style={styles.emptyHistoryText}>No donation history yet</ThemedText>
                <ThemedText style={styles.emptyHistorySubtext}>
                  Your donations will appear here
                </ThemedText>
              </View>
            ) : (
              donationHistory.map((donation, index) => (
                <View key={index} style={styles.historyCard}>
                  <View style={styles.historyHeader}>
                    <ThemedText style={styles.historyAmount}>
                      {formatAmount(donation.total_amount)} RDM
                    </ThemedText>
                    <ThemedText style={styles.historyDate}>
                      {new Date(donation.distribution_date).toLocaleDateString()}
                    </ThemedText>
                  </View>
                  
                  {donation.charity_distribution_details?.map((detail: any, detailIndex: number) => (
                    <View key={detailIndex} style={styles.historyDetail}>
                      <View style={styles.historyDetailHeader}>
                        <View style={styles.historyDetailLeft}>
                          {getCategoryIcon(detail.charity_organizations.category)}
                          <View style={styles.historyDetailInfo}>
                            <ThemedText style={styles.historyOrgName}>
                              {detail.charity_organizations.name}
                            </ThemedText>
                            <ThemedText style={styles.historyOrgCategory}>
                              {detail.charity_organizations.category.replace('-', ' ')}
                            </ThemedText>
                          </View>
                        </View>
                        <ThemedText style={styles.historyDetailAmount}>
                          {formatAmount(detail.allocated_amount)} RDM
                        </ThemedText>
                      </View>
                    </View>
                  ))}
                </View>
              ))
            )}
          </ScrollView>
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
  scrollContent: {
    paddingBottom: 100,
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
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: Colors.light.primary,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.primary,
  },
  historyButton: {
    padding: 8,
  },
  historyButtonText: {
    fontSize: 14,
    color: Colors.light.accent,
    fontWeight: '600',
  },
  balanceCard: {
    backgroundColor: '#fff',
    marginHorizontal: 24,
    marginBottom: 24,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  balanceLabel: {
    fontSize: 16,
    color: Colors.light.icon,
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.light.primary,
    marginBottom: 8,
  },
  balanceSubtext: {
    fontSize: 14,
    color: Colors.light.icon,
    textAlign: 'center',
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
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: Colors.light.icon,
    textAlign: 'center',
  },
  organizationCard: {
    backgroundColor: '#fff',
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  orgHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orgIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  orgIcon: {
    fontSize: 24,
  },
  orgInfo: {
    flex: 1,
  },
  orgName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.primary,
    marginBottom: 4,
  },
  orgCategory: {
    fontSize: 14,
    color: Colors.light.icon,
    textTransform: 'capitalize',
  },
  orgBalance: {
    alignItems: 'flex-end',
  },
  orgBalanceAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.light.accent,
  },
  orgBalanceLabel: {
    fontSize: 12,
    color: Colors.light.icon,
    marginTop: 2,
  },
  orgDescription: {
    fontSize: 14,
    color: Colors.light.text,
    lineHeight: 20,
    marginBottom: 16,
  },
  orgFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  categoryBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  donateIndicator: {
    fontSize: 14,
    color: Colors.light.accent,
    fontWeight: '600',
  },
  donateIndicatorDisabled: {
    color: Colors.light.icon,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
    padding: 8,
    width: 40,
  },
  closeButtonText: {
    fontSize: 20,
    color: Colors.light.icon,
    fontWeight: 'bold',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.primary,
  },
  placeholder: {
    width: 40,
  },
  modalContent: {
    flex: 1,
    padding: 24,
  },
  modalScrollContent: {
    paddingBottom: 40,
  },
  selectedOrgCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  selectedOrgHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  selectedOrgIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  selectedOrgInfo: {
    flex: 1,
  },
  selectedOrgName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.primary,
    marginBottom: 4,
  },
  selectedOrgCategory: {
    fontSize: 14,
    color: Colors.light.icon,
    textTransform: 'capitalize',
  },
  selectedOrgDescription: {
    fontSize: 14,
    color: Colors.light.text,
    lineHeight: 20,
  },
  sourceCard: {
    backgroundColor: Colors.light.lightBlue,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  sourceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.primary,
    marginBottom: 4,
  },
  sourceBalance: {
    fontSize: 14,
    color: Colors.light.text,
  },
  selectionSection: {
    marginBottom: 24,
  },
  selectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.primary,
    marginBottom: 16,
  },
  percentageOptions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  percentageOption: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.light.lightBlue,
    alignItems: 'center',
  },
  percentageOptionSelected: {
    borderColor: Colors.light.primary,
    backgroundColor: Colors.light.lightBlue,
  },
  percentageText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.light.primary,
    marginBottom: 4,
  },
  percentageTextSelected: {
    color: Colors.light.primary,
  },
  percentageAmount: {
    fontSize: 12,
    color: Colors.light.icon,
  },
  percentageAmountSelected: {
    color: Colors.light.text,
  },
  customAmountSection: {
    marginBottom: 16,
  },
  customAmountLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.primary,
    marginBottom: 8,
  },
  customAmountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
  },
  customAmountInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.light.text,
    paddingVertical: 12,
  },
  customAmountSuffix: {
    fontSize: 16,
    color: Colors.light.icon,
    fontWeight: '600',
    marginLeft: 8,
  },
  noTokensMessage: {
    backgroundColor: '#FEF3CD',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  noTokensText: {
    fontSize: 14,
    color: '#92400E',
    textAlign: 'center',
  },
  donateButtonContainer: {
    marginTop: 20,
  },
  donateButton: {
    backgroundColor: Colors.light.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  donateButtonDisabled: {
    backgroundColor: Colors.light.icon,
  },
  donateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  historyLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyHistory: {
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyHistoryText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.icon,
    marginBottom: 8,
  },
  emptyHistorySubtext: {
    fontSize: 14,
    color: Colors.light.icon,
  },
  historyCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  historyAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.primary,
  },
  historyDate: {
    fontSize: 14,
    color: Colors.light.icon,
  },
  historyDetail: {
    marginBottom: 8,
  },
  historyDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyDetailLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  historyDetailInfo: {
    marginLeft: 12,
    flex: 1,
  },
  historyOrgName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.primary,
  },
  historyOrgCategory: {
    fontSize: 12,
    color: Colors.light.icon,
    textTransform: 'capitalize',
  },
  historyDetailAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.accent,
  },
});