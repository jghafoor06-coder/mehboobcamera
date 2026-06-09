import React, { useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { colors, borderRadius, typography, spacing, shadows } from '../theme';
import { formatCurrency } from '../utils/formatters';
import GlowBackground from './GlowBackground';

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

const ItemCard = React.memo(({
  item,
  onPress,
  onLongPress,
  selected = false,
  selectable = false,
  index = 0,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 50,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay: index * 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const catColor = categoryColors[item.category] || colors.primary;
  const icon = categoryIcons[item.category] || '📦';
  const inStock = (item.quantity ?? 1) > 0;
  // Real-time availability from availabilityMap (passed via _available/_total)
  const liveAvailable = item._available;
  const liveTotal = item._total;
  const hasLiveData = liveAvailable != null && liveTotal != null;
  const availPct = hasLiveData && liveTotal > 0 ? liveAvailable / liveTotal : null;
  const availColor = availPct == null ? colors.textTertiary : availPct > 0.5 ? '#10B981' : availPct > 0 ? '#F59E0B' : '#EF4444';

  return (
    <Animated.View
      style={[
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
        },
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        onLongPress={onLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
        style={[
          styles.container,
          selected && { borderColor: colors.primary, backgroundColor: colors.primary + '10' },
          !item.available && styles.unavailable,
        ]}
      >
        <GlowBackground
          blobs={[
            { corner: 'topLeft', color: colors.primary, size: 120, opacity: 0.04, offset: { top: -40, left: -40 } },
            { corner: 'bottomRight', color: colors.accent, size: 100, opacity: 0.03, offset: { bottom: -30, right: -30 } },
          ]}
        />
        <View style={[styles.iconContainer, { backgroundColor: catColor + '15' }]}>
          <Text style={styles.icon}>{icon}</Text>
        </View>

        <View style={styles.info}>
          <Text
            style={[styles.name, !item.available && styles.unavailableText]}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          <Text style={styles.description} numberOfLines={1}>
            {item.description}
          </Text>
          <View style={styles.bottomRow}>
            <Text style={styles.price}>{formatCurrency(item.pricePerDay)}/day</Text>
            <View style={styles.badgeRow}>
              <View
                style={[
                  styles.stockBadge,
                  {
                    backgroundColor: inStock ? '#10B98120' : '#EF444420',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.stockText,
                    { color: inStock ? '#10B981' : '#EF4444' },
                  ]}
                >
                  {item.quantity ?? 1} in stock
                </Text>
              </View>
              <View
                style={[
                  styles.availabilityBadge,
                  {
                    backgroundColor: availColor + '20',
                  },
                ]}
              >
                <View
                  style={[
                    styles.availabilityDot,
                    {
                      backgroundColor: availColor,
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.availabilityText,
                    {
                      color: availColor,
                    },
                  ]}
                >
                  {hasLiveData ? `${liveAvailable}/${liveTotal} Available` : (item.available ? 'Available' : 'Rented')}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {selectable && (
          <View
            style={[
              styles.checkbox,
              selected && styles.checkboxSelected,
            ]}
          >
            {selected && <Text style={styles.checkmark}>✓</Text>}
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.card,
  },
  unavailable: {
    opacity: 0.6,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  icon: {
    fontSize: 20,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  unavailableText: {
    color: colors.textTertiary,
  },
  description: {
    fontSize: typography.fontSize.sm,
    color: colors.textTertiary,
    marginBottom: spacing.xs,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  price: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.accent,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  stockText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
  },
  availabilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  availabilityDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginRight: 4,
  },
  availabilityText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmark: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: typography.fontWeight.bold,
  },
});

export default ItemCard;