import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  MapPinIcon,
  StarIcon
} from 'phosphor-react-native';
import React, { useRef, useState } from 'react';
import {
  Image,
  ImageBackground,
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
import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

type Hotel = {
  id: string;
  image: string;
  name: string;
  location: string;
  rating: number; // 1..5 estrelas para o topo do card
  score: number; // 9.4
  scoreLabel: string; // "Maravilhoso"
  reviewCount: number;
  pricePerNight: string; // ja formatado "US$419"
  distance?: string; // somente para hoteis proximos
};

const RECOMMENDED: Hotel[] = [
  {
    id: 'rec-1',
    image: 'https://static.cupid.travel/hotels/ex_e704ab59_z.jpg',
    name: "Magna Pars- L'Hotel à Parfum Small Luxury Hotels of the World",
    location: 'Milan, Via Forcella 6',
    rating: 5,
    score: 9.4,
    scoreLabel: 'Maravilhoso',
    reviewCount: 157,
    pricePerNight: 'US$419',
  },
  {
    id: 'rec-2',
    image: 'https://static.cupid.travel/hotels/468587792.jpg',
    name: 'UNA Hotels Galles Milano',
    location: 'Milan, Piazza Lima 2',
    rating: 4,
    score: 8.4,
    scoreLabel: 'Muito bom',
    reviewCount: 8644,
    pricePerNight: 'US$141',
  },
  {
    id: 'rec-3',
    image: 'https://static.cupid.travel/hotels/ex_74a7f292_z.jpg',
    name: 'Hassler Roma',
    location: 'Rome, Piazza Trinita Dei Monti 6',
    rating: 5,
    score: 9.4,
    scoreLabel: 'Maravilhoso',
    reviewCount: 56,
    pricePerNight: 'US$1.177',
  },
  {
    id: 'rec-4',
    image: 'https://static.cupid.travel/hotels/40691107.jpg',
    name: 'Shangri-La The Shard, London',
    location: 'London, 31 St Thomas Street',
    rating: 5,
    score: 10,
    scoreLabel: 'Excelente',
    reviewCount: 2625,
    pricePerNight: 'US$597',
  },
  {
    id: 'rec-5',
    image: 'https://static.cupid.travel/hotels/53482587.jpg',
    name: 'Hotel Splendide Royal - The Leading Hotels of the World',
    location: 'Rome, Via Di Porta Pinciana 14',
    rating: 5,
    score: 9.1,
    scoreLabel: 'Maravilhoso',
    reviewCount: 533,
    pricePerNight: 'US$407',
  },
  {
    id: 'rec-6',
    image: 'https://static.cupid.travel/hotels/ex_e7402a4a_z.jpg',
    name: 'Address Sky View, Downtown Dubai',
    location: 'Dubai, Sheikh Mohammed Bin Rashed Boulevard',
    rating: 5,
    score: 9.2,
    scoreLabel: 'Maravilhoso',
    reviewCount: 133,
    pricePerNight: 'US$455',
  },
];

const NEARBY: Hotel[] = [
  {
    id: 'near-1',
    image: 'https://nuitee-hotels.b-cdn.net/hotels/212136997.jpg?height=480&quality=80&sharpen=true',
    name: 'Novotel Porto Alegre Tres Figueiras',
    location: 'Porto Alegre, Avenida Soledade, 575',
    rating: 4,
    score: 8.0,
    scoreLabel: 'Muito bom',
    reviewCount: 1405,
    pricePerNight: 'US$45',
    distance: '10 km de center',
  },
  {
    id: 'near-2',
    image: 'https://nuitee-hotels.b-cdn.net/hotels/73456519.jpg?height=480&quality=80&sharpen=true',
    name: 'Slaviero Hotel Porto Alegre Moinhos',
    location: 'Porto Alegre, Rua Comendador Caminha, 42',
    rating: 4,
    score: 7.8,
    scoreLabel: 'Bom',
    reviewCount: 1719,
    pricePerNight: 'US$95',
    distance: '11 km de center',
  },
  {
    id: 'near-3',
    image: 'https://nuitee-hotels.b-cdn.net/hotels/552426673.jpg?height=480&quality=80&sharpen=true',
    name: 'Manhattan Porto Alegre by Mercure - 5 minutos do Hospital Moinhos de Vento',
    location: 'Porto Alegre, Rua Miguel Tostes, 30',
    rating: 4,
    score: 7.7,
    scoreLabel: 'Bom',
    reviewCount: 1794,
    pricePerNight: 'US$118',
    distance: '11 km de center',
  },
  {
    id: 'near-4',
    image: 'https://nuitee-hotels.b-cdn.net/hotels/346465046.jpg?height=480&quality=80&sharpen=true',
    name: 'ibis Styles Porto Alegre Moinhos de Vento',
    location: 'Porto Alegre, Rua 24 de Outubro 1513 Auxiliadora',
    rating: 4,
    score: 8.4,
    scoreLabel: 'Muito bom',
    reviewCount: 2643,
    pricePerNight: 'US$85',
    distance: '11 km de center',
  },
  {
    id: 'near-5',
    image: 'https://nuitee-hotels.b-cdn.net/hotels/548461866.jpg?height=480&quality=80&sharpen=true',
    name: 'ibis Porto Alegre Moinhos de Vento',
    location: 'Porto Alegre, Rua Marquês do Herval 540',
    rating: 4,
    score: 8.4,
    scoreLabel: 'Muito bom',
    reviewCount: 2440,
    pricePerNight: 'US$70',
    distance: '11 km de center',
  },
  {
    id: 'near-6',
    image: 'https://nuitee-hotels.b-cdn.net/hotels/49231839.jpg?height=480&quality=80&sharpen=true',
    name: 'Ibis Styles Porto Alegre Centro - proximo rodoviaria, Araujo Vianna e hospitais',
    location: 'Porto Alegre, Rua Garibaldi, 633',
    rating: 4,
    score: 8.2,
    scoreLabel: 'Muito bom',
    reviewCount: 2537,
    pricePerNight: 'US$80',
    distance: '12 km de center',
  },
];

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

        <View style={styles.cardFooter}>
          <View style={styles.scoreBlock}>
            <View style={styles.scoreBadge}>
              <Text style={styles.scoreValue}>{hotel.score}</Text>
            </View>
            <View style={styles.scoreText}>
              <Text style={styles.scoreLabel}>{hotel.scoreLabel}</Text>
              <Text style={styles.reviewCount}>{t('travelshop.reviewCount', { count: hotel.reviewCount })}</Text>
            </View>
          </View>
          <View style={styles.priceBlock}>
            <Text style={styles.priceValue}>{hotel.pricePerNight}</Text>
            <Text style={styles.priceCaption} numberOfLines={2}>
              {t('travelshop.priceCaption')}
            </Text>
          </View>
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
            <View style={styles.searchButtonCard}>
              <TouchableOpacity
                style={styles.searchButton}
                activeOpacity={0.85}
                onPress={() => requirePhoneVerified(() => router.push('/marketplace?vertical=hotels'))}
              >
                <ImageBackground
                  source={require('@/src/assets/images/hotelsearch_btn.png')}
                  style={styles.searchButtonBg}
                  resizeMode="cover"
                >
                  <Text style={styles.searchButtonText}>{t('travelshop.searchButton')}</Text>
                </ImageBackground>
              </TouchableOpacity>
            </View>

            <View style={styles.searchButtonCard}>
              <TouchableOpacity
                style={styles.searchButton}
                activeOpacity={0.85}
                onPress={() => requirePhoneVerified(() => router.push('/marketplace?vertical=flights'))}
              >
                <ImageBackground
                  source={require('@/src/assets/images/airticketsearch_btn.png')}
                  style={styles.searchButtonBg}
                  resizeMode="cover"
                >
                  <Text style={styles.searchButtonText}>{t('travelshop.searchFlightsButton')}</Text>
                </ImageBackground>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Hotéis <Text style={styles.sectionTitleAccent}>Recomendados</Text>
          </Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carousel}
        >
          {RECOMMENDED.map((hotel) => (
            <HotelCard key={hotel.id} hotel={hotel} onPress={() => requirePhoneVerified(() => {})} />
          ))}
        </ScrollView>

        <View style={[styles.section, { marginTop: 24 }]}>
          <Text style={styles.sectionTitle}>
            Hotéis <Text style={styles.sectionTitleAccent}>Próximos</Text>
          </Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carousel}
        >
          {NEARBY.map((hotel) => (
            <HotelCard key={hotel.id} hotel={hotel} onPress={() => requirePhoneVerified(() => {})} />
          ))}
        </ScrollView>

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

  searchCard: {
    marginHorizontal: 20,
    gap: 12, // espaco entre os dois cards de botao (sem fundo branco entre eles)
  },
  // Fundo branco por botao (antes era um card unico cobrindo os dois).
  searchButtonCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 8,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 0,
  },
  searchButton: {
    height: 88, // mais alto para acomodar a imagem de fundo (ajustar ao aspecto real)
    borderRadius: 10,
    overflow: 'hidden', // a imagem de fundo respeita o borderRadius
  },
  searchButtonBg: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-start', // texto alinhado a esquerda
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  searchButtonText: {
    color: colors.text.light,
    fontSize: 14,
    fontFamily: fonts.bold,
    letterSpacing: 0.4,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
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
