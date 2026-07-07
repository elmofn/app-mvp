import { LinearGradient } from 'expo-linear-gradient';
import {
  FileTextIcon,
  ShieldCheckIcon,
  SparkleIcon,
  VideoCameraIcon,
  WhatsappLogoIcon,
} from 'phosphor-react-native';
import React, { useCallback, useRef, useState } from 'react';
import { Linking, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FAQSection, type FAQSectionHandle } from '@/src/components/FAQSection';
import { useT } from '@/src/i18n';
import type { SupportedLang } from '@/src/services/locale';
import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

// Numero unico de suporte do TravelBACK no WhatsApp Business - cada
// link e gerado pelo wa.link com a mensagem pre-preenchida no idioma
// correspondente. Mantenho aqui ao inves de em config porque sao
// constantes do produto, nao do ambiente.
const WHATSAPP_LINKS: Record<SupportedLang, string> = {
  'pt-BR': 'https://wa.link/gnhtsh',
  'en-US': 'https://wa.link/tstxoz',
  'es-ES': 'https://wa.link/oydqsc',
};

const VIDEO_CALL_LINK = 'https://calendly.com/travelcash';

type Props = {
  lang: SupportedLang;
  showTravelAssistant?: boolean;
  bottomInset?: number;
  titleFirst?: string;
  titleAccent?: string;
  titleAfter?: string;
  onTermsPress?: () => void;
  // Quando fornecido, habilita o pull-to-refresh: chamado primeiro (atualiza
  // a conta via GetAccount, trazendo o setups.lang atual) e, na sequencia,
  // a FAQ e repopulada com esse idioma. Ausente (ex.: tela de help pre-login)
  // = sem RefreshControl.
  onRefresh?: () => Promise<void>;
};

export function SupportContent({
  lang,
  showTravelAssistant = true,
  bottomInset = 24,
  titleFirst,
  titleAccent,
  titleAfter,
  onTermsPress,
  onRefresh,
}: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useT();

  const faqRef = useRef<FAQSectionHandle>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Pull-to-refresh: atualiza a conta (onRefresh -> GetAccount) e entao
  // repopula a FAQ com o idioma atual. Mantemos o spinner ate ambos
  // terminarem; falha e silenciosa (o conteudo atual permanece).
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await onRefresh?.();
      await faqRef.current?.refresh();
    } catch (err) {
      console.warn('[support] pull-to-refresh failed:', err);
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  const openExternal = (url: string) => {
    Linking.openURL(url).catch((err) => {
      console.warn('[support] could not open url:', url, err);
    });
  };

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: bottomInset }}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#FFFFFF"
            colors={['#4D2ACC']}
          />
        ) : undefined
      }
    >
      <LinearGradient
        colors={['#6444DA', '#4D2ACC', '#1B0F4A']}
        start={{ x: 0.1, y: 0.1 }}
        end={{ x: 0.8, y: 1.2 }}
        locations={[0, 0.2, 0.7]}
        style={[styles.headerGradient, { paddingTop: insets.top }]}
      >
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.2)' }]} />

        <View style={styles.headerBody}>
          <Text style={styles.headerLabel}>{t('support.headerLabel')}</Text>
          <Text style={styles.mainTitle}>
            {titleFirst ?? t('support.titleFirst')}
            <Text style={styles.mainTitleAccent}>{titleAccent ?? t('support.titleAccent')}</Text>
            {titleAfter ?? t('support.titleAfter')}
          </Text>
        </View>

        <View style={styles.contactCards}>
          <TouchableOpacity
            style={styles.contactCard}
            activeOpacity={0.85}
            onPress={() => openExternal(WHATSAPP_LINKS[lang])}
          >
            <View style={styles.contactCardBody}>
              <Text style={[styles.contactCardTitle, { color: '#85EDD3' }]}>
                {t('support.whatsappTitle')}
              </Text>
              <Text style={styles.contactCardSubtitle}>{t('support.whatsappSubtitle')}</Text>
            </View>
            <WhatsappLogoIcon size={32} color="#85EDD3" weight="regular" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.contactCard}
            activeOpacity={0.85}
            onPress={() => openExternal(VIDEO_CALL_LINK)}
          >
            <View style={styles.contactCardBody}>
              <Text style={styles.contactCardTitle}>{t('support.videoCallTitle')}</Text>
              <Text style={styles.contactCardSubtitle}>{t('support.videoCallSubtitle')}</Text>
            </View>
            <VideoCameraIcon size={32} color={colors.text.light} weight="regular" />
          </TouchableOpacity>

          {showTravelAssistant && (
            <TouchableOpacity style={styles.contactCard} activeOpacity={0.85}>
              <View style={styles.contactCardBody}>
                <Text style={styles.contactCardTitle}>Travel Assistant</Text>
                <Text style={styles.contactCardSubtitle}>Lorem Ipsum.</Text>
              </View>
              <SparkleIcon size={32} color={colors.text.light} weight="regular" />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      <FAQSection ref={faqRef} lang={lang} />

      <View style={styles.bottomSection}>
        <View style={styles.divider} />

        <View style={styles.bottomButtons}>
          <TouchableOpacity style={styles.darkButton} activeOpacity={0.85}>
            <View style={[styles.darkButtonIcon, { backgroundColor: '#85EDD3' }]}>
              <ShieldCheckIcon size={24} color="#0F022D" weight="bold" />
            </View>
            <Text style={styles.darkButtonText}>About the app</Text>
          </TouchableOpacity>

          {onTermsPress ? (
            <TouchableOpacity style={styles.darkButton} activeOpacity={0.85} onPress={onTermsPress}>
              <View style={[styles.darkButtonIcon, { backgroundColor: '#f07167' }]}>
                <FileTextIcon size={24} color="#0F022D" weight="bold" />
              </View>
              <Text style={styles.darkButtonText}>Terms and Conditions</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  headerGradient: {
    paddingBottom: 32,
  },
  headerBody: {
    paddingHorizontal: 24,
    marginTop: 18,
    marginBottom: 28,
  },
  headerLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontFamily: fonts.bold,
    letterSpacing: 2,
    marginBottom: 16,
  },
  mainTitle: {
    fontSize: 50,
    fontFamily: fonts.bold,
    color: colors.text.light,
    letterSpacing: -2,
    lineHeight: 52,
  },
  mainTitleAccent: {
    color: '#85EDD3',
    fontFamily: fonts.italic,
  },

  contactCards: {
    paddingHorizontal: 24,
    gap: 10,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  contactCardBody: {
    flex: 1,
  },
  contactCardTitle: {
    fontSize: 22,
    fontFamily: fonts.bold,
    color: colors.text.light,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  contactCardSubtitle: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: 'rgba(255,255,255,0.7)',
  },

  bottomSection: {
    paddingHorizontal: 24,
    paddingBottom: 8,
  },

  divider: {
    width: 56,
    height: 2,
    backgroundColor: '#f07167',
    marginTop: 4,
    marginBottom: 20,
  },

  bottomButtons: {
    gap: 10,
  },
  darkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F022D',
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 12,
  },
  darkButtonIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  darkButtonText: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: colors.text.light,
  },
});
