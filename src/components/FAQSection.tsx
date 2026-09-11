import { CaretDownIcon } from 'phosphor-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  useWindowDimensions,
  View,
} from 'react-native';
import RenderHTML, { MixedStyleDeclaration } from 'react-native-render-html';

import { useAuth } from '@/src/contexts/AuthContext';
import { useT } from '@/src/i18n';
import type { SupportedLang } from '@/src/services/locale';
import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

// Habilita o LayoutAnimation no Android. Sem isso o accordion abre seco.
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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
  lang: SupportedLang;
};

export function FAQSection({ lang }: Props) {
  const { width } = useWindowDimensions();
  const { t } = useT();
  // A FAQ vive no AuthContext (fonte unica): carregamos aqui no mount / troca
  // de idioma, e o pull-to-refresh da home tambem chama reloadFAQ. Assim esta
  // secao e repopulada pelo refresh da home sem buscar por conta propria.
  const { faq: faqState, reloadFAQ } = useAuth();
  const { items, loading, error } = faqState;
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    reloadFAQ(lang);
    setExpandedId(null);
  }, [lang, reloadFAQ]);

  // So mostramos spinner/erro quando ainda nao ha itens: reabrir a tela ou um
  // refresh da home (que re-dispara reloadFAQ) nao deve apagar o conteudo ja
  // carregado - mantemos o atual ate a nova resposta chegar.
  const showLoading = loading && items.length === 0;
  const showError = error && items.length === 0;

  const toggle = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId((curr) => (curr === id ? null : id));
  };

  return (
    <View style={styles.faqSection}>
      <Text style={styles.faqTitle}>
        {t('support.faqTitleFirst')}{'\n'}
        <Text style={styles.faqTitleAccent}>
          {t('support.faqTitleAccent')}
          <Text style={styles.faqTitle}>.</Text>
        </Text>
      </Text>
      <Text style={styles.faqSubtitle}>{t('support.faqSubtitle')}</Text>

      {showLoading ? (
        <View style={styles.stateBox}>
          <ActivityIndicator color={colors.text.dark} />
        </View>
      ) : showError ? (
        <View style={styles.stateBox}>
          <Text style={styles.stateText}>{t('support.faqError')}</Text>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.stateBox}>
          <Text style={styles.stateText}>{t('support.faqEmpty')}</Text>
        </View>
      ) : (
        <View style={styles.faqList}>
          {items.map((faq) => {
            const open = expandedId === faq.contentId;
            return (
              <View key={faq.contentId} style={styles.faqItem}>
                <TouchableOpacity
                  style={styles.faqItemHeader}
                  activeOpacity={0.7}
                  onPress={() => toggle(faq.contentId)}
                >
                  <Text style={styles.faqItemText}>{faq.title}</Text>
                  <View style={[styles.caretWrap, open && styles.caretWrapOpen]}>
                    <CaretDownIcon size={18} color={colors.text.dark} weight="bold" />
                  </View>
                </TouchableOpacity>
                {open ? (
                  <View style={styles.faqItemBody}>
                    <RenderHTML
                      contentWidth={width - 96}
                      source={{ html: faq.richText || `<p>${faq.description}</p>` }}
                      baseStyle={HTML_BASE_STYLE}
                      tagsStyles={HTML_TAG_STYLES}
                      enableExperimentalMarginCollapsing
                    />
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  faqSection: {
    padding: 24,
    paddingTop: 44,
  },
  faqTitle: {
    fontSize: 48,
    fontFamily: fonts.bold,
    color: colors.text.dark,
    letterSpacing: 0,
    lineHeight: 52,
  },
  faqTitleAccent: {
    color: '#f07167',
    fontFamily: fonts.italic,
  },
  faqSubtitle: {
    fontSize: 15,
    fontFamily: fonts.italic,
    color: colors.text.muted,
    letterSpacing: 1.5,
    marginTop: 1,
    marginBottom: 28,
  },

  stateBox: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateText: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.text.muted,
    textAlign: 'center',
  },

  faqList: {
    gap: 10,
  },
  faqItem: {
    backgroundColor: '#EDEDF2',
    borderRadius: 8,
    overflow: 'hidden',
  },
  faqItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 22,
    paddingHorizontal: 20,
  },
  faqItemText: {
    flex: 1,
    fontSize: 16,
    fontFamily: fonts.regular,
    color: colors.text.dark,
    lineHeight: 20,
    paddingRight: 16,
  },
  caretWrap: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caretWrapOpen: {
    transform: [{ rotate: '180deg' }],
  },
  faqItemBody: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 4,
  },
});
