/**
 * Collect Payment Modal — handles partial payment collection.
 * Extracted from RentalDetailScreen.
 */
import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  TextInput,
} from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { formatCurrency } from '../../utils/formatters';
import GlassmorphismPanel from '../GlassmorphismPanel';

const CollectPaymentModal = ({
  visible,
  remainingBalance,
  amount,
  setAmount,
  exceedsRemaining,
  newRemaining,
  onProceed,
  onCancel,
}) => {
  const paidNum = parseInt(amount, 10) || 0;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onCancel}>
        <TouchableOpacity activeOpacity={1} style={styles.content}>
          <View style={styles.handle} />
          <Text style={styles.title}>Collect Payment</Text>
          <GlassmorphismPanel style={styles.totalCard}>
            <Text style={styles.totalLabel}>Remaining Balance</Text>
            <Text style={styles.totalValue}>{formatCurrency(remainingBalance)}</Text>
          </GlassmorphismPanel>
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Payment Amount</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter amount"
              placeholderTextColor={colors.textMuted}
              value={amount}
              onChangeText={(t) => setAmount(t.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              maxLength={10}
              autoFocus
            />
          </View>
          {amount.length > 0 && !exceedsRemaining && paidNum > 0 && (
            <View style={styles.calcRow}>
              <Text style={styles.calcLabel}>New Remaining</Text>
              <Text
                style={[styles.calcValue, { color: newRemaining > 0 ? colors.warning : colors.success }]}
              >
                {formatCurrency(newRemaining)} PKR
              </Text>
            </View>
          )}
          {exceedsRemaining && (
            <View style={styles.validationError}>
              <Text style={styles.validationErrorText}>Amount cannot exceed remaining balance.</Text>
            </View>
          )}
          <TouchableOpacity
            style={[styles.proceedBtn, (exceedsRemaining || amount === '' || paidNum <= 0) && styles.proceedBtnDisabled]}
            onPress={onProceed}
            disabled={exceedsRemaining || amount === '' || paidNum <= 0}
            activeOpacity={0.8}
          >
            <Text style={styles.proceedBtnText}>Continue</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  content: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    padding: spacing.xxl,
    paddingBottom: spacing.huge,
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.textMuted, alignSelf: 'center', marginBottom: spacing.xxl },
  title: { fontSize: typography.fontSize.xxl, fontWeight: typography.fontWeight.bold, color: colors.textPrimary, marginBottom: spacing.xxl, textAlign: 'center' },
  totalCard: { marginBottom: spacing.xxl, alignItems: 'center', paddingVertical: spacing.xxl },
  totalLabel: { fontSize: typography.fontSize.sm, color: colors.textTertiary, marginBottom: spacing.sm, letterSpacing: 1 },
  totalValue: { fontSize: typography.fontSize.huge, fontWeight: typography.fontWeight.bold, color: colors.accent },
  inputSection: { marginBottom: spacing.lg },
  inputLabel: { fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.semibold, color: colors.textSecondary, marginBottom: spacing.sm },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.xxl,
  },
  calcLabel: { fontSize: typography.fontSize.md, color: colors.textSecondary },
  calcValue: { fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold },
  validationError: {
    backgroundColor: colors.error + '15',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.error + '30',
  },
  validationErrorText: { fontSize: typography.fontSize.sm, color: colors.errorLight, textAlign: 'center' },
  proceedBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  proceedBtnDisabled: { opacity: 0.4 },
  proceedBtnText: { fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: colors.textPrimary },
  cancelBtn: { alignItems: 'center', paddingVertical: spacing.md },
  cancelBtnText: { fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.medium, color: colors.textTertiary },
});

export default React.memo(CollectPaymentModal);
