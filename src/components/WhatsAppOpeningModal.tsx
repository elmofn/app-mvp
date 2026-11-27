import { WhatsappLogoIcon } from 'phosphor-react-native';
import React from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { useT } from '@/src/i18n';
import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

// Overlay de transicao ao abrir o WhatsApp do suporte: cobre a tela por ~2s
// enquanto o pixel de metrica e enviado e o link externo e aberto. Espelha o
// vocabulario visual do BiometricGate/OfflineGate (gradiente radial roxo +
// circulo de icone com borda mint + spinner), para a espera parecer
// intencional e de marca.
export function WhatsAppOpeningModal({ visible }: { visible: boolean }) {
  const { width, height } = useWindowDimensions();
  const { t } = useT();

  const cx = width / 2;
  const cy = height * 0.3;
  const radius = Math.hypot(Math.max(cx, width - cx), Math.max(cy, height - cy));

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={StyleSheet.absoluteFillObject}>
        <Svg
          width={width}
          height={height}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        >
          <Defs>
            <RadialGradient
              id="waGrad"
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
          <Rect x="0" y="0" width={width} height={height} fill="url(#waGrad)" />
        </Svg>

        <View style={styles.content}>
          <View style={styles.iconCircle}>
            <WhatsappLogoIcon size={48} color="#85EDD3" weight="fill" />
          </View>
          <Text style={styles.title}>{t('support.whatsappOpening')}</Text>
          <ActivityIndicator color="#85EDD3" style={styles.spinner} />
        </View>
      </View>
    </Modal>
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
    fontSize: 24,
    fontFamily: fonts.bold,
    color: colors.text.light,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  spinner: {
    marginTop: 20,
  },
});
