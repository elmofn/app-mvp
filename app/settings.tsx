import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { CaretDownIcon, XIcon } from 'phosphor-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
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
import { useAlert } from '@/src/contexts/AlertContext';
import { useAuth } from '@/src/contexts/AuthContext';
import {
  requestValidationCode,
  updateAccount,
  validateCode,
  ValidateCodeError,
} from '@/src/services/account';
import { getUserLanguage, SupportedLang } from '@/src/services/locale';
import { formatLocationPayload, getCachedLocation, getCurrentLocation } from '@/src/services/location';
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

const LANGUAGES: { label: string; value: SupportedLang }[] = [
  { label: 'English - US', value: 'en-US' },
  { label: 'Português - BR', value: 'pt-BR' },
  { label: 'Español', value: 'es-ES' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { account, signOut, updateAccountDetails } = useAuth();
  const showAlert = useAlert();

  // Idioma usado nas chamadas localizadas (mensagens de erro). Pode mudar
  // localmente no formulario, mas as APIs ainda devolvem mensagens baseadas
  // no idioma salvo no servidor - usamos o local pra coerencia da UI.
  const lang = getUserLanguage(account);

  const original = useMemo(
    () => ({
      name: account?.accountDetails.name ?? '',
      email: account?.accountDetails.email ?? '',
      phoneDigits: (account?.accountDetails.phoneNumber ?? '').replace(/\D/g, ''),
      lang: (account?.setups.lang ?? 'en-US') as SupportedLang,
    }),
    [account?.accountDetails.name, account?.accountDetails.email, account?.accountDetails.phoneNumber, account?.setups.lang],
  );

  const [name, setName] = useState(original.name);
  const [phone, setPhone] = useState(formatPhone(account?.accountDetails.phoneNumber ?? ''));
  const [email, setEmail] = useState(original.email);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const [currency, setCurrency] = useState(
    CURRENCIES.find((c) => c.value === account?.setups.currency.code) ?? CURRENCIES[0],
  );
  const [language, setLanguage] = useState(
    LANGUAGES.find((l) => l.value === original.lang) ?? LANGUAGES[0],
  );
  const [modalVisible, setModalVisible] = useState<{ type: 'currency' | 'language' | null }>({ type: null });

  // Save / verification state
  const [isSaving, setIsSaving] = useState(false);
  const [verifyVisible, setVerifyVisible] = useState(false);
  const [verifyCode, setVerifyCode] = useState('');
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  // Diff em digitos pra phone, lowercased pra email, trim pra name.
  const phoneDigits = phone.replace(/\D/g, '');
  const nextName = name.trim();
  const nextEmail = email.trim().toLowerCase();

  const nameDirty = nextName !== original.name.trim();
  const emailDirty = nextEmail !== original.email.trim().toLowerCase();
  const phoneDirty = phoneDigits !== original.phoneDigits;
  const langDirty = language.value !== original.lang;
  const isDirty = nameDirty || emailDirty || phoneDirty || langDirty;
  const requiresVerification = emailDirty || phoneDirty;

  // Executa a PUT UpdateAccount com o snapshot atual do form e propaga o
  // novo estado para o AuthContext (que persiste no storage).
  const performUpdate = async () => {
    if (!account) return;
    setIsSaving(true);
    try {
      let coords = getCachedLocation();
      if (!coords) coords = await getCurrentLocation();
      const geolocation = formatLocationPayload(coords);

      await updateAccount(
        {
          accountId: account.accountDetails.accountId,
          name: nextName,
          email: nextEmail,
          legalId: account.account.legalId,
          phoneNumber: phoneDigits,
          language: language.value,
          geolocation,
        },
        lang,
      );

      await updateAccountDetails({
        name: nextName,
        email: nextEmail,
        phoneNumber: phoneDigits,
        lang: language.value,
      });

      showAlert('Profile updated', 'Your changes have been saved.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not save your changes.';
      showAlert('Update failed', message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    if (!account || !isDirty || isSaving) return;
    if (!requiresVerification) {
      await performUpdate();
      return;
    }
    // Mudancas em email ou phone exigem verificacao via email - mesmo
    // identifier (o email atual) eh quem recebe o codigo.
    setVerifyCode('');
    setVerifyError(null);
    setVerifyVisible(true);
    try {
      await requestValidationCode(account.accountDetails.accountId, 'email', lang);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not send the verification code.';
      showAlert('Verification', message);
    }
  };

  const handleVerifyCode = async () => {
    if (!account) return;
    if (verifyCode.length < 4) return;
    setIsVerifying(true);
    setVerifyError(null);
    try {
      // O codigo foi enviado para o email atual (cadastrado) - eh ele que
      // serve como identifier no ValidateCode, nao o email novo.
      await validateCode(original.email, verifyCode, lang);
      setVerifyVisible(false);
      await performUpdate();
    } catch (err) {
      if (err instanceof ValidateCodeError) {
        setVerifyError(err.message);
      } else {
        const message = err instanceof Error ? err.message : 'Could not validate the code.';
        showAlert('Verification', message);
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendCode = async () => {
    if (!account || isResending) return;
    setIsResending(true);
    setVerifyError(null);
    setVerifyCode('');
    try {
      await requestValidationCode(account.accountDetails.accountId, 'email', lang);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not send the verification code.';
      showAlert('Verification', message);
    } finally {
      setIsResending(false);
    }
  };

  const handleLogout = () => {
    showAlert('Logout', 'Do you want to end your TravelBACK session?', [
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
    showAlert(
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

  // Posicionamento manual da sticky bar: ouvimos os eventos do Keyboard e
  // colocamos a barra com bottom = altura do teclado. KAV em padding eh
  // flaky com sticky footers nessa combinacao (SafeAreaView + ScrollView),
  // entao tiramos ele e cuidamos do offset diretamente.
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const stickyBarBottom = keyboardHeight > 0 ? keyboardHeight : 0;
  const stickyBarPaddingBottom = keyboardHeight > 0 ? 12 : insets.bottom + 12;
  // Reserva espaco no fim do scroll para que o ultimo botao nao fique
  // atras da sticky bar (quando dirty) ou colado no home indicator (quando
  // limpo). Tambem reserva espaco do teclado quando aberto.
  const scrollBottomPadding =
    (isDirty ? 84 : 0) + (keyboardHeight > 0 ? keyboardHeight : insets.bottom) + 16;

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <StatusBar style="light" />

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: scrollBottomPadding },
        ]}
        keyboardShouldPersistTaps="handled"
      >
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
                Update your personal information. Email and phone changes require verification.
              </Text>
            </View>
          </LinearGradient>

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

        {isDirty ? (
          <View
            style={[
              styles.stickyBar,
              {
                bottom: stickyBarBottom,
                paddingBottom: stickyBarPaddingBottom,
              },
            ]}
          >
            <TouchableOpacity
              style={[styles.buttonPrimary, isSaving && styles.buttonPrimaryDisabled]}
              onPress={handleSave}
              activeOpacity={0.85}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color={colors.text.light} />
              ) : (
                <Text style={styles.buttonPrimaryText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : null}

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
                      else setLanguage(item as { label: string; value: SupportedLang });
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

      <Modal
        visible={verifyVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => (isVerifying ? null : setVerifyVisible(false))}
      >
        <View style={styles.verifyOverlay}>
          <View style={styles.verifyCard}>
            <TouchableOpacity
              style={styles.verifyClose}
              onPress={() => !isVerifying && setVerifyVisible(false)}
              hitSlop={10}
            >
              <XIcon size={18} color={colors.text.muted} weight="bold" />
            </TouchableOpacity>

            <Text style={styles.verifyEyebrow}>VERIFY YOUR IDENTITY</Text>
            <Text style={styles.verifyTitle}>
              Confirm <Text style={styles.verifyTitleAccent}>changes</Text>
            </Text>
            <Text style={styles.verifyDescription}>
              We sent a verification code to {original.email}. Enter it below to confirm the update.
            </Text>

            <TextInput
              style={[
                styles.verifyInput,
                verifyError ? styles.verifyInputError : null,
              ]}
              placeholder="0 0 0 0 0 0"
              placeholderTextColor="#B5B5BD"
              value={verifyCode}
              onChangeText={(val) => {
                if (verifyError) setVerifyError(null);
                setVerifyCode(val.replace(/\D/g, ''));
              }}
              keyboardType="number-pad"
              autoComplete="one-time-code"
              maxLength={6}
            />

            {verifyError ? <Text style={styles.verifyErrorText}>{verifyError}</Text> : null}

            <TouchableOpacity
              onPress={handleResendCode}
              activeOpacity={0.7}
              disabled={isResending}
              style={styles.resendButton}
            >
              <Text
                style={[
                  styles.resendButtonText,
                  isResending && styles.resendButtonTextDisabled,
                ]}
              >
                {isResending ? 'Sending code…' : 'Resend code'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.buttonPrimary,
                styles.verifyButton,
                (verifyCode.length < 4 || isVerifying) && styles.buttonPrimaryDisabled,
              ]}
              onPress={handleVerifyCode}
              activeOpacity={0.85}
              disabled={verifyCode.length < 4 || isVerifying}
            >
              {isVerifying ? (
                <ActivityIndicator color={colors.text.light} />
              ) : (
                <Text style={styles.buttonPrimaryText}>Verify & Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
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
  stickyBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EDEDF2',
  },
  buttonPrimary: {
    backgroundColor: colors.brand.primary,
    paddingVertical: 18,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonPrimaryDisabled: {
    opacity: 0.4,
  },
  buttonPrimaryText: {
    color: colors.text.light,
    fontSize: 14,
    fontFamily: fonts.bold,
    letterSpacing: 0.5,
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

  verifyOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  verifyCard: {
    width: '100%',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 28,
    paddingTop: 36,
  },
  verifyClose: {
    position: 'absolute',
    top: 14,
    right: 14,
    padding: 6,
  },
  verifyEyebrow: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: colors.text.muted,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  verifyTitle: {
    fontSize: 32,
    fontFamily: fonts.bold,
    color: colors.text.dark,
    letterSpacing: -1.2,
    marginBottom: 12,
  },
  verifyTitleAccent: {
    color: colors.brand.primary,
    fontFamily: fonts.italic,
  },
  verifyDescription: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.text.muted,
    lineHeight: 20,
    marginBottom: 24,
  },
  verifyInput: {
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    fontSize: 22,
    fontFamily: fonts.bold,
    color: colors.text.dark,
    paddingVertical: 10,
    letterSpacing: 8,
  },
  verifyInputError: {
    borderBottomWidth: 2,
    borderBottomColor: '#f07167',
  },
  verifyErrorText: {
    marginTop: 8,
    fontSize: 12,
    fontFamily: fonts.medium,
    color: '#f07167',
  },
  resendButton: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingVertical: 4,
  },
  resendButtonText: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: colors.brand.primary,
    letterSpacing: 0.4,
    textDecorationLine: 'underline',
  },
  resendButtonTextDisabled: {
    color: colors.text.muted,
    textDecorationLine: 'none',
  },
  verifyButton: {
    marginTop: 24,
  },
});
