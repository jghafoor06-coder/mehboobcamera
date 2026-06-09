import React, { useRef, useEffect, memo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { colors, borderRadius, spacing } from '../theme';

const GradientCard = React.memo(({
  children,
  onPress,
  gradient = colors.primaryGradient,
  style,
  contentStyle,
  glowColor,
  borderOnly = false,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, {
          toValue: 0.6,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacity, {
          toValue: 0.3,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
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

  const glow = glowColor || gradient[0];

  const content = (
    <Animated.View
      style={[
        styles.container,
        borderOnly && styles.borderOnlyContainer,
        {
          transform: [{ scale: scaleAnim }],
        },
        style,
      ]}
    >
      {!borderOnly && (
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: gradient[0],
              borderRadius: borderRadius.xl,
            },
          ]}
        />
      )}
      {!borderOnly && (
        <Animated.View
          style={[
            styles.glow,
            {
              backgroundColor: glow,
              opacity: glowOpacity,
              borderRadius: borderRadius.xl,
            },
          ]}
        />
      )}
      <View style={[styles.content, contentStyle]}>{children}</View>
    </Animated.View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    position: 'relative',
  },
  borderOnlyContainer: {
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  glow: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
  },
  content: {
    padding: spacing.lg,
    zIndex: 1,
  },
});

});

export default GradientCard;
