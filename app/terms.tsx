import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import RenderHTML, { MixedStyleDeclaration } from 'react-native-render-html';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/src/components/ScreenHeader';
import { useAuth } from '@/src/contexts/AuthContext';
import { useT } from '@/src/i18n';
import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

const HTML_BASE_STYLE: MixedStyleDeclaration = {
  color: colors.text.dark,
  fontFamily: fonts.regular,
  fontSize: 14,
  lineHeight: 22,
};

const HTML_TAG_STYLES: Record<string, MixedStyleDeclaration> = {
  h1: {
    fontFamily: fonts.bold,
    fontSize: 24,
    color: colors.text.dark,
    letterSpacing: -0.5,
    marginTop: 24,
    marginBottom: 12,
  },
  h2: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: colors.text.dark,
    letterSpacing: -0.3,
    marginTop: 20,
    marginBottom: 10,
  },
  h3: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.text.dark,
    marginTop: 16,
    marginBottom: 8,
  },
  p: {
    fontFamily: fonts.regular,
    color: colors.text.dark,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 10,
  },
  strong: {
    fontFamily: fonts.bold,
  },
  em: {
    fontFamily: fonts.italic,
  },
  ol: { marginBottom: 12, paddingLeft: 18 },
  ul: { marginBottom: 12, paddingLeft: 18 },
  li: { marginBottom: 4 },
  a: { color: '#0F022D', textDecorationLine: 'underline' },
};

export default function TermsScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { account } = useAuth();
  const { t } = useT();

  const policies = account?.polices ?? [];

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
          <ScreenHeader title={t('terms.screenHeaderTitle')} dark={true} />

          <View style={styles.headerBody}>
            <Text style={styles.headerLabel}>{t('terms.headerLabel')}</Text>
            <Text style={styles.mainTitle}>
              {t('terms.titleFirst')}<Text style={styles.mainTitleAccent}>{t('terms.titleAccent')}</Text>
            </Text>
            <Text style={styles.pageDescription}>
              {t('terms.pageDescription')}
            </Text>
          </View>
        </LinearGradient>

        <View style={styles.body}>
          {policies.length === 0 ? (
            <Text style={styles.emptyText}>
              {t('terms.empty')}
            </Text>
          ) : (
            policies.map((policy) => (
              <View key={policy.contentId} style={styles.policyBlock}>
                <Text style={styles.policyTitle}>{policy.title}</Text>
                <RenderHTML
                  contentWidth={width - 48}
                  source={{ html: policy.richText }}
                  baseStyle={HTML_BASE_STYLE}
                  tagsStyles={HTML_TAG_STYLES}
                  enableExperimentalMarginCollapsing
                />
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

  headerGradient: { paddingBottom: 32 },
  headerBody: {
    paddingHorizontal: 24,
    marginTop: -8,
  },
  headerLabel: {
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
    marginBottom: 10,
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

  body: {
    padding: 24,
  },
  policyBlock: {
    marginBottom: 32,
  },
  policyTitle: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: colors.text.muted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.text.muted,
    textAlign: 'center',
    paddingVertical: 40,
  },
});
