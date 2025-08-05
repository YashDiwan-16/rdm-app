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
  const [showHistory, setShowHistory] = useState(false);
  const [donationHistory, setDonationHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Demo wallet balances for organizations (in real app, this would come from blockchain)
  const [orgWalletBalances] = useState<{[key: string]: number}>({
    // These would be real wallet addresses in production
    '0x1234567890ABCDEF1234567890ABCDEF12345678': 15420, // ISKCON
    '0x2345678901BCDEF12345678901BCDEF123456789': 28750, // Cancer Society  
    '0x3456789012CDEF123456789012CDEF12345678AB': 9340,  // Senior Care
    '0x456789013DEF123456789013DEF123456789ABC': 12680, // Education
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
        return Math.floor(charityBalance * 0.5);
      case '25':
        return Math.floor(charityBalance * 0.25);
      default:
        return 0;
    }
  };

  const getOrganizationWalletBalance = (walletAddress: string) => {
    return orgWalletBalances[walletAddress] || 0;
  };

  const handleOrganizationSelect = (org: CharityOrganization) => {
    setSelectedOrg(org);
    setSelectedPercentage('');
    setShowDonationModal(true);
  };

  const handleDonate = async () => {
    if (!selectedOrg || !selectedPercentage) {
      Alert.alert('Incomplete Selection', 'Please select donation amount.');
      return;
    }

    const donationAmount = calculateDonationAmount(selectedPercentage);
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
              // console.log('Sending donation payload:', donationPayload);
              await charityAPI.donateToOrganization(donationPayload);
              
              Alert.alert(
                'Donation Sent! 🎉',
                `Successfully sent ${donationAmount} RDM to ${selectedOrg.name}!`,
                [
                  {
                    text: 'OK',
                    onPress: async () => {
                      setShowDonationModal(false);
                      setSelectedOrg(null);
                      setSelectedPercentage('');
                      await refreshWallet();
                    }
                  }
                ]
              );
            } catch (error: any) {
              console.error('Donation error:', error);
              console.error('Error response:', error.response?.data);
              console.error('Error status:', error.response?.status);
              const errorMessage = error.response?.data?.error || 'Failed to process donation';
              Alert.alert('Donation Failed', `${errorMessage}\n\nDebug info: ${JSON.stringify(error.response?.data)}`);
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
      case 'animal-welfare': return '#84CC16';
      default: return Colors.light.accent;
    }
  };

  const formatWalletAddress = (address: string) => {
    if (address.length <= 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.accent} />
        <ThemedText style={styles.loadingText}>Loading organizations...</ThemedText>
      </View>
    );
  }

  const charityBalance = getCharityPurseBalance();
  
  // console.log('Charity balance:', charityBalance);
  // console.log('Wallet data:', wallet);
  // console.log('Show donation modal:', showDonationModal);
  // console.log('Selected org:', selectedOrg?.name);

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
          <View style={styles.headerCenter}>
            <ThemedText style={styles.title}>Charity</ThemedText>
            <ThemedText style={styles.subtitle}>Choose an organization to support</ThemedText>
          </View>
          <TouchableOpacity 
            style={styles.historyButton}
            onPress={() => {
              setShowHistory(true);
              loadDonationHistory();
            }}
          >
            <ThemedText style={styles.historyButtonText}>📊</ThemedText>
          </TouchableOpacity>
        </View>

        {/* Charity Purse Balance */}
        <View style={styles.section}>
          <View style={styles.balanceCard}>
            <ThemedText style={styles.balanceLabel}>Charity Purse</ThemedText>
            <ThemedText style={styles.balanceValue}>{charityBalance} RDM</ThemedText>
            <ThemedText style={styles.balanceDescription}>
              {charityBalance > 0 
                ? `Available to send to charity organizations`
                : 'Transfer tokens from other purses to begin giving'
              }
            </ThemedText>
            {charityBalance <= 0 && (
              <TouchableOpacity 
                style={styles.transferButton}
                onPress={() => router.push('/send-tokens')}
              >
                <ThemedText style={styles.transferButtonText}>
                  Transfer Tokens ➜
                </ThemedText>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Organizations */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>
            {charityBalance > 0 ? 'Select Organization' : 'Available Organizations'}
          </ThemedText>
          
          
          {organizations.length === 0 ? (
            <View style={styles.emptyState}>
              <ThemedText style={styles.emptyText}>No charity organizations available</ThemedText>
              <ThemedText style={styles.emptySubText}>Organizations are being loaded...</ThemedText>
            </View>
          ) : organizations.map((org) => {
            const walletBalance = getOrganizationWalletBalance(org.wallet_address);
            
            return (
              <TouchableOpacity 
                key={org.id}
                style={[
                  styles.organizationCard,
                  charityBalance <= 0 && styles.organizationCardDisabled
                ]}
                onPress={() => {
                  console.log('Organization card pressed:', org.name, 'Balance:', charityBalance);
                  if (charityBalance <= 0) {
                    Alert.alert(
                      'No Charity Tokens', 
                      'You need tokens in your Charity Purse to make donations.\n\nWould you like to transfer tokens to your Charity Purse first?',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { 
                          text: 'Transfer Tokens', 
                          onPress: () => router.push('/send-tokens')
                        }
                      ]
                    );
                    return;
                  }
                  handleOrganizationSelect(org);
                }}
              >
                <View style={styles.organizationHeader}>
                  <View style={[styles.categoryIndicator, { backgroundColor: getCategoryColor(org.category) }]}>
                    <ThemedText style={styles.categoryIcon}>
                      {getCategoryIcon(org.category)}
                    </ThemedText>
                  </View>
                  <View style={styles.organizationInfo}>
                    <ThemedText style={styles.organizationName}>{org.name}</ThemedText>
                    <ThemedText style={styles.organizationCategory}>
                      {org.category.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </ThemedText>
                  </View>
                  {charityBalance > 0 && (
                    <View style={styles.donateArrow}>
                      <ThemedText style={styles.donateArrowText}>→</ThemedText>
                    </View>
                  )}
                </View>
                
                <ThemedText style={styles.organizationDescription}>
                  {org.description}
                </ThemedText>
                
                {/* Wallet Info */}
                <View style={styles.walletInfo}>
                  <View style={styles.walletAddressContainer}>
                    <ThemedText style={styles.walletAddressLabel}>Wallet:</ThemedText>
                    <ThemedText style={styles.walletAddressText}>
                      {formatWalletAddress(org.wallet_address)}
                    </ThemedText>
                  </View>
                  <View style={styles.walletBalanceContainer}>
                    <ThemedText style={styles.walletBalanceLabel}>Balance:</ThemedText>
                    <ThemedText style={styles.walletBalanceValue}>
                      {walletBalance.toLocaleString()} RDM
                    </ThemedText>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Info Section */}
        <View style={styles.section}>
          <View style={styles.infoCard}>
            <ThemedText style={styles.infoTitle}>How It Works</ThemedText>
            <ThemedText style={styles.infoText}>
              • Transfer tokens to Charity Purse from other purses{'\n'}
              • Select any organization to support{'\n'}
              • Choose amount (25%, 50%, or MAX) to send{'\n'}
              • Tokens go directly from Charity Purse to organization{'\n'}
              • Track all donations in history
            </ThemedText>
          </View>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
      
      {/* Donation Modal */}
      <Modal
        visible={showDonationModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          console.log('Modal onRequestClose called');
          setShowDonationModal(false);
          setSelectedOrg(null);
          setSelectedPercentage('');
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <ThemedText style={styles.modalTitle}>
              Send to {selectedOrg?.name}
            </ThemedText>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => {
                setShowDonationModal(false);
                setSelectedOrg(null);
                setSelectedPercentage('');
              }}
            >
              <ThemedText style={styles.closeButtonText}>✕</ThemedText>
            </TouchableOpacity>
          </View>
          
          <ScrollView 
            style={styles.modalContent}
            contentContainerStyle={styles.modalContentContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Organization Info */}
            {selectedOrg ? (
              <View style={styles.selectedOrgCard}>
                <View style={styles.selectedOrgHeader}>
                  <View style={[styles.selectedOrgIcon, { backgroundColor: getCategoryColor(selectedOrg.category) }]}>
                    <ThemedText style={styles.selectedOrgIconText}>
                      {getCategoryIcon(selectedOrg.category)}
                    </ThemedText>
                  </View>
                  <View style={styles.selectedOrgInfo}>
                    <ThemedText style={styles.selectedOrgName}>{selectedOrg.name}</ThemedText>
                    <ThemedText style={styles.selectedOrgCategory}>
                      {selectedOrg.category.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </ThemedText>
                  </View>
                </View>
                <ThemedText style={styles.selectedOrgDescription}>
                  {selectedOrg.description}
                </ThemedText>
                <View style={styles.walletAddressContainer}>
                  <ThemedText style={styles.walletAddressLabel}>Wallet:</ThemedText>
                  <ThemedText style={styles.walletAddressText}>
                    {formatWalletAddress(selectedOrg.wallet_address)}
                  </ThemedText>
                  <ThemedText style={styles.walletBalanceLabel}>Balance:</ThemedText>
                  <ThemedText style={styles.walletBalanceValue}>
                    {getOrganizationWalletBalance(selectedOrg.wallet_address).toLocaleString()} RDM
                  </ThemedText>
                </View>
              </View>
            ) : (
              <View style={styles.selectedOrgCard}>
                <ThemedText style={styles.selectedOrgName}>No organization selected</ThemedText>
              </View>
            )}

            {/* Source Info */}
            <View style={styles.sourceCard}>
              <ThemedText style={styles.sourceTitle}>From: Charity Purse</ThemedText>
              <ThemedText style={styles.sourceBalance}>
                Available: {charityBalance} RDM
              </ThemedText>
            </View>

            {/* Amount Selection */}
            <View style={styles.selectionSection}>
              <ThemedText style={styles.selectionTitle}>Choose Amount</ThemedText>
              {charityBalance > 0 ? (
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
                        onPress={() => setSelectedPercentage(percentage)}
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
                          {amount} RDM
                        </ThemedText>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.noTokensMessage}>
                  <ThemedText style={styles.noTokensText}>
                    Transfer tokens to your Charity Purse to make donations
                  </ThemedText>
                </View>
              )}
            </View>

            {/* Send Button */}
            {selectedPercentage && charityBalance > 0 && (
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
                      ❤️ Send {calculateDonationAmount(selectedPercentage)} RDM
                    </ThemedText>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Transfer Tokens Button - shown when no charity balance */}
            {charityBalance <= 0 && (
              <View style={styles.donateButtonContainer}>
                <TouchableOpacity
                  style={[styles.donateButton, { backgroundColor: '#F59E0B' }]}
                  onPress={() => router.push('/send-tokens')}
                >
                  <ThemedText style={styles.donateButtonText}>
                    💰 Transfer Tokens to Charity Purse
                  </ThemedText>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
      
      {/* Donation History Modal */}
      <Modal
        visible={showHistory}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <ThemedText style={styles.modalTitle}>Donation History</ThemedText>
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
            ) : donationHistory.length === 0 ? (
              <View style={styles.emptyHistoryContainer}>
                <ThemedText style={styles.emptyHistoryText}>No donations yet</ThemedText>
                <ThemedText style={styles.emptyHistorySubText}>Your donations will appear here</ThemedText>
              </View>
            ) : (
              donationHistory.map((donation, index) => (
                <View key={index} style={styles.historyCard}>
                  <View style={styles.historyHeader}>
                    <ThemedText style={styles.historyDate}>
                      {new Date(donation.distribution_date).toLocaleDateString()}
                    </ThemedText>
                    <ThemedText style={styles.historyTotal}>
                      {donation.total_amount} RDM
                    </ThemedText>
                  </View>
                  
                  {donation.charity_distribution_details?.map((detail: any, detailIndex: number) => (
                    <View key={detailIndex} style={styles.historyDetail}>
                      <View style={styles.historyOrg}>
                        <ThemedText style={styles.historyOrgIcon}>
                          {getCategoryIcon(detail.charity_organizations.category)}
                        </ThemedText>
                        <View style={styles.historyOrgInfo}>
                          <ThemedText style={styles.historyOrgName}>
                            {detail.charity_organizations.name}
                          </ThemedText>
                          <ThemedText style={styles.historyOrgCategory}>
                            {detail.charity_organizations.category.replace('-', ' ')}
                          </ThemedText>
                        </View>
                      </View>
                      <ThemedText style={styles.historyAmount}>
                        {detail.allocated_amount} RDM
                      </ThemedText>
                    </View>
                  ))}
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

  // Balance Card
  balanceCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.light.lightBlue,
    shadowColor: Colors.light.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  balanceLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.icon,
    marginBottom: 8,
  },
  balanceValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#8B5CF6',
    marginBottom: 8,
  },
  balanceDescription: {
    fontSize: 14,
    color: Colors.light.icon,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Organization Cards
  organizationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: Colors.light.lightBlue,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  organizationCardDisabled: {
    opacity: 0.6,
    backgroundColor: '#F9FAFB',
  },
  organizationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryIndicator: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryIcon: {
    fontSize: 24,
  },
  organizationInfo: {
    flex: 1,
  },
  organizationName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.primary,
    marginBottom: 2,
  },
  organizationCategory: {
    fontSize: 12,
    color: Colors.light.icon,
  },
  donateArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.light.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  donateArrowText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
  organizationDescription: {
    fontSize: 14,
    color: Colors.light.text,
    lineHeight: 20,
    marginBottom: 12,
  },

  // Wallet Info
  walletInfo: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
  },
  walletAddressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  walletAddressLabel: {
    fontSize: 12,
    color: Colors.light.icon,
    marginRight: 8,
    width: 50,
  },
  walletAddressText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: Colors.light.primary,
    fontWeight: '500',
    flex: 1,
  },
  walletBalanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletBalanceLabel: {
    fontSize: 12,
    color: Colors.light.icon,
    marginRight: 8,
    width: 50,
  },
  walletBalanceValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },

  // Info Card
  infoCard: {
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0F2FE',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.primary,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: Colors.light.text,
    lineHeight: 20,
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
    paddingBottom: 40, // Extra padding at bottom for scroll
    flexGrow: 1,
  },

  // Selected Organization
  selectedOrgCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: Colors.light.accent,
    shadowColor: Colors.light.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  selectedOrgHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  selectedOrgIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  selectedOrgIconText: {
    fontSize: 28,
  },
  selectedOrgInfo: {
    flex: 1,
  },
  selectedOrgName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.primary,
    marginBottom: 4,
  },
  selectedOrgCategory: {
    fontSize: 14,
    color: Colors.light.icon,
  },
  selectedOrgDescription: {
    fontSize: 14,
    color: Colors.light.text,
    lineHeight: 20,
    marginBottom: 12,
  },

  // Source Card
  sourceCard: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    alignItems: 'center',
  },
  sourceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.primary,
    marginBottom: 8,
  },
  sourceBalance: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#8B5CF6',
  },

  // Selection sections
  selectionSection: {
    marginBottom: 24,
  },
  selectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.primary,
    marginBottom: 16,
  },

  // Percentage options
  percentageOptions: {
    flexDirection: 'row',
    gap: 12,
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
    borderColor: Colors.light.accent,
    backgroundColor: Colors.light.accent,
  },
  percentageText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.light.primary,
    marginBottom: 4,
  },
  percentageTextSelected: {
    color: '#fff',
  },
  percentageAmount: {
    fontSize: 12,
    color: Colors.light.icon,
  },
  percentageAmountSelected: {
    color: '#fff',
  },

  // Donate button
  donateButtonContainer: {
    marginTop: 24,
  },
  donateButton: {
    backgroundColor: Colors.light.accent,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: Colors.light.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  donateButtonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
    elevation: 0,
  },
  donateButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
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
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  historyDate: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.primary,
  },
  historyTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.light.accent,
  },
  historyDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  historyOrg: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  historyOrgIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  historyOrgInfo: {
    flex: 1,
  },
  historyOrgName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.primary,
  },
  historyOrgCategory: {
    fontSize: 12,
    color: Colors.light.icon,
    textTransform: 'capitalize',
  },
  historyAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.accent,
  },

  // Bottom padding
  bottomPadding: {
    height: 40,
  },

  // Empty state styles
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: Colors.light.icon,
    fontWeight: '600',
  },
  emptySubText: {
    fontSize: 14,
    color: Colors.light.icon,
    marginTop: 8,
    textAlign: 'center',
  },

  // No tokens message styles
  noTokensMessage: {
    backgroundColor: '#FEF3C7',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F59E0B',
    alignItems: 'center',
  },
  noTokensText: {
    fontSize: 14,
    color: '#D97706',
    textAlign: 'center',
    fontWeight: '500',
  },

  // Transfer button styles
  transferButton: {
    backgroundColor: Colors.light.accent,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  transferButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});