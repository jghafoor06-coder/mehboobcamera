import React, { useRef, useEffect, memo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { colors, borderRadius, typography, spacing, shadows } from '../theme';

const PrimaryButton = React.memo(({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  icon,
  fullWidth = false,
  style,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (disabled) {
      Animated.timing(opacityAnim, {
        toValue: 0.5,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [disabled]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
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

  const getGradientColors = () => {
    switch (variant) {
      case 'primary':
        return colors.primaryGradient;
      case 'secondary':
        return colors.secondaryGradient;
      case 'accent':
        return colors.accentGradient;
      case 'success':
        return colors.successGradient;
      case 'outline':
        return ['transparent', 'transparent'];
      case 'ghost':
        return ['transparent', 'transparent'];
      default:
        return colors.primaryGradient;
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          paddingVertical: spacing.sm + 2,
          paddingHorizontal: spacing.lg,
          fontSize: typography.fontSize.sm,
        };
      case 'medium':
        return {
          paddingVertical: spacing.md + 2,
          paddingHorizontal: spacing.xl,
          fontSize: typography.fontSize.md,
        };
      case 'large':
        return {
          paddingVertical: spacing.lg + 2,
          paddingHorizontal: spacing.xxl,
          fontSize: typography.fontSize.lg,
        };
      default:
        return {
          paddingVertical: spacing.md + 2,
          paddingHorizontal: spacing.xl,
          fontSize: typography.fontSize.md,
        };
    }
  };

  const sizeStyles = getSizeStyles();
  const gradientColors = getGradientColors();
  const isOutline = variant === 'outline';
  const isGhost = variant === 'ghost';

  return (
    <Animated.View
      style={[
        fullWidth && styles.fullWidth,
        { transform: [{ scale: scaleAnim }], opacity: opacityAnim },
        style,
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        activeOpacity={0.8}
        style={[
          styles.container,
          {
            paddingVertical: sizeStyles.paddingVertical,
            paddingHorizontal: sizeStyles.paddingHorizontal,
          },
          isOutline && styles.outline,
          isGhost && styles.ghost,
          !isOutline && !isGhost && shadows.glowLayered(colors.premiumGlow),
        ]}
      >
        {!isOutline && !isGhost && (
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: gradientColors[0],
                borderRadius: borderRadius.lg,
              },
            ]}
          />
        )}
        {icon && <Text style={styles.icon}>{icon}</Text>}
        <Text
          style={[
            styles.text,
            { fontSize: sizeStyles.fontSize },
            isOutline && styles.outlineText,
            isGhost && styles.ghostText,
          ]}
        >
          {title}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  fullWidth: {
    width: '100%',
  },
  outline: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: 'transparent',
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  text: {
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.semibold,
    textAlign: 'center',
    zIndex: 1,
  },
  outlineText: {
    color: colors.primaryLight,
  },
  ghostText: {
    color: colors.primaryLight,
  },
  icon: {
    marginRight: spacing.sm,
    fontSize: 16,
    zIndex: 1,
  },
});

export default PrimaryButton;
