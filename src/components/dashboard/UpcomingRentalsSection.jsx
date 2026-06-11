/**
 * Upcoming rentals section.
 * Extracted from DashboardScreen.
 */
import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { formatCurrency } from '../../utils/formatters';

const UpcomingRentalsSection = React.memo(({ rentals, navigation }) => {
  if (rentals.length === 0) return null;

  return (
    <>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Upcoming</Text>
        <Text style={styles.seeAll}>
          {rentals.length} rental{rentals.length !== 1 ? 's' : ''}
        </Text>
      </View>
      {rentals.slice(0, 3).map((rental) => (
        <TouchableOpacity
          key={rental.id}
          style={styles.rentalMiniCard}
          onPress={() => navigation.navigate('RentalDetail', { rental })}
          activeOpacity={0.7}
        >
          <View style={[styles.rentalDot, { backgroundColor: '#F59E0B' }]} />
          <View style={styles.rentalMiniInfo}>
            <Text style={styles.rentalMiniName}>{rental.customerName}</Text>
            <Text style={styles.rentalMiniItems}>
              {rental.items.length} type{rental.items.length > 1 ? 's' : ''} ·{' '}
              {formatCurrency(rental.totalAmount)}
            </Text>
          </View>
          <Text style={styles.rentalMiniArrow}>›</Text>
        </TouchableOpacity>
      ))}
    </>
  );
});

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xxl,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  seeAll: {
    fontSize: typography.fontSize.md,
    color: colors.primaryLight,
    fontWeight: typography.fontWeight.medium,
  },
  rentalMiniCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  rentalDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.md,
  },
  rentalMiniInfo: {
    flex: 1,
  },
  rentalMiniName: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.textPrimary,
  },
  rentalMiniItems: {
    fontSize: typography.fontSize.sm,
    color: colors.textTertiary,
  },
  rentalMiniArrow: {
    fontSize: 20,
    color: colors.textTertiary,
  },
});

export default UpcomingRentalsSection;
