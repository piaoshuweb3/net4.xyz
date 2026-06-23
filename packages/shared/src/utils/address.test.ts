// 地址工具函数测试

import { describe, it, expect } from 'vitest';
import {
  formatAddress,
  isValidAddress,
  normalizeAddress,
  addressesEqual,
} from './index';

describe('地址工具', () => {
  describe('formatAddress', () => {
    it('应该正确截断地址', () => {
      const address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0eB12';
      expect(formatAddress(address, 4)).toBe('0x742d...eB12');
    });

    it('应该处理短地址', () => {
      const address = '0x742d';
      expect(formatAddress(address, 4)).toBe('0x742d');
    });

    it('应该处理空地址', () => {
      expect(formatAddress('')).toBe('');
      expect(formatAddress('0x')).toBe('0x');
    });

    it('应该使用默认截断长度', () => {
      const address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0eB12';
      expect(formatAddress(address)).toBe('0x742d...eB12');
    });
  });

  describe('isValidAddress', () => {
    it('应该验证有效的 Ethereum 地址', () => {
      expect(isValidAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f0eB12')).toBe(true);
    });

    it('应该拒绝无效地址', () => {
      expect(isValidAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f0e')).toBe(false);
      expect(isValidAddress('742d35Cc6634C0532925a3b844Bc9e7595f0eB12')).toBe(false);
      expect(isValidAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f0eB12GG')).toBe(false);
      expect(isValidAddress('')).toBe(false);
    });

    it('应该处理大小写', () => {
      expect(isValidAddress('0x742D35CC6634C0532925A3B844BC9E7595F0EB12')).toBe(true);
      expect(isValidAddress('0x742d35cc6634c0532925a3b844bc9e7595f0eb12')).toBe(true);
    });
  });

  describe('normalizeAddress', () => {
    it('应该将地址转为小写', () => {
      expect(normalizeAddress('0x742D35CC6634C0532925A3B844BC9E7595F0EB12'))
        .toBe('0x742d35cc6634c0532925a3b844bc9e7595f0eb12');
    });
  });

  describe('addressesEqual', () => {
    it('应该正确比较地址（忽略大小写）', () => {
      expect(addressesEqual(
        '0x742D35Cc6634C0532925a3b844Bc9e7595f0eB12',
        '0x742d35cc6634c0532925a3b844bc9e7595f0eb12'
      )).toBe(true);
    });

    it('应该正确识别不同地址', () => {
      expect(addressesEqual(
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0eB12',
        '0x1111111111111111111111111111111111111111'
      )).toBe(false);
    });
  });
});