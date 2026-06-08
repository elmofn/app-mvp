import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/src/contexts/AuthContext';
import { formatCurrency } from '@/src/services/api';
import { SignInStatement } from '@/src/services/auth';
import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

const MONTH_ABBR = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

type StatementGroup = {
  date: string;
  day: string;
  month: string;
  items: SignInStatement[];
};

function parseDate(iso: string) {
  const datePart = iso.split('T')[0]; // 2025-11-06
  const [year, month, day] = datePart.split('-');
  return { year, month, day, date: datePart };
}

export default function StatementScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { account } = useAuth();

  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');

  const exchangeRate = account?.setups.currency.currentExchangeRate || 1;
  const balanceUSD = account ? formatCurrency(account.balance.available) : '0,00';
  const balanceBRL = account ? formatCurrency(account.balance.available * exchangeRate) : '0,00';

  const statements = useMemo(() => account?.statements ?? [], [account]);

  const monthHeight = useSharedValue(0);
  const monthOpacity = useSharedValue(0);

  useEffect(() => {
    monthHeight.value = withTiming(selectedYear ? 44 : 0, { duration: 350 });
    monthOpacity.value = withTiming(selectedYear ? 1 : 0, { duration: 300 });
  }, [selectedYear]);

  const animatedMonthStyle = useAnimatedStyle(() => ({
    height: monthHeight.value,
    opacity: monthOpacity.value,
    marginTop: monthHeight.value > 0 ? 14 : 0,
  }));

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    for (const tx of statements) years.add(parseDate(tx.creationTime).year);
    return [...years].sort((a, b) => b.localeCompare(a));
  }, [statements]);

  const availableMonths = useMemo(() => {
    if (!selectedYear) return [] as string[];
    const months = new Set<string>();
    for (const tx of statements) {
      const { year, month } = parseDate(tx.creationTime);
      if (year === selectedYear) months.add(month);
    }
    return [...months].sort((a, b) => b.localeCompare(a));
  }, [statements, selectedYear]);

  const groupedStatements = useMemo<StatementGroup[]>(() => {
    const filtered = statements.filter((tx) => {
      const { year, month } = parseDate(tx.creationTime);
      const matchYear = selectedYear ? year === selectedYear : true;
      const matchMonth = selectedMonth ? month === selectedMonth : true;
      return matchYear && matchMonth;
    });

    const groups: Record<string, StatementGroup> = {};
    for (const tx of filtered) {
      const { date, month, day } = parseDate(tx.creationTime);
      if (!groups[date]) {
        groups[date] = {
          date,
          day,
          month: MONTH_ABBR[parseInt(month, 10) - 1] ?? month,
          items: [],
        };
      }
      groups[date].items.push(tx);
    }
    return Object.values(groups).sort((a, b) => b.date.localeCompare(a.date));
  }, [statements, selectedYear, selectedMonth]);

  const handleYearSelect = (year: string) => {
    if (selectedYear === year) {
      setSelectedYear('');
      setSelectedMonth('');
    } else {
      setSelectedYear(year);
      setSelectedMonth('');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <StatusBar style="light" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: tabBarHeight + 24 }}
      >
        <LinearGradient
          colors={['#6444DA', '#4D2ACC', '#1B0F4A']}
          start={{ x: 0.1, y: 0.1 }}
          end={{ x: 0.8, y: 1.2 }}
          locations={[0, 0.2, 0.7]}
          style={[styles.headerGradient, { paddingTop: insets.top + 16 }]}
        >
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.2)' }]} />

          <View style={styles.headerInner}>
            <Text style={styles.headerLabel}>EXTRATO</Text>
            <Text style={styles.mainTitle}>
              Balance & <Text style={styles.mainTitleAccent}>Statement</Text>
            </Text>

            <View style={styles.balanceSection}>
              <Text style={styles.balanceLabel}>Available Balance</Text>
              <Text style={styles.balanceMain}>
                <Text style={styles.balanceCurrency}>R$ </Text>
                {balanceBRL}
              </Text>
              <Text style={styles.balanceUsd}>US$ {balanceUSD}</Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.yearContainer}
            >
              {availableYears.map((year) => (
                <TouchableOpacity
                  key={year}
                  onPress={() => handleYearSelect(year)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.yearText, selectedYear === year && styles.yearTextActive]}>
                    {year}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Animated.View style={[animatedMonthStyle, { overflow: 'hidden' }]}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.monthContainer}
              >
                {availableMonths.map((m) => {
                  const idx = parseInt(m, 10) - 1;
                  const label = MONTH_NAMES[idx] ?? m;
                  const isActive = selectedMonth === m;
                  return (
                    <TouchableOpacity
                      key={m}
                      style={[styles.monthPill, isActive && styles.monthPillActive]}
                      onPress={() => setSelectedMonth(isActive ? '' : m)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.monthText, isActive && styles.monthTextActive]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </Animated.View>
          </View>
        </LinearGradient>

        <View style={styles.timelineSection}>
          {groupedStatements.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No transactions yet</Text>
              <Text style={styles.emptyText}>
                When you start earning cashback or making redemptions, your activity will show up here.
              </Text>
            </View>
          ) : (
            groupedStatements.map((group) => (
              <View key={group.date} style={styles.timelineGroup}>
                <View style={styles.dateColumn}>
                  <Text style={styles.dateDay}>{group.day}</Text>
                  <Text style={styles.dateMonth}>{group.month}</Text>
                </View>
                <View style={styles.transactionsColumn}>
                  {group.items.map((tx) => {
                    const isPositive = tx.type === 1;
                    const valueBRL = tx.value * exchangeRate;
                    return (
                      <TouchableOpacity
                        key={tx.id}
                        style={styles.transactionItem}
                        activeOpacity={0.7}
                        onPress={() => router.push(`/transaction/${tx.id}`)}
                      >
                        <View style={styles.txTextContainer}>
                          <Text style={styles.txTitle}>{tx.details?.unitName ?? '—'}</Text>
                          {tx.details?.productName ? (
                            <Text style={styles.txSubtitle}>{tx.details.productName}</Text>
                          ) : null}
                        </View>
                        <Text style={[styles.txAmount, isPositive && styles.amountPositive]}>
                          {isPositive ? '+' : '-'} R$ {formatCurrency(valueBRL)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },

  headerGradient: {
    paddingBottom: 26,
  },
  headerInner: {
    paddingHorizontal: 24,
  },
  headerLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontFamily: fonts.bold,
    letterSpacing: 2,
    marginBottom: 8,
  },
  mainTitle: {
    fontSize: 50,
    fontFamily: fonts.bold,
    color: colors.text.light,
    letterSpacing: -1.5,
    marginBottom: 24,
  },
  mainTitleAccent: {
    color: '#85EDD3',
    fontFamily: fonts.italic,
  },

  balanceSection: {
    marginBottom: 22,
  },
  balanceLabel: {
    fontSize: 12,
    fontFamily: fonts.bold,
    letterSpacing: 1.35,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 5,
  },
  balanceMain: {
    fontSize: 40,
    fontFamily: fonts.bold,
    color: '#FFF',
    letterSpacing: -1,
    lineHeight: 50,
  },
  balanceCurrency: {
    fontSize: 30,
    color: '#FFF',
    fontFamily: fonts.bold,
  },
  balanceUsd: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    fontFamily: fonts.bold,
    letterSpacing: -0.7,
    marginTop: -4,
  },

  yearContainer: {
    gap: 22,
    paddingVertical: 4,
  },
  yearText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 15,
    fontFamily: fonts.bold,
    letterSpacing: -0.2,
  },
  yearTextActive: {
    color: colors.text.light,
  },

  monthContainer: {
    gap: 8,
    paddingVertical: 4,
  },
  monthPill: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  monthPillActive: {
    backgroundColor: '#85EDD3',
    borderColor: '#85EDD3',
  },
  monthText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontFamily: fonts.bold,
    letterSpacing: 0.3,
  },
  monthTextActive: {
    color: '#0F022D',
  },

  timelineSection: {
    padding: 24,
    paddingTop: 28,
  },

  timelineGroup: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dateColumn: {
    width: 44,
    alignItems: 'center',
    marginRight: 16,
    paddingTop: 4,
  },
  dateDay: {
    fontFamily: fonts.bold,
    fontSize: 30,
    color: colors.text.dark,
    letterSpacing: -1,
    lineHeight: 32,
  },
  dateMonth: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: colors.text.muted,
    letterSpacing: 1,
  },
  transactionsColumn: {
    flex: 1,
    borderLeftWidth: 1,
    borderLeftColor: '#E5E5E5',
    paddingLeft: 18,
    paddingBottom: 22,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  txTextContainer: {
    flex: 1,
    paddingRight: 12,
  },
  txTitle: {
    color: colors.text.dark,
    fontSize: 15,
    fontFamily: fonts.bold,
    marginBottom: 2,
  },
  txSubtitle: {
    color: colors.text.muted,
    fontSize: 11,
    fontFamily: fonts.regular,
    letterSpacing: 0.3,
  },
  txAmount: {
    color: colors.text.dark,
    fontSize: 15,
    fontFamily: fonts.bold,
  },
  amountPositive: {
    color: '#00A86B',
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: colors.text.dark,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.text.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
