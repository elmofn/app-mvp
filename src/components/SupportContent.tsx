import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowRightIcon,
  FileTextIcon,
  ShieldCheckIcon,
  SparkleIcon,
  VideoCameraIcon,
  WhatsappLogoIcon,
} from 'phosphor-react-native';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

const FAQS = [
  { id: '1', question: 'How do I freeze my physical card?' },
  { id: '2', question: 'Travel Insurance Coverage Limits' },
  { id: '3', question: 'International ATM Withdraw fees' },
  { id: '4', question: 'Adding Funds via Swift Transfer' },
];

type Props = {
  showTravelAssistant?: boolean;
  bottomInset?: number;
  titleFirst?: string;
  titleAccent?: string;
  titleAfter?: string;
};

export function SupportContent({
  showTravelAssistant = true,
  bottomInset = 24,
  titleFirst = 'How Can\nWe ',
  titleAccent = 'Assist',
  titleAfter = '\nYou?',
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

      <View style={styles.faqSection}>
        <Text style={styles.faqTitle}>
          Frequent{'\n'}
          <Text style={styles.faqTitleAccent}>Questions<Text style={styles.faqTitle}>.</Text></Text>
        </Text>
        <Text style={styles.faqSubtitle}>KNOWLEDGE BASE</Text>

        <View style={styles.faqList}>
          {FAQS.map((faq) => (
            <TouchableOpacity key={faq.id} style={styles.faqItem} activeOpacity={0.7}>
              <Text style={styles.faqItemText}>{faq.question}</Text>
              <ArrowRightIcon size={20} color={colors.text.dark} weight="regular" />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.divider} />

        <View style={styles.bottomButtons}>
          <TouchableOpacity style={styles.darkButton} activeOpacity={0.85}>
            <View style={[styles.darkButtonIcon, { backgroundColor: '#85EDD3' }]}>
              <ShieldCheckIcon size={24} color="#0F022D" weight="bold" />
            </View>
            <Text style={styles.darkButtonText}>About the app</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.darkButton} activeOpacity={0.85}>
            <View style={[styles.darkButtonIcon, { backgroundColor: '#f07167' }]}>
              <FileTextIcon size={24} color="#0F022D" weight="bold" />
            </View>
            <Text style={styles.darkButtonText}>Terms and Conditions</Text>
          </TouchableOpacity>
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

  faqList: {
    gap: 10,
  },
  faqItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#EDEDF2',
    borderRadius: 8,
    paddingVertical: 22,
    paddingHorizontal: 20,
  },
  faqItemText: {
    flex: 1,
    fontSize: 16,
    fontFamily: fonts.regular,
    color: colors.text.dark,
    lineHeight: 20,
    maxWidth: '80%',
    paddingRight: 16,
    paddingLeft: 16,
  },

  divider: {
    width: 56,
    height: 2,
    backgroundColor: '#f07167',
    marginTop: 24,
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
