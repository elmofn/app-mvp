import { LinearGradient } from 'expo-linear-gradient';
import {
  FileTextIcon,
  ShieldCheckIcon,
  SparkleIcon,
  VideoCameraIcon,
  WhatsappLogoIcon,
} from 'phosphor-react-native';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FAQSection } from '@/src/components/FAQSection';
import type { SupportedLang } from '@/src/services/locale';
import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

type Props = {
  lang: SupportedLang;
  showTravelAssistant?: boolean;
  bottomInset?: number;
  titleFirst?: string;
  titleAccent?: string;
  titleAfter?: string;
  onTermsPress?: () => void;
};

export function SupportContent({
  lang,
  showTravelAssistant = true,
  bottomInset = 24,
  titleFirst = 'How Can\nWe ',
  titleAccent = 'Assist',
  titleAfter = '\nYou?',
  onTermsPress,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: bottomInset }}
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
          <Text style={styles.headerLabel}>SUPPORT</Text>
          <Text style={styles.mainTitle}>
            {titleFirst}
            <Text style={styles.mainTitleAccent}>{titleAccent}</Text>
            {titleAfter}
          </Text>
        </View>

        <View style={styles.contactCards}>
          <TouchableOpacity style={styles.contactCard} activeOpacity={0.85}>
            <View style={styles.contactCardBody}>
              <Text style={[styles.contactCardTitle, { color: '#85EDD3' }]}>Whatsapp</Text>
              <Text style={styles.contactCardSubtitle}>Direct Support</Text>
            </View>
            <WhatsappLogoIcon size={32} color="#85EDD3" weight="regular" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.contactCard} activeOpacity={0.85}>
            <View style={styles.contactCardBody}>
              <Text style={styles.contactCardTitle}>Video Call</Text>
              <Text style={styles.contactCardSubtitle}>Lorem Ipsum, Lorem Ipsum.</Text>
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

      <FAQSection lang={lang} />

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
