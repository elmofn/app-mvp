import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { DismissKeyboard } from '@/src/components/DismissKeyboard';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { canUseTravelerProfile } from '@/src/config/featureFlags';
import { useAuth } from '@/src/contexts/AuthContext';
import { useT } from '@/src/i18n';
import {
  loadTravelerProfile,
  saveTravelerProfile,
  TRAVEL_BUDGETS,
  TRAVEL_COMPANIES,
  TRAVEL_STYLES,
  TRIP_LENGTHS,
  type TravelBudget,
  type TravelCompany,
  type TravelStyle,
  type TripLength,
} from '@/src/services/travelerProfile';
import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

// Chip de selecao (serve para multi e single select). Ativo = fundo da marca.
function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function TravelerProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { account, refreshAccount } = useAuth();
  const { t } = useT();

  const accountId = account?.accountDetails.accountId ?? '';
  const allowed = canUseTravelerProfile(account?.accountDetails.email);

  const [styleSel, setStyleSel] = useState<TravelStyle[]>([]);
  const [company, setCompany] = useState<TravelCompany | undefined>();
  const [budget, setBudget] = useState<TravelBudget | undefined>();
  const [tripLength, setTripLength] = useState<TripLength | undefined>();
  const [dream, setDream] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Bloqueio de acesso direto (deep-link) por quem nao esta na allowlist.
  useEffect(() => {
    if (!allowed) router.back();
  }, [allowed, router]);

  // Prefill com o perfil salvo (edicao).
  useEffect(() => {
    let cancelled = false;
    if (!accountId) return;
    loadTravelerProfile(accountId).then((p) => {
      if (cancelled || !p) return;
      setStyleSel(p.styles);
      setCompany(p.company);
      setBudget(p.budget);
      setTripLength(p.tripLength);
      setDream(p.dreamDestination ?? '');
    });
    return () => {
      cancelled = true;
    };
  }, [accountId]);

  if (!allowed) return null;

  const toggleStyle = (s: TravelStyle) =>
    setStyleSel((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  // Single-select que permite desmarcar tocando de novo.
  const toggleSingle = <T,>(value: T, current: T | undefined, set: (v: T | undefined) => void) =>
    set(current === value ? undefined : value);

  const handleSave = async () => {
    if (!accountId || isSaving) return;
    setIsSaving(true);
    try {
      await saveTravelerProfile(accountId, {
        styles: styleSel,
        company,
        budget,
        tripLength,
        dreamDestination: dream.trim() || undefined,
        completedAt: new Date().toISOString(),
      });
      // Repovoa os "Proximos Destinos" ja com as preferencias (mesmo refresh da
      // home). Resiliente: falha aqui nao impede a saida da tela.
      refreshAccount().catch(() => undefined);
      router.back();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <StatusBar style="light" />
      <DismissKeyboard>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <LinearGradient
            colors={['#6444DA', '#4D2ACC', '#1B0F4A']}
            start={{ x: 0.1, y: 0.1 }}
            end={{ x: 0.8, y: 1.2 }}
            locations={[0, 0.2, 0.7]}
            style={[styles.header, { paddingTop: insets.top }]}
          >
            <ScreenHeader title={t('travelerProfile.screenHeaderTitle')} dark={true} />
            <View style={styles.headerBody}>
              <Text style={styles.eyebrow}>{t('travelerProfile.eyebrow')}</Text>
              <Text style={styles.title}>
                {t('travelerProfile.titleFirst')}
                <Text style={styles.titleAccent}>{t('travelerProfile.titleAccent')}</Text>
              </Text>
              <Text style={styles.intro}>{t('travelerProfile.intro')}</Text>
            </View>
          </LinearGradient>

          <View style={styles.body}>
            {/* Estilos — multi-select */}
            <Text style={styles.sectionTitle}>{t('travelerProfile.stylesTitle')}</Text>
            <View style={styles.chipWrap}>
              {TRAVEL_STYLES.map((s) => (
                <Chip
                  key={s}
                  label={t(`travelerProfile.style_${s}`)}
                  active={styleSel.includes(s)}
                  onPress={() => toggleStyle(s)}
                />
              ))}
            </View>

            {/* Companhia — single */}
            <Text style={styles.sectionTitle}>{t('travelerProfile.companyTitle')}</Text>
            <View style={styles.chipWrap}>
              {TRAVEL_COMPANIES.map((c) => (
                <Chip
                  key={c}
                  label={t(`travelerProfile.company_${c}`)}
                  active={company === c}
                  onPress={() => toggleSingle(c, company, setCompany)}
                />
              ))}
            </View>

            {/* Orcamento — single */}
            <Text style={styles.sectionTitle}>{t('travelerProfile.budgetTitle')}</Text>
            <View style={styles.chipWrap}>
              {TRAVEL_BUDGETS.map((b) => (
                <Chip
                  key={b}
                  label={t(`travelerProfile.budget_${b}`)}
                  active={budget === b}
                  onPress={() => toggleSingle(b, budget, setBudget)}
                />
              ))}
            </View>

            {/* Duracao — single */}
            <Text style={styles.sectionTitle}>{t('travelerProfile.tripLengthTitle')}</Text>
            <View style={styles.chipWrap}>
              {TRIP_LENGTHS.map((l) => (
                <Chip
                  key={l}
                  label={t(`travelerProfile.tripLength_${l}`)}
                  active={tripLength === l}
                  onPress={() => toggleSingle(l, tripLength, setTripLength)}
                />
              ))}
            </View>

            {/* Destino dos sonhos — texto livre */}
            <Text style={styles.sectionTitle}>{t('travelerProfile.dreamTitle')}</Text>
            <TextInput
              style={styles.input}
              value={dream}
              onChangeText={setDream}
              placeholder={t('travelerProfile.dreamPlaceholder')}
              placeholderTextColor={colors.text.muted}
              autoCapitalize="words"
              returnKeyType="done"
            />

            <TouchableOpacity
              style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={isSaving}
              activeOpacity={0.85}
            >
              {isSaving ? (
                <ActivityIndicator color={colors.text.light} />
              ) : (
                <Text style={styles.saveButtonText}>{t('travelerProfile.save')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </DismissKeyboard>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.light },
  header: { paddingBottom: 28 },
  headerBody: { paddingHorizontal: 24, marginTop: -8 },
  eyebrow: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontFamily: fonts.bold,
    letterSpacing: 2,
    marginBottom: 8,
  },
  title: {
    fontSize: 34,
    fontFamily: fonts.bold,
    color: colors.text.light,
    letterSpacing: -1.2,
    marginBottom: 10,
  },
  titleAccent: { color: '#85EDD3', fontFamily: fonts.bold_italic },
  intro: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 20,
  },
  body: { padding: 24 },
  sectionTitle: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: colors.text.medium,
    marginTop: 24,
    marginBottom: 14,
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D5D5DB',
    backgroundColor: '#FFFFFF',
  },
  chipActive: {
    backgroundColor: colors.brand.primary,
    borderColor: colors.brand.primary,
  },
  chipText: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: colors.text.medium,
  },
  chipTextActive: { color: colors.text.light },
  input: {
    borderWidth: 1,
    borderColor: '#D5D5DB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: fonts.regular,
    // evita o bug do iOS de espacar o placeholder com fontFamily custom
    letterSpacing: 0,
    color: colors.text.medium,
    backgroundColor: '#FFFFFF',
  },
  saveButton: {
    marginTop: 32,
    backgroundColor: colors.brand.primary,
    borderRadius: 8,
    paddingVertical: 18,
    alignItems: 'center',
  },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: {
    color: colors.text.light,
    fontSize: 15,
    fontFamily: fonts.bold,
    letterSpacing: 0.5,
  },
});
