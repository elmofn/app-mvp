import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { CaretDownIcon, CheckCircleIcon, CheckIcon, EyeIcon, EyeSlashIcon, XIcon } from 'phosphor-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import RenderHTML, { MixedStyleDeclaration } from 'react-native-render-html';
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
import { useT } from '@/src/i18n';
import { formatResendCountdown, useResendTimer } from '@/src/hooks/useResendTimer';
import {
  createAccount,
  requestValidationCode,
  setNewPassword,
  validateCode,
  ValidateCodeError,
} from '@/src/services/account';
import { getDeviceLanguage } from '@/src/services/locale';
import { formatLocationPayload, getCachedLocation, getCurrentLocation } from '@/src/services/location';
import { EditFieldKind, EditReviewFieldModal } from '@/src/components/EditReviewFieldModal';
import { getPolices, PoliceItem } from '@/src/services/policies';
import { normalizeEmail, normalizePhone, searchByEmail, searchByPhone } from '@/src/services/search';
import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

type StepKey = 'name' | 'email' | 'phone' | 'code' | 'password';

// Campos nao-textuais dos steps (id/key). O texto traduzido vive no dict
// signup.steps (mesma ordem) e e mesclado dentro do componente via tr().
type StepMeta = {
  id: number;
  key?: StepKey;
};

// Texto traduzido de cada step, resolvido por tr('signup.steps')[index].
type StepText = {
  titleFirst: string;
  titleAccent: string;
  description: string;
  label: string;
  placeholder: string;
};

type Step = StepMeta & StepText;

const STEPS: StepMeta[] = [
  { id: 1, key: 'name' },
  { id: 2, key: 'email' },
  { id: 3, key: 'phone' },
  { id: 4 },
  { id: 5, key: 'code' },
  { id: 6, key: 'password' },
];

type CheckStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

// Estilos para o RenderHTML do modal de termos no review do signup.
// Mesma vocabulary do app/terms.tsx e app/activate.tsx para manter a
// renderizacao consistente entre as telas.
const HTML_BASE_STYLE: MixedStyleDeclaration = {
  color: colors.text.dark,
  fontFamily: fonts.regular,
  fontSize: 14,
  lineHeight: 22,
};

const HTML_TAG_STYLES: Record<string, MixedStyleDeclaration> = {
  h1: {
    fontFamily: fonts.bold,
    fontSize: 24,
    color: colors.text.dark,
    letterSpacing: -0.5,
    marginTop: 24,
    marginBottom: 12,
  },
  h2: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: colors.text.dark,
    letterSpacing: -0.3,
    marginTop: 20,
    marginBottom: 10,
  },
  h3: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.text.dark,
    marginTop: 16,
    marginBottom: 8,
  },
  p: {
    fontFamily: fonts.regular,
    color: colors.text.dark,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 10,
  },
  strong: { fontFamily: fonts.bold },
  em: { fontFamily: fonts.italic },
  ol: { marginBottom: 12, paddingLeft: 18 },
  ul: { marginBottom: 12, paddingLeft: 18 },
  li: { marginBottom: 4 },
  a: { color: '#0F022D', textDecorationLine: 'underline' },
};

export default function SignupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { signIn } = useAuth();
  const showAlert = useAlert();
  const { t, tr } = useT();
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

  // Edit-field modal no review: usuario pode corrigir name ou phone sem
  // voltar. Como o account ainda nao existe nesse fluxo, edit so atualiza
  // o formData local e o CreateAccount no final envia ja os valores
  // corretos. BMG/search roda antes para checar conflito de telefone.
  type EditableField = 'name' | 'phone';
  const [editingField, setEditingField] = useState<EditableField | null>(null);

  // Modal de termos do review (step 4). Diferente do activate, aqui a
  // conta ainda nao existe, entao buscamos os polices pelo GetPolices
  // generico (idioma do device) - sem ConfirmRead, soh exibicao.
  const [termsVisible, setTermsVisible] = useState(false);
  const [polices, setPolices] = useState<PoliceItem[]>([]);
  const policesLoadedRef = useRef(false);

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
  const resendTimer = useResendTimer();

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
      resendTimer.start();
    } catch (err) {
      const message = err instanceof Error ? err.message : t('signup.alerts.verificationSendError');
      showAlert(t('signup.alerts.verificationTitle'), message);
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

  // Pre-carrega os polices assim que o usuario chega no step 4 (review).
  // O ref impede repetir a chamada se ele voltar pra cá depois.
  useEffect(() => {
    if (currentStep !== 4) return;
    if (policesLoadedRef.current) return;
    policesLoadedRef.current = true;
    getPolices(deviceLang)
      .then((items) => setPolices(items))
      .catch((err) => {
        console.warn('[signup] GetPolices failed', err);
        policesLoadedRef.current = false;
      });
  }, [currentStep, deviceLang]);

  const handleResendCode = () => {
    if (!accountId || codeSending || !resendTimer.canResend) return;
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
      const message = err instanceof Error ? err.message : t('signup.alerts.createError');
      showAlert(t('signup.alerts.signupFailedTitle'), message);
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
        const message = err instanceof Error ? err.message : t('signup.alerts.validateError');
        showAlert(t('signup.alerts.verificationTitle'), message);
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
          t('signup.alerts.signInFailed');
        showAlert(t('signup.alerts.almostThereTitle'), message, [
          { text: t('common.ok'), onPress: () => router.replace('/login') },
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

  // Mescla os campos nao-textuais locais (id/key) com o texto traduzido do
  // dict, mantendo `step` reativo a troca de idioma.
  const stepsText = tr('signup.steps') as StepText[];
  const meta = STEPS[currentStep - 1];
  const step: Step = { ...meta, ...stepsText[currentStep - 1] };
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

  // Config + save handler do EditReviewFieldModal para o review do
  // signup. O account ainda nao existe, entao apenas atualizamos o
  // formData; phone passa por BMG/search (mesma logica do step 3).
  const editConfig: Record<EditableField, {
    label: string;
    kind: EditFieldKind;
    initial: string;
    check?: (val: string) => Promise<boolean>;
  }> = {
    name: { label: 'Name', kind: 'text', initial: formData.name },
    phone: {
      label: 'Phone',
      kind: 'phone',
      initial: formData.phone,
      check: (digits) => searchByPhone(country.dial, digits),
    },
  };

  const handleEditSave = async (newValue: string) => {
    if (editingField === 'name') {
      setFormData((prev) => ({ ...prev, name: newValue }));
    } else if (editingField === 'phone') {
      setFormData((prev) => ({ ...prev, phone: newValue }));
      // O step 3 ja cacheou status do phone original - como mudou o
      // numero por aqui, marcamos available para refletir a checagem
      // recem feita pelo modal (searchByPhone retornou false).
      setPhoneStatus('available');
    }
  };

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
                    <TouchableOpacity
                      style={styles.reviewRow}
                      onPress={() => setEditingField('name')}
                      activeOpacity={0.6}
                    >
                      <Text style={styles.reviewLabel}>Name • tap to edit</Text>
                      <Text style={styles.reviewValue}>{formData.name || '—'}</Text>
                    </TouchableOpacity>
                    <View style={styles.reviewRow}>
                      <Text style={styles.reviewLabel}>E-mail</Text>
                      <Text style={styles.reviewValue}>{formData.email || '—'}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.reviewRow}
                      onPress={() => setEditingField('phone')}
                      activeOpacity={0.6}
                    >
                      <Text style={styles.reviewLabel}>Phone • tap to edit</Text>
                      <Text style={styles.reviewValue}>{reviewPhone}</Text>
                    </TouchableOpacity>
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
                      I accept the{' '}
                      <Text style={styles.linkText} onPress={() => setTermsVisible(true)}>
                        Terms and Conditions
                      </Text>{' '}
                      and the{' '}
                      <Text style={styles.linkText} onPress={() => setTermsVisible(true)}>
                        Privacy Policy
                      </Text>
                      .
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
                    disabled={codeSending || !accountId || !resendTimer.canResend}
                    style={styles.resendButton}
                  >
                    <Text
                      style={[
                        styles.resendButtonText,
                        (codeSending || !accountId || !resendTimer.canResend) &&
                          styles.resendButtonTextDisabled,
                      ]}
                    >
                      {codeSending
                        ? 'Sending code…'
                        : !resendTimer.canResend
                          ? `Resend in ${formatResendCountdown(resendTimer.secondsLeft)}`
                          : 'Resend code'}
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

      <EditReviewFieldModal
        visible={editingField !== null}
        fieldLabel={editingField ? editConfig[editingField].label : ''}
        initialValue={editingField ? editConfig[editingField].initial : ''}
        kind={editingField ? editConfig[editingField].kind : 'text'}
        checkConflict={editingField ? editConfig[editingField].check : undefined}
        onSave={handleEditSave}
        onClose={() => setEditingField(null)}
      />

      <Modal
        visible={termsVisible}
        animationType="slide"
        onRequestClose={() => setTermsVisible(false)}
      >
        <SafeAreaView style={styles.termsContainer} edges={['left', 'right', 'bottom']}>
          <LinearGradient
            colors={['#6444DA', '#4D2ACC', '#1B0F4A']}
            start={{ x: 0.1, y: 0.1 }}
            end={{ x: 0.8, y: 1.2 }}
            locations={[0, 0.2, 0.7]}
            style={[styles.termsHeader, { paddingTop: insets.top + 8 }]}
          >
            <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.2)' }]} />
            <TouchableOpacity
              style={styles.termsClose}
              onPress={() => setTermsVisible(false)}
              hitSlop={10}
            >
              <XIcon size={22} color={colors.text.light} weight="bold" />
            </TouchableOpacity>
            <View style={styles.termsHeaderBody}>
              <Text style={styles.termsEyebrow}>POLICIES</Text>
              <Text style={styles.termsTitle}>
                Terms & <Text style={styles.termsTitleAccent}>Conditions</Text>
              </Text>
            </View>
          </LinearGradient>

          <ScrollView contentContainerStyle={styles.termsBody} showsVerticalScrollIndicator={false}>
            {polices.length > 0 ? (
              polices.map((p) => (
                <View key={p.contentId} style={styles.termsPolicy}>
                  {p.title ? <Text style={styles.termsPolicyTitle}>{p.title}</Text> : null}
                  <RenderHTML
                    contentWidth={width - 48}
                    source={{ html: p.richText }}
                    baseStyle={HTML_BASE_STYLE}
                    tagsStyles={HTML_TAG_STYLES}
                    enableExperimentalMarginCollapsing
                  />
                </View>
              ))
            ) : (
              <Text style={styles.termsEmpty}>Terms not available.</Text>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
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

  termsContainer: { flex: 1, backgroundColor: '#FFFFFF' },
  termsHeader: {
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  termsClose: {
    position: 'absolute',
    top: 18,
    right: 18,
    padding: 6,
    zIndex: 2,
  },
  termsHeaderBody: {
    marginTop: 12,
  },
  termsEyebrow: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontFamily: fonts.bold,
    letterSpacing: 2,
    marginBottom: 8,
  },
  termsTitle: {
    fontSize: 36,
    fontFamily: fonts.bold,
    color: colors.text.light,
    letterSpacing: -1.2,
  },
  termsTitleAccent: {
    color: '#85EDD3',
    fontFamily: fonts.italic,
  },
  termsBody: {
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 40,
  },
  termsPolicy: {
    marginBottom: 24,
  },
  termsPolicyTitle: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: colors.text.muted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  termsEmpty: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.text.muted,
    paddingVertical: 24,
    textAlign: 'center',
  },
});
