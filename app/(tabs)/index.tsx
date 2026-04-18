import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';
import { Bell, CaretRight, CurrencyDollar, Eye, EyeClosed, Question, Tote, User, Wallet } from 'phosphor-react-native';
import React, { useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function HomeScreen() { 
  const [showBalance, setShowBalance] = useState(true);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        
        {/* HEADER ESCURO */}
        <View style={styles.darkHeader}>
          <View style={styles.topBar}>
            <CaretRight size={24} color={colors.text.light} />
            <View style={styles.topIconsRight}>
              <Question size={24} color={colors.text.light} />
              <Bell size={24} color={colors.text.light} />
              <User size={24} color={colors.text.light} />
            </View>
          </View>

          <Text style={styles.greeting}>Olá, Elmo</Text>

          <View style={styles.balanceSection}>
            <Text style={styles.balanceLabel}>Saldo Disponível</Text>
            <View style={styles.balanceRow}>
              <Text style={styles.mainBalance}>
                <Text style={styles.currency}>R$ </Text>
                {showBalance ? '1.250,00' : '••••••'}
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
              <Text style={styles.usdBalance}>{showBalance ? 'US$ 244,75' : 'US$ ••••••'}</Text>
              <TouchableOpacity>
                <Text style={styles.statementLink}>EXTRATO</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* HIGHLIGHTS SCROLL HORIZONTAL */}
            <Text style={styles.highlightsLabel}>Atividade da Conta</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.highlightsContainer}>
              <View style={styles.highlightCard}>
                <Text style={styles.highlightTitle}>Milan Luxury Suites</Text>
                <Text style={styles.highlightDate}>UPCOMING PAYMENT • OCT 12</Text>
                <Text style={styles.highlightAmount}>- R$ 420,00</Text>
              </View>
              <View style={[styles.highlightCard, { marginRight: 20 }]}>
                <Text style={styles.highlightTitle}>Starbucks Airport</Text>
                <Text style={styles.highlightDate}>RECENT TRANSACTION • OCT 10</Text>
                <Text style={styles.highlightAmount}>- R$ 28,50</Text>
              </View>
            </ScrollView>
        </View>

        {/* CONTEÚDO PRINCIPAL (CLARO) */}
        <View style={styles.mainContent}>
          
          <View style={styles.walletBanner}>
            <View>
              <Text style={styles.walletTitle}>Carteira</Text>
              <Text style={styles.walletDesc}>Lorem Ipsum, Lorem Ipsum.</Text>
            </View>
            <Wallet size={32} color={colors.text.light} />
          </View>

          <View style={styles.actionGrid}>
            <View style={styles.actionCard}>
              <Tote size={28} color={colors.text.dark} style={{ marginBottom: 16 }} />
              <Text style={styles.actionCardTitle}>Travelshop</Text>
              <Text style={styles.actionCardDesc}>Reserve sua Viagem</Text>
            </View>
            <View style={styles.actionCard}>
              <CurrencyDollar size={28} color={colors.text.dark} style={{ marginBottom: 16 }} />
              <Text style={styles.actionCardTitle}>Assinaturas</Text>
              <Text style={styles.actionCardDesc}>Gerencie suas Assinaturas</Text>
            </View>
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// O StyleSheet substitui o CSS convencional
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.light,
  },
  darkHeader: {
    backgroundColor: colors.background.dark,
    padding: 24,
    paddingTop: 42, // Espaço extra para a status bar
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  topIconsRight: {
    flexDirection: 'row',
    gap: 16,
  },
  greeting: {
    color: colors.text.light,
    fontSize: 20,
    fontFamily: fonts.bold,
    marginBottom: 18,
    textTransform: 'uppercase',
  },
  balanceSection: {
    marginBottom: 18,
  },
  balanceLabel: {
    color: colors.text.muted,
    fontSize: 15,
    fontFamily: fonts.regular,
    marginBottom: -12,
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
  },
  statementLink: {
    color: colors.brand.primary,
    fontSize: 12,
    fontFamily: fonts.bold,
    textTransform: 'uppercase',
  },
  highlightsLabel: {
    color: colors.text.muted,
    fontSize: 15,
    fontFamily: fonts.regular,
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
  },
  walletBanner: {
    backgroundColor: colors.brand.primary,
    padding: 24,
    borderRadius: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  walletTitle: {
    color: colors.text.light,
    fontSize: 20,
    fontFamily: fonts.bold,
  },
  walletDesc: {
    color: colors.text.light,
    opacity: 0.8,
    fontSize: 12,
    marginTop: -5,
  },
  actionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  actionCard: {
    backgroundColor: colors.background.cardLight,
    flex: 1,
    padding: 20,
    borderRadius: 0,
  },
  actionCardTitle: {
    color: colors.text.dark,
    fontSize: 16,
    fontFamily: fonts.bold,
  },
  actionCardDesc: {
    color: colors.text.muted,
    fontSize: 12,
    marginTop: -5,
  }
});