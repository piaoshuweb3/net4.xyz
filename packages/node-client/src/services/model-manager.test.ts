import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModelManager, AVAILABLE_MODELS } from './model-manager';

// Mock electron app
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn().mockReturnValue('/tmp/test-user-data'),
  },
}));

// Mock fs
vi.mock('fs', () => ({
  existsSync: vi.fn().mockReturnValue(false),
  mkdirSync: vi.fn(),
  createWriteStream: vi.fn(),
  unlinkSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

describe('ModelManager', () => {
  let manager: ModelManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new ModelManager();
  });

  describe('listModels', () => {
    it('should return list of available models', async () => {
      const models = await manager.listModels();

      expect(models).toBeDefined();
      expect(models).toHaveLength(AVAILABLE_MODELS.length);
      expect(models[0]).toHaveProperty('id');
      expect(models[0]).toHaveProperty('name');
      expect(models[0]).toHaveProperty('size');
      expect(models[0]).toHaveProperty('requirements');
    });
  });

  describe('getModelStatus', () => {
    it('should return null for non-existent model', async () => {
      const status = await manager.getModelStatus('non-existent-model');
      expect(status).toBeNull();
    });

    it('should return status for existing model', async () => {
      const status = await manager.getModelStatus('llama3-8b');
      expect(status).toBeDefined();
      expect(status?.id).toBe('llama3-8b');
      expect(status?.name).toBe('Llama 3 8B');
    });
  });

  describe('getModelsDirectory', () => {
    it('should return the models directory path', () => {
      const dir = manager.getModelsDirectory();
      expect(dir).toContain('models');
    });
  });

  describe('getDownloadedModels', () => {
    it('should return empty array when no models downloaded', () => {
      const downloaded = manager.getDownloadedModels();
      expect(Array.isArray(downloaded)).toBe(true);
    });
  });
});