import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

type Currency = "GNF" | "USD" | "EUR";

interface RatesPayload {
  base: Currency;
  timestamp: number;
  rates: Record<Currency, number | null>;
}

// Cache mémoire (1h) pour éviter d'appeler à chaque ouverture de formulaire
let cache: { fetchedAt: number; data: RatesPayload } | null = null;
const TTL = 60 * 60 * 1000;

// Taux de secours si l'API est inaccessible (estimation Avril 2026)
const FALLBACK: RatesPayload = {
  base: "USD",
  timestamp: 0,
  rates: { USD: 1, EUR: 0.92, GNF: 8600 },
};

/** Hook qui récupère les taux de change USD->{USD,EUR,GNF} via edge function. */
export function useExchangeRates() {
  const [rates, setRates] = useState<RatesPayload | null>(cache?.data ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchingRef = useRef(false);

  const refresh = useCallback(async (force = false) => {
    if (fetchingRef.current) return;
    if (!force && cache && Date.now() - cache.fetchedAt < TTL) {
      setRates(cache.data);
      return;
    }
    fetchingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase.functions.invoke<RatesPayload>(
        "exchange-rates",
        { body: {} }
      );
      if (err || !data?.rates) throw new Error(err?.message ?? "Pas de données");
      cache = { fetchedAt: Date.now(), data };
      setRates(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur taux");
      setRates(FALLBACK);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    void refresh(false);
  }, [refresh]);

  /**
   * Convertit un montant d'une devise vers une autre.
   * Tous les taux sont exprimés en base USD.
   */
  const convert = useCallback(
    (amount: number, from: Currency, to: Currency): number => {
      if (from === to || !amount) return amount;
      const r = rates?.rates ?? FALLBACK.rates;
      const usdRateFrom = r[from]; // combien de "from" pour 1 USD
      const usdRateTo = r[to];
      if (!usdRateFrom || !usdRateTo) return amount;
      const inUsd = amount / usdRateFrom;
      return inUsd * usdRateTo;
    },
    [rates]
  );

  return { rates, loading, error, refresh, convert };
}

export type { Currency };
