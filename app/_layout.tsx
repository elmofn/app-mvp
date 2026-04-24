import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';

export const unstable_settings = {
  initialRouteName: 'index',
};

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        {/* 1. O LOGIN DEVE SER A PRIMEIRA ROTA DECLARADA */}
        <Stack.Screen name="index" /> 
        
        {/* 2. O GRUPO DE ABAS VEM DEPOIS */}
        <Stack.Screen name="(tabs)" />
        
        {/* 3. MODAIS E OUTRAS TELAS */}
        <Stack.Screen name="support" options={{ presentation: 'modal' }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
    </>
  );
}