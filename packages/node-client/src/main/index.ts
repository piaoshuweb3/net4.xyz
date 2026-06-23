import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import * as path from 'path';
import { HardwareDetector } from '../services/hardware-detector';
import { ModelManager } from '../services/model-manager';
import { BlockchainService } from '../services/blockchain-service';
import { NodeOnboardingService, NodeType, AIAvatarType } from '../services/node-onboarding';
import { MonitoringService, NodeMonitorStatus } from '../services/monitoring-service';
import { TaskExecutionService } from '../services/task-execution';

// Configure logging
log.transports.file.level = 'info';
log.transports.console.level = 'debug';
autoUpdater.logger = log;

let mainWindow: BrowserWindow | null = null;
let hardwareDetector: HardwareDetector;
let modelManager: ModelManager;
let blockchainService: BlockchainService;
let nodeOnboardingService: NodeOnboardingService;
let monitoringService: MonitoringService;
let taskExecutionService: TaskExecutionService;

const isDev = !app.isPackaged;

async function createWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    title: 'net4xyz Node Client',
    show: false,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    log.info('Main window ready and shown');
  });

  if (isDev) {
    await mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    await mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function setupAutoUpdater(): void {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    log.info('Checking for updates...');
    mainWindow?.webContents.send('update-status', { status: 'checking' });
  });

  autoUpdater.on('update-available', (info) => {
    log.info('Update available:', info.version);
    mainWindow?.webContents.send('update-status', { 
      status: 'available', 
      version: info.version 
    });
    
    dialog.showMessageBox({
      type: 'info',
      title: 'Update Available',
      message: `A new version (${info.version}) is available. Would you like to download it?`,
      buttons: ['Download', 'Later'],
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.downloadUpdate();
      }
    });
  });

  autoUpdater.on('update-not-available', () => {
    log.info('No updates available');
    mainWindow?.webContents.send('update-status', { status: 'not-available' });
  });

  autoUpdater.on('download-progress', (progress) => {
    log.info(`Download progress: ${progress.percent}%`);
    mainWindow?.webContents.send('update-status', { 
      status: 'downloading', 
      progress: progress.percent 
    });
  });

  autoUpdater.on('update-downloaded', () => {
    log.info('Update downloaded');
    mainWindow?.webContents.send('update-status', { status: 'downloaded' });
    
    dialog.showMessageBox({
      type: 'info',
      title: 'Update Ready',
      message: 'Update has been downloaded. The application will restart to install.',
      buttons: ['Restart Now', 'Later'],
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall();
      }
    });
  });

  autoUpdater.on('error', (error) => {
    log.error('Auto-updater error:', error);
    mainWindow?.webContents.send('update-status', { 
      status: 'error', 
      error: error.message 
    });
  });
}

function setupIpcHandlers(): void {
  // Hardware detection
  ipcMain.handle('hardware:detect', async () => {
    try {
      const hardwareInfo = await hardwareDetector.detect();
      return { success: true, data: hardwareInfo };
    } catch (error) {
      log.error('Hardware detection error:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('hardware:checkRequirements', async () => {
    try {
      const meetsRequirements = await hardwareDetector.checkRequirements();
      return { success: true, data: meetsRequirements };
    } catch (error) {
      log.error('Hardware requirements check error:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Model management
  ipcMain.handle('model:list', async () => {
    try {
      const models = await modelManager.listModels();
      return { success: true, data: models };
    } catch (error) {
      log.error('List models error:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('model:download', async (_event, modelId: string) => {
    try {
      await modelManager.downloadModel(modelId, (progress) => {
        mainWindow?.webContents.send('model:download-progress', { 
          modelId, 
          progress 
        });
      });
      return { success: true };
    } catch (error) {
      log.error('Download model error:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('model:delete', async (_event, modelId: string) => {
    try {
      await modelManager.deleteModel(modelId);
      return { success: true };
    } catch (error) {
      log.error('Delete model error:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('model:getStatus', async (_event, modelId: string) => {
    try {
      const status = await modelManager.getModelStatus(modelId);
      return { success: true, data: status };
    } catch (error) {
      log.error('Get model status error:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Blockchain service
  ipcMain.handle('blockchain:connect', async (_event, walletAddress: string) => {
    try {
      await blockchainService.connect(walletAddress);
      return { success: true };
    } catch (error) {
      log.error('Blockchain connect error:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('blockchain:getBalance', async (_event, address: string) => {
    try {
      const balance = await blockchainService.getBalance(address);
      return { success: true, data: balance };
    } catch (error) {
      log.error('Get balance error:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('blockchain:registerNode', async (_event, hardwareInfo: import('../services/hardware-detector').HardwareInfo) => {
    try {
      const result = await blockchainService.registerNode(hardwareInfo);
      return { success: true, data: result };
    } catch (error) {
      log.error('Register node error:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('blockchain:stake', async (_event, amount: string) => {
    try {
      const result = await blockchainService.stake(amount);
      return { success: true, data: result };
    } catch (error) {
      log.error('Stake error:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Node onboarding
  ipcMain.handle('onboarding:checkHardware', async () => {
    try {
      const result = await nodeOnboardingService.checkHardwareRequirements();
      return { success: true, data: result };
    } catch (error) {
      log.error('Hardware check error:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('onboarding:connectWallet', async (_event, walletAddress: string) => {
    try {
      const result = await nodeOnboardingService.connectWallet(walletAddress);
      return { success: true, data: result };
    } catch (error) {
      log.error('Connect wallet error:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('onboarding:registerNode', async (_event, nodeType: string, region: string, backendApiUrl?: string) => {
    try {
      const result = await nodeOnboardingService.registerNode(nodeType as NodeType, region, backendApiUrl);
      return { success: true, data: result };
    } catch (error) {
      log.error('Register node error:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('onboarding:stake', async (_event, amount?: string) => {
    try {
      const result = await nodeOnboardingService.stake(amount);
      return { success: true, data: result };
    } catch (error) {
      log.error('Stake error:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('onboarding:activateAvatar', async (_event, avatarType: string, nickname: string, backendApiUrl?: string) => {
    try {
      const result = await nodeOnboardingService.activateAIAvatar(avatarType as AIAvatarType, nickname, backendApiUrl);
      return { success: true, data: result };
    } catch (error) {
      log.error('Activate avatar error:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('onboarding:verifyIdentity', async (_event, verificationCode?: string) => {
    try {
      const result = await nodeOnboardingService.verifyIdentity(verificationCode);
      return { success: true, data: result };
    } catch (error) {
      log.error('Verify identity error:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('onboarding:complete', async () => {
    try {
      const result = await nodeOnboardingService.completeOnboarding();
      
      // Update monitoring service with node info
      if (result.success && result.nodeId) {
        const progress = nodeOnboardingService.getProgress();
        const stepData = progress.stepData;
        
        monitoringService.updateNodeStatus({
          nodeId: result.nodeId,
          walletAddress: stepData.walletAddress || null,
          nodeType: stepData.nodeType || null,
          region: stepData.region || null,
          registeredAt: new Date().toISOString(),
          status: NodeMonitorStatus.ONLINE,
          uptime: 0,
          lastHeartbeat: null,
        });
        
        // Start task execution
        taskExecutionService.setNodeId(result.nodeId);
        taskExecutionService.start();
      }
      
      return { success: true, data: result };
    } catch (error) {
      log.error('Complete onboarding error:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('onboarding:getProgress', async () => {
    try {
      const progress = nodeOnboardingService.getProgress();
      return { success: true, data: progress };
    } catch (error) {
      log.error('Get progress error:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('onboarding:reset', async () => {
    try {
      nodeOnboardingService.resetProgress();
      return { success: true };
    } catch (error) {
      log.error('Reset progress error:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('onboarding:getStakeAmount', async (_event, nodeType: string) => {
    try {
      const amount = nodeOnboardingService.getStakeAmount(nodeType as NodeType);
      return { success: true, data: amount };
    } catch (error) {
      log.error('Get stake amount error:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('onboarding:getAvailableNodeTypes', async () => {
    try {
      const types = await nodeOnboardingService.getAvailableNodeTypes();
      return { success: true, data: types };
    } catch (error) {
      log.error('Get available node types error:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('onboarding:getAvailableAvatarTypes', async () => {
    try {
      const types = await nodeOnboardingService.getAvailableAvatarTypes();
      return { success: true, data: types };
    } catch (error) {
      log.error('Get available avatar types error:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Monitoring service
  ipcMain.handle('monitoring:getNodeStatus', async () => {
    try {
      const status = monitoringService.getNodeStatus();
      return { success: true, data: status };
    } catch (error) {
      log.error('Get node status error:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('monitoring:getPerformanceMetrics', async () => {
    try {
      const metrics = monitoringService.getPerformanceMetrics();
      return { success: true, data: metrics };
    } catch (error) {
      log.error('Get performance metrics error:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('monitoring:getEarningsData', async () => {
    try {
      const earnings = monitoringService.getEarningsData();
      return { success: true, data: earnings };
    } catch (error) {
      log.error('Get earnings data error:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('monitoring:getTaskHistory', async () => {
    try {
      const history = monitoringService.getTaskHistory();
      return { success: true, data: history };
    } catch (error) {
      log.error('Get task history error:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('monitoring:getPerformanceHistory', async () => {
    try {
      const history = monitoringService.getPerformanceHistory();
      return { success: true, data: history };
    } catch (error) {
      log.error('Get performance history error:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('monitoring:getAllData', async () => {
    try {
      const data = monitoringService.getAllData();
      return { success: true, data };
    } catch (error) {
      log.error('Get all monitoring data error:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('monitoring:claimEarnings', async () => {
    try {
      const result = await monitoringService.claimEarnings();
      return { success: result };
    } catch (error) {
      log.error('Claim earnings error:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('monitoring:syncWithBackend', async () => {
    try {
      await monitoringService.syncWithBackend();
      return { success: true };
    } catch (error) {
      log.error('Sync with backend error:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('monitoring:updateNodeStatus', async (_event, status: { nodeId?: string; walletAddress?: string; nodeType?: string; region?: string; registeredAt?: string }) => {
    try {
      monitoringService.updateNodeStatus({
        nodeId: status.nodeId || null,
        walletAddress: status.walletAddress || null,
        nodeType: status.nodeType || null,
        region: status.region || null,
        registeredAt: status.registeredAt || null,
        status: NodeMonitorStatus.ONLINE,
        uptime: 0,
        lastHeartbeat: null,
      });
      return { success: true };
    } catch (error) {
      log.error('Update node status error:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Auto-update
  ipcMain.handle('update:check', async () => {
    try {
      await autoUpdater.checkForUpdates();
      return { success: true };
    } catch (error) {
      log.error('Check update error:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('update:download', async () => {
    try {
      await autoUpdater.downloadUpdate();
      return { success: true };
    } catch (error) {
      log.error('Download update error:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('update:install', async () => {
    autoUpdater.quitAndInstall();
    return { success: true };
  });

  // App info
  ipcMain.handle('app:getVersion', () => {
    return app.getVersion();
  });

  ipcMain.handle('app:getPlatform', () => {
    return process.platform;
  });
}

async function initialize(): Promise<void> {
  log.info('Initializing node client...');
  
  // Initialize services
  hardwareDetector = new HardwareDetector();
  modelManager = new ModelManager();
  blockchainService = new BlockchainService();
  nodeOnboardingService = new NodeOnboardingService();
  taskExecutionService = new TaskExecutionService();
  monitoringService = new MonitoringService();
  
  // Link services
  monitoringService.setTaskExecutionService(taskExecutionService);
  
  // Setup IPC handlers
  setupIpcHandlers();
  
  // Setup auto-updater (only in production)
  if (!isDev) {
    setupAutoUpdater();
    await autoUpdater.checkForUpdates();
  }
  
  // Create main window
  await createWindow();
  
  // Start monitoring service
  monitoringService.start();
  
  log.info('Node client initialized successfully');
}

// App lifecycle
app.whenReady().then(initialize).catch((error) => {
  log.error('Failed to initialize:', error);
  app.quit();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  log.error('Uncaught exception:', error);
  dialog.showErrorBox('Error', `An unexpected error occurred: ${error.message}`);
});

process.on('unhandledRejection', (reason) => {
  log.error('Unhandled rejection:', reason);
});