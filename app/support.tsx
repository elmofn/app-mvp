import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowRight, CaretLeft, Robot, VideoCamera, WhatsappLogo } from 'phosphor-react-native';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

export default function SupportScreen() {
  const router = useRouter();

  const faqs = [
    { id: '1', question: 'HOW DO I FREEZE MY PHYSICAL CARD?' },
    { id: '2', question: 'TRAVEL INSURANCE COVERAGE LIMITS' },
    { id: '3', question: 'INTERNATIONAL ATM WITHDRAWAL FEES' },
    { id: '4', question: 'ADDING FUNDS VIA SWIFT TRANSFER' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Mantém a barra de status branca já que o topo é preto */}
      <StatusBar style="light" /> 
      
      <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
        
        {/* === SEÇÃO SUPERIOR ESCURA === */}
        <View style={styles.headerSection}>
          
          <TouchableOpacity onPress={() => router.back()} style={styles.backNav} activeOpacity={0.7}>
            <CaretLeft size={16} color={colors.text.light} weight="bold" />
            <Text style={styles.backNavText}>SUPPORT</Text>
          </TouchableOpacity>

          <Text style={styles.mainTitle}>How Can{'\n'}We Assist{'\n'}You?</Text>

          <View style={styles.contactCards}>
            
            {/* Card 1: Whatsapp (Azul) */}
            <TouchableOpacity style={[styles.card, styles.cardBlue]} activeOpacity={0.8}>
              <View>
                <Text style={[styles.cardTitle, { color: colors.text.light }]}>Whatsapp</Text>
                <Text style={[styles.cardSubtitle, { color: colors.text.light }]}>DIRECT SUPPORT</Text>
              </View>
              <WhatsappLogo size={28} color={colors.text.light} weight="fill" />
            </TouchableOpacity>

            {/* Card 2: Video Call (Branco) */}
            <TouchableOpacity style={[styles.card, styles.cardWhite]} activeOpacity={0.8}>
              <View>
                <Text style={[styles.cardTitle, { color: colors.text.dark }]}>Video Call</Text>
                <Text style={[styles.cardSubtitle, { color: '#888888' }]}>VISUAL ASSISTANT</Text>
              </View>
              <VideoCamera size={28} color={colors.text.dark} weight="fill" />
            </TouchableOpacity>

            {/* Card 3: Travel Assistant (Branco) */}
            <TouchableOpacity style={[styles.card, styles.cardWhite]} activeOpacity={0.8}>
              <View>
                <Text style={[styles.cardTitle, { color: colors.text.dark }]}>Travel Assistant</Text>
                <Text style={[styles.cardSubtitle, { color: '#888888' }]}>AI ASSISTANT</Text>
              </View>
              <Robot size={28} color={colors.text.dark} weight="fill" />
            </TouchableOpacity>

          </View>
        </View>

        {/* === SEÇÃO INFERIOR CLARA (FAQ) === */}
        <View style={styles.faqSection}>
          <Text style={styles.faqSubtitle}>KNOWLEDGE BASE</Text>
          <Text style={styles.faqTitle}>FREQUENT{'\n'}QUESTIONS</Text>

          <View style={styles.faqList}>
            {faqs.map((faq) => (
              <TouchableOpacity key={faq.id} style={styles.faqItem} activeOpacity={0.7}>
                <Text style={styles.faqItemText}>{faq.question}</Text>
                <ArrowRight size={20} color={colors.text.dark} weight="bold" />
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.aboutAppButton} activeOpacity={0.7}>
            <Text style={styles.aboutAppText}>ABOUT THE APP</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.dark, // Previne que o overscroll no topo revele cor clara
  },
  
  /* --- ESTILOS DO TOPO (ESCURO) --- */
  headerSection: {
    backgroundColor: colors.background.dark,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
  },
  backNav: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
    gap: 4,
  },
  backNavText: {
    color: colors.text.light,
    fontSize: 11,
    fontFamily: fonts.bold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  mainTitle: {
    color: colors.text.light,
    fontSize: 42,
    fontFamily: fonts.bold,
    lineHeight: 44, // Equivalente ao 1.05 do CSS
    marginBottom: 32,
    letterSpacing: -1,
  },
  contactCards: {
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderRadius: 0,
  },
  cardBlue: {
    backgroundColor: '#1A56FF', // Azul vibrante do seu CSS
  },
  cardWhite: {
    backgroundColor: colors.background.light, // Branco
  },
  cardTitle: {
    fontSize: 22,
    fontFamily: fonts.bold,
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  cardSubtitle: {
    fontSize: 9,
    fontFamily: fonts.bold,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },

  /* --- ESTILOS DA BASE (CLARO) --- */
  faqSection: {
    backgroundColor: '#F7F7F7', // Cinza bem claro do CSS
    paddingHorizontal: 24,
    paddingVertical: 40,
    minHeight: 500, // Garante que preencha a tela em celulares grandes
  },
  faqSubtitle: {
    color: '#1A56FF', // Azul da marca
    fontSize: 10,
    fontFamily: fonts.bold,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  faqTitle: {
    color: colors.text.dark,
    fontSize: 32,
    fontFamily: fonts.bold,
    lineHeight: 35, // Equivalente ao 1.1 do CSS
    marginBottom: 32,
    letterSpacing: -1,
  },
  faqList: {
    gap: 12,
  },
  faqItem: {
    backgroundColor: colors.background.light, // Cartão branco
    paddingVertical: 24,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    // Sombra sutil como no CSS (box-shadow)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 5,
    elevation: 1, // Para Android
  },
  faqItemText: {
    color: colors.text.dark,
    fontSize: 14,
    fontFamily: fonts.bold,
    lineHeight: 19, // Equivalente ao 1.4
    maxWidth: '85%',
  },
  aboutAppButton: {
    backgroundColor: '#D1D1D1',
    paddingVertical: 24,
    paddingHorizontal: 20,
    marginTop: 40,
  },
  aboutAppText: {
    color: colors.text.dark,
    fontSize: 18,
    fontFamily: fonts.bold,
  },
});