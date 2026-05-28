import { MagicWand, MapPin, PaperPlaneRight } from 'phosphor-react-native';
import React, { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { TopBar } from '@/src/components/Topbar';
import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'ai';
}

export default function AssistantScreen() {
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<Animated.ScrollView>(null);
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<Message[]>([
    { 
      id: 1, 
      text: "Olá, Elmo! Notei que estás perto da Avenida Paulista. Queres sugestões de restaurantes ou museus por aqui?", 
      sender: 'ai' 
    },
  ]);

  const handleSendMessage = () => {
    if (message.trim() === '') return;
    const newMessage: Message = { id: Date.now(), text: message, sender: 'user' };
    setChatHistory([...chatHistory, newMessage]);
    setMessage('');
    
    setTimeout(() => {
      const aiResponse: Message = {
        id: Date.now() + 1,
        text: "Excelente escolha. O Museu do MASP está a apenas 5 minutos de caminhada. Queres que eu trace a rota ou verifique o preço do bilhete?",
        sender: 'ai',
      };
      setChatHistory(prev => [...prev, aiResponse]);
    }, 1000);
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <Animated.ScrollView 
          ref={scrollViewRef}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          style={styles.chatContainer}
          contentContainerStyle={styles.scrollContent}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
        >
          {/* SEÇÃO SUPERIOR ESCURA (DarkHeader) - Garante que a TopBar fique preta */}
          <View style={[styles.darkHeader, { paddingTop: insets.top + 80 }]}>
            <View style={styles.headerBadge}>
              <MagicWand size={16} color={colors.brand.primary} weight="duotone" />
              <Text style={styles.headerBadgeText}>IA ASSISTANT</Text>
            </View>
            <Text style={styles.mainTitle}>Explorar</Text>
            <View style={styles.accentLine} />
          </View>

          {/* ÁREA DE MENSAGENS (MainContent) */}
          <View style={styles.chatContent}>
            {chatHistory.map((item) => (
              <View 
                key={item.id} 
                style={[
                  styles.messageBubble, 
                  item.sender === 'user' ? styles.userBubble : styles.aiBubble
                ]}
              >
                <Text style={[
                  styles.messageText, 
                  item.sender === 'user' ? styles.userText : styles.aiText
                ]}>
                  {item.text}
                </Text>
              </View>
            ))}
          </View>
        </Animated.ScrollView>

        {/* INPUT DE MENSAGEM */}
        <View style={[styles.inputContainer, { paddingBottom: insets.bottom }]}>
          <View style={styles.inputWrapper}>
            <MapPin size={20} color={colors.text.muted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Pergunte sobre locais próximos..."
              placeholderTextColor="#999"
              value={message}
              onChangeText={setMessage}
              multiline
            />
            <TouchableOpacity onPress={handleSendMessage} style={styles.sendButton}>
              <PaperPlaneRight size={22} color={colors.brand.primary} weight="fill" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      <TopBar scrollY={scrollY} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.light },
  chatContainer: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  darkHeader: {
    backgroundColor: colors.background.dark,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  headerBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  headerBadgeText: { color: colors.text.muted, fontSize: 10, fontFamily: fonts.bold, letterSpacing: 1 },
  mainTitle: { color: colors.text.light, fontSize: 42, fontFamily: fonts.bold, letterSpacing: -1 },
  accentLine: { width: 32, height: 3, backgroundColor: colors.brand.primary, marginTop: 12 },
  chatContent: { padding: 24, paddingTop: 30 },
  messageBubble: { maxWidth: '85%', padding: 16, borderRadius: 12, marginBottom: 16 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: colors.background.dark, borderBottomRightRadius: 2 },
  aiBubble: { alignSelf: 'flex-start', backgroundColor: '#E9E9EB', borderBottomLeftRadius: 2 },
  messageText: { fontSize: 15, lineHeight: 22, fontFamily: fonts.regular },
  userText: { color: colors.text.light },
  aiText: { color: colors.text.dark },
  inputContainer: { paddingHorizontal: 20, backgroundColor: colors.background.light, borderTopWidth: 1, borderTopColor: '#EEE' },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F2F2F7', borderRadius: 25, paddingHorizontal: 15, marginTop: 10 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 12, fontSize: 15, fontFamily: fonts.regular, color: colors.text.dark, maxHeight: 100 },
  sendButton: { padding: 8 },
});