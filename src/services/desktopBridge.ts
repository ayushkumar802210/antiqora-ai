/**
 * Antiqora AI Desktop Bridge
 * Seamless abstraction supporting native Electron IPC or Web Browser REST API fallbacks.
 */

import { SystemStatus } from '../types';

export const isDesktopApp = (): boolean => {
  return typeof window !== 'undefined' && Boolean(window.antiqoraDesktop?.isElectron);
};

export const desktopBridge = {
  isElectron: isDesktopApp(),

  async getSystemStatus(): Promise<SystemStatus> {
    if (window.antiqoraDesktop) {
      return await window.antiqoraDesktop.getSystemInfo();
    }
    const res = await fetch('/api/system/status');
    const json = await res.json();
    return json.data;
  },

  async openApplication(appName: string): Promise<{ success: boolean; message: string }> {
    if (window.antiqoraDesktop) {
      return await window.antiqoraDesktop.openApplication(appName);
    }
    const res = await fetch('/api/tools/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        toolId: 'open_application',
        arguments: { applicationName: appName },
        confirmed: true,
      }),
    });
    const json = await res.json();
    return json.data || { success: false, message: 'Server error' };
  },

  async openFolder(folderPath: string): Promise<{ success: boolean; message: string }> {
    if (window.antiqoraDesktop) {
      return await window.antiqoraDesktop.openFolder(folderPath);
    }
    const res = await fetch('/api/tools/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        toolId: 'open_folder',
        arguments: { folderPath },
        confirmed: true,
      }),
    });
    const json = await res.json();
    return json.data || { success: false, message: 'Server error' };
  },

  async openUrl(url: string): Promise<{ success: boolean; message: string }> {
    if (window.antiqoraDesktop) {
      return await window.antiqoraDesktop.openUrl(url);
    }
    window.open(url, '_blank', 'noopener,noreferrer');
    return { success: true, message: `Opened URL in browser: ${url}` };
  },

  async captureScreen(): Promise<{ success: boolean; dataUrl?: string; error?: string }> {
    // If running in native Electron desktop
    if (window.antiqoraDesktop) {
      return await window.antiqoraDesktop.captureScreen();
    }

    // In web browser mode: use standard navigator.mediaDevices.getDisplayMedia
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        return { success: false, error: 'Screen capture is not supported by this browser.' };
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'monitor' },
      });

      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1920;
      canvas.height = video.videoHeight || 1080;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }

      // Stop all tracks immediately after grabbing frame
      stream.getTracks().forEach((t) => t.stop());

      const dataUrl = canvas.toDataURL('image/png');
      return { success: true, dataUrl };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'User cancelled or screen permission denied.';
      return { success: false, error: errorMsg };
    }
  },
};
