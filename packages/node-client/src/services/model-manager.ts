import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import { app } from 'electron';
import log from 'electron-log';

export interface ModelInfo {
  id: string;
  name: string;
  size: number;
  description: string;
  requirements: {
    minMemoryGB: number;
    minDiskGB: number;
    minCores: number;
  };
  url: string;
  hash: string;
}

export interface ModelStatus {
  id: string;
  name: string;
  state: 'available' | 'downloading' | 'downloaded' | 'error';
  progress: number;
  size: number;
  downloadedSize: number;
  localPath?: string;
  error?: string;
}

// Available models for download
export const AVAILABLE_MODELS: ModelInfo[] = [
  {
    id: 'llama3-8b',
    name: 'Llama 3 8B',
    size: 4.7 * 1024 * 1024 * 1024, // 4.7 GB
    description: 'Meta Llama 3 8B parameter model - efficient for consumer hardware',
    requirements: {
      minMemoryGB: 8,
      minDiskGB: 10,
      minCores: 4,
    },
    url: 'https://huggingface.co/meta-llama/Meta-Llama-3-8B-Instruct-GGUF/resolve/main/llama-3-8b-instruct-q4_k_m.gguf',
    hash: 'sha256:abc123',
  },
  {
    id: 'llama3-70b',
    name: 'Llama 3 70B',
    size: 39 * 1024 * 1024 * 1024, // 39 GB
    description: 'Meta Llama 3 70B parameter model - high performance',
    requirements: {
      minMemoryGB: 32,
      minDiskGB: 50,
      minCores: 8,
    },
    url: 'https://huggingface.co/meta-llama/Meta-Llama-3-70B-Instruct-GGUF/resolve/main/llama-3-70b-instruct-q4_k_m.gguf',
    hash: 'sha256:def456',
  },
  {
    id: 'mixtral-8x22b',
    name: 'Mixtral 8x22B',
    size: 49 * 1024 * 1024 * 1024, // 49 GB
    description: 'Mixtral mixture of experts - excellent performance',
    requirements: {
      minMemoryGB: 32,
      minDiskGB: 60,
      minCores: 8,
    },
    url: 'https://huggingface.co/mistralai/Mixtral-8x22B-Instruct-v0.1-GGUF/resolve/main/mixtral-8x22b-instruct-v0.1-q4_k_m.gguf',
    hash: 'sha256:ghi789',
  },
  {
    id: 'phi-3-mini',
    name: 'Phi-3 Mini',
    size: 2.3 * 1024 * 1024 * 1024, // 2.3 GB
    description: 'Microsoft Phi-3 Mini - lightweight and efficient',
    requirements: {
      minMemoryGB: 4,
      minDiskGB: 5,
      minCores: 2,
    },
    url: 'https://huggingface.co/microsoft/Phi-3-mini-4k-instruct-gguf/resolve/main/phi-3-mini-4k-instruct-q4.gguf',
    hash: 'sha256:jkl012',
  },
];

export class ModelManager {
  private modelsDir: string;
  private downloadStatus: Map<string, ModelStatus> = new Map();

  constructor() {
    this.modelsDir = path.join(app.getPath('userData'), 'models');
    this.ensureDirectoryExists(this.modelsDir);
    this.initializeStatus();
  }

  private ensureDirectoryExists(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      log.info(`Created models directory: ${dir}`);
    }
  }

  private initializeStatus(): void {
    // Check which models are already downloaded
    for (const model of AVAILABLE_MODELS) {
      const localPath = path.join(this.modelsDir, `${model.id}.gguf`);
      if (fs.existsSync(localPath)) {
        this.downloadStatus.set(model.id, {
          id: model.id,
          name: model.name,
          state: 'downloaded',
          progress: 100,
          size: model.size,
          downloadedSize: model.size,
          localPath,
        });
      } else {
        this.downloadStatus.set(model.id, {
          id: model.id,
          name: model.name,
          state: 'available',
          progress: 0,
          size: model.size,
          downloadedSize: 0,
        });
      }
    }
  }

  async listModels(): Promise<ModelInfo[]> {
    return AVAILABLE_MODELS;
  }

  async getModelStatus(modelId: string): Promise<ModelStatus | null> {
    return this.downloadStatus.get(modelId) || null;
  }

  async downloadModel(
    modelId: string,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    const model = AVAILABLE_MODELS.find(m => m.id === modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    const localPath = path.join(this.modelsDir, `${model.id}.gguf`);
    
    // Check if already downloaded
    if (fs.existsSync(localPath)) {
      log.info(`Model ${modelId} already exists at ${localPath}`);
      return;
    }

    // Update status to downloading
    this.downloadStatus.set(modelId, {
      id: modelId,
      name: model.name,
      state: 'downloading',
      progress: 0,
      size: model.size,
      downloadedSize: 0,
    });

    log.info(`Starting download of model ${modelId} from ${model.url}`);

    try {
      await this.downloadFile(model.url, localPath, (downloaded) => {
        const progress = Math.round((downloaded / model.size) * 100);
        const status = this.downloadStatus.get(modelId);
        if (status) {
          status.progress = progress;
          status.downloadedSize = downloaded;
        }
        onProgress?.(progress);
      });

      // Update status to downloaded
      this.downloadStatus.set(modelId, {
        id: modelId,
        name: model.name,
        state: 'downloaded',
        progress: 100,
        size: model.size,
        downloadedSize: model.size,
        localPath,
      });

      log.info(`Model ${modelId} downloaded successfully`);
    } catch (error) {
      // Update status to error
      this.downloadStatus.set(modelId, {
        id: modelId,
        name: model.name,
        state: 'error',
        progress: 0,
        size: model.size,
        downloadedSize: 0,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  private downloadFile(
    url: string,
    destPath: string,
    onProgress?: (downloaded: number) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https') ? https : http;
      
      const request = protocol.get(url, (response) => {
        // Handle redirects
        if (response.statusCode === 301 || response.statusCode === 302) {
          const redirectUrl = response.headers.location;
          if (redirectUrl) {
            this.downloadFile(redirectUrl, destPath, onProgress)
              .then(resolve)
              .catch(reject);
            return;
          }
        }

        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download: HTTP ${response.statusCode}`));
          return;
        }

        const file = fs.createWriteStream(destPath);
        let downloaded = 0;

        response.on('data', (chunk: Buffer) => {
          downloaded += chunk.length;
          onProgress?.(downloaded);
        });

        response.pipe(file);
        
        file.on('finish', () => {
          file.close();
          resolve();
        });

        file.on('error', (err) => {
          fs.unlink(destPath, () => {});
          reject(err);
        });
      });

      request.on('error', (err) => {
        reject(err);
      });

      request.end();
    });
  }

  async deleteModel(modelId: string): Promise<void> {
    const model = AVAILABLE_MODELS.find(m => m.id === modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    const localPath = path.join(this.modelsDir, `${model.id}.gguf`);
    
    if (fs.existsSync(localPath)) {
      fs.unlinkSync(localPath);
      log.info(`Deleted model ${modelId} from ${localPath}`);
    }

    // Update status
    this.downloadStatus.set(modelId, {
      id: modelId,
      name: model.name,
      state: 'available',
      progress: 0,
      size: model.size,
      downloadedSize: 0,
    });
  }

  getModelsDirectory(): string {
    return this.modelsDir;
  }

  getDownloadedModels(): ModelStatus[] {
    return Array.from(this.downloadStatus.values()).filter(
      (status) => status.state === 'downloaded'
    );
  }
}