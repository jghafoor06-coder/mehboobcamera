import React, { useRef, useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Animated,
} from 'react-native';
import { colors, borderRadius, typography, spacing, shadows } from '../theme';
import { formatCurrency } from '../utils/formatters';
import GlowBackground from './GlowBackground';

const AnimatedStatCard = ({
  title,
  value,
  subtitle,
  gradient = colors.primaryGradient,
  glowColor,
  icon,
  isCurrency = false,
  index = 0,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const countAnim = useRef(new Animated.Value(0)).current;
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        delay: index * 100,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        delay: index * 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Animate counter
    Animated.timing(countAnim, {
      toValue: 1,
      duration: 1500,
      delay: index * 100 + 300,
      useNativeDriver: false,
    }).start();

    const listener = countAnim.addListener(({ value: animValue }) => {
      setDisplayValue(Math.round(animValue * value));
    });

    return () => countAnim.removeListener(listener);
  }, []);

  const glow = glowColor || gradient[0];

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={[styles.background, { backgroundColor: gradient[0] }]} />
      <GlowBackground
        blobs={[
          { corner: 'topLeft', color: glow, size: 160, opacity: 0.06 },
          { corner: 'bottomRight', color: gradient[1] || gradient[0], size: 130, opacity: 0.04 },
        ]}
      />
      <View style={[styles.glowEffect, { backgroundColor: glow }]} />
      <View style={styles.content}>
        <View style={styles.header}>
          {icon && <Text style={styles.icon}>{icon}</Text>}
          <Text style={styles.title}>{title}</Text>
        </View>
        <Text style={styles.value}>
          {isCurrency ? formatCurrency(displayValue) : displayValue.toLocaleString()}
        </Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    position: 'relative',
    minHeight: 120,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: borderRadius.xl,
    opacity: 0.9,
  },
  glowEffect: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: borderRadius.xl + 4,
    opacity: 0.2,
  },
  content: {
    padding: spacing.lg,
    zIndex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  icon: {
    fontSize: 16,
    marginRight: spacing.xs,
  },
  title: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: 'rgba(255, 255, 255, 0.8)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  value: {
    fontSize: typography.fontSize.xxxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: typography.fontSize.xs,
    color: 'rgba(255, 255, 255, 0.6)',
  },
});

export default AnimatedStatCard;
