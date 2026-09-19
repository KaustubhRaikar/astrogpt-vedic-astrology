import { useState, useEffect, useRef } from 'react';

interface UseChartPollingProps<T> {
  checkStatusFn: () => Promise<{ isReady: boolean; data?: T; error?: any }>;
  intervalMs?: number;
  maxAttempts?: number;
  onSuccess?: (data: T) => void;
  onFailure?: (error: any) => void;
}

export const useChartPolling = <T>({
  checkStatusFn,
  intervalMs = 3000,
  maxAttempts = 10,
  onSuccess,
  onFailure,
}: UseChartPollingProps<T>) => {
  const [isPolling, setIsPolling] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsPolling(false);
  };

  const startPolling = () => {
    stopPolling();
    setIsPolling(true);
    setAttempts(0);
  };

  useEffect(() => {
    if (!isPolling) return;

    timerRef.current = setInterval(async () => {
      setAttempts((prev) => {
        const next = prev + 1;
        if (next >= maxAttempts) {
          stopPolling();
          if (onFailure) onFailure(new Error('Generation request timed out.'));
          return prev;
        }
        return next;
      });

      try {
        const { isReady, data, error } = await checkStatusFn();
        if (error) {
          stopPolling();
          if (onFailure) onFailure(error);
        } else if (isReady && data) {
          stopPolling();
          if (onSuccess) onSuccess(data);
        }
      } catch (err) {
        stopPolling();
        if (onFailure) onFailure(err);
      }
    }, intervalMs);

    return () => stopPolling();
  }, [isPolling]);

  return {
    isPolling,
    attempts,
    startPolling,
    stopPolling,
  };
};

export default useChartPolling;
