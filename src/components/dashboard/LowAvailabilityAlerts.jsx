/**
 * Low availability alerts section.
 * Extracted from DashboardScreen.
 */
import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../theme';

const LowAvailabilityAlerts = React.memo(({ alerts, inventoryItems, navigation }) => {
  if (!alerts || alerts.length === 0) return null;

  return (
    <>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Low Availability</Text>
      </View>
      {alerts.slice(0, 3).map((alert) => (
        <TouchableOpacity
          key={alert.itemId}
          style={styles.alertCard}
          onPress={() => {
            const item = inventoryItems.find((i) => i.id === alert.itemId);
            if (item) navigation.navigate('EquipmentDetails', { item });
          }}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.alertDot,
              { backgroundColor: alert.critical ? '#EF4444' : '#F59E0B' },
            ]}
          />
          <View style={styles.alertInfo}>
            <Text style={styles.alertName}>{alert.itemName}</Text>
            <Text style={styles.alertDetails}>
              {alert.availableQuantity} left · {alert.bookedQuantity} booked
            </Text>
          </View>
          <Text style={styles.alertArrow}>›</Text>
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
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#F59E0B30',
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  alertDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.md,
  },
  alertInfo: {
    flex: 1,
  },
  alertName: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.textPrimary,
  },
  alertDetails: {
    fontSize: typography.fontSize.sm,
    color: colors.textTertiary,
  },
  alertArrow: {
    fontSize: 20,
    color: colors.textTertiary,
  },
});

export default LowAvailabilityAlerts;
