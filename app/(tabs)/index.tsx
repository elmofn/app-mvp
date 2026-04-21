import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { CallBell, CurrencyDollar, Eye, EyeClosed, ShoppingBag, Wallet } from 'phosphor-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { useAnimatedScrollHandler, useSharedValue, withTiming } from 'react-native-reanimated';

import { TopBar } from '@/src/components/Topbar';
import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

import { fetchHomeData, HomeData } from '@/src/services/api';

export default function HomeScreen() { 
  const [showBalance, setShowBalance] = useState(true);
  
  const [data, setData] = useState<HomeData | null>(null);

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
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color={colors.text.light} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      <Animated.ScrollView 
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      >
        <View style={styles.darkHeader}>
          <View style={{ height: 25 }} />

          <Text style={styles.greeting}>Olá, {data.user.firstName}</Text>

          <View style={styles.balanceSection}>
            <Text style={styles.balanceLabel}>Saldo Disponível</Text>
            <View style={styles.balanceRow}>
              <Text style={styles.mainBalance}>
                <Text style={styles.currency}>R$ </Text>
                {showBalance ? data.user.balanceBRL : '••••••'}
              </Text>
              <TouchableOpacity onPress={() => setShowBalance(!showBalance)}>
                {showBalance ? (
                  <Eye size={28} color={colors.text.muted} />
                ) : (
                  <EyeClosed size={28} color={colors.text.muted} />
                )}
              </TouchableOpacity>
            </View>
            <View style={styles.balanceSubRow}>
              <Text style={styles.usdBalance}>{showBalance ? `US$ ${data.user.balanceUSD}` : 'US$ ••••••'}</Text>
              <TouchableOpacity>
                <Text style={styles.statementLink}>EXTRATO</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.highlightsLabel}>Atividade da Conta</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.highlightsContainer}>
            
            {data.recentTransactions.map((tx) => (
              <View key={tx.id} style={styles.highlightCard}>
                <Text style={styles.highlightTitle}>{tx.title}</Text>
                <Text style={styles.highlightDate}>{tx.dateLabel}</Text>
                <Text style={styles.highlightAmount}>{tx.amount}</Text>
              </View>
            ))}

          </ScrollView>
        </View>

        <View style={styles.mainContent}>
          
          <View style={styles.walletBanner}>
            <View>
              <Text style={styles.walletTitle}>Carteira</Text>
              <Text style={styles.walletDesc}>Acesse sua carteira</Text>
            </View>
            <Wallet size={32} color={colors.text.light} weight="bold" />
          </View>

          <View style={styles.actionGrid}>
            <View style={styles.actionCard}>
              <ShoppingBag size={28} color={colors.text.dark} style={{ marginBottom: 16 }} weight="bold" />
              <View>
                <Text style={styles.actionCardTitle}>Travelshop</Text>
                <Text style={styles.actionCardDesc}>Reserve sua viagem</Text>
              </View>
            </View>
            <View style={styles.actionCard}>
              <CurrencyDollar size={28} color={colors.text.dark} style={{ marginBottom: 16 }} weight="bold" />
              <View>
                <Text style={styles.actionCardTitle}>Assinaturas</Text>
                <Text style={styles.actionCardDesc}>Gerencie suas assinaturas</Text>
              </View>
            </View>
          </View>

          <View style={styles.assistantCard}>
            <View>
              <Text style={styles.assistantTitle}>Assistente de Viagem</Text>
              <Text style={styles.assistantDesc}>Converse com a Bia</Text>
            </View>
            <CallBell size={28} color={colors.text.dark} weight="fill" />
          </View>

          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Inspirações de Viagem</Text>
              <Text style={styles.sectionSubtitle}>Experiências selecionadas</Text>
            </View>
            <TouchableOpacity>
              <Text style={styles.viewAllLink}>VER TUDO</Text>
            </TouchableOpacity>
          </View>

          {data.curatedTrips.map((trip) => (
            <View key={trip.id} style={styles.tripCard}>
              <View style={styles.tripImageContainer}>
                <Image source={{ uri: trip.imageUrl }} style={styles.tripImage} />
                <LinearGradient
                  colors={['rgba(0,0,0,0.75)', 'rgba(0,0,0,0)']}
                  locations={[0.0, 1.0]} 
                  start={[0, 1]}
                  end={[0, 0]}
                  style={styles.tripGradient}
                >
                    <View style={styles.tripTag}>
                      <Text style={styles.tripTagText}>{trip.tag}</Text>
                    </View>
                </LinearGradient>
              </View>
              <Text style={styles.tripTitle}>{trip.title}</Text>
              <Text style={styles.tripDesc}>{trip.description}</Text>
            </View>
          ))}

        </View>
      </Animated.ScrollView>

      <TopBar scrollY={scrollY} />

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.light,
  },
  darkHeader: {
    backgroundColor: colors.background.dark,
    padding: 24,
    paddingTop: 38,
    paddingBottom: 15,
  },
  greeting: {
    color: colors.text.light,
    fontSize: 20,
    fontFamily: fonts.bold,
    letterSpacing: -0.5,
    marginBottom: 15,
    textTransform: 'uppercase',
  },
  balanceSection: {
    marginBottom: 15,
  },
  balanceLabel: {
    color: colors.text.muted,
    fontSize: 15,
    fontFamily: fonts.regular,
    letterSpacing: 0.9,
    marginBottom: -13,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: -15,
  },
  mainBalance: {
    color: colors.text.light,
    fontSize: 45,
    fontFamily: fonts.bold,
    letterSpacing: -0.5,
  },
  currency: {
    fontSize: 24,
  },
  balanceSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  usdBalance: {
    color: colors.text.muted,
    fontSize: 15,
    fontFamily: fonts.regular,
    letterSpacing: -0.5,
  },
  statementLink: {
    color: colors.brand.primary,
    fontSize: 12,
    fontFamily: fonts.bold,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  highlightsLabel: {
    color: colors.text.muted,
    fontSize: 15,
    fontFamily: fonts.regular,
    letterSpacing: 0.9,
    marginBottom: 10,
  },
  highlightsContainer: {
    flexDirection: 'row',
    marginHorizontal: -24,
    paddingHorizontal: 24,
  },
  highlightCard: {
    backgroundColor: colors.background.cardDark,
    padding: 16,
    borderRadius: 0,
    marginRight: 16,
    width: 240,
    marginTop: -5,
    marginBottom: -5,
  },
  highlightTitle: {
    color: colors.text.light,
    fontSize: 14,
    fontFamily: fonts.bold,
    marginBottom: 4,
  },
  highlightDate: {
    color: colors.text.muted,
    fontSize: 10,
    fontFamily: fonts.bold,
    marginBottom: 16,
  },
  highlightAmount: {
    color: colors.text.light,
    fontSize: 16,
    fontFamily: fonts.bold,
  },
  mainContent: {
    padding: 24,
    marginTop: -12,
  },
  walletBanner: {
    backgroundColor: colors.brand.primary,
    padding: 19 ,
    borderRadius: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  walletTitle: {
    color: colors.text.light,
    fontSize: 17,
    fontFamily: fonts.bold,
    letterSpacing: -0.5,
  },
  walletDesc: {
    color: colors.text.light,
    opacity: 0.8,
    fontSize: 10,
    fontFamily: fonts.regular,
    marginTop: -5,
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  actionCard: {
    backgroundColor: colors.background.cardLight,
    flex: 1,
    padding: 9,
    borderRadius: 0,
    minHeight: 130,
    justifyContent: 'space-between',
  },
  actionCardTitle: {
    fontSize: 17,
    fontFamily: fonts.bold,
    color: colors.text.dark,
    letterSpacing: -0.5,
    marginBottom: -2,
  },
  actionCardDesc: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: colors.text.muted,
    marginTop: 0,
  },
  assistantCard: {
    backgroundColor: colors.background.cardLight,
    padding: 19,
    borderRadius: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  assistantTitle: {
    fontSize: 17,
    fontFamily: fonts.bold,
    color: colors.text.dark,
    letterSpacing: -0.5,
    marginBottom: -5,
  },
  assistantDesc: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: colors.text.muted,
    marginTop: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 21,
    fontFamily: fonts.bold,
    color: colors.text.dark,
    letterSpacing: -0.9,
    marginBottom: -5,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontFamily: fonts.bold,
    letterSpacing: 0.2,
    color: colors.text.muted,
  },
  viewAllLink: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: colors.brand.primary,
    letterSpacing: -0.5,
    textTransform: 'uppercase',
  },
  tripCard: {
    marginBottom: 32,
  },
  tripImageContainer: {
    width: '100%',
    height: 400,
    borderRadius: 0,
    overflow: 'hidden',
    backgroundColor: '#E5E5E5',
    marginBottom: 10,
  },
  tripImage: {
    width: '100%',
    height: '100%',
  },
  tripGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 10, 
    bottom: 0, 
    justifyContent: 'flex-end', 
    paddingBottom: 20, 
  },
  tripTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginLeft: 20,
    marginRight: 'auto',
  },
  tripTagText: {
    color: colors.text.light,
    fontSize: 10,
    fontFamily: fonts.bold,
  },
  tripTitle: {
    fontSize: 24,
    fontFamily: fonts.bold,
    color: colors.text.dark,
    letterSpacing: -0.9,
    marginBottom: 8,
  },
  tripDesc: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: '#444',
    lineHeight: 20,
  },
});