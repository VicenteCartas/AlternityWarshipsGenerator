import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook for async data loading with cancellation and imperative refresh support.
 * Encapsulates the common pattern of fetching data in useEffect with loading state,
 * eliminating the need for `react-hooks/set-state-in-effect` suppressions in consumers.
 *
 * @param fetcher - Async function that returns the data. Should be stable (wrapped in useCallback).
 * @param deps - Dependencies that trigger a re-fetch when changed.
 * @param options.enabled - When false, skips fetching and resets loading to false. Default: true.
 */
export function useAsyncData<T>(
  fetcher: () => Promise<T>,
  deps: unknown[],
  options?: { enabled?: boolean },
): {
  data: T | undefined;
  loading: boolean;
  /** Imperatively re-fetch. Returns the fresh data. */
  refresh: () => Promise<T>;
  /** Directly set data for optimistic updates. */
  setData: React.Dispatch<React.SetStateAction<T | undefined>>;
} {
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const enabled = options?.enabled ?? true;

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetcherRef.current().then(result => {
      if (!cancelled) {
        setData(result);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);

  const refresh = useCallback(async () => {
    setLoading(true);
    const result = await fetcherRef.current();
    setData(result);
    setLoading(false);
    return result;
  }, []);

  return { data, loading, refresh, setData };
}
