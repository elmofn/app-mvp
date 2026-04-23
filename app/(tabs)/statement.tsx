import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BalanceDisplay } from '@/src/components/BalanceDisplay';
import { TopBar } from '@/src/components/Topbar';
import { fetchStatementData, Transaction } from '@/src/services/api';
import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

const MONTH_ABBR: Record<string, string> = {
  '01': 'JAN', '02': 'FEV', '03': 'MAR', '04': 'ABR', '05': 'MAI', '06': 'JUN',
  '07': 'JUL', '08': 'AGO', '09': 'SET', '10': 'OUT', '11': 'NOV', '12': 'DEZ'
};

const MONTH_NAMES: Record<string, string> = {
  '01': 'Janeiro', '02': 'Fevereiro', '03': 'Março', '04': 'Abril', '05': 'Maio', '06': 'Junho',
  '07': 'Julho', '08': 'Agosto', '09': 'Setembro', '10': 'Outubro', '11': 'Novembro', '12': 'Dezembro'
};

export default function StatementScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [balance, setBalance] = useState({ brl: '0,00', usd: '0,00' });
  
  const scrollY = useSharedValue(0);
  const scrollViewRef = useRef<Animated.ScrollView>(null);
  const isForcingAnimation = useSharedValue(false);

  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');

  const monthHeight = useSharedValue(0);
  const monthOpacity = useSharedValue(0);

  useEffect(() => {
    fetchStatementData().then((res) => {
      setTransactions(res.transactions);
      setBalance({ brl: res.balanceBRL, usd: res.balanceUSD });
      setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    monthHeight.value = withTiming(selectedYear ? 44 : 0, { duration: 350 });
    monthOpacity.value = withTiming(selectedYear ? 1 : 0, { duration: 300 });
  }, [selectedYear]);

  const animatedMonthStyle = useAnimatedStyle(() => ({
    height: monthHeight.value,
    opacity: monthOpacity.value,
    marginTop: monthHeight.value > 0 ? 16 : 0,
  }));

  const handleYearSelect = (year: string) => {
    if (selectedYear === year) {
      setSelectedYear('');
      setSelectedMonth('');
    } else {
      setSelectedYear(year);
      setSelectedMonth('');
    }
  };

  const availableYears = useMemo(() => 
    [...new Set(transactions.map(tx => tx.date.split('-')[0]))].sort((a, b) => b.localeCompare(a)),
  [transactions]);

  const availableMonths = useMemo(() => {
    if (!selectedYear) return [];
    return [...new Set(transactions
      .filter(tx => tx.date.startsWith(selectedYear))
      .map(tx => tx.date.split('-')[1]))].sort((a, b) => b.localeCompare(a));
  }, [selectedYear, transactions]);

  const groupedTransactions = useMemo(() => {
    const filtered = transactions.filter(tx => {
      const matchYear = selectedYear ? tx.date.startsWith(selectedYear) : true;
      const matchMonth = selectedMonth ? tx.date.split('-')[1] === selectedMonth : true;
      return matchYear && matchMonth;
    });

    const groups: Record<string, any> = {};
    filtered.forEach(tx => {
      const key = tx.date;
      const [,, dd] = tx.date.split('-');
      if (!groups[key]) {
        groups[key] = { 
          date: key, 
          day: dd, 
          month: MONTH_ABBR[tx.date.split('-')[1]], 
          items: [] 
        };
      }
      groups[key].items.push(tx);
    });
    return Object.values(groups).sort((a: any, b: any) => b.date.localeCompare(a.date));
  }, [selectedYear, selectedMonth, transactions]);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => { 
      if (!isForcingAnimation.value) scrollY.value = e.contentOffset.y; 
    }
  });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.text.light} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style="light" />
      <Animated.ScrollView 
        ref={scrollViewRef} 
        onScroll={scrollHandler} 
        scrollEventThrottle={16} 
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.darkHeader}>
          <View style={{ height: 25 }} />
          <View style={styles.titleRow}>
            <Text style={styles.greeting}>EXTRATO</Text>
          </View>

          {/* O NOVO COMPONENTE DE SALDO ENTRA AQUI */}
          <View style={styles.balanceWrapper}>
            <BalanceDisplay 
              balanceBRL={balance.brl} 
              balanceUSD={balance.usd}
              showToggleIcon={false}
            />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.yearContainer}>
            {availableYears.map(year => (
              <TouchableOpacity key={year} onPress={() => handleYearSelect(year)} activeOpacity={0.7}>
                <Text style={[styles.yearText, selectedYear === year && styles.yearTextActive]}>{year}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Animated.View style={[animatedMonthStyle, { overflow: 'hidden' }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.monthContainer}>
              {availableMonths.map(m => (
                <TouchableOpacity 
                  key={m} 
                  style={[styles.monthPill, selectedMonth === m && styles.monthPillActive]} 
                  onPress={() => setSelectedMonth(selectedMonth === m ? '' : m)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.monthText, selectedMonth === m && styles.monthTextActive]}>{MONTH_NAMES[m]}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>
        </View>

        <View style={styles.mainContent}>
          {groupedTransactions.map((group: any, idx) => (
            <View key={idx} style={styles.timelineGroup}>
              <View style={styles.dateColumn}>
                <Text style={styles.dateDay}>{group.day}</Text>
                <Text style={styles.dateMonth}>{group.month}</Text>
              </View>
              <View style={styles.transactionsColumn}>
                {group.items.map((tx: Transaction) => (
                  <TouchableOpacity 
                    key={tx.id} 
                    style={styles.transactionItem} 
                    activeOpacity={0.7}
                  >
                    <View style={styles.textContainer}>
                      <Text style={styles.txTitle}>{tx.title}</Text>
                      <Text style={styles.txSubtitle}>{tx.type}</Text>
                    </View>
                    <Text style={[styles.txAmount, tx.isPositive && styles.amountPositive]}>{tx.amount}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </View>
        <View style={{ height: 100 }} />
      </Animated.ScrollView>
      <TopBar scrollY={scrollY} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.light },
  loadingContainer: { flex: 1, backgroundColor: colors.background.dark, justifyContent: 'center', alignItems: 'center' },
  darkHeader: { backgroundColor: colors.background.dark, paddingTop: 13, paddingBottom: 24, paddingHorizontal: 24 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { color: colors.text.light, fontSize: 20, fontFamily: fonts.bold, letterSpacing: -0.5 },
  actionButtons: { flexDirection: 'row', gap: 12 },
  
  // Wrapper para o BalanceDisplay manter as margens da página do Extrato
  balanceWrapper: {  
    marginTop: 15, 
    marginBottom: 10 
  },
  
  yearContainer: {  
    gap: 24 
  },
  yearText: { 
    color: colors.text.muted, 
    fontSize: 16, 
    fontFamily: fonts.bold 
  },
  yearTextActive: { color: colors.text.light },
  monthContainer: { gap: 8, paddingVertical: 3 },
  monthPill: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 0, borderWidth: 0.5, borderColor: colors.text.muted },
  monthPillActive: { backgroundColor: colors.text.light, borderColor: colors.text.light },
  monthText: { color: colors.text.muted, fontSize: 12, paddingTop: 3, fontFamily: fonts.bold, textTransform: 'uppercase' },
  monthTextActive: { color: colors.background.dark },
  mainContent: { padding: 24, marginTop: 8 },
  timelineGroup: { flexDirection: 'row', marginBottom: 16 },
  dateColumn: { width: 35, alignItems: 'center', marginRight: 20, paddingTop: 8 },
  dateDay: { fontFamily: fonts.bold, fontSize: 32, color: colors.text.dark, letterSpacing: -1, lineHeight: 32 },
  dateMonth: { fontFamily: fonts.bold, fontSize: 10, color: colors.text.muted, textTransform: 'uppercase' },
  transactionsColumn: { flex: 1, borderLeftWidth: 1, borderLeftColor: colors.text.muted, paddingLeft: 20, paddingBottom: 24 },
  transactionItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  textContainer: { flex: 1, paddingRight: 8 },
  txTitle: { color: colors.text.dark, fontSize: 15, fontFamily: fonts.bold, marginBottom: 2 },
  txSubtitle: { color: colors.text.muted, fontSize: 10, fontFamily: fonts.bold, textTransform: 'uppercase' },
  txAmount: { color: colors.text.dark, fontSize: 16, fontFamily: fonts.bold },
  amountPositive: { color: '#00A86B' },
});