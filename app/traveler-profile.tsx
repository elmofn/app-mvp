import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  FadeInDown,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
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

type StepKey = 'styles' | 'company' | 'budget' | 'tripLength' | 'dream';
const STEPS: { key: StepKey; titleKey: string }[] = [
  { key: 'styles', titleKey: 'travelerProfile.stylesTitle' },
  { key: 'company', titleKey: 'travelerProfile.companyTitle' },
  { key: 'budget', titleKey: 'travelerProfile.budgetTitle' },
  { key: 'tripLength', titleKey: 'travelerProfile.tripLengthTitle' },
  { key: 'dream', titleKey: 'travelerProfile.dreamTitle' },
];

// Chip de selecao (multi e single). Ativo = fundo da marca.
function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
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

function joinWithAnd(items: string[], and: string): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(', ')} ${and} ${items[items.length - 1]}`;
}

export default function TravelerProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { account, refreshAccount } = useAuth();
  const { t } = useT();

  const accountId = account?.accountDetails.accountId ?? '';
  const allowed = canUseTravelerProfile(account?.accountDetails.email);

  // 'view' = resumo (frase + botao modificar); 'edit' = wizard de perguntas.
  const [mode, setMode] = useState<'loading' | 'view' | 'edit'>('loading');
  const [hasProfile, setHasProfile] = useState(false);

  const [styleSel, setStyleSel] = useState<TravelStyle[]>([]);
  const [company, setCompany] = useState<TravelCompany | undefined>();
  const [budget, setBudget] = useState<TravelBudget | undefined>();
  const [tripLength, setTripLength] = useState<TripLength | undefined>();
  const [dream, setDream] = useState('');

  const [currentStep, setCurrentStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  // Animacoes (mesmo padrao do create account): barra de progresso + fade/slide
  // do conteudo ao trocar de etapa.
  const progressWidth = useSharedValue(1 / STEPS.length);
  const contentOpacity = useSharedValue(1);

  useEffect(() => {
    progressWidth.value = withTiming(currentStep / STEPS.length, { duration: 450 });
  }, [currentStep, progressWidth]);

  const animatedProgressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value * 100}%`,
  }));
  const animatedContentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateX: interpolate(contentOpacity.value, [0, 1], [-18, 0]) }],
  }));

  // Bloqueio de acesso direto (deep-link) por quem nao esta na allowlist.
  useEffect(() => {
    if (!allowed) router.back();
  }, [allowed, router]);

  // Carrega o perfil salvo: existe -> resumo; nao existe -> ja abre o wizard.
  useEffect(() => {
    let cancelled = false;
    if (!accountId) return;
    loadTravelerProfile(accountId).then((p) => {
      if (cancelled) return;
      const filled = !!p && (p.styles.length > 0 || !!p.company || !!p.budget || !!p.tripLength);
      if (p) {
        setStyleSel(p.styles);
        setCompany(p.company);
        setBudget(p.budget);
        setTripLength(p.tripLength);
        setDream(p.dreamDestination ?? '');
      }
      setHasProfile(filled);
      setMode(filled ? 'view' : 'edit');
    });
    return () => {
      cancelled = true;
    };
  }, [accountId]);

  const changeStep = (n: number) => setCurrentStep(n);
  const advanceStep = () => {
    contentOpacity.value = withTiming(0, { duration: 180 }, (finished) => {
      if (finished) {
        runOnJS(changeStep)(currentStep + 1);
        contentOpacity.value = withTiming(1, { duration: 280 });
      }
    });
  };
  const retreatStep = () => {
    contentOpacity.value = withTiming(0, { duration: 180 }, (finished) => {
      if (finished) {
        runOnJS(changeStep)(currentStep - 1);
        contentOpacity.value = withTiming(1, { duration: 280 });
      }
    });
  };

  const startEditing = () => {
    setCurrentStep(1);
    contentOpacity.value = 1;
    progressWidth.value = 1 / STEPS.length;
    setMode('edit');
  };

  // Voltar: no wizard recua uma etapa; na primeira etapa volta ao resumo (se ja
  // havia perfil) ou sai da tela. No resumo, sai da tela.
  const handleBack = () => {
    if (isSaving) return;
    if (mode === 'edit') {
      if (currentStep > 1) {
        retreatStep();
      } else if (hasProfile) {
        setMode('view');
      } else {
        router.back();
      }
      return;
    }
    router.back();
  };

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleBack();
      return true;
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, currentStep, hasProfile, isSaving]);

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
      // Repovoa os "Proximos Destinos" ja com as preferencias (em background).
      refreshAccount().catch(() => undefined);
      setHasProfile(true);
      setMode('view');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleStyle = (s: TravelStyle) =>
    setStyleSel((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  const toggleSingle = <T,>(value: T, current: T | undefined, set: (v: T | undefined) => void) =>
    set(current === value ? undefined : value);

  if (!allowed || mode === 'loading') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.loadingCenter}>
          <ActivityIndicator color={colors.brand.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // --- RESUMO ----------------------------------------------------------------
  if (mode === 'view') {
    const stylesText = joinWithAnd(
      styleSel.map((s) => t(`travelerProfile.style_${s}`).toLowerCase()),
      t('travelerProfile.summaryAnd'),
    );
    const clauses: string[] = [];
    if (styleSel.length) clauses.push(`${t('travelerProfile.summaryLikesPrefix')} ${stylesText}`);
    if (company) clauses.push(t(`travelerProfile.companyClause_${company}`));
    if (budget) clauses.push(t(`travelerProfile.budgetClause_${budget}`));
    if (tripLength) clauses.push(t(`travelerProfile.tripClause_${tripLength}`));
    let sentence = clauses.join(', ');
    if (sentence) sentence = `${sentence.charAt(0).toUpperCase()}${sentence.slice(1)}.`;
    // Perfil salvo sem nenhuma selecao: mostra o convite em vez de uma frase vazia.
    const displaySentence = sentence || t('travelerProfile.intro');

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
            <ScreenHeader title={t('travelerProfile.screenHeaderTitle')} dark onBack={handleBack} />
            <View style={styles.headerBody}>
              <Text style={styles.eyebrow}>{t('travelerProfile.eyebrow')}</Text>
              <Text style={styles.mainTitle}>
                {t('travelerProfile.titleFirst')}
                <Text style={styles.mainTitleAccent}>{t('travelerProfile.titleAccent')}</Text>
              </Text>
            </View>
          </LinearGradient>

          <View style={styles.body}>
            <Animated.Text entering={FadeInDown.duration(400)} style={styles.summarySentence}>
              {displaySentence}
            </Animated.Text>
            {dream.trim() ? (
              <Animated.Text
                entering={FadeInDown.delay(120).duration(400)}
                style={styles.summaryDream}
              >
                {t('travelerProfile.summaryDreamPrefix')} <Text style={styles.summaryDreamValue}>{dream.trim()}</Text>.
              </Animated.Text>
            ) : null}

            <TouchableOpacity
              style={[styles.primaryButton, styles.summaryButton]}
              onPress={startEditing}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryButtonText}>{t('travelerProfile.modify')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // --- WIZARD ----------------------------------------------------------------
  const step = STEPS[currentStep - 1];
  const isLast = currentStep === STEPS.length;

  const renderOptions = () => {
    switch (step.key) {
      case 'styles':
        return TRAVEL_STYLES.map((s, i) => (
          <Animated.View key={s} entering={FadeInDown.delay(i * 45).duration(260)}>
            <Chip label={t(`travelerProfile.style_${s}`)} active={styleSel.includes(s)} onPress={() => toggleStyle(s)} />
          </Animated.View>
        ));
      case 'company':
        return TRAVEL_COMPANIES.map((c, i) => (
          <Animated.View key={c} entering={FadeInDown.delay(i * 45).duration(260)}>
            <Chip
              label={t(`travelerProfile.company_${c}`)}
              active={company === c}
              onPress={() => toggleSingle(c, company, setCompany)}
            />
          </Animated.View>
        ));
      case 'budget':
        return TRAVEL_BUDGETS.map((b, i) => (
          <Animated.View key={b} entering={FadeInDown.delay(i * 45).duration(260)}>
            <Chip
              label={t(`travelerProfile.budget_${b}`)}
              active={budget === b}
              onPress={() => toggleSingle(b, budget, setBudget)}
            />
          </Animated.View>
        ));
      case 'tripLength':
        return TRIP_LENGTHS.map((l, i) => (
          <Animated.View key={l} entering={FadeInDown.delay(i * 45).duration(260)}>
            <Chip
              label={t(`travelerProfile.tripLength_${l}`)}
              active={tripLength === l}
              onPress={() => toggleSingle(l, tripLength, setTripLength)}
            />
          </Animated.View>
        ));
      case 'dream':
        return (
          <Animated.View key="dream" entering={FadeInDown.duration(260)} style={{ width: '100%' }}>
            <TextInput
              style={styles.input}
              value={dream}
              onChangeText={setDream}
              placeholder={t('travelerProfile.dreamPlaceholder')}
              placeholderTextColor={colors.text.muted}
              autoCapitalize="words"
              returnKeyType="done"
            />
          </Animated.View>
        );
    }
  };

  return (
    <DismissKeyboard>
      <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
        <StatusBar style="light" />

        <LinearGradient
          colors={['#6444DA', '#4D2ACC', '#1B0F4A']}
          start={{ x: 0.1, y: 0.1 }}
          end={{ x: 0.8, y: 1.2 }}
          locations={[0, 0.2, 0.7]}
          style={[styles.headerGradient, { paddingTop: insets.top }]}
        >
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.2)' }]} />
          <ScreenHeader title={t('travelerProfile.screenHeaderTitle')} dark onBack={handleBack} />

          <View style={styles.stepCounter}>
            <Text>
              <Text style={styles.stepCurrent}>{String(currentStep).padStart(2, '0')}</Text>
              <Text style={styles.stepTotal}>{` / ${String(STEPS.length).padStart(2, '0')}`}</Text>
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressBar, animatedProgressStyle]} />
          </View>

          <Animated.View style={[styles.headerBody, animatedContentStyle]}>
            <Text style={styles.eyebrow}>{t('travelerProfile.stepEyebrow')}</Text>
            <Text style={styles.question}>{t(step.titleKey)}</Text>
          </Animated.View>
        </LinearGradient>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.body}>
              <View key={`step-${currentStep}`} style={styles.chipWrap}>
                {renderOptions()}
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, isSaving && styles.primaryButtonDisabled]}
                onPress={isLast ? handleSave : advanceStep}
                disabled={isSaving}
                activeOpacity={0.85}
              >
                {isSaving ? (
                  <ActivityIndicator color={colors.text.light} />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    {isLast ? t('travelerProfile.save') : t('common.next')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </DismissKeyboard>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.light },
  loadingCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  headerGradient: { paddingBottom: 28 },
  headerBody: { paddingHorizontal: 24, marginTop: 4 },
  eyebrow: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontFamily: fonts.bold,
    letterSpacing: 2,
    marginBottom: 8,
  },
  mainTitle: {
    fontSize: 40,
    fontFamily: fonts.bold,
    color: colors.text.light,
    letterSpacing: -1.6,
  },
  mainTitleAccent: { color: '#85EDD3', fontFamily: fonts.bold_italic },
  question: {
    fontSize: 27,
    fontFamily: fonts.bold,
    color: colors.text.light,
    letterSpacing: -0.8,
    lineHeight: 32,
  },

  stepCounter: { paddingHorizontal: 24, marginBottom: 8 },
  stepCurrent: { fontSize: 24, fontFamily: fonts.bold, color: colors.text.light, letterSpacing: -1.2 },
  stepTotal: { fontSize: 12, fontFamily: fonts.bold, color: 'rgba(255,255,255,0.6)' },
  progressTrack: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 24,
    borderRadius: 2,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressBar: { height: '100%', backgroundColor: '#85EDD3' },

  scrollContent: { flexGrow: 1 },
  body: { padding: 24, paddingTop: 28, flex: 1 },

  summarySentence: {
    fontSize: 24,
    fontFamily: fonts.bold,
    color: colors.text.medium,
    letterSpacing: -0.6,
    lineHeight: 34,
  },
  summaryDream: {
    fontSize: 15,
    fontFamily: fonts.regular,
    color: colors.text.muted,
    lineHeight: 22,
    marginTop: 16,
  },
  summaryDreamValue: { fontFamily: fonts.bold, color: colors.text.medium },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D5D5DB',
    backgroundColor: '#FFFFFF',
  },
  chipActive: { backgroundColor: colors.brand.primary, borderColor: colors.brand.primary },
  chipText: { fontSize: 15, fontFamily: fonts.medium, color: colors.text.medium },
  chipTextActive: { color: colors.text.light },

  input: {
    borderWidth: 1,
    borderColor: '#D5D5DB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: fonts.regular,
    letterSpacing: 0, // evita o bug do placeholder no iOS
    color: colors.text.medium,
    backgroundColor: '#FFFFFF',
  },

  primaryButton: {
    marginTop: 'auto',
    backgroundColor: colors.brand.primary,
    borderRadius: 8,
    paddingVertical: 18,
    alignItems: 'center',
  },
  summaryButton: { marginTop: 36 }, // no resumo nao ha flex p/ empurrar (override do marginTop:auto)
  primaryButtonDisabled: { opacity: 0.5 },
  primaryButtonText: {
    color: colors.text.light,
    fontSize: 15,
    fontFamily: fonts.bold,
    letterSpacing: 0.5,
  },
});
