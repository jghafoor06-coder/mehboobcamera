/**
 * Dashboard stats grid component.
 * Extracted from DashboardScreen.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../theme';
import AnimatedStatCard from '../AnimatedStatCard';

const DashboardStats = React.memo(({ stats }) => {
  return (
    <View style={styles.statsGrid}>
      <View style={styles.statsRow}>
        <View style={styles.statHalf}>
          <AnimatedStatCard
            title="Customers"
            value={stats.totalCustomers}
            icon="👤"
            gradient={colors.primaryGradient}
            index={0}
          />
        </View>
        <View style={styles.statHalf}>
          <AnimatedStatCard
            title="Inventory"
            value={stats.totalInventoryItems}
            subtitle="items"
            icon="📦"
            gradient={colors.successGradient}
            index={1}
          />
        </View>
      </View>
      <View style={styles.statsRow}>
        <View style={styles.statHalf}>
          <AnimatedStatCard
            title="Total Rentals"
            value={stats.totalRentals}
            icon="🎬"
            gradient={colors.secondaryGradient}
            index={2}
          />
        </View>
        <View style={styles.statHalf}>
          <AnimatedStatCard
            title="Revenue"
            value={stats.totalRevenue}
            isCurrency
            icon="💰"
            gradient={colors.accentGradient}
            index={3}
          />
        </View>
      </View>
      <View style={styles.statsRow}>
        <View style={styles.statHalf}>
          <AnimatedStatCard
            title="Active Today"
            value={stats.activeRentalsToday.length}
            icon="🎬"
            gradient={colors.primaryGradient}
            index={4}
          />
        </View>
        <View style={styles.statHalf}>
          <AnimatedStatCard
            title="Equipment Out"
            value={stats.equipmentOut}
            subtitle="units"
            icon="📸"
            gradient={colors.successGradient}
            index={5}
          />
        </View>
      </View>
      {stats.totalOutstanding > 0 && (
        <View style={styles.statsRow}>
          <View style={styles.statFull}>
            <AnimatedStatCard
              title="Outstanding Payments"
              value={stats.totalOutstanding}
              isCurrency
              icon="💳"
              gradient={colors.primaryGradient}
              index={6}
            />
          </View>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  statsGrid: {
    gap: spacing.md,
    marginBottom: spacing.xxl,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statHalf: {
    flex: 1,
  },
  statFull: {
    flex: 1,
  },
});

export default DashboardStats;
