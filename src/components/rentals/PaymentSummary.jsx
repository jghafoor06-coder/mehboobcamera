/**
 * Payment summary section for a returned rental.
 * Extracted from RentalDetailScreen.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { formatCurrency } from '../../utils/formatters';
import { PAYMENT_STATUS_COLORS } from '../../constants';
import GlassmorphismPanel from '../GlassmorphismPanel';

const PaymentSummary = React.memo(({ totalAmount, amountPaid, remainingBalance, paymentStatus }) => {
  const statusStyle = PAYMENT_STATUS_COLORS[paymentStatus] || PAYMENT_STATUS_COLORS.unpaid;

  return (
    <GlassmorphismPanel style={styles.section}>
      <Text style={styles.sectionLabel}>PAYMENT SUMMARY</Text>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Total Amount</Text>
        <Text style={styles.infoValue}>{formatCurrency(totalAmount)}</Text>
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Paid</Text>
        <Text style={[styles.infoValue, { color: colors.success }]}>{formatCurrency(amountPaid)}</Text>
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Remaining</Text>
        <Text style={[styles.infoValue, { color: remainingBalance > 0 ? colors.warning : colors.success }]}>
          {formatCurrency(remainingBalance || 0)}
        </Text>
      </View>
      {paymentStatus && (
        <View style={[styles.paymentChip, { backgroundColor: statusStyle.bg }]}>
          <Text style={[styles.paymentText, { color: statusStyle.text }]}>{(paymentStatus || '').toUpperCase()}</Text>
        </View>
      )}
    </GlassmorphismPanel>
  );
});

const styles = StyleSheet.create({
  section: { marginBottom: spacing.lg },
  sectionLabel: { fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.extrabold, color: colors.textTertiary, letterSpacing: 1.5, marginBottom: spacing.md },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  infoLabel: { fontSize: typography.fontSize.md, color: colors.textSecondary },
  infoValue: { fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.semibold, color: colors.textPrimary },
  paymentChip: { alignSelf: 'flex-start', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.round, marginTop: spacing.md },
  paymentText: { fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.bold, letterSpacing: 1 },
});

export default PaymentSummary;
