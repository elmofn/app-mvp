import { useRouter } from 'expo-router';
import { FingerprintIcon } from 'phosphor-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { useAuth } from '@/src/contexts/AuthContext';
import { useT } from '@/src/i18n';
import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

export function BiometricGate() {
  const router = useRouter();
  const { isLocked, isRestoring, account, biometricAvailable, unlock, signOut } = useAuth();
  const { width, height } = useWindowDimensions();
  const { t } = useT();

  const autoTriggeredRef = useRef(false);
  const inFlightRef = useRef(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Wrapper unico para o unlock: evita chamadas concorrentes (auto-trigger
  // + tap manual) e expoe estado de loading para o botao.
  const tryUnlock = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setIsAuthenticating(true);
    try {
      await unlock();
    } finally {
      inFlightRef.current = false;
      setIsAuthenticating(false);
    }
  }, [unlock]);

  // Reseta o flag quando saimos do lock para que a proxima vez que o gate
  // aparecer (apos voltar do background) volte a auto-disparar.
  useEffect(() => {
    if (!isLocked) autoTriggeredRef.current = false;
  }, [isLocked]);

  // Auto-dispara o prompt nativo apos 400ms - tempo para a montagem do
  // overlay terminar antes do prompt do SO subir por cima. O cleanup
  // cancela o timer se o usuario tocar antes ou o gate desmontar.
  useEffect(() => {
    if (!isLocked || !biometricAvailable || autoTriggeredRef.current) return;
    autoTriggeredRef.current = true;
    const t = setTimeout(() => {
      tryUnlock();
    }, 400);
    return () => clearTimeout(t);
  }, [isLocked, biometricAvailable, tryUnlock]);

  if (isRestoring || !isLocked || !account || !biometricAvailable) {
    return null;
  }

  const cx = width / 2;
  const cy = height * 0.3;
  const radius = Math.hypot(Math.max(cx, width - cx), Math.max(cy, height - cy));

  const handleSignOut = async () => {
    await signOut();
    router.replace('/');
  };

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="auto">
      <Svg
        width={width}
        height={height}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      >
        <Defs>
          <RadialGradient
            id="gateGrad"
            cx={cx}
            cy={cy}
            rx={radius}
            ry={radius}
            fx={cx}
            fy={cy}
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0" stopColor="#6444DA" stopOpacity="1" />
            <Stop offset="0.5" stopColor="#4D2ACC" stopOpacity="1" />
            <Stop offset="1" stopColor="#1B0F4A" stopOpacity="1" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width={width} height={height} fill="url(#gateGrad)" />
      </Svg>

      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <FingerprintIcon size={48} color="#85EDD3" weight="regular" />
        </View>

        <Text style={styles.title}>
          {t('common.biometricTitleFirst')} <Text style={styles.titleAccent}>{t('common.biometricTitleAccent')}</Text>
        </Text>
        <Text style={styles.subtitle}>
          {t('common.biometricSubtitle')}
        </Text>

        <TouchableOpacity
          style={[styles.primaryButton, isAuthenticating && styles.primaryButtonBusy]}
          activeOpacity={0.85}
          onPress={tryUnlock}
          disabled={isAuthenticating}
        >
          <Text style={styles.primaryButtonText}>
            {isAuthenticating ? t('common.authenticating') : t('common.unlock')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.7} onPress={handleSignOut}>
          <Text style={styles.secondaryButtonText}>{t('common.signOut')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(133,237,211,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 36,
    fontFamily: fonts.bold,
    color: colors.text.light,
    letterSpacing: -1,
    textAlign: 'center',
    marginBottom: 12,
  },
  titleAccent: {
    color: '#85EDD3',
    fontFamily: fonts.bold_italic,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 40,
    maxWidth: 320,
  },
  primaryButton: {
    backgroundColor: '#85EDD3',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
    minWidth: 220,
    alignItems: 'center',
    marginBottom: 14,
  },
  primaryButtonBusy: { opacity: 0.6 },
  primaryButtonText: {
    color: '#0F022D',
    fontSize: 15,
    fontFamily: fonts.bold,
    letterSpacing: 0.4,
  },
  secondaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontFamily: fonts.medium,
    textDecorationLine: 'underline',
  },
});
