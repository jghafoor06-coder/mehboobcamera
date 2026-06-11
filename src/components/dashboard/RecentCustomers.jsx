/**
 * Recent customers section for the dashboard.
 * Extracted from DashboardScreen.
 */
import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { colors, spacing, typography } from '../../theme';
import CustomerCard from '../CustomerCard';

const RecentCustomers = React.memo(({ customers, navigation }) => {
  const recentCustomers = customers.slice(0, 4);

  return (
    <>
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
          onPress={() =>
            navigation.navigate('CustomerProfile', { customerId: customer.id })
          }
        />
      ))}
    </>
  );
});

const styles = StyleSheet.create({
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
});

export default RecentCustomers;
