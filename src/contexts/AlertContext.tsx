import React, { createContext, ReactNode, useCallback, useContext, useState } from 'react';

import { AlertButton, AlertConfig, CustomAlert } from '@/src/components/CustomAlert';

type ShowAlertFn = (title: string, message?: string, buttons?: AlertButton[]) => void;

const AlertContext = createContext<ShowAlertFn | undefined>(undefined);

export function AlertProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AlertConfig | null>(null);
  const [visible, setVisible] = useState(false);

  const showAlert = useCallback<ShowAlertFn>((title, message, buttons) => {
    setConfig({ title, message, buttons });
    setVisible(true);
  }, []);

  const onDismiss = useCallback(() => {
    setVisible(false);
    // Mantem o config durante o fade-out (200ms da animacao default do Modal).
    setTimeout(() => setConfig(null), 200);
  }, []);

  return (
    <AlertContext.Provider value={showAlert}>
      {children}
      <CustomAlert visible={visible} config={config} onDismiss={onDismiss} />
    </AlertContext.Provider>
  );
}

export function useAlert(): ShowAlertFn {
  const ctx = useContext(AlertContext);
  if (!ctx) throw new Error('useAlert must be used within an AlertProvider');
  return ctx;
}
