/**
 * Confirm Collect Payment Modal — final confirmation for payment collection.
 * Extracted from RentalDetailScreen.
 */
import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Modal } from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { formatCurrency } from '../../utils/formatters';
import GlassmorphismPanel from '../GlassmorphismPanel';

const ConfirmCollectModal = ({
  visible,
  previousPaid,
  collectPaidNum,
  newRemaining,
  submitting,
  onConfirm,
  onBack,
  onCancel,
}) => {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onCancel}>
        <TouchableOpacity activeOpacity={1} style={styles.content}>
          <View style={styles.handle} />
          <Text style={styles.title}>Confirm Payment</Text>
          <GlassmorphismPanel style={styles.confirmSummary}>
            <View style={styles.confirmRow}>
              <Text style={styles.confirmLabel}>Previous Paid</Text>
              <Text style={styles.confirmValue}>{formatCurrency(previousPaid)} PKR</Text>
            </View>
            <View style={styles.confirmDivider} />
            <View style={styles.confirmRow}>
              <Text style={styles.confirmLabel}>New Payment</Text>
              <Text style={[styles.confirmValue, { color: colors.success }]}>{formatCurrency(collectPaidNum)} PKR</Text>
            </View>
            <View style={styles.confirmDivider} />
            <View style={styles.confirmRow}>
              <Text style={styles.confirmLabel}>Total Paid</Text>
              <Text style={styles.confirmValue}>{formatCurrency((previousPaid || 0) + collectPaidNum)} PKR</Text>
            </View>
            <View style={styles.confirmDivider} />
            <View style={styles.confirmRow}>
              <Text style={styles.confirmLabel}>Remaining</Text>
              <Text
                style={[styles.confirmValue, { color: newRemaining > 0 ? colors.warning : colors.success }]}
              >
                {formatCurrency(newRemaining)} PKR
              </Text>
            </View>
          </GlassmorphismPanel>
          <TouchableOpacity
            style={[styles.proceedBtn, submitting && styles.proceedBtnDisabled]}
            onPress={onConfirm}
            disabled={submitting}
            activeOpacity={0.8}
          >
            <Text style={styles.proceedBtnText}>{submitting ? 'Processing...' : 'Confirm Payment'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={onBack} disabled={submitting}>
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
  confirmSummary: { padding: spacing.xxl, marginBottom: spacing.xxl },
  confirmRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm },
  confirmLabel: { fontSize: typography.fontSize.md, color: colors.textSecondary },
  confirmValue: { fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: colors.textPrimary },
  confirmDivider: { height: 1, backgroundColor: colors.border },
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

export default React.memo(ConfirmCollectModal);
