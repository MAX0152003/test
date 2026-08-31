/**
 * ClassPulse Offline Attendance Scan Buffer Engine
 * Stores attendance check-in records in IndexedDB when network connectivity is lost
 * and automatically drains & commits them to Firestore once connectivity is restored.
 */

import { idbStorage } from './idbStorage';
import { AttendanceRecord } from '../types';
import { saveAttendanceToFirestore } from './firestoreSync';

const BUFFER_STORAGE_KEY = 'classpulse_offline_attendance_buffer';

export interface BufferedAttendanceItem {
  id: string;
  record: AttendanceRecord;
  scannedAt: number;
  attempts: number;
}

class OfflineAttendanceBufferManager {
  private isFlushing = false;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('[OfflineBuffer] Network connectivity restored. Flushing scan buffer...');
        this.flushBuffer();
      });
    }
  }

  /**
   * Get all currently buffered attendance items from IndexedDB
   */
  public async getBufferedItems(): Promise<BufferedAttendanceItem[]> {
    try {
      const items = await idbStorage.get<BufferedAttendanceItem[]>(BUFFER_STORAGE_KEY);
      return Array.isArray(items) ? items : [];
    } catch (e) {
      console.warn('[OfflineBuffer] Failed to read buffer:', e);
      return [];
    }
  }

  /**
   * Buffer an attendance record locally when offline
   */
  public async bufferRecord(record: AttendanceRecord): Promise<void> {
    try {
      const current = await this.getBufferedItems();
      // Deduplicate by record ID or studentId + classId + date
      const exists = current.some(
        item => item.record.id === record.id || 
        (item.record.studentId === record.studentId && item.record.classId === record.classId && item.record.date === record.date)
      );

      if (!exists) {
        current.push({
          id: record.id || `buf-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          record,
          scannedAt: Date.now(),
          attempts: 0
        });
        await idbStorage.set(BUFFER_STORAGE_KEY, current);
        console.log(`[OfflineBuffer] Stored offline scan for ${record.studentName} in ${record.className}`);
      }
    } catch (e) {
      console.warn('[OfflineBuffer] Error saving record to offline buffer:', e);
    }
  }

  /**
   * Drain and commit all buffered records to Firestore
   */
  public async flushBuffer(onSuccessCallback?: (count: number) => void): Promise<number> {
    if (this.isFlushing || typeof navigator !== 'undefined' && !navigator.onLine) {
      return 0;
    }

    this.isFlushing = true;
    let syncedCount = 0;

    try {
      const items = await this.getBufferedItems();
      if (items.length === 0) {
        this.isFlushing = false;
        return 0;
      }

      console.log(`[OfflineBuffer] Processing ${items.length} buffered attendance scans...`);
      const remainingItems: BufferedAttendanceItem[] = [];

      for (const item of items) {
        try {
          await saveAttendanceToFirestore(false, item.record);
          syncedCount++;
        } catch (err) {
          console.warn(`[OfflineBuffer] Failed to sync buffered scan ${item.id}:`, err);
          item.attempts++;
          if (item.attempts < 5) {
            remainingItems.push(item);
          }
        }
      }

      await idbStorage.set(BUFFER_STORAGE_KEY, remainingItems);

      if (syncedCount > 0) {
        const msg = `⚡ Offline Sync: Successfully committed ${syncedCount} queued attendance scan(s) to cloud database!`;
        console.log(msg);
        if (typeof window !== 'undefined' && (window as any).showToast) {
          (window as any).showToast(msg, 'success');
        }
        if (onSuccessCallback) {
          onSuccessCallback(syncedCount);
        }
      }
    } catch (err) {
      console.warn('[OfflineBuffer] Error during buffer flush:', err);
    } finally {
      this.isFlushing = false;
    }

    return syncedCount;
  }

  /**
   * Get buffer count
   */
  public async getPendingCount(): Promise<number> {
    const items = await this.getBufferedItems();
    return items.length;
  }

  /**
   * Clear all buffered items
   */
  public async clearBuffer(): Promise<void> {
    await idbStorage.delete(BUFFER_STORAGE_KEY);
  }
}

export const offlineAttendanceBuffer = new OfflineAttendanceBufferManager();
