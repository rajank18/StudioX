import { useEffect, useRef, useState } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export function useReelCutterJob(jobId) {
  const [job, setJob] = useState(null);
  const [connectionState, setConnectionState] = useState('idle');
  const reconnectCountRef = useRef(0);
  const pollTimerRef = useRef(null);

  useEffect(() => {
    if (!jobId) {
      setJob(null);
      setConnectionState('idle');
      return undefined;
    }

    let active = true;
    let eventSource;

    const clearPoll = () => {
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };

    const pollStatus = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/reel-cutter/status/${jobId}`);
        if (!response.ok) throw new Error('Failed to poll reel cutter status');
        const data = await response.json();
        if (!active) return;

        setJob(data);

        if (data.done || data.status === 'completed' || data.status === 'failed') {
          setConnectionState('done');
          return;
        }

        pollTimerRef.current = setTimeout(pollStatus, 1500);
      } catch (_) {
        if (!active) return;
        pollTimerRef.current = setTimeout(pollStatus, 2500);
      }
    };

    const fallbackToPolling = () => {
      setConnectionState('polling');
      clearPoll();
      pollStatus();
    };

    const connectSse = () => {
      if (!active) return;

      setConnectionState('sse-connecting');
      eventSource = new EventSource(`${API_BASE_URL}/api/reel-cutter/progress/${jobId}`);

      eventSource.onopen = () => {
        reconnectCountRef.current = 0;
        setConnectionState('sse-open');
      };

      eventSource.onmessage = (event) => {
        if (!active || !event?.data) return;

        try {
          const payload = JSON.parse(event.data);
          setJob(payload);

          const done = payload?.done || payload?.status === 'completed' || payload?.status === 'failed';
          if (done) {
            setConnectionState('done');
            eventSource.close();
          }
        } catch (_) {
          // Ignore malformed events
        }
      };

      eventSource.onerror = () => {
        if (!active) return;
        eventSource.close();
        reconnectCountRef.current += 1;

        if (reconnectCountRef.current <= 3) {
          setConnectionState('sse-reconnecting');
          setTimeout(connectSse, 700 * reconnectCountRef.current);
          return;
        }

        fallbackToPolling();
      };
    };

    connectSse();

    return () => {
      active = false;
      clearPoll();
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [jobId]);

  return {
    job,
    connectionState,
  };
}
