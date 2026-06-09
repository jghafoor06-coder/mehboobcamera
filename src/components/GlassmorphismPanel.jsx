import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, borderRadius, spacing } from '../theme';
import GlowBackground from './GlowBackground';

const GlassmorphismPanel = React.memo(({ children, style, noPadding = false }) => {
  return (
    <View style={[styles.container, style]}>
      <GlowBackground
        blobs={[
          { corner: 'topLeft', color: colors.primary, size: 150, opacity: 0.04 },
          { corner: 'bottomRight', color: colors.secondary, size: 120, opacity: 0.03 },
        ]}
      />
      <View style={styles.highlight} />
      <View style={[noPadding ? styles.contentNoPad : styles.content]}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.borderGlow,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    position: 'relative',
  },
  highlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.glassHighlight,
    opacity: 0.6,
  },
  content: {
    padding: spacing.lg,
  },
  contentNoPad: {
    padding: 0,
  },
});

});

export default GlassmorphismPanel;
