declare module 'systeminformation' {
  export interface CpuInfo {
    brand?: string;
    cores?: number;
    speed?: number;
    manufacturer?: string;
  }

  export interface MemInfo {
    total: number;
    available: number;
    used: number;
  }

  export interface DiskInfo {
    size: number;
    available: number;
  }

  export interface NetworkInfo {
    ip4?: string;
    type?: string;
    internal?: boolean;
  }

  export interface GraphicsController {
    model?: string;
    vram?: number;
    vendor?: string;
  }

  export interface GraphicsInfo {
    controllers: GraphicsController[];
  }

  export function cpu(): Promise<CpuInfo>;
  export function mem(): Promise<MemInfo>;
  export function fsSize(): Promise<DiskInfo[]>;
  export function networkInterfaces(): Promise<NetworkInfo[]>;
  export function graphics(): Promise<GraphicsInfo>;
}