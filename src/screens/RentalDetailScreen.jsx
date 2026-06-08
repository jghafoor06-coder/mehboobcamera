import React, { useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Animated,
  Alert,
} from 'react-native';
import { colors, spacing, typography, borderRadius } from '../theme';
import { formatCurrency, formatDate } from '../utils/formatters';
import { RENTAL_SLOTS } from '../utils/availabilityService';
import { updateRentalStatus, deleteRental } from '../firebase/rentalsService';
import GlassmorphismPanel from '../components/GlassmorphismPanel';
import GlowBackground from '../components/GlowBackground';

const statusColors = {
  active: { bg: '#10B98120', text: '#10B981', dot: '#10B981' },
  returned: { bg: '#6B728020', text: '#9CA3AF', dot: '#6B7280' },
  overdue: { bg: '#EF444420', text: '#EF4444', dot: '#EF4444' },
};

const RentalDetailScreen = ({ route, navigation }) => {
  const { rental } = route.params || {};
  const headerFade = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(20)).current;

  useEffect(() => {
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
    ]).start();
  }, []);

  if (!rental) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Rental not found</Text>
      </View>
    );
  }

  const status = statusColors[rental.status] || statusColors.active;
  const totalDays = rental.totalDays || rental.items.reduce((sum, item) => sum + (item.days || 1), 0);
  const totalUnits = rental.items.reduce((sum, item) => sum + (item.quantity || 1), 0);
  const isActive = rental.status === 'active';

  const handleMarkReturned = async () => {
    try {
      await updateRentalStatus(rental.customerId, rental.id, 'returned');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to update rental status.');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Rental',
      'Are you sure you want to delete this rental record?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteRental(rental.customerId, rental.id);
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete rental.');
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <GlowBackground
        blobs={[
          { corner: 'topRight', color: colors.accent, size: 200, opacity: 0.03 },
          { corner: 'bottomLeft', color: colors.primary, size: 160, opacity: 0.035 },
        ]}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Invoice Header */}
        <Animated.View
          style={[styles.invoiceHeader, { opacity: headerFade, transform: [{ translateY: headerSlide }] }]}
        >
          <View style={styles.invoiceTitleRow}>
            <View>
              <Text style={styles.invoiceLabel}>RENTAL INVOICE</Text>
              <Text style={styles.invoiceId}>#{rental.id.toString().padStart(4, '0')}</Text>
            </View>
            <View style={[styles.statusBadgeLarge, { backgroundColor: status.bg }]}
            >
              <View style={[styles.statusDotLarge, { backgroundColor: status.dot }]} />
              <Text style={[styles.statusTextLarge, { color: status.text }]}>
                {rental.status.toUpperCase()}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Customer Info */}
        <GlassmorphismPanel style={styles.section}>
          <Text style={styles.sectionLabel}>CUSTOMER INFORMATION</Text>
          <Text style={styles.customerNameLarge}>{rental.customerName}</Text>
          <Text style={styles.rentalDates}>
            {formatDate(rental.startDate)} → {formatDate(rental.endDate)}
          </Text>
        </GlassmorphismPanel>

        {/* Rental Info */}
        <GlassmorphismPanel style={styles.section}>
          <Text style={styles.sectionLabel}>RENTAL DETAILS</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Start Date</Text>
            <Text style={styles.infoValue}>{formatDate(rental.startDate)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>End Date</Text>
            <Text style={styles.infoValue}>{formatDate(rental.endDate)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Rental Slot</Text>
            <Text style={styles.infoValue}>
              {RENTAL_SLOTS[rental.rentalSlot]?.label || 'Full Day'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Duration</Text>
            <Text style={styles.infoValue}>{totalDays} day{totalDays > 1 ? 's' : ''}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Equipment</Text>
            <Text style={styles.infoValue}>{totalUnits} unit{totalUnits > 1 ? 's' : ''} ({rental.items.length} type{rental.items.length > 1 ? 's' : ''})</Text>
          </View>
        </GlassmorphismPanel>

        {/* Item Breakdown */}
        <GlassmorphismPanel style={styles.section}>
          <Text style={styles.sectionLabel}>ITEM BREAKDOWN</Text>
          {rental.items.map((item, i) => (
            <View key={i} style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.itemName}</Text>
                <Text style={styles.itemDetails}>
                  Qty: {item.quantity || 1} · {formatCurrency(item.pricePerDay)}/day × {totalDays}d
                </Text>
              </View>
              <Text style={styles.itemTotal}>{formatCurrency(item.total || item.pricePerDay * totalDays * (item.quantity || 1))}</Text>
            </View>
          ))}

          <View style={styles.totalContainer}>
            <View style={styles.totalDivider} />
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>TOTAL AMOUNT</Text>
              <Text style={styles.totalValue}>{formatCurrency(rental.totalAmount)}</Text>
            </View>
          </View>
        </GlassmorphismPanel>

        {/* Actions */}
        <View style={styles.actionsSection}>
          {isActive && (
            <TouchableOpacity
              style={styles.returnedButton}
              onPress={handleMarkReturned}
              activeOpacity={0.7}
            >
              <Text style={styles.returnedButtonText}>✅ Mark as Returned</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDelete}
            activeOpacity={0.7}
          >
            <Text style={styles.deleteButtonText}>🗑️ Delete Rental</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 15,
    position: 'relative',
    overflow: 'hidden',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.xl,
    paddingTop: spacing.lg,
  },
  errorText: {
    fontSize: typography.fontSize.lg,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: 100,
  },
  invoiceHeader: {
    marginBottom: spacing.xxl,
  },
  invoiceTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  invoiceLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.textTertiary,
    letterSpacing: 2,
    marginBottom: 4,
  },
  invoiceId: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  statusBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.round,
    gap: spacing.xs,
  },
  statusDotLarge: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusTextLarge: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.extrabold,
    letterSpacing: 1,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textTertiary,
    letterSpacing: 1.5,
    marginBottom: spacing.md,
  },
  customerNameLarge: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  rentalDates: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: {
    fontSize: typography.fontSize.md,
    color: colors.textTertiary,
  },
  infoValue: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.textPrimary,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  itemDetails: {
    fontSize: typography.fontSize.sm,
    color: colors.textTertiary,
  },
  itemTotal: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.accent,
  },
  totalContainer: {
    backgroundColor: '#000000',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginTop: spacing.md,
  },
  totalDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginBottom: spacing.sm,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1,
  },
  totalValue: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.accent,
  },
  actionsSection: {
    gap: spacing.md,
    marginTop: spacing.xxl,
  },
  returnedButton: {
    backgroundColor: '#10B98115',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#10B98140',
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  returnedButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: '#34D399',
  },
  deleteButton: {
    backgroundColor: colors.error + '15',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.error + '40',
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.errorLight,
  },
  bottomSpacer: {
    height: 40,
  },
});

export default RentalDetailScreen;