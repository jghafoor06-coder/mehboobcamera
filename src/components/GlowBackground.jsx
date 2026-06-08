import React from 'react';
import { View } from 'react-native';

/**
 * Default offset for each corner — the blob extends partially outside the card
 * so it looks like a soft glow bleeding through from behind.
 */
const CORNER_OFFSETS = {
  topLeft: { top: -60, left: -60 },
  topRight: { top: -60, right: -60 },
  bottomLeft: { bottom: -50, left: -50 },
  bottomRight: { bottom: -50, right: -50 },
};

/**
 * Reusable GlowBackground component.
 *
 * Renders decorative semi-transparent coloured circles (blobs) at the corners
 * of a card or panel to create a subtle premium glow effect.
 *
 * Usage:
 * ```jsx
 * <GlowBackground
 *   blobs={[
 *     { corner: 'topLeft', color: colors.primary, size: 180, opacity: 0.04 },
 *     { corner: 'bottomRight', color: colors.secondary, size: 140, opacity: 0.035 },
 *   ]}
 * />
 * ```
 *
 * @param {Array<{corner: string, color: string, size?: number, opacity?: number, offset?: {top?: number, left?: number, right?: number, bottom?: number}}>} blobs
 */
const GlowBackground = ({ blobs = [] }) => {
  return (
    <>
      {blobs.map((blob, i) => {
        const offset = blob.offset || CORNER_OFFSETS[blob.corner] || {};
        const size = blob.size || 140;
        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              ...offset,
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: blob.color,
              opacity: blob.opacity ?? 0.035,
            }}
          />
        );
      })}
    </>
  );
};

export default GlowBackground;
