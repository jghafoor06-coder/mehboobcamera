import React, { useRef, useEffect, memo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { colors, borderRadius, typography, spacing, shadows } from '../theme';
import { formatCurrency, formatDate } from '../utils/formatters';
import { RENTAL_SLOTS } from '../utils/availabilityService';
import GlowBackground from './GlowBackground';

const statusColors = {
  active: { bg: '#10B98120', text: '#10B981', dot: '#10B981' },
  returned: { bg: '#6B728020', text: '#9CA3AF', dot: '#6B7280' },
  overdue: { bg: '#EF444420', text: '#EF4444', dot: '#EF4444' },
};

const RentalCard = React.memo(({ rental, onPress, index = 0 }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 60,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay: index * 60,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const status = statusColors[rental.status] || statusColors.active;
  const itemCount = rental.items.length;
  const totalDays = rental.totalDays || rental.items.reduce((sum, item) => sum + (item.days || 1), 0);
  const totalUnits = rental.items.reduce((sum, item) => sum + (item.quantity || 1), 0);

  return (
    <Animated.View
      style={[
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        style={styles.container}
      >
        <GlowBackground
          blobs={[
            { corner: 'topRight', color: colors.accent, size: 160, opacity: 0.035 },
            { corner: 'bottomLeft', color: colors.primary, size: 140, opacity: 0.04 },
          ]}
        />
        <View style={[styles.statusLine, { backgroundColor: status.dot }]} />

        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.customerName}>{rental.customerName}</Text>
              <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                <View style={[styles.statusDot, { backgroundColor: status.dot }]} />
                <Text style={[styles.statusText, { color: status.text }]}>
                  {rental.status.charAt(0).toUpperCase() + rental.status.slice(1)}
                </Text>
              </View>
            </View>
            <Text style={styles.arrow}>›</Text>
          </View>

          <View style={styles.itemsPreview}>
            {rental.items.slice(0, 2).map((item, i) => (
              <View key={i} style={styles.itemTag}>
                <Text style={styles.itemTagText}>{item.itemName}</Text>
              </View>
            ))}
            {itemCount > 2 && (
              <View style={[styles.itemTag, styles.moreTag]}>
                <Text style={styles.moreTagText}>+{itemCount - 2} more</Text>
              </View>
            )}
          </View>

          <View style={styles.footer}>
            <View style={styles.footerLeft}>
              <Text style={styles.dateRange}>
                {formatDate(rental.startDate)} → {formatDate(rental.endDate)}
              </Text>
              <View style={styles.footerMetaRow}>
                <View style={styles.slotBadge}>
                  <Text style={styles.slotBadgeText}>
                    {RENTAL_SLOTS[rental.rentalSlot]?.shortLabel || 'Full Day'} Slot
                  </Text>
                </View>
                <Text style={styles.itemCount}>
                  {totalDays}d · {totalUnits} unit{totalUnits > 1 ? 's' : ''}
                </Text>
              </View>
            </View>
            <Text style={styles.amount}>{formatCurrency(rental.totalAmount)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  statusLine: {
    width: 3,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  customerName: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginRight: spacing.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  statusText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
  },
  itemsPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  itemTag: {
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  itemTagText: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
  },
  moreTag: {
    backgroundColor: colors.primary + '15',
    borderColor: colors.primary + '30',
  },
  moreTagText: {
    fontSize: typography.fontSize.xs,
    color: colors.primaryLight,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  footerLeft: {
    flex: 1,
  },
  dateRange: {
    fontSize: typography.fontSize.sm,
    color: colors.textTertiary,
    marginBottom: 2,
  },
  footerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  slotBadge: {
    backgroundColor: colors.primary + '15',
    borderWidth: 1,
    borderColor: colors.primary + '30',
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
    borderRadius: borderRadius.sm,
  },
  slotBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: colors.primaryLight,
  },
  itemCount: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
  },
  amount: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.accent,
  },
  arrow: {
    fontSize: 22,
    color: colors.textTertiary,
  },
});

});

export default RentalCard;