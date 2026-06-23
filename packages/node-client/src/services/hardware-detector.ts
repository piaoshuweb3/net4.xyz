import * as os from 'os';
import * as si from 'systeminformation';

export interface HardwareInfo {
  platform: string;
  arch: string;
  cpu: {
    model: string;
    cores: number;
    speed: number;
    manufacturer: string;
  };
  memory: {
    total: number;
    available: number;
    used: number;
  };
  gpu: {
    name: string;
    memory: number;
    vendor: string;
  }[];
  disk: {
    total: number;
    available: number;
  };
  network: {
    ip: string;
    type: string;
  };
}

export interface HardwareRequirements {
  meetsRequirements: boolean;
  cpuScore: number;
  memoryScore: number;
  gpuScore: number;
  diskScore: number;
  overallScore: number;
  recommendations: string[];
}

// Minimum requirements for running local AI models
const MIN_REQUIREMENTS = {
  cpu: {
    minCores: 8,
    minSpeed: 2.5, // GHz
  },
  memory: {
    minTotalGB: 16,
  },
  gpu: {
    minMemoryGB: 8,
    required: true,
  },
  disk: {
    minFreeGB: 50,
  },
};

// Recommended requirements for optimal performance
const RECOMMENDED_REQUIREMENTS = {
  cpu: {
    minCores: 16,
    minSpeed: 3.5,
  },
  memory: {
    minTotalGB: 32,
  },
  gpu: {
    minMemoryGB: 16,
  },
  disk: {
    minFreeGB: 100,
  },
};

interface CpuInfo {
  brand?: string;
  cores?: number;
  speed?: number;
  manufacturer?: string;
}

interface MemInfo {
  total: number;
  available: number;
  used: number;
}

interface DiskInfo {
  size: number;
  available: number;
}

interface NetworkInfo {
  ip4?: string;
  type?: string;
  internal?: boolean;
}

interface GraphicsController {
  model?: string;
  vram?: number;
  vendor?: string;
}

interface GraphicsInfo {
  controllers: GraphicsController[];
}

export class HardwareDetector {
  private cachedHardwareInfo: HardwareInfo | null = null;

  async detect(): Promise<HardwareInfo> {
    if (this.cachedHardwareInfo) {
      return this.cachedHardwareInfo;
    }

    try {
      const [cpu, mem, disk, network, graphics]: [CpuInfo, MemInfo, DiskInfo[], NetworkInfo[], GraphicsInfo] = await Promise.all([
        si.cpu() as Promise<CpuInfo>,
        si.mem() as Promise<MemInfo>,
        si.fsSize() as Promise<DiskInfo[]>,
        si.networkInterfaces() as Promise<NetworkInfo[]>,
        si.graphics() as Promise<GraphicsInfo>,
      ]);

      const gpuInfo = graphics.controllers.map((ctrl: GraphicsController) => ({
        name: ctrl.model || 'Unknown',
        memory: ctrl.vram || 0,
        vendor: ctrl.vendor || 'Unknown',
      }));

      // Filter to get primary network interface
      const primaryNetwork = network.find((iface: NetworkInfo) => !iface.internal) || network[0];
      const ip = primaryNetwork?.ip4 || 'N/A';

      // Get disk info (first disk)
      const diskInfo = disk[0] || { size: 0, available: 0 };

      this.cachedHardwareInfo = {
        platform: os.platform(),
        arch: os.arch(),
        cpu: {
          model: cpu.brand || 'Unknown',
          cores: cpu.cores || os.cpus().length,
          speed: cpu.speed || 0,
          manufacturer: cpu.manufacturer || 'Unknown',
        },
        memory: {
          total: mem.total,
          available: mem.available,
          used: mem.used,
        },
        gpu: gpuInfo,
        disk: {
          total: diskInfo.size,
          available: diskInfo.available,
        },
        network: {
          ip,
          type: primaryNetwork?.type || 'Unknown',
        },
      };

      return this.cachedHardwareInfo;
    } catch (error) {
      // Fallback to basic detection if systeminformation fails
      return this.detectBasic();
    }
  }

  private detectBasic(): HardwareInfo {
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();

    return {
      platform: os.platform(),
      arch: os.arch(),
      cpu: {
        model: cpus[0]?.model || 'Unknown',
        cores: cpus.length,
        speed: cpus[0]?.speed || 0,
        manufacturer: 'Unknown',
      },
      memory: {
        total: totalMem,
        available: freeMem,
        used: totalMem - freeMem,
      },
      gpu: [],
      disk: {
        total: 0,
        available: 0,
      },
      network: {
        ip: 'N/A',
        type: 'Unknown',
      },
    };
  }

  async checkRequirements(): Promise<HardwareRequirements> {
    const hardware = await this.detect();
    const recommendations: string[] = [];
    
    // Calculate CPU score (0-100)
    const cpuCores = hardware.cpu.cores;
    const cpuSpeed = hardware.cpu.speed;
    let cpuScore = 0;
    
    if (cpuCores >= RECOMMENDED_REQUIREMENTS.cpu.minCores) {
      cpuScore = 100;
    } else if (cpuCores >= MIN_REQUIREMENTS.cpu.minCores) {
      cpuScore = 60 + ((cpuCores - MIN_REQUIREMENTS.cpu.minCores) / 
        (RECOMMENDED_REQUIREMENTS.cpu.minCores - MIN_REQUIREMENTS.cpu.minCores)) * 40;
    } else {
      cpuScore = Math.min(50, (cpuCores / MIN_REQUIREMENTS.cpu.minCores) * 60);
      recommendations.push(`CPU cores insufficient. Need at least ${MIN_REQUIREMENTS.cpu.minCores} cores, have ${cpuCores}`);
    }

    // Calculate memory score
    const totalMemGB = hardware.memory.total / (1024 ** 3);
    let memoryScore = 0;
    
    if (totalMemGB >= RECOMMENDED_REQUIREMENTS.memory.minTotalGB) {
      memoryScore = 100;
    } else if (totalMemGB >= MIN_REQUIREMENTS.memory.minTotalGB) {
      memoryScore = 60 + ((totalMemGB - MIN_REQUIREMENTS.memory.minTotalGB) / 
        (RECOMMENDED_REQUIREMENTS.memory.minTotalGB - MIN_REQUIREMENTS.memory.minTotalGB)) * 40;
    } else {
      memoryScore = Math.min(50, (totalMemGB / MIN_REQUIREMENTS.memory.minTotalGB) * 60);
      recommendations.push(`Insufficient RAM. Need at least ${MIN_REQUIREMENTS.memory.minTotalGB}GB, have ${totalMemGB.toFixed(1)}GB`);
    }

    // Calculate GPU score
    let gpuScore = 0;
    const hasNvidia = hardware.gpu.some(g => 
      g.name.toLowerCase().includes('nvidia') || g.vendor.toLowerCase().includes('nvidia')
    );
    const hasAmd = hardware.gpu.some(g => 
      g.name.toLowerCase().includes('amd') || g.vendor.toLowerCase().includes('amd') ||
      g.name.toLowerCase().includes('radeon')
    );
    const hasIntel = hardware.gpu.some(g => 
      g.name.toLowerCase().includes('intel')
    );
    
    const primaryGpu = hardware.gpu[0];
    const gpuMemoryGB = primaryGpu ? primaryGpu.memory / 1024 : 0;
    
    if (primaryGpu) {
      if (gpuMemoryGB >= RECOMMENDED_REQUIREMENTS.gpu.minMemoryGB) {
        gpuScore = 100;
      } else if (gpuMemoryGB >= MIN_REQUIREMENTS.gpu.minMemoryGB) {
        gpuScore = 60 + ((gpuMemoryGB - MIN_REQUIREMENTS.gpu.minMemoryGB) / 
          (RECOMMENDED_REQUIREMENTS.gpu.minMemoryGB - MIN_REQUIREMENTS.gpu.minMemoryGB)) * 40;
      } else {
        gpuScore = Math.min(50, (gpuMemoryGB / MIN_REQUIREMENTS.gpu.minMemoryGB) * 60);
        recommendations.push(`Insufficient GPU memory. Need at least ${MIN_REQUIREMENTS.gpu.minMemoryGB}GB, have ${gpuMemoryGB.toFixed(1)}GB`);
      }
    } else {
      recommendations.push('No GPU detected. A GPU is required for local AI model inference.');
    }

    // Calculate disk score
    const freeDiskGB = hardware.disk.available / (1024 ** 3);
    let diskScore = 0;
    
    if (freeDiskGB >= RECOMMENDED_REQUIREMENTS.disk.minFreeGB) {
      diskScore = 100;
    } else if (freeDiskGB >= MIN_REQUIREMENTS.disk.minFreeGB) {
      diskScore = 60 + ((freeDiskGB - MIN_REQUIREMENTS.disk.minFreeGB) / 
        (RECOMMENDED_REQUIREMENTS.disk.minFreeGB - MIN_REQUIREMENTS.disk.minFreeGB)) * 40;
    } else {
      diskScore = Math.min(50, (freeDiskGB / MIN_REQUIREMENTS.disk.minFreeGB) * 60);
      recommendations.push(`Insufficient disk space. Need at least ${MIN_REQUIREMENTS.disk.minFreeGB}GB free, have ${freeDiskGB.toFixed(1)}GB`);
    }

    // Calculate overall score (weighted average)
    const overallScore = Math.round(
      cpuScore * 0.25 + 
      memoryScore * 0.25 + 
      gpuScore * 0.35 + 
      diskScore * 0.15
    );

    // Determine if requirements are met
    const meetsRequirements = 
      cpuScore >= 60 && 
      memoryScore >= 60 && 
      gpuScore >= 60 && 
      diskScore >= 60;

    if (!meetsRequirements && recommendations.length === 0) {
      recommendations.push('Your hardware does not meet the minimum requirements for running local AI models.');
    }

    if (meetsRequirements && !hasNvidia && !hasAmd) {
      recommendations.push('For optimal performance, we recommend using an NVIDIA or AMD GPU.');
    }

    return {
      meetsRequirements,
      cpuScore: Math.round(cpuScore),
      memoryScore: Math.round(memoryScore),
      gpuScore: Math.round(gpuScore),
      diskScore: Math.round(diskScore),
      overallScore,
      recommendations,
    };
  }

  getSystemInfo(): { platform: string; arch: string; cpus: number; memory: number } {
    return {
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      memory: Math.round(os.totalmem() / (1024 ** 3)),
    };
  }
}