import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

import { ScreenHeader } from './ScreenHeader';

type Props = {
  eyebrow?: string; // rotulo pequeno no topo (ao lado do voltar)
  label?: string; // linha pequena acima do titulo
  title: string; // titulo principal (parte normal)
  titleAccent?: string; // parte do titulo destacada em mint
  description?: string; // subtitulo/descricao no header
  children?: React.ReactNode; // corpo da pagina (conteudo promocional)
};

// Base das paginas promocionais (promotional1/2/3). Reproduz o padrao visual das
// telas do app: header com gradiente roxo + ScreenHeader (voltar) + titulo, e um
// corpo branco rolavel onde entra o conteudo. As 3 telas de rota so preenchem os
// textos e o children.
export function PromotionalPage({ eyebrow, label, title, titleAccent, description, children }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <StatusBar style="light" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <LinearGradient
          colors={['#6444DA', '#4D2ACC', '#1B0F4A']}
          start={{ x: 0.1, y: 0.1 }}
          end={{ x: 0.8, y: 1.2 }}
          locations={[0, 0.2, 0.7]}
          style={[styles.headerGradient, { paddingTop: insets.top }]}
        >
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.2)' }]} />
          <ScreenHeader title={eyebrow ?? 'Promoção'} dark />

          <View style={styles.headerBody}>
            {label ? <Text style={styles.headerLabel}>{label}</Text> : null}
            <Text style={styles.mainTitle}>
              {title}
              {titleAccent ? <Text style={styles.mainTitleAccent}> {titleAccent}</Text> : null}
            </Text>
            {description ? <Text style={styles.pageDescription}>{description}</Text> : null}
          </View>
        </LinearGradient>

        <View style={styles.body}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  headerGradient: { paddingBottom: 32 },
  headerBody: { paddingHorizontal: 24, marginTop: 4 },
  headerLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontFamily: fonts.bold,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  mainTitle: {
    color: colors.text.light,
    fontSize: 28,
    fontFamily: fonts.bold,
    letterSpacing: -0.6,
  },
  mainTitleAccent: { color: colors.brand.details }, // mint #85EDD3
  pageDescription: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
  },
  body: { paddingHorizontal: 24, paddingTop: 24 },
});
