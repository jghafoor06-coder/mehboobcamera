import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Animated,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { colors, spacing, typography, borderRadius, shadows } from '../theme';
import { formatCurrency, formatDate } from '../utils/formatters';
import { RENTAL_SLOTS } from '../utils/availabilityService';
import {
  updateRentalStatus,
  deleteRental,
  collectPayment,
} from '../firebase/rentalsService';
import GlassmorphismPanel from '../components/GlassmorphismPanel';
import GlowBackground from '../components/GlowBackground';

const statusColors = {
  active: { bg: '#10B98120', text: '#10B981', dot: '#10B981' },
  returned: { bg: '#6B728020', text: '#9CA3AF', dot: '#6B7280' },
  overdue: { bg: '#EF444420', text: '#EF4444', dot: '#EF4444' },
};

const paymentStatusColors = {
  paid: { text: '#10B981', bg: '#10B98115' },
  partial: { text: '#F59E0B', bg: '#F59E0B15' },
  unpaid: { text: '#EF4444', bg: '#EF444415' },
};

const RentalDetailScreen = ({ route, navigation }) => {
  const { rental } = route.params || {};
  const headerFade = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(20)).current;
  const [returnModalVisible, setReturnModalVisible] = useState(false);
  const [amountPaid, setAmountPaid] = useState('');
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Collect payment state
  const [collectModalVisible, setCollectModalVisible] = useState(false);
  const [collectAmount, setCollectAmount] = useState('');
  const [collectConfirmVisible, setCollectConfirmVisible] = useState(false);
  const [collectSubmitting, setCollectSubmitting] = useState(false);

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
  const totalDays =
    rental.totalDays ||
    rental.items.reduce((sum, item) => sum + (item.days || 1), 0);
  const totalUnits = rental.items.reduce(
    (sum, item) => sum + (item.quantity || 1),
    0,
  );
  const isActive = rental.status === 'active';
  const isReturned = rental.status === 'returned';
  const hasRemainingBalance = isReturned && (rental.remainingBalance || 0) > 0;
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
      Alert.alert(
        'Invalid Amount',
        'Amount cannot exceed total rental amount.',
      );
      return;
    }
    setReturnModalVisible(false);
    setConfirmModalVisible(true);
  };

  const handleConfirmReturn = async () => {
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

  const handleConfirmCollect = async () => {
    setCollectSubmitting(true);
    try {
      await collectPayment(rental.customerId, rental.id, collectPaidNum);
      setCollectConfirmVisible(false);
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to process payment.');
      setCollectSubmitting(false);
    }
  };

  const paymentStatusStyle =
    isReturned && rental.paymentStatus
      ? paymentStatusColors[rental.paymentStatus] || paymentStatusColors.unpaid
      : null;

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
        <Animated.View
          style={[
            styles.invoiceHeader,
            { opacity: headerFade, transform: [{ translateY: headerSlide }] },
          ]}
        >
          <View style={styles.invoiceTitleRow}>
            <View>
              <Text style={styles.invoiceLabel}>RENTAL INVOICE</Text>
              <Text style={styles.invoiceId}>
                #{rental.id.toString().padStart(4, '0')}
              </Text>
            </View>
            <View
              style={[styles.statusBadgeLarge, { backgroundColor: status.bg }]}
            >
              <View
                style={[styles.statusDotLarge, { backgroundColor: status.dot }]}
              />
              <Text style={[styles.statusTextLarge, { color: status.text }]}>
                {rental.status.toUpperCase()}
              </Text>
            </View>
          </View>
        </Animated.View>
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
        <GlassmorphismPanel style={styles.section}>
          <Text style={styles.sectionLabel}>ITEM BREAKDOWN</Text>
          {rental.items.map((item, i) => (
            <View key={i} style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.itemName}</Text>
                <Text style={styles.itemDetails}>
                  Qty: {item.quantity || 1} * {formatCurrency(item.pricePerDay)}
                  /day
                </Text>
              </View>
              <Text style={styles.itemTotal}>
                {formatCurrency(
                  item.total ||
                    item.pricePerDay * totalDays * (item.quantity || 1),
                )}
              </Text>
            </View>
          ))}
          <View style={styles.totalContainer}>
            <View style={styles.totalDivider} />
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>TOTAL AMOUNT</Text>
              <Text style={styles.totalValue}>
                {formatCurrency(totalAmount)}
              </Text>
            </View>
          </View>
        </GlassmorphismPanel>
        {isReturned && rental.amountPaid != null && (
          <GlassmorphismPanel style={styles.section}>
            <Text style={styles.sectionLabel}>PAYMENT SUMMARY</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Total Amount</Text>
              <Text style={styles.infoValue}>
                {formatCurrency(totalAmount)}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Paid</Text>
              <Text style={[styles.infoValue, { color: colors.success }]}>
                {formatCurrency(rental.amountPaid)}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Remaining</Text>
              <Text
                style={[
                  styles.infoValue,
                  {
                    color:
                      rental.remainingBalance > 0
                        ? colors.warning
                        : colors.success,
                  },
                ]}
              >
                {formatCurrency(rental.remainingBalance || 0)}
              </Text>
            </View>
            {paymentStatusStyle && (
              <View
                style={[
                  styles.paymentStatusChip,
                  { backgroundColor: paymentStatusStyle.bg },
                ]}
              >
                <Text
                  style={[
                    styles.paymentStatusText,
                    { color: paymentStatusStyle.text },
                  ]}
                >
                  {(rental.paymentStatus || '').toUpperCase()}
                </Text>
              </View>
            )}
          </GlassmorphismPanel>
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
      <Modal
        visible={returnModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setReturnModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setReturnModalVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Return Rental</Text>
            <GlassmorphismPanel style={styles.modalTotalCard}>
              <Text style={styles.modalTotalLabel}>Rental Total</Text>
              <Text style={styles.modalTotalValue}>
                {formatCurrency(totalAmount)}
              </Text>
            </GlassmorphismPanel>
            <View style={styles.modalInputSection}>
              <Text style={styles.modalInputLabel}>Customer Paid</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter amount (0 if no payment)"
                placeholderTextColor={colors.textMuted}
                value={amountPaid}
                onChangeText={t => setAmountPaid(t.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                maxLength={10}
                autoFocus
              />
            </View>
            {!exceedsTotal && (
              <View style={styles.liveCalcRow}>
                <Text style={styles.liveCalcLabel}>Remaining Balance</Text>
                <Text
                  style={[
                    styles.liveCalcValue,
                    { color: remaining > 0 ? colors.warning : colors.success },
                  ]}
                >
                  {formatCurrency(remaining)} PKR
                </Text>
              </View>
            )}
            {exceedsTotal && (
              <View style={styles.validationError}>
                <Text style={styles.validationErrorText}>
                  Amount cannot exceed total rental amount.
                </Text>
              </View>
            )}
            <TouchableOpacity
              style={[
                styles.modalProceedBtn,
                exceedsTotal && styles.modalProceedBtnDisabled,
              ]}
              onPress={handleProceedToConfirm}
              disabled={exceedsTotal}
              activeOpacity={0.8}
            >
              <Text style={styles.modalProceedBtnText}>Continue</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => setReturnModalVisible(false)}
            >
              <Text style={styles.modalCancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
      {/* Collect Payment Modal */}
      <Modal
        visible={collectModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCollectModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setCollectModalVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Collect Payment</Text>
            <GlassmorphismPanel style={styles.modalTotalCard}>
              <Text style={styles.modalTotalLabel}>Remaining Balance</Text>
              <Text style={styles.modalTotalValue}>
                {formatCurrency(collectRemainingBalance)}
              </Text>
            </GlassmorphismPanel>
            <View style={styles.modalInputSection}>
              <Text style={styles.modalInputLabel}>Payment Amount</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter amount"
                placeholderTextColor={colors.textMuted}
                value={collectAmount}
                onChangeText={t => setCollectAmount(t.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                maxLength={10}
                autoFocus
              />
            </View>
            {collectAmount.length > 0 &&
              !exceedsRemaining &&
              collectPaidNum > 0 && (
                <View style={styles.liveCalcRow}>
                  <Text style={styles.liveCalcLabel}>New Remaining</Text>
                  <Text
                    style={[
                      styles.liveCalcValue,
                      {
                        color:
                          newRemaining > 0 ? colors.warning : colors.success,
                      },
                    ]}
                  >
                    {formatCurrency(newRemaining)} PKR
                  </Text>
                </View>
              )}
            {exceedsRemaining && (
              <View style={styles.validationError}>
                <Text style={styles.validationErrorText}>
                  Amount cannot exceed remaining balance.
                </Text>
              </View>
            )}
            <TouchableOpacity
              style={[
                styles.modalProceedBtn,
                (exceedsRemaining ||
                  collectAmount === '' ||
                  collectPaidNum <= 0) &&
                  styles.modalProceedBtnDisabled,
              ]}
              onPress={handleCollectProceed}
              disabled={
                exceedsRemaining || collectAmount === '' || collectPaidNum <= 0
              }
              activeOpacity={0.8}
            >
              <Text style={styles.modalProceedBtnText}>Continue</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => setCollectModalVisible(false)}
            >
              <Text style={styles.modalCancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Collect Payment Confirmation */}
      <Modal
        visible={collectConfirmVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCollectConfirmVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setCollectConfirmVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Confirm Payment</Text>
            <GlassmorphismPanel style={styles.confirmSummary}>
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>Previous Paid</Text>
                <Text style={styles.confirmValue}>
                  {formatCurrency(rental.amountPaid || 0)} PKR
                </Text>
              </View>
              <View style={styles.confirmDivider} />
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>New Payment</Text>
                <Text style={[styles.confirmValue, { color: colors.success }]}>
                  {formatCurrency(collectPaidNum)} PKR
                </Text>
              </View>
              <View style={styles.confirmDivider} />
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>Total Paid</Text>
                <Text style={styles.confirmValue}>
                  {formatCurrency((rental.amountPaid || 0) + collectPaidNum)}{' '}
                  PKR
                </Text>
              </View>
              <View style={styles.confirmDivider} />
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>Remaining</Text>
                <Text
                  style={[
                    styles.confirmValue,
                    {
                      color: newRemaining > 0 ? colors.warning : colors.success,
                    },
                  ]}
                >
                  {formatCurrency(newRemaining)} PKR
                </Text>
              </View>
            </GlassmorphismPanel>
            <TouchableOpacity
              style={[
                styles.modalProceedBtn,
                collectSubmitting && styles.modalProceedBtnDisabled,
              ]}
              onPress={handleConfirmCollect}
              disabled={collectSubmitting}
              activeOpacity={0.8}
            >
              <Text style={styles.modalProceedBtnText}>
                {collectSubmitting ? 'Processing...' : 'Confirm Payment'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => {
                setCollectConfirmVisible(false);
                setCollectModalVisible(true);
              }}
              disabled={collectSubmitting}
            >
              <Text style={styles.modalCancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={confirmModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setConfirmModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setConfirmModalVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Confirm Return</Text>
            <GlassmorphismPanel style={styles.confirmSummary}>
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>Rental Total</Text>
                <Text style={styles.confirmValue}>
                  {formatCurrency(totalAmount)} PKR
                </Text>
              </View>
              <View style={styles.confirmDivider} />
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>Customer Paid</Text>
                <Text style={[styles.confirmValue, { color: colors.success }]}>
                  {formatCurrency(paidNum)} PKR
                </Text>
              </View>
              <View style={styles.confirmDivider} />
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>Remaining</Text>
                <Text
                  style={[
                    styles.confirmValue,
                    { color: remaining > 0 ? colors.warning : colors.success },
                  ]}
                >
                  {formatCurrency(remaining)} PKR
                </Text>
              </View>
            </GlassmorphismPanel>
            <TouchableOpacity
              style={[
                styles.modalProceedBtn,
                submitting && styles.modalProceedBtnDisabled,
              ]}
              onPress={handleConfirmReturn}
              disabled={submitting}
              activeOpacity={0.8}
            >
              <Text style={styles.modalProceedBtnText}>
                {submitting ? 'Processing...' : 'Confirm Return'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => {
                setConfirmModalVisible(false);
                setReturnModalVisible(true);
              }}
              disabled={submitting}
            >
              <Text style={styles.modalCancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
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
  invoiceHeader: {
    marginBottom: spacing.xl,
  },
  invoiceTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  invoiceLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.extrabold,
    color: colors.textTertiary,
    letterSpacing: 2,
    marginBottom: spacing.xs,
  },
  invoiceId: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  statusBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.round,
    marginBottom: 4,
  },
  statusDotLarge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  statusTextLarge: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: 1,
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
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  itemName: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.textPrimary,
  },
  itemDetails: {
    fontSize: typography.fontSize.sm,
    color: colors.textTertiary,
    marginTop: 2,
  },
  itemTotal: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.accent,
  },
  totalContainer: {
    marginTop: spacing.sm,
  },
  totalDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginBottom: spacing.md,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.textSecondary,
  },
  totalValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.accent,
  },
  paymentStatusChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.round,
    marginTop: spacing.md,
  },
  paymentStatusText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: 1,
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
  // ─── Modal Styles ───
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    padding: spacing.xxl,
    paddingBottom: spacing.huge,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.textMuted,
    alignSelf: 'center',
    marginBottom: spacing.xxl,
  },
  modalTitle: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xxl,
    textAlign: 'center',
  },
  modalTotalCard: {
    marginBottom: spacing.xxl,
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  modalTotalLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.textTertiary,
    marginBottom: spacing.sm,
    letterSpacing: 1,
  },
  modalTotalValue: {
    fontSize: typography.fontSize.huge,
    fontWeight: typography.fontWeight.bold,
    color: colors.accent,
  },
  modalInputSection: {
    marginBottom: spacing.lg,
  },
  modalInputLabel: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  modalInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  liveCalcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.xxl,
  },
  liveCalcLabel: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
  },
  liveCalcValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
  },
  validationError: {
    backgroundColor: colors.error + '15',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.error + '30',
  },
  validationErrorText: {
    fontSize: typography.fontSize.sm,
    color: colors.errorLight,
    textAlign: 'center',
  },
  modalProceedBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalProceedBtnDisabled: {
    opacity: 0.4,
  },
  modalProceedBtnText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  modalCancelBtn: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  modalCancelBtnText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.textTertiary,
  },
  confirmSummary: {
    padding: spacing.xxl,
    marginBottom: spacing.xxl,
  },
  confirmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  confirmLabel: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
  },
  confirmValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  confirmDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
});

export default RentalDetailScreen;
