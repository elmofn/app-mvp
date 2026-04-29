import { StatusBar } from 'expo-status-bar';
import {
    AirplaneTilt,
    CircleIcon,
    ShieldCheck,
    Tag
} from 'phosphor-react-native';
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

// Mock de dados para as notificações
const NOTIFICATIONS = [
  {
    id: 1,
    type: 'cashback',
    title: 'Cashback Recebido!',
    description: 'Você recebeu R$ 42,50 de cashback pela sua última compra na TravelShop.',
    time: 'Há 2 min',
    unread: true,
    icon: <Tag size={24} color={colors.brand.primary} weight="duotone" />
  },
  {
    id: 2,
    type: 'security',
    title: 'Login Detectado',
    description: 'Um novo acesso foi realizado na sua conta a partir de um dispositivo Android em Porto Alegre.',
    time: 'Há 1 hora',
    unread: true,
    icon: <ShieldCheck size={24} color="#FF9500" weight="duotone" />
  },
  {
    id: 3,
    type: 'travel',
    title: 'Check-in Disponível',
    description: 'O check-in para o seu voo G3 1234 já está disponível. Acesse seus documentos.',
    time: 'Há 3 horas',
    unread: false,
    icon: <AirplaneTilt size={24} color={colors.text.dark} weight="duotone" />
  },
  {
    id: 4,
    type: 'promo',
    title: 'Oferta Exclusiva',
    description: 'Ganhe 15% de desconto em hotéis no Rio de Janeiro usando o saldo da sua wallet.',
    time: 'Ontem',
    unread: false,
    icon: <Tag size={24} color={colors.brand.primary} weight="duotone" />
  }
];

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <StatusBar style="light" />
      
      {/* Seção Superior (Preta) - Fixa */}
      <View style={[styles.darkHeader, { paddingTop: insets.top }]}>
        <ScreenHeader title="CENTRAL DE AVISOS" dark={true} />
        
        <View style={styles.headerContent}>
          <Text style={styles.mainTitle}>Alertas</Text>
          <Text style={styles.pageDescription}>
            Fique por dentro das movimentações da sua conta e novidades da sua próxima viagem.
          </Text>
        </View>
      </View>

      {/* Lista de Notificações - Scrollable */}
      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.listContainer}>
          {NOTIFICATIONS.map((item) => (
            <TouchableOpacity 
              key={item.id} 
              style={[styles.notificationCard, item.unread && styles.unreadCard]}
              activeOpacity={0.7}
            >
              <View style={styles.iconContainer}>
                {item.icon}
              </View>

              <View style={styles.textContainer}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  {item.unread && <CircleIcon size={8} color={colors.brand.primary} weight="fill" />}
                </View>
                <Text style={styles.cardDescription} numberOfLines={2}>
                  {item.description}
                </Text>
                <Text style={styles.cardTime}>{item.time}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.clearButton}>
          <Text style={styles.clearButtonText}>MARCAR TODAS COMO LIDAS</Text>
        </TouchableOpacity>
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
    paddingBottom: 32,
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
    marginBottom: 8,
  },
  pageDescription: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: '#aaaaaa',
    lineHeight: 20,
    maxWidth: '85%',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  listContainer: {
    paddingHorizontal: 24,
    paddingTop: 32,
    gap: 16,
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    gap: 16,
  },
  unreadCard: {
    borderColor: colors.brand.primary + '30', // Azul com transparência
    backgroundColor: colors.brand.primary + '05', // Fundo azulado bem leve
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F4F4F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: colors.text.dark,
  },
  cardDescription: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.text.muted,
    lineHeight: 20,
    marginBottom: 8,
  },
  cardTime: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: '#BBBBBB',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  clearButton: {
    marginTop: 40,
    alignSelf: 'center',
    padding: 10,
  },
  clearButtonText: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: colors.brand.primary,
    letterSpacing: 1,
    textDecorationLine: 'underline',
  },
});