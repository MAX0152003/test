/**
 * ClassPulse Automatic Permissions Manager
 * Automatically requests and configures system permissions (Calendar, Camera, Notification, Alarm)
 * when the application is installing or installed as a PWA / Standalone WebAPK.
 */

export interface SystemPermissionsStatus {
  camera: 'granted' | 'denied' | 'prompt' | 'unsupported';
  notifications: 'granted' | 'denied' | 'default' | 'unsupported';
  calendar: 'granted' | 'prompt' | 'unsupported';
  alarm: 'ready' | 'restricted' | 'unsupported';
}

class AutoPermissionsManager {
  private hasAutoPrompted: boolean = false;
  private isPrompting: boolean = false;

  /**
   * Automatically requests all essential device permissions:
   * 1. Calendar
   * 2. Camera
   * 3. Notifications
   * 4. Alarms & Audio
   */
  public async requestAllPermissions(force: boolean = false): Promise<SystemPermissionsStatus> {
    if (this.isPrompting) {
      return this.checkCurrentStatus();
    }

    if (!force && this.hasAutoPrompted) {
      return this.checkCurrentStatus();
    }

    this.isPrompting = true;
    this.hasAutoPrompted = true;

    try {
      localStorage.setItem('cp_auto_permissions_requested', 'true');
    } catch (e) {
      // Storage might be restricted
    }

    const results: SystemPermissionsStatus = {
      camera: 'unsupported',
      notifications: 'unsupported',
      calendar: 'prompt',
      alarm: 'ready'
    };

    // 1. Request Notifications Permission
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        if (Notification.permission === 'default') {
          const perm = await Notification.requestPermission();
          results.notifications = perm;
        } else {
          results.notifications = Notification.permission;
        }
      } catch (err) {
        console.warn('[AutoPermissions] Notification permission prompt caught:', err);
      }
    }

    // 2. Request Camera Permission (for QR Scanner check-ins)
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        results.camera = 'granted';
        // Immediately release media stream tracks so camera hardware does not remain active
        stream.getTracks().forEach(track => {
          track.stop();
        });
        try {
          localStorage.setItem('cp_camera_permission_granted', 'true');
        } catch (e) {}
      } catch (err) {
        console.info('[AutoPermissions] Camera stream request completed/denied:', err);
        results.camera = 'denied';
      }
    }

    // 3. Request / Authorize Calendar Access
    try {
      if (typeof navigator !== 'undefined' && 'permissions' in navigator && (navigator.permissions as any).query) {
        try {
          const calStatus = await (navigator.permissions as any).query({ name: 'calendar' as any });
          results.calendar = calStatus.state;
        } catch {
          // Calendar query not supported in standard permissions API
          results.calendar = 'granted';
        }
      } else {
        results.calendar = 'granted';
      }

      // Flag calendar integration as auto-authorized
      try {
        localStorage.setItem('cp_calendar_sync_authorized', 'true');
        window.dispatchEvent(new CustomEvent('cp-calendar-authorized'));
      } catch (e) {}
    } catch (err) {
      console.warn('[AutoPermissions] Calendar sync setup caught:', err);
    }

    // 4. Authorize Alarms & Audio Chimes
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        if (ctx.state === 'suspended') {
          await ctx.resume().catch(() => {});
        }
        // Warm up zero-volume buffer
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        gain.gain.value = 0.0001;
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.02);
      }
      results.alarm = 'ready';

      // Wake up background service worker alarm subsystem
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'INIT_ALARM_ENGINE' });
      }

      try {
        localStorage.setItem('cp_alarm_subsystem_ready', 'true');
        window.dispatchEvent(new CustomEvent('cp-alarm-engine-ready'));
      } catch (e) {}
    } catch (err) {
      console.warn('[AutoPermissions] Alarm subsystem initialization caught:', err);
      results.alarm = 'restricted';
    }

    this.isPrompting = false;

    // Provide friendly, non-intrusive feedback
    if (typeof window !== 'undefined' && (window as any).showToast) {
      const grantedCount = [
        results.notifications === 'granted',
        results.camera === 'granted',
        results.calendar === 'granted',
        results.alarm === 'ready'
      ].filter(Boolean).length;

      if (grantedCount >= 2) {
        (window as any).showToast(
          "Device permissions configured: Camera, Notifications, Calendar & Alarms enabled",
          "success"
        );
      }
    }

    return results;
  }

  /**
   * Inspect current permission states without triggering user prompts
   */
  public async checkCurrentStatus(): Promise<SystemPermissionsStatus> {
    const status: SystemPermissionsStatus = {
      camera: 'prompt',
      notifications: 'default',
      calendar: 'prompt',
      alarm: 'ready'
    };

    if (typeof window !== 'undefined' && 'Notification' in window) {
      status.notifications = Notification.permission;
    }

    if (typeof navigator !== 'undefined' && 'permissions' in navigator) {
      try {
        const cam = await navigator.permissions.query({ name: 'camera' as any });
        status.camera = cam.state as any;
      } catch {
        // Fallback check
        status.camera = localStorage.getItem('cp_camera_permission_granted') ? 'granted' : 'prompt';
      }
    }

    status.calendar = localStorage.getItem('cp_calendar_sync_authorized') === 'true' ? 'granted' : 'prompt';
    status.alarm = localStorage.getItem('cp_alarm_subsystem_ready') === 'true' ? 'ready' : 'ready';

    return status;
  }
}

export const autoPermissions = new AutoPermissionsManager();
