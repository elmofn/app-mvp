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

  // 3. Monitora o carregamento
  useEffect(() => {
    if (error) throw error;
    
    // Se terminou de carregar, esconde a tela de splash e libera o app
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, error]);

  // Se as fontes ainda não carregaram, segura a tela em branco/splash
  if (!fontsLoaded) {
    return null;
  }

  // 4. Se chegou aqui, as fontes estão prontas e o app renderiza normalmente
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" /> 
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="support" options={{ presentation: 'modal' }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
    </>
  );
}