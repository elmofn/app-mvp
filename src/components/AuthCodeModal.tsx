import { XIcon } from 'phosphor-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { useAuth } from '@/src/contexts/AuthContext';
import { formatResendCountdown } from '@/src/hooks/useResendTimer';
import { useT } from '@/src/i18n';
import {
  createNavigationCode,
  expiresAtToMs,
  NavigationCodeError,
  type NavigationCode,
} from '@/src/services/marketplace';
import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

// Geometria do anel de contagem regressiva ("timer" ao redor do codigo).
const SIZE = 208;
const STROKE = 8;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Status = 'loading' | 'ready' | 'error';

interface AuthCodeModalProps {
  visible: boolean;
  onClose: () => void;
}

export function AuthCodeModal({ visible, onClose }: AuthCodeModalProps) {
  const { t } = useT();
  const { token, refreshSession } = useAuth();
  // Ref para ler o token atual dentro do efeito sem re-disparar o efeito
  // (e sem fechar sobre um valor obsoleto apos o refreshSession).
  const tokenRef = useRef(token);
  tokenRef.current = token;

  const [status, setStatus] = useState<Status>('loading');
  const [data, setData] = useState<NavigationCode | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  // Incrementar forca o efeito a rodar de novo (usado pelo botao "tentar de novo").
  const [reloadKey, setReloadKey] = useState(0);

  const progress = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  // Janela total (segundos) do codigo atual - o texto e o anel derivam dela.
  const totalSecondsRef = useRef(1);

  // Busca o navigationCode na API e dirige o anel pelo expiresAt. Ao expirar,
  // refetch automatico (padrao Authy continuo). So roda enquanto o modal esta
  // visivel; ao fechar, para animacao e listener.
  useEffect(() => {
    if (!visible) return;

    let active = true;
    let lastSec = -1;

    const listenerId = progress.addListener(({ value }) => {
      const s = Math.max(0, Math.ceil((1 - value) * totalSecondsRef.current));
      if (s !== lastSec) {
        lastSec = s;
        setSecondsLeft(s);
      }
    });

    const runRing = (totalMs: number) => {
      totalSecondsRef.current = Math.max(1, Math.round(totalMs / 1000));
      setSecondsLeft(totalSecondsRef.current);
      lastSec = totalSecondsRef.current;
      progress.setValue(0);
      const anim = Animated.timing(progress, {
        toValue: 1,
        duration: totalMs,
        easing: Easing.linear,
        useNativeDriver: false,
      });
      animationRef.current = anim;
      anim.start(({ finished }) => {
        if (finished && active) load();
      });
    };

    // Busca o codigo; se o token estiver expirado (401), faz re-signin
    // silencioso e tenta uma vez mais com o token novo.
    const fetchCode = async (): Promise<NavigationCode> => {
      const tk = tokenRef.current;
      if (!tk) throw new NavigationCodeError('no token', 401);
      try {
        return await createNavigationCode(tk);
      } catch (err) {
        if (err instanceof NavigationCodeError && err.status === 401) {
          const fresh = await refreshSession();
          if (!fresh) throw err;
          return await createNavigationCode(fresh);
        }
        throw err;
      }
    };

    const load = async () => {
      animationRef.current?.stop();
      if (active) setStatus('loading');
      try {
        const nav = await fetchCode();
        if (!active) return;
        setData(nav);
        setStatus('ready');
        const remaining = expiresAtToMs(nav.expiresAt) - Date.now();
        if (remaining <= 0) {
          // Ja expirado (provavel skew de relogio) - busca outro imediatamente.
          load();
          return;
        }
        runRing(remaining);
      } catch {
        if (active) setStatus('error');
      }
    };

    load();

    return () => {
      active = false;
      animationRef.current?.stop();
      progress.removeListener(listenerId);
    };
  }, [visible, progress, reloadKey, refreshSession]);

  const strokeDashoffset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, CIRCUMFERENCE],
  });

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

          {status === 'loading' ? (
            <View style={styles.ringWrap}>
              <ActivityIndicator size="large" color={colors.brand.primary} />
              <Text style={styles.stateText}>{t('settings.authCodeLoading')}</Text>
            </View>
          ) : status === 'error' ? (
            <View style={styles.ringWrap}>
              <Text style={styles.stateText}>{t('settings.authCodeError')}</Text>
              <TouchableOpacity
                style={[styles.buttonPrimary, styles.retryButton]}
                onPress={() => setReloadKey((k) => k + 1)}
                activeOpacity={0.85}
              >
                <Text style={styles.buttonPrimaryText}>{t('settings.authCodeRetry')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
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
                <Text style={styles.codeText} numberOfLines={2} adjustsFontSizeToFit>
                  {data?.navigationCode}
                </Text>
                <Text style={styles.codeSeconds}>
                  {t('settings.authCodeExpiresIn', { time: formatResendCountdown(secondsLeft) })}
                </Text>
              </View>
            </View>
          )}
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
    paddingHorizontal: 24,
  },
  codeText: {
    fontSize: 26,
    fontFamily: fonts.bold,
    color: colors.text.dark,
    letterSpacing: 1,
    textAlign: 'center',
  },
  codeSeconds: {
    marginTop: 8,
    fontSize: 13,
    fontFamily: fonts.medium,
    color: colors.text.muted,
    letterSpacing: 0.3,
  },
  stateText: {
    marginTop: 14,
    fontSize: 14,
    fontFamily: fonts.medium,
    color: colors.text.muted,
    textAlign: 'center',
  },
  buttonPrimary: {
    backgroundColor: colors.brand.primary,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonPrimaryText: {
    color: colors.text.light,
    fontSize: 14,
    fontFamily: fonts.bold,
    letterSpacing: 0.5,
  },
  retryButton: {
    marginTop: 18,
  },
});
