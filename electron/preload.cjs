/**
 * Antiqora AI Electron Preload Script
 * Exposes a strictly sandboxed, context-isolated bridge API to the renderer.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('antiqoraDesktop', {
  isElectron: true,
  getSystemInfo: () => ipcRenderer.invoke('antiqora:get-system-info'),
  openApplication: (appName) => ipcRenderer.invoke('antiqora:open-app', appName),
  openFolder: (folderPath) => ipcRenderer.invoke('antiqora:open-folder', folderPath),
  openUrl: (url) => ipcRenderer.invoke('antiqora:open-url', url),
  captureScreen: () => ipcRenderer.invoke('antiqora:capture-screen'),
  readFile: (filePath) => ipcRenderer.invoke('antiqora:read-file', filePath),
  saveFile: (filePath, content) => ipcRenderer.invoke('antiqora:save-file', { filePath, content }),
  listDirectory: (dirPath) => ipcRenderer.invoke('antiqora:list-dir', dirPath),
});
