import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors, spacing, typography, borderRadius, shadows } from '../theme';
import {
  formatCurrency,
  formatCompactDate,
  daysBetween,
} from '../utils/formatters';
import { RENTAL_SLOTS, checkAvailability, getRentalsForItem } from '../utils/availabilityService';
import { getItems } from '../firebase/itemsService';
import { createRental } from '../firebase/rentalsService';
import GlassmorphismPanel from '../components/GlassmorphismPanel';
import ItemCard from '../components/ItemCard';
import GlowBackground from '../components/GlowBackground';

const QuantitySelector = ({ qty, onDecrease, onIncrease }) => (
  <View style={styles.qtyRow}>
    <TouchableOpacity
      style={styles.qtyBtn}
      onPress={onDecrease}
      activeOpacity={0.7}
    >
      <Text style={styles.qtyBtnText}>−</Text>
    </TouchableOpacity>
    <Text style={styles.qtyValue}>{qty}</Text>
    <TouchableOpacity
      style={styles.qtyBtn}
      onPress={onIncrease}
      activeOpacity={0.7}
    >
      <Text style={styles.qtyBtnText}>+</Text>
    </TouchableOpacity>
  </View>
);

const RentalItemCard = ({ item, qty, totalDays, onDecrease, onIncrease, maxQty }) => {
  const itemTotal = item.pricePerDay * totalDays * qty;
  const atMax = qty >= maxQty;
  return (
    <View style={styles.equipmentCard}>
      <Text style={styles.equipmentName} numberOfLines={2}>
        {item.name}
      </Text>
      <Text style={styles.equipmentPrice}>
        {formatCurrency(item.pricePerDay)}/day
      </Text>
      <View style={styles.equipmentQtyRow}>
        <QuantitySelector qty={qty} onDecrease={onDecrease} onIncrease={onIncrease} />
        <Text style={[styles.stockInfo, !atMax && styles.stockInfoOk]}>
          {qty}/{maxQty} selected
        </Text>
      </View>
      <View style={styles.equipmentTotalBlock}>
        <Text style={styles.equipmentTotalLabel}>Item Total</Text>
        <Text style={styles.equipmentTotalValue}>
          {formatCurrency(itemTotal)}
        </Text>
      </View>
    </View>
  );
};

const AddRentalScreen = ({ route, navigation }) => {
  const { customerId, customerName } = route.params || {};
  const [selectedItems, setSelectedItems] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rentalSlot, setRentalSlot] = useState('full_day');
  const [availabilityMap, setAvailabilityMap] = useState({});
  const [prefetchedRentals, setPrefetchedRentals] = useState({});
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const availabilityCheckRef = useRef(null);

  const today = new Date();
  const defaultEnd = new Date(today);
  defaultEnd.setDate(defaultEnd.getDate() + 3);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  useEffect(() => {
    const loadItems = async () => {
      try {
        const items = await getItems();
        setInventoryItems(items);
      } catch (error) {
        console.error('Error loading items:', error);
        Alert.alert('Error', 'Failed to load inventory items.');
      } finally {
        setLoading(false);
      }
    };
    loadItems();
  }, []);

  const totalDays = daysBetween(startDate, endDate);

  // Prefetch rentals for a selected item to enable fast availability checks
  const prefetchItemRentals = useCallback(async (itemId) => {
    if (prefetchedRentals[itemId]) return;
    try {
      const rentals = await getRentalsForItem(itemId);
      setPrefetchedRentals(prev => ({ ...prev, [itemId]: rentals }));
    } catch (error) {
      console.error('Error prefetching rentals:', error);
    }
  }, [prefetchedRentals]);

  // Check availability for all selected items (parallelized)
  const checkAllAvailability = useCallback(async () => {
    if (selectedItems.length === 0) return;
    setCheckingAvailability(true);
    try {
      const results = await Promise.all(
        selectedItems.map((item) => {
          const itemRentals = prefetchedRentals[item.id];
          return checkAvailability(
            item.id,
            startDate,
            endDate,
            rentalSlot,
            quantities[item.id] || 1,
            itemRentals || null,
          );
        }),
      );
      const newMap = {};
      selectedItems.forEach((item, i) => {
        newMap[item.id] = results[i];
      });
      setAvailabilityMap(newMap);
    } catch (error) {
      console.error('Error checking availability:', error);
    }
    setCheckingAvailability(false);
  }, [selectedItems, startDate, endDate, rentalSlot, quantities, prefetchedRentals]);

  // Debounced availability check: only re-check after a 300ms pause to avoid rapid re-fetches
  useEffect(() => {
    if (availabilityCheckRef.current) {
      clearTimeout(availabilityCheckRef.current);
    }
    availabilityCheckRef.current = setTimeout(() => {
      checkAllAvailability();
    }, 300);
    return () => {
      if (availabilityCheckRef.current) {
        clearTimeout(availabilityCheckRef.current);
      }
    };
  }, [startDate, endDate, rentalSlot, selectedItems.length, quantities]);

  const toggleItem = item => {
    setSelectedItems(prev => {
      const exists = prev.find(i => i.id === item.id);
      if (exists) {
        const newMap = { ...availabilityMap };
        delete newMap[item.id];
        setAvailabilityMap(newMap);
        return prev.filter(i => i.id !== item.id);
      }
      const stock = item.quantity ?? 1;
      if (stock <= 0) {
        Alert.alert('Out of Stock', `"${item.name}" is currently unavailable.`);
        return prev;
      }
      // Prefetch rentals for this item
      prefetchItemRentals(item.id);
      return [...prev, item];
    });
  };

  const updateQuantity = (itemId, delta) => {
    const item = selectedItems.find(i => i.id === itemId);
    const availInfo = availabilityMap[itemId];
    const maxAvailable = availInfo ? availInfo.availableQuantity : (item ? (item.quantity || 1) : 1);
    setQuantities(prev => {
      const current = prev[itemId] || 1;
      const next = Math.max(1, current + delta);
      if (next > maxAvailable) {
        Alert.alert('Insufficient Stock', `Only ${maxAvailable} unit${maxAvailable > 1 ? 's' : ''} available for selected dates and slot.`);
        return prev;
      }
      return { ...prev, [itemId]: next };
    });
  };

  // Check if any selected item has insufficient availability
  const hasAvailabilityIssues = selectedItems.some(item => {
    const avail = availabilityMap[item.id];
    return avail && !avail.available;
  });

  const totalAmount = selectedItems.reduce((sum, item) => {
    const qty = quantities[item.id] || 1;
    return sum + item.pricePerDay * totalDays * qty;
  }, 0);

  const handleStartDateChange = (event, selectedDate) => {
    if (event.type === 'dismissed') {
      setShowStartPicker(false);
      return;
    }
    const currentDate = selectedDate || startDate;
    setShowStartPicker(Platform.OS === 'ios');
    setStartDate(currentDate);
    if (currentDate > endDate) {
      const newEnd = new Date(currentDate);
      newEnd.setDate(newEnd.getDate() + 1);
      setEndDate(newEnd);
    }
  };

  const handleEndDateChange = (event, selectedDate) => {
    if (event.type === 'dismissed') {
      setShowEndPicker(false);
      return;
    }
    const currentDate = selectedDate || endDate;
    setShowEndPicker(Platform.OS === 'ios');
    if (currentDate > startDate) {
      Alert.alert('Invalid Date', 'End date must be on or after start date.');
      return;
    }
    setEndDate(currentDate);
  };

  const handleSave = async () => {
    if (selectedItems.length === 0 || !customerId) return;
    if (hasAvailabilityIssues) {
      Alert.alert(
        'Availability Issue',
        'Not enough equipment available for selected dates and slot. Please adjust the date, slot, or quantity.',
      );
      return;
    }
    for (const item of selectedItems) {
      const qty = quantities[item.id] || 1;
      const avail = availabilityMap[item.id];
      if (avail && !avail.available) {
        Alert.alert('Stock Exceeded', `"${item.name}" — ${avail.message}`);
        return;
      }
    }
    setSaving(true);
    try {
      const rentalItems = selectedItems.map(item => ({
        itemId: item.id,
        itemName: item.name,
        category: item.category,
        quantity: quantities[item.id] || 1,
        pricePerDay: item.pricePerDay,
        total: item.pricePerDay * totalDays * (quantities[item.id] || 1),
      }));

      await createRental(customerId, {
        items: rentalItems,
        totalAmount,
        totalDays,
        rentalSlot,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      });
      navigation.goBack();
    } catch (error) {
      console.error('Error saving rental:', error);
      Alert.alert('Error', 'Failed to save rental. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <GlowBackground
        blobs={[
          { corner: 'topLeft', color: colors.primary, size: 220, opacity: 0.04 },
          { corner: 'bottomRight', color: colors.accent, size: 180, opacity: 0.025 },
        ]}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={styles.title}>New Rental</Text>
        <Text style={styles.subtitle}>
          Select equipment and rental period
        </Text>

        {/* Customer Summary */}
        {customerName && (
          <GlassmorphismPanel style={styles.customerCard}>
            <View style={styles.customerRow}>
              <View style={styles.customerAvatar}>
                <Text style={styles.customerAvatarText}>
                  {customerName
                    .split(' ')
                    .map(n => n[0])
                    .join('')}
                </Text>
              </View>
              <View style={styles.customerInfo}>
                <Text style={styles.customerName}>{customerName}</Text>
              </View>
            </View>
          </GlassmorphismPanel>
        )}

        {/* Rental Period */}
        <GlassmorphismPanel style={styles.dateSection}>
          <Text style={styles.sectionLabel}>RENTAL PERIOD</Text>
          <View style={styles.dateRow}>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowStartPicker(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.dateLabel}>From</Text>
              <Text style={styles.dateValue}>
                {formatCompactDate(startDate)}
              </Text>
            </TouchableOpacity>
            <Text style={styles.dateArrow}>→</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowEndPicker(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.dateLabel}>To</Text>
              <Text style={styles.dateValue}>{formatCompactDate(endDate)}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.daysBadge}>
            <Text style={styles.daysBadgeText}>
              {totalDays} day{totalDays > 1 ? 's' : ''}
            </Text>
          </View>
        </GlassmorphismPanel>

        {showStartPicker && (
          <DateTimePicker
            value={startDate}
            mode="date"
            display="default"
            minimumDate={new Date()}
            onChange={handleStartDateChange}
          />
        )}

        {showEndPicker && (
          <DateTimePicker
            value={endDate}
            mode="date"
            display="default"
            minimumDate={startDate}
            onChange={handleEndDateChange}
          />
        )}

        {/* Rental Slot Selection */}
        <GlassmorphismPanel style={styles.slotSection}>
          <Text style={styles.sectionLabel}>RENTAL SLOT</Text>
          <View style={styles.slotRow}>
            {Object.entries(RENTAL_SLOTS).map(([key, slot]) => {
              const isActive = rentalSlot === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.slotChip, isActive && styles.slotChipActive]}
                  onPress={() => setRentalSlot(key)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.slotChipLabel, isActive && styles.slotChipLabelActive]}>
                    {slot.label}
                  </Text>
                  {slot.time && (
                    <Text style={[styles.slotChipTime, isActive && styles.slotChipTimeActive]}>
                      {slot.time}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </GlassmorphismPanel>

        {/* Equipment Selection */}
        <Text style={styles.sectionTitle}>Select Equipment</Text>
        {loading ? (
          <ActivityIndicator
            size="large"
            color={colors.primary}
            style={{ marginVertical: spacing.xxl }}
          />
        ) : (
          inventoryItems.map((item, index) => {
            const isSelected = selectedItems.some(i => i.id === item.id);
            const avail = availabilityMap[item.id];
            return (
              <View key={item.id}>
                <ItemCard
                  item={item}
                  index={index}
                  selectable
                  selected={isSelected}
                  onPress={() => toggleItem(item)}
                />
                {isSelected && avail && checkingAvailability && (
                  <Text style={styles.availabilityChecking}>Checking...</Text>
                )}
                {isSelected && avail && !checkingAvailability && (
                  <View
                    style={[
                      styles.availabilityBadge,
                      avail.status === 'available' && styles.availAvailable,
                      avail.status === 'low' && styles.availLow,
                      avail.status === 'unavailable' && styles.availUnavailable,
                    ]}
                  >
                    <Text
                      style={[
                        styles.availabilityText,
                        avail.status === 'unavailable' && styles.availabilityTextDanger,
                      ]}
                    >
                      {avail.message}
                    </Text>
                  </View>
                )}
              </View>
            );
          })
        )}

        {/* Rental Summary */}
        {selectedItems.length > 0 && (
          <View style={styles.summaryWrapper}>
            <GlowBackground
              blobs={[
                { corner: 'topLeft', color: colors.premiumGlowPurple, size: 200, opacity: 0.05 },
                { corner: 'bottomRight', color: colors.premiumGlow, size: 160, opacity: 0.035 },
              ]}
            />
            {/* Summary Header */}
            <Text style={styles.summaryTitle}>Rental Summary</Text>
            <Text style={styles.summaryMeta}>
              {totalDays} Day{totalDays > 1 ? 's' : ''} •{' '}
              {selectedItems.length} Item
              {selectedItems.length > 1 ? 's' : ''}
            </Text>

            {/* Rental Period */}
            <View style={styles.summaryPeriodBlock}>
              <Text style={styles.summaryPeriodLabel}>Rental Period</Text>
              <Text style={styles.summaryPeriodDates}>
                {formatCompactDate(startDate)} → {formatCompactDate(endDate)}
              </Text>
            </View>

            <View style={styles.summaryDivider} />

            {/* Selected Equipment */}
            <Text style={styles.summarySectionLabel}>Selected Equipment</Text>
            {selectedItems.map(item => (
              <RentalItemCard
                key={item.id}
                item={item}
                qty={quantities[item.id] || 1}
                totalDays={totalDays}
                onDecrease={() => updateQuantity(item.id, -1)}
                onIncrease={() => updateQuantity(item.id, 1)}
                maxQty={item.quantity || 1}
              />
            ))}

            <View style={styles.summaryDivider} />

            {/* Total Amount */}
            <View style={styles.summaryTotalBlock}>
              <Text style={styles.summaryTotalLabel}>Total Amount</Text>
              <Text style={styles.summaryTotalValue}>
                {formatCurrency(totalAmount)}
              </Text>
            </View>

            {/* Availability Warning */}
            {hasAvailabilityIssues && (
              <View style={styles.availWarning}>
                <Text style={styles.availWarningText}>
                  Not enough equipment available for selected dates and slot.
                </Text>
              </View>
            )}

            {/* Save Button */}
            <TouchableOpacity
              style={[
                styles.summarySaveBtn,
                (saving || hasAvailabilityIssues) && styles.summarySaveBtnDisabled,
              ]}
              onPress={handleSave}
              disabled={saving || hasAvailabilityIssues}
              activeOpacity={0.7}
            >
              <Text style={styles.summarySaveBtnText}>
                {saving ? 'Saving...' : 'Save Rental'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.xl,
    paddingTop: spacing.xxxl,
  },
  title: {
    fontSize: typography.fontSize.xxxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: typography.fontSize.md,
    color: colors.textTertiary,
    marginBottom: spacing.xl,
  },
  customerCard: {
    marginBottom: spacing.xl,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  customerAvatarText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.primaryLight,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  dateSection: {
    marginBottom: spacing.xl,
  },
  sectionLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textTertiary,
    letterSpacing: 1.5,
    marginBottom: spacing.md,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  dateButton: {
    flex: 1,
    backgroundColor: colors.glass,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    alignItems: 'center',
  },
  dateLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textTertiary,
    marginBottom: 4,
  },
  dateValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  dateArrow: {
    fontSize: 20,
    color: colors.textTertiary,
    marginHorizontal: spacing.md,
  },
  daysBadge: {
    backgroundColor: colors.primary + '15',
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    alignSelf: 'center',
  },
  daysBadgeText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primaryLight,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    marginTop: spacing.md,
  },

  // ─── Rental Slot ───
  slotSection: {
    marginBottom: spacing.xl,
  },
  slotRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  slotChip: {
    flex: 1,
    backgroundColor: colors.glass,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    alignItems: 'center',
  },
  slotChipActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  slotChipLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  slotChipLabelActive: {
    color: colors.primaryLight,
  },
  slotChipTime: {
    fontSize: typography.fontSize.xs,
    color: colors.textTertiary,
  },
  slotChipTimeActive: {
    color: colors.primaryLight,
  },

  // ─── Availability Badge ───
  availabilityBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginTop: -4,
    marginBottom: spacing.sm,
    borderWidth: 1,
  },
  availAvailable: {
    backgroundColor: '#10B98115',
    borderColor: '#10B98130',
  },
  availLow: {
    backgroundColor: '#F59E0B15',
    borderColor: '#F59E0B30',
  },
  availUnavailable: {
    backgroundColor: '#EF444415',
    borderColor: '#EF444430',
  },
  availabilityText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.success,
    textAlign: 'center',
  },
  availabilityTextDanger: {
    color: colors.errorLight,
  },
  availabilityChecking: {
    fontSize: typography.fontSize.sm,
    color: colors.textTertiary,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
  availWarning: {
    backgroundColor: '#EF444415',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#EF444430',
    padding: spacing.md,
  },
  availWarningText: {
    fontSize: typography.fontSize.sm,
    color: colors.errorLight,
    textAlign: 'center',
    fontWeight: typography.fontWeight.medium,
  },

  // ─── Rental Summary ───
  summaryWrapper: {
    backgroundColor: 'rgba(139,92,246,0.04)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(108,99,255,0.15)',
    padding: spacing.xxl,
    marginTop: spacing.xxl,
    overflow: 'hidden',
    position: 'relative',
  },
  summaryTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  summaryMeta: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  summaryPeriodBlock: {
    backgroundColor: colors.glass,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  summaryPeriodLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textTertiary,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  summaryPeriodDates: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: spacing.lg,
  },
  summarySectionLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textTertiary,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: spacing.md,
  },

  // ─── Equipment Card ───
  equipmentCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: spacing.xl,
    marginBottom: spacing.md,
    minHeight: 110,
  },
  equipmentName: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  equipmentPrice: {
    fontSize: typography.fontSize.sm,
    color: colors.textTertiary,
    marginBottom: spacing.lg,
  },
  equipmentQtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stockInfo: {
    fontSize: typography.fontSize.xs,
    color: colors.errorLight,
  },
  stockInfoOk: {
    color: colors.successLight,
  },
  equipmentTotalBlock: {
    alignItems: 'flex-end',
    marginTop: spacing.md,
  },
  equipmentTotalLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textTertiary,
    marginBottom: 2,
  },
  equipmentTotalValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.accent,
  },

  // ─── Quantity Selector ───
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
  },
  qtyBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  qtyBtnText: {
    fontSize: 20,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  qtyValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    minWidth: 40,
    textAlign: 'center',
  },

  // ─── Total & Save ───
  summaryTotalBlock: {
    backgroundColor: '#000000',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryTotalLabel: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: 'rgba(255,255,255,0.5)',
  },
  summaryTotalValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.accent,
  },
  summarySaveBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
    marginBottom: 4,
    ...shadows.glowLayered(colors.premiumGlow),
  },
  summarySaveBtnDisabled: {
    opacity: 0.5,
  },
  summarySaveBtnText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  bottomSpacer: {
    height: 24,
  },
});

export default AddRentalScreen;