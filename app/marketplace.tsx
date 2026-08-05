import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeftIcon } from 'phosphor-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { useT } from '@/src/i18n';
import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

// Navegador in-app do marketplace, aberto pelos botoes do TravelShop. A busca
// (hoteis / passagens) fica toda na web; aqui so renderizamos num WebView. A
// vertical vem por parametro de rota (?vertical=hotels|flights).
//
// ⚠️ TEMPORARIO — URLs placeholder. Trocar pela URL real do marketplace por
// vertical. Idealmente abrir o usuario JA LOGADO via createNavigationCode
// (src/services/marketplace.ts) -> carregar o `launchUrl` retornado (hoje
// buscado mas ignorado), com retry de 401 via refreshSession (padrao do
// AuthCodeModal.tsx). Este mapa e o unico ponto a trocar.
const MARKETPLACE = {
  hotels: {
    url: 'https://www.google.com/search?q=hoteis',
    titleKey: 'travelshop.searchButton',
  },
  flights: {
    url: 'https://www.google.com/search?q=passagens+aereas',
    titleKey: 'travelshop.searchFlightsButton',
  },
} as const;

type Vertical = keyof typeof MARKETPLACE;

export default function MarketplaceScreen() {
  const router = useRouter();
  const { t } = useT();
  const { vertical } = useLocalSearchParams<{ vertical?: string }>();
  const [loading, setLoading] = useState(true);

  const key: Vertical = vertical === 'flights' ? 'flights' : 'hotels';
  const entry = MARKETPLACE[key];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
          hitSlop={10}
        >
          <ArrowLeftIcon size={24} color={colors.text.dark} weight="bold" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {t(entry.titleKey)}
        </Text>
      </View>

      <View style={styles.webviewWrapper}>
        <WebView
          source={{ uri: entry.url }}
          style={styles.webview}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
        />
        {loading ? (
          <View style={styles.loadingOverlay} pointerEvents="none">
            <ActivityIndicator size="large" color={colors.brand.primary} />
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EDEDF2',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 15,
    fontFamily: fonts.bold,
    color: colors.text.dark,
    letterSpacing: -0.3,
  },

  webviewWrapper: {
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
});
