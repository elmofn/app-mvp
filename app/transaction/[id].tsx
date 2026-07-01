import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/src/components/ScreenHeader';
import { useAuth } from '@/src/contexts/AuthContext';
import { useT, type Translator } from '@/src/i18n';
import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';
import { formatCurrency } from '@/src/utils/format';

function formatLongDate(iso: string, t: Translator['t'], monthsFull: string[]): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const day = String(d.getDate()).padStart(2, '0');
  const month = monthsFull[d.getMonth()];
  const year = d.getFullYear();
  const hour = String(d.getHours()).padStart(2, '0');
  const minute = String(d.getMinutes()).padStart(2, '0');
  return t('transaction.dateFormat', { day, month, year, hour, minute });
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} selectable>
        {String(value)}
      </Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const rows = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{title}</Text>
      <View style={styles.sectionCard}>
        {rows.map((row, idx) => (
          <React.Fragment key={idx}>
            {row}
            {idx < rows.length - 1 ? <View style={styles.rowDivider} /> : null}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}

export default function TransactionDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { account } = useAuth();
  const { t, tr } = useT();

  const monthsFull = tr('transaction.monthsFull') as string[];

  const tx = account?.statements?.find((s) => s.id === id);

  if (!tx) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
        <StatusBar style="light" />
        <LinearGradient
          colors={['#6444DA', '#4D2ACC', '#1B0F4A']}
          start={{ x: 0.1, y: 0.1 }}
          end={{ x: 0.8, y: 1.2 }}
          locations={[0, 0.2, 0.7]}
          style={[styles.headerGradient, { paddingTop: insets.top }]}
        >
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.2)' }]} />
          <ScreenHeader title={t('transaction.header')} dark={true} />
          <View style={styles.headerInner}>
            <Text style={styles.mainTitle}>
              Transaction <Text style={styles.mainTitleAccent}>not found</Text>
            </Text>
            <Text style={styles.pageDescription}>
              This transaction is no longer available in your statement.
            </Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  const isPositive = tx.type === 1;
  // Tudo aqui vem congelado no SignIn: rate / value / symbol / code.
  // O setups.currency (refresh via GetCurrency) so impacta o saldo
  // exibido na home/extrato - na pagina de transacao usamos os campos
  // historicos para que os numeros nao mudem se o usuario trocar a
  // currency atual.
  const valueLocal = tx.originValue;
  const purchaseValueLocal = (tx.details?.purchaseValue ?? 0) * tx.exchangeRate;
  const typeLabel = isPositive ? 'Cashback' : 'Resgate';

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <StatusBar style="light" />

      <ScrollView showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={['#6444DA', '#4D2ACC', '#1B0F4A']}
          start={{ x: 0.1, y: 0.1 }}
          end={{ x: 0.8, y: 1.2 }}
          locations={[0, 0.2, 0.7]}
          style={[styles.headerGradient, { paddingTop: insets.top }]}
        >
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.2)' }]} />

          <ScreenHeader title="Transaction" dark={true} />

          <View style={styles.headerInner}>
            <Text style={styles.typeBadgeText}>{typeLabel.toUpperCase()}</Text>
            <Text style={styles.mainTitle}>
              Transaction <Text style={styles.mainTitleAccent}>details</Text>
            </Text>

            <View style={styles.amountBlock}>
              <Text style={[styles.amount, isPositive ? styles.amountPositive : styles.amountNegative]}>
                {isPositive ? '+' : '-'} {tx.originCurrencySymbol} {formatCurrency(valueLocal)}
              </Text>
              <Text style={styles.amountUsd}>
                {isPositive ? '+' : '-'} US$ {formatCurrency(tx.value)}
              </Text>
              <Text style={styles.dateText}>{formatLongDate(tx.creationTime, t, monthsFull)}</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.body}>
          <Section title={t('transaction.sectionDescription')}>
            <Row label="Title" value={tx.title} />
            <Row label="Type" value={typeLabel} />
            {tx.details?.complement ? (
              <Row label="Complement" value={tx.details.complement} />
            ) : null}
          </Section>

          <Section title={t('transaction.sectionVendor')}>
            <Row label="Unit" value={tx.details?.unitName ?? '—'} />
            <Row label="Product" value={tx.details?.productName ?? '—'} />
            <Row label="Product ID" value={tx.details?.productId ?? '—'} />
          </Section>

          <Section title={t('transaction.sectionFinancial')}>
            <Row
              label={`Value (${tx.originCurrencyCode})`}
              value={`${tx.originCurrencySymbol} ${formatCurrency(valueLocal)}`}
            />
            <Row label="Value (USD)" value={`US$ ${formatCurrency(tx.value)}`} />
            {tx.details?.purchaseValue > 0 ? (
              <Row
                label="Purchase Value"
                value={`US$ ${formatCurrency(tx.details.purchaseValue)} (${tx.originCurrencySymbol} ${formatCurrency(purchaseValueLocal)})`}
              />
            ) : null}
            <Row
              label="Exchange Rate"
              value={`${tx.originCurrencySymbol} ${formatCurrency(tx.exchangeRate)} / US$ 1`}
            />
            {tx.details?.cashBackPercente > 0 ? (
              <Row label="Cashback %" value={`${tx.details.cashBackPercente}%`} />
            ) : null}
          </Section>

          <Section title={t('transaction.sectionIdentifiers')}>
            <Row label="Transaction ID" value={tx.id} />
            {tx.details?.internalCode ? (
              <Row label="Internal Code" value={tx.details.internalCode} />
            ) : null}
          </Section>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },

  headerGradient: { paddingBottom: 32 },
  headerInner: {
    paddingHorizontal: 24,
    marginTop: -8,
  },
  typeBadgeText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontFamily: fonts.bold,
    letterSpacing: 2,
    marginBottom: 8,
  },
  mainTitle: {
    fontSize: 36,
    fontFamily: fonts.bold,
    color: colors.text.light,
    letterSpacing: -1.2,
    marginBottom: 20,
  },
  mainTitleAccent: {
    color: '#85EDD3',
    fontFamily: fonts.bold_italic,
  },
  pageDescription: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 20,
  },

  amountBlock: {
    marginTop: 4,
  },
  amount: {
    fontSize: 34,
    fontFamily: fonts.bold,
    letterSpacing: -1,
  },
  amountPositive: {
    color: '#85EDD3',
  },
  amountNegative: {
    color: colors.text.light,
  },
  amountUsd: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontFamily: fonts.regular,
    marginTop: 2,
  },
  dateText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontFamily: fonts.regular,
    marginTop: 8,
  },

  body: {
    padding: 24,
    paddingTop: 28,
    gap: 22,
  },
  section: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: colors.text.muted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    paddingHorizontal: 4,
  },
  sectionCard: {
    backgroundColor: '#F4F4F5',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 4,
  },
  row: {
    paddingVertical: 12,
  },
  rowDivider: {
    height: 1,
    backgroundColor: '#E5E5E7',
  },
  rowLabel: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: colors.text.muted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  rowValue: {
    fontSize: 15,
    fontFamily: fonts.regular,
    color: colors.text.dark,
  },
});
