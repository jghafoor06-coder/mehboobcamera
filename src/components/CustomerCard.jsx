import React, { useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { colors, borderRadius, typography, spacing, shadows } from '../theme';
import { getInitials, tierColors, formatDate, computeTier } from '../utils/formatters';
import GlowBackground from './GlowBackground';

const CustomerCard = React.memo(({ customer, onPress, index = 0 }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        delay: index * 80,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        delay: index * 80,
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

  const tier = customer.tier || computeTier(customer.rentalCount || 0);
  const tierColor = tierColors[tier] || colors.primary;
  const rentalCount = customer.rentalCount ?? 0;
  const lastRentalDate = customer.lastRentalDate || null;

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
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
        style={styles.container}
      >
        <GlowBackground
          blobs={[
            { corner: 'topLeft', color: colors.primary, size: 180, opacity: 0.04 },
            { corner: 'bottomRight', color: colors.secondary, size: 140, opacity: 0.035 },
          ]}
        />
        <View style={styles.glowBorder} />
        <View style={styles.inner}>
          <View style={[styles.avatar, { backgroundColor: tierColor + '20' }]}>
            <Text style={[styles.avatarText, { color: tierColor }]}>
              {getInitials(customer.name)}
            </Text>
          </View>

          <View style={styles.info}>
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>
                {customer.name}
              </Text>
              <View style={[styles.tierBadge, { backgroundColor: tierColor + '20' }]}>
                <Text style={[styles.tierText, { color: tierColor }]}>
                  {tier.charAt(0).toUpperCase() + tier.slice(1)}
                </Text>
              </View>
            </View>
            <Text style={styles.phone}>{customer.phone}</Text>              <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{rentalCount}</Text>
                <Text style={styles.statLabel}>rentals</Text>
              </View>
              {lastRentalDate && (
                <>
                  <View style={styles.statDivider} />
                  <View style={styles.stat}>
                    <Text style={styles.statValue}>
                      {formatDate(lastRentalDate)}
                    </Text>
                    <Text style={styles.statLabel}>last rental</Text>
                  </View>
                </>
              )}
            </View>
          </View>

          <Text style={styles.arrow}>›</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  glowBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.premiumGlow,
    opacity: 0.4,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
  },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  name: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    flex: 1,
  },
  tierBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginLeft: spacing.sm,
  },
  tierText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  phone: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.textPrimary,
    marginRight: 4,
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textTertiary,
  },
  statDivider: {
    width: 1,
    height: 12,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },
  arrow: {
    fontSize: 24,
    color: colors.textTertiary,
    marginLeft: spacing.sm,
  },
});

});

export default CustomerCard;