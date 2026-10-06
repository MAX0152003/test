/**
 * ClassPulse 2.0 Native Mobile Bridge
 * Bridges Capacitor Native APIs (Android & iOS) with the React application.
 * Automatically activates on Android / iOS devices while providing seamless web fallbacks.
 */

import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Keyboard } from '@capacitor/keyboard';

export const isNativeMobile = Capacitor.isNativePlatform();
export const nativePlatform = Capacitor.getPlatform(); // 'android' | 'ios' | 'web'

export class NativeBridgeManager {
  private static initialized = false;

  /**
   * Initializes native mobile environment, status bars, and hardware event listeners.
   */
  public static async init(onHardwareBack?: () => boolean): Promise<void> {
    if (this.initialized || !isNativeMobile) return;
    this.initialized = true;

    try {
      // 1. Configure Native Status Bar
      await StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
      if (nativePlatform === 'android') {
        await StatusBar.setBackgroundColor({ color: '#09090b' }).catch(() => {});
        await StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
      }

      // 2. Hardware Android Back Button Listener
      CapApp.addListener('backButton', ({ canGoBack }) => {
        if (onHardwareBack) {
          const handled = onHardwareBack();
          if (handled) return;
        }

        if (canGoBack) {
          window.history.back();
        } else {
          // Exit or minimize app
          CapApp.minimizeApp().catch(() => {});
        }
      });

      // 3. Native Keyboard Behavior
      Keyboard.addListener('keyboardWillShow', info => {
        window.dispatchEvent(new CustomEvent('native-keyboard-show', { detail: info }));
      });
      Keyboard.addListener('keyboardWillHide', () => {
        window.dispatchEvent(new CustomEvent('native-keyboard-hide'));
      });

      // 4. Native App Lifecycle
      CapApp.addListener('appStateChange', state => {
        if (state.isActive) {
          window.dispatchEvent(new Event('native-app-resumed'));
        }
      });

      console.info(`[NativeBridge] Initialized ClassPulse 2.0 on native ${nativePlatform}.`);
    } catch (err) {
      console.warn('[NativeBridge] Setup warning:', err);
    }
  }

  /**
   * Triggers native tactile haptic feedback for button clicks and actions
   */
  public static async triggerHaptic(style: 'light' | 'medium' | 'heavy' = 'light'): Promise<void> {
    if (!isNativeMobile) {
      // Web vibration fallback
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(style === 'heavy' ? 40 : style === 'medium' ? 25 : 15);
      }
      return;
    }

    try {
      const impStyle = style === 'heavy' 
        ? ImpactStyle.Heavy 
        : style === 'medium' 
          ? ImpactStyle.Medium 
          : ImpactStyle.Light;
      await Haptics.impact({ style: impStyle });
    } catch {
      // Haptics not available
    }
  }

  /**
   * Triggers native success/warning/error haptic feedback (e.g. on QR code match)
   */
  public static async triggerNotificationHaptic(type: 'success' | 'warning' | 'error' = 'success'): Promise<void> {
    if (!isNativeMobile) {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(type === 'error' ? [50, 50, 50] : [20, 20]);
      }
      return;
    }

    try {
      const notifType = type === 'error' 
        ? NotificationType.Error 
        : type === 'warning' 
          ? NotificationType.Warning 
          : NotificationType.Success;
      await Haptics.notification({ type: notifType });
    } catch {
      // Haptics not available
    }
  }

  /**
   * Updates native status bar theme dynamically
   */
  public static async updateStatusBarTheme(isDark: boolean): Promise<void> {
    if (!isNativeMobile) return;
    try {
      await StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light }).catch(() => {});
      if (nativePlatform === 'android') {
        await StatusBar.setBackgroundColor({ color: isDark ? '#09090b' : '#ffffff' }).catch(() => {});
      }
    } catch {}
  }
}
