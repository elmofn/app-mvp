import { useRouter } from 'expo-router';
import { FingerprintIcon } from 'phosphor-react-native';
import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { useAuth } from '@/src/contexts/AuthContext';
import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

export function BiometricGate() {
  const router = useRouter();
  const { isLocked, isRestoring, account, biometricAvailable, unlock, signOut } = useAuth();
  const { width, height } = useWindowDimensions();
  const promptedRef = useRef(false);

  // Dispara o prompt de biometria assim que o gate aparece (uma vez), para
  // que o usuario nem precise tocar no botao na maioria das vezes.
  useEffect(() => {
    if (!isLocked || !biometricAvailable || promptedRef.current) return;
    promptedRef.current = true;
    unlock();
  }, [isLocked, biometricAvailable, unlock]);

  // Reseta a flag quando destranca para que a proxima vez (apos voltar do
  // background) volte a abrir o prompt automaticamente.
  useEffect(() => {
    if (!isLocked) promptedRef.current = false;
  }, [isLocked]);

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
      <Svg width={width} height={height} style={StyleSheet.absoluteFillObject}>
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
          Welcome <Text style={styles.titleAccent}>back</Text>
        </Text>
        <Text style={styles.subtitle}>
          Tap below to unlock your TravelBACK account with biometric authentication.
        </Text>

        <TouchableOpacity style={styles.primaryButton} activeOpacity={0.85} onPress={unlock}>
          <Text style={styles.primaryButtonText}>Unlock</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.7} onPress={handleSignOut}>
          <Text style={styles.secondaryButtonText}>Sign out</Text>
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
