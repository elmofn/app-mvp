import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

export default function LoginScreen() {
  const router = useRouter();

  const handleLogin = () => {
    router.replace('/(tabs)/home');
  };

  const handleSignup = () => {
    router.push('/signup');
  };

  const handleActivate = () => {
    router.push('/activate');
  };

  const handleHelp = () => {
    router.push('/support');
  };

  return (
    <LinearGradient
      colors={['#4D2ACC', '#6444DA', '#4D2ACC', '#1B0F4A']}
      start={{ x: 0.1, y: 0.1 }}
      end={{ x: 0.8, y: 1.2 }}
      locations={[0, 0.35, 0.55, 0.95]}
      style={styles.gradient}
    >
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.2)' }]} />
      <StatusBar style="light" />

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
        <View style={styles.topSpacer} />

        <View style={styles.logoSection}>
          <Image
            source={require('@/src/assets/logos/logo_horizontal_completo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.middleSpacer} />

        <View style={styles.actionsSection}>
          <TouchableOpacity style={styles.button} onPress={handleLogin} activeOpacity={0.8}>
            <Text style={styles.buttonText}>Login</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={handleSignup} activeOpacity={0.8}>
            <Text style={styles.buttonText}>Sign Up</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.buttonAccent} onPress={handleActivate} activeOpacity={0.8}>
            <Text style={styles.buttonAccentText}>Activate Account</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.helpButton} onPress={handleHelp} activeOpacity={0.7}>
            <Text style={styles.helpLink}>Help</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.brandMark}>
          <Image
            source={require('@/src/assets/logos/logo_purple.png')}
            style={styles.brandMarkImage}
            resizeMode="contain"
          />
        </View>

        <View style={styles.bottomSpacer} />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safeArea: {
    flex: 1,
    paddingHorizontal: 24,
  },

  topSpacer: { flex: 0.6 },
  middleSpacer: { flex: 0.4 },
  bottomSpacer: { flex: 0.15 },

  logoSection: {
    alignItems: 'center',
  },
  logo: {
    width: 297,
    height: 73,
  },

  actionsSection: {
    gap: 20,
  },
  button: {
    width: '94%',
    paddingVertical: 18,
    alignSelf: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
  },
  buttonText: {
    color: colors.text.light,
    fontSize: 16,
    fontFamily: fonts.medium,
  },
  buttonAccent: {
    width: '94%',
    paddingVertical: 18,
    alignSelf: 'center',
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(133, 237, 211, 0.3)',
    alignItems: 'center',
  },
  buttonAccentText: {
    color: '#85EDD3',
    fontSize: 16,
    fontFamily: fonts.bold,
  },

  helpButton: {
    alignSelf: 'center',
    marginTop: 18,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  helpLink: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
    fontFamily: fonts.regular,
    textDecorationLine: 'underline',
  },

  brandMark: {
    alignItems: 'center',
    marginTop: 64,
  },
  brandMarkImage: {
    width: 28,
    height: 28,
  },
});
