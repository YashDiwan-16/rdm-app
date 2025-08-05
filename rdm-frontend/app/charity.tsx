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

interface DistributionPreview {
  charity_purse_balance: number;
  total_to_distribute: number;
  allocations: (CharityOrganization & { allocated_amount: number })[];
}

export default function CharityScreen() {
  const { refreshWallet } = useWallet();
  const [organizations, setOrganizations] = useState<CharityOrganization[]>([]);
  const [preview, setPreview] = useState<DistributionPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [distributing, setDistributing] = useState(false);

  useEffect(() => {
    loadCharityData();
  }, []);

  const loadCharityData = async () => {
    try {
      setLoading(true);
      const [orgsData, previewData] = await Promise.all([
        charityAPI.getOrganizations(),
        charityAPI.getDistributionPreview()
      ]);
      
      setOrganizations(orgsData);
      setPreview(previewData);
    } catch (error) {
      console.error('Error loading charity data:', error);
      Alert.alert('Error', 'Failed to load charity information');
    } finally {
      setLoading(false);
    }
  };

  const handleDistribute = async () => {
    if (!preview || preview.charity_purse_balance <= 0) {
      Alert.alert('No Tokens', 'You need tokens in your Charity Purse to distribute.');
      return;
    }

    Alert.alert(
      'Confirm Distribution',
      `Distribute ${preview.charity_purse_balance} tokens to ${organizations.length} charity organizations?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Distribute',
          style: 'default',
          onPress: async () => {
            try {
              setDistributing(true);
              const result = await charityAPI.distributeTokens();
              
              Alert.alert(
                'Distribution Complete! 🎉',
                `Successfully distributed ${result.total_distributed} tokens to charity organizations!`,
                [
                  {
                    text: 'OK',
                    onPress: async () => {
                      await refreshWallet();
                      await loadCharityData();
                    }
                  }
                ]
              );
            } catch (error: any) {
              console.error('Distribution error:', error);
              const errorMessage = error.response?.data?.error || 'Failed to distribute tokens';
              Alert.alert('Distribution Failed', errorMessage);
            } finally {
              setDistributing(false);
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
        <ThemedText style={styles.loadingText}>Loading charity information...</ThemedText>
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
          <View style={styles.headerCenter}>
            <ThemedText style={styles.title}>Charity Distribution</ThemedText>
            <ThemedText style={styles.subtitle}>Automated giving to verified organizations</ThemedText>
          </View>
        </View>

        {/* Balance Summary */}
        <View style={styles.section}>
          <View style={styles.balanceCard}>
            <ThemedText style={styles.balanceLabel}>Charity Purse Balance</ThemedText>
            <ThemedText style={styles.balanceValue}>
              {preview?.charity_purse_balance || 0} RDM
            </ThemedText>
            <ThemedText style={styles.balanceDescription}>
              {preview && preview.charity_purse_balance > 0 
                ? `Ready to distribute to ${organizations.length} organizations`
                : 'Move tokens to charity purse to begin giving'
              }
            </ThemedText>
          </View>
        </View>

        {/* Distribution Preview */}
        {preview && preview.charity_purse_balance > 0 && (
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Distribution Preview</ThemedText>
            {preview.allocations.map((allocation, index) => (
              <View key={allocation.id} style={styles.allocationCard}>
                <View style={styles.allocationHeader}>
                  <View style={styles.charityIconContainer}>
                    <ThemedText style={styles.charityIcon}>
                      {getCategoryIcon(allocation.category)}
                    </ThemedText>
                  </View>
                  <View style={styles.charityInfo}>
                    <ThemedText style={styles.charityName}>{allocation.name}</ThemedText>
                    <ThemedText style={styles.charityCategory}>
                      {allocation.category.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </ThemedText>
                  </View>
                  <View style={styles.allocationAmount}>
                    <ThemedText style={styles.allocationTokens}>
                      {allocation.allocated_amount} RDM
                    </ThemedText>
                    <ThemedText style={styles.allocationPercentage}>
                      {allocation.allocation_percentage}%
                    </ThemedText>
                  </View>
                </View>
                
                <ThemedText style={styles.charityDescription}>
                  {allocation.description}
                </ThemedText>
                
                <View style={styles.walletAddressContainer}>
                  <ThemedText style={styles.walletAddressLabel}>Wallet:</ThemedText>
                  <ThemedText style={styles.walletAddressText}>
                    {formatWalletAddress(allocation.wallet_address)}
                  </ThemedText>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Charity Organizations (when no balance) */}
        {(!preview || preview.charity_purse_balance <= 0) && (
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Supported Organizations</ThemedText>
            <ThemedText style={styles.sectionDescription}>
              When you have tokens in your charity purse, they will be automatically distributed to these verified organizations:
            </ThemedText>
            
            {organizations.map((org) => (
              <View key={org.id} style={styles.organizationCard}>
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
                  <View style={styles.percentageContainer}>
                    <ThemedText style={styles.percentageText}>{org.allocation_percentage}%</ThemedText>
                  </View>
                </View>
                <ThemedText style={styles.organizationDescription}>{org.description}</ThemedText>
              </View>
            ))}
          </View>
        )}

        {/* Distribution Button */}
        {preview && preview.charity_purse_balance > 0 && (
          <View style={styles.section}>
            <TouchableOpacity 
              style={[styles.distributeButton, distributing && styles.distributeButtonDisabled]}
              onPress={handleDistribute}
              disabled={distributing}
            >
              {distributing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <ThemedText style={styles.distributeButtonText}>
                  ❤️ Distribute {preview.charity_purse_balance} RDM to Charities
                </ThemedText>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Info Section */}
        <View style={styles.section}>
          <View style={styles.infoCard}>
            <ThemedText style={styles.infoTitle}>How It Works</ThemedText>
            <ThemedText style={styles.infoText}>
              • Tokens accumulate in your Charity Purse from goal reflections{'\n'}
              • Distribution percentages are pre-set by the platform{'\n'}
              • All organizations are verified and transparent{'\n'}
              • Your contributions make a real difference
            </ThemedText>
          </View>
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
  sectionDescription: {
    fontSize: 14,
    color: Colors.light.icon,
    marginBottom: 16,
    lineHeight: 20,
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
    color: Colors.light.primary,
    marginBottom: 8,
  },
  balanceDescription: {
    fontSize: 14,
    color: Colors.light.icon,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Allocation Cards
  allocationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: Colors.light.lightBlue,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  allocationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  charityIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  charityIcon: {
    fontSize: 24,
  },
  charityInfo: {
    flex: 1,
  },
  charityName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.primary,
    marginBottom: 2,
  },
  charityCategory: {
    fontSize: 12,
    color: Colors.light.icon,
    textTransform: 'capitalize',
  },
  allocationAmount: {
    alignItems: 'flex-end',
  },
  allocationTokens: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.light.accent,
    marginBottom: 2,
  },
  allocationPercentage: {
    fontSize: 12,
    color: Colors.light.icon,
  },
  charityDescription: {
    fontSize: 14,
    color: Colors.light.text,
    lineHeight: 20,
    marginBottom: 12,
  },
  walletAddressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 8,
    borderRadius: 8,
  },
  walletAddressLabel: {
    fontSize: 12,
    color: Colors.light.icon,
    marginRight: 8,
  },
  walletAddressText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: Colors.light.primary,
    fontWeight: '500',
  },

  // Organization Cards (no balance view)
  organizationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  organizationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryIcon: {
    fontSize: 20,
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
  percentageContainer: {
    backgroundColor: Colors.light.lightBlue,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  percentageText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.primary,
  },
  organizationDescription: {
    fontSize: 14,
    color: Colors.light.text,
    lineHeight: 20,
  },

  // Distribute Button
  distributeButton: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  distributeButtonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
    elevation: 0,
  },
  distributeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
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

  // Bottom padding
  bottomPadding: {
    height: 40,
  },
});