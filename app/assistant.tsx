import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { PaperPlaneRightIcon, SparkleIcon } from 'phosphor-react-native';
import React, { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/src/components/ScreenHeader';
import { useAuth } from '@/src/contexts/AuthContext';
import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

type Role = 'user' | 'assistant';

type Message = {
  id: string;
  role: Role;
  text: string;
};

// Prompts sugeridos que aparecem no estado inicial - placeholders ate
// termos um endpoint de IA propriamente integrado.
const SUGGESTED_PROMPTS = [
  'Plan a 3-day weekend in Lisbon',
  'What should I pack for Patagonia in winter?',
  'Find me a romantic hotel in Florence',
  'Best time to visit Tokyo',
];

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function AssistantScreen() {
  const insets = useSafeAreaInsets();
  const { account } = useAuth();
  const firstName = account?.accountDetails?.name?.split(' ')[0] ?? 'traveler';

  const scrollRef = useRef<ScrollView>(null);
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  const isEmpty = messages.length === 0;

  const send = (text: string) => {
    const clean = text.trim();
    if (!clean) return;
    setDraft('');
    const user: Message = { id: makeId(), role: 'user', text: clean };
    setMessages((curr) => [...curr, user]);
    setIsTyping(true);
    // Placeholder de resposta - substituir pelo fetch para o backend de IA
    // quando o endpoint estiver pronto. Mantemos o delay so para o
    // typing indicator nao piscar instantaneo.
    setTimeout(() => {
      const reply: Message = {
        id: makeId(),
        role: 'assistant',
        text: 'I can help with that. Booking integration is on the way - for now I am running on placeholder responses.',
      };
      setMessages((curr) => [...curr, reply]);
      setIsTyping(false);
    }, 900);
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <StatusBar style="light" />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <LinearGradient
          colors={['#6444DA', '#4D2ACC', '#1B0F4A']}
          start={{ x: 0.1, y: 0.1 }}
          end={{ x: 0.8, y: 1.2 }}
          locations={[0, 0.2, 0.7]}
          style={[styles.headerGradient, { paddingTop: insets.top + 16 }]}
        >
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.2)' }]} />
          <ScreenHeader title="Travel AI" dark={true} />

          <View style={styles.headerInner}>
            <Text style={styles.mainTitle}>
              Your Travel <Text style={styles.mainTitleAccent}>Concierge</Text>
            </Text>
            <Text style={styles.pageDescription}>
              Ask anything about destinations, itineraries, or your next reservation.
            </Text>
          </View>
        </LinearGradient>

        <ScrollView
          ref={scrollRef}
          style={styles.chatScroll}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          <View style={styles.welcomeCard}>
            <View style={styles.welcomeBadge}>
              <SparkleIcon size={14} color="#0F022D" weight="fill" />
              <Text style={styles.welcomeBadgeText}>WELCOME</Text>
            </View>
            <Text style={styles.welcomeTitle}>
              Hi {firstName}, what are we planning today?
            </Text>
            <Text style={styles.welcomeSubtitle}>
              I can help you find hotels, plan routes, and pick the best dates for your trip.
            </Text>
          </View>

          {isEmpty ? (
            <View style={styles.promptsBlock}>
              <Text style={styles.promptsLabel}>TRY ASKING</Text>
              <View style={styles.promptsList}>
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <TouchableOpacity
                    key={prompt}
                    style={styles.promptChip}
                    activeOpacity={0.85}
                    onPress={() => send(prompt)}
                  >
                    <Text style={styles.promptChipText}>{prompt}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : (
            <View style={styles.messagesList}>
              {messages.map((msg) => (
                <View
                  key={msg.id}
                  style={[
                    styles.bubble,
                    msg.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant,
                  ]}
                >
                  <Text
                    style={[
                      styles.bubbleText,
                      msg.role === 'user' ? styles.bubbleTextUser : styles.bubbleTextAssistant,
                    ]}
                  >
                    {msg.text}
                  </Text>
                </View>
              ))}
              {isTyping ? (
                <View style={[styles.bubble, styles.bubbleAssistant, styles.bubbleTyping]}>
                  <Text style={[styles.bubbleText, styles.bubbleTextAssistant]}>…</Text>
                </View>
              ) : null}
            </View>
          )}
        </ScrollView>

        <View style={styles.inputBar}>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              placeholder="Ask the concierge…"
              placeholderTextColor={colors.text.muted}
              value={draft}
              onChangeText={setDraft}
              multiline
            />
            <TouchableOpacity
              style={[styles.sendButton, !draft.trim() && styles.sendButtonDisabled]}
              activeOpacity={0.85}
              onPress={() => send(draft)}
              disabled={!draft.trim()}
            >
              <PaperPlaneRightIcon size={18} color={colors.text.light} weight="fill" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },

  headerGradient: { paddingBottom: 24 },
  headerInner: { paddingHorizontal: 24, marginTop: -8 },
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
    maxWidth: '95%',
  },

  chatScroll: { flex: 1 },
  chatContent: {
    padding: 24,
    paddingBottom: 32,
  },

  welcomeCard: {
    backgroundColor: '#0F022D',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  welcomeBadge: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#85EDD3',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    marginBottom: 14,
  },
  welcomeBadgeText: {
    fontSize: 10,
    fontFamily: fonts.bold,
    color: '#0F022D',
    letterSpacing: 1.2,
  },
  welcomeTitle: {
    fontSize: 22,
    fontFamily: fonts.bold,
    color: colors.text.light,
    letterSpacing: -0.6,
    lineHeight: 28,
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 19,
  },

  promptsBlock: {},
  promptsLabel: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: colors.text.muted,
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  promptsList: { gap: 10 },
  promptChip: {
    backgroundColor: '#EDEDF2',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  promptChipText: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.text.dark,
    lineHeight: 20,
  },

  messagesList: { gap: 10 },
  bubble: {
    maxWidth: '85%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
  },
  bubbleUser: {
    alignSelf: 'flex-end',
    backgroundColor: '#0F022D',
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    alignSelf: 'flex-start',
    backgroundColor: '#EDEDF2',
    borderBottomLeftRadius: 4,
  },
  bubbleTyping: { paddingVertical: 14 },
  bubbleText: {
    fontSize: 15,
    fontFamily: fonts.regular,
    lineHeight: 20,
  },
  bubbleTextUser: { color: colors.text.light },
  bubbleTextAssistant: { color: colors.text.dark },

  inputBar: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EDEDF2',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F4F4F8',
    borderRadius: 24,
    paddingLeft: 18,
    paddingRight: 6,
    paddingVertical: 6,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: fonts.regular,
    color: colors.text.dark,
    paddingVertical: 8,
    maxHeight: 120,
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#0F022D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: { backgroundColor: '#9B9BAE' },
});
