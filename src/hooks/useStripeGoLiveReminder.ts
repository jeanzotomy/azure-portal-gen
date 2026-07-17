import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "stripe-go-live-reminder";

export type ReminderFrequency = "1d" | "3d" | "7d";

export interface ReminderState {
  snoozedUntil: number | null;
  frequency: ReminderFrequency;
}

export function useStripeGoLiveReminder() {
  const [reminder, setReminder] = useState<ReminderState>({
    snoozedUntil: null,
    frequency: "1d",
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ReminderState;
        setReminder(parsed);
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  const save = useCallback((next: ReminderState) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setReminder(next);
  }, []);

  const snooze = useCallback((frequency: ReminderFrequency) => {
    const ms: Record<ReminderFrequency, number> = {
      "1d": 24 * 60 * 60 * 1000,
      "3d": 3 * 24 * 60 * 60 * 1000,
      "7d": 7 * 24 * 60 * 60 * 1000,
    };
    save({ snoozedUntil: Date.now() + ms[frequency], frequency });
  }, [save]);

  const reset = useCallback(() => {
    save({ snoozedUntil: null, frequency: "1d" });
  }, [save]);

  const isDue = reminder.snoozedUntil === null || Date.now() >= reminder.snoozedUntil;

  return { reminder, snooze, reset, isDue };
}

export function getStripeMode(): "test" | "live" | "missing" {
  const token = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;
  if (!token) return "missing";
  if (token.startsWith("pk_test_")) return "test";
  if (token.startsWith("pk_live_")) return "live";
  return "missing";
}
