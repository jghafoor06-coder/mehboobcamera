import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { colors, spacing, typography, borderRadius } from '../theme';
import { formatCurrency, formatDate, getInitials, tierColors } from '../utils/formatters';
import { getRentalLifecycleStatus } from '../utils/availabilityService';
import { getCustomerById, deleteCustomer } from '../firebase/customersService';
import { subscribeToRentals } from '../firebase/rentalsService';
import GlassmorphismPanel from '../components/GlassmorphismPanel';
import PrimaryButton from '../components/PrimaryButton';
import RentalCard from '../components/RentalCard';
import EmptyState from '../components/EmptyState';
import FloatingActionButton from '../components/FloatingActionButton';

const CustomerProfileScreen = ({ route, navigation }) => {
  const { customerId } = route.params || {};
  const [customer, setCustomer] = useState(null);
  const [customerRentals, setCustomerRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const headerFade = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (!customerId) return;

    // Load customer document (one-shot, doesn't change often)
    const loadCustomer = async () => {
      try {
        const customerData = await getCustomerById(customerId);
        setCustomer(customerData);
      } catch (error) {
        console.error('Error loading customer:', error);
      } finally {
        setLoading(false);
      }
    };
    loadCustomer();

    // Subscribe to real-time rental updates
    const unsubscribeRentals = subscribeToRentals(customerId, (data) => {
      setCustomerRentals(data);
    });

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

    return () => unsubscribeRentals();
  }, [customerId]);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!customer) {
    return (
      <View style={styles.container}>
        <EmptyState icon="👤" title="Customer not found" subtitle="Go back and try again" />
      </View>
    );
  }

  const tierColor = tierColors[customer.tier] || colors.primary;
  const activeRentalsCount = customerRentals.filter(r => {
    const status = getRentalLifecycleStatus(r.startDate, r.endDate, r.status);
    return status === 'ongoing';
  }).length;
  const totalSpent = customerRentals.reduce((sum, r) => sum + r.totalAmount, 0);
  const outstandingBalance = customerRentals.reduce((sum, r) => sum + (r.remainingBalance || 0), 0);

  const stats = [
    { label: 'Total Rentals', value: customerRentals.length.toString() },
    { label: 'Active', value: activeRentalsCount.toString() },
    { label: 'Total Spent', value: formatCurrency(totalSpent) },
  ];

  // Add outstanding balance card if there's any
  if (outstandingBalance > 0) {
    stats.push({ label: 'Remaining', value: formatCurrency(outstandingBalance), danger: true });
  }

  const handleEdit = () => {
    navigation.navigate('AddCustomer', { customer });
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Customer',
      `Are you sure you want to delete ${customer.name}? This will also remove all their rental history.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCustomer(customerId);
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete customer.');
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <Animated.View
          style={[styles.headerSection, { opacity: headerFade, transform: [{ translateY: headerSlide }] }]}
        >
          <View style={[styles.avatarLarge, { backgroundColor: tierColor + '25', borderColor: tierColor + '40' }]}>
            <Text style={[styles.avatarTextLarge, { color: tierColor }]}>
              {getInitials(customer.name)}
            </Text>
          </View>
          <Text style={styles.customerName}>{customer.name}</Text>
          <Text style={styles.phoneLarge}>{customer.phone}</Text>
          <Text style={styles.cnicText}>CNIC: {customer.cnic}</Text>
        </Animated.View>

        {/* Stats Cards */}
        <View style={styles.statsRow}>
          {stats.map((stat, i) => (
            <View key={i} style={[styles.statCard, stat.danger && { borderColor: colors.error + '40', backgroundColor: colors.error + '08' }]}>
              <Text style={[styles.statValue, stat.danger && styles.statValueDanger]}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Edit/Delete Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={handleEdit}
            activeOpacity={0.7}
          >
            <Text style={styles.editButtonText}>✏️ Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDelete}
            activeOpacity={0.7}
          >
            <Text style={styles.deleteButtonText}>🗑️ Delete</Text>
          </TouchableOpacity>
        </View>

        {/* Rental History Timeline */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Rental History</Text>
          <Text style={styles.sectionCount}>{customerRentals.length} rentals</Text>
        </View>

        {customerRentals.length === 0 ? (
          <EmptyState
            icon="🎬"
            title="No rentals yet"
            subtitle="This customer hasn't made any rentals"
          />
        ) : (
          customerRentals.map((rental, index) => (
            <RentalCard
              key={rental.id}
              rental={rental}
              index={index}
              onPress={() => navigation.navigate('RentalDetail', { rental: { ...rental, customerName: customer.name } })}
            />
          ))
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <FloatingActionButton
        icon="+"
        onPress={() => navigation.navigate('AddRental', { customerId: customer.id, customerName: customer.name })}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.xl,
    paddingTop: spacing.lg,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
    paddingTop: spacing.lg,
  },
  avatarLarge: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  avatarTextLarge: {
    fontSize: typography.fontSize.huge,
    fontWeight: typography.fontWeight.bold,
  },
  customerName: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  tierBadgeLarge: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  tierTextLarge: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.extrabold,
    letterSpacing: 1.5,
  },
  phoneLarge: {
    fontSize: typography.fontSize.lg,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  cnicText: {
    fontSize: typography.fontSize.md,
    color: colors.textTertiary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xxl,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  statValueDanger: {
    color: colors.errorLight,
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  sectionCount: {
    fontSize: typography.fontSize.md,
    color: colors.textTertiary,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xxl,
  },
  editButton: {
    flex: 1,
    backgroundColor: colors.primary + '15',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.primary + '40',
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  editButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primaryLight,
  },
  deleteButton: {
    flex: 1,
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
    height: 100,
  },
});

export default CustomerProfileScreen;