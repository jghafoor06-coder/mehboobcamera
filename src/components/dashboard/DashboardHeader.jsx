/**
 * Dashboard header component — greeting, title, avatar.
 * Extracted from DashboardScreen.
 */
import React, { useRef, useEffect } from 'react';
import { StyleSheet, Text, View, Animated } from 'react-native';
import { colors, spacing, typography } from '../../theme';

const DashboardHeader = React.memo(() => {
  const headerFade = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-20)).current;

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

  return (
    <Animated.View
      style={[styles.header, { opacity: headerFade, transform: [{ translateY: headerSlide }] }]}
    >
      <View>
        <Text style={styles.greeting}>Good Evening</Text>
        <Text style={styles.headerTitle}>MehboobCamera 786</Text>
      </View>
      <View style={styles.headerRight}>
        <View style={styles.avatarBadge}>
          <Text style={styles.avatarText}>HMC</Text>
        </View>
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
    marginTop: spacing.lg,
  },
  greeting: {
    fontSize: typography.fontSize.md,
    color: colors.textTertiary,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary + '20',
    borderWidth: 1.5,
    borderColor: colors.primary + '40',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.primaryLight,
  },
});

export default DashboardHeader;
