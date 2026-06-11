/**
 * Confirm Return Modal — final confirmation before marking rental as returned.
 * Extracted from RentalDetailScreen.
 */
import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Modal } from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { formatCurrency } from '../../utils/formatters';
import GlassmorphismPanel from '../GlassmorphismPanel';

const ConfirmReturnModal = ({
  visible,
  totalAmount,
  paidNum,
  remaining,
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
          <Text style={styles.title}>Confirm Return</Text>
          <GlassmorphismPanel style={styles.confirmSummary}>
            <View style={styles.confirmRow}>
              <Text style={styles.confirmLabel}>Rental Total</Text>
              <Text style={styles.confirmValue}>{formatCurrency(totalAmount)} PKR</Text>
            </View>
            <View style={styles.confirmDivider} />
            <View style={styles.confirmRow}>
              <Text style={styles.confirmLabel}>Customer Paid</Text>
              <Text style={[styles.confirmValue, { color: colors.success }]}>{formatCurrency(paidNum)} PKR</Text>
            </View>
            <View style={styles.confirmDivider} />
            <View style={styles.confirmRow}>
              <Text style={styles.confirmLabel}>Remaining</Text>
              <Text
                style={[styles.confirmValue, { color: remaining > 0 ? colors.warning : colors.success }]}
              >
                {formatCurrency(remaining)} PKR
              </Text>
            </View>
          </GlassmorphismPanel>
          <TouchableOpacity
            style={[styles.proceedBtn, submitting && styles.proceedBtnDisabled]}
            onPress={onConfirm}
            disabled={submitting}
            activeOpacity={0.8}
          >
            <Text style={styles.proceedBtnText}>{submitting ? 'Processing...' : 'Confirm Return'}</Text>
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

export default React.memo(ConfirmReturnModal);
