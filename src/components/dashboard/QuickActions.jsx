/**
 * Dashboard quick actions row component.
 * Extracted from DashboardScreen.
 */
import React, { useMemo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { QUICK_ACTIONS } from '../../utils/dashboardCalculations';

const QuickActions = React.memo(({ navigation }) => {
  const actions = useMemo(
    () =>
      QUICK_ACTIONS.map((a) => ({
        ...a,
        color:
          a.screen === 'AddCustomer'
            ? colors.primary
            : a.screen === 'AddItem'
            ? colors.secondary
            : colors.success,
      })),
    [],
  );

  return (
    <>
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsRow}>
        {actions.map((action) => (
          <TouchableOpacity
            key={action.id}
            style={[styles.actionCard, { borderColor: action.color + '30' }]}
            onPress={() => navigation.navigate(action.screen)}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIcon, { backgroundColor: action.color + '20' }]}>
              <Text style={styles.actionEmoji}>{action.icon}</Text>
            </View>
            <Text style={styles.actionLabel}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </>
  );
});

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  actionCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: 'center',
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  actionEmoji: {
    fontSize: 22,
  },
  actionLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.textSecondary,
  },
});

export default QuickActions;
