import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { CheckIcon } from 'phosphor-react-native';
import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import RenderHTML, { MixedStyleDeclaration } from 'react-native-render-html';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/src/contexts/AuthContext';
import { useT } from '@/src/i18n';
import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

// Estilos do RenderHTML do gate. Mesma vocabulary de app/terms.tsx e do modal
// de termos do signup/activate, para manter a renderizacao consistente.
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
  strong: { fontFamily: fonts.bold },
  em: { fontFamily: fonts.italic },
  ol: { marginBottom: 12, paddingLeft: 18 },
  ul: { marginBottom: 12, paddingLeft: 18 },
  li: { marginBottom: 4 },
  a: { color: colors.brand.primary, textDecorationLine: 'underline' },
};

// Gate geral de aceite dos Termos & Condicoes. Aparece por cima de todo o app
// (como o BiometricGate/OfflineGate) quando a conta logada tem alguma politica
// pendente de aceite (termsPending). Fica ABAIXO da trava de biometria: so
// aparece depois do unlock (!isLocked), assim como o alert. Sem aceite, o
// usuario nao consegue usar o app - so pode aceitar ou sair.
export function TermsGate() {
  const router = useRouter();
  const {
    account,
    isRestoring,
    isLocked,
    termsPending,
    acceptPolicies,
    signOut,
  } = useAuth();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { t } = useT();

  const [checked, setChecked] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isRestoring || isLocked || !account || !termsPending) {
    return null;
  }

  const polices = account.polices ?? [];

  const handleAccept = async () => {
    if (!checked || isBusy) return;
    setIsBusy(true);
    setError(null);
    try {
      await acceptPolicies();
      // Sucesso: termsPending vira false e o gate desmonta sozinho.
    } catch (err) {
      console.warn('[termsGate] acceptPolicies failed:', err);
      setError(t('termsGate.error'));
      setIsBusy(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace('/');
  };

  return (
    <View style={styles.overlay} pointerEvents="auto">
      <StatusBar style="light" />

      <LinearGradient
        colors={['#6444DA', '#4D2ACC', '#1B0F4A']}
        start={{ x: 0.1, y: 0.1 }}
        end={{ x: 0.8, y: 1.2 }}
        locations={[0, 0.2, 0.7]}
        style={[styles.header, { paddingTop: insets.top + 20 }]}
      >
        <Text style={styles.eyebrow}>{t('termsGate.eyebrow')}</Text>
        <Text style={styles.title}>
          {t('termsGate.titleFirst')}
          <Text style={styles.titleAccent}>{t('termsGate.titleAccent')}</Text>
        </Text>
        <Text style={styles.description}>{t('termsGate.description')}</Text>
      </LinearGradient>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
      >
        {polices.length > 0 ? (
          polices.map((p) => (
            <View key={p.contentId} style={styles.policy}>
              {p.title ? <Text style={styles.policyTitle}>{p.title}</Text> : null}
              <RenderHTML
                contentWidth={width - 48}
                source={{ html: p.richText }}
                baseStyle={HTML_BASE_STYLE}
                tagsStyles={HTML_TAG_STYLES}
                enableExperimentalMarginCollapsing
              />
            </View>
          ))
        ) : (
          <Text style={styles.empty}>{t('termsGate.empty')}</Text>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={styles.checkboxWrapper}
          onPress={() => setChecked((v) => !v)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, checked && styles.checkboxActive]}>
            {checked && <CheckIcon size={14} color={colors.text.light} weight="bold" />}
          </View>
          <Text style={styles.checkboxText}>{t('termsGate.accept')}</Text>
        </TouchableOpacity>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.primaryButton, (!checked || isBusy) && styles.primaryButtonDisabled]}
          onPress={handleAccept}
          disabled={!checked || isBusy}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryButtonText}>
            {isBusy ? t('common.loading') : t('termsGate.acceptButton')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut} activeOpacity={0.7}>
          <Text style={styles.signOutText}>{t('common.signOut')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 28,
  },
  eyebrow: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontFamily: fonts.bold,
    letterSpacing: 2,
    marginBottom: 10,
  },
  title: {
    fontSize: 34,
    fontFamily: fonts.bold,
    color: colors.text.light,
    letterSpacing: -1.2,
    marginBottom: 10,
  },
  titleAccent: {
    color: '#85EDD3',
    fontFamily: fonts.bold_italic,
  },
  description: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 20,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 32,
  },
  policy: {
    marginBottom: 24,
  },
  policyTitle: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: colors.text.muted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  empty: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.text.muted,
    textAlign: 'center',
    paddingVertical: 24,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    backgroundColor: '#FFFFFF',
  },
  checkboxWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#D5D5DB',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  checkboxActive: {
    backgroundColor: '#0F022D',
    borderColor: '#0F022D',
  },
  checkboxText: {
    flex: 1,
    fontSize: 13,
    color: colors.text.muted,
    lineHeight: 18,
    fontFamily: fonts.regular,
  },
  errorText: {
    marginTop: 12,
    fontSize: 13,
    fontFamily: fonts.regular,
    color: '#f07167',
    lineHeight: 18,
  },
  primaryButton: {
    marginTop: 18,
    backgroundColor: colors.brand.primary,
    borderRadius: 8,
    paddingVertical: 18,
    alignItems: 'center',
  },
  primaryButtonDisabled: { opacity: 0.4 },
  primaryButtonText: {
    color: colors.text.light,
    fontSize: 15,
    fontFamily: fonts.bold,
    letterSpacing: 0.5,
  },
  signOutButton: {
    marginTop: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  signOutText: {
    color: colors.text.muted,
    fontSize: 14,
    fontFamily: fonts.medium,
    textDecorationLine: 'underline',
  },
});
