import { XIcon } from 'phosphor-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useAlert } from '@/src/contexts/AlertContext';
import { useAuth } from '@/src/contexts/AuthContext';
import { formatResendCountdown, useResendTimer } from '@/src/hooks/useResendTimer';
import { useT } from '@/src/i18n';
import { requestValidationCode, validateCode, ValidateCodeError } from '@/src/services/account';
import { getUserLanguage } from '@/src/services/locale';
import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

interface EmailVerifyModalProps {
  visible: boolean;
  onClose: () => void;
  // Chamado apos o email ser verificado com sucesso (ex.: continuar a acao que o
  // usuario tentou antes do gate).
  onVerified?: () => void;
  // Texto de contexto no passo inicial. Sem isso, usa a mensagem padrao.
  introMessage?: string;
}

// ----------------------------------------------------------------------------
// EmailVerifyModal: verificacao de EMAIL por codigo, self-contained e reutilizavel.
// Espelha o PhoneVerifyModal, trocando o canal (email) e o identifier do
// ValidateCode (o email cadastrado, que recebe o codigo). No sucesso marca
// validEmail=true no AuthContext.
//   'confirm' -> explica e dispara o codigo (RequestValidationCode canal email).
//   'code'    -> digita o codigo e valida (ValidateCode, identifier = email).
// ----------------------------------------------------------------------------
export function EmailVerifyModal({ visible, onClose, onVerified, introMessage }: EmailVerifyModalProps) {
  const { t } = useT();
  const { account, updateAccountDetails } = useAuth();
  const showAlert = useAlert();
  const resendTimer = useResendTimer();

  const accountId = account?.accountDetails.accountId ?? '';
  const email = (account?.accountDetails.email ?? '').trim();
  const lang = getUserLanguage(account);

  const [stage, setStage] = useState<'confirm' | 'code'>('confirm');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  // Cada abertura recomeca no passo de confirmacao, limpa.
  useEffect(() => {
    if (visible) {
      setStage('confirm');
      setCode('');
      setError(null);
      resendTimer.reset();
    }
    // resendTimer.reset e estavel; nao entra nas deps para nao re-disparar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const closeModal = () => {
    if (isSending || isVerifying) return;
    onClose();
  };

  // Passo 1 -> 2: dispara o codigo por email e abre a entrada.
  const handleSendCode = async () => {
    if (!accountId || isSending) return;
    setIsSending(true);
    try {
      await requestValidationCode(accountId, 'email', lang);
      resendTimer.start();
      setStage('code');
    } catch (err) {
      const message = err instanceof Error ? err.message : t('settings.sendCodeFailedMessage');
      showAlert(t('common.verification'), message);
    } finally {
      setIsSending(false);
    }
  };

  const handleResendCode = async () => {
    if (!accountId || isResending || !resendTimer.canResend) return;
    setIsResending(true);
    setError(null);
    setCode('');
    try {
      await requestValidationCode(accountId, 'email', lang);
      resendTimer.start();
    } catch (err) {
      const message = err instanceof Error ? err.message : t('settings.sendCodeFailedMessage');
      showAlert(t('common.verification'), message);
    } finally {
      setIsResending(false);
    }
  };

  const handleVerify = async () => {
    if (!accountId || code.length < 4 || isVerifying) return;
    setIsVerifying(true);
    setError(null);
    try {
      // Identifier = email cadastrado (quem recebeu o codigo).
      await validateCode(email, code, lang);
      await updateAccountDetails({ validEmail: true });
      onClose();
      showAlert(t('settings.emailVerifiedTitle'), t('settings.emailVerifiedMessage'));
      onVerified?.();
    } catch (err) {
      if (err instanceof ValidateCodeError) {
        setError(err.message);
      } else {
        const message = err instanceof Error ? err.message : t('settings.validateCodeFailedMessage');
        showAlert(t('common.verification'), message);
      }
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={closeModal}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <TouchableOpacity style={styles.close} onPress={closeModal} hitSlop={10}>
            <XIcon size={18} color={colors.text.muted} weight="bold" />
          </TouchableOpacity>

          <Text style={styles.eyebrow}>{t('settings.eyebrowVerifyEmail')}</Text>
          <Text style={styles.title}>
            {t('settings.verifyEmailTitleBase')}{' '}
            <Text style={styles.titleAccent}>{t('settings.verifyEmailTitleAccent')}</Text>
          </Text>

          {stage === 'confirm' ? (
            <>
              <Text style={styles.description}>
                {introMessage ?? t('settings.verifyEmailConfirmMessage', { email })}
              </Text>
              <TouchableOpacity
                style={[styles.buttonPrimary, styles.primarySpaced, isSending && styles.buttonPrimaryDisabled]}
                onPress={handleSendCode}
                activeOpacity={0.85}
                disabled={isSending}
              >
                {isSending ? (
                  <ActivityIndicator color={colors.text.light} />
                ) : (
                  <Text style={styles.buttonPrimaryText}>{t('settings.verifyEmailConfirmCta')}</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.description}>
                {t('settings.verifyEmailDescription', { email })}
              </Text>

              <TextInput
                style={[styles.input, error ? styles.inputError : null]}
                placeholder={t('settings.codePlaceholder')}
                placeholderTextColor="#B5B5BD"
                value={code}
                onChangeText={(val) => {
                  if (error) setError(null);
                  setCode(val.replace(/\D/g, ''));
                }}
                keyboardType="number-pad"
                autoComplete="one-time-code"
                maxLength={6}
              />

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <TouchableOpacity
                onPress={handleResendCode}
                activeOpacity={0.7}
                disabled={isResending || !resendTimer.canResend}
                style={styles.resendButton}
              >
                <Text
                  style={[
                    styles.resendButtonText,
                    (isResending || !resendTimer.canResend) && styles.resendButtonTextDisabled,
                  ]}
                >
                  {isResending
                    ? t('settings.resendSending')
                    : !resendTimer.canResend
                      ? t('settings.resendIn', { time: formatResendCountdown(resendTimer.secondsLeft) })
                      : t('settings.resendCode')}
                </Text>
              </TouchableOpacity>

              <Text style={styles.helpNotice}>{t('settings.helpNotice')}</Text>

              <TouchableOpacity
                style={[
                  styles.buttonPrimary,
                  styles.primarySpaced,
                  (code.length < 4 || isVerifying) && styles.buttonPrimaryDisabled,
                ]}
                onPress={handleVerify}
                activeOpacity={0.85}
                disabled={code.length < 4 || isVerifying}
              >
                {isVerifying ? (
                  <ActivityIndicator color={colors.text.light} />
                ) : (
                  <Text style={styles.buttonPrimaryText}>{t('settings.verify')}</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

// Mesmo vocabulario visual do PhoneVerifyModal.
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 28,
    paddingTop: 36,
  },
  close: {
    position: 'absolute',
    top: 14,
    right: 14,
    padding: 6,
    zIndex: 1,
  },
  eyebrow: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: colors.text.muted,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  title: {
    fontSize: 32,
    fontFamily: fonts.bold,
    color: colors.text.dark,
    letterSpacing: -1.2,
    marginBottom: 12,
  },
  titleAccent: {
    color: colors.brand.primary,
    fontFamily: fonts.italic,
  },
  description: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.text.muted,
    lineHeight: 20,
    marginBottom: 24,
  },
  input: {
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    fontSize: 22,
    fontFamily: fonts.bold,
    color: colors.text.dark,
    paddingVertical: 10,
    letterSpacing: 8,
  },
  inputError: {
    borderBottomWidth: 2,
    borderBottomColor: '#f07167',
  },
  errorText: {
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
  helpNotice: {
    marginTop: 16,
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.text.muted,
    lineHeight: 16,
  },
  buttonPrimary: {
    backgroundColor: colors.brand.primary,
    paddingVertical: 18,
    borderRadius: 8,
    alignItems: 'center',
  },
  primarySpaced: {
    marginTop: 24,
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
});
