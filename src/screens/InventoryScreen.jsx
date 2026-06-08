import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { colors, spacing, typography, borderRadius, shadows } from '../theme';
import { subscribeToItems, deleteItem } from '../firebase/itemsService';
import SearchBar from '../components/SearchBar';
import useDebounce from '../utils/useDebounce';
import ItemCard from '../components/ItemCard';
import FloatingActionButton from '../components/FloatingActionButton';
import EmptyState from '../components/EmptyState';

const categories = [
  { id: 'all', name: 'All' },
  { id: 'cameras', name: 'Cameras' },
  { id: 'lenses', name: 'Lenses' },
  { id: 'tripods', name: 'Tripods' },
  { id: 'lighting', name: 'Lighting' },
  { id: 'accessories', name: 'Accessories' },
];

const InventoryScreen = ({ navigation }) => {
  const [searchText, setSearchText] = useState('');
  const debouncedSearchText = useDebounce(searchText, 300);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const listFadeAnim = useRef(new Animated.Value(1)).current;
  const prevCategory = useRef('All');

  useEffect(() => {
    const unsubscribe = subscribeToItems((data) => {
      setInventoryItems(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filtered = inventoryItems.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(debouncedSearchText.toLowerCase());
    const matchesCategory =
      selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleCategoryChange = useCallback((catName) => {
    if (catName === prevCategory.current) return;
    prevCategory.current = catName;
    Animated.timing(listFadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setSelectedCategory(catName);
      Animated.timing(listFadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    });
  }, [listFadeAnim]);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading inventory...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Inventory</Text>
        <Text style={styles.subtitle}>{filtered.length} of {inventoryItems.length} items</Text>

        <SearchBar
          placeholder="Search equipment..."
          value={searchText}
          onChangeText={setSearchText}
          style={{ marginBottom: 0 }}
        />

        {/* Category Filters */}
        <View style={styles.categoryContainer}>
          {categories.map((cat) => {
            const isActive = selectedCategory === cat.name;
            return (
              <TouchableOpacity
                key={cat.id}
                onPress={() => handleCategoryChange(cat.name)}
                activeOpacity={0.8}
              >
                <View style={[styles.categoryChip, isActive && styles.categoryChipActive]}>
                  {isActive && <View style={styles.chipGlow} />}
                  {isActive && <View style={styles.chipInnerGlow} />}
                  <Text
                    style={[
                      styles.categoryChipText,
                      isActive && styles.categoryChipTextActive,
                    ]}
                  >
                    {cat.name}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Items List */}
        <Animated.View style={[styles.listWrapper, { opacity: listFadeAnim }]}>
          {filtered.length === 0 ? (
            <EmptyState
              icon="📦"
              title="No items found"
              subtitle="Try a different search or category"
            />
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.id}
              renderItem={({ item, index }) => (
                <ItemCard
                item={item}
                index={index}
                onPress={() => navigation.navigate('AddItem', { item })}
                onLongPress={() => {
                  Alert.alert(
                    'Delete Item',
                    `Delete "${item.name}"?`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: async () => {
                          try {
                            await deleteItem(item.id);
                          } catch (error) {
                            Alert.alert('Error', 'Failed to delete item.');
                          }
                        },
                      },
                    ],
                  );
                }}
              />
              )}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.list}
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
        </Animated.View>
      </View>

      <FloatingActionButton
        icon="+"
        onPress={() => navigation.navigate('AddItem')}
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
    marginBottom: spacing.md,
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingVertical: 14,
  },
  categoryChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.round,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    overflow: 'hidden',
    position: 'relative',
  },
  categoryChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryLight,
    ...shadows.glow(colors.premiumGlow),
  },
  chipGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.primaryLight,
    opacity: 0.15,
    borderRadius: borderRadius.round,
  },
  chipInnerGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.premiumGlow,
    opacity: 0.1,
    borderRadius: borderRadius.round,
  },
  categoryChipText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.textSecondary,
  },
  categoryChipTextActive: {
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.semibold,
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
  listWrapper: {
    flex: 1,
  },
  list: {
    paddingBottom: 100,
  },
});

export default InventoryScreen;