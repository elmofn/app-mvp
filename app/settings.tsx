import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { CaretDownIcon } from 'phosphor-react-native';
import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/src/components/ScreenHeader';
import { useAuth } from '@/src/contexts/AuthContext';
import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

function formatPhone(raw: string): string {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 13 && digits.startsWith('55')) {
    return `+55 ${digits.slice(2, 4)} ${digits.slice(4, 9)}-${digits.slice(9)}`;
  }
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  return raw;
}

const CURRENCIES = [
  { label: 'US Dollar', value: 'USD' },
  { label: 'Brazilian Real', value: 'BRL' },
  { label: 'Euro', value: 'EUR' },
];

const LANGUAGES = [
  { label: 'English - US', value: 'en-US' },
  { label: 'Português - BR', value: 'pt-BR' },
  { label: 'Español', value: 'es-ES' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { account, signOut } = useAuth();

  const [name, setName] = useState(account?.accountDetails.name ?? '');
  const [phone, setPhone] = useState(formatPhone(account?.accountDetails.phoneNumber ?? ''));
  const [email, setEmail] = useState(account?.accountDetails.email ?? '');
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const [currency, setCurrency] = useState(
    CURRENCIES.find((c) => c.value === account?.setups.currency.code) ?? CURRENCIES[0],
  );
  const [language, setLanguage] = useState(
    LANGUAGES.find((l) => l.value === account?.setups.lang) ?? LANGUAGES[0],
  );
  const [modalVisible, setModalVisible] = useState<{ type: 'currency' | 'language' | null }>({ type: null });

  const handleLogout = () => {
    Alert.alert('Logout', 'Do you want to end your TravelCash session?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => {
          signOut();
          router.replace('/');
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action is irreversible. All your data will be permanently removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => {} },
      ],
    );
  };

  const openPicker = (type: 'currency' | 'language') => {
    setModalVisible({ type });
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <StatusBar style="light" />

      <LinearGradient
        colors={['#6444DA', '#4D2ACC', '#1B0F4A']}
        start={{ x: 0.1, y: 0.1 }}
        end={{ x: 0.8, y: 1.2 }}
        locations={[0.1, 0.2, 0.7]}
        style={[styles.headerGradient, { paddingTop: insets.top }]}
      >
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.2)' }]} />

        <ScreenHeader title="User Data" dark={true} />

        <View style={styles.headerBody}>
          <Text style={styles.mainTitle}>
            User <Text style={styles.mainTitleAccent}>Profile</Text>
          </Text>
          <Text style={styles.pageDescription}>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quisque sed sapien mauris.
          </Text>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.formContainer}>
            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Name</Text>
              <TextInput
                style={[styles.inputField, focusedField === 'name' && styles.inputFieldFocused]}
                value={name}
                onChangeText={setName}
                onFocus={() => setFocusedField('name')}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput
                style={[styles.inputField, focusedField === 'phone' && styles.inputFieldFocused]}
                value={phone}
                onChangeText={setPhone}
                onFocus={() => setFocusedField('phone')}
                onBlur={() => setFocusedField(null)}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>E-mail</Text>
              <TextInput
                style={[styles.inputField, focusedField === 'email' && styles.inputFieldFocused]}
                value={email}
                onChangeText={setEmail}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity
              style={styles.formGroup}
              onPress={() => openPicker('currency')}
              activeOpacity={0.7}
            >
              <Text style={styles.inputLabel}>Currency</Text>
              <View style={styles.selectField}>
                <Text style={styles.selectValue}>{currency.label}</Text>
                <CaretDownIcon size={16} color={colors.text.muted} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.formGroup}
              onPress={() => openPicker('language')}
              activeOpacity={0.7}
            >
              <Text style={styles.inputLabel}>Language</Text>
              <View style={styles.selectField}>
                <Text style={styles.selectValue}>{language.label}</Text>
                <CaretDownIcon size={16} color={colors.text.muted} />
              </View>
            </TouchableOpacity>

            <View style={styles.buttonGroup}>
              <TouchableOpacity style={styles.buttonFilled} onPress={handleLogout} activeOpacity={0.8}>
                <Text style={styles.buttonFilledText}>Logout</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.buttonFilled} activeOpacity={0.8}>
                <Text style={styles.buttonFilledText}>Change Password</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.buttonOutlined}
                onPress={handleDeleteAccount}
                activeOpacity={0.8}
              >
                <Text style={styles.buttonOutlinedText}>Delete Account</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={modalVisible.type !== null}
        transparent={true}
        animationType="fade"
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible({ type: null })}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {modalVisible.type === 'currency' ? 'SELECT CURRENCY' : 'SELECT LANGUAGE'}
            </Text>
            <FlatList
              data={modalVisible.type === 'currency' ? CURRENCIES : LANGUAGES}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => {
                const isActive =
                  modalVisible.type === 'currency'
                    ? currency.value === item.value
                    : language.value === item.value;
                return (
                  <TouchableOpacity
                    style={styles.modalOption}
                    onPress={() => {
                      if (modalVisible.type === 'currency') setCurrency(item);
                      else setLanguage(item);
                      setModalVisible({ type: null });
                    }}
                  >
                    <Text style={[styles.modalOptionText, isActive && styles.modalOptionActive]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },

  headerGradient: {
    paddingHorizontal: 0,
    paddingBottom: 32,
  },
  headerBody: {
    paddingHorizontal: 24,
    marginTop: -16,
  },
  mainTitle: {
    fontSize: 50,
    fontFamily: fonts.bold,
    color: colors.text.light,
    letterSpacing: -2.4,
    marginBottom: 16,
  },
  mainTitleAccent: {
    color: '#85EDD3',
    fontFamily: fonts.italic,
  },
  pageDescription: {
    fontSize: 16,
    fontFamily: fonts.regular,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 20,
    maxWidth: '90%',
  },

  scrollContent: { flexGrow: 1 },
  formContainer: { padding: 24, paddingTop: 28 },

  formGroup: { marginBottom: 22 },
  inputLabel: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: colors.text.dark,
    marginBottom: 6,
  },
  inputField: {
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    fontSize: 17,
    fontFamily: fonts.regular,
    color: colors.text.dark,
    paddingVertical: 8,
  },
  inputFieldFocused: {
    borderBottomWidth: 2,
    borderBottomColor: colors.brand.primary,
  },
  selectField: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    paddingVertical: 8,
  },
  selectValue: {
    fontSize: 17,
    fontFamily: fonts.regular,
    color: colors.text.dark,
  },

  buttonGroup: {
    marginTop: 32,
    gap: 12,
  },
  buttonFilled: {
    backgroundColor: '#EDEDF2',
    paddingVertical: 18,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonFilledText: {
    color: colors.text.dark,
    fontSize: 14,
    fontFamily: fonts.bold,
  },
  buttonOutlined: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(71, 71, 71, 0.15)',
    paddingVertical: 18,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonOutlinedText: {
    color: colors.text.dark,
    fontSize: 14,
    fontFamily: fonts.bold,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 24,
    maxHeight: '50%',
  },
  modalTitle: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: colors.text.muted,
    letterSpacing: 1,
    marginBottom: 16,
  },
  modalOption: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalOptionText: {
    fontSize: 16,
    fontFamily: fonts.regular,
    color: colors.text.dark,
  },
  modalOptionActive: {
    color: colors.brand.primary,
    fontFamily: fonts.bold,
  },
});
