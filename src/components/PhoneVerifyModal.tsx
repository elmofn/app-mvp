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

// Formata o telefone (so para exibir na descricao). Espelha o helper de
// settings.tsx: BR com/sem DDI, caso contrario devolve o que veio.
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

interface PhoneVerifyModalProps {
  visible: boolean;
  onClose: () => void;
  // Chamado apos o telefone ser verificado com sucesso (ex.: continuar a acao
  // que o usuario tentou antes do gate).
  onVerified?: () => void;
  // Texto de contexto no passo inicial (ex.: "verifique para usar o TravelShop").
  // Sem isso, usa a mensagem padrao de confirmacao de envio.
  introMessage?: string;
}

// ----------------------------------------------------------------------------
// PhoneVerifyModal: verificacao de telefone por SMS, self-contained e reutilizavel.
// Dois passos no proprio modal:
//   'confirm' -> explica e dispara o codigo (RequestValidationCode canal SMS).
//   'code'    -> digita o codigo e valida (ValidateCode, identifier = telefone
//                em digitos, sem "+"). No sucesso marca validPhoneNumber=true.
// Vocabulario visual identico ao AuthCodeModal / modal de verificacao do settings.
// ----------------------------------------------------------------------------
export function PhoneVerifyModal({ visible, onClose, onVerified, introMessage }: PhoneVerifyModalProps) {
  const { t } = useT();
  const { account, updateAccountDetails } = useAuth();
  const showAlert = useAlert();
  const resendTimer = useResendTimer();

  const accountId = account?.accountDetails.accountId ?? '';
  const phoneDigits = (account?.accountDetails.phoneNumber ?? '').replace(/\D/g, '');
  const phoneLabel = formatPhone(account?.accountDetails.phoneNumber ?? '');
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

  // Passo 1 -> 2: dispara o SMS e abre a entrada de codigo.
  const handleSendCode = async () => {
    if (!accountId || isSending) return;
    setIsSending(true);
    try {
      await requestValidationCode(accountId, 'phone', lang);
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
      await requestValidationCode(accountId, 'phone', lang);
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
      // Identifier = telefone em digitos, sem "+".
      await validateCode(phoneDigits, code, lang);
      await updateAccountDetails({ validPhoneNumber: true });
      onClose();
      showAlert(t('settings.phoneVerifiedTitle'), t('settings.phoneVerifiedMessage'));
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

          <Text style={styles.eyebrow}>{t('settings.eyebrowVerifyPhone')}</Text>
          <Text style={styles.title}>
            {t('settings.verifyPhoneTitleBase')}{' '}
            <Text style={styles.titleAccent}>{t('settings.verifyPhoneTitleAccent')}</Text>
          </Text>

          {stage === 'confirm' ? (
            <>
              <Text style={styles.description}>
                {introMessage ?? t('settings.verifyPhoneConfirmMessage', { phone: phoneLabel })}
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
                  <Text style={styles.buttonPrimaryText}>{t('settings.verifyPhoneConfirmCta')}</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.description}>
                {t('settings.verifyPhoneDescription', { phone: phoneLabel })}
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

// Mesmo vocabulario visual do AuthCodeModal e do modal de verificacao do settings.
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
