import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { EyeIcon, EyeSlashIcon, XIcon } from 'phosphor-react-native';
import React, { useState } from 'react';
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
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/src/components/ScreenHeader';
import { useAlert } from '@/src/contexts/AlertContext';
import { useAuth } from '@/src/contexts/AuthContext';
import {
  sendPasswordRecoveryToken,
  setNewPassword,
  validateCode,
  ValidateCodeError,
} from '@/src/services/account';
import { getDeviceLanguage } from '@/src/services/locale';
import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

export default function LoginFormScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signIn, isSigningIn } = useAuth();
  const showAlert = useAlert();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Fluxo de recuperacao de senha (modal) - 3 estagios sequenciais.
  // O accountId vem do ValidateCode no estagio 2 e eh usado no SetNewPassword
  // do estagio 3, evitando ter que pedir o email duas vezes.
  type RecoveryStage = 'enterEmail' | 'verifyCode' | 'newPin';
  const [recoveryVisible, setRecoveryVisible] = useState(false);
  const [recoveryStage, setRecoveryStage] = useState<RecoveryStage>('enterEmail');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [recoveryPin, setRecoveryPin] = useState('');
  const [recoveryAccountId, setRecoveryAccountId] = useState('');
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [isSendingRecovery, setIsSendingRecovery] = useState(false);
  const [isVerifyingRecovery, setIsVerifyingRecovery] = useState(false);
  const [isResendingRecovery, setIsResendingRecovery] = useState(false);
  const [isSavingRecoveryPin, setIsSavingRecoveryPin] = useState(false);

  const recoveryLang = getDeviceLanguage();

  const handleSignIn = async () => {
    const login = email.trim();
    if (!login || !password) {
      showAlert('Missing information', 'Please enter your e-mail and password to continue.');
      return;
    }

    try {
      const response = await signIn(login, password);
      if (response.success && response.token) {
        router.replace('/(tabs)/home');
      } else {
        showAlert(
          'Login failed',
          response.errorMessage || response.message || 'Invalid e-mail or password.',
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error. Please try again.';
      showAlert('Login failed', message);
    }
  };

  const resetRecoveryState = () => {
    setRecoveryStage('enterEmail');
    setRecoveryCode('');
    setRecoveryPin('');
    setRecoveryAccountId('');
    setRecoveryError(null);
  };

  const closeRecoveryModal = () => {
    if (isSendingRecovery || isVerifyingRecovery || isSavingRecoveryPin) return;
    setRecoveryVisible(false);
    resetRecoveryState();
  };

  const handleForgotPassword = () => {
    resetRecoveryState();
    // Se o usuario ja escreveu o email na tela de login, pre-preenchemos
    // o campo de recuperacao - poupar digitacao em um momento de friccao.
    setRecoveryEmail(email.trim());
    setRecoveryVisible(true);
  };

  const handleSendRecoveryCode = async () => {
    const target = recoveryEmail.trim().toLowerCase();
    if (!target) {
      setRecoveryError('Please enter your e-mail.');
      return;
    }
    setIsSendingRecovery(true);
    setRecoveryError(null);
    try {
      await sendPasswordRecoveryToken(target, recoveryLang);
      setRecoveryEmail(target);
      setRecoveryStage('verifyCode');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not send the recovery code.';
      setRecoveryError(message);
    } finally {
      setIsSendingRecovery(false);
    }
  };

  const handleVerifyRecoveryCode = async () => {
    if (recoveryCode.length < 4) return;
    setIsVerifyingRecovery(true);
    setRecoveryError(null);
    try {
      const { accountId } = await validateCode(recoveryEmail, recoveryCode, recoveryLang);
      setRecoveryAccountId(accountId);
      setRecoveryStage('newPin');
    } catch (err) {
      if (err instanceof ValidateCodeError) {
        setRecoveryError(err.message);
      } else {
        const message = err instanceof Error ? err.message : 'Could not validate the code.';
        setRecoveryError(message);
      }
    } finally {
      setIsVerifyingRecovery(false);
    }
  };

  const handleResendRecoveryCode = async () => {
    if (isResendingRecovery) return;
    setIsResendingRecovery(true);
    setRecoveryError(null);
    setRecoveryCode('');
    try {
      await sendPasswordRecoveryToken(recoveryEmail, recoveryLang);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not send the recovery code.';
      setRecoveryError(message);
    } finally {
      setIsResendingRecovery(false);
    }
  };

  const handleConfirmRecoveryPin = async () => {
    if (recoveryPin.length !== 4) return;
    setIsSavingRecoveryPin(true);
    setRecoveryError(null);
    try {
      await setNewPassword(recoveryAccountId, recoveryPin, recoveryLang);
      setRecoveryVisible(false);
      resetRecoveryState();
      showAlert('Password updated', 'Your new PIN has been saved. Please sign in.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not save your new PIN.';
      setRecoveryError(message);
    } finally {
      setIsSavingRecoveryPin(false);
    }
  };

  const handleSignUp = () => {
    router.push('/signup');
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <StatusBar style="light" />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <LinearGradient
            colors={['#6444DA', '#4D2ACC', '#1B0F4A']}
            start={{ x: 0.1, y: 0.1 }}
            end={{ x: 0.8, y: 1.2 }}
            locations={[0, 0.2, 0.7]}
            style={[styles.headerGradient, { paddingTop: insets.top }]}
          >
            <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.2)' }]} />

            <ScreenHeader title="Login" dark={true} />

            <View style={styles.headerBody}>
              <Text style={styles.mainTitle}>
                Welcome <Text style={styles.mainTitleAccent}>Back</Text>
              </Text>
              <Text style={styles.pageDescription}>
                Enter your credentials to access your TravelBACK account.
              </Text>
            </View>
          </LinearGradient>

          <View style={styles.formContainer}>
            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>E-mail</Text>
              <TextInput
                style={[styles.inputField, focusedField === 'email' && styles.inputFieldFocused]}
                value={email}
                onChangeText={setEmail}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                placeholder="you@email.com"
                placeholderTextColor="#B5B5BD"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <View
                style={[
                  styles.passwordRow,
                  focusedField === 'password' && styles.inputFieldFocused,
                ]}
              >
                <TextInput
                  style={styles.passwordInput}
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Your password"
                  placeholderTextColor="#B5B5BD"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="password"
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

              <TouchableOpacity
                style={styles.forgotPasswordButton}
                onPress={handleForgotPassword}
                activeOpacity={0.6}
              >
                <Text style={styles.forgotPasswordText}>Forgot your password?</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, isSigningIn && styles.primaryButtonDisabled]}
              onPress={handleSignIn}
              activeOpacity={0.85}
              disabled={isSigningIn}
            >
              {isSigningIn ? (
                <ActivityIndicator color={colors.text.light} />
              ) : (
                <Text style={styles.primaryButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            <View style={styles.signupRow}>
              <Text style={styles.signupText}>Don&apos;t have an account?</Text>
              <TouchableOpacity onPress={handleSignUp} activeOpacity={0.6} hitSlop={8}>
                <Text style={styles.signupLink}>Sign up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={recoveryVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeRecoveryModal}
      >
        <KeyboardAvoidingView
          style={styles.recoveryOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.recoveryCard}>
            <TouchableOpacity
              style={styles.recoveryClose}
              onPress={closeRecoveryModal}
              hitSlop={10}
            >
              <XIcon size={18} color={colors.text.muted} weight="bold" />
            </TouchableOpacity>

            {recoveryStage === 'enterEmail' ? (
              <>
                <Text style={styles.recoveryEyebrow}>FORGOT PASSWORD</Text>
                <Text style={styles.recoveryTitle}>
                  Recover <Text style={styles.recoveryTitleAccent}>account</Text>
                </Text>
                <Text style={styles.recoveryDescription}>
                  Enter the e-mail associated with your account and we will send a verification code.
                </Text>

                <TextInput
                  style={[
                    styles.recoveryInput,
                    recoveryError ? styles.recoveryInputError : null,
                  ]}
                  placeholder="you@email.com"
                  placeholderTextColor="#B5B5BD"
                  value={recoveryEmail}
                  onChangeText={(val) => {
                    if (recoveryError) setRecoveryError(null);
                    setRecoveryEmail(val);
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                />

                {recoveryError ? (
                  <Text style={styles.recoveryErrorText}>{recoveryError}</Text>
                ) : null}

                <TouchableOpacity
                  style={[
                    styles.recoveryButton,
                    (isSendingRecovery || !recoveryEmail.trim()) && styles.recoveryButtonDisabled,
                  ]}
                  onPress={handleSendRecoveryCode}
                  activeOpacity={0.85}
                  disabled={isSendingRecovery || !recoveryEmail.trim()}
                >
                  {isSendingRecovery ? (
                    <ActivityIndicator color={colors.text.light} />
                  ) : (
                    <Text style={styles.recoveryButtonText}>Send Code</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : recoveryStage === 'verifyCode' ? (
              <>
                <Text style={styles.recoveryEyebrow}>FORGOT PASSWORD</Text>
                <Text style={styles.recoveryTitle}>
                  Verify <Text style={styles.recoveryTitleAccent}>code</Text>
                </Text>
                <Text style={styles.recoveryDescription}>
                  We sent a verification code to {recoveryEmail}. Enter it below to continue.
                </Text>

                <TextInput
                  style={[
                    styles.recoveryInput,
                    recoveryError ? styles.recoveryInputError : null,
                  ]}
                  placeholder="0 0 0 0 0 0"
                  placeholderTextColor="#B5B5BD"
                  value={recoveryCode}
                  onChangeText={(val) => {
                    if (recoveryError) setRecoveryError(null);
                    setRecoveryCode(val.replace(/\D/g, ''));
                  }}
                  keyboardType="number-pad"
                  autoComplete="one-time-code"
                  maxLength={6}
                />

                {recoveryError ? (
                  <Text style={styles.recoveryErrorText}>{recoveryError}</Text>
                ) : null}

                <TouchableOpacity
                  onPress={handleResendRecoveryCode}
                  activeOpacity={0.7}
                  disabled={isResendingRecovery}
                  style={styles.recoveryResend}
                >
                  <Text
                    style={[
                      styles.recoveryResendText,
                      isResendingRecovery && styles.recoveryResendTextDisabled,
                    ]}
                  >
                    {isResendingRecovery ? 'Sending code…' : 'Resend code'}
                  </Text>
                </TouchableOpacity>

                <Text style={styles.recoveryHelpNotice}>
                  If you don&apos;t have access to this email, please contact support.
                </Text>

                <TouchableOpacity
                  style={[
                    styles.recoveryButton,
                    (recoveryCode.length < 4 || isVerifyingRecovery) && styles.recoveryButtonDisabled,
                  ]}
                  onPress={handleVerifyRecoveryCode}
                  activeOpacity={0.85}
                  disabled={recoveryCode.length < 4 || isVerifyingRecovery}
                >
                  {isVerifyingRecovery ? (
                    <ActivityIndicator color={colors.text.light} />
                  ) : (
                    <Text style={styles.recoveryButtonText}>Verify</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.recoveryEyebrow}>FORGOT PASSWORD</Text>
                <Text style={styles.recoveryTitle}>
                  New <Text style={styles.recoveryTitleAccent}>PIN</Text>
                </Text>
                <Text style={styles.recoveryDescription}>
                  Choose a new 4-digit PIN to protect your account.
                </Text>

                <TextInput
                  style={[
                    styles.recoveryInput,
                    styles.recoveryPinInput,
                    recoveryError ? styles.recoveryInputError : null,
                  ]}
                  placeholder="0 0 0 0"
                  placeholderTextColor="#B5B5BD"
                  value={recoveryPin}
                  onChangeText={(val) => {
                    if (recoveryError) setRecoveryError(null);
                    setRecoveryPin(val.replace(/\D/g, ''));
                  }}
                  keyboardType="number-pad"
                  secureTextEntry
                  autoComplete="password-new"
                  maxLength={4}
                />

                {recoveryError ? (
                  <Text style={styles.recoveryErrorText}>{recoveryError}</Text>
                ) : null}

                <TouchableOpacity
                  style={[
                    styles.recoveryButton,
                    (recoveryPin.length !== 4 || isSavingRecoveryPin) && styles.recoveryButtonDisabled,
                  ]}
                  onPress={handleConfirmRecoveryPin}
                  activeOpacity={0.85}
                  disabled={recoveryPin.length !== 4 || isSavingRecoveryPin}
                >
                  {isSavingRecoveryPin ? (
                    <ActivityIndicator color={colors.text.light} />
                  ) : (
                    <Text style={styles.recoveryButtonText}>Save New PIN</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollContent: { flexGrow: 1 },

  headerGradient: {
    paddingBottom: 32,
  },
  headerBody: {
    paddingHorizontal: 24,
    marginTop: -12,
  },
  mainTitle: {
    fontSize: 48,
    fontFamily: fonts.bold,
    color: colors.text.light,
    letterSpacing: -2.2,
    marginBottom: 12,
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
    maxWidth: '90%',
  },

  formContainer: {
    padding: 24,
    paddingTop: 32,
  },
  formGroup: {
    marginBottom: 22,
  },
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

  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginTop: 12,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  forgotPasswordText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: colors.text.muted,
    textDecorationLine: 'underline',
  },

  primaryButton: {
    backgroundColor: colors.brand.primary,
    borderRadius: 8,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 24,
  },
  primaryButtonDisabled: { opacity: 0.6 },
  primaryButtonText: {
    color: colors.text.light,
    fontSize: 15,
    fontFamily: fonts.bold,
    letterSpacing: 0.5,
  },

  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 28,
    gap: 6,
  },
  signupText: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.text.muted,
  },
  signupLink: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: colors.text.dark,
    textDecorationLine: 'underline',
  },

  // --- RECOVERY MODAL (forgot password) ---
  recoveryOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,2,45,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  recoveryCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
  },
  recoveryClose: {
    position: 'absolute',
    top: 14,
    right: 14,
    padding: 4,
    zIndex: 1,
  },
  recoveryEyebrow: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: colors.text.muted,
    letterSpacing: 2,
    marginBottom: 8,
  },
  recoveryTitle: {
    fontSize: 28,
    fontFamily: fonts.bold,
    color: colors.text.dark,
    letterSpacing: -1,
    marginBottom: 12,
  },
  recoveryTitleAccent: {
    color: '#f07167',
    fontFamily: fonts.italic,
  },
  recoveryDescription: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.text.muted,
    lineHeight: 20,
    marginBottom: 24,
  },
  recoveryInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 17,
    fontFamily: fonts.regular,
    color: colors.text.dark,
  },
  recoveryInputError: {
    borderColor: '#f07167',
  },
  recoveryPinInput: {
    letterSpacing: 14,
    textAlign: 'center',
  },
  recoveryErrorText: {
    marginTop: 8,
    fontSize: 12,
    fontFamily: fonts.medium,
    color: '#f07167',
  },
  recoveryResend: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingVertical: 4,
  },
  recoveryResendText: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: colors.brand.primary,
    letterSpacing: 0.4,
    textDecorationLine: 'underline',
  },
  recoveryResendTextDisabled: {
    color: colors.text.muted,
  },
  recoveryHelpNotice: {
    marginTop: 16,
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.text.muted,
    lineHeight: 16,
  },
  recoveryButton: {
    backgroundColor: colors.brand.primary,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  recoveryButtonDisabled: {
    opacity: 0.5,
  },
  recoveryButtonText: {
    color: colors.text.light,
    fontSize: 15,
    fontFamily: fonts.bold,
    letterSpacing: 0.5,
  },
});
