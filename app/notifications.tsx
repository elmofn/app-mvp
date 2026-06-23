import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  useWindowDimensions,
  View,
} from 'react-native';
import RenderHTML, { MixedStyleDeclaration } from 'react-native-render-html';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/src/components/ScreenHeader';
import { useAuth } from '@/src/contexts/AuthContext';
import { type AlertItem, confirmRead, getAlerts } from '@/src/services/alerts';
import { getUserLanguage } from '@/src/services/locale';
import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

// Mesmo motivo do FAQSection: o LayoutAnimation precisa ser habilitado
// manualmente no Android pra que o accordion abra/feche suave.
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

function formatPublishDate(raw?: string): string {
  if (!raw) return '';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return '';
  const now = Date.now();
  const diffMs = now - date.getTime();
  const oneMin = 60 * 1000;
  const oneHour = 60 * oneMin;
  const oneDay = 24 * oneHour;
  if (diffMs < oneMin) return 'Just now';
  if (diffMs < oneHour) return `${Math.floor(diffMs / oneMin)}m ago`;
  if (diffMs < oneDay) return `${Math.floor(diffMs / oneHour)}h ago`;
  if (diffMs < 2 * oneDay) return 'Yesterday';
  if (diffMs < 7 * oneDay) return `${Math.floor(diffMs / oneDay)}d ago`;
  return date.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { account } = useAuth();
  const lang = getUserLanguage(account);
  const accountId = account?.account?.id ?? '';

  const [items, setItems] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // Marcacao otimista de leitura: a UI atualiza imediatamente e o
  // ConfirmRead vai em paralelo. Se a chamada falhar, mantemos o estado
  // local da sessao (proximo GetAlerts traz a verdade do servidor).
  const [readLocal, setReadLocal] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!accountId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setExpandedId(null);
    getAlerts(accountId, lang)
      .then((data) => {
        if (!cancelled) setItems(data);
      })
      .catch((err) => {
        console.warn('[alerts] fetch failed:', err);
        if (!cancelled) setError('Could not load alerts. Try again later.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [accountId, lang]);

  const isUnread = (it: AlertItem) => !it.readed && !readLocal.has(it.contentId);
  const hasUnread = items.some(isUnread);

  const toggle = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId((curr) => (curr === id ? null : id));

    const alreadyRead = readLocal.has(id) || items.find((it) => it.contentId === id)?.readed;
    if (alreadyRead || !accountId) return;

    setReadLocal((curr) => {
      const next = new Set(curr);
      next.add(id);
      return next;
    });
    confirmRead(id, accountId).catch((err) => {
      console.warn('[alerts] confirmRead failed:', err);
    });
  };

  const markAllRead = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const unreadIds = items.filter(isUnread).map((it) => it.contentId);
    setReadLocal((curr) => {
      const next = new Set(curr);
      unreadIds.forEach((id) => next.add(id));
      return next;
    });
    if (!accountId) return;
    unreadIds.forEach((id) => {
      confirmRead(id, accountId).catch((err) => {
        console.warn('[alerts] confirmRead failed:', err);
      });
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <StatusBar style="light" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <LinearGradient
          colors={['#6444DA', '#4D2ACC', '#1B0F4A']}
          start={{ x: 0.1, y: 0.1 }}
          end={{ x: 0.8, y: 1.2 }}
          locations={[0, 0.2, 0.7]}
          style={[styles.headerGradient, { paddingTop: insets.top }]}
        >
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.2)' }]} />
          <ScreenHeader title="Inbox" dark={true} />

          <View style={styles.headerBody}>
            <Text style={styles.headerLabel}>NOTIFICATIONS</Text>
            <Text style={styles.mainTitle}>
              Your <Text style={styles.mainTitleAccent}>Alerts</Text>
            </Text>
            <Text style={styles.pageDescription}>
              Stay up to date with your account activity and travel updates.
            </Text>
          </View>
        </LinearGradient>

        <View style={styles.body}>
          {loading ? (
            <View style={styles.stateBox}>
              <ActivityIndicator color={colors.text.dark} />
            </View>
          ) : error ? (
            <View style={styles.stateBox}>
              <Text style={styles.stateText}>{error}</Text>
            </View>
          ) : items.length === 0 ? (
            <View style={styles.stateBox}>
              <Text style={styles.stateText}>You don&apos;t have any alerts right now.</Text>
            </View>
          ) : (
            <>
              <View style={styles.list}>
                {items.map((alert) => {
                  const open = expandedId === alert.contentId;
                  const unread = isUnread(alert);
                  // O backend frequentemente repete title em description -
                  // nesses casos nao faz sentido mostrar o mesmo texto duas
                  // vezes. Tambem evita expandir um card vazio quando nao
                  // ha richText nem description extra.
                  const showDescription =
                    alert.description.trim().length > 0 &&
                    alert.description.trim() !== alert.title.trim();
                  const hasRichBody = !!alert.richText && alert.richText.trim().length > 0;
                  const expandable = hasRichBody || showDescription;
                  return (
                    <TouchableOpacity
                      key={alert.contentId}
                      style={[styles.card, unread ? styles.cardUnread : styles.cardRead]}
                      activeOpacity={0.85}
                      onPress={() => toggle(alert.contentId)}
                    >
                      <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle}>{alert.title}</Text>
                        {unread ? <View style={styles.unreadDot} /> : null}
                      </View>
                      {showDescription ? (
                        <Text
                          style={styles.cardDescription}
                          numberOfLines={open || !expandable ? undefined : 2}
                        >
                          {alert.description}
                        </Text>
                      ) : null}
                      {open && hasRichBody ? (
                        <View style={styles.richBody}>
                          <RenderHTML
                            contentWidth={width - 96}
                            source={{ html: alert.richText ?? '' }}
                            baseStyle={HTML_BASE_STYLE}
                            tagsStyles={HTML_TAG_STYLES}
                            enableExperimentalMarginCollapsing
                          />
                        </View>
                      ) : null}
                      {alert.publishDate ? (
                        <Text style={styles.cardTime}>{formatPublishDate(alert.publishDate)}</Text>
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {hasUnread ? (
                <TouchableOpacity
                  style={styles.markAllButton}
                  activeOpacity={0.7}
                  onPress={markAllRead}
                >
                  <Text style={styles.markAllText}>MARK ALL AS READ</Text>
                </TouchableOpacity>
              ) : null}
            </>
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
    fontSize: 50,
    fontFamily: fonts.bold,
    color: colors.text.light,
    letterSpacing: -2,
    lineHeight: 52,
    marginBottom: 12,
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
    maxWidth: '90%',
  },

  body: { padding: 24, paddingTop: 32 },

  stateBox: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateText: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.text.muted,
    textAlign: 'center',
  },

  list: { gap: 10 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderWidth: 1,
  },
  cardUnread: {
    borderColor: colors.brand.details,
  },
  cardRead: {
    borderColor: colors.background.cardDark,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontFamily: fonts.bold,
    color: colors.text.dark,
    lineHeight: 20,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.brand.details,
  },
  cardDescription: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.text.muted,
    lineHeight: 20,
  },
  richBody: { marginTop: 10 },
  cardTime: {
    marginTop: 10,
    fontSize: 11,
    fontFamily: fonts.bold,
    color: '#BBBBBB',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  markAllButton: {
    marginTop: 32,
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  markAllText: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: '#f07167',
    letterSpacing: 1,
    textDecorationLine: 'underline',
  },
});
