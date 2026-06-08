import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

export type AlertButton = {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
};

export type AlertConfig = {
  title: string;
  message?: string;
  buttons?: AlertButton[];
};

type Props = {
  visible: boolean;
  config: AlertConfig | null;
  onDismiss: () => void;
};

export function CustomAlert({ visible, config, onDismiss }: Props) {
  const buttons: AlertButton[] = config?.buttons?.length
    ? config.buttons
    : [{ text: 'OK', style: 'default' }];

  const isHorizontal = buttons.length === 2;

  const handlePress = (btn: AlertButton) => {
    onDismiss();
    btn.onPress?.();
  };

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {config?.title ? <Text style={styles.title}>{config.title}</Text> : null}
          {config?.message ? <Text style={styles.message}>{config.message}</Text> : null}

          <View style={isHorizontal ? styles.actionsHorizontal : styles.actionsVertical}>
            {buttons.map((btn, idx) => {
              const isCancel = btn.style === 'cancel';
              const isDestructive = btn.style === 'destructive';

              return (
                <TouchableOpacity
                  key={`${btn.text}-${idx}`}
                  style={[
                    styles.button,
                    isHorizontal && styles.buttonHorizontal,
                    isCancel
                      ? styles.buttonCancel
                      : isDestructive
                      ? styles.buttonDestructive
                      : styles.buttonPrimary,
                  ]}
                  onPress={() => handlePress(btn)}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      isCancel
                        ? styles.buttonTextCancel
                        : isDestructive
                        ? styles.buttonTextDestructive
                        : styles.buttonTextPrimary,
                    ]}
                  >
                    {btn.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,2,45,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontFamily: fonts.bold,
    color: colors.text.dark,
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  message: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.text.muted,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 10,
  },
  actionsVertical: {
    gap: 10,
    marginTop: 22,
  },
  actionsHorizontal: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 22,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonHorizontal: {
    flex: 1,
  },
  buttonPrimary: {
    backgroundColor: '#0F022D',
  },
  buttonDestructive: {
    backgroundColor: '#f07167',
  },
  buttonCancel: {
    backgroundColor: '#EDEDF2',
  },
  buttonText: {
    fontSize: 14,
    fontFamily: fonts.bold,
    letterSpacing: 0.3,
  },
  buttonTextPrimary: {
    color: colors.text.light,
  },
  buttonTextDestructive: {
    color: '#0F022D',
  },
  buttonTextCancel: {
    color: colors.text.dark,
  },
});
