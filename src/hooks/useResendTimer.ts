import { useCallback, useEffect, useRef, useState } from 'react';

// Cooldown de reenvio de codigos de verificacao, compartilhado por todos
// os fluxos (signup, recuperacao de senha, settings). Regras:
//   - 60s de espera entre envios;
//   - apos 3 envios, o tempo escala (dobrando) para coibir spam de
//     requisicoes, com teto de 10min.
// O contador de tentativas inclui o envio inicial de cada fluxo.
export const RESEND_BASE_COOLDOWN = 60;
const ESCALATE_AFTER = 3;
const MAX_COOLDOWN = 600;

// Quanto esperar depois do N-esimo envio antes de liberar o proximo.
// 1..3 -> 60s; 4 -> 120s; 5 -> 240s; 6 -> 480s; 7+ -> 600s (teto).
export function resendCooldownSeconds(attempts: number): number {
  if (attempts <= ESCALATE_AFTER) return RESEND_BASE_COOLDOWN;
  const factor = attempts - ESCALATE_AFTER;
  return Math.min(RESEND_BASE_COOLDOWN * 2 ** factor, MAX_COOLDOWN);
}

// Formata os segundos restantes como m:ss (ex.: 65 -> "1:05", 45 -> "0:45").
export function formatResendCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export type ResendTimer = {
  secondsLeft: number;
  canResend: boolean;
  attempts: number;
  // Registra um envio e inicia/reinicia o cooldown correspondente.
  start: () => void;
  // Zera tentativas e cooldown - chamar ao abrir/fechar o fluxo.
  reset: () => void;
};

export function useResendTimer(): ResendTimer {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const attemptsRef = useRef(0);

  const start = useCallback(() => {
    attemptsRef.current += 1;
    setAttempts(attemptsRef.current);
    setSecondsLeft(resendCooldownSeconds(attemptsRef.current));
  }, []);

  const reset = useCallback(() => {
    attemptsRef.current = 0;
    setAttempts(0);
    setSecondsLeft(0);
  }, []);

  // Um unico interval roda enquanto ha tempo restante. A dependencia eh o
  // booleano "esta contando" - so re-cria o interval quando cruza 0, nao a
  // cada decremento.
  const isCounting = secondsLeft > 0;
  useEffect(() => {
    if (!isCounting) return;
    const id = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [isCounting]);

  return { secondsLeft, canResend: secondsLeft <= 0, attempts, start, reset };
}
