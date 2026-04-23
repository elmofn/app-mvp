import { useRouter } from 'expo-router';
import { Eye, EyeClosed } from 'phosphor-react-native';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

interface BalanceDisplayProps {
  balanceBRL: string;
  balanceUSD: string;
  showStatementLink?: boolean;
  showToggleIcon?: boolean; // 👈 Nova prop para controlar o ícone do olho
}

export function BalanceDisplay({ 
  balanceBRL, 
  balanceUSD, 
  showStatementLink = false,
  showToggleIcon = true // 👈 Ligado por defeito (para a Home)
}: BalanceDisplayProps) {
  const [showBalance, setShowBalance] = useState(true);
  const router = useRouter();

  return (
    <View style={styles.balanceSection}>
      <Text style={styles.balanceLabel}>Saldo Disponível</Text>
      
      <View style={styles.balanceRow}>
        <Text style={styles.mainBalance}>
          <Text style={styles.currency}>R$ </Text>
          {showBalance ? balanceBRL : '••••••'}
        </Text>
        
        {showToggleIcon && (
          <TouchableOpacity onPress={() => setShowBalance(!showBalance)} activeOpacity={0.7}>
            {showBalance ? (
              <Eye size={28} color={colors.text.muted} />
            ) : (
              <EyeClosed size={28} color={colors.text.muted} />
            )}
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.balanceSubRow}>
        <Text style={styles.usdBalance}>
          {showBalance ? `US$ ${balanceUSD}` : 'US$ ••••••'}
        </Text>
        
        {showStatementLink && (
          <TouchableOpacity onPress={() => router.push('/statement')} activeOpacity={0.7}>
            <Text style={styles.statementLink}>EXTRATO</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  balanceSection: { marginBottom: 15 },
  balanceLabel: { color: colors.text.muted, fontSize: 15, fontFamily: fonts.regular, letterSpacing: 0.9, marginBottom: -13 },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: -15 },
  mainBalance: { color: colors.text.light, fontSize: 45, fontFamily: fonts.bold, letterSpacing: -0.5 },
  currency: { fontSize: 24 },
  balanceSubRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  usdBalance: { color: colors.text.muted, fontSize: 15, fontFamily: fonts.regular, letterSpacing: -0.5 },
  statementLink: { color: colors.brand.primary, fontSize: 12, fontFamily: fonts.bold, letterSpacing: 0.5, textTransform: 'uppercase' },
});