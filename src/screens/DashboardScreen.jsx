import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { colors, spacing, typography, borderRadius } from '../theme';
import useDashboardData from '../hooks/useDashboardData';
import GlowBackground from '../components/GlowBackground';
import SearchBar from '../components/SearchBar';
import { StatsGridSkeleton } from '../components/SkeletonLoaders';
import {
  DashboardHeader,
  DashboardStats,
  QuickActions,
  ActiveRentalsSection,
  UpcomingRentalsSection,
  LowAvailabilityAlerts,
  RecentCustomers,
} from '../components/dashboard';

const DashboardScreen = ({ navigation }) => {
  const {
    customers,
    inventoryItems,
    stats,
    loadingPhase,
    error,
    refreshStats,
  } = useDashboardData();

  const [searchText, setSearchText] = useState('');

  const onRefresh = useCallback(() => {
    refreshStats();
  }, [refreshStats]);

  const isInitialLoading = loadingPhase !== 'done' && stats.totalCustomers === 0;
  const isRefreshing = loadingPhase === 'stats';

  if (isInitialLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <GlowBackground
        blobs={[
          { corner: 'topLeft', color: colors.secondary, size: 240, opacity: 0.035 },
          { corner: 'bottomRight', color: colors.accent, size: 200, opacity: 0.03 },
        ]}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <DashboardHeader />

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        

        {isRefreshing && loadingPhase === 'stats' ? (
          <StatsGridSkeleton />
        ) : (
          <DashboardStats stats={stats} />
        )}

        <QuickActions navigation={navigation} />

        <ActiveRentalsSection rentals={stats.activeRentalsToday} navigation={navigation} />

        <UpcomingRentalsSection rentals={stats.upcomingRentals} navigation={navigation} />

        <LowAvailabilityAlerts
          alerts={stats.lowAvailabilityAlerts}
          inventoryItems={inventoryItems}
          navigation={navigation}
        />

        <RecentCustomers customers={customers} navigation={navigation} />

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    position: 'relative',
    overflow: 'hidden',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.fontSize.md,
    color: colors.textTertiary,
  },
  errorContainer: {
    backgroundColor: colors.error + '15',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.error + '30',
  },
  errorText: {
    fontSize: typography.fontSize.sm,
    color: colors.errorLight,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.xl,
  },
  bottomSpacer: {
    height: 20,
  },
});

export default DashboardScreen;