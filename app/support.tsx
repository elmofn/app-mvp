import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { CaretLeft, ChatTeardropText, Phone, Plus } from 'phosphor-react-native';
import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

export default function SupportScreen() {
  const router = useRouter();

  const faqs = [
    { id: '1', question: 'COMO SOLICITO UM NOVO CARTÃO?' },
    { id: '2', question: 'QUAL O LIMITE DE SAQUE NO EXTERIOR?' },
    { id: '3', question: 'COMO FUNCIONA O SEGURO VIAGEM?' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <CaretLeft size={28} color={colors.text.light} />
        </TouchableOpacity>
        <Text style={styles.title}>SUPPORT</Text>
        <Text style={styles.subtitle}>ESTAMOS AQUI PARA AJUDAR VOCÊ EM QUALQUER LUGAR DO MUNDO.</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        <View style={styles.contactGrid}>
          
          <View style={styles.contactCard}>
            <View style={styles.cardHeader}>
              <ChatTeardropText size={28} color={colors.text.light} weight="bold" />
              <View style={styles.cardTextContent}>
                <Text style={styles.cardTitle}>CONCIERGE 24/7</Text>
                <Text style={styles.cardDesc}>FALE COM UM ESPECIALISTA AGORA MESMO.</Text>
              </View>
            </View>
            <TouchableOpacity>
              <Text style={styles.cardAction}>CHAT NOW</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.contactCard}>
            <View style={styles.cardHeader}>
              <Phone size={28} color={colors.text.light} weight="bold" />
              <View style={styles.cardTextContent}>
                <Text style={styles.cardTitle}>CALL US</Text>
                <Text style={styles.cardDesc}>NÚMEROS INTERNACIONAIS GRATUITOS.</Text>
              </View>
            </View>
            <TouchableOpacity>
              <Text style={styles.cardAction}>SEE NUMBERS</Text>
            </TouchableOpacity>
          </View>

        </View>

        <View style={styles.faqSection}>
          <Text style={styles.faqTitle}>FAQ</Text>
          
          {faqs.map((faq) => (
            <TouchableOpacity key={faq.id} style={styles.faqItem}>
              <Text style={styles.faqQuestion}>{faq.question}</Text>
              <Plus size={20} color={colors.text.light} weight="bold" />
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.dark,
  },
  header: {
    padding: 24,
    paddingTop: 20,
  },
  backButton: {
    marginBottom: 32,
    marginLeft: -8,
  },
  title: {
    color: colors.text.light,
    fontSize: 42,
    fontFamily: fonts.bold,
    letterSpacing: -2,
    lineHeight: 42,
  },
  subtitle: {
    color: colors.text.muted,
    fontSize: 12,
    fontFamily: fonts.bold,
    marginTop: 16,
    letterSpacing: 0.5,
    lineHeight: 18,
    textTransform: 'uppercase',
  },
  content: {
    padding: 24,
  },
  contactGrid: {
    gap: 16,
    marginBottom: 48,
  },
  contactCard: {
    backgroundColor: colors.background.cardDark,
    padding: 24,
    borderRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 24,
  },
  cardTextContent: {
    flex: 1,
    marginTop: 2,
  },
  cardTitle: {
    color: colors.text.light,
    fontSize: 16,
    fontFamily: fonts.bold,
    letterSpacing: 0.5,
  },
  cardDesc: {
    color: colors.text.muted,
    fontSize: 10,
    fontFamily: fonts.bold,
    marginTop: 6,
    lineHeight: 14,
    letterSpacing: 0.5,
  },
  cardAction: {
    color: colors.brand.primary,
    fontFamily: fonts.bold,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  faqSection: {
    marginTop: 10,
  },
  faqTitle: {
    color: colors.text.light,
    fontSize: 24,
    fontFamily: fonts.bold,
    marginBottom: 16,
  },
  faqItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  faqQuestion: {
    color: colors.text.light,
    fontSize: 13,
    fontFamily: fonts.bold,
    flex: 1,
    marginRight: 16,
    letterSpacing: 0.5,
  },
});