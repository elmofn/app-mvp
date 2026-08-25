import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeftIcon } from 'phosphor-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { EmailVerifyModal } from '@/src/components/EmailVerifyModal';
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
  // "Minhas viagens": cai logado na pagina de compras do usuario (via SSO,
  // return_to=/trips). Sem hotelId/placeId, entao usa este returnTo fixo.
  trips: {
    returnTo: '/trips',
    titleKey: 'travelshop.myTripsButton',
  },
} as const;

type Vertical = keyof typeof MARKETPLACE;

// Busca via deep-link dos cards "Next Trip Ideas": check-in amanha (hoje+1) e
// check-out em hoje+5 (4 noites), no fuso local. rooms=2-0 = 2 adultos, 0
// criancas (padrao fixo de todas essas buscas).
const DEFAULT_ROOMS = '2-0';

// Data YYYY-MM-DD a `days` dias de hoje, no fuso LOCAL (nao UTC) para respeitar
// o "amanha" do usuario mesmo perto da meia-noite.
function ymdInDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function MarketplaceScreen() {
  const router = useRouter();
  const { t } = useT();
  const { account } = useAuth();
  const { vertical, hotelId, placeId, city } = useLocalSearchParams<{
    vertical?: string;
    hotelId?: string;
    placeId?: string;
    city?: string;
  }>();
  // Overlay so na 1a carga: nas navegacoes seguintes (abrir um hotel etc.) a
  // WebView ja mostra o conteudo progressivamente. Cobrir tudo a cada navegacao
  // arriscava o overlay branco ficar preso ("carregando infinitamente").
  const [initialLoading, setInitialLoading] = useState(true);

  // Valida o vertical contra o mapa (hotels/flights/trips); default = hotels.
  const key: Vertical =
    vertical && vertical in MARKETPLACE ? (vertical as Vertical) : 'hotels';
  const entry = MARKETPLACE[key];
  const accountId = account?.accountDetails.accountId ?? '';

  // Com hotelId, o SSO cai direto na pagina do hotel (return_to=/hotel/{id});
  // com placeId (deep-link dos cards "Next Trip Ideas"), cai na busca da cidade.
  // A URL de /results precisa vir COMPLETA (place_id + city + datas + rooms):
  // so o place_id fazia o site reaproveitar o estado cacheado da ultima busca
  // (nome/hospedes errados no cabecalho). city fixa o rotulo; datas e rooms
  // definem a busca. Senao, usa o return_to da vertical.
  const returnTo = hotelId
    ? `/hotel/${hotelId}`
    : placeId
      ? `/results?place_id=${encodeURIComponent(placeId)}` +
        `&city=${encodeURIComponent(city ?? '')}` +
        `&checkin=${ymdInDays(1)}&checkout=${ymdInDays(5)}` +
        `&rooms=${DEFAULT_ROOMS}`
      : entry.returnTo;

  // Gate de acesso ao marketplace: exige email verificado (a verificacao de
  // telefone foi desativada para a 1.0). Cobre todas as entradas — botoes,
  // cards e deep-links app://hotels|flights dos banners. Mostra o modal de
  // email; so libera a WebView quando o email estiver verificado.
  const emailOk = !!account?.accountDetails.validEmail;
  const gated = !emailOk;

  // URL SSO: montada SO quando o gate libera (nao no mount). A assinatura do
  // Partner SSO inclui um timestamp com janela curta de validade; se montassemos
  // no mount, a espera da verificacao (email) poderia deixar o ts vencido antes
  // da WebView carregar. Montamos uma unica vez, quando o email ja esta
  // verificado, para o ts estar fresco no momento do load.
  // ssoTried distingue "ainda nao montou" (gated) de "montou e deu null" (erro).
  const [uri, setUri] = useState<string | null>(null);
  const [ssoTried, setSsoTried] = useState(false);
  useEffect(() => {
    if (gated || ssoTried) return;
    setUri(buildPartnerSsoUrl(accountId, returnTo));
    setSsoTried(true);
  }, [gated, ssoTried, accountId, returnTo]);

  // Dispensar um modal de verificacao (X) => sai do marketplace (nao pode usar).
  // Como o proprio modal chama onClose TAMBEM no sucesso (antes do onVerified),
  // agendamos o "voltar" e o cancelamos no onVerified.
  const backTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleBack = () => {
    backTimer.current = setTimeout(() => router.back(), 0);
  };
  const cancelBack = () => {
    if (backTimer.current) {
      clearTimeout(backTimer.current);
      backTimer.current = null;
    }
  };

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

      {gated || !ssoTried ? (
        // Corpo vazio: atras dos modais de verificacao (gated) ou no frame em
        // que a URL SSO ainda esta sendo montada (logo apos liberar o gate).
        <View style={styles.webviewWrapper} />
      ) : uri ? (
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

      {/* Gate: email verificado. Dispensar (X) volta a tela anterior. */}
      <EmailVerifyModal visible={!emailOk} onClose={scheduleBack} onVerified={cancelBack} />
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
