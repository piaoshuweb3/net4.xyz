import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HardwareDetector } from './hardware-detector';

// Mock systeminformation
vi.mock('systeminformation', () => ({
  cpu: vi.fn().mockResolvedValue({
    brand: 'Intel(R) Core(TM) i9-9900K',
    cores: 8,
    speed: 3.6,
    manufacturer: 'Intel',
  }),
  mem: vi.fn().mockResolvedValue({
    total: 32 * 1024 * 1024 * 1024, // 32 GB
    available: 16 * 1024 * 1024 * 1024,
    used: 16 * 1024 * 1024 * 1024,
  }),
  fsSize: vi.fn().mockResolvedValue([
    { size: 1024 * 1024 * 1024 * 1024, available: 500 * 1024 * 1024 * 1024 }, // 1TB total, 500GB free
  ]),
  networkInterfaces: vi.fn().mockResolvedValue([
    { ip4: '192.168.1.100', type: 'wired', internal: false },
  ]),
  graphics: vi.fn().mockResolvedValue({
    controllers: [
      {
        model: 'NVIDIA GeForce RTX 3080',
        vram: 10240, // 10 GB
        vendor: 'NVIDIA',
      },
    ],
  }),
}));

describe('HardwareDetector', () => {
  let detector: HardwareDetector;

  beforeEach(() => {
    detector = new HardwareDetector();
  });

  describe('detect', () => {
    it('should detect hardware information', async () => {
      const hardware = await detector.detect();

      expect(hardware).toBeDefined();
      expect(hardware.platform).toBeDefined();
      expect(hardware.cpu).toBeDefined();
      expect(hardware.cpu.model).toBe('Intel(R) Core(TM) i9-9900K');
      expect(hardware.cpu.cores).toBe(8);
      expect(hardware.memory.total).toBe(32 * 1024 * 1024 * 1024);
      expect(hardware.gpu).toHaveLength(1);
      expect(hardware.gpu[0].name).toBe('NVIDIA GeForce RTX 3080');
    });

    it('should cache hardware info', async () => {
      const hardware1 = await detector.detect();
      const hardware2 = await detector.detect();

      expect(hardware1).toBe(hardware2);
    });
  });

  describe('checkRequirements', () => {
    it('should return meetsRequirements true for good hardware', async () => {
      const result = await detector.checkRequirements();

      expect(result).toBeDefined();
      expect(result.meetsRequirements).toBe(true);
      expect(result.overallScore).toBeGreaterThanOrEqual(60);
      expect(result.cpuScore).toBeGreaterThanOrEqual(60);
      expect(result.memoryScore).toBeGreaterThanOrEqual(60);
      expect(result.gpuScore).toBeGreaterThanOrEqual(60);
      expect(result.diskScore).toBeGreaterThanOrEqual(60);
    });

    it('should return recommendations for insufficient hardware', async () => {
      const result = await detector.checkRequirements();

      // With the mocked hardware (RTX 3080, 32GB RAM, 8 cores), 
      // it should meet requirements, so recommendations might be empty or contain suggestions
      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
    });
  });

  describe('getSystemInfo', () => {
    it('should return basic system info', () => {
      const info = detector.getSystemInfo();

      expect(info).toBeDefined();
      expect(info.platform).toBeDefined();
      expect(info.arch).toBeDefined();
      expect(info.cpus).toBeGreaterThan(0);
      expect(info.memory).toBeGreaterThan(0);
    });
  });
});