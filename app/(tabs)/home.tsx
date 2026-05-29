import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  BellIcon,
  CoinsIcon,
  EyeIcon,
  EyeSlashIcon,
  ListIcon,
  QuestionMarkIcon,
  SparkleIcon,
  SuitcaseRollingIcon,
  UserIcon
} from 'phosphor-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInLeft,
  FadeInRight,
  FadeOut,
  useAnimatedScrollHandler,
  useSharedValue,
  withTiming
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/src/contexts/AuthContext';
import { fetchHomeData, formatCurrency, HomeData } from '@/src/services/api';
import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

const FEATURED_EXPERIENCES = [
  { id: '1', title: 'Louvre Privé', tag: 'ARTE', image: 'https://images.unsplash.com/photo-1543332164-6e82f355badc?auto=format&fit=crop&w=600&q=80' },
  { id: '2', title: 'Safari Serengeti', tag: 'AVENTURA', image: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=600&q=80' },
  { id: '3', title: 'Ryokan Kyoto', tag: 'RELAX', image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=600&q=80' },
];

const PT_MONTHS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

function formatStatementDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${String(d.getDate()).padStart(2, '0')} ${PT_MONTHS[d.getMonth()]}`;
}

const STATIC_TRIPS = [
  {
    id: 'trip_1',
    title: 'Gramado',
    tag: 'ATÉ 400KM',
    description: 'Famosa pelo clima serrano, arquitetura europeia, chocolates artesanais e o charme das hortênsias. Um refúgio perfeito na Serra Gaúcha.',
    imageUrl: 'https://www.melhoresdestinos.com.br/wp-content/uploads/2022/09/onde-fica-gramado-capa.jpeg'
  },
  {
    id: 'trip_2',
    title: 'Curitiba',
    tag: 'ATÉ 1000KM',
    description: 'Capital paranaense com belos parques, o famoso Jardim Botânico, museus icônicos e uma infraestrutura urbana que encanta os visitantes.',
    imageUrl: 'https://media-cdn.tripadvisor.com/media/attractions-splice-spp-674x446/12/3a/cb/39.jpg'
  },
  {
    id: 'trip_3',
    title: 'Buenos Aires',
    tag: 'INTERNACIONAL',
    description: 'A vibrante capital argentina oferece tango, arquitetura clássica, rica gastronomia, museus e os charmosos cafés do bairro da Recoleta.',
    imageUrl: 'https://viagensforadocomum.com.br/blog/wp-content/uploads/2025/07/Tudo-sobre-Buenos-Aires-capa-840x400.jpg'
  }
];

export default function HomeScreen() {
  const router = useRouter();
  const { account } = useAuth();
  const [data, setData] = useState<HomeData | null>(null);

  const firstName = account?.accountDetails.name?.trim().split(/\s+/)[0] ?? '';
  // available vem sempre em USD; convertemos para a moeda local multiplicando
  // pelo currentExchangeRate (cotacao da moeda do usuario por 1 USD).
  const exchangeRate = account?.setups.currency.currentExchangeRate || 1;
  const balanceUSD = account ? formatCurrency(account.balance.available) : '0,00';
  const balanceBRL = account ? formatCurrency(account.balance.available * exchangeRate) : '0,00';

  // Account Activity Highlights: 4 transacoes mais recentes vindas do payload
  // do login. type 1 = entrada (cashback) e type 2 = saida (resgate).
  const highlights = useMemo(() => {
    const stmts = account?.statements;
    if (!stmts || stmts.length === 0) return null;
    return stmts.slice(0, 4).map((tx) => {
      const isPositive = tx.type === 1;
      const valueBRL = tx.value * exchangeRate;
      const productName = tx.details?.productName ?? '';
      const date = formatStatementDate(tx.creationTime);
      return {
        id: tx.id,
        title: tx.details?.unitName ?? '—',
        dateLabel: productName ? `${productName} • ${date}` : date,
        amount: `${isPositive ? '+' : '-'} R$ ${formatCurrency(valueBRL)}`,
      };
    });
  }, [account, exchangeRate]);
  
  // Controle de Saldo
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);
  
  // Controle do Menu Suspenso
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const scrollY = useSharedValue(0);
  const scrollViewRef = useRef<Animated.ScrollView>(null);
  const isForcingAnimation = useSharedValue(false);

  useEffect(() => {
    fetchHomeData().then((response) => {
      setData(response);
    });
  }, []);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      if (!isForcingAnimation.value) {
        scrollY.value = event.contentOffset.y;
      }
    },
  });

  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();

  useFocusEffect(
    useCallback(() => {
      if (scrollY.value > 0) {
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      } else {
        isForcingAnimation.value = true; 
        scrollY.value = 150;
        setTimeout(() => {
          scrollY.value = withTiming(0, { duration: 450 }, () => {
            isForcingAnimation.value = false;
          });
        }, 50);
      }
    }, [])
  );

  if (!data) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]} edges={['left', 'right']}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#5b32e0" />
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <Animated.ScrollView 
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: tabBarHeight + 24 }}
      >
        {/* --- HEADER SECTION --- */}
        <LinearGradient 
          colors={['#6444DA', '#4D2ACC', '#1B0F4A']} 
          start={{ x: 0.1, y: 0.1 }}
          end={{ x: 0.8, y: 1.2 }}
          locations={[0, 0.2, 0.7]}
          style={[styles.header, { paddingTop: insets.top + 20 }]}
        >
          {/* OVERLAY ESCURO */}
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0, 0, 0, 0.2)' }]} />

          {/* Top bar: entra da esquerda */}
  <Animated.View entering={FadeInLeft.delay(0).duration(500)} style={styles.topBar}>
    <Image source={require('@/src/assets/logos/TravelBack Horizontal.png')} style={styles.logoImage} resizeMode="contain" />
    <View style={styles.headerIcons}>
      <TouchableOpacity style={styles.iconBtn} onPress={() => setIsMenuOpen(true)}>
        <ListIcon size={20} color="#FFF" weight="bold" />
      </TouchableOpacity>
    </View>
  </Animated.View>

  {/* Greeting: cai de cima */}
  <Animated.Text entering={FadeInDown.delay(100).duration(500)} style={styles.greeting}>
    Hello, <Text style={styles.firstName}>{firstName || data.user.firstName}</Text>
  </Animated.Text>

  {/* Balance: entra da esquerda com delay */}
  <Animated.View entering={FadeInLeft.delay(200).duration(500)} style={styles.balanceSection}>
    <View>
      <Text style={styles.balanceLabel}>Available Balance</Text>
      <View style={styles.balanceValueContainer}>
        <Text style={styles.currency}>R$</Text>
        <Text style={styles.balanceValue}>
          {isBalanceVisible ? balanceBRL : '****'}
        </Text>
      </View>
      <Text style={styles.balanceUsd}>
        US$ {isBalanceVisible ? balanceUSD : '****'}
      </Text>
    </View>
    <View style={styles.rightActions}>
      <TouchableOpacity onPress={() => setIsBalanceVisible(!isBalanceVisible)} activeOpacity={0.7} style={styles.eyeButton}>
        {isBalanceVisible
          ? <EyeIcon size={24} color="rgba(255,255,255,0.5)" weight="bold" />
          : <EyeSlashIcon size={24} color="rgba(255,255,255,0.5)" weight="bold" />
        }
      </TouchableOpacity>
      <TouchableOpacity style={styles.statementBtn} onPress={() => router.push('/statement')}>
        <Text style={styles.statementBtnText}>STATEMENT</Text>
      </TouchableOpacity>
    </View>
  </Animated.View>

  {/* Activity: cai de baixo com delay maior */}
  <Animated.View entering={FadeInDown.delay(350).duration(500)}>
    <Text style={styles.activityTitle}>Account Activity Highlights</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.activityScroll}>
      {(highlights ?? data.recentTransactions).map((tx) => (
        <View key={tx.id} style={styles.activityCard}>
          <Text style={styles.activityCardTitle}>{tx.title}</Text>
          <Text style={styles.activityCardSub}>{tx.dateLabel}</Text>
          <Text style={styles.activityCardVal}>{tx.amount}</Text>
        </View>
      ))}
      <View style={{ width: 20 }} />
    </ScrollView>
  </Animated.View>
</LinearGradient>

{/* --- QUICK ACTIONS: cada card com delay e lado alternado --- */}
<View style={styles.quickActions}>
  {/* TravelShop: entra da esquerda */}
  <Animated.View entering={FadeInLeft.delay(450).duration(500)}>
    <TouchableOpacity onPress={() => router.push('/travelshop')} activeOpacity={0.9}>
      <LinearGradient
        colors={['#6444DA', '#4D2ACC']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.actionCard, { backgroundColor: 'transparent' }]}
      >
        <View style={styles.actionInfo}>
          <Text style={styles.actionTitlePurple}>TravelShop</Text>
          <Text style={styles.actionDescPurple}>Explore destinos incríveis.</Text>
        </View>
        <View style={styles.actionIconWrapper}>
          <SuitcaseRollingIcon size={32} color="#85EDD3" weight="regular" />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  </Animated.View>

  {/* Balance: entra da direita */}
  <Animated.View entering={FadeInRight.delay(550).duration(500)}>
    <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/statement')} activeOpacity={0.8}>
      <View style={styles.actionInfo}>
        <Text style={styles.actionTitle}>Balance</Text>
        <Text style={styles.actionDesc}>Gerencie seus Travel Credits.</Text>
      </View>
      <View style={styles.actionIconWrapper}>
        <CoinsIcon size={32} color="#0F022D" weight="regular" />
      </View>
    </TouchableOpacity>
  </Animated.View>

  {/* AI Assistant: entra da esquerda */}
  <Animated.View entering={FadeInLeft.delay(650).duration(500)}>
    <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/assistant')} activeOpacity={0.8}>
      <View style={styles.actionInfo}>
        <Text style={styles.actionTitle}>CashIA</Text>
        <Text style={styles.actionDesc}>Planeje sua próxima jornada.</Text>
      </View>
      <View style={styles.actionIconWrapper}>
        <SparkleIcon size={32} color="#0F022D" weight="regular" />
      </View>
    </TouchableOpacity>
  </Animated.View>
</View>

{/* --- NEXT TRIP IDEAS --- */}
<View style={styles.tripsSection}>
  {/* Header da seção: cai de cima */}
  <Animated.View entering={FadeInDown.delay(750).duration(500)} style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>Next Trip</Text>
    <Text style={styles.sectionTitleItalic}>Ideas<Text style={styles.sectionTitle}>.</Text></Text>
    <Text style={styles.sectionSubtitle}>BOOK YOUR TRIP</Text>
  </Animated.View>

  {/* Trip cards: alternando esquerda/direita com delay crescente */}
  {STATIC_TRIPS.map((trip, index) => (
    <React.Fragment key={trip.id}>
      <Animated.View
        entering={
          index % 2 === 0
            ? FadeInLeft.delay(850 + index * 100).duration(500)
            : FadeInRight.delay(850 + index * 100).duration(500)
        }
      >
        <TouchableOpacity style={styles.tripCard} activeOpacity={0.9}>
          <View style={styles.tripImgBox}>
            <Image source={{ uri: trip.imageUrl }} style={styles.tripImg} resizeMode="cover" />
            <View style={styles.tripTag}>
              <View style={styles.tripTagDot} />
              <Text style={styles.tripTagText}>{trip.tag}</Text>
            </View>
          </View>
          <View style={styles.tripInfo}>
            <Text style={styles.tripInfoTitle}>{trip.title}</Text>
            <Text style={styles.tripInfoDesc} numberOfLines={2}>{trip.description}</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
      {index < STATIC_TRIPS.length - 1 && <View style={styles.tripDivider} />}
    </React.Fragment>
  ))}
</View>

        {/* --- BANNERS SECTION --- */}
        <Animated.View entering={FadeInRight.delay(1100).duration(600)}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bannersSection}>
          <View style={styles.bannerPurple}>
            <Text style={styles.bannerPurpleTitle}>Cashback that{'\n'}takes you places</Text>
            <Image 
              source={{ uri: 'https://images.unsplash.com/photo-1565026057447-bc90a3dceeee?auto=format&fit=crop&w=300&q=80' }} 
              style={styles.bannerPurpleImg} 
              resizeMode="contain"
            />
            <Text style={styles.bannerPurpleFoot}>TravelBACK</Text>
          </View>

          <View style={styles.bannerPhoto}>
            <Image 
              source={{ uri: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=300&q=80' }} 
              style={styles.bannerPhotoImg} 
              resizeMode="cover"
            />
            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.bannerPhotoOverlay}>
              <Text style={styles.bannerPhotoText}>Travel more.{'\n'}Get more BACK.</Text>
            </LinearGradient>
          </View>
          <View style={{ width: 20 }} />
        </ScrollView>
        </Animated.View>
      </Animated.ScrollView>

      {/* --- MENU OVERLAY --- */}
      {isMenuOpen && (
        <Animated.View 
          entering={FadeIn.duration(200)} 
          exiting={FadeOut.duration(200)} 
          style={styles.menuOverlay}
        >
          <TouchableOpacity 
            style={{ flex: 1 }} 
            activeOpacity={1} 
            onPress={() => setIsMenuOpen(false)}
          >
            <Animated.View 
              entering={FadeIn.duration(200)} 
              exiting={FadeOut.duration(200)}
              style={[styles.dropdownMenu, { top: insets.top + 65 }]}
            >
              
              {/* Item 1: Profile */}
              <TouchableOpacity style={styles.menuItem} onPress={() => { setIsMenuOpen(false); router.push('/settings'); }}>
                <View style={styles.menuIconContainer}>
                  <UserIcon size={18} color="#0F022D" weight="bold" />
                </View>
                <Text style={styles.menuItemText}>My Profile</Text>
              </TouchableOpacity>
              
              <View style={styles.menuDivider} />

              {/* Item 2: Notifications */}
              <TouchableOpacity style={styles.menuItem} onPress={() => { setIsMenuOpen(false); router.push('/notifications'); }}>
                <View style={styles.menuIconContainer}>
                  <BellIcon size={18} color="#0F022D" weight="bold" />
                </View>
                <Text style={styles.menuItemText}>Notifications</Text>
              </TouchableOpacity>

              <View style={styles.menuDivider} />

              {/* Item 3: Support */}
              <TouchableOpacity style={styles.menuItem} onPress={() => { setIsMenuOpen(false); router.push('/support'); }}>
                <View style={styles.menuIconContainer}>
                  <QuestionMarkIcon size={18} color="#0F022D" weight="bold" />
                </View>
                <Text style={styles.menuItemText}>Help & Support</Text>
              </TouchableOpacity>

            </Animated.View>
          </TouchableOpacity>
        </Animated.View>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  
  // --- HEADER ---
  header: {
    backgroundColor: '#1B0F4A',
    paddingHorizontal: 20,
    paddingBottom: 40,
    overflow: 'hidden',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    zIndex: 2, 
  },
  logoImage: {
    width: 130, 
    height: 24,
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 12,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 20,
    fontFamily: fonts.regular,
    color: 'rgb(255, 255, 255)',
    marginBottom: 30,
    zIndex: 2,
  },
  firstName: {
    fontSize: 20,
    fontFamily: fonts.bold,
    color: 'rgb(255, 255, 255)',
    zIndex: 2,
  },
  
  // --- BALANCE ---
  balanceSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 30,
    zIndex: 2,
  },
  balanceLabel: {
    fontSize: 12,
    fontFamily: fonts.bold,
    letterSpacing: 1.35,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 5, 
  },
  balanceValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  currency: {
    fontSize: 30,
    color: '#FFF',
    fontFamily: fonts.bold,
  },
  balanceValue: {
    fontSize: 40,
    fontFamily: fonts.bold,
    color: '#FFF',
    letterSpacing: -1,
    lineHeight: 50, 
  },
  balanceUsd: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    fontFamily: fonts.bold,
    letterSpacing: -0.7,
    marginTop: -4, 
  },
  
  // (Ícone do Olho e Botão Statement)
  rightActions: {
    alignItems: 'flex-end',
    paddingBottom: 0,
  },
  eyeButton: {
    marginBottom: 8, 
    padding: 4,      
  },
  statementBtn: {
    alignItems: 'center',
    gap: 6,
    marginBottom: 1, 
  },
  statementBtnText: {
    fontSize: 12,
    fontFamily: fonts.bold,
    letterSpacing: 0.9,
    color: '#85EDD3',
  },

  // --- ACTIVITY ---
  activityTitle: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 7,
    letterSpacing: 0.5,
    zIndex: 2,
  },
  activityScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
    overflow: 'visible',
    zIndex: 2,
  },
  activityCard: {
    backgroundColor: 'rgba(255, 255, 255, 0)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 12,
    paddingHorizontal: 16,
    minWidth: 180,
    marginRight: 12,
    marginBottom: 8,
  },
  activityCardTitle: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: '#FFF',
    marginBottom: 1,
  },
  activityCardSub: {
    fontSize: 8,
    fontFamily: fonts.medium,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  activityCardVal: {
    fontSize: 14,
    fontFamily: fonts.bold_italic,
    color: '#FFF',
  },

  // --- QUICK ACTIONS ---
  quickActions: {
    paddingHorizontal: 20,
    marginTop: -20,
    zIndex: 10,
    gap: 12,
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
  actionTitlePurple: {
    fontSize: 21,
    fontFamily: fonts.bold,
    color: '#85EDD3',
    marginBottom: 2,
    letterSpacing: -0.5, 
  },
  actionDescPurple: {
    fontSize: 10,
    fontFamily: fonts.regular,
    letterSpacing: 0.9,
    paddingBottom: 4,
    color: colors.text.light,
  },
  actionIconWrapper: {
    marginLeft: 16,
  },

  // --- TRIPS SECTION ---
  tripsSection: {
    padding: 20,
    paddingTop: 72,
  },
  sectionHeader: {
    marginBottom: 42,
  },
  sectionTitle: {
    fontSize: 45,
    fontFamily: fonts.bold,
    color: '#1a1a1a',
    lineHeight: 36,
  },
  sectionTitleItalic: {
    fontSize: 45,
    fontFamily: fonts.italic, 
    color: '#f07167',
    lineHeight: 36,
  },
  sectionSubtitle: {
    fontSize: 15,
    fontFamily: fonts.italic,
    color: '#6c757d',
    marginTop: 4,
    letterSpacing: 1,
  },
  tripCard: {
    marginBottom: 24, 
  },
  tripImgBox: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: '#CCC',
  },
  tripImg: {
    width: '100%',
    height: '100%',
  },
  tripTag: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(20, 10, 50, 0.9)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tripTagDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#85EDD3',
  },
  tripTagText: {
    color: '#FFF',
    fontSize: 10,
    fontFamily: fonts.bold,
  },
  tripInfo: {
    marginBottom: 4,
  },
  tripInfoTitle: {
    fontSize: 26,
    fontFamily: fonts.bold,
    color: '#1a1a1a',
    marginBottom: 6,
    letterSpacing: -0.6,
  },
  tripInfoDesc: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: '#6c757d',
    lineHeight: 18,
    marginBottom: 8,
  },
  tripDivider: {
    height: 2,
    width: 60,
    backgroundColor: '#7D7BFE',
    marginBottom: 40,
  },

  // --- BANNERS SECTION ---
  bannersSection: {
    paddingLeft: 20,
    marginBottom: 20,
  },
  bannerPurple: {
    width: 200,
    height: 260,
    borderRadius: 12,
    backgroundColor: '#5b32e0',
    padding: 20,
    marginRight: 16,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  bannerPurpleTitle: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: fonts.bold,
    lineHeight: 20,
    zIndex: 2,
  },
  bannerPurpleImg: {
    position: 'absolute',
    bottom: 0,
    left: '10%',
    width: '80%',
    height: '60%',
    opacity: 0.8,
  },
  bannerPurpleFoot: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 10,
    fontFamily: fonts.bold,
    zIndex: 2,
  },
  bannerPhoto: {
    width: 200,
    height: 260,
    borderRadius: 12,
    marginRight: 16,
    overflow: 'hidden',
    backgroundColor: '#333',
  },
  bannerPhotoImg: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  bannerPhotoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingTop: 40,
  },
  bannerPhotoText: {
    color: '#FFF',
    fontSize: 14,
    fontFamily: fonts.bold,
    lineHeight: 18,
  },

  // --- MENU OVERLAY ESTILOS ---
  menuOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(27, 15, 74, 0.25)', 
    zIndex: 100,
  },
  dropdownMenu: {
    position: 'absolute',
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 1)', // Fundo alinhado aos action cards
    borderRadius: 12, // Um pouco mais arredondado para casar com os cards
    width: 200,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
  },
  menuIconContainer: {
    width: 28,
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: colors.text.medium,
  },
  menuDivider: {
    height: 1,
    backgroundColor: 'rgba(15, 2, 45, 0.08)', // Divisória super sutil e elegante
    marginHorizontal: 16,
  },
});