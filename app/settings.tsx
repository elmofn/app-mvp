import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/src/components/ScreenHeader';
import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [name, setName] = useState('Elmo Fagundes Nunes');
  const [phone, setPhone] = useState('+55 51 99999-9999');
  const [email, setEmail] = useState('elmo@travelcash.me');
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleLogout = () => {
    Alert.alert('Sair', 'Deseja sair da sua conta?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => router.replace('/') },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <StatusBar style="light" />
      
      <View style={[styles.fixedHeader, { paddingTop: insets.top }]}>
        <ScreenHeader title="DADOS PESSOAIS" dark={true} />
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 20 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView 
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled" // Permite clicar nos botões mesmo com o teclado aberto
        >
          
          {/* Título e Descrição agora rolam com a página, mantendo o fundo escuro */}
          <View style={styles.headerScrollExtension}>
            <Text style={styles.mainTitle}>Perfil</Text>
            <Text style={styles.pageDescription}>
              Gerencie as suas informações de contato e segurança da sua wallet de viagens.
            </Text>
          </View>

          {/* Área Clara com o Formulário */}
          <View style={styles.formContainer}>
            
            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>NOME COMPLETO</Text>
              <TextInput
                style={[
                  styles.inputField,
                  focusedField === 'name' && styles.inputFieldFocused
                ]}
                value={name}
                onChangeText={setName}
                onFocus={() => setFocusedField('name')}
                onBlur={() => setFocusedField(null)}
                placeholder="DIGITE SEU NOME"
                placeholderTextColor="#D0D0D0"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>NÚMERO DE TELEFONE</Text>
              <TextInput
                style={[
                  styles.inputField,
                  focusedField === 'phone' && styles.inputFieldFocused
                ]}
                value={phone}
                onChangeText={setPhone}
                onFocus={() => setFocusedField('phone')}
                onBlur={() => setFocusedField(null)}
                placeholder="DIGITE SEU TELEFONE"
                placeholderTextColor="#D0D0D0"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>E-MAIL</Text>
              <TextInput
                style={[
                  styles.inputField,
                  focusedField === 'email' && styles.inputFieldFocused
                ]}
                value={email}
                onChangeText={setEmail}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                placeholder="DIGITE SEU E-MAIL"
                placeholderTextColor="#D0D0D0"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity style={styles.primaryButton} activeOpacity={0.8}>
              <Text style={styles.primaryButtonText}>ALTERAR SENHA</Text>
            </TouchableOpacity>

            <View style={styles.actionLinks}>
              <TouchableOpacity onPress={handleLogout} activeOpacity={0.6}>
                <Text style={[styles.actionLink, styles.linkBlack]}>Sair da Conta</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={() => Alert.alert('Excluir Conta', 'Esta ação é permanente.')} 
                activeOpacity={0.6}
              >
                <Text style={[styles.actionLink, styles.linkRed]}>Excluir Minha Conta</Text>
              </TouchableOpacity>
            </View>
            
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: colors.background.light 
  },
  fixedHeader: { 
    backgroundColor: colors.background.dark, 
  },
  headerScrollExtension: { 
    backgroundColor: colors.background.dark, 
    paddingHorizontal: 24, 
    paddingBottom: 32,
    marginTop: -20, // Puxa o título um pouco para cima para alinhar melhor com o ScreenHeader
  },
  mainTitle: { 
    fontSize: 48, 
    fontFamily: fonts.bold, 
    color: colors.text.light, 
    letterSpacing: -1.5, 
    marginBottom: 8 
  },
  pageDescription: { 
    fontSize: 14, 
    fontFamily: fonts.regular, 
    color: '#aaaaaa', 
    lineHeight: 20, 
    maxWidth: '85%' 
  },
  scrollContent: { 
    flexGrow: 1 
  },
  formContainer: { 
    padding: 24, 
    paddingTop: 32,
    backgroundColor: colors.background.light, // Garante que a parte inferior seja sempre clara
  },
  formGroup: { 
    marginBottom: 28 
  },
  inputLabel: { 
    fontSize: 12, 
    fontFamily: fonts.bold, 
    color: colors.text.muted, 
    textTransform: 'uppercase', 
    letterSpacing: 1, 
    marginBottom: 4 
  },
  inputField: { 
    width: '100%', 
    borderBottomWidth: 1, 
    borderBottomColor: '#E0E0E0', 
    fontSize: 16, 
    fontFamily: fonts.regular, 
    color: colors.text.dark, 
    paddingVertical: 12 
  },
  inputFieldFocused: { 
    borderBottomWidth: 2, 
    borderBottomColor: colors.brand.primary 
  },
  primaryButton: { 
    backgroundColor: colors.brand.primary, 
    paddingVertical: 18, 
    borderRadius: 4, 
    marginTop: 10, 
    alignItems: 'center' 
  },
  primaryButtonText: { 
    color: colors.text.light, 
    fontSize: 14, 
    fontFamily: fonts.bold, 
    textTransform: 'uppercase', 
    letterSpacing: 1 
  },
  actionLinks: { 
    marginTop: 50, 
    gap: 18 
  },
  actionLink: { 
    fontSize: 16, 
    fontFamily: fonts.bold, 
    textDecorationLine: 'underline' 
  },
  linkBlack: { 
    color: colors.text.dark 
  },
  linkRed: { 
    color: '#d13030' 
  },
});