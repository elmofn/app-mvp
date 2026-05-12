import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Check } from 'phosphor-react-native';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import Animated, {
    interpolate,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withTiming
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/src/components/ScreenHeader';
import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

// Configuração das 3 etapas de Ativação
const ACTIVATION_STEPS = [
  { 
    id: 1, 
    title: 'Ativação', 
    description: 'Enviámos um código de 6 dígitos para o seu e-mail. Digite-o abaixo para validar a ativação da sua conta.', 
    label: 'CÓDIGO DE ATIVAÇÃO', 
    placeholder: '0 0 0 0 0 0' 
  },
  { 
    id: 2, 
    title: 'Senha', 
    description: 'Crie uma senha forte para proteger os seus dados e as suas futuras viagens no TravelBack.', 
    label: 'SUA SENHA', 
    placeholder: '••••••••' 
  },
  { 
    id: 3, 
    title: 'Revisão', 
    description: 'Confira os dados da sua conta e aceite os termos para concluir o processo de ativação.', 
    label: 'RESUMO DA CONTA', 
    placeholder: '' 
  },
];

export default function ActivationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [focusedField, setFocusedField] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  
  // Dados simulados para a revisão (Poderiam vir de um estado global ou API)
  const [formData, setFormData] = useState({
    name: 'Elmo Fagundes Nunes',
    email: 'elmo@travelback.me',
    code: '',
    password: ''
  });

  const progressWidth = useSharedValue(1 / 3);
  const contentOpacity = useSharedValue(1);

  useEffect(() => {
    // Atualiza a barra de progresso baseada em 3 etapas
    progressWidth.value = withTiming(currentStep / 3, { duration: 500 });
  }, [currentStep]);

  const animatedProgressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value * 100}%`
  }));

  const animatedContentStyle = useAnimatedStyle(() => {
    const translateX = interpolate(contentOpacity.value, [0, 1], [-20, 0]);
    return { opacity: contentOpacity.value, transform: [{ translateX }] };
  });

  const changeStep = (newStep: number) => setCurrentStep(newStep);

  const handleNext = () => {
    if (currentStep === 3 && !acceptedTerms) {
      Alert.alert('Termos', 'Por favor, aceite os termos e condições para continuar.');
      return;
    }

    if (currentStep < 3) {
      contentOpacity.value = withTiming(0, { duration: 200 }, (finished) => {
        if (finished) {
          runOnJS(changeStep)(currentStep + 1);
          contentOpacity.value = withTiming(1, { duration: 300 });
        }
      });
    } else {
      // Finaliza a ativação e vai para a Home
      router.replace('/(tabs)/home');
    }
  };

  const stepData = ACTIVATION_STEPS[currentStep - 1];

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <StatusBar style="light" />
      
      {/* Header Fixo com StatusBar Dinâmica */}
      <View style={[styles.fixedHeader, { paddingTop: insets.top }]}>
        <ScreenHeader title="ATIVAÇÃO DE CONTA" dark={true} />
        <View style={styles.progressContainer}>
          <Animated.View style={[styles.progressBar, animatedProgressStyle]} />
        </View>
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
          {/* Título e Descrição (Fundo Escuro) */}
          <View style={styles.headerScrollExtension}>
            <Animated.View style={animatedContentStyle}>
              <Text style={styles.progressText}>
                {String(currentStep).padStart(2, '0')} 
                <Text style={styles.progressTotal}> / 03</Text>
              </Text>
              <Text style={styles.mainTitle}>{stepData.title}</Text>
              <Text style={styles.pageDescription}>{stepData.description}</Text>
            </Animated.View>
          </View>

          {/* Conteúdo do Formulário (Fundo Claro) */}
          <View style={styles.formContainer}>
            <Animated.View style={[styles.formGroup, animatedContentStyle]}>
              <Text style={styles.inputLabel}>{stepData.label}</Text>
              
              {currentStep === 3 ? (
                // Etapa de Revisão
                <View>
                  <View style={styles.reviewContainer}>
                    <Text style={styles.reviewText}><Text style={styles.fontsBold}>Nome:</Text> {formData.name}</Text>
                    <Text style={styles.reviewText}><Text style={styles.fontsBold}>E-mail:</Text> {formData.email}</Text>
                  </View>

                  <TouchableOpacity 
                    style={styles.checkboxWrapper} 
                    onPress={() => setAcceptedTerms(!acceptedTerms)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.checkbox, acceptedTerms && styles.checkboxActive]}>
                      {acceptedTerms && <Check size={14} color={colors.text.light} weight="bold" />}
                    </View>
                    <Text style={styles.checkboxText}>
                      Aceito os <Text style={styles.linkText}>Termos e Condições</Text> de uso e a <Text style={styles.linkText}>política de privacidade</Text> dos dados.
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TextInput
                  style={[styles.inputField, focusedField && styles.inputFieldFocused]}
                  placeholder={stepData.placeholder}
                  placeholderTextColor="#D0D0D0"
                  onFocus={() => setFocusedField(true)}
                  onBlur={() => setFocusedField(false)}
                  secureTextEntry={currentStep === 2}
                  keyboardType={currentStep === 1 ? 'phone-pad' : 'default'}
                  value={currentStep === 1 ? formData.code : formData.password}
                  onChangeText={(val) => {
                    const key = currentStep === 1 ? 'code' : 'password';
                    setFormData({...formData, [key]: val});
                  }}
                />
              )}
            </Animated.View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={[
                  styles.primaryButton, 
                  (currentStep === 3 && !acceptedTerms) && { opacity: 0.5 }
                ]} 
                onPress={handleNext}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryButtonText}>
                  {currentStep === 3 ? 'CONCLUIR ATIVAÇÃO' : 'PRÓXIMO'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.light },
  fixedHeader: { backgroundColor: colors.background.dark },
  progressContainer: { height: 2, backgroundColor: '#333', width: '100%', marginBottom: 15 },
  progressBar: { height: '100%', backgroundColor: colors.brand.primary },
  headerScrollExtension: { backgroundColor: colors.background.dark, paddingHorizontal: 24, paddingBottom: 32 },
  progressText: { fontSize: 28, fontFamily: fonts.bold, color: colors.text.light },
  progressTotal: { fontSize: 12, color: colors.text.muted },
  mainTitle: { fontSize: 48, fontFamily: fonts.bold, color: colors.text.light, letterSpacing: -1.5, marginTop: 20, marginBottom: 15 },
  pageDescription: { fontSize: 16, fontFamily: fonts.regular, color: '#aaaaaa', lineHeight: 24, maxWidth: '90%' },
  scrollContent: { flexGrow: 1 },
  formContainer: { padding: 24, flex: 1, justifyContent: 'space-between' },
  formGroup: { marginBottom: 25 },
  inputLabel: { fontSize: 12, fontFamily: fonts.bold, color: colors.text.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  inputField: { width: '100%', borderBottomWidth: 1, borderBottomColor: '#e0e0e0', fontSize: 16, fontFamily: fonts.regular, color: colors.text.dark, paddingVertical: 12 },
  inputFieldFocused: { borderBottomWidth: 2, borderBottomColor: colors.brand.primary },
  reviewContainer: { backgroundColor: '#F9F9F9', padding: 20, borderRadius: 8, gap: 12, marginBottom: 24 },
  reviewText: { fontSize: 15, fontFamily: fonts.regular, color: colors.text.dark },
  fontsBold: { fontFamily: fonts.bold },
  checkboxWrapper: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 10 },
  checkbox: { width: 22, height: 22, borderRadius: 4, borderWidth: 1, borderColor: '#e0e0e0', backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  checkboxActive: { backgroundColor: colors.brand.primary, borderColor: colors.brand.primary },
  checkboxText: { flex: 1, fontSize: 13, color: colors.text.muted, lineHeight: 18, fontFamily: fonts.regular },
  linkText: { color: colors.brand.primary, fontFamily: fonts.bold },
  buttonContainer: { marginTop: 40 },
  primaryButton: { backgroundColor: colors.brand.primary, paddingVertical: 18, borderRadius: 4, alignItems: 'center' },
  primaryButtonText: { color: colors.text.light, fontSize: 14, fontFamily: fonts.bold, textTransform: 'uppercase', letterSpacing: 1 },
});