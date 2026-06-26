import {
  Inter_400Regular,
  Inter_400Regular_Italic,
  Inter_500Medium,
  Inter_700Bold,
  Inter_700Bold_Italic,
  useFonts,
} from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';

import { BiometricGate } from '@/src/components/BiometricGate';
import { AlertProvider } from '@/src/contexts/AlertContext';
import { AuthProvider, useAuth } from '@/src/contexts/AuthContext';

// 1. Impede que a tela de splash inicial feche antes de carregarmos os assets
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: 'index',
};

export default function RootLayout() {
  // 2. Carrega os arquivos físicos da fonte
  const [fontsLoaded, error] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_700Bold,
    Inter_400Regular_Italic,
    Inter_700Bold_Italic,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  // Se as fontes ainda não carregaram, segura a tela em branco/splash
  if (!fontsLoaded) {
    return null;
  }

  return (
    // SafeAreaProvider precisa envolver toda a arvore para que
    // useSafeAreaInsets()/SafeAreaView retornem os insets reais do device.
    // Sem ele, insets.bottom vinha 0 e a tab bar ficava atras dos botoes
    // de navegacao do Android. initialMetrics evita flash de inset 0 no
    // primeiro frame.
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <AlertProvider>
        <AuthProvider>
          <AppShell />
        </AuthProvider>
      </AlertProvider>
    </SafeAreaProvider>
  );
}

function AppShell() {
  const { isRestoring } = useAuth();

  // 3. Segura o splash enquanto a sessao ainda esta sendo restaurada do storage
  useEffect(() => {
    if (!isRestoring) {
      SplashScreen.hideAsync();
    }
  }, [isRestoring]);

  if (isRestoring) return null;

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
      <BiometricGate />
    </>
  );
}
