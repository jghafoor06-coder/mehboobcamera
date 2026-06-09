import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { colors, spacing, typography, borderRadius } from '../theme';
import { subscribeToCustomers } from '../firebase/customersService';
import SearchBar from '../components/SearchBar';
import useDebounce from '../utils/useDebounce';
import CustomerCard from '../components/CustomerCard';
import FloatingActionButton from '../components/FloatingActionButton';
import EmptyState from '../components/EmptyState';

const CustomerScreen = ({ navigation }) => {
  const [searchText, setSearchText] = useState('');
  const debouncedSearchText = useDebounce(searchText, 300);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = subscribeToCustomers((data) => {
      setCustomers(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filtered = useMemo(() => {
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(debouncedSearchText.toLowerCase()) ||
        c.phone.includes(debouncedSearchText)
    );
  }, [customers, debouncedSearchText]);

  const keyExtractor = useCallback((item) => item.id, []);

  const renderItem = useCallback(({ item, index }) => (
    <CustomerCard
      customer={item}
      index={index}
      onPress={() => navigation.navigate('CustomerProfile', { customerId: item.id })}
    />
  ), [navigation]);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading customers...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Customers</Text>
        <Text style={styles.subtitle}>{customers.length} total customers</Text>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <SearchBar
          placeholder="Search by name or phone..."
          value={searchText}
          onChangeText={setSearchText}
        />

        {filtered.length === 0 ? (
          <EmptyState
            icon="👤"
            title="No customers found"
            subtitle={customers.length === 0 ? 'Add your first customer' : 'Try a different search term'}
          />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.list}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            windowSize={7}
            initialNumToRender={8}
            refreshControl={
              <RefreshControl
                refreshing={false}
                onRefresh={() => {}}
                tintColor={colors.primary}
                colors={[colors.primary]}
                enabled={false}
              />
            }
          />
        )}
      </View>

      <FloatingActionButton
        icon="+"
        onPress={() => navigation.navigate('AddCustomer')}
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
  content: {
    flex: 1,
    padding: spacing.xl,
    paddingTop: spacing.lg,
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
  list: {
    paddingBottom: 100,
  },
});

export default CustomerScreen;