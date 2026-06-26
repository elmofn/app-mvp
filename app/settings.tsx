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
  LANGUAGE_COUNTRY_IDS,
  removeAccount,
  requestValidationCode,
  setNewPassword,
  updateAccount,
  validateCode,
  ValidateCodeError,
} from '@/src/services/account';
import { CurrencyOption, getCurrencies } from '@/src/services/financial';
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
      currencyId: account?.setups.currency.id ?? '',
    }),
    [
      account?.accountDetails.name,
      account?.accountDetails.email,
      account?.accountDetails.phoneNumber,
      account?.setups.lang,
      account?.setups.currency.id,
    ],
  );

  const [name, setName] = useState(original.name);
  const [phone, setPhone] = useState(formatPhone(account?.accountDetails.phoneNumber ?? ''));
  const [email, setEmail] = useState(original.email);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // O currency selecionado segue o shape de SignInCurrency (id + code +
  // name + symbol + rate) para que possamos refletir a mudanca direto
  // no AuthContext sem precisar refetchar a conta.
  const [currency, setCurrency] = useState<CurrencyOption | null>(() => {
    const c = account?.setups.currency;
    return c ? { id: c.id, code: c.code, name: c.name, symbol: c.symbol, currentExchangeRate: c.currentExchangeRate } : null;
  });
  // Lista vinda de GetCurrency - carregada uma unica vez ao abrir o
  // picker pela primeira vez. Mantemos a busca client-side, ja que a
  // API devolve a lista inteira (~173 itens) num so payload.
  const [currencies, setCurrencies] = useState<CurrencyOption[]>([]);
  const [currenciesLoading, setCurrenciesLoading] = useState(false);
  const [currenciesError, setCurrenciesError] = useState<string | null>(null);
  const [currencySearch, setCurrencySearch] = useState('');

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

  // O mesmo modal serve tres fluxos (atualizar perfil, trocar PIN e
  // deletar conta); pendingAction guarda qual deles esta em curso e
  // modalStage controla qual passo o modal mostra (verificacao -> novo
  // PIN, no caso de senha; verificacao -> RemoveAccount, no de delete).
  type PendingAction = 'updateProfile' | 'changePassword' | 'deleteAccount';
  type ModalStage = 'verify' | 'newPin';
  const [pendingAction, setPendingAction] = useState<PendingAction>('updateProfile');
  const [modalStage, setModalStage] = useState<ModalStage>('verify');
  const [newPin, setNewPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [isSavingPin, setIsSavingPin] = useState(false);
  // Captura a escolha do usuario no alerta antes de iniciar o fluxo de
  // delete - blockAccount tambem trava o e-mail para futuras recriacoes
  // automaticas (vide comentario do RemoveAccount).
  const [deleteBlockAccount, setDeleteBlockAccount] = useState(false);

  // Diff em digitos pra phone, lowercased pra email, trim pra name.
  const phoneDigits = phone.replace(/\D/g, '');
  const nextName = name.trim();
  const nextEmail = email.trim().toLowerCase();

  const nameDirty = nextName !== original.name.trim();
  const emailDirty = nextEmail !== original.email.trim().toLowerCase();
  const phoneDirty = phoneDigits !== original.phoneDigits;
  const langDirty = language.value !== original.lang;
  const currencyDirty = (currency?.id ?? '') !== original.currencyId;
  const profileDirty = nameDirty || emailDirty || phoneDirty || langDirty;
  const isDirty = profileDirty || currencyDirty;
  const requiresVerification = emailDirty || phoneDirty;

  // Executa a PUT do save e propaga o novo estado para o AuthContext (que
  // persiste no storage). APPUpdateAccount cobre profile + currency + country
  // numa unica chamada, entao basta enviar todos os campos atuais quando
  // qualquer um deles estiver dirty.
  const performUpdate = async () => {
    if (!account) return;
    setIsSaving(true);
    try {
      if (isDirty) {
        let coords = getCachedLocation();
        if (!coords) coords = await getCurrentLocation();
        const geolocation = formatLocationPayload(coords);

        await updateAccount(
          {
            accountId: account.accountDetails.accountId,
            name: nextName,
            email: nextEmail,
            phoneNumber: phoneDigits,
            currencyId: (currency ?? account.setups.currency).id,
            countryId: LANGUAGE_COUNTRY_IDS[language.value],
            geolocation,
          },
          lang,
        );
      }

      await updateAccountDetails({
        ...(profileDirty
          ? {
              name: nextName,
              email: nextEmail,
              phoneNumber: phoneDigits,
              lang: language.value,
            }
          : {}),
        ...(currencyDirty && currency
          ? {
              currency: {
                id: currency.id,
                code: currency.code,
                name: currency.name,
                symbol: currency.symbol ?? account.setups.currency.symbol,
                currentExchangeRate:
                  currency.currentExchangeRate ?? account.setups.currency.currentExchangeRate,
              },
            }
          : {}),
      });

      showAlert('Profile updated', 'Your changes have been saved.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not save your changes.';
      showAlert('Update failed', message);
    } finally {
      setIsSaving(false);
    }
  };

  // Limpa todos os campos do modal e o estagio - chamado no close e quando
  // um fluxo termina com sucesso, para que a proxima abertura sempre comece
  // limpa, do estagio 'verify'.
  const resetModalState = () => {
    setModalStage('verify');
    setVerifyCode('');
    setVerifyError(null);
    setNewPin('');
    setPinError(null);
  };

  const closeVerifyModal = () => {
    if (isVerifying || isSavingPin) return;
    setVerifyVisible(false);
    resetModalState();
  };

  const handleSave = async () => {
    if (!account || !isDirty || isSaving) return;
    if (!requiresVerification) {
      await performUpdate();
      return;
    }
    // Mudancas em email ou phone exigem verificacao via email - mesmo
    // identifier (o email atual) eh quem recebe o codigo.
    resetModalState();
    setPendingAction('updateProfile');
    setVerifyVisible(true);
    try {
      await requestValidationCode(account.accountDetails.accountId, 'email', lang);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not send the verification code.';
      showAlert('Verification', message);
    }
  };

  // Inicia o fluxo de troca de PIN: envia o codigo por email e abre o modal
  // no estagio de verificacao. Apos o codigo bater, transicionamos para o
  // estagio 'newPin' onde o usuario define a nova senha.
  const handleChangePassword = async () => {
    if (!account) return;
    resetModalState();
    setPendingAction('changePassword');
    setVerifyVisible(true);
    try {
      await requestValidationCode(account.accountDetails.accountId, 'email', lang);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not send the verification code.';
      showAlert('Verification', message);
    }
  };

  // Inicia o fluxo de remocao: registra a escolha de blockAccount feita
  // no alerta, abre o modal de verificacao e dispara o codigo por email.
  const startDeleteFlow = async (blockAccount: boolean) => {
    if (!account) return;
    resetModalState();
    setDeleteBlockAccount(blockAccount);
    setPendingAction('deleteAccount');
    setVerifyVisible(true);
    try {
      await requestValidationCode(account.accountDetails.accountId, 'email', lang);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not send the verification code.';
      showAlert('Verification', message);
    }
  };

  // Chamado apos o codigo bater - mantemos o modal aberto durante a PUT
  // (spinner do botao de verify cobre o estado), e no sucesso navegamos
  // para a raiz, o que desmonta a tela. Em erro, fechamos e alertamos.
  const performDelete = async () => {
    if (!account) return;
    try {
      await removeAccount(account.accountDetails.accountId, deleteBlockAccount, lang);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not delete your account.';
      setVerifyVisible(false);
      resetModalState();
      showAlert('Delete failed', message);
      return;
    }
    await signOut();
    router.replace('/');
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
      if (pendingAction === 'updateProfile') {
        setVerifyVisible(false);
        resetModalState();
        await performUpdate();
      } else if (pendingAction === 'deleteAccount') {
        // Mantemos o modal aberto durante o RemoveAccount - o spinner do
        // botao de verify segue indicando progresso. Em sucesso, o
        // signOut + replace('/') desmonta a tela inteira.
        await performDelete();
      } else {
        // changePassword: codigo valido, abre o estagio 'newPin' no mesmo
        // modal. Nao fechamos - o usuario continua o fluxo na sequencia.
        setModalStage('newPin');
      }
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

  const handleConfirmNewPin = async () => {
    if (!account) return;
    if (newPin.length !== 4) return;
    setIsSavingPin(true);
    setPinError(null);
    try {
      await setNewPassword(account.accountDetails.accountId, newPin, lang);
      setVerifyVisible(false);
      resetModalState();
      showAlert('Password updated', 'Your new PIN has been saved.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not save your new PIN.';
      setPinError(message);
    } finally {
      setIsSavingPin(false);
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
      'Choose how to proceed. You can delete only this account, or also block any future account from being created for this email. This action is irreversible.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete account',
          style: 'destructive',
          onPress: () => startDeleteFlow(false),
        },
        {
          text: 'Delete and block this email',
          style: 'destructive',
          onPress: () => startDeleteFlow(true),
        },
      ],
    );
  };

  const openPicker = (type: 'currency' | 'language') => {
    setModalVisible({ type });
    if (type === 'currency') {
      setCurrencySearch('');
      // Lazy fetch: a primeira abertura puxa a lista completa; nas
      // proximas reusamos o cache em memoria. Se a chamada anterior
      // falhou, tentamos de novo.
      if (currencies.length === 0 || currenciesError) {
        setCurrenciesLoading(true);
        setCurrenciesError(null);
        getCurrencies(lang)
          .then((list) => setCurrencies(list))
          .catch((err) => {
            const message = err instanceof Error ? err.message : 'Could not load currencies.';
            setCurrenciesError(message);
          })
          .finally(() => setCurrenciesLoading(false));
      }
    }
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
                <Text style={styles.selectValue}>
                  {currency ? `${currency.name} (${currency.code})` : 'Select currency'}
                </Text>
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

              <TouchableOpacity
                style={styles.buttonFilled}
                onPress={handleChangePassword}
                activeOpacity={0.8}
              >
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
          <TouchableOpacity
            style={styles.modalContent}
            activeOpacity={1}
            onPress={() => undefined}
          >
            <Text style={styles.modalTitle}>
              {modalVisible.type === 'currency' ? 'SELECT CURRENCY' : 'SELECT LANGUAGE'}
            </Text>

            {modalVisible.type === 'currency' ? (
              <>
                <TextInput
                  style={styles.modalSearch}
                  placeholder="Search currency or code"
                  placeholderTextColor="#B5B5BD"
                  value={currencySearch}
                  onChangeText={setCurrencySearch}
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                {currenciesLoading ? (
                  <View style={styles.modalStateBox}>
                    <ActivityIndicator color={colors.text.dark} />
                  </View>
                ) : currenciesError ? (
                  <View style={styles.modalStateBox}>
                    <Text style={styles.modalStateText}>{currenciesError}</Text>
                  </View>
                ) : (
                  <FlatList
                    data={currencies.filter((c) => {
                      const q = currencySearch.trim().toLowerCase();
                      if (!q) return true;
                      return (
                        c.code.toLowerCase().includes(q) ||
                        c.name.toLowerCase().includes(q)
                      );
                    })}
                    keyExtractor={(item) => item.id}
                    keyboardShouldPersistTaps="handled"
                    renderItem={({ item }) => {
                      const isActive = currency?.id === item.id;
                      return (
                        <TouchableOpacity
                          style={styles.modalOption}
                          onPress={() => {
                            setCurrency(item);
                            setModalVisible({ type: null });
                          }}
                        >
                          <Text
                            style={[
                              styles.modalOptionText,
                              isActive && styles.modalOptionActive,
                            ]}
                          >
                            {item.name} ({item.code})
                          </Text>
                        </TouchableOpacity>
                      );
                    }}
                    ListEmptyComponent={
                      <Text style={styles.modalStateText}>No currencies match your search.</Text>
                    }
                  />
                )}
              </>
            ) : (
              <FlatList
                data={LANGUAGES}
                keyExtractor={(item) => item.value}
                renderItem={({ item }) => {
                  const isActive = language.value === item.value;
                  return (
                    <TouchableOpacity
                      style={styles.modalOption}
                      onPress={() => {
                        setLanguage(item);
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
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={verifyVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeVerifyModal}
      >
        <View style={styles.verifyOverlay}>
          <View style={styles.verifyCard}>
            <TouchableOpacity
              style={styles.verifyClose}
              onPress={closeVerifyModal}
              hitSlop={10}
            >
              <XIcon size={18} color={colors.text.muted} weight="bold" />
            </TouchableOpacity>

            {modalStage === 'verify' ? (
              <>
                <Text style={styles.verifyEyebrow}>
                  {pendingAction === 'changePassword'
                    ? 'CHANGE PASSWORD'
                    : pendingAction === 'deleteAccount'
                    ? 'DELETE ACCOUNT'
                    : 'VERIFY YOUR IDENTITY'}
                </Text>
                <Text style={styles.verifyTitle}>
                  {pendingAction === 'changePassword' ? (
                    <>
                      Verify <Text style={styles.verifyTitleAccent}>identity</Text>
                    </>
                  ) : pendingAction === 'deleteAccount' ? (
                    <>
                      Confirm <Text style={styles.verifyTitleAccent}>delete</Text>
                    </>
                  ) : (
                    <>
                      Confirm <Text style={styles.verifyTitleAccent}>changes</Text>
                    </>
                  )}
                </Text>
                <Text style={styles.verifyDescription}>
                  We sent a verification code to {original.email}. Enter it below to continue.
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

                <Text style={styles.verifyHelpNotice}>
                  If you don&apos;t have access to this email or phone, please contact support.
                </Text>

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
                    <Text style={styles.buttonPrimaryText}>
                      {pendingAction === 'changePassword'
                        ? 'Verify'
                        : pendingAction === 'deleteAccount'
                        ? 'Verify & Delete'
                        : 'Verify & Save'}
                    </Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.verifyEyebrow}>CHANGE PASSWORD</Text>
                <Text style={styles.verifyTitle}>
                  New <Text style={styles.verifyTitleAccent}>PIN</Text>
                </Text>
                <Text style={styles.verifyDescription}>
                  Choose a new 4-digit PIN to protect your account.
                </Text>

                <TextInput
                  style={[
                    styles.verifyInput,
                    styles.pinInput,
                    pinError ? styles.verifyInputError : null,
                  ]}
                  placeholder="0 0 0 0"
                  placeholderTextColor="#B5B5BD"
                  value={newPin}
                  onChangeText={(val) => {
                    if (pinError) setPinError(null);
                    setNewPin(val.replace(/\D/g, ''));
                  }}
                  keyboardType="number-pad"
                  secureTextEntry
                  autoComplete="password-new"
                  maxLength={4}
                />

                {pinError ? <Text style={styles.verifyErrorText}>{pinError}</Text> : null}

                <TouchableOpacity
                  style={[
                    styles.buttonPrimary,
                    styles.verifyButton,
                    (newPin.length !== 4 || isSavingPin) && styles.buttonPrimaryDisabled,
                  ]}
                  onPress={handleConfirmNewPin}
                  activeOpacity={0.85}
                  disabled={newPin.length !== 4 || isSavingPin}
                >
                  {isSavingPin ? (
                    <ActivityIndicator color={colors.text.light} />
                  ) : (
                    <Text style={styles.buttonPrimaryText}>Save New PIN</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
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
    maxHeight: '75%',
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
  modalSearch: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.text.dark,
    marginBottom: 8,
  },
  modalStateBox: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalStateText: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.text.muted,
    textAlign: 'center',
    paddingVertical: 24,
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
  pinInput: {
    letterSpacing: 14,
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
  verifyHelpNotice: {
    marginTop: 16,
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.text.muted,
    lineHeight: 16,
  },
  resendButtonTextDisabled: {
    color: colors.text.muted,
    textDecorationLine: 'none',
  },
  verifyButton: {
    marginTop: 24,
  },
});
