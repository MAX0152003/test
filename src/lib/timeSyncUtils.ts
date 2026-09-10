/**
 * University Network Time & Clock Synchronization Utilities
 * Prevents client-side synthetic clock drift, manual device clock tampering, 
 * and timezone desynchronization during QR attendance verification.
 */

let serverOffsetMs = 0;
let isSynchronized = false;
let lastSyncTimestamp = 0;

/**
 * Synchronize local client clock against the authoritative server time
 * using standard HTTP response Date headers with round-trip latency compensation.
 */
export async function syncServerTime(): Promise<number> {
  if (typeof window === 'undefined') return 0;
  
  try {
    const startTime = Date.now();
    // Use lightweight cache-busted HEAD request to origin
    const response = await fetch(`${window.location.origin}/?_ts=${Date.now()}`, {
      method: 'HEAD',
      cache: 'no-store'
    });
    const endTime = Date.now();

    const serverDateHeader = response.headers.get('date');
    if (serverDateHeader) {
      const serverTimeMs = new Date(serverDateHeader).getTime();
      const roundTripMs = endTime - startTime;
      // Compensate for half of round-trip network transmission latency
      const estimatedServerNow = serverTimeMs + Math.round(roundTripMs / 2);
      serverOffsetMs = estimatedServerNow - endTime;
      isSynchronized = true;
      lastSyncTimestamp = Date.now();

      if (Math.abs(serverOffsetMs) > 60000) {
        console.warn(
          `[ClassPulse TimeSync] Detected clock drift of ${Math.round(serverOffsetMs / 1000)}s on client device. Automatic compensation active.`
        );
      }
    }
  } catch (err) {
    // Non-fatal; if offline or blocked, fallback to local clock
    console.info('[ClassPulse TimeSync] Offline or network restricted. Using local hardware clock.');
  }

  return serverOffsetMs;
}

/**
 * Returns a new Date object adjusted for university server offset.
 */
export function getSynchronizedDate(): Date {
  return new Date(Date.now() + serverOffsetMs);
}

/**
 * Returns an ISO timestamp adjusted for university server offset.
 */
export function getSynchronizedTimestamp(): string {
  return getSynchronizedDate().toISOString();
}

/**
 * Returns current clock offset in milliseconds.
 */
export function getClockOffsetMs(): number {
  return serverOffsetMs;
}

/**
 * Returns whether clock drift exceeds 60 seconds.
 */
export function hasSevereClockDrift(): boolean {
  return Math.abs(serverOffsetMs) > 60000;
}

/**
 * Returns true if server time has been successfully synchronized at least once.
 */
export function isServerTimeSynchronized(): boolean {
  return isSynchronized;
}

// Initial background sync after app hydration
if (typeof window !== 'undefined') {
  setTimeout(() => {
    syncServerTime();
  }, 1000);

  // Periodic resynchronization every 10 minutes
  setInterval(() => {
    if (Date.now() - lastSyncTimestamp > 600000) {
      syncServerTime();
    }
  }, 600000);
}
