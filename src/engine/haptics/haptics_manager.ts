/**
 * Kinetic Vault - Mobile Haptics Manager
 * Wraps @capacitor/haptics with native performance and graceful web vibration fallbacks.
 */

import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

export class HapticsManager {
  private enabled: boolean = true;
  private hasNativeHaptics: boolean = false;

  constructor() {
    this.checkCapability();
  }

  private async checkCapability(): Promise<void> {
    try {
      // Test if Capacitor Haptics is available in native environment
      this.hasNativeHaptics = typeof (window as unknown as { Capacitor?: unknown }).Capacitor !== 'undefined';
    } catch {
      this.hasNativeHaptics = false;
    }
  }

  public setEnabled(enable: boolean): void {
    this.enabled = enable;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Crisp micro-impulse for dial detents and ratchet teeth
   */
  public async tick(): Promise<void> {
    if (!this.enabled) return;
    try {
      if (this.hasNativeHaptics) {
        await Haptics.impact({ style: ImpactStyle.Light });
      } else if (navigator.vibrate) {
        navigator.vibrate(8);
      }
    } catch {
      // Ignore vibration error
    }
  }

  /**
   * Medium impact for latch snaps and slider slot locks
   */
  public async latch(): Promise<void> {
    if (!this.enabled) return;
    try {
      if (this.hasNativeHaptics) {
        await Haptics.impact({ style: ImpactStyle.Medium });
      } else if (navigator.vibrate) {
        navigator.vibrate(22);
      }
    } catch {
      // Ignore vibration error
    }
  }

  /**
   * Heavy impact for vault doors opening, secret compartments popping
   */
  public async heavyImpact(): Promise<void> {
    if (!this.enabled) return;
    try {
      if (this.hasNativeHaptics) {
        await Haptics.impact({ style: ImpactStyle.Heavy });
      } else if (navigator.vibrate) {
        navigator.vibrate(45);
      }
    } catch {
      // Ignore vibration error
    }
  }

  /**
   * Triple celebratory pulse sequence on puzzle solve
   */
  public async success(): Promise<void> {
    if (!this.enabled) return;
    try {
      if (this.hasNativeHaptics) {
        await Haptics.notification({ type: NotificationType.Success });
      } else if (navigator.vibrate) {
        navigator.vibrate([25, 40, 25, 40, 60]);
      }
    } catch {
      // Ignore vibration error
    }
  }

  /**
   * Warning double-buzz for blocked/locked mechanism
   */
  public async warning(): Promise<void> {
    if (!this.enabled) return;
    try {
      if (this.hasNativeHaptics) {
        await Haptics.notification({ type: NotificationType.Warning });
      } else if (navigator.vibrate) {
        navigator.vibrate([40, 60, 40]);
      }
    } catch {
      // Ignore vibration error
    }
  }
}

export const haptics = new HapticsManager();
