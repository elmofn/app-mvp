import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

export default function LoginScreen() {
  const router = useRouter();

  const handleLogin = () => {
    // Por enquanto, apenas navega para as abas principais
    router.replace('/(tabs)/home');
  };

  const handleSignup = () => {
    // Por enquanto, apenas navega para as abas principais
    router.replace('/signup');
  };

  //const handleActivateAccount = () => {
    // Por enquanto, apenas navega para as abas principais
    //router.replace('/accountactivation');
  //};

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Cabeçalho */}
      <View style={styles.header}>
        <Text style={styles.title}>TRAVELBACK</Text>
        <Text style={styles.subtitle}>SUA WALLET DE VIAGENS</Text>
      </View>

      {/* Grupo de Botões */}
      <View style={styles.buttonGroup}>
        <TouchableOpacity 
          style={styles.btnBorder} 
          onPress={handleLogin}
          activeOpacity={0.8}
        >
          <Text style={styles.btnText}>LOGIN</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.btnBorder} 
          onPress={handleSignup}
          activeOpacity={0.8}
        >
          <Text style={styles.btnText}>CADASTRO</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.btnFilled} 
          //onPress={handleActivateAccount}
          activeOpacity={0.8}
        >
          <Text style={styles.btnText}>ATIVAR CONTA</Text>
        </TouchableOpacity>
      </View>

      {/* Rodapé */}
      <View style={styles.footer}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/support')}>
          <Text style={styles.footerLink}>AJUDA</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.dark,
    paddingHorizontal: 24,
    justifyContent: 'space-around', // Mantém o espaçamento proporcional do HTML
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
  },
  title: {
    color: colors.text.light,
    fontSize: 42,
    fontFamily: fonts.bold,
    letterSpacing: -0.5, // 0.1em do HTML
    textAlign: 'center',
  },
  subtitle: {
    color: colors.text.muted,
    fontSize: 12,
    fontFamily: fonts.bold,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: -15,
    alignSelf: 'flex-start',
  },
  buttonGroup: {
    width: '100%',
    gap: 16,
  },
  btnText: {
    color: colors.text.light,
    fontSize: 14,
    fontFamily: fonts.bold,
    letterSpacing: 1,
    textAlign: 'center',
  },
  btnBorder: {
    width: '100%',
    paddingVertical: 20,
    borderWidth: 2,
    borderColor: colors.text.light,
    borderRadius: 4,
  },
  btnFilled: {
    width: '100%',
    paddingVertical: 20,
    backgroundColor: colors.brand.primary,
    borderRadius: 4,
  },
  footer: {
    marginBottom: 20,
  },
  footerLink: {
    color: colors.text.muted,
    fontSize: 12,
    fontFamily: fonts.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});