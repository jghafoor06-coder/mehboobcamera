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
import { createCustomer, updateCustomer } from '../firebase/customersService';
import PrimaryButton from '../components/PrimaryButton';
import GlassmorphismPanel from '../components/GlassmorphismPanel';
import FloatingLabelInput from '../components/FloatingLabelInput';

const AddCustomerScreen = ({ route, navigation }) => {
  const editCustomer = route.params?.customer;
  const isEdit = !!editCustomer;
  const [name, setName] = useState(editCustomer?.name || '');
  const [phone, setPhone] = useState(editCustomer?.phone || '');
  const [cnic, setCnic] = useState(editCustomer?.cnic || '');
  const headerFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerFade, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  const [saving, setSaving] = useState(false);
  const isValid = name.length > 0 && phone.length > 0;

  const handleSave = async () => {
    if (!isValid) return;
    setSaving(true);
    try {
      if (isEdit) {
        await updateCustomer(editCustomer.id, { name, phone, cnic });
      } else {
        await createCustomer({ name, phone, cnic });
      }
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to save customer. Please try again.');
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
          <Text style={styles.title}>{isEdit ? 'Edit Customer' : 'Add Customer'}</Text>
          <Text style={styles.subtitle}>Enter customer details</Text>
        </Animated.View>

        <GlassmorphismPanel style={styles.formCard}>
          <FloatingLabelInput
            label="Full Name"
            value={name}
            onChangeText={setName}
          />
          <FloatingLabelInput
            label="Phone Number"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            maxLength={15}
          />
          <FloatingLabelInput
            label="CNIC (Optional)"
            value={cnic}
            onChangeText={setCnic}
            keyboardType="numeric"
            maxLength={15}
          />
        </GlassmorphismPanel>

        <View style={styles.buttonContainer}>
          <PrimaryButton
            title={saving ? 'Saving...' : (isEdit ? 'Update Customer' : 'Save Customer')}
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
    paddingTop: 15,
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

export default AddCustomerScreen;