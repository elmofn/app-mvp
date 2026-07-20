import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeftIcon } from 'phosphor-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { useT } from '@/src/i18n';
import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

// Navegador in-app aberto pelo botao "Buscar Hoteis" do TravelShop. Por ora
// abre o google.com dentro do proprio app (WebView), sem sair para o browser
// do sistema.
const INITIAL_URL = 'https://www.google.com';

export default function HotelSearchScreen() {
  const router = useRouter();
  const { t } = useT();
  const [loading, setLoading] = useState(true);

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
          {t('travelshop.searchButton')}
        </Text>
      </View>

      <View style={styles.webviewWrapper}>
        <WebView
          source={{ uri: INITIAL_URL }}
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
