import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { EyeIcon, EyeSlashIcon } from 'phosphor-react-native';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
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
import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

export default function LoginFormScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleSignIn = () => {
    router.replace('/(tabs)/home');
  };

  const handleForgotPassword = () => {
    Alert.alert(
      'Forgot password?',
      'Enter the e-mail associated with your account and we will send you a reset link.',
      [{ text: 'OK' }],
    );
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
                Welcome <Text style={styles.mainTitleAccent}>back</Text>
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
              style={styles.primaryButton}
              onPress={handleSignIn}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryButtonText}>Sign In</Text>
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
    letterSpacing: -1.5,
    marginBottom: 12,
  },
  mainTitleAccent: {
    color: '#85EDD3',
    fontFamily: fonts.bold_italic,
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
    borderBottomColor: '#0F022D',
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
    backgroundColor: '#0F022D',
    borderRadius: 8,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 24,
  },
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
});
