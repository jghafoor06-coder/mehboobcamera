/**
 * Invoice header with status badge.
 * Extracted from RentalDetailScreen.
 */
import React, { useRef, useEffect } from 'react';
import { StyleSheet, Text, View, Animated } from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { formatInvoiceId } from '../../utils/paymentCalculations';

const InvoiceHeader = React.memo(({ rentalId, status, lifecycleStatus }) => {
  const headerFade = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerFade, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(headerSlide, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[styles.container, { opacity: headerFade, transform: [{ translateY: headerSlide }] }]}
    >
      <View style={styles.titleRow}>
        <View>
          <Text style={styles.label}>RENTAL INVOICE</Text>
          <Text style={styles.invoiceId}>{formatInvoiceId(rentalId)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
          <View style={[styles.statusDot, { backgroundColor: status.dot }]} />
          <Text style={[styles.statusText, { color: status.text }]}>
            {(lifecycleStatus || 'ongoing').toUpperCase()}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: { marginBottom: spacing.xl },
  titleRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  label: { fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.extrabold, color: colors.textTertiary, letterSpacing: 2, marginBottom: spacing.xs },
  invoiceId: { fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.textPrimary },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.round, marginBottom: 4 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: spacing.sm },
  statusText: { fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.bold, letterSpacing: 1 },
});

export default InvoiceHeader;
