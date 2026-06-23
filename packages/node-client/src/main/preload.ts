import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Hardware detection
  detectHardware: () => ipcRenderer.invoke('hardware:detect'),
  checkHardwareRequirements: () => ipcRenderer.invoke('hardware:checkRequirements'),
  
  // Model management
  listModels: () => ipcRenderer.invoke('model:list'),
  downloadModel: (modelId: string) => ipcRenderer.invoke('model:download', modelId),
  deleteModel: (modelId: string) => ipcRenderer.invoke('model:delete', modelId),
  getModelStatus: (modelId: string) => ipcRenderer.invoke('model:getStatus', modelId),
  onModelDownloadProgress: (callback: (data: { modelId: string; progress: number }) => void) => {
    ipcRenderer.on('model:download-progress', (_event, data) => callback(data));
  },
  
  // Blockchain
  connectWallet: (walletAddress: string) => ipcRenderer.invoke('blockchain:connect', walletAddress),
  getBalance: (address: string) => ipcRenderer.invoke('blockchain:getBalance', address),
  registerNode: (hardwareInfo: unknown) => ipcRenderer.invoke('blockchain:registerNode', hardwareInfo),
  stake: (amount: string) => ipcRenderer.invoke('blockchain:stake', amount),
  
  // Auto-update
  checkForUpdates: () => ipcRenderer.invoke('update:check'),
  downloadUpdate: () => ipcRenderer.invoke('update:download'),
  installUpdate: () => ipcRenderer.invoke('update:install'),
  onUpdateStatus: (callback: (data: unknown) => void) => {
    ipcRenderer.on('update-status', (_event, data) => callback(data));
  },
  
  // App info
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  getPlatform: () => ipcRenderer.invoke('app:getPlatform'),
});