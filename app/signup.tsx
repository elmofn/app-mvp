import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { CaretDownIcon, CheckCircleIcon, CheckIcon, EyeIcon, EyeSlashIcon } from 'phosphor-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { CountryPicker } from '@/src/components/CountryPicker';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { useAlert } from '@/src/contexts/AlertContext';
import { useAuth } from '@/src/contexts/AuthContext';
import { Country, DEFAULT_COUNTRY } from '@/src/data/countries';
import { useDebounce } from '@/src/hooks/useDebounce';
import {
  createAccount,
  requestValidationCode,
  setNewPassword,
  validateCode,
  ValidateCodeError,
} from '@/src/services/account';
import { getDeviceLanguage } from '@/src/services/locale';
import { formatLocationPayload, getCachedLocation, getCurrentLocation } from '@/src/services/location';
import { normalizeEmail, normalizePhone, searchByEmail, searchByPhone } from '@/src/services/search';
import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

type StepKey = 'name' | 'email' | 'phone' | 'code' | 'password';

type Step = {
  id: number;
  titleFirst: string;
  titleAccent: string;
  description: string;
  label: string;
  placeholder: string;
  key?: StepKey;
};

const STEPS: Step[] = [
  {
    id: 1,
    titleFirst: 'Full',
    titleAccent: 'Name',
    description: 'To get started, share your full name exactly as it appears on your ID.',
    label: 'Full Name',
    placeholder: 'Your full name',
    key: 'name',
  },
  {
    id: 2,
    titleFirst: 'Your',
    titleAccent: 'E-mail',
    description: 'Now share the e-mail you want to use to access your TravelBACK account.',
    label: 'E-mail',
    placeholder: 'you@email.com',
    key: 'email',
  },
  {
    id: 3,
    titleFirst: 'Phone',
    titleAccent: 'Number',
    description: 'Enter your mobile number with country code so we can keep your account safe.',
    label: 'Phone Number',
    placeholder: '11 99999-9999',
    key: 'phone',
  },
  {
    id: 4,
    titleFirst: 'Review',
    titleAccent: 'Details',
    description: 'Make sure everything is correct and accept the terms to continue.',
    label: 'Account Summary',
    placeholder: '',
  },
  {
    id: 5,
    titleFirst: 'Verify',
    titleAccent: 'E-mail',
    description: 'We sent a 6-digit code to your e-mail. Enter it below to validate your address.',
    label: 'Verification Code',
    placeholder: '0 0 0 0 0 0',
    key: 'code',
  },
  {
    id: 6,
    titleFirst: 'Create',
    titleAccent: 'PIN',
    description: 'Last step: choose a 4-digit PIN to protect your account.',
    label: '4-digit PIN',
    placeholder: '0 0 0 0',
    key: 'password',
  },
];

type CheckStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

export default function SignupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();
  const showAlert = useAlert();
  // Idioma do device - usado tanto no payload do CreateAccount como na
  // escolha da mensagem localizada dos erros retornados pelo backend.
  const deviceLang = getDeviceLanguage();

  const [currentStep, setCurrentStep] = useState(1);
  const [focusedField, setFocusedField] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    code: '',
    password: '',
  });

  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);

  const [emailStatus, setEmailStatus] = useState<CheckStatus>('idle');
  const [phoneStatus, setPhoneStatus] = useState<CheckStatus>('idle');

  // accountId real (retornado pelo CreateAccount). Usado no
  // RequestValidationCode e no SetNewPasswordAccount.
  const [accountId, setAccountId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [codeSending, setCodeSending] = useState(false);
  // Guarda se ja disparamos o envio de codigo para o step 5 atual -
  // evita re-disparo a cada render. Reseta no botao "Resend".
  const codeRequestedRef = useRef(false);

  const debouncedEmail = useDebounce(formData.email, 500);
  const debouncedPhone = useDebounce(formData.phone, 500);

  // Verifica e-mail no debounce: a flag cancelled descarta requests obsoletos.
  useEffect(() => {
    const email = debouncedEmail.trim();
    if (!email) {
      setEmailStatus('idle');
      return;
    }
    const normalized = normalizeEmail(email);
    if (!normalized.includes('@') || !normalized.includes('.')) {
      setEmailStatus('invalid');
      return;
    }
    let cancelled = false;
    setEmailStatus('checking');
    searchByEmail(email)
      .then((exists) => {
        if (cancelled) return;
        setEmailStatus(exists ? 'taken' : 'available');
      })
      .catch(() => {
        if (cancelled) return;
        setEmailStatus('idle');
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedEmail]);

  // Verifica telefone: combina DDI + digitos do numero local.
  useEffect(() => {
    const local = debouncedPhone.replace(/\D/g, '');
    if (!local) {
      setPhoneStatus('idle');
      return;
    }
    const normalized = normalizePhone(country.dial, local);
    if (normalized.length < 8) {
      setPhoneStatus('invalid');
      return;
    }
    let cancelled = false;
    setPhoneStatus('checking');
    searchByPhone(country.dial, local)
      .then((exists) => {
        if (cancelled) return;
        setPhoneStatus(exists ? 'taken' : 'available');
      })
      .catch(() => {
        if (cancelled) return;
        setPhoneStatus('idle');
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedPhone, country.dial]);

  const progressWidth = useSharedValue(1 / STEPS.length);
  const contentOpacity = useSharedValue(1);

  useEffect(() => {
    progressWidth.value = withTiming(currentStep / STEPS.length, { duration: 500 });
  }, [currentStep]);

  const animatedProgressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value * 100}%`,
  }));

  const animatedContentStyle = useAnimatedStyle(() => {
    const translateX = interpolate(contentOpacity.value, [0, 1], [-20, 0]);
    return { opacity: contentOpacity.value, transform: [{ translateX }] };
  });

  const changeStep = (newStep: number) => setCurrentStep(newStep);

  // Anima a saida do step atual e entra no proximo. Wrapper reutilizado
  // por todos os handlers para manter a transicao identica a anterior.
  const advanceStep = () => {
    contentOpacity.value = withTiming(0, { duration: 200 }, (finished) => {
      if (finished) {
        runOnJS(changeStep)(currentStep + 1);
        contentOpacity.value = withTiming(1, { duration: 300 });
      }
    });
  };

  // Dispara o RequestValidationCode (email por enquanto). Usado tanto no
  // auto-disparo da entrada do step 5 quanto no botao "Resend".
  const sendValidationCode = async (id: string) => {
    setCodeSending(true);
    setCodeError(null);
    try {
      await requestValidationCode(id, 'email', deviceLang);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not send the verification code.';
      showAlert('Verification', message);
    } finally {
      setCodeSending(false);
    }
  };

  // Quando o usuario chega ao step 5 com um accountId valido, envia o
  // codigo automaticamente. O ref impede reenvio a cada render.
  useEffect(() => {
    if (currentStep !== 5) return;
    if (!accountId) return;
    if (codeRequestedRef.current) return;
    codeRequestedRef.current = true;
    sendValidationCode(accountId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, accountId]);

  const handleResendCode = () => {
    if (!accountId || codeSending) return;
    codeRequestedRef.current = false;
    setFormData((curr) => ({ ...curr, code: '' }));
    setCodeError(null);
    sendValidationCode(accountId);
  };

  const handleCreateAccount = async () => {
    setIsSubmitting(true);
    try {
      // Garante uma coordenada antes da chamada. Se o usuario negou
      // permissao, segue com string vazia (backend aceita).
      let coords = getCachedLocation();
      if (!coords) coords = await getCurrentLocation();
      const geolocation = formatLocationPayload(coords);
      const phoneDigits = formData.phone.replace(/\D/g, '');
      const phoneNumber = normalizePhone(country.dial, phoneDigits);

      const { accountId: newId } = await createAccount(
        {
          name: formData.name.trim(),
          email: normalizeEmail(formData.email),
          phoneNumber,
          language: deviceLang,
          geolocation,
        },
        deviceLang,
      );
      setAccountId(newId);
      advanceStep();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not create your account.';
      showAlert('Sign up failed', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleValidateCode = async () => {
    setIsSubmitting(true);
    setCodeError(null);
    try {
      await validateCode(normalizeEmail(formData.email), formData.code, deviceLang);
      advanceStep();
    } catch (err) {
      if (err instanceof ValidateCodeError) {
        setCodeError(err.message);
      } else {
        const message = err instanceof Error ? err.message : 'Could not validate the code.';
        showAlert('Verification', message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinish = async () => {
    setIsSubmitting(true);
    try {
      await setNewPassword(accountId, formData.password, deviceLang);
      const response = await signIn(normalizeEmail(formData.email), formData.password);
      if (response.success && response.token && response.accountDetails) {
        router.replace('/(tabs)/home');
      } else {
        const message =
          response.errorMessage ||
          response.message ||
          'Your account was created but sign in failed. Please log in manually.';
        showAlert('Almost there', message, [
          { text: 'OK', onPress: () => router.replace('/login') },
        ]);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not save your PIN.';
      showAlert('Sign up failed', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    if (isSubmitting) return;
    if (currentStep === 4 && !acceptedTerms) return;
    if (currentStep === 2 && emailStatus !== 'available') return;
    if (currentStep === 3 && phoneStatus !== 'available') return;

    if (currentStep === 4) {
      handleCreateAccount();
      return;
    }
    if (currentStep === 5) {
      handleValidateCode();
      return;
    }
    if (currentStep === 6) {
      handleFinish();
      return;
    }
    advanceStep();
  };

  const step = STEPS[currentStep - 1];
  const isReview = currentStep === 4;
  const isPassword = currentStep === 6;
  const isCode = currentStep === 5;
  const isEmail = currentStep === 2;
  const isPhone = currentStep === 3;

  const inputValue = step.key ? formData[step.key] : '';
  const setInputValue = (val: string) => {
    if (step.key) setFormData({ ...formData, [step.key]: val });
  };

  const ctaLabel = isReview ? 'Create Account' : currentStep === STEPS.length ? 'Finish' : 'Next';
  const pinIncomplete = isPassword && formData.password.length !== 4;
  const disabled =
    isSubmitting ||
    (isReview && !acceptedTerms) ||
    (isEmail && emailStatus !== 'available') ||
    (isPhone && phoneStatus !== 'available') ||
    pinIncomplete;

  const reviewPhone = formData.phone
    ? `${country.dial} ${formData.phone}`
    : '—';

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <StatusBar style="light" />

      <LinearGradient
        colors={['#6444DA', '#4D2ACC', '#1B0F4A']}
        start={{ x: 0.1, y: 0.1 }}
        end={{ x: 0.8, y: 1.2 }}
        locations={[0, 0.2, 0.7]}
        style={[styles.headerGradient, { paddingTop: insets.top }]}
      >
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.2)' }]} />

        <ScreenHeader title="Sign Up" dark={true} />

        <View style={styles.stepCounter}>
          <Text>
            <Text style={styles.stepCurrent}>
              {String(currentStep).padStart(2, '0')}
            </Text>
            <Text style={styles.stepTotal}>
              {` / ${String(STEPS.length).padStart(2, '0')}`}
            </Text>
          </Text>
        </View>

        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressBar, animatedProgressStyle]} />
        </View>

        <Animated.View style={[styles.headerBody, animatedContentStyle]}>
          <Text style={styles.mainTitle}>
            {step.titleFirst} <Text style={styles.mainTitleAccent}>{step.titleAccent}</Text>
          </Text>
          <Text style={styles.pageDescription}>{step.description}</Text>
        </Animated.View>
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
            <Animated.View style={[styles.formGroup, animatedContentStyle]}>
              <Text style={styles.inputLabel}>{step.label}</Text>

              {isReview ? (
                <View>
                  <View style={styles.reviewCard}>
                    <View style={styles.reviewRow}>
                      <Text style={styles.reviewLabel}>Name</Text>
                      <Text style={styles.reviewValue}>{formData.name || '—'}</Text>
                    </View>
                    <View style={styles.reviewRow}>
                      <Text style={styles.reviewLabel}>E-mail</Text>
                      <Text style={styles.reviewValue}>{formData.email || '—'}</Text>
                    </View>
                    <View style={styles.reviewRow}>
                      <Text style={styles.reviewLabel}>Phone</Text>
                      <Text style={styles.reviewValue}>{reviewPhone}</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.checkboxWrapper}
                    onPress={() => setAcceptedTerms((v) => !v)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.checkbox, acceptedTerms && styles.checkboxActive]}>
                      {acceptedTerms && <CheckIcon size={14} color={colors.text.light} weight="bold" />}
                    </View>
                    <Text style={styles.checkboxText}>
                      I accept the <Text style={styles.linkText}>Terms and Conditions</Text> and the{' '}
                      <Text style={styles.linkText}>Privacy Policy</Text>.
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : isPassword ? (
                <View style={[styles.inputRow, focusedField && styles.inputFieldFocused]}>
                  <TextInput
                    style={[styles.inputFlex, styles.pinInput]}
                    placeholder={step.placeholder}
                    placeholderTextColor="#B5B5BD"
                    onFocus={() => setFocusedField(true)}
                    onBlur={() => setFocusedField(false)}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="password-new"
                    keyboardType="number-pad"
                    maxLength={4}
                    value={inputValue}
                    onChangeText={(val) => setInputValue(val.replace(/\D/g, ''))}
                  />
                  <TouchableOpacity
                    style={styles.adornment}
                    onPress={() => setShowPassword((v) => !v)}
                    activeOpacity={0.6}
                    hitSlop={8}
                  >
                    {showPassword ? (
                      <EyeSlashIcon size={20} color={colors.text.muted} weight="regular" />
                    ) : (
                      <EyeIcon size={20} color={colors.text.muted} weight="regular" />
                    )}
                  </TouchableOpacity>
                </View>
              ) : isPhone ? (
                <View>
                  <View
                    style={[
                      styles.inputRow,
                      focusedField && styles.inputFieldFocused,
                      phoneStatus === 'taken' && styles.inputFieldError,
                    ]}
                  >
                    <TouchableOpacity
                      style={styles.countryTrigger}
                      onPress={() => setCountryPickerOpen(true)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.countryFlag}>{country.flag}</Text>
                      <Text style={styles.countryDial}>{country.dial}</Text>
                      <CaretDownIcon size={12} color={colors.text.muted} weight="bold" />
                    </TouchableOpacity>

                    <TextInput
                      style={styles.inputFlex}
                      placeholder={step.placeholder}
                      placeholderTextColor="#B5B5BD"
                      onFocus={() => setFocusedField(true)}
                      onBlur={() => setFocusedField(false)}
                      value={inputValue}
                      onChangeText={setInputValue}
                      keyboardType="phone-pad"
                      autoComplete="tel"
                    />

                    <View style={styles.adornment}>
                      <StatusIndicator status={phoneStatus} />
                    </View>
                  </View>
                  <StatusMessage
                    status={phoneStatus}
                    takenMessage="An account with this phone number already exists."
                  />
                </View>
              ) : isEmail ? (
                <View>
                  <View
                    style={[
                      styles.inputRow,
                      focusedField && styles.inputFieldFocused,
                      emailStatus === 'taken' && styles.inputFieldError,
                    ]}
                  >
                    <TextInput
                      style={styles.inputFlex}
                      placeholder={step.placeholder}
                      placeholderTextColor="#B5B5BD"
                      onFocus={() => setFocusedField(true)}
                      onBlur={() => setFocusedField(false)}
                      value={inputValue}
                      onChangeText={setInputValue}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="email"
                    />
                    <View style={styles.adornment}>
                      <StatusIndicator status={emailStatus} />
                    </View>
                  </View>
                  <StatusMessage
                    status={emailStatus}
                    takenMessage="An account with this e-mail already exists."
                  />
                </View>
              ) : isCode ? (
                <View>
                  <TextInput
                    style={[
                      styles.inputField,
                      focusedField && styles.inputFieldFocused,
                      codeError ? styles.inputFieldError : null,
                    ]}
                    placeholder={step.placeholder}
                    placeholderTextColor="#B5B5BD"
                    onFocus={() => setFocusedField(true)}
                    onBlur={() => setFocusedField(false)}
                    value={inputValue}
                    onChangeText={(val) => {
                      if (codeError) setCodeError(null);
                      setInputValue(val.replace(/\D/g, ''));
                    }}
                    keyboardType="number-pad"
                    autoComplete="one-time-code"
                    maxLength={6}
                  />
                  {codeError ? <Text style={styles.errorText}>{codeError}</Text> : null}
                  <TouchableOpacity
                    onPress={handleResendCode}
                    activeOpacity={0.7}
                    disabled={codeSending || !accountId}
                    style={styles.resendButton}
                  >
                    <Text
                      style={[
                        styles.resendButtonText,
                        (codeSending || !accountId) && styles.resendButtonTextDisabled,
                      ]}
                    >
                      {codeSending ? 'Sending code…' : 'Resend code'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TextInput
                  style={[styles.inputField, focusedField && styles.inputFieldFocused]}
                  placeholder={step.placeholder}
                  placeholderTextColor="#B5B5BD"
                  onFocus={() => setFocusedField(true)}
                  onBlur={() => setFocusedField(false)}
                  value={inputValue}
                  onChangeText={setInputValue}
                  autoCapitalize={currentStep === 1 ? 'words' : 'sentences'}
                  autoComplete={currentStep === 1 ? 'name' : 'off'}
                />
              )}
            </Animated.View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.primaryButton, disabled && styles.primaryButtonDisabled]}
                onPress={handleNext}
                activeOpacity={0.85}
                disabled={disabled}
              >
                {isSubmitting ? (
                  <ActivityIndicator color={colors.text.light} />
                ) : (
                  <Text style={styles.primaryButtonText}>{ctaLabel}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <CountryPicker
        visible={countryPickerOpen}
        onClose={() => setCountryPickerOpen(false)}
        onSelect={(c) => setCountry(c)}
        selectedCode={country.code}
      />
    </SafeAreaView>
  );
}

function StatusIndicator({ status }: { status: CheckStatus }) {
  if (status === 'checking') {
    return <ActivityIndicator size="small" color={colors.text.muted} />;
  }
  if (status === 'available') {
    return <CheckCircleIcon size={20} color="#00A86B" weight="fill" />;
  }
  return null;
}

function StatusMessage({ status, takenMessage }: { status: CheckStatus; takenMessage: string }) {
  if (status === 'taken') {
    return <Text style={styles.errorText}>{takenMessage}</Text>;
  }
  return null;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollContent: { flexGrow: 1 },

  headerGradient: { paddingBottom: 32 },
  stepCounter: {
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  stepCurrent: {
    fontSize: 24,
    fontFamily: fonts.bold,
    color: colors.text.light,
    letterSpacing: -1.2,
  },
  stepTotal: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  progressTrack: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 24,
    borderRadius: 2,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#85EDD3',
  },
  headerBody: {
    paddingHorizontal: 24,
  },
  mainTitle: {
    fontSize: 48,
    fontFamily: fonts.bold,
    color: colors.text.light,
    letterSpacing: -2.8,
    marginBottom: 8,
  },
  mainTitleAccent: {
    color: '#85EDD3',
    fontFamily: fonts.italic,
  },
  pageDescription: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 20,
    maxWidth: '95%',
  },

  formContainer: {
    padding: 24,
    paddingTop: 32,
    flex: 1,
    justifyContent: 'space-between',
  },
  formGroup: { marginBottom: 22 },
  inputLabel: {
    fontSize: 13,
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
    paddingVertical: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  inputFlex: {
    flex: 1,
    fontSize: 17,
    fontFamily: fonts.regular,
    color: colors.text.dark,
    paddingVertical: 10,
  },
  adornment: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  inputFieldFocused: {
    borderBottomWidth: 2,
    borderBottomColor: colors.brand.primary,
  },
  inputFieldError: {
    borderBottomWidth: 2,
    borderBottomColor: '#f07167',
  },
  errorText: {
    marginTop: 8,
    fontSize: 12,
    fontFamily: fonts.medium,
    color: '#f07167',
  },
  pinInput: {
    letterSpacing: 14,
    fontFamily: fonts.bold,
    fontSize: 22,
    textAlign: 'left',
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

  countryTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingRight: 12,
    marginRight: 10,
    borderRightWidth: 1,
    borderRightColor: '#E5E5E5',
  },
  countryFlag: {
    fontSize: 20,
  },
  countryDial: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: colors.text.dark,
    letterSpacing: -0.2,
  },

  reviewCard: {
    backgroundColor: '#F4F4F5',
    borderRadius: 12,
    padding: 20,
    gap: 14,
    marginBottom: 8,
  },
  reviewRow: {
    flexDirection: 'column',
    gap: 2,
  },
  reviewLabel: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: colors.text.muted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  reviewValue: {
    fontSize: 16,
    fontFamily: fonts.regular,
    color: colors.text.dark,
  },

  checkboxWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: 18,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#D5D5DB',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  checkboxActive: {
    backgroundColor: '#0F022D',
    borderColor: '#0F022D',
  },
  checkboxText: {
    flex: 1,
    fontSize: 13,
    color: colors.text.muted,
    lineHeight: 18,
    fontFamily: fonts.regular,
  },
  linkText: {
    color: colors.text.dark,
    fontFamily: fonts.bold,
  },

  buttonContainer: { marginTop: 32 },
  primaryButton: {
    backgroundColor: colors.brand.primary,
    borderRadius: 8,
    paddingVertical: 18,
    alignItems: 'center',
  },
  primaryButtonDisabled: { opacity: 0.4 },
  primaryButtonText: {
    color: colors.text.light,
    fontSize: 15,
    fontFamily: fonts.bold,
    letterSpacing: 0.5,
  },
});
