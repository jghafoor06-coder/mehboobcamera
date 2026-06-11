import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  Modal,
  RefreshControl,
  TextInput,
} from 'react-native';
import { colors, spacing, typography, borderRadius, shadows } from '../theme';
import { formatCurrency, formatCompactDate } from '../utils/formatters';
import {
  getEquipmentAvailability,
  checkAvailability,
  getRentalsForItem,
  getBookedQuantityForDate,
  RENTAL_SLOTS,
} from '../utils/availabilityService';
import GlassmorphismPanel from '../components/GlassmorphismPanel';
import GlowBackground from '../components/GlowBackground';
import GradientCard from '../components/GradientCard';
import AvailabilityCalendar from '../components/AvailabilityCalendar';

const TABS = ['Availability', 'Rentals', 'Insights'];

// ─── Category icons/colors ───
const categoryIcons = {
  Cameras: '🎬',
  Lenses: '🔍',
  Tripods: '📐',
  Lighting: '💡',
  Accessories: '🔧',
};
const categoryColors = {
  Cameras: '#6366F1',
  Lenses: '#06B6D4',
  Tripods: '#10B981',
  Lighting: '#F59E0B',
  Accessories: '#EF4444',
};

// ─── Day Slot Usage (Modal helper) ───
const DaySlotUsage = ({ day }) => {
  if (!day) return null;
  const dayBooked = day.slotBreakdown?.day || 0;
  const eveningBooked = day.slotBreakdown?.evening || 0;
  const fullDayBooked = day.slotBreakdown?.full_day || 0;
  const fullDayUsage =
    day.total > 0 ? Math.round((day.booked / day.total) * 100) : 0;

  return (
    <View style={styles.slotUsageContainer}>
      <View style={styles.slotUsageRow}>
        <Text style={styles.slotUsageLabel}>Day</Text>
        <Text style={styles.slotUsageValue}>{dayBooked} booked</Text>
      </View>
      <View style={styles.slotUsageRow}>
        <Text style={styles.slotUsageLabel}>Evening</Text>
        <Text style={styles.slotUsageValue}>{eveningBooked} booked</Text>
      </View>
      <View style={styles.slotUsageRow}>
        <Text style={styles.slotUsageLabel}>Full Day</Text>
        <Text style={styles.slotUsageValue}>{fullDayBooked} booked</Text>
      </View>
      <View style={styles.modalDivider} />
      <View style={styles.slotUsageRow}>
        <Text style={styles.slotUsageLabel}>Total Usage</Text>
        <Text
          style={[
            styles.slotUsageValue,
            {
              color:
                fullDayUsage >= 100
                  ? colors.error
                  : fullDayUsage >= 50
                  ? colors.warning
                  : colors.success,
            },
          ]}
        >
          {fullDayUsage}%
        </Text>
      </View>
      <View style={styles.usageBarBg}>
        <View
          style={[
            styles.usageBarFill,
            {
              width: `${fullDayUsage}%`,
              backgroundColor:
                fullDayUsage >= 100
                  ? colors.error
                  : fullDayUsage >= 50
                  ? colors.warning
                  : colors.success,
            },
          ]}
        />
      </View>
    </View>
  );
};

// ─── Rental List Item (memoized) ───
const RentalListItem = React.memo(({ rental }) => (
  <View style={styles.rentalCard}>
    <GlowBackground
      blobs={[
        { corner: 'topLeft', color: colors.primary, size: 100, opacity: 0.03 },
      ]}
    />
    <View style={styles.rentalCardInner}>
      <View style={styles.rentalCardHeader}>
        <Text style={styles.rentalCustomerName} numberOfLines={1}>
          {rental.customerName}
        </Text>
        <View
          style={[
            styles.rentalStatusBadge,
            {
              backgroundColor:
                rental.rentalStatus === 'active'
                  ? colors.success + '20'
                  : rental.rentalStatus === 'upcoming'
                  ? colors.primary + '20'
                  : colors.textTertiary + '20',
            },
          ]}
        >
          <Text
            style={[
              styles.rentalStatusText,
              {
                color:
                  rental.rentalStatus === 'active'
                    ? colors.success
                    : rental.rentalStatus === 'upcoming'
                    ? colors.primaryLight
                    : colors.textTertiary,
              },
            ]}
          >
            {rental.rentalStatus === 'active'
              ? 'Active'
              : rental.rentalStatus === 'upcoming'
              ? 'Upcoming'
              : 'Completed'}
          </Text>
        </View>
      </View>
      <View style={styles.rentalDetails}>
        <View style={styles.rentalDetail}>
          <Text style={styles.rentalDetailLabel}>📅</Text>
          <Text style={styles.rentalDetailValue}>
            {formatCompactDate(rental.startDate)} →{' '}
            {formatCompactDate(rental.endDate)}
          </Text>
        </View>
        <View style={styles.rentalDetail}>
          <Text style={styles.rentalDetailLabel}>Qty</Text>
          <Text style={styles.rentalDetailValue}>{rental.quantity}</Text>
        </View>
        <View style={styles.rentalDetail}>
          <Text style={styles.rentalDetailLabel}>Slot</Text>
          <Text style={styles.rentalDetailValue}>
            {RENTAL_SLOTS[rental.rentalSlot]?.label || 'Full Day'}
          </Text>
        </View>
      </View>
      {rental.rentalStatus === 'upcoming' && (
        <Text style={styles.rentalCountdown}>
          Starts in{' '}
          {Math.max(
            0,
            Math.ceil((rental.startDate - new Date()) / (1000 * 60 * 60 * 24)),
          )}{' '}
          day(s)
        </Text>
      )}
    </View>
  </View>
));

// ─── Availability Tab (extracted + memoized, owns its own search state) ───
const AvailabilityTab = React.memo(
  ({ itemId, availability, availabilityColor, timeline, rentals, totalQuantity }) => {
    const [searchStartDate, setSearchStartDate] = useState('');
    const [searchEndDate, setSearchEndDate] = useState('');
    const [searchQty, setSearchQty] = useState('1');
    const [searchSlot, setSearchSlot] = useState('full_day');
    const [searchResult, setSearchResult] = useState(null);
    const [searching, setSearching] = useState(false);

    const [selectedDay, setSelectedDay] = useState(null);
    const [dayModalVisible, setDayModalVisible] = useState(false);

    const handleCheckAvailability = useCallback(async () => {
      if (!itemId || !searchStartDate || !searchEndDate) return;
      setSearching(true);
      try {
        const result = await checkAvailability(
          itemId,
          new Date(searchStartDate),
          new Date(searchEndDate),
          searchSlot,
          parseInt(searchQty, 10) || 1,
        );
        setSearchResult(result);
      } catch (error) {
        console.error('Error checking availability:', error);
      } finally {
        setSearching(false);
      }
    }, [itemId, searchStartDate, searchEndDate, searchSlot, searchQty]);

    return (
      <View>
        {/* Availability Calendar (Full Month Grid) */}
        <View style={styles.timelineSection}>
          <Text style={styles.sectionTitle}>Availability Calendar</Text>
          <Text style={styles.sectionSubtitle}>Full month overview — tap a day for details</Text>
          <AvailabilityCalendar
            rentals={rentals}
            itemId={itemId}
            totalQuantity={totalQuantity}
          />
        </View>

        {/* 30-Day Timeline */}
        <View style={styles.timelineSection}>
          <Text style={styles.sectionTitle}>30-Day Availability</Text>
          <Text style={styles.sectionSubtitle}>
            {timeline.length > 0
              ? `${timeline[0]?.month || ''} — ${
                  timeline[timeline.length - 1]?.month || ''
                }`
              : ''}
          </Text>
          {timeline.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.timelineScroll}
            >
              {timeline.map((day, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.timelineDay}
                  onPress={() => {
                    setSelectedDay(day);
                    setDayModalVisible(true);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.timelineDayNum}>{day.dayNumber}</Text>
                  <View
                    style={[
                      styles.timelineDot,
                      {
                        backgroundColor:
                          day.status === 'green'
                            ? colors.success
                            : day.status === 'orange'
                            ? colors.warning
                            : colors.error,
                      },
                    ]}
                  />
                  <Text style={styles.timelineDateLabel}>{day.month}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.timelineLoading}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          )}
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: colors.success }]}
              />
              <Text style={styles.legendText}>&gt;50% Available</Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: colors.warning }]}
              />
              <Text style={styles.legendText}>{'≤50%'}</Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: colors.error }]}
              />
              <Text style={styles.legendText}>Fully Booked</Text>
            </View>
          </View>
        </View>

        {/* ─── Day Detail Modal ─── */}
        <Modal
          visible={dayModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setDayModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setDayModalVisible(false)}
          >
            <TouchableOpacity activeOpacity={1} style={styles.modalContent}>
              <View style={styles.modalHandle} />
              {selectedDay && (
                <>
                  <Text style={styles.modalDate}>
                    {selectedDay.dayNumber} {selectedDay.month}
                  </Text>
                  <View style={styles.modalStats}>
                    <View style={styles.modalStat}>
                      <Text style={styles.modalStatValue}>
                        {selectedDay.booked}
                      </Text>
                      <Text style={styles.modalStatLabel}>Booked</Text>
                    </View>
                    <View style={styles.modalStat}>
                      <Text
                        style={[
                          styles.modalStatValue,
                          { color: availabilityColor },
                        ]}
                      >
                        {selectedDay.available}
                      </Text>
                      <Text style={styles.modalStatLabel}>Available</Text>
                    </View>
                    <View style={styles.modalStat}>
                      <Text style={styles.modalStatValue}>
                        {selectedDay.total}
                      </Text>
                      <Text style={styles.modalStatLabel}>Total</Text>
                    </View>
                  </View>
                  <View style={styles.modalDivider} />
                  <Text style={styles.modalSectionTitle}>Slot Usage</Text>
                  <DaySlotUsage day={selectedDay} />
                </>
              )}
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      </View>
    );
  },
);

// ─── Rentals Tab (extracted + memoized) ───
const RentalsTab = React.memo(({ upcomingRentals }) => {
  if (upcomingRentals.length === 0) {
    return (
      <View style={styles.emptyTab}>
        <Text style={styles.emptyIcon}>📋</Text>
        <Text style={styles.emptyTitle}>No Upcoming Rentals</Text>
        <Text style={styles.emptySubtitle}>
          This equipment has no active or future bookings.
        </Text>
      </View>
    );
  }

  return (
    <View>
      {upcomingRentals.map((rental, index) => (
        <RentalListItem key={rental.id || index} rental={rental} />
      ))}
    </View>
  );
});

// ─── Insights Tab (extracted + memoized) ───
const InsightsTab = React.memo(({ utilization }) => {
  if (!utilization) {
    return (
      <View style={styles.emptyTab}>
        <Text style={styles.emptyIcon}>📊</Text>
        <Text style={styles.emptyTitle}>No Insights Available</Text>
        <Text style={styles.emptySubtitle}>
          Utilization data will appear once rentals are recorded.
        </Text>
      </View>
    );
  }

  return (
    <View>
      <Text style={styles.sectionTitle}>Utilization Overview</Text>
      <View style={styles.insightsGrid}>
        <GradientCard borderOnly gradient={colors.primaryGradient}>
          <View style={styles.insightCard}>
            <Text style={styles.insightLabel}>Current Utilization</Text>
            <Text style={[styles.insightValue, { color: colors.primaryLight }]}>
              {utilization.currentUtilization}%
            </Text>
            <View style={styles.insightBarBg}>
              <View
                style={[
                  styles.insightBarFill,
                  {
                    width: `${utilization.currentUtilization}%`,
                    backgroundColor: colors.primary,
                  },
                ]}
              />
            </View>
          </View>
        </GradientCard>

        <GradientCard borderOnly gradient={colors.successGradient}>
          <View style={styles.insightCard}>
            <Text style={styles.insightLabel}>Weekly Utilization</Text>
            <Text style={[styles.insightValue, { color: colors.success }]}>
              {utilization.weeklyUtilization}%
            </Text>
            <View style={styles.insightBarBg}>
              <View
                style={[
                  styles.insightBarFill,
                  {
                    width: `${utilization.weeklyUtilization}%`,
                    backgroundColor: colors.success,
                  },
                ]}
              />
            </View>
          </View>
        </GradientCard>

        <GradientCard borderOnly gradient={colors.secondaryGradient}>
          <View style={styles.insightCard}>
            <Text style={styles.insightLabel}>Monthly Utilization</Text>
            <Text style={[styles.insightValue, { color: colors.secondary }]}>
              {utilization.monthlyUtilization}%
            </Text>
            <View style={styles.insightBarBg}>
              <View
                style={[
                  styles.insightBarFill,
                  {
                    width: `${utilization.monthlyUtilization}%`,
                    backgroundColor: colors.secondary,
                  },
                ]}
              />
            </View>
          </View>
        </GradientCard>
      </View>

      <View style={styles.insightStatsRow}>
        <GlassmorphismPanel style={styles.insightStatCard}>
          <Text style={styles.insightStatValue}>
            {utilization.upcomingCount}
          </Text>
          <Text style={styles.insightStatLabel}>Upcoming Rentals</Text>
        </GlassmorphismPanel>
        <GlassmorphismPanel style={styles.insightStatCard}>
          <Text style={styles.insightStatValue}>
            {utilization.mostRequestedSlot}
          </Text>
          <Text style={styles.insightStatLabel}>Most Requested Slot</Text>
        </GlassmorphismPanel>
      </View>
    </View>
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════════

const EquipmentDetailsScreen = ({ route, navigation }) => {
  const routeItem = route?.params?.item;
  const itemId = routeItem?.id;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [item, setItem] = useState(routeItem);
  const [availability, setAvailability] = useState(null);
  const [upcomingRentals, setUpcomingRentals] = useState([]);

  // Deferred computation: store raw rentals + total quantity in refs
  const rentalsRef = useRef([]);
  const totalQuantityRef = useRef(1);
  const [rentalsVersion, setRentalsVersion] = useState(0);

  // Tab content fade
  const contentFade = useRef(new Animated.Value(1)).current;

  // Fetch all data for this item — fetches rentals ONCE, computes fast data immediately
  const fetchData = useCallback(async () => {
    if (!itemId) {
      setLoading(false);
      return;
    }
    try {
      const rentalsData = await getRentalsForItem(itemId);
      const availData = await getEquipmentAvailability(itemId, rentalsData);

      if (availData) {
        setItem(availData.item);
        setAvailability(availData);
      }

      setUpcomingRentals(
        getUpcomingRentalsForItemFromRentals(rentalsData, itemId),
      );

      // Store raw rentals for deferred computation (no state update needed)
      rentalsRef.current = rentalsData;
      totalQuantityRef.current = availData?.total || 1;
      setRentalsVersion(v => v + 1);
    } catch (error) {
      console.error('Error fetching equipment details:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [itemId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  // ─── Deferred heavy computations (only run when the tab is active) ───
  const timeline = useMemo(() => {
    if (activeTab !== 0 || rentalsVersion === 0) return [];
    return generateTimelineFromRentals(
      rentalsRef.current,
      itemId,
      totalQuantityRef.current,
    );
  }, [activeTab, rentalsVersion, itemId]);

  const utilization = useMemo(() => {
    if (activeTab !== 2 || rentalsVersion === 0) return null;
    return calculateUtilizationFromRentals(
      rentalsRef.current,
      itemId,
      totalQuantityRef.current,
    );
  }, [activeTab, rentalsVersion, itemId]);

  // Tab switching animation
  const switchTab = useCallback(
    index => {
      if (index === activeTab) return;
      Animated.timing(contentFade, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start(() => {
        setActiveTab(index);
        Animated.timing(contentFade, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      });
    },
    [activeTab, contentFade],
  );

  // Memoize availability color to avoid recalculation on every render
  const availabilityColor = useMemo(() => {
    if (!availability) return colors.textTertiary;
    if (availability.percentAvailable > 50) return colors.success;
    if (availability.percentAvailable > 0) return colors.warning;
    return colors.error;
  }, [availability]);

  const catColor = useMemo(
    () => categoryColors[item?.category] || colors.primary,
    [item?.category],
  );
  const catIcon = useMemo(
    () => categoryIcons[item?.category] || '📦',
    [item?.category],
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading equipment details...</Text>
      </View>
    );
  }

  if (!itemId) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.loadingText}>
          Equipment details are unavailable.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* ─── Back Button ─── */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Text style={styles.backArrow}>‹</Text>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        {/* ─── Equipment Header ─── */}
        <View style={styles.headerSection}>
          <View
            style={[styles.headerGlow, { backgroundColor: catColor + '15' }]}
          />
          <View
            style={[
              styles.categoryIconWrap,
              { backgroundColor: catColor + '20' },
            ]}
          >
            <Text style={styles.categoryIcon}>{catIcon}</Text>
          </View>
          <Text style={styles.equipmentName} numberOfLines={2}>
            {item?.name ?? 'Unknown Item'}
          </Text>
          <Text style={styles.equipmentCategory}>
            {item?.category ?? 'Unknown Category'}
          </Text>

          <View style={styles.headerStats}>
            <View style={styles.headerStat}>
              <Text style={styles.headerStatValue}>
                {formatCurrency(item?.pricePerDay ?? 0)}
              </Text>
              <Text style={styles.headerStatLabel}>/day</Text>
            </View>
            <View style={styles.headerStatDivider} />
            <View style={styles.headerStat}>
              <Text style={styles.headerStatValue}>
                {availability?.total ?? item?.quantity ?? 0}
              </Text>
              <Text style={styles.headerStatLabel}>Total Units</Text>
            </View>
          </View>

          {/* ─── Quick Availability Badge ─── */}
          <View
            style={[
              styles.quickBadge,
              {
                backgroundColor: availabilityColor + '18',
                borderColor: availabilityColor + '40',
              },
            ]}
          >
            <View
              style={[
                styles.quickBadgeDot,
                { backgroundColor: availabilityColor },
              ]}
            />
            <Text style={[styles.quickBadgeText, { color: availabilityColor }]}>
              Available Now: {availability?.available ?? item?.quantity ?? 0} /{' '}
              {availability?.total ?? item?.quantity ?? 0}
            </Text>
          </View>

          {/* ─── Segmented Tabs ─── */}
          <View style={styles.tabBar}>
            <View style={styles.tabContainer}>
              {TABS.map((tab, index) => (
                <TouchableOpacity
                  key={tab}
                  style={[styles.tab, activeTab === index && styles.tabActive]}
                  onPress={() => switchTab(index)}
                  activeOpacity={0.8}
                >
                  {activeTab === index && <View style={styles.tabGlow} />}
                  <Text
                    style={[
                      styles.tabText,
                      activeTab === index && styles.tabTextActive,
                    ]}
                  >
                    {tab}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.tabBarLine} />
          </View>
        </View>

        {/* ─── Tab Content ─── */}
        <Animated.View style={[styles.tabContent, { opacity: contentFade }]}>
          {activeTab === 0 && (
            <AvailabilityTab
              itemId={itemId}
              availability={availability}
              availabilityColor={availabilityColor}
              timeline={timeline}
              rentals={rentalsRef.current}
              totalQuantity={totalQuantityRef.current}
            />
          )}
          {activeTab === 1 && <RentalsTab upcomingRentals={upcomingRentals} />}
          {activeTab === 2 && <InsightsTab utilization={utilization} />}
        </Animated.View>
      </ScrollView>
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// Pure functions (operate on pre-fetched rentals, no Firestore calls)
// ═══════════════════════════════════════════════════════════════════════════════

function getUpcomingRentalsForItemFromRentals(allRentals, itemId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcoming = [];
  for (const rental of allRentals) {
    const items = rental.items || [];
    const hasItem = items.some(i => i.itemId === itemId);
    if (!hasItem) continue;

    const endDate = rental.endDate;
    endDate.setHours(23, 59, 59, 999);

    if (endDate >= today) {
      const rentalItem = items.find(i => i.itemId === itemId);
      const start = rental.startDate;
      start.setHours(0, 0, 0, 0);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      let rentalStatus = 'upcoming';
      if (start <= now && endDate >= now) rentalStatus = 'active';
      else if (endDate < now) rentalStatus = 'completed';

      upcoming.push({
        id: rental.id,
        customerId: rental.customerId,
        customerName: rental.customerName,
        ...rental,
        quantity: rentalItem?.quantity || 0,
        rentalStatus,
        startDate: start,
        endDate,
      });
    }
  }

  upcoming.sort((a, b) => a.startDate - b.startDate);
  return upcoming;
}

function calculateUtilizationFromRentals(allRentals, itemId, totalQuantity) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let currentBooked = 0;
  let weeklyBooked = 0;
  let monthlyBooked = 0;
  const slotCounts = { day: 0, evening: 0, full_day: 0 };

  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo = new Date(today);
  monthAgo.setDate(monthAgo.getDate() - 30);

  for (const rental of allRentals) {
    const items = rental.items || [];
    const hasItem = items.some(i => i.itemId === itemId);
    if (!hasItem) continue;

    const rentalItem = items.find(i => i.itemId === itemId);
    const qty = rentalItem?.quantity || 0;
    const start = rental.startDate;
    const end = rental.endDate;
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    // Current: if rental is active today
    if (start <= today && end >= today) {
      currentBooked += qty;
    }

    // Weekly: any rental that overlaps the past 7 days
    if (start <= today && end >= weekAgo) {
      weeklyBooked += qty;
    }

    // Monthly: any rental that overlaps the past 30 days
    if (start <= today && end >= monthAgo) {
      monthlyBooked += qty;
    }

    // Track slot usage
    const slot = rental.rentalSlot || 'full_day';
    slotCounts[slot] = (slotCounts[slot] || 0) + qty;
  }

  const currentUtilization =
    totalQuantity > 0 ? Math.round((currentBooked / totalQuantity) * 100) : 0;
  const weeklyUtilization =
    totalQuantity > 0
      ? Math.min(100, Math.round((weeklyBooked / (totalQuantity * 7)) * 100))
      : 0;
  const monthlyUtilization =
    totalQuantity > 0
      ? Math.min(100, Math.round((monthlyBooked / (totalQuantity * 30)) * 100))
      : 0;

  // Most requested slot
  let mostRequestedSlot = 'full_day';
  let maxSlotCount = 0;
  for (const [slot, count] of Object.entries(slotCounts)) {
    if (count > maxSlotCount) {
      maxSlotCount = count;
      mostRequestedSlot = slot;
    }
  }

  const upcomingCount = allRentals.filter(r => {
    const hasItem = (r.items || []).some(i => i.itemId === itemId);
    if (!hasItem) return false;
    const start = new Date(r.startDate);
    start.setHours(0, 0, 0, 0);
    return start >= today;
  }).length;

  return {
    currentUtilization,
    weeklyUtilization,
    monthlyUtilization,
    upcomingCount,
    mostRequestedSlot: RENTAL_SLOTS[mostRequestedSlot]?.label || 'Full Day',
  };
}

function generateTimelineFromRentals(allRentals, itemId, totalQuantity) {
  // Filter to rentals that include this item (all statuses — date-based only)
  const itemRentals = allRentals.filter(r => {
    return (r.items || []).some(i => i.itemId === itemId);
  });

  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const days = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    date.setHours(0, 0, 0, 0);

    // Calculate booked quantity for this specific date, respecting slot conflicts
    const dayBooked = getBookedQuantityForDate(date, itemRentals, itemId);
    const available = Math.max(0, totalQuantity - dayBooked.total);

    let status = 'green';
    if (available === 0 || dayBooked.total >= totalQuantity) {
      status = 'red';
    } else if (available <= Math.ceil(totalQuantity * 0.5)) {
      status = 'orange';
    }

    days.push({
      date,
      dayNumber: date.getDate(),
      month: months[date.getMonth()],
      booked: dayBooked.total,
      available,
      total: totalQuantity,
      status,
      slotBreakdown: dayBooked.breakdown,
    });
  }

  return days;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  scrollContent: {
    padding: spacing.xl,
    paddingBottom: 100,
  },

  // ─── Back Button ───
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  backArrow: {
    fontSize: 28,
    color: colors.primaryLight,
    marginRight: spacing.xs,
    fontWeight: typography.fontWeight.medium,
  },
  backText: {
    fontSize: typography.fontSize.md,
    color: colors.primaryLight,
    fontWeight: typography.fontWeight.medium,
  },

  // ─── Header ───
  headerSection: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
    position: 'relative',
    overflow: 'hidden',
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.xxl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: borderRadius.xl,
  },
  categoryIconWrap: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  categoryIcon: {
    fontSize: 30,
  },
  equipmentName: {
    fontSize: typography.fontSize.xxxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
    paddingHorizontal: spacing.lg,
  },
  equipmentCategory: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  headerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  headerStat: {
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
  },
  headerStatValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.accent,
  },
  headerStatLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textTertiary,
    marginTop: 2,
  },
  headerStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
  },
  quickBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    marginHorizontal: spacing.lg,
  },
  quickBadgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  quickBadgeText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },

  // ─── Tab Bar ───
  tabBar: {
    width: '90%',
    marginTop: spacing.lg,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.glass,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md - 2,
    position: 'relative',
    overflow: 'hidden',
  },
  tabActive: {
    backgroundColor: colors.primary,
    ...shadows.glow(colors.primary),
  },
  tabGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.primaryLight,
    opacity: 0.15,
  },
  tabText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.textTertiary,
    zIndex: 1,
  },
  tabTextActive: {
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.semibold,
  },
  tabBarLine: {
    height: 1,
    backgroundColor: colors.border,
    marginTop: spacing.md,
  },

  // ─── Tab Content ───
  tabContent: {
    minHeight: 300,
  },

  // ─── Section Titles ───
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  sectionSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.textTertiary,
    marginBottom: spacing.md,
  },

  // ─── Search Panel ───
  searchPanel: {
    marginBottom: spacing.lg,
  },
  searchGrid: {
    gap: spacing.md,
  },
  searchField: {
    marginBottom: spacing.xs,
  },
  fieldLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textTertiary,
    marginBottom: spacing.xs,
    fontWeight: typography.fontWeight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: typography.fontSize.md,
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.medium,
  },
  slotRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  slotChip: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: 'center',
  },
  slotChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryLight,
  },
  slotChipText: {
    fontSize: typography.fontSize.xs,
    color: colors.textTertiary,
    fontWeight: typography.fontWeight.medium,
  },
  slotChipTextActive: {
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.semibold,
  },
  checkButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
    ...shadows.glow(colors.primary),
  },
  checkButtonDisabled: {
    opacity: 0.5,
  },
  checkButtonText: {
    color: '#fff',
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
  },

  // ─── Result Card ───
  resultCard: {
    borderRadius: borderRadius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: spacing.xl,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  resultTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  resultStatusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: borderRadius.round,
  },
  resultStatusText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
  },
  resultBody: {
    padding: spacing.lg,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  resultLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.textTertiary,
  },
  resultValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  resultErrorMessage: {
    fontSize: typography.fontSize.sm,
    color: colors.error,
    fontWeight: typography.fontWeight.medium,
    marginTop: spacing.sm,
  },

  // ─── Timeline ───
  timelineSection: {
    marginTop: spacing.sm,
  },
  timelineScroll: {
    paddingRight: spacing.xl,
  },
  timelineLoading: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  timelineDay: {
    alignItems: 'center',
    marginRight: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    minWidth: 44,
  },
  timelineDayNum: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: spacing.xs,
  },
  timelineDateLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textTertiary,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    marginTop: spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: typography.fontSize.xs,
    color: colors.textTertiary,
  },

  // ─── Rentals Tab ───
  rentalCard: {
    borderRadius: borderRadius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  rentalCardInner: {
    padding: spacing.lg,
  },
  rentalCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  rentalCustomerName: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    flex: 1,
  },
  rentalStatusBadge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: borderRadius.round,
    marginLeft: spacing.sm,
  },
  rentalStatusText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  rentalDetails: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  rentalDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  rentalDetailLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textTertiary,
  },
  rentalDetailValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.textSecondary,
  },
  rentalCountdown: {
    fontSize: typography.fontSize.xs,
    color: colors.primaryLight,
    marginTop: spacing.sm,
    fontWeight: typography.fontWeight.medium,
  },

  // ─── Insights Tab ───
  insightsGrid: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  insightCard: {
    padding: spacing.sm,
  },
  insightLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textTertiary,
    fontWeight: typography.fontWeight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  insightValue: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing.sm,
  },
  insightBarBg: {
    height: 4,
    backgroundColor: colors.glass,
    borderRadius: 2,
    overflow: 'hidden',
  },
  insightBarFill: {
    height: 4,
    borderRadius: 2,
  },
  insightStatsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  insightStatCard: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.lg,
  },
  insightStatValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  insightStatLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textTertiary,
    textAlign: 'center',
    fontWeight: typography.fontWeight.medium,
  },

  // ─── Empty State ───
  emptyTab: {
    alignItems: 'center',
    paddingVertical: spacing.huge,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontSize: typography.fontSize.md,
    color: colors.textTertiary,
    textAlign: 'center',
  },

  // ─── Modal ───
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surfaceElevated,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    padding: spacing.xl,
    paddingBottom: spacing.huge,
    borderWidth: 1,
    borderColor: colors.borderGlow,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.textMuted,
    alignSelf: 'center',
    marginBottom: spacing.xl,
  },
  modalDate: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  modalStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.xl,
  },
  modalStat: {
    alignItems: 'center',
  },
  modalStatValue: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  modalStatLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  modalDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: spacing.xl,
  },
  modalSectionTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  slotUsageContainer: {
    gap: spacing.sm,
  },
  slotUsageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  slotUsageLabel: {
    fontSize: typography.fontSize.md,
    color: colors.textTertiary,
  },
  slotUsageValue: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  usageBarBg: {
    height: 6,
    backgroundColor: colors.glass,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: spacing.sm,
  },
  usageBarFill: {
    height: 6,
    borderRadius: 3,
  },
});

export default EquipmentDetailsScreen;
