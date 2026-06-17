import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import type { SignInStatement } from '@/src/services/auth';
import { fonts } from '@/src/theme/typography';
import { formatCurrency } from '@/src/utils/format';

const PT_MONTHS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

function formatStatementDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${String(d.getDate()).padStart(2, '0')} ${PT_MONTHS[d.getMonth()]}`;
}

type Props = {
  statements: SignInStatement[] | undefined;
  // Cotacao da moeda local por 1 USD (statements vem sempre em USD).
  exchangeRate: number;
};

// Renderiza os 4 lancamentos mais recentes da conta dentro do header da home.
// Quando a conta ainda nao tem transacoes, o componente nao renderiza nada
// (retorna null) - sem fallback para dados mockados.
export function ActivityHighlights({ statements, exchangeRate }: Props) {
  const highlights = useMemo(() => {
    if (!statements || statements.length === 0) return [];
    return statements.slice(0, 4).map((tx) => {
      // type 1 = entrada (cashback), type 2 = saida (resgate)
      const isPositive = tx.type === 1;
      const valueBRL = tx.value * exchangeRate;
      const productName = tx.details?.productName ?? '';
      const date = formatStatementDate(tx.creationTime);
      return {
        id: tx.id,
        title: tx.details?.unitName ?? '—',
        dateLabel: productName ? `${productName} • ${date}` : date,
        amount: `${isPositive ? '+' : '-'} R$ ${formatCurrency(valueBRL)}`,
      };
    });
  }, [statements, exchangeRate]);

  if (highlights.length === 0) return null;

  return (
    <Animated.View entering={FadeInDown.delay(350).duration(500)}>
      <Text style={styles.activityTitle}>Account Activity Highlights</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.activityScroll}>
        {highlights.map((tx) => (
          <View key={tx.id} style={styles.activityCard}>
            <Text style={styles.activityCardTitle}>{tx.title}</Text>
            <Text style={styles.activityCardSub}>{tx.dateLabel}</Text>
            <Text style={styles.activityCardVal}>{tx.amount}</Text>
          </View>
        ))}
        <View style={{ width: 20 }} />
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  activityTitle: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 7,
    letterSpacing: 0.5,
    zIndex: 2,
  },
  activityScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
    overflow: 'visible',
    zIndex: 2,
  },
  activityCard: {
    backgroundColor: 'rgba(255, 255, 255, 0)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 12,
    paddingHorizontal: 16,
    minWidth: 180,
    marginRight: 12,
    marginBottom: 8,
  },
  activityCardTitle: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: '#FFF',
    marginBottom: 1,
  },
  activityCardSub: {
    fontSize: 8,
    fontFamily: fonts.medium,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  activityCardVal: {
    fontSize: 14,
    fontFamily: fonts.bold_italic,
    color: '#FFF',
  },
});
