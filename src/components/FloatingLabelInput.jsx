import React, { useState, useRef, useEffect, memo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Animated,
} from 'react-native';
import { colors, typography, spacing } from '../theme';

const FloatingLabelInput = React.memo(({ label, value, onChangeText, keyboardType, maxLength }) => {
  const [isFocused, setIsFocused] = useState(false);
  const labelAnim = useRef(new Animated.Value(value ? 1 : 0)).current;
  const borderAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(labelAnim, {
      toValue: isFocused || value ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isFocused, value]);

  useEffect(() => {
    Animated.timing(borderAnim, {
      toValue: isFocused ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isFocused]);

  const labelY = labelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -24],
  });

  const labelSize = labelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [16, 12],
  });

  const labelColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.textTertiary, colors.primaryLight],
  });

  return (
    <View style={styles.container}>
      <Animated.Text
        style={[
          styles.label,
          {
            transform: [{ translateY: labelY }],
            fontSize: labelSize,
            color: labelColor,
          },
        ]}
      >
        {label}
      </Animated.Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        keyboardType={keyboardType || 'default'}
        maxLength={maxLength}
        placeholderTextColor={colors.textMuted}
      />
      <View style={[styles.underline, { backgroundColor: isFocused ? colors.primary : colors.border }]} />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xxl,
    position: 'relative',
  },
  label: {
    position: 'absolute',
    top: 12,
    left: 0,
    zIndex: 1,
  },
  input: {
    fontSize: typography.fontSize.lg,
    color: colors.textPrimary,
    paddingVertical: spacing.md,
    paddingHorizontal: 0,
    borderBottomWidth: 0,
  },
  underline: {
    height: 2,
    borderRadius: 1,
  },
});

export default FloatingLabelInput;
