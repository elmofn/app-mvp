import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

// Tela de carregamento exibida logo apos a splash nativa, enquanto a sessao
// termina de restaurar. Fundo branco igual ao da splash (app.json) para a
// transicao ser continua: o logo da splash da lugar a este spinner no mesmo
// fundo, em vez de o logo ficar parado ate o app abrir.
//
// `message` (opcional): frase exibida sob o spinner. Usada ao entrar no app
// (login/ativacao), enquanto o conteudo + as sugestoes do Gemini carregam, para
// a espera ter contexto em vez de um spinner solto.
export function LoadingScreen({ message }: { message?: string }) {
  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <ActivityIndicator size="large" color={colors.brand.primary} />
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  message: {
    marginTop: 20,
    fontSize: 15,
    fontFamily: fonts.medium,
    color: colors.text.muted,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
});
