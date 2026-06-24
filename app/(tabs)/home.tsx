import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  BellIcon,
  CoinsIcon,
  EyeIcon,
  EyeSlashIcon,
  InfoIcon,
  ListIcon,
  SparkleIcon,
  SuitcaseRollingIcon,
  UserIcon
} from 'phosphor-react-native';
import React, { useCallback, useRef, useState } from 'react';
import { BackHandler, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActivityHighlights } from '@/src/components/ActivityHighlights';
import { HomeBannersCarousel } from '@/src/components/HomeBannersCarousel';
import { NextTrips } from '@/src/components/NextTrips';
import { useAlert } from '@/src/contexts/AlertContext';
import { useAuth } from '@/src/contexts/AuthContext';
import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';
import { getLocalCurrency } from '@/src/utils/balance';
import { formatCurrency } from '@/src/utils/format';

export default function HomeScreen() {
  const router = useRouter();
  const { account } = useAuth();
  const showAlert = useAlert();

  const firstName = account?.accountDetails.name?.trim().split(/\s+/)[0] ?? '';
  // available vem sempre em USD; convertemos para a moeda local
  // multiplicando pelo currentExchangeRate (cotacao da moeda do usuario
  // por 1 USD). symbol/code/rate vem do helper para refletir trocas
  // feitas em settings sem precisar re-login.
  const local = getLocalCurrency(account);
  const balanceUSD = account ? formatCurrency(account.balance.available) : '0,00';
  const balanceLocal = account ? formatCurrency(account.balance.available * local.rate) : '0,00';

  // Controle de Saldo
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);

  // Controle do Menu Suspenso
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const scrollY = useSharedValue(0);
  const scrollViewRef = useRef<Animated.ScrollView>(null);
  const isForcingAnimation = useSharedValue(false);

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

  // Intercepta o botao de voltar do Android na home: em vez de tentar
  // popar a stack (sem destino, leva a tela branca), abre um alert
  // confirmando saida do app. Cancelar mantem o usuario na home;
  // confirmar chama BackHandler.exitApp(). No iOS o evento nunca dispara.
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        showAlert(
          'Exit app',
          'Are you sure you want to leave TravelBACK?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Exit', style: 'destructive', onPress: () => BackHandler.exitApp() },
          ],
        );
        return true;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [showAlert]),
  );

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
    Hello, <Text style={styles.firstName}>{firstName}</Text>
  </Animated.Text>

  {/* Balance: entra da esquerda com delay */}
  <Animated.View entering={FadeInLeft.delay(200).duration(500)} style={styles.balanceSection}>
    <View>
      <Text style={styles.balanceLabel}>Available Balance</Text>
      <View style={styles.balanceValueContainer}>
        <Text style={styles.currency}>{local.symbol}</Text>
        <Text style={styles.balanceValue}>
          {isBalanceVisible ? balanceLocal : '****'}
        </Text>
      </View>
      <View style={styles.balanceUsdRow}>
        <Text style={styles.balanceUsd}>
          US$ {isBalanceVisible ? balanceUSD : '****'}
        </Text>
        <TouchableOpacity
          onPress={() =>
            showAlert(
              'Your Wallet is dollarized.',
              'You can choose the currency and display, and the balance will be updated according to the dollar exchange rate. The balance expires after 12 months of Inactivity',
            )
          }
          activeOpacity={0.7}
          hitSlop={10}
          style={styles.balanceInfoBtn}
        >
          <InfoIcon size={15} color="rgba(255,255,255,0.6)" weight="bold" />
        </TouchableOpacity>
      </View>
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

  {/* Activity Highlights: nao renderiza se a conta nao tem transacoes */}
  <ActivityHighlights statements={account?.statements} localCurrency={local} />
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
        <Text style={styles.actionTitle}>Travel Assistant</Text>
        <Text style={styles.actionDesc}>Planeje sua próxima jornada.</Text>
      </View>
      <View style={styles.actionIconWrapper}>
        <SparkleIcon size={32} color="#0F022D" weight="regular" />
      </View>
    </TouchableOpacity>
  </Animated.View>
</View>

{/* --- NEXT TRIP IDEAS: via payload do SignIn --- */}
<NextTrips trips={account?.nextTrips} />

        {/* --- HOME BANNERS: via payload do SignIn --- */}
        <HomeBannersCarousel banners={account?.homeBanners} />
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
  balanceUsdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: -4,
  },
  balanceUsd: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    fontFamily: fonts.bold,
    letterSpacing: -0.7,
  },
  balanceInfoBtn: {
    padding: 1,
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