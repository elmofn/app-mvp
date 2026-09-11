import * as Application from 'expo-application';
import * as Clipboard from 'expo-clipboard';
import * as Device from 'expo-device';
import { CopyIcon, XIcon } from 'phosphor-react-native';
import React, { useState } from 'react';
import { Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { APP_ENV } from '@/src/config/env';
import { useT } from '@/src/i18n';
import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

interface Props {
  visible: boolean;
  onClose: () => void;
}

// Coleta o que interessa ao atendimento: versao/build do app instalado (via
// expo-application, que le do binario real - reflete o autoIncrement do EAS),
// modelo do device e sistema (expo-device, com Platform como fallback), e o
// ambiente (staging/production). Sem PII.
function useAppInfo() {
  const version = Application.nativeApplicationVersion ?? '—';
  const build = Application.nativeBuildVersion ?? '—';
  const device = Device.modelName ?? Device.deviceName ?? '—';
  const osName = Device.osName ?? (Platform.OS === 'ios' ? 'iOS' : 'Android');
  const osVersion = Device.osVersion ?? String(Platform.Version);
  const system = `${osName} ${osVersion}`.trim();
  return { version, build, device, system, environment: APP_ENV };
}

// Modal "Sobre o app": mostra versao do app e infos do device para facilitar o
// suporte. Botao de copiar joga tudo formatado para a area de transferencia.
export function AboutAppModal({ visible, onClose }: Props) {
  const { t } = useT();
  const info = useAppInfo();
  const [copied, setCopied] = useState(false);

  const versionLabel = `${info.version} (${info.build})`;

  const rows = [
    { label: t('support.aboutVersionLabel'), value: versionLabel },
    { label: t('support.aboutDeviceLabel'), value: info.device },
    { label: t('support.aboutSystemLabel'), value: info.system },
    { label: t('support.aboutEnvironmentLabel'), value: info.environment },
  ];

  const handleCopy = async () => {
    const text =
      `TravelBACK\n` +
      `${t('support.aboutVersionLabel')}: ${versionLabel}\n` +
      `${t('support.aboutDeviceLabel')}: ${info.device}\n` +
      `${t('support.aboutSystemLabel')}: ${info.system}\n` +
      `${t('support.aboutEnvironmentLabel')}: ${info.environment}`;
    await Clipboard.setStringAsync(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleClose = () => {
    setCopied(false);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <TouchableOpacity style={styles.close} onPress={handleClose} hitSlop={10}>
            <XIcon size={18} color={colors.text.muted} weight="bold" />
          </TouchableOpacity>

          <Text style={styles.eyebrow}>{t('support.aboutEyebrow')}</Text>
          <Text style={styles.title}>
            {t('support.aboutTitleBase')}{' '}
            <Text style={styles.titleAccent}>{t('support.aboutTitleAccent')}</Text>
          </Text>
          <Text style={styles.subtitle}>{t('support.aboutSubtitle')}</Text>

          <View style={styles.rows}>
            {rows.map((row) => (
              <View key={row.label} style={styles.row}>
                <Text style={styles.rowLabel}>{row.label}</Text>
                <Text style={styles.rowValue}>{row.value}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.copyButton} onPress={handleCopy} activeOpacity={0.85}>
            <CopyIcon size={18} color="#0F022D" weight="bold" />
            <Text style={styles.copyButtonText}>
              {copied ? t('support.aboutCopied') : t('support.aboutCopy')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

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
    marginBottom: 10,
  },
  titleAccent: {
    color: colors.brand.primary,
    fontFamily: fonts.italic,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.text.muted,
    lineHeight: 20,
    marginBottom: 24,
  },
  rows: {
    gap: 14,
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
  },
  rowLabel: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rowValue: {
    flex: 1,
    fontSize: 15,
    fontFamily: fonts.bold,
    color: colors.text.dark,
    textAlign: 'right',
  },
  copyButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#85EDD3',
    paddingVertical: 16,
    borderRadius: 10,
  },
  copyButtonText: {
    color: '#0F022D',
    fontSize: 14,
    fontFamily: fonts.bold,
    letterSpacing: 0.4,
  },
});
