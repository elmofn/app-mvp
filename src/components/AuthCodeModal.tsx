import { XIcon } from 'phosphor-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { useT } from '@/src/i18n';
import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

// Janela de validade do codigo (segundos). Padrao TOTP e 30s; quando a API
// passar a fornecer o codigo, esse valor deve espelhar o TTL real do backend.
const PERIOD = 30;

// Geometria do anel de contagem regressiva ("timer" ao redor do codigo).
const SIZE = 208;
const STROKE = 8;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Frontend-only: gera um codigo aleatorio de 6 digitos. Sera substituido pelo
// codigo vindo da API futuramente.
function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

interface AuthCodeModalProps {
  visible: boolean;
  onClose: () => void;
}

export function AuthCodeModal({ visible, onClose }: AuthCodeModalProps) {
  const { t } = useT();
  const [code, setCode] = useState(generateCode);
  const [secondsLeft, setSecondsLeft] = useState(PERIOD);
  const progress = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  // Roda o ciclo do codigo apenas enquanto o modal esta visivel: um novo
  // codigo a cada PERIOD segundos, com o anel drenando linearmente. O
  // secondsLeft e derivado do proprio progress (fonte unica) para o texto e
  // o anel nunca dessincronizarem. Ao fechar, paramos animacao e listener.
  useEffect(() => {
    if (!visible) return;

    let active = true;
    let lastSec = PERIOD;

    const listenerId = progress.addListener(({ value }) => {
      const s = Math.max(0, Math.ceil((1 - value) * PERIOD));
      if (s !== lastSec) {
        lastSec = s;
        setSecondsLeft(s);
      }
    });

    const startCycle = () => {
      setCode(generateCode());
      setSecondsLeft(PERIOD);
      lastSec = PERIOD;
      progress.setValue(0);
      const anim = Animated.timing(progress, {
        toValue: 1,
        duration: PERIOD * 1000,
        easing: Easing.linear,
        useNativeDriver: false,
      });
      animationRef.current = anim;
      anim.start(({ finished }) => {
        if (finished && active) startCycle();
      });
    };

    startCycle();

    return () => {
      active = false;
      animationRef.current?.stop();
      progress.removeListener(listenerId);
    };
  }, [visible, progress]);

  const strokeDashoffset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, CIRCUMFERENCE],
  });

  const formattedCode = `${code.slice(0, 3)} ${code.slice(3)}`;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <TouchableOpacity style={styles.close} onPress={onClose} hitSlop={10}>
            <XIcon size={18} color={colors.text.muted} weight="bold" />
          </TouchableOpacity>

          <Text style={styles.eyebrow}>{t('settings.authCodeEyebrow')}</Text>
          <Text style={styles.title}>
            {t('settings.authCodeTitleBase')}{' '}
            <Text style={styles.titleAccent}>{t('settings.authCodeTitleAccent')}</Text>
          </Text>
          <Text style={styles.description}>{t('settings.authCodeDescription')}</Text>

          <View style={styles.ringWrap}>
            <Svg width={SIZE} height={SIZE}>
              <Circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                stroke="#EDEDF2"
                strokeWidth={STROKE}
                fill="none"
              />
              <AnimatedCircle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                stroke={colors.brand.primary}
                strokeWidth={STROKE}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={strokeDashoffset}
                transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
              />
            </Svg>

            <View style={styles.ringCenter} pointerEvents="none">
              <Text style={styles.codeText}>{formattedCode}</Text>
              <Text style={styles.codeSeconds}>
                {t('settings.authCodeExpiresIn', { seconds: secondsLeft })}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Vocabulario visual identico ao modal de verificacao de settings.tsx
// (overlay escuro, card branco arredondado, X no canto, eyebrow + titulo com
// acento em italico roxo, descricao muted).
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
    marginBottom: 28,
  },
  ringWrap: {
    width: SIZE,
    height: SIZE,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  ringCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeText: {
    fontSize: 40,
    fontFamily: fonts.bold,
    color: colors.text.dark,
    letterSpacing: 4,
  },
  codeSeconds: {
    marginTop: 6,
    fontSize: 13,
    fontFamily: fonts.medium,
    color: colors.text.muted,
    letterSpacing: 0.3,
  },
});
