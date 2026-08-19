import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  AirplaneTiltIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  StarIcon
} from 'phosphor-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { BannersCarousel } from '@/src/components/BannersCarousel';
import { PhoneVerifyModal } from '@/src/components/PhoneVerifyModal';
import { useAuth } from '@/src/contexts/AuthContext';
import { useT } from '@/src/i18n';
import { getNearbyHotels, getRecommendedHotels, type Hotel } from '@/src/services/catalog';
import { getCurrentLocation } from '@/src/services/location';
import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

// Hoteis "Recomendados" (5★) e "Proximos" (por cidade do device) agora vem do
// catalog da TripEdge - vide src/services/catalog.ts.

function HotelCard({ hotel, onPress }: { hotel: Hotel; onPress: () => void }) {
  const { t } = useT();
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={onPress}>
      <Image source={{ uri: hotel.image }} style={styles.cardImage} resizeMode="cover" />

      <View style={styles.cardBody}>
        <View style={styles.starsRow}>
          {Array.from({ length: hotel.rating }).map((_, i) => (
            <StarIcon key={i} size={12} color="#FFB400" weight="fill" />
          ))}
        </View>

        <Text style={styles.cardName} numberOfLines={2}>
          {hotel.name}
        </Text>

        <View style={styles.locationRow}>
          <MapPinIcon size={12} color={colors.text.muted} weight="regular" />
          <Text style={styles.locationText} numberOfLines={1}>
            {hotel.location}
          </Text>
        </View>

        {hotel.distance ? (
          <Text style={styles.distanceText}>{hotel.distance}</Text>
        ) : null}

        <View style={styles.cardDivider} />

        {/* Recomendados (catalog) nao trazem nota nem preco: renderizamos esses
            blocos so quando presentes; reviews aparecem sempre. */}
        <View style={styles.cardFooter}>
          <View style={styles.scoreBlock}>
            {hotel.score != null ? (
              <View style={styles.scoreBadge}>
                <Text style={styles.scoreValue}>{hotel.score}</Text>
              </View>
            ) : null}
            <View style={styles.scoreText}>
              {hotel.scoreLabel ? (
                <Text style={styles.scoreLabel}>{hotel.scoreLabel}</Text>
              ) : null}
              <Text style={styles.reviewCount}>{t('travelshop.reviewCount', { count: hotel.reviewCount })}</Text>
            </View>
          </View>
          {hotel.pricePerNight ? (
            <View style={styles.priceBlock}>
              <Text style={styles.priceValue}>{hotel.pricePerNight}</Text>
              <Text style={styles.priceCaption} numberOfLines={2}>
                {t('travelshop.priceCaption')}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function TravelShopScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const router = useRouter();
  const { account } = useAuth();
  const { t } = useT();

  // Gate do TravelShop: acessar qualquer coisa aqui (buscar hoteis, campos de
  // busca, cards) exige telefone verificado. Se nao estiver, abrimos a
  // verificacao por SMS no proprio TravelShop (PhoneVerifyModal) em vez de rotear
  // o usuario ao settings - e, no sucesso, seguimos com a acao que ele tentou.
  // Excecao: o card de Balance (placeholder) nao passa por aqui.
  const phoneVerified = !!account?.accountDetails.validPhoneNumber;
  const [phoneModalVisible, setPhoneModalVisible] = useState(false);
  const pendingActionRef = useRef<(() => void) | null>(null);

  // Hoteis 5★ do catalog da TripEdge. null = carregando; [] = vazio/erro
  // (a secao some). Cacheado no servico, entao reabrir a aba nao re-busca.
  const [recommended, setRecommended] = useState<Hotel[] | null>(null);
  useEffect(() => {
    getRecommendedHotels()
      .then(setRecommended)
      .catch(() => setRecommended([]));
  }, []);

  // Hoteis "Proximos": pega a geolocation do device e busca hoteis do catalog na
  // cidade correspondente. null = carregando; [] = sem permissao/sem match/erro
  // (a secao some). getCurrentLocation ja cacheia as coords (pega no login).
  const [nearby, setNearby] = useState<Hotel[] | null>(null);
  useEffect(() => {
    getCurrentLocation()
      .then((coords) => getNearbyHotels(coords))
      .then(setNearby)
      .catch(() => setNearby([]));
  }, []);

  const requirePhoneVerified = (action: () => void) => {
    if (phoneVerified) {
      action();
      return;
    }
    pendingActionRef.current = action;
    setPhoneModalVisible(true);
  };

  const handlePhoneVerified = () => {
    const action = pendingActionRef.current;
    pendingActionRef.current = null;
    action?.();
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <StatusBar style="light" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: tabBarHeight + 32 }}
      >
        <LinearGradient
          colors={['#6444DA', '#4D2ACC', '#1B0F4A']}
          start={{ x: 0.1, y: 0.1 }}
          end={{ x: 0.8, y: 1.2 }}
          locations={[0, 0.2, 0.7]}
          style={[styles.headerGradient, { paddingTop: insets.top + 16 }]}
        >
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.2)' }]} />

          <View style={styles.headerInner}>
            <Text style={styles.headerLabel}>{t('travelshop.headerLabel')}</Text>
            <Text style={styles.mainTitle}>
              {t('travelshop.mainTitle')} <Text style={styles.mainTitleAccent}>{t('travelshop.mainTitleAccent')}</Text>
            </Text>
            <Text style={styles.pageDescription}>
              {t('travelshop.pageDescription')}
            </Text>
          </View>

          <View style={styles.searchCard}>
            <TouchableOpacity
              style={[styles.searchButton, styles.searchButtonHotels]}
              activeOpacity={0.85}
              onPress={() => requirePhoneVerified(() => router.push('/marketplace?vertical=hotels'))}
            >
              <MagnifyingGlassIcon size={18} color={colors.text.light} weight="bold" />
              <Text style={styles.searchButtonText}>{t('travelshop.searchButton')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.searchButton, styles.searchButtonFlights]}
              activeOpacity={0.85}
              onPress={() => requirePhoneVerified(() => router.push('/marketplace?vertical=flights'))}
            >
              <AirplaneTiltIcon size={18} color={colors.text.light} weight="bold" />
              <Text style={styles.searchButtonText}>{t('travelshop.searchFlightsButton')}</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Recomendados (catalog 5★): carregando -> spinner; vazio/erro -> some. */}
        {recommended === null || recommended.length > 0 ? (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {t('travelshop.recommendedTitle')}{' '}
                <Text style={styles.sectionTitleAccent}>{t('travelshop.recommendedTitleAccent')}</Text>
              </Text>
            </View>
            {recommended === null ? (
              <View style={styles.carouselLoading}>
                <ActivityIndicator color={colors.brand.primary} />
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.carousel}
              >
                {recommended.map((hotel) => (
                  <HotelCard
                    key={hotel.id}
                    hotel={hotel}
                    onPress={() =>
                      requirePhoneVerified(() =>
                        router.push(`/marketplace?hotelId=${encodeURIComponent(hotel.id)}`),
                      )
                    }
                  />
                ))}
              </ScrollView>
            )}
          </>
        ) : null}

        {/* Proximos (catalog, cidade do device): carregando -> spinner;
            sem match/permissao/erro -> some. */}
        {nearby === null || nearby.length > 0 ? (
          <>
            <View style={[styles.section, { marginTop: 24 }]}>
              <Text style={styles.sectionTitle}>
                {t('travelshop.nearbyTitle')}{' '}
                <Text style={styles.sectionTitleAccent}>{t('travelshop.nearbyTitleAccent')}</Text>
              </Text>
            </View>
            {nearby === null ? (
              <View style={styles.carouselLoading}>
                <ActivityIndicator color={colors.brand.primary} />
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.carousel}
              >
                {nearby.map((hotel) => (
                  <HotelCard
                    key={hotel.id}
                    hotel={hotel}
                    onPress={() =>
                      requirePhoneVerified(() =>
                        router.push(`/marketplace?hotelId=${encodeURIComponent(hotel.id)}`),
                      )
                    }
                  />
                ))}
              </ScrollView>
            )}
          </>
        ) : null}

        {/* --- SHOP BANNERS: via payload do SignIn (category=Shop) --- */}
        <View style={{ marginTop: 24 }}>
          <BannersCarousel banners={account?.banners} category="Shop" />
        </View>
      </ScrollView>

      <PhoneVerifyModal
        visible={phoneModalVisible}
        onClose={() => setPhoneModalVisible(false)}
        onVerified={handlePhoneVerified}
        introMessage={t('travelshop.verifyPhoneRequiredMessage')}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },

  headerGradient: {
    paddingBottom: 28,
  },
  headerInner: {
    paddingHorizontal: 24,
  },
  headerLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontFamily: fonts.bold,
    letterSpacing: 2,
    marginBottom: 8,
  },
  mainTitle: {
    fontSize: 38,
    fontFamily: fonts.bold,
    color: colors.text.light,
    letterSpacing: -1.5,
    marginBottom: 10,
  },
  mainTitleAccent: {
    color: '#85EDD3',
    fontFamily: fonts.italic,
  },
  pageDescription: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 20,
    maxWidth: '95%',
    marginBottom: 24,
  },

  // Card branco unico envolvendo os dois CTAs (vocabulario do app).
  searchCard: {
    marginHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 8,
  },
  // CTA solido da marca: base (layout) + cor por vertical abaixo.
  searchButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 10,
    marginTop: 6,
    marginBottom: 6,
  },
  // Cor de cada botao (ambas com bom contraste para o icone/texto branco).
  searchButtonHotels: {
    backgroundColor: '#0F022D', // navy
  },
  searchButtonFlights: {
    backgroundColor: '#0F022D', // roxo da marca
  },
  searchButtonText: {
    color: colors.text.light,
    fontSize: 14,
    fontFamily: fonts.bold,
    letterSpacing: 0.4,
  },

  // --- ACTION CARD (Balance) - identico ao da home ---
  quickActions: {
    paddingHorizontal: 20,
    marginTop: 20,
    zIndex: 10,
  },
  actionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#EDEDF2',
  },
  actionInfo: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 21,
    fontFamily: fonts.bold,
    color: '#0F022D',
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  actionDesc: {
    fontSize: 10,
    fontFamily: fonts.regular,
    letterSpacing: 0.9,
    paddingBottom: 4,
    color: '#0F022D',
  },
  actionIconWrapper: {
    marginLeft: 16,
  },

  section: {
    paddingHorizontal: 24,
    marginTop: 32,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 26,
    fontFamily: fonts.bold,
    color: colors.text.dark,
    letterSpacing: -0.8,
  },
  sectionTitleAccent: {
    color: '#f07167',
    fontFamily: fonts.italic,
  },

  carousel: {
    paddingHorizontal: 24,
    gap: 14,
  },
  carouselLoading: {
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },

  card: {
    width: 300,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ECECEF',
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: 170,
    backgroundColor: '#EDEDF2',
  },
  cardBody: {
    padding: 16,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
    marginBottom: 8,
  },
  cardName: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: colors.text.dark,
    letterSpacing: -0.2,
    lineHeight: 20,
    marginBottom: 6,
    minHeight: 40,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    flex: 1,
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.text.muted,
  },
  distanceText: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: colors.text.muted,
    letterSpacing: 0.4,
    marginTop: 6,
    textTransform: 'uppercase',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#EDEDF2',
    marginVertical: 12,
  },

  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  scoreBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  scoreBadge: {
    backgroundColor: '#00A86B',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 36,
    alignItems: 'center',
  },
  scoreValue: {
    color: colors.text.light,
    fontSize: 13,
    fontFamily: fonts.bold,
  },
  scoreText: {
    flex: 1,
  },
  scoreLabel: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: colors.text.dark,
  },
  reviewCount: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: colors.text.muted,
  },
  priceBlock: {
    alignItems: 'flex-end',
    maxWidth: 130,
  },
  priceValue: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: colors.text.dark,
    letterSpacing: -0.3,
  },
  priceCaption: {
    fontSize: 10,
    fontFamily: fonts.regular,
    color: colors.text.muted,
    textAlign: 'right',
    marginTop: 2,
    lineHeight: 13,
  },
});
