import { StatusBar } from 'expo-status-bar';
import { ArrowUpRight, CheckCircle, Crown, Package } from 'phosphor-react-native';
import React from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/src/components/ScreenHeader';
import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

export default function SubscriptionsScreen() {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <StatusBar style="light" />
      
      {/* Seção Superior (Preta) */}
      <View style={[styles.darkHeader, { paddingTop: insets.top }]}>
        <ScreenHeader title="ASSINATURAS" dark={true} />
        
        
        <View style={styles.headerContent}>
          <Text style={styles.mainTitle}>Assinaturas</Text>
          <Text style={styles.pageDescription}>
            Eleve sua experiência de viagem com benefícios pensados para quem não para de explorar.
          </Text>
          <View style={styles.accentLine} />
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.mainContent}>
          
          <View style={styles.sectionHeading}>
            <Text style={styles.sectionHeadingText}>PLANO ATIVO</Text>
          </View>

          {/* CARD DO PLANO TRAVELBACK CLUB */}
          <View style={styles.subscriptionCard}>
            <View style={styles.planHeader}>
              <View>
                <Text style={styles.planName}>TRAVELBACK CLUB</Text>
                <Text style={styles.planPrice}>R$ 20<Text style={styles.pricePeriod}>/mês</Text></Text>
              </View>
              <Crown size={32} color={colors.brand.primary} weight="duotone" />
            </View>

            <View style={styles.divider} />

            {/* BENEFÍCIOS */}
            <View style={styles.benefitsList}>
              <View style={styles.benefitItem}>
                <CheckCircle size={20} color={colors.brand.primary} weight="fill" />
                <Text style={styles.benefitText}>
                  <Text style={styles.boldText}>+15% de cashback</Text> em todas as experiências da TravelShop.
                </Text>
              </View>

              <View style={styles.benefitItem}>
                <Package size={20} color={colors.brand.primary} weight="fill" />
                <Text style={styles.benefitText}>
                  <Text style={styles.boldText}>Mochila TravelBack</Text> exclusiva entregue na sua casa todo mês.
                </Text>
              </View>

              <View style={styles.benefitItem}>
                <ArrowUpRight size={20} color={colors.brand.primary} weight="fill" />
                <Text style={styles.benefitText}>
                  Acesso prioritário a <Text style={styles.boldText}>edições limitadas</Text> de malas e acessórios.
                </Text>
              </View>
            </View>

            <TouchableOpacity style={styles.primaryButton} activeOpacity={0.8}>
              <Text style={styles.primaryButtonText}>GERENCIAR ASSINATURA</Text>
            </TouchableOpacity>
          </View>

          {/* SEÇÃO DA MOCHILA (DETALHE DO PRODUTO) */}
          <View style={styles.sectionHeading}>
            <Text style={styles.sectionHeadingText}>ESTE MÊS NA MOCHILA</Text>
          </View>

          <View style={styles.kitCard}>
            <View style={styles.kitInfo}>
              <Text style={styles.kitTitle}>KIT "SURPRESAS DE VIAGEM"</Text>
              <Text style={styles.kitDesc}>
                Além da sua nova mochila, este mês incluímos um adaptador universal premium e um kit de higiene sólido sustentável.
              </Text>
              <View style={styles.tag}>
                <Text style={styles.tagText}>ENTREGA EM 04/05</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.cancelLink}>
            <Text style={styles.cancelLinkText}>Cancelar assinatura</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    paddingBottom: 40,
  },
  headerContent: {
    paddingHorizontal: 24,
    marginTop: -10,
  },
  mainTitle: {
    fontSize: 48,
    fontFamily: fonts.bold,
    color: colors.text.light,
    letterSpacing: -1.5,
  },
  pageDescription: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: '#aaaaaa',
    lineHeight: 22,
    marginTop: 10,
    maxWidth: '90%',
  },
  accentLine: {
    width: 32,
    height: 3,
    backgroundColor: colors.brand.primary,
    marginTop: 24,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
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
  subscriptionCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    padding: 24,
    marginBottom: 40,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  planName: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: colors.brand.primary,
    letterSpacing: 1,
  },
  planPrice: {
    fontSize: 32,
    fontFamily: fonts.bold,
    color: colors.text.dark,
    marginTop: 4,
  },
  pricePeriod: {
    fontSize: 14,
    color: colors.text.muted,
  },
  divider: {
    height: 1,
    backgroundColor: '#EEEEEE',
    marginVertical: 24,
  },
  benefitsList: {
    gap: 16,
    marginBottom: 32,
  },
  benefitItem: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  benefitText: {
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.text.dark,
    lineHeight: 20,
  },
  boldText: {
    fontFamily: fonts.bold,
  },
  primaryButton: {
    backgroundColor: colors.text.dark, // Usando preto para o botão para variar da TravelShop
    paddingVertical: 18,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: colors.text.light,
    fontSize: 12,
    fontFamily: fonts.bold,
    letterSpacing: 1,
  },
  kitCard: {
    backgroundColor: colors.background.dark,
    padding: 24,
    marginBottom: 24,
  },
  kitInfo: {
    gap: 12,
  },
  kitTitle: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: colors.text.light,
    textTransform: 'uppercase',
  },
  kitDesc: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: '#aaaaaa',
    lineHeight: 20,
  },
  tag: {
    backgroundColor: colors.brand.primary,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 8,
  },
  tagText: {
    fontSize: 10,
    fontFamily: fonts.bold,
    color: colors.text.light,
  },
  cancelLink: {
    marginTop: 20,
    alignSelf: 'center',
  },
  cancelLinkText: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: colors.text.muted,
    textDecorationLine: 'underline',
  }
});