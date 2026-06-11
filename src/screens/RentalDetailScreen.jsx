import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { colors, spacing, typography, borderRadius } from '../theme';
import { formatCurrency, formatDate } from '../utils/formatters';
import { RENTAL_SLOTS, getRentalLifecycleStatus } from '../utils/availabilityService';
import { RENTAL_STATUS_COLORS, PAYMENT_STATUS_COLORS } from '../constants';
import {
  updateRentalStatus,
  deleteRental,
  collectPayment,
} from '../firebase/rentalsService';
import GlassmorphismPanel from '../components/GlassmorphismPanel';
import GlowBackground from '../components/GlowBackground';
import {
  InvoiceHeader,
  ItemBreakdown,
  PaymentSummary,
  ReturnRentalModal,
  CollectPaymentModal,
  ConfirmReturnModal,
  ConfirmCollectModal,
} from '../components/rentals';

const RentalDetailScreen = ({ route, navigation }) => {
  const { rental } = route.params || {};
  const [returnModalVisible, setReturnModalVisible] = useState(false);
  const [amountPaid, setAmountPaid] = useState('');
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [collectModalVisible, setCollectModalVisible] = useState(false);
  const [collectAmount, setCollectAmount] = useState('');
  const [collectConfirmVisible, setCollectConfirmVisible] = useState(false);
  const [collectSubmitting, setCollectSubmitting] = useState(false);

  if (!rental) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Rental not found</Text>
      </View>
    );
  }

  const lifecycleStatus = getRentalLifecycleStatus(rental.startDate, rental.endDate, rental.status);
  const status = RENTAL_STATUS_COLORS[lifecycleStatus] || RENTAL_STATUS_COLORS.ongoing;
  const totalDays =
    rental.totalDays ||
    rental.items.reduce((sum, item) => sum + (item.days || 1), 0);
  const totalUnits = rental.items.reduce(
    (sum, item) => sum + (item.quantity || 1),
    0,
  );
  const isActive = rental.status === 'active';
  const isCompleted = lifecycleStatus === 'completed';
  const hasRemainingBalance = isCompleted && (rental.remainingBalance || 0) > 0;
  const totalAmount = rental.totalAmount;
  const paidNum = parseInt(amountPaid, 10) || 0;
  const remaining = Math.max(0, totalAmount - paidNum);
  const exceedsTotal = paidNum > totalAmount;
  // Collect payment calculations
  const collectPaidNum = parseInt(collectAmount, 10) || 0;
  const collectRemainingBalance = rental.remainingBalance || 0;
  const newRemaining = Math.max(0, collectRemainingBalance - collectPaidNum);
  const exceedsRemaining = collectPaidNum > collectRemainingBalance;

  const getPaymentStatus = (paid, remainingBal) => {
    if (remainingBal === 0) return 'paid';
    if (paid > 0 && remainingBal > 0) return 'partial';
    return 'unpaid';
  };

  const openReturnModal = () => {
    setAmountPaid('');
    setReturnModalVisible(true);
  };

  const openCollectModal = () => {
    setCollectAmount('');
    setCollectModalVisible(true);
  };

  const handleProceedToConfirm = () => {
    if (exceedsTotal) {
      Alert.alert('Invalid Amount', 'Amount cannot exceed total rental amount.');
      return;
    }
    setReturnModalVisible(false);
    setConfirmModalVisible(true);
  };

  const handleCollectProceed = () => {
    if (collectAmount === '' || collectPaidNum <= 0) {
      Alert.alert('Invalid Amount', 'Please enter the payment amount.');
      return;
    }
    if (exceedsRemaining) {
      Alert.alert('Invalid Amount', 'Amount cannot exceed remaining balance.');
      return;
    }
    setCollectModalVisible(false);
    setCollectConfirmVisible(true);
  };

  const handleConfirmReturn = useCallback(async () => {
    setSubmitting(true);
    try {
      const paymentStatus = getPaymentStatus(paidNum, remaining);
      await updateRentalStatus(rental.customerId, rental.id, 'returned', {
        amountPaid: paidNum,
        remainingBalance: remaining,
        paymentStatus,
      });
      setConfirmModalVisible(false);
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to update rental status.');
      setSubmitting(false);
    }
  }, [paidNum, remaining, rental, navigation]);

  const handleConfirmCollect = useCallback(async () => {
    setCollectSubmitting(true);
    try {
      await collectPayment(rental.customerId, rental.id, collectPaidNum);
      setCollectConfirmVisible(false);
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to process payment.');
      setCollectSubmitting(false);
    }
  }, [collectPaidNum, rental, navigation]);

  return (
    <View style={styles.container}>
      <GlowBackground
        blobs={[
          {
            corner: 'topRight',
            color: colors.accent,
            size: 200,
            opacity: 0.03,
          },
          {
            corner: 'bottomLeft',
            color: colors.primary,
            size: 160,
            opacity: 0.035,
          },
        ]}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <InvoiceHeader rentalId={rental.id} status={status} lifecycleStatus={lifecycleStatus} />
        <GlassmorphismPanel style={styles.section}>
          <Text style={styles.sectionLabel}>CUSTOMER INFORMATION</Text>
          <Text style={styles.customerNameLarge}>{rental.customerName}</Text>
          <Text style={styles.rentalDates}>
            {formatDate(rental.startDate)} {formatDate(rental.endDate)}
          </Text>
        </GlassmorphismPanel>
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
            <Text style={styles.infoValue}>{totalDays}d</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Equipment</Text>
            <Text style={styles.infoValue}>{totalUnits} units</Text>
          </View>
        </GlassmorphismPanel>
        <ItemBreakdown items={rental.items} totalDays={totalDays} totalAmount={totalAmount} />
        {isCompleted && rental.amountPaid != null && (
          <PaymentSummary
            totalAmount={totalAmount}
            amountPaid={rental.amountPaid}
            remainingBalance={rental.remainingBalance}
            paymentStatus={rental.paymentStatus}
          />
        )}
        <View style={styles.actionsSection}>
          {isActive && (
            <TouchableOpacity
              style={styles.returnedButton}
              onPress={openReturnModal}
              activeOpacity={0.7}
            >
              <Text style={styles.returnedButtonText}>Mark As Returned</Text>
            </TouchableOpacity>
          )}
          {hasRemainingBalance && (
            <TouchableOpacity
              style={styles.collectButton}
              onPress={openCollectModal}
              activeOpacity={0.7}
            >
              <Text style={styles.collectButtonText}>Collect Payment</Text>
            </TouchableOpacity>
          )}
          {!isActive && (
            <TouchableOpacity
              style={styles.backButtonNav}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Text style={styles.backButtonText}>Go Back</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => {
              Alert.alert('Delete Rental', 'Are you sure?', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await deleteRental(rental.customerId, rental.id);
                      navigation.goBack();
                    } catch (e) {
                      Alert.alert('Error', 'Failed to delete rental.');
                    }
                  },
                },
              ]);
            }}
            activeOpacity={0.7}
          >
            {' '}
            <Text style={styles.deleteButtonText}>Delete Rental</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.bottomSpacer} />
      </ScrollView>
      <ReturnRentalModal
        visible={returnModalVisible}
        totalAmount={totalAmount}
        amountPaid={amountPaid}
        setAmountPaid={setAmountPaid}
        remaining={remaining}
        exceedsTotal={exceedsTotal}
        onProceed={handleProceedToConfirm}
        onCancel={() => setReturnModalVisible(false)}
      />
      <CollectPaymentModal
        visible={collectModalVisible}
        remainingBalance={collectRemainingBalance}
        amount={collectAmount}
        setAmount={setCollectAmount}
        exceedsRemaining={exceedsRemaining}
        newRemaining={newRemaining}
        onProceed={handleCollectProceed}
        onCancel={() => setCollectModalVisible(false)}
      />

      <ConfirmCollectModal
        visible={collectConfirmVisible}
        previousPaid={rental.amountPaid || 0}
        collectPaidNum={collectPaidNum}
        newRemaining={newRemaining}
        submitting={collectSubmitting}
        onConfirm={handleConfirmCollect}
        onBack={() => { setCollectConfirmVisible(false); setCollectModalVisible(true); }}
        onCancel={() => setCollectConfirmVisible(false)}
      />

      <ConfirmReturnModal
        visible={confirmModalVisible}
        totalAmount={totalAmount}
        paidNum={paidNum}
        remaining={remaining}
        submitting={submitting}
        onConfirm={handleConfirmReturn}
        onBack={() => { setConfirmModalVisible(false); setReturnModalVisible(true); }}
        onCancel={() => setConfirmModalVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 15,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.xl,
    paddingBottom: spacing.huge,
  },
  errorText: {
    fontSize: typography.fontSize.lg,
    color: colors.errorLight,
    textAlign: 'center',
    marginTop: spacing.xxxl,
  },

  section: {
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.extrabold,
    color: colors.textTertiary,
    letterSpacing: 1.5,
    marginBottom: spacing.md,
  },
  customerNameLarge: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  rentalDates: {
    fontSize: typography.fontSize.sm,
    color: colors.textTertiary,
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
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },

  actionsSection: {
    marginTop: spacing.xxl,
    gap: spacing.md,
  },
  returnedButton: {
    backgroundColor: colors.success + '20',
    borderWidth: 1,
    borderColor: colors.success + '40',
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  returnedButtonText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.success,
  },
  collectButton: {
    backgroundColor: colors.primary + '20',
    borderWidth: 1,
    borderColor: colors.primary + '40',
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  collectButtonText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.primaryLight,
  },
  backButtonNav: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textSecondary,
  },
  deleteButton: {
    backgroundColor: colors.error + '15',
    borderWidth: 1,
    borderColor: colors.error + '30',
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.errorLight,
  },
  bottomSpacer: {
    height: 40,
  },

});

export default RentalDetailScreen;
