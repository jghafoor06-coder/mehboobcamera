import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Animated,
} from 'react-native';
import { colors, borderRadius, spacing, typography } from '../theme';

/**
 * Skeleton Card Component for loading states
 * Shows a pulsing placeholder while content loads
 */
const SkeletonCard = ({ width = '100%', height = 100, style }) => {
  const shimmer = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [shimmer]);

  const opacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 0.8],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          opacity,
        },
        style,
      ]}
    />
  );
};

const StatSkeletonCard = ({ index }) => {
  return (
    <View style={styles.statSkeletonCard}>
      <View style={styles.statSkeletonIcon}>
        <SkeletonCard width={24} height={24} />
      </View>
      <SkeletonCard width={60} height={12} style={{ marginVertical: spacing.sm }} />
      <SkeletonCard width={40} height={20} />
    </View>
  );
};

const DashboardHeaderSkeleton = () => {
  return (
    <View style={styles.headerSkeletonContainer}>
      <View style={styles.headerSkeletonText}>
        <SkeletonCard width={80} height={12} style={{ marginBottom: spacing.sm }} />
        <SkeletonCard width={200} height={24} />
      </View>
      <SkeletonCard width={44} height={44} style={{ borderRadius: 22 }} />
    </View>
  );
};

const StatsGridSkeleton = () => {
  return (
    <View style={styles.statsGridSkeletonContainer}>
      <View style={styles.statsRowSkeleton}>
        <View style={styles.statHalfSkeleton}>
          <StatSkeletonCard index={0} />
        </View>
        <View style={styles.statHalfSkeleton}>
          <StatSkeletonCard index={1} />
        </View>
      </View>
      <View style={styles.statsRowSkeleton}>
        <View style={styles.statHalfSkeleton}>
          <StatSkeletonCard index={2} />
        </View>
        <View style={styles.statHalfSkeleton}>
          <StatSkeletonCard index={3} />
        </View>
      </View>
      <View style={styles.statsRowSkeleton}>
        <View style={styles.statHalfSkeleton}>
          <StatSkeletonCard index={4} />
        </View>
        <View style={styles.statHalfSkeleton}>
          <StatSkeletonCard index={5} />
        </View>
      </View>
    </View>
  );
};

const RentalListSkeleton = ({ count = 3 }) => {
  return (
    <View>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={styles.rentalSkeletonCard}>
          <SkeletonCard width={8} height={8} style={{ borderRadius: 4 }} />
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <SkeletonCard width={120} height={12} style={{ marginBottom: spacing.sm }} />
            <SkeletonCard width={150} height={10} />
          </View>
          <SkeletonCard width={16} height={16} />
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerSkeletonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
    marginTop: spacing.lg,
  },
  headerSkeletonText: {
    flex: 1,
  },
  statsGridSkeletonContainer: {
    gap: spacing.md,
    marginBottom: spacing.xxl,
  },
  statsRowSkeleton: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statHalfSkeleton: {
    flex: 1,
  },
  statSkeletonCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: 'center',
  },
  statSkeletonIcon: {
    marginBottom: spacing.sm,
  },
  rentalSkeletonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
});

export {
  SkeletonCard,
  DashboardHeaderSkeleton,
  StatsGridSkeleton,
  RentalListSkeleton,
  StatSkeletonCard,
};
