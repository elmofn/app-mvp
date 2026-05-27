import { StatusBar } from 'expo-status-bar';
import React from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

import { TopBar } from '@/src/components/Topbar';
import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

export default function TravelShopScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();

  // Shared value para controlar a animação da TopBar
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <StatusBar style="light" />
      
      {/* ScrollView Animado para passar a posição Y para a TopBar */}
      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarHeight + 24 }]}
      >
        
        {/* Seção Superior (DarkHeader) */}
        {/* O paddingTop inclui a altura do insets + espaço para não sobrepor os ícones da TopBar */}
        <View style={[styles.darkHeader, { paddingTop: insets.top + 70 }]}>
          <Text style={styles.mainTitle}>
            Use seu cashback{'\n'}para novas{'\n'}experiências.
          </Text>
          <View style={styles.accentLine} />
        </View>

        {/* Seção Inferior (Main Content) */}
        <View style={styles.mainContent}>
          
          <View style={styles.sectionHeading}>
            <Text style={styles.sectionHeadingText}>EXCLUSIVO</Text>
          </View>

          {/* CARD 1 - AÉREO */}
          <TouchableOpacity style={styles.card} activeOpacity={0.9}>
            <View style={styles.cardImageContainer}>
              <Image 
                source={{ uri: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80' }} 
                style={styles.cardImage} 
              />
              {/* Overlay escuro opcional para simular a seriedade do grayscale */}
              <View style={styles.imageOverlay} />
              <View style={styles.badge}>
                <Text style={styles.badgeText}>AÉREO</Text>
              </View>
            </View>
            
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>VOO PARA LONDRES</Text>
              <Text style={styles.cardDesc}>
                Classe executiva saindo de São Paulo. Experiência premium com acesso a lounges exclusivos e serviço de bordo internacional.
              </Text>
              
              <Text style={styles.priceLabel}>A PARTIR DE</Text>
              <Text style={styles.price}>R$ 12.400</Text>
              <Text style={styles.points}>20% de CashBack!</Text>
              
              <View style={styles.btn}>
                <Text style={styles.btnText}>COMPRAR</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* CARD 2 - HOSPEDAGEM */}
          <TouchableOpacity style={styles.card} activeOpacity={0.9}>
            <View style={styles.cardImageContainer}>
              <Image 
                source={{ uri: 'https://images.unsplash.com/photo-1503899036067-0479ed6c9259?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80' }} 
                style={styles.cardImage} 
              />
              <View style={styles.imageOverlay} />
              <View style={styles.badge}>
                <Text style={styles.badgeText}>HOSPEDAGEM</Text>
              </View>
            </View>
            
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>AMAN TOKYO</Text>
              <Text style={styles.cardDesc}>
                4 noites na Suíte Panorâmica. Imersão na tranquilidade minimalista acima do centro financeiro de Otemachi.
              </Text>
              
              <Text style={[styles.priceLabel, { marginTop: 8 }]}>CASHBACK APLICÁVEL</Text>
              <Text style={[styles.price ]}>R$ 8.200</Text>
              <Text style={styles.points}>12% de CashBack!</Text>
              
              <View style={styles.btn}>
                <Text style={styles.btnText}>COMPRAR</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* CARD 3 - TEXTO APENAS */}
          <TouchableOpacity style={styles.textCard} activeOpacity={0.8}>
            <View style={styles.textCardContent}>
              <Text style={styles.cardTitle}>EXPERIÊNCIA GASTRONÔMICA{'\n'}PARIS</Text>
              <Text style={styles.cardDesc}>Reserva prioritária em restaurante com estrela Michelin.</Text>
              
              <View style={styles.cardFooter}>
                <Text style={styles.price}>R$ 1.500</Text>
                <View style={styles.linkDetails}>
                  <Text style={styles.linkDetailsText}>DETALHES</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>

          {/* CARD 4 - TEXTO APENAS (INVITE ONLY) */}
          <TouchableOpacity style={styles.textCard} activeOpacity={0.8}>
            <View style={styles.textCardContent}>
              <Text style={styles.cardTitle}>BOUTIQUE SUÍÇA</Text>
              <Text style={styles.cardDesc}>Acesso antecipado a coleções limitadas com concierge.</Text>
              
              <View style={styles.cardFooter}>
                <Text style={styles.inviteOnly}>Somente Convite</Text>
                <View style={styles.linkDetails}>
                  <Text style={styles.linkDetailsText}>DETALHES</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>

        </View>
      </Animated.ScrollView>

      {/* TopBar global que reage ao scroll */}
      <TopBar scrollY={scrollY} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.light, // Fundo claro da aplicação
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  darkHeader: {
    backgroundColor: colors.background.dark,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  mainTitle: {
    fontSize: 32,
    fontFamily: fonts.bold,
    color: colors.text.light,
    lineHeight: 36,
    letterSpacing: -1,
  },
  accentLine: {
    width: 32,
    height: 3,
    backgroundColor: colors.brand.primary,
    marginTop: 24,
  },
  mainContent: {
    padding: 24,
  },
  sectionHeading: {
    marginBottom: 20,
    alignSelf: 'flex-start',
    borderBottomWidth: 2,
    borderBottomColor: colors.text.dark,
    paddingBottom: 4,
  },
  sectionHeadingText: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: colors.text.dark,
    letterSpacing: 1,
  },
  card: {
    backgroundColor: '#FFFFFF',
    marginBottom: 24,
    borderRadius: 0, // Swiss style usa quinas mais duras (sharp edges)
    borderWidth: 1,
    borderColor: '#E5E5E5',
    overflow: 'hidden',
  },
  cardImageContainer: {
    width: '100%',
    height: 200,
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.1)', // Dá um toque levemente lavado
  },
  badge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: colors.background.dark,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  badgeText: {
    color: colors.text.light,
    fontSize: 9,
    fontFamily: fonts.bold,
    letterSpacing: 1,
  },
  cardContent: {
    padding: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: colors.text.dark,
    marginBottom: 12,
    letterSpacing: -0.5,
    textTransform: 'uppercase',
  },
  cardDesc: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.text.muted,
    lineHeight: 18,
    marginBottom: 20,
  },
  priceLabel: {
    fontSize: 9,
    fontFamily: fonts.bold,
    color: '#888888',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  price: {
    fontSize: 22,
    fontFamily: fonts.bold,
    color: colors.text.dark,
    letterSpacing: -1,
  },
  points: {
    fontSize: 10,
    fontFamily: fonts.bold,
    color: colors.brand.primary,
    marginTop: 4,
    marginBottom: 16,
  },
  btn: {
    width: '100%',
    backgroundColor: colors.brand.primary,
    padding: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  btnText: {
    color: colors.text.light,
    fontSize: 11,
    fontFamily: fonts.bold,
    letterSpacing: 1,
  },
  textCard: {
    backgroundColor: '#FFFFFF',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  textCardContent: {
    padding: 24,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 24,
  },
  inviteOnly: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: colors.text.dark,
    letterSpacing: -0.5,
  },
  linkDetails: {
    borderBottomWidth: 1.5,
    borderBottomColor: colors.text.dark,
    paddingBottom: 2,
  },
  linkDetailsText: {
    fontSize: 10,
    fontFamily: fonts.bold,
    color: colors.text.dark,
    letterSpacing: 0.5,
  },
});