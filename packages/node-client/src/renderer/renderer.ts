// Renderer process - handles UI interactions

// Type definitions for the exposed API
interface ElectronAPI {
  detectHardware: () => Promise<{ success: boolean; data?: unknown; error?: string }>;
  checkHardwareRequirements: () => Promise<{ success: boolean; data?: unknown; error?: string }>;
  listModels: () => Promise<{ success: boolean; data?: unknown[]; error?: string }>;
  downloadModel: (modelId: string) => Promise<{ success: boolean; error?: string }>;
  deleteModel: (modelId: string) => Promise<{ success: boolean; error?: string }>;
  getModelStatus: (modelId: string) => Promise<{ success: boolean; data?: unknown; error?: string }>;
  onModelDownloadProgress: (callback: (data: { modelId: string; progress: number }) => void) => void;
  connectWallet: (walletAddress: string) => Promise<{ success: boolean; error?: string }>;
  getBalance: (address: string) => Promise<{ success: boolean; data?: string; error?: string }>;
  registerNode: (hardwareInfo: unknown) => Promise<{ success: boolean; data?: unknown; error?: string }>;
  stake: (amount: string) => Promise<{ success: boolean; data?: unknown; error?: string }>;
  checkForUpdates: () => Promise<{ success: boolean; error?: string }>;
  downloadUpdate: () => Promise<{ success: boolean; error?: string }>;
  installUpdate: () => Promise<{ success: boolean }>;
  onUpdateStatus: (callback: (data: unknown) => void) => void;
  getVersion: () => Promise<string>;
  getPlatform: () => Promise<string>;
  // Monitoring
  getNodeStatus: () => Promise<{ success: boolean; data?: unknown; error?: string }>;
  getPerformanceMetrics: () => Promise<{ success: boolean; data?: unknown; error?: string }>;
  getEarningsData: () => Promise<{ success: boolean; data?: unknown; error?: string }>;
  getTaskHistory: () => Promise<{ success: boolean; data?: unknown[]; error?: string }>;
  getPerformanceHistory: () => Promise<{ success: boolean; data?: unknown[]; error?: string }>;
  getAllData: () => Promise<{ success: boolean; data?: unknown; error?: string }>;
  claimEarnings: () => Promise<{ success: boolean; error?: string }>;
  syncWithBackend: () => Promise<{ success: boolean; error?: string }>;
  updateNodeStatus: (status: { nodeId?: string; walletAddress?: string; nodeType?: string; region?: string; registeredAt?: string }) => Promise<{ success: boolean; error?: string }>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

// Tab switching
document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    // Remove active class from all tabs
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    document.querySelectorAll('.section').forEach((s) => s.classList.remove('active'));

    // Add active class to clicked tab
    tab.classList.add('active');
    const tabName = tab.getAttribute('data-tab');
    document.getElementById(`${tabName}-section`)?.classList.add('active');
  });
});

// Hardware detection
const detectBtn = document.getElementById('detectBtn') as HTMLButtonElement;
const hardwareLoading = document.getElementById('hardwareLoading');
const hardwareResults = document.getElementById('hardwareResults');

detectBtn?.addEventListener('click', async () => {
  hardwareLoading?.classList.remove('hidden');
  hardwareResults?.classList.add('hidden');
  detectBtn.disabled = true;

  try {
    const result = await window.electronAPI.checkHardwareRequirements();
    
    if (result.success && result.data) {
      const data = result.data as {
        cpuScore: number;
        memoryScore: number;
        gpuScore: number;
        diskScore: number;
        overallScore: number;
        meetsRequirements: boolean;
        recommendations: string[];
      };

      // Update CPU
      const cpuModel = document.getElementById('cpuModel');
      const cpuScore = document.getElementById('cpuScore');
      if (cpuModel) cpuModel.textContent = `${data.cpuScore}%`;
      if (cpuScore) {
        cpuScore.style.width = `${data.cpuScore}%`;
        cpuScore.className = `score-fill ${getScoreClass(data.cpuScore)}`;
      }

      // Update Memory
      const memoryTotal = document.getElementById('memoryTotal');
      const memoryScore = document.getElementById('memoryScore');
      if (memoryTotal) memoryTotal.textContent = `${data.memoryScore}%`;
      if (memoryScore) {
        memoryScore.style.width = `${data.memoryScore}%`;
        memoryScore.className = `score-fill ${getScoreClass(data.memoryScore)}`;
      }

      // Update GPU
      const gpuModel = document.getElementById('gpuModel');
      const gpuScore = document.getElementById('gpuScore');
      if (gpuModel) gpuModel.textContent = `${data.gpuScore}%`;
      if (gpuScore) {
        gpuScore.style.width = `${data.gpuScore}%`;
        gpuScore.className = `score-fill ${getScoreClass(data.gpuScore)}`;
      }

      // Update Disk
      const diskSpace = document.getElementById('diskSpace');
      const diskScore = document.getElementById('diskScore');
      if (diskSpace) diskSpace.textContent = `${data.diskScore}%`;
      if (diskScore) {
        diskScore.style.width = `${data.diskScore}%`;
        diskScore.className = `score-fill ${getScoreClass(data.diskScore)}`;
      }

      // Update Overall
      const overallScore = document.getElementById('overallScore');
      const overallScoreBar = document.getElementById('overallScoreBar');
      if (overallScore) overallScore.textContent = `${data.overallScore}/100`;
      if (overallScoreBar) {
        overallScoreBar.style.width = `${data.overallScore}%`;
        overallScoreBar.className = `score-fill ${getScoreClass(data.overallScore)}`;
      }

      // Update status
      const meetsRequirementsEl = document.getElementById('meetsRequirements');
      if (meetsRequirementsEl) {
        meetsRequirementsEl.textContent = data.meetsRequirements 
          ? '✅ Hardware meets requirements' 
          : '❌ Hardware does not meet requirements';
        meetsRequirementsEl.style.color = data.meetsRequirements ? '#00ff88' : '#ff4444';
      }

      // Update recommendations
      const recommendationsEl = document.getElementById('recommendations');
      const recommendationsList = document.getElementById('recommendationsList');
      if (data.recommendations && data.recommendations.length > 0) {
        recommendationsEl?.classList.remove('hidden');
        if (recommendationsList) {
          recommendationsList.innerHTML = data.recommendations
            .map((r: string) => `<li>${r}</li>`)
            .join('');
        }
      } else {
        recommendationsEl?.classList.add('hidden');
      }

      hardwareLoading?.classList.add('hidden');
      hardwareResults?.classList.remove('hidden');
    }
  } catch (error) {
    console.error('Hardware detection error:', error);
    alert('Failed to detect hardware: ' + (error as Error).message);
  } finally {
    detectBtn.disabled = false;
  }
});

function getScoreClass(score: number): string {
  if (score >= 70) return 'good';
  if (score >= 40) return 'medium';
  return 'poor';
}

// Model management
async function loadModels() {
  const modelList = document.getElementById('modelList');
  if (!modelList) return;

  try {
    const result = await window.electronAPI.listModels();
    
    if (result.success && result.data) {
      const models = result.data as Array<{
        id: string;
        name: string;
        size: number;
        description: string;
        requirements: { minMemoryGB: number; minDiskGB: number; minCores: number };
      }>;

      modelList.innerHTML = models.map((model) => `
        <div class="model-card" data-model-id="${model.id}">
          <div class="model-info">
            <h3>${model.name}</h3>
            <p>${model.description}</p>
            <div class="model-size">Size: ${formatSize(model.size)} | Requires: ${model.requirements.minMemoryGB}GB RAM, ${model.requirements.minCores} cores</div>
            <div class="progress-bar hidden">
              <div class="progress-fill" style="width: 0%"></div>
            </div>
          </div>
          <div>
            <span class="status-badge available">Available</span>
            <button class="btn btn-primary download-btn" data-model-id="${model.id}">Download</button>
          </div>
        </div>
      `).join('');

      // Add download button listeners
      modelList.querySelectorAll('.download-btn').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          const modelId = (e.target as HTMLElement).getAttribute('data-model-id');
          if (modelId) {
            await downloadModel(modelId);
          }
        });
      });
    }
  } catch (error) {
    console.error('Load models error:', error);
    modelList.innerHTML = '<p>Failed to load models</p>';
  }
}

async function downloadModel(modelId: string) {
  const modelCard = document.querySelector(`[data-model-id="${modelId}"]`);
  const btn = modelCard?.querySelector('.download-btn') as HTMLButtonElement;
  const statusBadge = modelCard?.querySelector('.status-badge') as HTMLElement;
  const progressBar = modelCard?.querySelector('.progress-bar') as HTMLElement;
  const progressFill = modelCard?.querySelector('.progress-fill') as HTMLElement;

  if (btn) btn.disabled = true;
  if (statusBadge) {
    statusBadge.textContent = 'Downloading';
    statusBadge.className = 'status-badge downloading';
  }
  if (progressBar) progressBar.classList.remove('hidden');

  try {
    await window.electronAPI.downloadModel(modelId);
    
    if (statusBadge) {
      statusBadge.textContent = 'Downloaded';
      statusBadge.className = 'status-badge downloaded';
    }
    if (progressBar) progressBar.classList.add('hidden');
    if (btn) {
      btn.textContent = 'Delete';
      btn.classList.remove('btn-primary');
      btn.classList.add('btn-secondary');
    }
  } catch (error) {
    console.error('Download error:', error);
    if (statusBadge) {
      statusBadge.textContent = 'Error';
      statusBadge.className = 'status-badge error';
    }
    alert('Failed to download model: ' + (error as Error).message);
  } finally {
    if (btn) btn.disabled = false;
  }
}

// Listen for download progress
window.electronAPI.onModelDownloadProgress((data) => {
  const modelCard = document.querySelector(`[data-model-id="${data.modelId}"]`);
  const progressFill = modelCard?.querySelector('.progress-fill') as HTMLElement;
  if (progressFill) {
    progressFill.style.width = `${data.progress}%`;
  }
});

// Wallet connection
const connectBtn = document.getElementById('connectBtn') as HTMLButtonElement;
const walletAddressInput = document.getElementById('walletAddress') as HTMLInputElement;
const walletInfo = document.getElementById('walletInfo');
const nodeRegistration = document.getElementById('nodeRegistration');

connectBtn?.addEventListener('click', async () => {
  const address = walletAddressInput?.value.trim();
  if (!address) {
    alert('Please enter a wallet address');
    return;
  }

  if (!address.startsWith('0x') || address.length !== 42) {
    alert('Invalid wallet address format');
    return;
  }

  connectBtn.disabled = true;
  connectBtn.textContent = 'Connecting...';

  try {
    const result = await window.electronAPI.connectWallet(address);
    
    if (result.success) {
      const balanceResult = await window.electronAPI.getBalance(address);
      const platform = await window.electronAPI.getPlatform();

      const connectedAddress = document.getElementById('connectedAddress');
      const walletBalance = document.getElementById('walletBalance');
      const platformEl = document.getElementById('platform');

      if (connectedAddress) connectedAddress.textContent = address;
      if (walletBalance) {
        walletBalance.textContent = balanceResult.success 
          ? `${parseFloat(balanceResult.data || '0').toFixed(4)} ETH`
          : 'N/A';
      }
      if (platformEl) platformEl.textContent = platform;

      walletInfo?.classList.remove('hidden');
      nodeRegistration?.classList.remove('hidden');
    } else {
      alert('Failed to connect wallet: ' + result.error);
    }
  } catch (error) {
    console.error('Connect wallet error:', error);
    alert('Failed to connect wallet: ' + (error as Error).message);
  } finally {
    connectBtn.disabled = false;
    connectBtn.textContent = 'Connect Wallet';
  }
});

// Node registration
const registerNodeBtn = document.getElementById('registerNodeBtn') as HTMLButtonElement;

registerNodeBtn?.addEventListener('click', async () => {
  registerNodeBtn.disabled = true;
  registerNodeBtn.textContent = 'Registering...';

  try {
    // First get hardware info
    const hardwareResult = await window.electronAPI.detectHardware();
    
    if (hardwareResult.success && hardwareResult.data) {
      const result = await window.electronAPI.registerNode(hardwareResult.data);
      
      if (result.success) {
        alert('Node registered successfully!');
      } else {
        alert('Failed to register node: ' + result.error);
      }
    }
  } catch (error) {
    console.error('Register node error:', error);
    alert('Failed to register node: ' + (error as Error).message);
  } finally {
    registerNodeBtn.disabled = false;
    registerNodeBtn.textContent = 'Register Node';
  }
});

// Auto-update
const checkUpdateBtn = document.getElementById('checkUpdateBtn') as HTMLButtonElement;
const updateStatusText = document.getElementById('updateStatusText');

checkUpdateBtn?.addEventListener('click', async () => {
  checkUpdateBtn.disabled = true;
  if (updateStatusText) updateStatusText.textContent = 'Checking for updates...';

  try {
    await window.electronAPI.checkForUpdates();
  } catch (error) {
    console.error('Check update error:', error);
    if (updateStatusText) updateStatusText.textContent = 'Error checking for updates';
  } finally {
    checkUpdateBtn.disabled = false;
  }
});

// Listen for update status
window.electronAPI.onUpdateStatus((data: unknown) => {
  const status = data as { status: string; version?: string; progress?: number; error?: string };
  
  if (updateStatusText) {
    switch (status.status) {
      case 'checking':
        updateStatusText.textContent = 'Checking for updates...';
        break;
      case 'available':
        updateStatusText.textContent = `Update available: v${status.version}`;
        break;
      case 'not-available':
        updateStatusText.textContent = 'You have the latest version';
        break;
      case 'downloading':
        updateStatusText.textContent = `Downloading: ${Math.round(status.progress || 0)}%`;
        break;
      case 'downloaded':
        updateStatusText.textContent = 'Update downloaded. Restart to install.';
        break;
      case 'error':
        updateStatusText.textContent = `Error: ${status.error}`;
        break;
    }
  }
});

// Monitoring Panel
let monitorRefreshInterval: number | null = null;

async function loadMonitoringData() {
  try {
    // Get node status
    const statusResult = await window.electronAPI.getNodeStatus();
    if (statusResult.success && statusResult.data) {
      const status = statusResult.data as {
        nodeId: string | null;
        status: string;
        nodeType: string | null;
        region: string | null;
        uptime: number;
      };
      
      const statusDot = document.querySelector('#nodeStatus .status-dot');
      const statusText = document.querySelector('#nodeStatus .status-text');
      
      if (statusDot && statusText) {
        statusDot.className = `status-dot ${status.status?.toLowerCase() || 'offline'}`;
        statusText.textContent = status.status || 'Offline';
      }
      
      const nodeIdEl = document.getElementById('monitorNodeId');
      const nodeTypeEl = document.getElementById('monitorNodeType');
      const regionEl = document.getElementById('monitorRegion');
      const uptimeEl = document.getElementById('monitorUptime');
      
      if (nodeIdEl) nodeIdEl.textContent = status.nodeId || '-';
      if (nodeTypeEl) nodeTypeEl.textContent = status.nodeType || '-';
      if (regionEl) regionEl.textContent = status.region || '-';
      if (uptimeEl) uptimeEl.textContent = formatUptime(status.uptime);
    }

    // Get earnings data
    const earningsResult = await window.electronAPI.getEarningsData();
    if (earningsResult.success && earningsResult.data) {
      const earnings = earningsResult.data as {
        totalEarnings: number;
        pendingEarnings: number;
        lastPayoutTime: string | null;
      };
      
      const totalEl = document.getElementById('totalEarnings');
      const pendingEl = document.getElementById('pendingEarnings');
      const lastPayoutEl = document.getElementById('lastPayoutTime');
      const claimBtn = document.getElementById('claimEarningsBtn') as HTMLButtonElement;
      
      if (totalEl) totalEl.textContent = earnings.totalEarnings.toFixed(4);
      if (pendingEl) pendingEl.textContent = earnings.pendingEarnings.toFixed(4);
      if (lastPayoutEl) {
        lastPayoutEl.textContent = earnings.lastPayoutTime 
          ? new Date(earnings.lastPayoutTime).toLocaleString() 
          : 'Never';
      }
      if (claimBtn) {
        claimBtn.disabled = !earnings.pendingEarnings || earnings.pendingEarnings <= 0;
      }
    }

    // Get performance metrics
    const metricsResult = await window.electronAPI.getPerformanceMetrics();
    if (metricsResult.success && metricsResult.data) {
      const metrics = metricsResult.data as {
        cpuUsage: number;
        memoryUsage: number;
        gpuUsage: number;
        diskUsage: number;
      };
      
      updateMetricBar('cpu', metrics.cpuUsage);
      updateMetricBar('memory', metrics.memoryUsage);
      updateMetricBar('gpu', metrics.gpuUsage);
      updateMetricBar('disk', metrics.diskUsage);
    }

    // Get task history
    const historyResult = await window.electronAPI.getTaskHistory();
    if (historyResult.success && historyResult.data) {
      const tasks = historyResult.data as Array<{
        id: string;
        taskType: string;
        status: string;
        reward: number;
        executionTime: number;
        completedAt: string;
      }>;
      
      const historyEl = document.getElementById('taskHistory');
      if (historyEl) {
        if (tasks.length === 0) {
          historyEl.innerHTML = '<p class="no-data">No tasks completed yet</p>';
        } else {
          historyEl.innerHTML = tasks.slice(0, 10).map(task => `
            <div class="task-item">
              <div class="task-info">
                <div class="task-type">${formatTaskType(task.taskType)}</div>
                <div class="task-time">${new Date(task.completedAt).toLocaleString()}</div>
              </div>
              <span class="task-status ${task.status}">${task.status}</span>
              <span class="task-reward">+${task.reward.toFixed(4)} AFC</span>
            </div>
          `).join('');
        }
      }
    }
  } catch (error) {
    console.error('Error loading monitoring data:', error);
  }
}

function updateMetricBar(metric: string, value: number) {
  const barEl = document.getElementById(`${metric}Metric`);
  const valueEl = document.getElementById(`${metric}Value`);
  
  if (barEl) {
    barEl.style.width = `${Math.min(100, Math.max(0, value))}%`;
    // Change color based on usage
    if (value > 80) {
      barEl.style.background = 'linear-gradient(90deg, #ff4444, #ff0000)';
    } else if (value > 50) {
      barEl.style.background = 'linear-gradient(90deg, #ffaa00, #ff6600)';
    } else {
      barEl.style.background = 'linear-gradient(90deg, #00d4ff, #7b2cbf)';
    }
  }
  if (valueEl) {
    valueEl.textContent = `${Math.round(value)}%`;
  }
}

function formatUptime(seconds: number): string {
  if (!seconds || seconds <= 0) return '-';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function formatTaskType(taskType: string): string {
  const typeMap: Record<string, string> = {
    EMOTIONAL_ANALYSIS: 'Emotional Analysis',
    EMOTIONAL_RESPONSE: 'Emotional Response',
    EMOTIONAL_CONSENSUS: 'Emotional Consensus',
    KNOWLEDGE_QUERY: 'Knowledge Query',
    CONTENT_MODERATION: 'Content Moderation',
    TEXT_GENERATION: 'Text Generation',
    SUMMARIZATION: 'Summarization',
    TRANSLATION: 'Translation',
  };
  return typeMap[taskType] || taskType;
}

// Claim earnings button
const claimEarningsBtn = document.getElementById('claimEarningsBtn');
claimEarningsBtn?.addEventListener('click', async () => {
  claimEarningsBtn.disabled = true;
  claimEarningsBtn.textContent = 'Claiming...';
  
  try {
    const result = await window.electronAPI.claimEarnings();
    if (result.success) {
      alert('Earnings claimed successfully!');
      await loadMonitoringData();
    } else {
      alert('Failed to claim earnings: ' + result.error);
    }
  } catch (error) {
    console.error('Claim earnings error:', error);
    alert('Failed to claim earnings');
  } finally {
    claimEarningsBtn.disabled = false;
    claimEarningsBtn.textContent = 'Claim Earnings';
  }
});

// Sync with backend button
const syncMonitorBtn = document.getElementById('syncMonitorBtn');
syncMonitorBtn?.addEventListener('click', async () => {
  syncMonitorBtn.disabled = true;
  syncMonitorBtn.textContent = 'Syncing...';
  
  try {
    await window.electronAPI.syncWithBackend();
    await loadMonitoringData();
    alert('Data synced successfully!');
  } catch (error) {
    console.error('Sync error:', error);
    alert('Failed to sync data');
  } finally {
    syncMonitorBtn.disabled = false;
    syncMonitorBtn.textContent = 'Sync with Backend';
  }
});

// Start auto-refresh when monitor tab is active
const monitorTab = document.querySelector('[data-tab="monitor"]');
monitorTab?.addEventListener('click', () => {
  if (monitorRefreshInterval) {
    clearInterval(monitorRefreshInterval);
  }
  loadMonitoringData();
  monitorRefreshInterval = window.setInterval(loadMonitoringData, 5000);
});

// Initial load if monitor tab is active
if (document.querySelector('.tab[data-tab="monitor"]')?.classList.contains('active')) {
  loadMonitoringData();
  monitorRefreshInterval = window.setInterval(loadMonitoringData, 5000);
}

// Initialize
async function init() {
  try {
    const version = await window.electronAPI.getVersion();
    const appVersion = document.getElementById('appVersion');
    const currentVersion = document.getElementById('currentVersion');
    
    if (appVersion) appVersion.textContent = version;
    if (currentVersion) currentVersion.textContent = version;

    // Load models on init
    await loadModels();
  } catch (error) {
    console.error('Init error:', error);
  }
}

init();

// Utility functions
function formatSize(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) {
    return `${gb.toFixed(1)} GB`;
  }
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}