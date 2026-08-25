import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { CheckIcon, EyeIcon, EyeSlashIcon, XIcon } from 'phosphor-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
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

import { EditFieldKind, EditReviewFieldModal } from '@/src/components/EditReviewFieldModal';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { useAlert } from '@/src/contexts/AlertContext';
import { useAuth } from '@/src/contexts/AuthContext';
import { useT } from '@/src/i18n';
import {
  AccountPreview,
  ActivationCodeError,
  getAccountByCode,
  setNewPassword,
  updateAccount,
} from '@/src/services/account';
import { confirmRead } from '@/src/services/alerts';
import { getDeviceLanguage } from '@/src/services/locale';
import { formatLocationPayload, getCachedLocation, getCurrentLocation } from '@/src/services/location';
import { searchByRawDigits, toE164Phone } from '@/src/services/search';
import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

type StepKey = 'code' | 'password';

type StepText = {
  titleFirst: string;
  titleAccent: string;
  description: string;
  label: string;
  placeholder: string;
};

// Os textos dos passos vivem no dicionario (activate.steps); aqui ficam
// apenas os campos nao-traduziveis (a `key` do campo de formulario).
const STEP_KEYS: (StepKey | undefined)[] = ['code', 'password', undefined];
const STEP_COUNT = STEP_KEYS.length;

// Estilos para o RenderHTML do modal de termos. Copiados de app/terms.tsx
// porque a tela de ativacao precisa renderizar a police antes do login -
// nao da pra reusar terms.tsx, que depende de AuthContext.account.
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

export default function ActivationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const showAlert = useAlert();
  const { signIn } = useAuth();
  const { t, tr } = useT();
  // Usuario ainda nao esta logado nesse fluxo - locale fica no idioma do device.
  const lang = getDeviceLanguage();

  const [currentStep, setCurrentStep] = useState(1);
  const [focusedField, setFocusedField] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [preview, setPreview] = useState<AccountPreview | null>(null);

  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);

  const [termsVisible, setTermsVisible] = useState(false);

  // Edit-field modal: o usuario pode clicar em uma row do review pra
  // corrigir name/phone via APPUpdateAccount sem voltar pro passo
  // anterior. Email e Legal ID ficam read-only (email exige verificacao
  // em fluxos logados; legalId nao faz mais parte do payload de update).
  type EditableField = 'name' | 'phoneNumber';
  const [editingField, setEditingField] = useState<EditableField | null>(null);

  const progressWidth = useSharedValue(1 / STEP_COUNT);
  const contentOpacity = useSharedValue(1);

  useEffect(() => {
    progressWidth.value = withTiming(currentStep / STEP_COUNT, { duration: 500 });
  }, [currentStep]);

  const animatedProgressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value * 100}%`,
  }));

  const animatedContentStyle = useAnimatedStyle(() => {
    const translateX = interpolate(contentOpacity.value, [0, 1], [-20, 0]);
    return { opacity: contentOpacity.value, transform: [{ translateX }] };
  });

  const changeStep = (newStep: number) => setCurrentStep(newStep);

  // Anima a saida do conteudo, troca o step no meio e anima a entrada.
  const advanceTo = (newStep: number) => {
    contentOpacity.value = withTiming(0, { duration: 200 }, (finished) => {
      if (finished) {
        runOnJS(changeStep)(newStep);
        contentOpacity.value = withTiming(1, { duration: 300 });
      }
    });
  };

  // "Voltar" (seta do header e botao fisico do Android): recua UMA etapa do
  // fluxo em vez de sair da tela inteira. So na primeira etapa sai da ativacao
  // (router.back). Ignorado durante uma operacao em andamento.
  const handleBack = () => {
    if (isVerifyingCode || isSavingPassword || isFinishing) return;
    if (currentStep > 1) {
      advanceTo(currentStep - 1);
    } else {
      router.back();
    }
  };

  // Intercepta o back fisico do Android para seguir a mesma logica por etapas.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleBack();
      return true;
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, isVerifyingCode, isSavingPassword, isFinishing]);

  const handleVerifyCode = async () => {
    if (code.trim().length === 0) {
      setStepError(t('activate.errors.enterCode'));
      return;
    }
    setIsVerifyingCode(true);
    setStepError(null);
    try {
      const result = await getAccountByCode(code, lang);
      setPreview(result);
      advanceTo(2);
    } catch (err) {
      if (err instanceof ActivationCodeError) {
        setStepError(err.message);
      } else {
        const message = err instanceof Error ? err.message : t('activate.errors.validateCode');
        showAlert(t('activate.alerts.activationTitle'), message);
      }
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const handleSavePassword = async () => {
    if (!preview) return;
    if (password.length !== 4) {
      setStepError(t('activate.errors.usePin'));
      return;
    }
    setIsSavingPassword(true);
    setStepError(null);
    try {
      await setNewPassword(preview.accountId, password, lang);
      advanceTo(3);
    } catch (err) {
      const message = err instanceof Error ? err.message : t('activate.errors.savePassword');
      setStepError(message);
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleFinish = async () => {
    if (!preview) return;
    if (!acceptedTerms) {
      showAlert(t('activate.alerts.termsTitle'), t('activate.alerts.termsMessage'));
      return;
    }
    setIsFinishing(true);
    setStepError(null);
    try {
      // ConfirmRead por police em paralelo - falhas de uma nao bloqueiam
      // o login, apenas viram warning no console.
      if (preview.polices.length > 0) {
        await Promise.all(
          preview.polices.map((p) =>
            confirmRead(p.contentId, preview.accountId).catch((err) => {
              console.warn('[activate] confirmRead failed for', p.contentId, err);
            }),
          ),
        );
      }

      const response = await signIn(preview.email, password);
      if (response.success && response.token && response.accountDetails) {
        router.replace('/(tabs)/home');
        return;
      }
      const message =
        response.errorMessage ||
        response.message ||
        t('activate.alerts.signInFailed');
      showAlert(t('activate.alerts.activatedTitle'), message, [
        { text: t('common.ok'), onPress: () => router.replace('/login') },
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : t('activate.errors.finish');
      showAlert(t('activate.alerts.activationTitle'), message);
    } finally {
      setIsFinishing(false);
    }
  };

  const handleNext = () => {
    if (currentStep === 1) {
      handleVerifyCode();
      return;
    }
    if (currentStep === 2) {
      handleSavePassword();
      return;
    }
    if (currentStep === 3) {
      handleFinish();
    }
  };

  // Resolve label/kind/initial/conflict checker para cada field editavel.
  // Mantem o componente do modal generico.
  const editConfig: Record<EditableField, {
    label: string;
    kind: EditFieldKind;
    initial: string;
    check?: (val: string) => Promise<boolean>;
  }> = {
    name: { label: t('activate.edit.name'), kind: 'text', initial: preview?.name ?? '' },
    phoneNumber: {
      label: t('activate.edit.phone'),
      kind: 'phone',
      initial: preview?.phoneNumber ?? '',
      check: (digits) => searchByRawDigits(digits),
    },
  };

  const handleEditSave = async (newValue: string) => {
    if (!preview) return;
    const patched: AccountPreview = (() => {
      if (editingField === 'name') return { ...preview, name: newValue };
      if (editingField === 'phoneNumber') return { ...preview, phoneNumber: newValue };
      return preview;
    })();

    let coords = getCachedLocation();
    if (!coords) coords = await getCurrentLocation();
    const geolocation = formatLocationPayload(coords);

    await updateAccount(
      {
        accountId: patched.accountId,
        name: patched.name,
        email: patched.email,
        // Envia com "+" (E.164) - determinante para validacao/envio de mensagens.
        phoneNumber: toE164Phone(patched.phoneNumber),
        currencyId: patched.currencyId,
        countryId: patched.countryId,
        geolocation,
      },
      lang,
    );

    setPreview(patched);
  };

  const stepsText = tr('activate.steps') as StepText[];
  const step = { ...stepsText[currentStep - 1], key: STEP_KEYS[currentStep - 1] };
  const isReview = currentStep === 3;
  const isPassword = currentStep === 2;
  const isCode = currentStep === 1;

  const inputValue = isCode ? code : isPassword ? password : '';
  const setInputValue = (val: string) => {
    if (stepError) setStepError(null);
    if (isCode) setCode(val);
    else if (isPassword) setPassword(val.replace(/\D/g, ''));
  };

  const isBusy = isVerifyingCode || isSavingPassword || isFinishing;
  const ctaLabel = isReview ? t('activate.cta.finish') : t('activate.cta.next');
  const disabled = (isReview && !acceptedTerms) || isBusy;

  // Tipagem do `field` casa com EditableField para preservar a opcao de
  // edicao. Email e Legal ID permanecem read-only (null no field).
  type ReviewRow = { label: string; value: string; field: EditableField | null };
  const reviewRows: ReviewRow[] = preview
    ? (
        [
          { label: t('activate.review.name'), value: preview.name, field: 'name' },
          { label: t('activate.review.email'), value: preview.email, field: null },
          { label: t('activate.review.phone'), value: preview.phoneNumber, field: 'phoneNumber' },
          { label: t('activate.review.legalId'), value: preview.legalId, field: null },
        ] satisfies ReviewRow[]
      ).filter((r) => r.value.trim().length > 0)
    : [];

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

        <ScreenHeader title={t('activate.headerTitle')} dark={true} onBack={handleBack} />

        <View style={styles.stepCounter}>
          <Text>
            <Text style={styles.stepCurrent}>
              {String(currentStep).padStart(2, '0')}
            </Text>
            <Text style={styles.stepTotal}>
              {` / ${String(STEP_COUNT).padStart(2, '0')}`}
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
                    {reviewRows.length > 0 ? (
                      reviewRows.map((row) => {
                        const field = row.field;
                        return field ? (
                          <TouchableOpacity
                            key={row.label}
                            style={styles.reviewRow}
                            onPress={() => setEditingField(field)}
                            activeOpacity={0.6}
                          >
                            <Text style={styles.reviewLabel}>{t('activate.review.tapToEdit', { label: row.label })}</Text>
                            <Text style={styles.reviewValue}>{row.value}</Text>
                          </TouchableOpacity>
                        ) : (
                          <View key={row.label} style={styles.reviewRow}>
                            <Text style={styles.reviewLabel}>{row.label}</Text>
                            <Text style={styles.reviewValue}>{row.value}</Text>
                          </View>
                        );
                      })
                    ) : (
                      <Text style={styles.reviewValue}>{t('activate.review.empty')}</Text>
                    )}
                  </View>

                  <TouchableOpacity
                    style={styles.checkboxWrapper}
                    onPress={() => setAcceptedTerms((v) => !v)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.checkbox, acceptedTerms && styles.checkboxActive]}>
                      {acceptedTerms && (
                        <CheckIcon size={14} color={colors.text.light} weight="bold" />
                      )}
                    </View>
                    <Text style={styles.checkboxText}>
                      {t('activate.terms.accept')}
                      <Text style={styles.linkText} onPress={() => setTermsVisible(true)}>
                        {t('activate.terms.termsLink')}
                      </Text>
                      {t('activate.terms.and')}
                      <Text style={styles.linkText} onPress={() => setTermsVisible(true)}>
                        {t('activate.terms.privacyLink')}
                      </Text>
                      {t('activate.terms.end')}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : isPassword ? (
                <View
                  style={[styles.passwordRow, focusedField && styles.inputFieldFocused]}
                >
                  <TextInput
                    style={styles.passwordInput}
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
                    onChangeText={setInputValue}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
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
              ) : (
                <TextInput
                  style={[styles.inputField, focusedField && styles.inputFieldFocused]}
                  placeholder={step.placeholder}
                  placeholderTextColor="#B5B5BD"
                  onFocus={() => setFocusedField(true)}
                  onBlur={() => setFocusedField(false)}
                  value={inputValue}
                  onChangeText={setInputValue}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              )}

              {stepError ? <Text style={styles.errorText}>{stepError}</Text> : null}
            </Animated.View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.primaryButton, disabled && styles.primaryButtonDisabled]}
                onPress={handleNext}
                activeOpacity={0.85}
                disabled={disabled}
              >
                {isBusy ? (
                  <ActivityIndicator color={colors.text.light} />
                ) : (
                  <Text style={styles.primaryButtonText}>{ctaLabel}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

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
              <Text style={styles.termsEyebrow}>{t('activate.termsModal.eyebrow')}</Text>
              <Text style={styles.termsTitle}>
                {t('activate.termsModal.titleFirst')}<Text style={styles.termsTitleAccent}>{t('activate.termsModal.titleAccent')}</Text>
              </Text>
            </View>
          </LinearGradient>

          <ScrollView contentContainerStyle={styles.termsBody} showsVerticalScrollIndicator={false}>
            {preview?.polices && preview.polices.length > 0 ? (
              <RenderHTML
                contentWidth={width - 48}
                source={{ html: preview.polices[0].richText }}
                baseStyle={HTML_BASE_STYLE}
                tagsStyles={HTML_TAG_STYLES}
                enableExperimentalMarginCollapsing
              />
            ) : (
              <Text style={styles.termsEmpty}>{t('activate.termsModal.empty')}</Text>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
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
    color: 'rgba(255,255,255,0.7)',
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
  inputFieldFocused: {
    borderBottomWidth: 2,
    borderBottomColor: colors.brand.primary,
  },

  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  passwordInput: {
    flex: 1,
    fontSize: 17,
    fontFamily: fonts.regular,
    color: colors.text.dark,
    paddingVertical: 10,
  },
  eyeButton: {
    paddingHorizontal: 4,
    paddingVertical: 4,
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
    textDecorationLine: 'underline',
  },

  errorText: {
    marginTop: 10,
    fontSize: 12,
    fontFamily: fonts.medium,
    color: '#f07167',
  },

  buttonContainer: { marginTop: 32 },
  primaryButton: {
    backgroundColor: colors.brand.primary,
    borderRadius: 8,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonDisabled: { opacity: 0.4 },
  primaryButtonText: {
    color: colors.text.light,
    fontSize: 15,
    fontFamily: fonts.bold,
    letterSpacing: 0.5,
  },

  // --- TERMS MODAL ---
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
  termsEmpty: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.text.muted,
    paddingVertical: 24,
    textAlign: 'center',
  },
});
