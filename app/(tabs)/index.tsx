import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';
import { LinearGradient } from 'expo-linear-gradient';
import { Bell, CallBell, CaretRight, CurrencyDollar, Eye, EyeClosed, Question, ShoppingBag, User, Wallet } from 'phosphor-react-native';
import React, { useState } from 'react';
import { Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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

          <Text style={styles.greeting}>Olá, Fabio</Text>

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
          
          {/* Wallet Banner */}
          <View style={styles.walletBanner}>
            <View>
              <Text style={styles.walletTitle}>Carteira</Text>
              <Text style={styles.walletDesc}>Acesse sua carteira</Text>
            </View>
            <Wallet size={32} color={colors.text.light} weight="bold" />
          </View>

          {/* Action Grid */}
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

          {/* Assistant Card */}
          <View style={styles.assistantCard}>
            <View>
              <Text style={styles.assistantTitle}>Assistente de Viagem</Text>
              <Text style={styles.assistantDesc}>Converse com a Bia</Text>
            </View>
            <CallBell size={28} color={colors.text.dark} weight="fill" />
          </View>

          {/* Next Trip Ideas */}
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Inspirações de Viagem</Text>
              <Text style={styles.sectionSubtitle}>Experiências selecionadas</Text>
            </View>
            <TouchableOpacity>
              <Text style={styles.viewAllLink}>VER TUDO</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tripCard}>
            <View style={styles.tripImageContainer}>
              <Image 
                source={{ uri: 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?q=80&w=800&auto=format&fit=crop' }} 
                style={styles.tripImage} 
              />
              {/* 👇 2. Adicione o LinearGradient AQUI (entre a imagem e o texto) */}
              <LinearGradient
                // Cores: Começa preto com 60% de opacidade e vai para preto transparente
                // Ajuste a opacidade (0.6) para controlar a escuridão
                colors={['rgba(0,0,0,0.75)', 'rgba(0,0,0,0)']}
                // Posição das cores: [início, fim]
                // 0.0 é o início do gradiente (na borda inferior, pois definimos start=[0, 1])
                // 1.0 é o fim (transparente)
                locations={[0.0, 1.0]} 
                // Início e Fim da transição (x, y) - de baixo para cima
                start={[0, 1]} // Canto inferior esquerdo (y=1 é baixo)
                end={[0, 0]}   // Canto superior esquerdo (y=0 é cima)
                style={styles.tripGradient}
              >
                  {/* 👇 3. Mova o texto para dentro do LinearGradient ou coloque-o no mesmo nível, mas DEPOIS */}
                  <View style={styles.tripTag}>
                    <Text style={styles.tripTagText}>VERÃO 2026</Text>
                  </View>
              </LinearGradient>
            </View>
            <Text style={styles.tripTitle}>Arquipélago das Maldivas</Text>
            <Text style={styles.tripDesc}>Experimente a simetria arquitetônica do litoral italiano. Uma jornada curada por Positano e Ravello com foco em geometria e patrimônio.</Text>
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
    paddingTop: 38, // Espaço extra para a status bar
    paddingBottom: 15,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  topIconsRight: {
    flexDirection: 'row',
    gap: 16,
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
  // 👇 4. Novo Estilo para o Gradiente
  tripGradient: {
    // Posicionamento absoluto para cobrir a imagem
    position: 'absolute',
    left: 0,
    right: 0,
    top: 10, // Pode cobrir toda a imagem ou apenas a parte inferior ajustando a altura
    bottom: 0, 
    // Altura opcional se quiser cobrir apenas a parte inferior (ex: 40% da altura do container)
    // height: '40%', 
    // bottom: 0, // posiciona na parte inferior
    
    // Garante que o conteúdo dentro dele (a tag) seja alinhado corretamente
    justifyContent: 'flex-end', // Alinha a tag na parte inferior do gradiente
    paddingBottom: 20, // Espaço extra abaixo da tag
  },
  tripTag: {
    // Removemos o posicionamento absoluto da tag, pois agora ela é alinhada pelo gradiente
    // position: 'absolute',
    // bottom: 20,
    // left: 20,
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