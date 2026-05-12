import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { CurrencyDollar, MapPinAreaIcon, ShoppingBag, Wallet } from 'phosphor-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { useAnimatedScrollHandler, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { BalanceDisplay } from '@/src/components/BalanceDisplay';
import { TopBar } from '@/src/components/Topbar';
import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

import { fetchHomeData, HomeData } from '@/src/services/api';

const FEATURED_EXPERIENCES = [
  { id: '1', title: 'Louvre Privé', tag: 'ARTE', image: 'https://images.unsplash.com/photo-1543332164-6e82f355badc?auto=format&fit=crop&w=600&q=80' },
  { id: '2', title: 'Safari Serengeti', tag: 'AVENTURA', image: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=600&q=80' },
  { id: '3', title: 'Ryokan Kyoto', tag: 'RELAX', image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=600&q=80' },
];

export default function HomeScreen() { 
  const router = useRouter();
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

  const insets = useSafeAreaInsets();

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
        <ActivityIndicator size="large" color={colors.text.light} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <StatusBar style="light" />
      
      <Animated.ScrollView 
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      >
        {/* Cabeçalho sólido original restaurado */}
        <View style={[styles.darkHeader, { paddingTop: insets.top + 38 }]}>
          <Text style={styles.greeting}>Olá, {data.user.firstName}</Text>

          <BalanceDisplay 
            balanceBRL={data.user.balanceBRL} 
            balanceUSD={data.user.balanceUSD} 
            showStatementLink={true}
            showToggleIcon={true}
          />

          <Text style={styles.highlightsLabel}>Atividade da Conta</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.highlightsContainer}>
            {data.recentTransactions.map((tx) => (
              <TouchableOpacity 
                key={tx.id} 
                style={styles.highlightCard} 
                onPress={() => router.push('/statement')}
                activeOpacity={0.7}
              >
                <Text style={styles.highlightTitle}>{tx.title}</Text>
                <Text style={styles.highlightDate}>{tx.dateLabel}</Text>
                <Text style={styles.highlightAmount}>{tx.amount}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.mainContent}>
          <TouchableOpacity activeOpacity={0.8} style={styles.walletBanner}>
            <View>
              <Text style={styles.walletTitle}>Carteira</Text>
              <Text style={styles.walletDesc}>Acesse sua carteira</Text>
            </View>
            <Wallet size={32} color={colors.text.light} weight="bold" />
          </TouchableOpacity>

          <View style={styles.actionGrid}>
            <TouchableOpacity onPress={() => router.push('/travelshop')} style={styles.actionCard} activeOpacity={0.7}>
              <ShoppingBag size={28} color={colors.text.dark} weight="bold" style={{ marginBottom: 16 }} />
              <View>
                <Text style={styles.actionCardTitle}>Travelshop</Text>
                <Text style={styles.actionCardDesc}>Reserve sua viagem</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/subscriptions')} style={styles.actionCard} activeOpacity={0.7}>
              <CurrencyDollar size={28} color={colors.text.dark} weight="bold" style={{ marginBottom: 16 }} />
              <View>
                <Text style={styles.actionCardTitle}>Assinaturas</Text>
                <Text style={styles.actionCardDesc}>Membro Club</Text>
              </View>
            </TouchableOpacity>
          </View>

          <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/assistant')} style={styles.assistantCard}>
            <View>
              <Text style={styles.assistantTitle}>Assistente de Viagem</Text>
              <Text style={styles.assistantDesc}>Converse com a Bia</Text>
            </View>
            <MapPinAreaIcon size={28} color={colors.text.dark} />
          </TouchableOpacity>

          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Inspirações de Viagem</Text>
              <Text style={styles.sectionSubtitle}>Experiências selecionadas</Text>
            </View>
            <TouchableOpacity><Text style={styles.viewAllLink}>VER TUDO</Text></TouchableOpacity>
          </View>

          {data.curatedTrips.map((trip) => (
            <View key={trip.id} style={styles.tripCard}>
              <View style={styles.tripImageContainer}>
                {/* resizeMode cover garante que a foto da API ocupe o espaço exato sem distorcer */}
                <Image source={{ uri: trip.imageUrl }} style={styles.tripImage} resizeMode="cover" />
                <LinearGradient colors={['rgba(0,0,0,0.75)', 'rgba(0,0,0,0)']} start={[0, 1]} end={[0, 0]} style={styles.tripGradient}>
                    <View style={styles.tripTag}><Text style={styles.tripTagText}>{trip.tag}</Text></View>
                </LinearGradient>
              </View>
              <Text style={styles.tripTitle}>{trip.title}</Text>
              <Text style={styles.tripDesc}>{trip.description}</Text>
            </View>
          ))}

          <View style={[styles.sectionHeader, { marginTop: 20 }]}>
            <View>
              <Text style={styles.sectionTitle}>Sugestões Premium</Text>
              <Text style={styles.sectionSubtitle}>Resgatáveis com Cashback</Text>
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.carouselContainer}>
            {FEATURED_EXPERIENCES.map((exp) => (
              <TouchableOpacity key={exp.id} activeOpacity={0.9} style={styles.carouselCard}>
                {/* resizeMode cover força todos os cards a terem a mesma geometria física */}
                <Image source={{ uri: exp.image }} style={styles.carouselImage} resizeMode="cover" />
                <View style={styles.carouselOverlay}>
                  <Text style={styles.carouselTag}>{exp.tag}</Text>
                  <Text style={styles.carouselTitle}>{exp.title}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>

        </View>
      </Animated.ScrollView>
      <TopBar scrollY={scrollY} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.light },
  
  // Voltando à cor sólida no cabeçalho
  darkHeader: { backgroundColor: colors.background.dark, padding: 24, paddingBottom: 30 },
  greeting: { color: colors.text.light, fontSize: 20, fontFamily: fonts.bold, marginBottom: 15, textTransform: 'uppercase' },
  highlightsLabel: { color: colors.text.muted, fontSize: 15, fontFamily: fonts.regular, marginBottom: 10, marginTop: 20 },
  highlightsContainer: { flexDirection: 'row', marginHorizontal: -24, paddingHorizontal: 24 },
  
  // Voltando à cor sólida no card
  highlightCard: { backgroundColor: colors.background.cardDark, padding: 16, borderRadius: 0, width: 240, marginRight: 16, marginTop: -5, marginBottom: -5 },
  highlightTitle: { color: colors.text.light, fontSize: 14, fontFamily: fonts.bold, marginBottom: 4 },
  highlightDate: { color: colors.text.muted, fontSize: 10, fontFamily: fonts.bold, marginBottom: 16 },
  highlightAmount: { color: colors.text.light, fontSize: 16, fontFamily: fonts.bold },
  
  mainContent: { padding: 24, marginTop: -12, backgroundColor: colors.background.light },
  walletBanner: { backgroundColor: colors.brand.primary, padding: 19, borderRadius: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  walletTitle: { color: colors.text.light, fontSize: 17, fontFamily: fonts.bold },
  walletDesc: { color: colors.text.light, opacity: 0.8, fontSize: 10, marginTop: -5 },
  actionGrid: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  actionCard: { backgroundColor: colors.background.cardLight, flex: 1, padding: 9, minHeight: 130, justifyContent: 'space-between', borderRadius: 0 },
  actionCardTitle: { fontSize: 17, fontFamily: fonts.bold, color: colors.text.dark, letterSpacing: -0.5, marginBottom: -2 },
  actionCardDesc: { fontSize: 11, fontFamily: fonts.regular, color: colors.text.muted },
  assistantCard: { backgroundColor: colors.background.cardLight, padding: 19, borderRadius: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  assistantTitle: { fontSize: 17, fontFamily: fonts.bold, color: colors.text.dark, letterSpacing: -0.5, marginBottom: -5 },
  assistantDesc: { fontSize: 11, fontFamily: fonts.regular, color: colors.text.muted },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 15 },
  sectionTitle: { fontSize: 21, fontFamily: fonts.bold, color: colors.text.dark, letterSpacing: -0.9, marginBottom: -5 },
  sectionSubtitle: { fontSize: 12, fontFamily: fonts.bold, color: colors.text.muted },
  viewAllLink: { fontSize: 12, fontFamily: fonts.bold, color: colors.brand.primary, textTransform: 'uppercase' },
  tripCard: { marginBottom: 32 },
  tripImageContainer: { width: '100%', height: 380, backgroundColor: '#E5E5E5', marginBottom: 12, borderRadius: 0, overflow: 'hidden' },
  tripImage: { width: '100%', height: '100%' },
  tripGradient: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', paddingBottom: 20 },
  tripTag: { backgroundColor: 'rgba(255, 255, 255, 0.2)', paddingVertical: 6, paddingHorizontal: 12, marginLeft: 20, alignSelf: 'flex-start' },
  tripTagText: { color: colors.text.light, fontSize: 10, fontFamily: fonts.bold },
  tripTitle: { fontSize: 24, fontFamily: fonts.bold, color: colors.text.dark, marginBottom: 4, letterSpacing: -0.9 },
  tripDesc: { fontSize: 14, fontFamily: fonts.regular, color: '#444', lineHeight: 20 },
  
  carouselContainer: { marginHorizontal: -24, paddingHorizontal: 24, paddingBottom: 20 },
  
  // Forçando tamanho fixo e uniforme (Proporção retrato)
  carouselCard: { width: 180, height: 240, marginRight: 16, backgroundColor: '#EEE', overflow: 'hidden', borderRadius: 0 },
  carouselImage: { width: '100%', height: '100%' },
  carouselOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)', padding: 12, justifyContent: 'flex-end' },
  carouselTag: { color: colors.text.light, fontSize: 9, fontFamily: fonts.bold, marginBottom: 4, letterSpacing: 1 },
  carouselTitle: { color: colors.text.light, fontSize: 16, fontFamily: fonts.bold, letterSpacing: -0.5 }
});