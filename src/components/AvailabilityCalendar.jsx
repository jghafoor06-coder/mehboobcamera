import React, { useState, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { colors, spacing, typography, borderRadius, shadows } from '../theme';
import { getBookedQuantityForDate } from '../services/availabilityService';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * AvailabilityCalendar
 *
 * A full month grid calendar showing color-coded availability for an equipment item.
 * - Green: >50% available
 * - Orange: ≤50% available
 * - Red: Fully booked
 * - Gray: Past dates
 *
 * Props:
 *   rentals        - Array of rental objects for this item
 *   itemId         - The equipment item ID
 *   totalQuantity  - Total quantity of the item
 */
const AvailabilityCalendar = ({ rentals, itemId, totalQuantity }) => {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDay, setSelectedDay] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Navigate months
  const goToPrevMonth = useCallback(() => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(y => y - 1);
    } else {
      setCurrentMonth(m => m - 1);
    }
  }, [currentMonth]);

  const goToNextMonth = useCallback(() => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(y => y + 1);
    } else {
      setCurrentMonth(m => m + 1);
    }
  }, [currentMonth]);

  // Generate calendar grid for current month
  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    const startingWeekday = firstDay.getDay();

    const days = [];

    // Leading empty cells
    for (let i = 0; i < startingWeekday; i++) {
      days.push({
        empty: true,
        key: `leading-${i}`,
      });
    }

    // Month days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day, 12, 0, 0, 0);

      const compareDate = new Date(currentYear, currentMonth, day);

      compareDate.setHours(0, 0, 0, 0);

      const isPast = compareDate < today;
      const isToday = compareDate.getTime() === today.getTime();

      const booked = getBookedQuantityForDate(compareDate, rentals, itemId);

      const available = Math.max(0, totalQuantity - booked.total);

      let status = 'green';

      if (available === 0) {
        status = 'red';
      } else if (available <= Math.ceil(totalQuantity / 2)) {
        status = 'orange';
      }

      days.push({
        empty: false,
        key: `day-${day}`,
        day,
        date: compareDate,
        isPast,
        isToday,
        booked: booked.total,
        available,
        total: totalQuantity,
        breakdown: booked.breakdown,
        status,
      });
    }

    // Trailing empty cells
    const remainingCells = days.length % 7;

    if (remainingCells !== 0) {
      const trailing = 7 - remainingCells;

      for (let i = 0; i < trailing; i++) {
        days.push({
          empty: true,
          key: `trailing-${i}`,
        });
      }
    }

    return days;
  }, [currentMonth, currentYear, rentals, itemId, totalQuantity, today]);

  const handleDayPress = useCallback(day => {
    if (day.isPast) return;
    setSelectedDay(day);
    setModalVisible(true);
  }, []);

  const getStatusColor = (status, isPast) => {
    if (isPast) return colors.textMuted;
    switch (status) {
      case 'green':
        return colors.success;
      case 'orange':
        return colors.warning;
      case 'red':
        return colors.error;
      default:
        return colors.textMuted;
    }
  };

  const getStatusBg = (status, isPast) => {
    if (isPast) return 'rgba(255,255,255,0.02)';
    switch (status) {
      case 'green':
        return colors.success + '15';
      case 'orange':
        return colors.warning + '15';
      case 'red':
        return colors.error + '15';
      default:
        return 'transparent';
    }
  };

  return (
    <View style={styles.container}>
      {/* Month Header */}
      <View style={styles.monthHeader}>
        <TouchableOpacity
          onPress={goToPrevMonth}
          style={styles.navButton}
          activeOpacity={0.7}
        >
          <Text style={styles.navArrow}>‹</Text>
        </TouchableOpacity>
        <View style={styles.monthTitleWrap}>
          <Text style={styles.monthTitle}>{MONTHS[currentMonth]}</Text>
          <Text style={styles.yearTitle}>{currentYear}</Text>
        </View>
        <TouchableOpacity
          onPress={goToNextMonth}
          style={styles.navButton}
          activeOpacity={0.7}
        >
          <Text style={styles.navArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Weekday Headers */}
      <View style={styles.weekdayRow}>
        {WEEKDAYS.map(day => (
          <View key={day} style={styles.weekdayCell}>
            <Text style={styles.weekdayText}>{day}</Text>
          </View>
        ))}
      </View>

      {/* Calendar Grid */}
      <View style={styles.grid}>
        {calendarDays.map(day => {
          if (day.empty) {
            return <View key={day.key} style={styles.dayCell} />;
          }

          const statusColor = getStatusColor(day.status, day.isPast);
          const statusBg = getStatusBg(day.status, day.isPast);

          return (
            <TouchableOpacity
              key={day.key}
              style={[
                styles.dayCell,
                day.isToday && styles.dayCellToday,
                !day.isPast && { backgroundColor: statusBg },
              ]}
              onPress={() => handleDayPress(day)}
              activeOpacity={day.isPast ? 1 : 0.7}
              disabled={day.isPast}
            >
              <Text
                style={[
                  styles.dayNumber,
                  day.isToday && styles.dayNumberToday,
                  day.isPast && styles.dayNumberPast,
                ]}
              >
                {day.day}
              </Text>
              {!day.isPast && (
                <View
                  style={[styles.statusDot, { backgroundColor: statusColor }]}
                />
              )}
              {day.isToday && <View style={styles.todayIndicator} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Legend */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View
            style={[styles.legendDot, { backgroundColor: colors.success }]}
          />
          <Text style={styles.legendText}>Available</Text>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[styles.legendDot, { backgroundColor: colors.warning }]}
          />
          <Text style={styles.legendText}>Limited</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.error }]} />
          <Text style={styles.legendText}>Full</Text>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[styles.legendDot, { backgroundColor: colors.textMuted }]}
          />
          <Text style={styles.legendText}>Past</Text>
        </View>
      </View>

      {/* Day Detail Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalContent}>
            <View style={styles.modalHandle} />
            {selectedDay && (
              <>
                <Text style={styles.modalDate}>
                  {MONTHS[selectedDay.date.getMonth()]} {selectedDay.day},{' '}
                  {selectedDay.date.getFullYear()}
                </Text>

                {/* Status badge */}
                <View
                  style={[
                    styles.modalStatusBadge,
                    {
                      backgroundColor:
                        getStatusColor(selectedDay.status, false) + '20',
                      borderColor:
                        getStatusColor(selectedDay.status, false) + '40',
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.modalStatusDot,
                      {
                        backgroundColor: getStatusColor(
                          selectedDay.status,
                          false,
                        ),
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.modalStatusText,
                      { color: getStatusColor(selectedDay.status, false) },
                    ]}
                  >
                    {selectedDay.status === 'green'
                      ? 'Available'
                      : selectedDay.status === 'orange'
                      ? 'Limited Availability'
                      : 'Fully Booked'}
                  </Text>
                </View>

                {/* Stats */}
                <View style={styles.modalStats}>
                  <View style={styles.modalStat}>
                    <Text
                      style={[styles.modalStatValue, { color: colors.error }]}
                    >
                      {selectedDay.booked}
                    </Text>
                    <Text style={styles.modalStatLabel}>Booked</Text>
                  </View>
                  <View style={styles.modalStatDivider} />
                  <View style={styles.modalStat}>
                    <Text
                      style={[styles.modalStatValue, { color: colors.success }]}
                    >
                      {selectedDay.available}
                    </Text>
                    <Text style={styles.modalStatLabel}>Available</Text>
                  </View>
                  <View style={styles.modalStatDivider} />
                  <View style={styles.modalStat}>
                    <Text style={styles.modalStatValue}>
                      {selectedDay.total}
                    </Text>
                    <Text style={styles.modalStatLabel}>Total</Text>
                  </View>
                </View>

                {/* Availability bar */}
                <View style={styles.availBarBg}>
                  <View
                    style={[
                      styles.availBarFill,
                      {
                        width: `${
                          selectedDay.total > 0
                            ? (selectedDay.available / selectedDay.total) * 100
                            : 0
                        }%`,
                        backgroundColor: getStatusColor(
                          selectedDay.status,
                          false,
                        ),
                      },
                    ]}
                  />
                </View>

                {/* Slot breakdown */}
                {selectedDay.breakdown && (
                  <View style={styles.breakdownSection}>
                    <Text style={styles.breakdownTitle}>Slot Breakdown</Text>
                    {selectedDay.breakdown.full_day > 0 && (
                      <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>Full Day</Text>
                        <Text style={styles.breakdownValue}>
                          {selectedDay.breakdown.full_day} units
                        </Text>
                      </View>
                    )}
                    {selectedDay.breakdown.day > 0 && (
                      <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>Day</Text>
                        <Text style={styles.breakdownValue}>
                          {selectedDay.breakdown.day} units
                        </Text>
                      </View>
                    )}
                    {selectedDay.breakdown.evening > 0 && (
                      <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>Evening</Text>
                        <Text style={styles.breakdownValue}>
                          {selectedDay.breakdown.evening} units
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },

  // ─── Month Header ───
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navArrow: {
    fontSize: 24,
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.bold,
  },
  monthTitleWrap: {
    alignItems: 'center',
  },
  monthTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  yearTitle: {
    fontSize: typography.fontSize.sm,
    color: colors.textTertiary,
    marginTop: 2,
  },

  // ─── Weekday Headers ───
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  weekdayText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // ─── Calendar Grid ───
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.2857%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.sm,
    position: 'relative',
  },
  dayCellToday: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    ...shadows.glow(colors.primary),
  },
  dayNumber: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.textPrimary,
  },
  dayNumberToday: {
    fontWeight: typography.fontWeight.bold,
    color: colors.primaryLight,
  },
  dayNumberPast: {
    color: colors.textMuted,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 2,
  },
  todayIndicator: {
    position: 'absolute',
    bottom: 3,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },

  // ─── Legend ───
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
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
    marginBottom: spacing.lg,
  },
  modalStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  modalStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  modalStatusText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  modalStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: spacing.lg,
    backgroundColor: colors.glass,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  modalStat: {
    alignItems: 'center',
    flex: 1,
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
  modalStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
  },
  availBarBg: {
    height: 6,
    backgroundColor: colors.glass,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: spacing.xl,
  },
  availBarFill: {
    height: 6,
    borderRadius: 3,
  },
  breakdownSection: {
    gap: spacing.sm,
  },
  breakdownTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.glass,
    borderRadius: borderRadius.sm,
  },
  breakdownLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.textTertiary,
  },
  breakdownValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
});

export default React.memo(AvailabilityCalendar);
