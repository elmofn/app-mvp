import { XIcon } from 'phosphor-react-native';
import React from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import RenderHTML, { MixedStyleDeclaration } from 'react-native-render-html';

import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

// Estilos do HTML iguais aos do FAQSection, para o richtext dos banners ter o
// mesmo vocabulario visual dos outros conteudos (policies/FAQ).
const HTML_BASE_STYLE: MixedStyleDeclaration = {
  color: colors.text.dark,
  fontFamily: fonts.regular,
  fontSize: 14,
  lineHeight: 22,
};

const HTML_TAG_STYLES: Record<string, MixedStyleDeclaration> = {
  p: { fontSize: 14, lineHeight: 22, marginBottom: 8 },
  strong: { fontFamily: fonts.bold },
  em: { fontFamily: fonts.italic },
  a: { color: '#0F022D', textDecorationLine: 'underline' },
  ul: { marginBottom: 8, paddingLeft: 18 },
  ol: { marginBottom: 8, paddingLeft: 18 },
  li: { marginBottom: 2 },
  span: { fontSize: 14, lineHeight: 22 },
};

type Props = {
  visible: boolean;
  title: string;
  html: string;
  onClose: () => void;
};

// Modal aberto ao tocar num banner: renderiza o richtext (HTML) do banner.
// Mesmo vocabulario visual do CustomAlert (overlay + card centralizado), mas o
// corpo usa RenderHTML dentro de um ScrollView (o conteudo pode ser longo).
export function BannerRichTextModal({ visible, title, html, onClose }: Props) {
  const { width } = useWindowDimensions();

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Cabecalho so com o "X": fechar o modal fica so aqui, liberando o
              richtext para ocupar todo o corpo (inclusive com botoes de acao
              proprios, links pra fora do app, etc.). */}
          <View style={styles.header}>
            {title ? (
              <Text style={styles.title} numberOfLines={2}>
                {title}
              </Text>
            ) : (
              <View style={styles.titleSpacer} />
            )}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              activeOpacity={0.7}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Fechar"
            >
              <XIcon size={22} color={colors.text.dark} weight="bold" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            <RenderHTML
              contentWidth={width - 96}
              source={{ html: html || '<p></p>' }}
              baseStyle={HTML_BASE_STYLE}
              tagsStyles={HTML_TAG_STYLES}
              enableExperimentalMarginCollapsing
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,2,45,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 12,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontFamily: fonts.bold,
    color: colors.text.dark,
    letterSpacing: -0.4,
  },
  // Sem titulo, empurra o "X" para a direita mantendo o cabecalho.
  titleSpacer: {
    flex: 1,
  },
  closeButton: {
    padding: 2,
    marginTop: -2,
    marginRight: -2,
  },
  body: {
    // Teto para nao estourar a tela em richtext longo; o ScrollView cuida do resto.
    maxHeight: 420,
  },
  bodyContent: {
    paddingBottom: 4,
  },
});
