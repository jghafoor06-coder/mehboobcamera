/**
 * Item breakdown section for a rental invoice.
 * Extracted from RentalDetailScreen.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { formatCurrency } from '../../utils/formatters';
import GlassmorphismPanel from '../GlassmorphismPanel';

const ItemBreakdown = React.memo(({ items, totalDays, totalAmount }) => {
  return (
    <GlassmorphismPanel style={styles.section}>
      <Text style={styles.sectionLabel}>ITEM BREAKDOWN</Text>
      {items.map((item, i) => (
        <View key={i} style={styles.itemRow}>
          <View style={styles.itemInfo}>
            <Text style={styles.itemName}>{item.itemName}</Text>
            <Text style={styles.itemDetails}>
              Qty: {item.quantity || 1} * {formatCurrency(item.pricePerDay)}/day
            </Text>
          </View>
          <Text style={styles.itemTotal}>
            {formatCurrency(item.total || item.pricePerDay * totalDays * (item.quantity || 1))}
          </Text>
        </View>
      ))}
      <View style={styles.totalContainer}>
        <View style={styles.totalDivider} />
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>TOTAL AMOUNT</Text>
          <Text style={styles.totalValue}>{formatCurrency(totalAmount)}</Text>
        </View>
      </View>
    </GlassmorphismPanel>
  );
});

const styles = StyleSheet.create({
  section: { marginBottom: spacing.lg },
  sectionLabel: { fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.extrabold, color: colors.textTertiary, letterSpacing: 1.5, marginBottom: spacing.md },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  itemInfo: { flex: 1, marginRight: spacing.md },
  itemName: { fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.medium, color: colors.textPrimary },
  itemDetails: { fontSize: typography.fontSize.sm, color: colors.textTertiary, marginTop: 2 },
  itemTotal: { fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.bold, color: colors.accent },
  totalContainer: { marginTop: spacing.sm },
  totalDivider: { height: 1, backgroundColor: colors.borderLight, marginBottom: spacing.md },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.bold, color: colors.textSecondary },
  totalValue: { fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.accent },
});

export default ItemBreakdown;
