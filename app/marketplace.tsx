import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeftIcon } from 'phosphor-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { useAuth } from '@/src/contexts/AuthContext';
import { useT } from '@/src/i18n';
import { buildPartnerSsoUrl } from '@/src/services/partnerSso';
import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

// Navegador in-app do marketplace, aberto pelos botoes do TravelShop. A busca
// (hoteis / passagens) fica toda na web; aqui so renderizamos num WebView. A
// vertical vem por parametro de rota (?vertical=hotels|flights).
//
// O usuario entra JA LOGADO via Partner SSO (src/services/partnerSso.ts):
// carregamos a URL assinada /api/auth/partner, que responde 302 + cookie de
// sessao e redireciona para o return_to da vertical.
//
// return_to por vertical: hoteis caem na raiz do marketplace ('/'), passagens
// no caminho '/flights'.
const MARKETPLACE = {
  hotels: {
    returnTo: '/',
    titleKey: 'travelshop.searchButton',
  },
  flights: {
    returnTo: '/flights',
    titleKey: 'travelshop.searchFlightsButton',
  },
} as const;

type Vertical = keyof typeof MARKETPLACE;

export default function MarketplaceScreen() {
  const router = useRouter();
  const { t } = useT();
  const { account } = useAuth();
  const { vertical, hotelId } = useLocalSearchParams<{ vertical?: string; hotelId?: string }>();
  // Overlay so na 1a carga: nas navegacoes seguintes (abrir um hotel etc.) a
  // WebView ja mostra o conteudo progressivamente. Cobrir tudo a cada navegacao
  // arriscava o overlay branco ficar preso ("carregando infinitamente").
  const [initialLoading, setInitialLoading] = useState(true);

  const key: Vertical = vertical === 'flights' ? 'flights' : 'hotels';
  const entry = MARKETPLACE[key];
  const accountId = account?.accountDetails.accountId ?? '';

  // Com hotelId, o SSO cai direto na pagina do hotel (return_to=/hotel/{id});
  // o proprio marketplace anexa o session_id apos carregar. Senao, usa o
  // return_to da vertical.
  const returnTo = hotelId ? `/hotel/${hotelId}` : entry.returnTo;

  // Monta a URL SSO uma unica vez no mount (ts fresco). null => sem segredo
  // configurado ou sem accountId; cai no estado de erro abaixo.
  const [uri] = useState(() => buildPartnerSsoUrl(accountId, returnTo));

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

      {uri ? (
        <View style={styles.webviewWrapper}>
          <WebView
            source={{ uri }}
            style={styles.webview}
            sharedCookiesEnabled
            thirdPartyCookiesEnabled
            // Deixa o usuario navegar livremente (hotel, checkout, etc.).
            // setSupportMultipleWindows=false faz links target=_blank / window.open
            // abrirem na propria WebView em vez de travar numa "nova aba".
            setSupportMultipleWindows={false}
            javaScriptCanOpenWindowsAutomatically
            onLoadEnd={() => setInitialLoading(false)}
          />
          {initialLoading ? (
            <View style={styles.loadingOverlay} pointerEvents="none">
              <ActivityIndicator size="large" color={colors.brand.primary} />
            </View>
          ) : null}
        </View>
      ) : (
        <View style={styles.errorWrapper}>
          <Text style={styles.errorText}>{t('travelshop.marketplaceUnavailable')}</Text>
        </View>
      )}
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
  errorWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.text.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
