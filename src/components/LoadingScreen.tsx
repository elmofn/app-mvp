import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { colors } from '@/src/theme/colors';

// Tela de carregamento exibida logo apos a splash nativa, enquanto a sessao
// termina de restaurar. Fundo branco igual ao da splash (app.json) para a
// transicao ser continua: o logo da splash da lugar a este spinner no mesmo
// fundo, em vez de o logo ficar parado ate o app abrir.
export function LoadingScreen() {
  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <ActivityIndicator size="large" color={colors.brand.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
