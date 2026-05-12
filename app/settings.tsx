import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { CaretDown } from 'phosphor-react-native';
import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/src/components/ScreenHeader';
import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

const CURRENCIES = [
  { label: 'BRL - Real Brasileiro (R$)', value: 'BRL' },
  { label: 'USD - Dólar Americano ($)', value: 'USD' },
  { label: 'EUR - Euro (€)', value: 'EUR' },
];

const LANGUAGES = [
  { label: 'Português (Brasil)', value: 'pt-BR' },
  { label: 'English (US)', value: 'en-US' },
  { label: 'Español', value: 'es-ES' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  // Estados dos campos
  const [name, setName] = useState('Elmo Fagundes Nunes');
  const [phone, setPhone] = useState('+55 51 99999-9999');
  const [email, setEmail] = useState('elmo@travelcash.me');
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Preferências
  const [currency, setCurrency] = useState(CURRENCIES[0]);
  const [language, setLanguage] = useState(LANGUAGES[0]);
  const [modalVisible, setModalVisible] = useState<{ type: 'currency' | 'language' | null }>({ type: null });

  const handleLogout = () => {
    Alert.alert('Sair', 'Deseja encerrar a sua sessão no TravelCash?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => router.replace('/') },
    ]);
  };

  const openPicker = (type: 'currency' | 'language') => {
    setModalVisible({ type });
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <StatusBar style="light" />
      
      <View style={[styles.fixedHeader, { paddingTop: insets.top }]}>
        <ScreenHeader title="DADOS PESSOAIS" dark={true} />
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView 
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.headerScrollExtension}>
            <Text style={styles.mainTitle}>Perfil</Text>
            <Text style={styles.pageDescription}>
              Gerencie as suas informações de contacto, preferências de exibição e segurança da conta.
            </Text>
          </View>

          <View style={styles.formContainer}>
            {/* Campo Nome */}
            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>NOME COMPLETO</Text>
              <TextInput
                style={[styles.inputField, focusedField === 'name' && styles.inputFieldFocused]}
                value={name}
                onChangeText={setName}
                onFocus={() => setFocusedField('name')}
                onBlur={() => setFocusedField(null)}
                placeholder="DIGITE SEU NOME"
              />
            </View>

            {/* Campo Telefone - Reintegrado */}
            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>NÚMERO DE TELEFONE</Text>
              <TextInput
                style={[styles.inputField, focusedField === 'phone' && styles.inputFieldFocused]}
                value={phone}
                onChangeText={setPhone}
                onFocus={() => setFocusedField('phone')}
                onBlur={() => setFocusedField(null)}
                placeholder="DIGITE SEU TELEFONE"
                keyboardType="phone-pad"
              />
            </View>

            {/* Dropdown de Moeda */}
            <TouchableOpacity 
              style={styles.formGroup} 
              onPress={() => openPicker('currency')}
              activeOpacity={0.7}
            >
              <Text style={styles.inputLabel}>MOEDA DE EXIBIÇÃO</Text>
              <View style={styles.selectField}>
                <Text style={styles.selectValue}>{currency.label}</Text>
                <CaretDown size={16} color={colors.text.muted} />
              </View>
            </TouchableOpacity>

            {/* Dropdown de Idioma */}
            <TouchableOpacity 
              style={styles.formGroup} 
              onPress={() => openPicker('language')}
              activeOpacity={0.7}
            >
              <Text style={styles.inputLabel}>IDIOMA DO APP</Text>
              <View style={styles.selectField}>
                <Text style={styles.selectValue}>{language.label}</Text>
                <CaretDown size={16} color={colors.text.muted} />
              </View>
            </TouchableOpacity>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>E-MAIL</Text>
              <TextInput
                style={[styles.inputField, focusedField === 'email' && styles.inputFieldFocused]}
                value={email}
                onChangeText={setEmail}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
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
              <TouchableOpacity onPress={() => {}} activeOpacity={0.6}>
                <Text style={[styles.actionLink, styles.linkRed]}>Excluir Minha Conta</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal de Seleção */}
      <Modal
        visible={modalVisible.type !== null}
        transparent={true}
        animationType="fade"
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setModalVisible({ type: null })}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {modalVisible.type === 'currency' ? 'SELECIONAR MOEDA' : 'SELECIONAR IDIOMA'}
            </Text>
            <FlatList
              data={modalVisible.type === 'currency' ? CURRENCIES : LANGUAGES}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.modalOption}
                  onPress={() => {
                    if (modalVisible.type === 'currency') setCurrency(item);
                    else setLanguage(item);
                    setModalVisible({ type: null });
                  }}
                >
                  <Text style={[
                    styles.modalOptionText,
                    (currency.value === item.value || language.value === item.value) && styles.modalOptionActive
                  ]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.light },
  fixedHeader: { backgroundColor: colors.background.dark },
  headerScrollExtension: { backgroundColor: colors.background.dark, paddingHorizontal: 24, paddingBottom: 32, marginTop: -20 },
  mainTitle: { fontSize: 48, fontFamily: fonts.bold, color: colors.text.light, letterSpacing: -1.5, marginBottom: 8 },
  pageDescription: { fontSize: 14, fontFamily: fonts.regular, color: '#aaaaaa', lineHeight: 20, maxWidth: '85%' },
  scrollContent: { flexGrow: 1 },
  formContainer: { padding: 24, paddingTop: 32 },
  formGroup: { marginBottom: 28 },
  inputLabel: { fontSize: 12, fontFamily: fonts.bold, color: colors.text.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  inputField: { width: '100%', borderBottomWidth: 1, borderBottomColor: '#E0E0E0', fontSize: 16, fontFamily: fonts.regular, color: colors.text.dark, paddingVertical: 12 },
  inputFieldFocused: { borderBottomWidth: 2, borderBottomColor: colors.brand.primary },
  selectField: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#E0E0E0', paddingVertical: 12 },
  selectValue: { fontSize: 16, fontFamily: fonts.regular, color: colors.text.dark },
  primaryButton: { backgroundColor: colors.brand.primary, paddingVertical: 18, borderRadius: 4, marginTop: 10, alignItems: 'center' },
  primaryButtonText: { color: colors.text.light, fontSize: 14, fontFamily: fonts.bold, textTransform: 'uppercase', letterSpacing: 1 },
  actionLinks: { marginTop: 50, gap: 18 },
  actionLink: { fontSize: 16, fontFamily: fonts.bold, textDecorationLine: 'underline' },
  linkBlack: { color: colors.text.dark },
  linkRed: { color: '#d13030' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContent: { width: '100%', backgroundColor: '#FFF', borderRadius: 8, padding: 24, maxHeight: '50%' },
  modalTitle: { fontSize: 12, fontFamily: fonts.bold, color: colors.text.muted, letterSpacing: 1, marginBottom: 16 },
  modalOption: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  modalOptionText: { fontSize: 16, fontFamily: fonts.regular, color: colors.text.dark },
  modalOptionActive: { color: colors.brand.primary, fontFamily: fonts.bold },
});