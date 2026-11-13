import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Share } from '@capacitor/share';

const PROD_API_ORIGIN = 'https://halalscroll-production.up.railway.app';

export function isNativeApp(): boolean {
  try {
    return typeof window !== 'undefined' && Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export function apiUrl(path: string): string {
  if (!path.startsWith('/')) return path;
  return isNativeApp() ? `${PROD_API_ORIGIN}${path}` : path;
}

export async function initNativeShell(theme: string) {
  if (!isNativeApp()) return;
  try {
    const isLight = theme === 'andalusian_parchment';
    await StatusBar.setStyle({ style: isLight ? Style.Light : Style.Dark });
  } catch { }
  try {
    await SplashScreen.hide();
  } catch { }
}

export function triggerNativeHaptic(type: 'lightImpact' | 'selectionTick' | 'softSuccess') {
  if (!isNativeApp()) return;
  try {
    if (type === 'selectionTick') {
      Haptics.selectionStart().then(() => Haptics.selectionChanged()).catch(() => {});
    } else if (type === 'lightImpact') {
      Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
    } else if (type === 'softSuccess') {
      Haptics.notification({ type: NotificationType.Success }).catch(() => {});
    }
  } catch { }
}

export async function shareNative(options: { title: string; text: string; url?: string }): Promise<boolean> {
  if (!isNativeApp()) return false;
  try {
    await Share.share(options);
    return true;
  } catch {
    return false;
  }
}
