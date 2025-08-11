import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';

interface DonationSuccessModalProps {
  visible: boolean;
  onClose: () => void;
  organizationName: string;
  amount: string;
  onViewHistory?: () => void;
}

export default function DonationSuccessModal({
  visible,
  onClose,
  organizationName,
  amount,
  onViewHistory,
}: DonationSuccessModalProps) {
  const { width } = Dimensions.get('window');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { width: width * 0.85 }]}>
          {/* Success Icon */}
          <View style={styles.iconContainer}>
            <Text style={styles.successIcon}>🎉</Text>
          </View>

          {/* Title */}
          <ThemedText style={styles.title}>
            Donation Successful!
          </ThemedText>

          {/* Amount */}
          <View style={styles.amountContainer}>
            <ThemedText style={styles.amountLabel}>Amount Donated</ThemedText>
            <ThemedText style={styles.amount}>{amount} RDM</ThemedText>
          </View>

          {/* Organization */}
          <View style={styles.orgContainer}>
            <ThemedText style={styles.orgLabel}>To</ThemedText>
            <ThemedText style={styles.orgName}>{organizationName}</ThemedText>
          </View>

          {/* Message */}
          <View style={styles.messageContainer}>
            <ThemedText style={styles.message}>
              Your generous contribution will make a real difference! 
              Thank you for supporting this worthy cause.
            </ThemedText>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            {onViewHistory && (
              <TouchableOpacity
                style={[styles.button, styles.historyButton]}
                onPress={() => {
                  onViewHistory();
                  onClose();
                }}
              >
                <ThemedText style={styles.historyButtonText}>
                  📊 View History
                </ThemedText>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.button, styles.closeButton]}
              onPress={onClose}
            >
              <ThemedText style={styles.closeButtonText}>
                ✨ Continue Giving
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#EC4899',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FDF2F8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successIcon: {
    fontSize: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.primary,
    marginBottom: 20,
    textAlign: 'center',
  },
  amountContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  amountLabel: {
    fontSize: 14,
    color: Colors.light.icon,
    marginBottom: 4,
  },
  amount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#EC4899',
  },
  orgContainer: {
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FDF2F8',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCE7F3',
  },
  orgLabel: {
    fontSize: 12,
    color: Colors.light.icon,
    marginBottom: 4,
  },
  orgName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.primary,
    textAlign: 'center',
  },
  messageContainer: {
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  message: {
    fontSize: 14,
    color: Colors.light.text,
    textAlign: 'center',
    lineHeight: 20,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  historyButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  historyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.primary,
  },
  closeButton: {
    backgroundColor: '#EC4899',
    shadowColor: '#EC4899',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});