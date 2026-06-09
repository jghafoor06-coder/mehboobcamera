import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { colors, spacing, typography, borderRadius } from '../theme';
import { createItem, updateItem } from '../firebase/itemsService';
import PrimaryButton from '../components/PrimaryButton';
import GlassmorphismPanel from '../components/GlassmorphismPanel';
import FloatingLabelInput from '../components/FloatingLabelInput';

const AddItemScreen = ({ route, navigation }) => {
  const editItem = route.params?.item;
  const isEdit = !!editItem;
  const [name, setName] = useState(editItem?.name || '');
  const [selectedCategory, setSelectedCategory] = useState(editItem?.category || '');
  const [pricePerDay, setPricePerDay] = useState(editItem?.pricePerDay ? String(editItem.pricePerDay) : '');
  const [quantity, setQuantity] = useState(editItem?.quantity ? String(editItem.quantity) : '1');
  const headerFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerFade, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  const [saving, setSaving] = useState(false);
  const categoryList = [
    { id: 'cameras', name: 'Cameras' },
    { id: 'lenses', name: 'Lenses' },
    { id: 'tripods', name: 'Tripods' },
    { id: 'lighting', name: 'Lighting' },
    { id: 'accessories', name: 'Accessories' },
    { id: 'gimble', name: 'Gimble' },
  ];
  const isValid = name.length > 0 && selectedCategory.length > 0 && pricePerDay.length > 0 && quantity.length > 0;

  const handleSave = async () => {
    if (!isValid) return;
    setSaving(true);
    try {
      if (isEdit) {
        await updateItem(editItem.id, {
          name,
          category: selectedCategory,
          pricePerDay: parseInt(pricePerDay, 10),
          quantity: parseInt(quantity, 10) || 1,
        });
      } else {
        await createItem({
          name,
          category: selectedCategory,
          pricePerDay: parseInt(pricePerDay, 10),
          quantity: parseInt(quantity, 10) || 1,
        });
      }
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to add equipment. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: headerFade }}>
          <Text style={styles.title}>{isEdit ? 'Edit Equipment' : 'Add Equipment'}</Text>
          <Text style={styles.subtitle}>{isEdit ? 'Update equipment details' : 'Add new equipment to inventory'}</Text>
        </Animated.View>

        <GlassmorphismPanel style={styles.formCard}>
          <FloatingLabelInput
            label="Item Name"
            value={name}
            onChangeText={setName}
          />

          <View style={styles.categorySection}>
            <Text style={styles.categoryLabel}>Category</Text>
            <View style={styles.categoryGrid}>
              {categoryList.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryChip,
                    selectedCategory === cat.name && styles.categoryChipActive,
                  ]}
                  onPress={() => setSelectedCategory(cat.name)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      selectedCategory === cat.name && styles.categoryChipTextActive,
                    ]}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <FloatingLabelInput
            label="Price Per Day (PKR)"
            value={pricePerDay}
            onChangeText={setPricePerDay}
            keyboardType="numeric"
          />

          <FloatingLabelInput
            label="Quantity in Stock"
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="numeric"
          />
        </GlassmorphismPanel>

        <View style={styles.buttonContainer}>
          <PrimaryButton
            title={saving ? 'Saving...' : (isEdit ? 'Update Equipment' : 'Add Equipment')}
            onPress={handleSave}
            disabled={!isValid || saving}
            fullWidth
            size="large"
          />
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.cancelButton}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.xl,
    paddingTop: spacing.lg,
  },
  title: {
    fontSize: typography.fontSize.xxxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: typography.fontSize.md,
    color: colors.textTertiary,
    marginBottom: spacing.xxl,
  },
  formCard: {
    marginBottom: spacing.xxl,
  },
  categorySection: {
    marginBottom: spacing.xxl,
  },
  categoryLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.textTertiary,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.round,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  categoryChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryEmoji: {
    fontSize: 14,
  },
  categoryChipText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.textSecondary,
  },
  categoryChipTextActive: {
    color: colors.textPrimary,
  },
  buttonContainer: {
    marginTop: spacing.lg,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    marginTop: spacing.md,
  },
  cancelText: {
    fontSize: typography.fontSize.md,
    color: colors.textTertiary,
    fontWeight: typography.fontWeight.medium,
  },
});

export default AddItemScreen;