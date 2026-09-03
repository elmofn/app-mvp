import * as Clipboard from 'expo-clipboard';
import { WhatsappLogoIcon, XIcon } from 'phosphor-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Linking,
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
  const { token, refreshSession, account } = useAuth();
  // Ref para ler o token atual dentro do efeito sem re-disparar o efeito
  // (e sem fechar sobre um valor obsoleto apos o refreshSession).
  const tokenRef = useRef(token);
  tokenRef.current = token;

  const [status, setStatus] = useState<Status>('loading');
  const [data, setData] = useState<NavigationCode | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  // Feedback momentaneo ao copiar o codigo para o clipboard.
  const [copied, setCopied] = useState(false);
  // Incrementar forca o efeito a rodar de novo (usado pelo botao "tentar de novo").
  const [reloadKey, setReloadKey] = useState(0);

  const progress = useRef(new Animated.Value(0)).current;
  const rafRef = useRef<number | null>(null);
  // Espelha o codigo atual + sua janela (fetch/expiracao) para o loop de tick
  // e para reusar um codigo ainda valido ao reabrir o modal, refletindo o
  // tempo que passou.
  const dataRef = useRef<NavigationCode | null>(null);
  dataRef.current = data;
  const fetchTimeRef = useRef(0);
  const expiresAtMsRef = useRef(0);

  // Dirige o anel e a contagem pelo RELOGIO REAL (expiresAt absoluto), via
  // requestAnimationFrame, em vez de uma animacao de duracao fixa. Assim o
  // tempo restante fica sempre correto - inclusive ao fechar e reabrir o modal
  // (reflete o tempo decorrido). Reusa o codigo enquanto valido; busca um novo
  // so quando expira (refetch automatico, padrao Authy).
  useEffect(() => {
    if (!visible) return;
    setCopied(false);

    let active = true;
    let lastSec = -1;

    const tick = () => {
      if (!active) return;
      const now = Date.now();
      const total = Math.max(1, expiresAtMsRef.current - fetchTimeRef.current);
      const remaining = expiresAtMsRef.current - now;
      if (remaining <= 0) {
        progress.setValue(1);
        setSecondsLeft(0);
        load(); // expirou -> busca um novo
        return;
      }
      progress.setValue(Math.min(1, Math.max(0, (now - fetchTimeRef.current) / total)));
      const s = Math.ceil(remaining / 1000);
      if (s !== lastSec) {
        lastSec = s;
        setSecondsLeft(s);
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    const startTicking = () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      lastSec = -1;
      rafRef.current = requestAnimationFrame(tick);
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
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      if (active) setStatus('loading');
      try {
        const nav = await fetchCode();
        if (!active) return;
        setData(nav);
        fetchTimeRef.current = Date.now();
        expiresAtMsRef.current = expiresAtToMs(nav.expiresAt);
        setStatus('ready');
        startTicking();
      } catch {
        if (active) setStatus('error');
      }
    };

    // Reusa o codigo atual se ainda for valido; senao busca um novo.
    if (dataRef.current && expiresAtMsRef.current - Date.now() > 0) {
      setStatus('ready');
      startTicking();
    } else {
      load();
    }

    return () => {
      active = false;
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [visible, progress, reloadKey, refreshSession]);

  // Copia o codigo atual para o clipboard e mostra o feedback "Copiado!".
  const handleCopy = useCallback(async () => {
    const code = dataRef.current?.navigationCode;
    if (!code) return;
    await Clipboard.setStringAsync(code);
    setCopied(true);
  }, []);

  // Abre o WhatsApp na conversa do usuario "consigo mesmo" (wa.me com o proprio
  // numero) ja com o codigo no texto - o WhatsApp reconhece o proprio numero e
  // abre o chat "Mensagem para si mesmo". Usa https://wa.me para degradar bem
  // (cai no navegador/WhatsApp Web) se o app nao estiver instalado.
  const phoneDigits = account?.accountDetails.phoneNumber?.replace(/\D/g, '') ?? '';
  const handleSendToWhatsApp = useCallback(async () => {
    const code = dataRef.current?.navigationCode;
    if (!code || !phoneDigits) return;
    const url = `https://wa.me/${phoneDigits}?text=${encodeURIComponent(code)}`;
    try {
      await Linking.openURL(url);
    } catch (err) {
      console.warn('[authcode] could not open WhatsApp:', err);
    }
  }, [phoneDigits]);

  // Some com o feedback "Copiado!" apos um instante.
  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(id);
  }, [copied]);

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
            <>
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

                <View style={styles.ringCenter}>
                  <TouchableOpacity onPress={handleCopy} activeOpacity={0.6} hitSlop={10}>
                    <Text style={styles.codeText} numberOfLines={2} adjustsFontSizeToFit>
                      {data?.navigationCode}
                    </Text>
                  </TouchableOpacity>
                  <Text style={[styles.codeSeconds, copied && styles.codeCopied]}>
                    {copied
                      ? t('settings.authCodeCopied')
                      : t('settings.authCodeExpiresIn', { time: formatResendCountdown(secondsLeft) })}
                  </Text>
                </View>
              </View>

              {phoneDigits ? (
                <TouchableOpacity
                  style={styles.whatsappButton}
                  onPress={handleSendToWhatsApp}
                  activeOpacity={0.85}
                >
                  <WhatsappLogoIcon size={20} color="#FFFFFF" weight="fill" />
                  <Text style={styles.whatsappButtonText}>{t('settings.authCodeWhatsApp')}</Text>
                </TouchableOpacity>
              ) : null}
            </>
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
  codeCopied: {
    color: '#0E9F6E',
    fontFamily: fonts.bold,
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
  whatsappButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#25D366',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 4,
  },
  whatsappButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: fonts.bold,
    letterSpacing: 0.3,
  },
});
