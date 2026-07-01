import { XIcon } from 'phosphor-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
} from 'react-native';

import { useT } from '@/src/i18n';
import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

export type EditFieldKind = 'text' | 'phone' | 'legalId';

type Props = {
  visible: boolean;
  // Label exibido no eyebrow / titulo (ex: "Name", "Phone").
  fieldLabel: string;
  // Valor inicial. Sincronizado a cada abertura.
  initialValue: string;
  // Tipo de input. text = teclado padrao; phone = phone-pad; legalId =
  // number-pad. Phone e legalId aceitam apenas digitos.
  kind: EditFieldKind;
  onClose: () => void;
  // Resolve true se o valor entra em conflito (ja existe na base BMG).
  // Quando ausente, pulamos a checagem. A funcao recebe o valor ja
  // potencialmente normalizado (digit-only para phone/legalId).
  checkConflict?: (value: string) => Promise<boolean>;
  // Persistencia do valor. Activate chama updateAccount; signup atualiza
  // formData. O modal trata os estados de loading/erro pra voce.
  onSave: (value: string) => Promise<void>;
};

// Modal compartilhado pelo review do signup e do activate para edicao
// inline de campos. Cuida do ciclo: input -> checkConflict -> onSave ->
// fechar; com erros inline pra cada etapa.
export function EditReviewFieldModal({
  visible,
  fieldLabel,
  initialValue,
  kind,
  onClose,
  checkConflict,
  onSave,
}: Props) {
  const { t } = useT();
  const [value, setValue] = useState(initialValue);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reseta sempre que reabrir com um initialValue novo.
  useEffect(() => {
    if (visible) {
      setValue(initialValue);
      setError(null);
      setIsSaving(false);
    }
  }, [visible, initialValue]);

  const normalizeForKind = (raw: string) =>
    kind === 'text' ? raw : raw.replace(/\D/g, '');

  const handleSave = async () => {
    const next = kind === 'text' ? value.trim() : value.replace(/\D/g, '');
    if (!next) {
      setError(t('common.editFieldFill'));
      return;
    }
    if (next === (kind === 'text' ? initialValue.trim() : initialValue.replace(/\D/g, ''))) {
      onClose();
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      if (checkConflict) {
        const taken = await checkConflict(next);
        if (taken) {
          setError(t('common.editFieldInUse'));
          setIsSaving(false);
          return;
        }
      }
      await onSave(next);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : t('common.editFieldSaveError');
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (isSaving) return;
    onClose();
  };

  const inputProps: TextInputProps = {
    value,
    onChangeText: (val) => {
      if (error) setError(null);
      setValue(normalizeForKind(val));
    },
    autoCapitalize: kind === 'text' ? 'words' : 'none',
    autoCorrect: false,
    keyboardType: kind === 'phone' ? 'phone-pad' : kind === 'legalId' ? 'number-pad' : 'default',
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.card}>
          <TouchableOpacity style={styles.close} onPress={handleClose} hitSlop={10}>
            <XIcon size={18} color={colors.text.muted} weight="bold" />
          </TouchableOpacity>

          <Text style={styles.eyebrow}>{t('common.editFieldEyebrow', { label: fieldLabel.toUpperCase() })}</Text>
          <Text style={styles.title}>
            {t('common.editFieldNewPrefix')}<Text style={styles.titleAccent}>{fieldLabel.toLowerCase()}</Text>
          </Text>

          <TextInput
            {...inputProps}
            style={[styles.input, error ? styles.inputError : null]}
            placeholder={t('common.editFieldPlaceholder', { label: fieldLabel.toLowerCase() })}
            placeholderTextColor="#B5B5BD"
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.button, isSaving && styles.buttonDisabled]}
            onPress={handleSave}
            activeOpacity={0.85}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color={colors.text.light} />
            ) : (
              <Text style={styles.buttonText}>{t('common.save')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,2,45,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
  },
  close: {
    position: 'absolute',
    top: 14,
    right: 14,
    padding: 4,
    zIndex: 1,
  },
  eyebrow: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: colors.text.muted,
    letterSpacing: 2,
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontFamily: fonts.bold,
    color: colors.text.dark,
    letterSpacing: -1,
    marginBottom: 20,
  },
  titleAccent: {
    color: '#f07167',
    fontFamily: fonts.italic,
  },
  input: {
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
  inputError: { borderColor: '#f07167' },
  errorText: {
    marginTop: 8,
    fontSize: 12,
    fontFamily: fonts.medium,
    color: '#f07167',
  },
  button: {
    backgroundColor: colors.brand.primary,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: {
    color: colors.text.light,
    fontSize: 15,
    fontFamily: fonts.bold,
    letterSpacing: 0.5,
  },
});
