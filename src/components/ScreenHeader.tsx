import { useRouter } from 'expo-router';
import { ArrowLeftIcon } from 'phosphor-react-native';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

interface ScreenHeaderProps {
  title: string;
  dark?: boolean;
  // Override do "voltar". Sem isso, faz router.back() (comportamento padrao).
  // Fluxos com etapas internas (signup/activate) passam um handler que recua
  // uma etapa em vez de sair da tela inteira.
  onBack?: () => void;
}

export function ScreenHeader({ title, dark = true, onBack }: ScreenHeaderProps) {
  const router = useRouter();

  // Define as cores com base no tema (claro ou escuro)
  const textColor = dark ? colors.text.light : colors.text.dark;
  const iconColor = dark ? colors.text.light : colors.text.dark;

  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={onBack ?? (() => router.back())}
        activeOpacity={0.7}
      >
        <ArrowLeftIcon size={29} color={iconColor} weight="bold" />
      </TouchableOpacity>
      <Text style={[styles.title, { color: textColor }]}>
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 5,
    marginBottom: 32,
  },
  backButton: {
    marginRight: 10,
    marginLeft: -8, // Ajuste para alinhar o ícone visualmente à margem
  },
  title: {
    color: colors.text.light,
    fontSize: 14,
    fontFamily: fonts.bold,
    letterSpacing: - 0.7,
    textTransform: 'uppercase',
  },
});