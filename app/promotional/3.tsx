import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PromotionalPage } from '@/src/components/PromotionalPage';
import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

// Página promocional 3 — acessível via banner com href="app://promotional3".
// ✏️ CONTEÚDO: edite os textos do header abaixo e o corpo (children).
export default function Promotional3() {
  return (
    <PromotionalPage
      eyebrow="Promoção"
      label="Exclusivo"
      title="Página"
      titleAccent="Promocional 3"
      description="Espaço reservado para um conteúdo promocional exclusivo."
    >
      {/* ✏️ EDITE AQUI: coloque o conteúdo desta promoção (textos, imagens, etc.). */}
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>Conteúdo promocional 3 (a definir).</Text>
      </View>
    </PromotionalPage>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    borderWidth: 1,
    borderColor: colors.background.cardLight,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  placeholderText: {
    color: colors.text.muted,
    fontSize: 14,
    fontFamily: fonts.regular,
  },
});
