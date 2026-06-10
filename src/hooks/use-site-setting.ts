import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const cache = new Map<string, any>();
const listeners = new Map<string, Set<(v: any) => void>>();

function emit(key: string, value: any) {
  cache.set(key, value);
  listeners.get(key)?.forEach((fn) => fn(value));
}

export function useSiteSetting<T = unknown>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => (cache.has(key) ? (cache.get(key) as T) : fallback));
  const [loading, setLoading] = useState(!cache.has(key));

  useEffect(() => {
    let active = true;
    if (!listeners.has(key)) listeners.set(key, new Set());
    const set = listeners.get(key)!;
    const fn = (v: any) => active && setValue(v as T);
    set.add(fn);

    (async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", key)
        .maybeSingle();
      if (!active) return;
      const v = (data?.value ?? fallback) as T;
      emit(key, v);
      setLoading(false);
    })();

    return () => {
      set.delete(fn);
      active = false;
    };
  }, [key]);

  const update = useCallback(async (next: T) => {
    const { error } = await supabase
      .from("site_settings")
      .upsert({ key, value: next as any }, { onConflict: "key" });
    if (error) throw error;
    emit(key, next);
  }, [key]);

  return { value, loading, update };
}
