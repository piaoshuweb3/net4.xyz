// net4.xyz 工具函数库

// ==================== 地址工具 ====================

/**
 * 格式化地址显示（截取中间部分）
 */
export function formatAddress(address: string, chars: number = 4): string {
  if (!address || address.length < chars * 2 + 3) {
    return address;
  }
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/**
 * 验证 Ethereum 地址格式
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * 规范化地址（转小写）
 */
export function normalizeAddress(address: string): string {
  return address.toLowerCase();
}

/**
 * 比较两个地址是否相等
 */
export function addressesEqual(a: string, b: string): boolean {
  return normalizeAddress(a) === normalizeAddress(b);
}

// ==================== 代币工具 ====================

/**
 * 将 wei 转换为代币单位
 */
export function fromWei(value: bigint, decimals: number = 18): number {
  return Number(value) / Math.pow(10, decimals);
}

/**
 * 将代币单位转换为 wei
 */
export function toWei(value: number, decimals: number = 18): bigint {
  return BigInt(Math.floor(value * Math.pow(10, decimals)));
}

/**
 * 格式化代币显示
 */
export function formatToken(value: bigint, decimals: number = 18, symbol: string = 'AFC'): string {
  const formatted = fromWei(value, decimals);
  return `${formatted.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${symbol}`;
}

/**
 * 解析代币金额（支持 "100" 或 "100.5" 或 "1e18"）
 */
export function parseTokenAmount(value: string | number, decimals: number = 18): bigint {
  if (typeof value === 'number') {
    return toWei(value, decimals);
  }
  
  // 处理科学计数法
  if (value.toLowerCase().includes('e')) {
    const [base, exponent] = value.toLowerCase().split('e');
    return toWei(parseFloat(base) * Math.pow(10, parseInt(exponent)), decimals);
  }
  
  return toWei(parseFloat(value), decimals);
}

// ==================== 时间工具 ====================

/**
 * 格式化时间戳为可读日期
 */
export function formatDate(timestamp: number | Date): string {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp * 1000);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * 格式化相对时间
 */
export function formatRelativeTime(timestamp: number | Date): string {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp * 1000);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}天前`;
  if (hours > 0) return `${hours}小时前`;
  if (minutes > 0) return `${minutes}分钟前`;
  return '刚刚';
}

/**
 * 计算锁定结束时间
 */
export function calculateLockEnd(duration: number): number {
  return Math.floor(Date.now() / 1000) + duration;
}

/**
 * 检查是否已解锁
 */
export function isUnlocked(lockEndTime: number): boolean {
  return lockEndTime > 0 && Math.floor(Date.now() / 1000) >= lockEndTime;
}

// ==================== 格式化工具 ====================

/**
 * 格式化数字（千分位）
 */
export function formatNumber(value: number, decimals: number = 0): string {
  return value.toLocaleString('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * 格式化百分比
 */
export function formatPercent(value: number, decimals: number = 2): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let unitIndex = 0;
  let size = bytes;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

// ==================== 验证工具 ====================

/**
 * 验证邮箱格式
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * 验证 Twitter 用户名
 */
export function isValidTwitter(username: string): boolean {
  return /^@?[a-zA-Z0-9_]{1,15}$/.test(username);
}

/**
 * 验证域名格式（不含 .web4 后缀）
 */
export function isValidDomainName(name: string): boolean {
  return /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]$/.test(name);
}

/**
 * 验证 .web4 域名
 */
export function isValidWeb4Domain(name: string): boolean {
  const domain = name.replace(/\.web4$/i, '');
  return isValidDomainName(domain);
}

// ==================== 哈希工具 ====================

/**
 * 生成随机哈希
 */
export function generateHash(): string {
  return `0x${Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')}`;
}

/**
 * 计算字符串哈希
 */
export async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return `0x${hashArray.map(b => b.toString(16).padStart(2, '0')).join('')}`;
}

// ==================== 数组工具 ====================

/**
 * 分页数组
 */
export function paginate<T>(array: T[], page: number, limit: number): T[] {
  const start = (page - 1) * limit;
  return array.slice(start, start + limit);
}

/**
 * 去重数组
 */
export function unique<T>(array: T[]): T[] {
  return Array.from(new Set(array));
}

/**
 * 分组数组
 */
export function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((groups, item) => {
    const groupKey = String(item[key]);
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(item);
    return groups;
  }, {} as Record<string, T[]>);
}

// ==================== 对象工具 ====================

/**
 * 深度克隆对象
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * 过滤对象 undefined 值
 */
export function filterUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined)
  ) as Partial<T>;
}

/**
 * 合并对象（仅保留已定义的属性）
 */
export function mergeDefined<T extends Record<string, unknown>>(
  target: T,
  source: Partial<T>
): T {
  return { ...target, ...filterUndefined(source) };
}

// ==================== 错误处理工具 ====================

/**
 * 解析合约错误
 */
export function parseContractError(error: unknown): string {
  if (typeof error === 'string') {
    return error;
  }
  
  if (error instanceof Error) {
    // ethers.js 错误格式
    if (error.message.includes('execution reverted')) {
      const match = error.message.match(/execution reverted: (.+?)(?:\n|$)/);
      if (match) {
        return match[1];
      }
    }
    return error.message;
  }
  
  return 'Unknown error';
}

/**
 * 等待指定时间
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 重试函数
 */
export async function retry<T>(
  fn: () => Promise<T>,
  attempts: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < attempts - 1) {
        await delay(delayMs * Math.pow(2, i)); // 指数退避
      }
    }
  }
  
  throw lastError;
}

// ==================== 浏览器工具 ====================

/**
 * 检查是否为移动设备
 */
export function isMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

/**
 * 检查是否为钱包浏览器
 */
export function isWalletBrowser(): boolean {
  if (typeof window === 'undefined') return false;
  const userAgent = navigator.userAgent.toLowerCase();
  return /metamask|trust|tokenpocket|rainbow|coinbase|brave/i.test(userAgent);
}

/**
 * 获取钱包类型
 */
export function getWalletType(): string | null {
  if (typeof window === 'undefined') return null;
  
  const ua = navigator.userAgent.toLowerCase();
  
  if (ua.includes('metamask')) return 'metamask';
  if (ua.includes('trust')) return 'trust';
  if (ua.includes('tokenpocket')) return 'tokenpocket';
  if (ua.includes('rainbow')) return 'rainbow';
  if (ua.includes('coinbase')) return 'coinbase';
  
  return null;
}

// ==================== 存储工具 ====================

const STORAGE_PREFIX = 'net4xyz_';

/**
 * 安全存储（支持 SSR）
 */
export function safeSetItem(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(value));
  } catch (e) {
    console.warn('Failed to save to localStorage:', e);
  }
}

/**
 * 安全读取
 */
export function safeGetItem<T>(key: string, defaultValue?: T): T | undefined {
  if (typeof window === 'undefined') return defaultValue;
  
  try {
    const item = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    console.warn('Failed to read from localStorage:', e);
    return defaultValue;
  }
}

/**
 * 安全删除
 */
export function safeRemoveItem(key: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${key}`);
  } catch (e) {
    console.warn('Failed to remove from localStorage:', e);
  }
}

// ==================== 导出所有工具 ====================

export * from './index';