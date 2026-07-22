'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  getEffectiveIntervalMs,
  getGlobalPollingMode,
  logPollingEvent,
  MVP_POLLING_MAP,
  PollingMode,
} from '@/lib/shared-polling-config';

export interface UseSmartPollingOptions {
  appId: string;
  fetchFn: () => Promise<boolean | void | any>; // Return true nếu có data mới, false nếu không có data mới
  enabled?: boolean;
  overrideIntervalMs?: number;
}

export function useSmartPolling({
  appId,
  fetchFn,
  enabled = true,
  overrideIntervalMs,
}: UseSmartPollingOptions) {
  const [isTabVisible, setIsTabVisible] = useState<boolean>(true);
  const [currentMode, setCurrentMode] = useState<PollingMode>('normal');
  const [backoffMultiplier, setBackoffMultiplier] = useState<number>(1);
  const [totalPollsCount, setTotalPollsCount] = useState<number>(0);
  const [savedPollsCount, setSavedPollsCount] = useState<number>(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fetchFnRef = useRef(fetchFn);

  useEffect(() => {
    fetchFnRef.current = fetchFn;
  }, [fetchFn]);

  // Sync visibility state
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState === 'visible';
      setIsTabVisible(isVisible);
      if (isVisible) {
        // Khi quay lại tab, reset backoff và poll ngay lập tức
        setBackoffMultiplier(1);
      }
    };

    setIsTabVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Listen to Global Polling Mode changes from Super Admin / Settings
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleModeChange = () => {
      setCurrentMode(getGlobalPollingMode());
    };

    setCurrentMode(getGlobalPollingMode());
    window.addEventListener('polling-mode-changed', handleModeChange);
    return () => {
      window.removeEventListener('polling-mode-changed', handleModeChange);
    };
  }, []);

  // Core Execution Loop
  const executePoll = useCallback(async () => {
    if (!enabled) return;

    // RULE 1: DỪNG 100% khi Tab bị Ẩn / Background
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
      logPollingEvent(appId, true);
      setSavedPollsCount((prev) => prev + 1);
      return;
    }

    try {
      logPollingEvent(appId, false);
      setTotalPollsCount((prev) => prev + 1);
      
      const hasNewData = await fetchFnRef.current();

      // RULE 2: Exponential Backoff nếu 3 lần liên tiếp không có dữ liệu mới
      if (hasNewData === false) {
        setBackoffMultiplier((prev) => Math.min(prev * 1.5, MVP_POLLING_MAP[appId]?.maxBackoffMultiplier || 4));
      } else {
        setBackoffMultiplier(1);
      }
    } catch (error) {
      console.error(`[SmartPolling:${appId}] Error during poll execution:`, error);
      setBackoffMultiplier((prev) => Math.min(prev * 2, 4));
    }
  }, [appId, enabled]);

  // Schedule next iteration
  useEffect(() => {
    if (!enabled) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    const intervalMs = overrideIntervalMs || getEffectiveIntervalMs(appId, backoffMultiplier);

    const scheduleNext = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(async () => {
        await executePoll();
        scheduleNext();
      }, intervalMs);
    };

    scheduleNext();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [appId, enabled, backoffMultiplier, currentMode, isTabVisible, overrideIntervalMs, executePoll]);

  return {
    isTabVisible,
    currentMode,
    backoffMultiplier,
    totalPollsCount,
    savedPollsCount,
    triggerNow: executePoll,
  };
}
