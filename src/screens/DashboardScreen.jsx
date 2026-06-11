import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Animated,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { colors, borderRadius, typography, spacing } from '../theme';
import { formatCurrency } from '../utils/formatters';
import { subscribeToCustomers } from '../firebase/customersService';
import { subscribeToItems } from '../firebase/itemsService';
import { getDashboardStats } from '../firebase/dashboardStatsService';
import AnimatedStatCard from '../components/AnimatedStatCard';
import CustomerCard from '../components/CustomerCard';
import SearchBar from '../components/SearchBar';
import GlowBackground from '../components/GlowBackground';
import {
  DashboardHeaderSkeleton,
  StatsGridSkeleton,
  RentalListSkeleton,
} from '../components/SkeletonLoaders';

const DashboardScreen = ({ navigation }) => {
  const [searchText, setSearchText] = useState('');
  const [loadingPhase, setLoadingPhase] = useState('header'); // 'header' → 'stats' → 'content' → 'done'
  const [error, setError] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  
  // Dashboard stats
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalInventoryItems: 0,
    totalRentals: 0,
    totalRevenue: 0,
    totalOutstanding: 0,
    activeRentalsToday: [],
    upcomingRentals: [],
    equipmentOut: 0,
    lowAvailabilityAlerts: [],
  });

  const headerFade = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-20)).current;
  const dataLoaded = useRef({ customers: false, items: false, stats: false });

  const checkAllLoaded = () => {
    if (dataLoaded.current.customers && dataLoaded.current.items && dataLoaded.current.stats) {
      setLoadingPhase('done');
    }
  };

  /**
   * Optimized fetchStats using dashboardStatsService
   * Reduces 120+ queries to ~5 queries
   */
  const fetchStats = useCallback(async () => {
    try {
      console.time('fetchStats');
      setError(null);
      
      const dashboardStats = await getDashboardStats();
      setStats(dashboardStats);
      
      dataLoaded.current.stats = true;
      checkAllLoaded();
      console.timeEnd('fetchStats');
    } catch (err) {
      console.error('Dashboard stats fetch error:', err);
      setError('Failed to load dashboard data. Pull to refresh.');
      dataLoaded.current.stats = true;
      checkAllLoaded();
    }
  }, []);

  useEffect(() => {
    console.time('Dashboard Initial Load');
    
    // Phase 1: Load header immediately
    setLoadingPhase('header');

    // Phase 2: Subscribe to real-time updates (non-blocking)
    const unsubscribeCustomers = subscribeToCustomers((data) => {
      setCustomers(data);
      dataLoaded.current.customers = true;
      checkAllLoaded();
    });

    const unsubscribeItems = subscribeToItems((data) => {
      setInventoryItems(data);
      dataLoaded.current.items = true;
      checkAllLoaded();
    });

    // Phase 3: Load stats (most expensive operation)
    setLoadingPhase('stats');
    fetchStats();

    // Phase 4: Animate in
    Animated.parallel([
      Animated.timing(headerFade, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(headerSlide, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start(() => {
      console.timeEnd('Dashboard Initial Load');
    });

    return () => {
      unsubscribeCustomers();
      unsubscribeItems();
    };
  }, [fetchStats]);

  const recentCustomers = useMemo(
    () => customers.slice(0, 4),
    [customers]
  );

  const onRefresh = useCallback(() => {
    setLoadingPhase('stats');
    dataLoaded.current.stats = false;
    fetchStats();
  }, [fetchStats]);

  const quickActions = useMemo(
    () => [
      { id: '1', label: 'Add Customer', icon: '👤', screen: 'AddCustomer', color: colors.primary },
      { id: '2', label: 'Add Item', icon: '📦', screen: 'AddItem', color: colors.secondary },
      { id: '3', label: 'Inventory', icon: '🎬', screen: 'Inventory', color: colors.success },
    ],
    []
  );

  // Progressive loading - show skeleton first, then content
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
        {/* Header */}
        <Animated.View
          style={[styles.header, { opacity: headerFade, transform: [{ translateY: headerSlide }] }]}
        >
          <View>
            <Text style={styles.greeting}>Good Evening</Text>
            <Text style={styles.headerTitle}>MehboobCamera 786</Text>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.avatarBadge}>
              <Text style={styles.avatarText}>HMC</Text>
            </View>
          </View>
        </Animated.View>

        {/* Error Message */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Search */}
        <SearchBar
          placeholder="Search customers, equipment..."
          value={searchText}
          onChangeText={setSearchText}
        />

        {/* Stats Grid */}
        {isRefreshing && loadingPhase === 'stats' ? (
          <StatsGridSkeleton />
        ) : (
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
        )}

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsRow}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={[styles.actionCard, { borderColor: action.color + '30' }]}
              onPress={() => navigation.navigate(action.screen)}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIcon, { backgroundColor: action.color + '20' }]}>
                <Text style={styles.actionEmoji}>{action.icon}</Text>
              </View>
              <Text style={styles.actionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Active Rentals Today */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Active Today</Text>
          <Text style={styles.seeAll}>{stats.activeRentalsToday.length} rental{stats.activeRentalsToday.length !== 1 ? 's' : ''}</Text>
        </View>
        {stats.activeRentalsToday.length === 0 ? (
          <Text style={styles.emptyText}>No rentals active today</Text>
        ) : (
          stats.activeRentalsToday.slice(0, 5).map((rental) => (
            <TouchableOpacity
              key={rental.id}
              style={styles.rentalMiniCard}
              onPress={() => navigation.navigate('RentalDetail', { rental })}
              activeOpacity={0.7}
            >
              <View style={[styles.rentalDot, { backgroundColor: '#10B981' }]} />
              <View style={styles.rentalMiniInfo}>
                <Text style={styles.rentalMiniName}>{rental.customerName}</Text>
                <Text style={styles.rentalMiniItems}>
                  {rental.items.length} type{rental.items.length > 1 ? 's' : ''} · {formatCurrency(rental.totalAmount)}
                </Text>
              </View>
              <Text style={styles.rentalMiniArrow}>›</Text>
            </TouchableOpacity>
          ))
        )}

        {/* Upcoming Rentals */}
        {stats.upcomingRentals.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Upcoming</Text>
              <Text style={styles.seeAll}>{stats.upcomingRentals.length} rental{stats.upcomingRentals.length !== 1 ? 's' : ''}</Text>
            </View>
            {stats.upcomingRentals.slice(0, 3).map((rental) => (
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
                    {rental.items.length} type{rental.items.length > 1 ? 's' : ''} · {formatCurrency(rental.totalAmount)}
                  </Text>
                </View>
                <Text style={styles.rentalMiniArrow}>›</Text>
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* Low Availability Alerts */}
        {stats.lowAvailabilityAlerts && stats.lowAvailabilityAlerts.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Low Availability</Text>
            </View>
            {stats.lowAvailabilityAlerts.slice(0, 3).map((alert) => (
              <TouchableOpacity
                key={alert.itemId}
                style={styles.alertCard}
                onPress={() => {
                  const item = inventoryItems.find(i => i.id === alert.itemId);
                  if (item) navigation.navigate('EquipmentDetails', { item });
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.alertDot, { backgroundColor: alert.critical ? '#EF4444' : '#F59E0B' }]} />
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
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Customers</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Customers')}>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>
        {recentCustomers.map((customer, index) => (
          <CustomerCard
            key={customer.id}
            customer={customer}
            index={index}
            onPress={() => navigation.navigate('CustomerProfile', { customerId: customer.id })}
          />
        ))}

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
  emptyText: {
    fontSize: typography.fontSize.md,
    color: colors.textTertiary,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
    marginTop: spacing.lg,
  },
  greeting: {
    fontSize: typography.fontSize.md,
    color: colors.textTertiary,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary + '20',
    borderWidth: 1.5,
    borderColor: colors.primary + '40',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.primaryLight,
  },
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
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  actionCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: 'center',
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  actionEmoji: {
    fontSize: 22,
  },
  actionLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.textSecondary,
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

  // ─── Low Availability Alerts ───
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
  bottomSpacer: {
    height: 20,
  },
});

export default DashboardScreen;