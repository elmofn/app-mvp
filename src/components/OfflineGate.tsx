import { WifiSlashIcon } from 'phosphor-react-native';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { useOnlineStatus } from '@/src/hooks/useOnlineStatus';
import { useT } from '@/src/i18n';
import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

// Trava de conectividade: overlay em tela cheia que cobre TODO o app enquanto o
// device esta sem internet, impedindo o uso com dados apenas cacheados. Espelha
// o vocabulario visual do BiometricGate (gradiente radial + card central). Some
// sozinho quando a conexao volta (listener do expo-network); o botao "Tentar
// novamente" forca uma re-checagem imediata.
export function OfflineGate() {
  const { isOffline, recheck } = useOnlineStatus();
  const { width, height } = useWindowDimensions();
  const { t } = useT();
  const [isChecking, setIsChecking] = useState(false);

  if (!isOffline) return null;

  const cx = width / 2;
  const cy = height * 0.3;
  const radius = Math.hypot(Math.max(cx, width - cx), Math.max(cy, height - cy));

  const handleRetry = async () => {
    if (isChecking) return;
    setIsChecking(true);
    try {
      await recheck();
    } finally {
      setIsChecking(false);
    }
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
            id="offlineGrad"
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
        <Rect x="0" y="0" width={width} height={height} fill="url(#offlineGrad)" />
      </Svg>

      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <WifiSlashIcon size={48} color="#85EDD3" weight="regular" />
        </View>

        <Text style={styles.title}>
          {t('common.offlineTitleFirst')}{' '}
          <Text style={styles.titleAccent}>{t('common.offlineTitleAccent')}</Text>
        </Text>
        <Text style={styles.subtitle}>{t('common.offlineSubtitle')}</Text>

        <TouchableOpacity
          style={[styles.primaryButton, isChecking && styles.primaryButtonBusy]}
          activeOpacity={0.85}
          onPress={handleRetry}
          disabled={isChecking}
        >
          <Text style={styles.primaryButtonText}>
            {isChecking ? t('common.loading') : t('common.retry')}
          </Text>
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
});
