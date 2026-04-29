import { MagicWand, MapPin, PaperPlaneRight } from 'phosphor-react-native';
import React, { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'ai';
}

export default function AssistantScreen() {
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  
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

    const newMessage: Message = {
      id: Date.now(),
      text: message,
      sender: 'user',
    };

    setChatHistory([...chatHistory, newMessage]);
    setMessage('');
    
    // Simulação de resposta da IA
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
      {/* Seção Superior (Preta) - Mantendo a Identidade */}
      <View style={[styles.darkHeader, { paddingTop: insets.top + 20 }]}>
        <View style={styles.headerInfo}>
          <MagicWand size={24} color={colors.brand.primary} weight="duotone" />
          <Text style={styles.headerSubtitle}>TRAVEL ASSISTANT</Text>
        </View>
        <Text style={styles.mainTitle}>Explorar</Text>
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        {/* Área de Chat */}
        <ScrollView 
          ref={scrollViewRef}
          style={styles.chatContainer}
          contentContainerStyle={styles.chatContent}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
        >
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
        </ScrollView>

        {/* Input Area (Main Content Style) */}
        <View style={[styles.inputContainer, { paddingBottom: insets.bottom + 10 }]}>
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
            <TouchableOpacity 
              onPress={handleSendMessage}
              style={styles.sendButton}
              activeOpacity={0.7}
            >
              <PaperPlaneRight size={22} color={colors.brand.primary} weight="fill" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.light,
  },
  darkHeader: {
    backgroundColor: colors.background.dark,
    paddingHorizontal: 24,
    paddingBottom: 30,
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  headerSubtitle: {
    color: colors.text.muted,
    fontSize: 12,
    fontFamily: fonts.bold,
    letterSpacing: 1.5,
  },
  mainTitle: {
    color: colors.text.light,
    fontSize: 48,
    fontFamily: fonts.bold,
    letterSpacing: -1.5,
  },
  chatContainer: {
    flex: 1,
  },
  chatContent: {
    padding: 24,
    paddingBottom: 20,
  },
  messageBubble: {
    maxWidth: '85%',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: colors.background.dark,
    borderBottomRightRadius: 2,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#E9E9EB', // Cinza neutro estilo iOS/Swiss
    borderBottomLeftRadius: 2,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: fonts.regular,
  },
  userText: {
    color: colors.text.light,
  },
  aiText: {
    color: colors.text.dark,
  },
  inputContainer: {
    paddingHorizontal: 20,
    backgroundColor: colors.background.light,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 25,
    paddingHorizontal: 15,
    marginTop: 10,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: fonts.regular,
    color: colors.text.dark,
    maxHeight: 100,
  },
  sendButton: {
    padding: 8,
  },
});