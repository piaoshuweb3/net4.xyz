// 代币工具函数测试

import { describe, it, expect } from 'vitest';
import {
  fromWei,
  toWei,
  formatToken,
  parseTokenAmount,
} from './index';

describe('代币工具', () => {
  describe('fromWei', () => {
    it('应该正确将 wei 转换为代币单位', () => {
      expect(fromWei(1000000000000000000n, 18)).toBe(1);
      expect(fromWei(500000000000000000n, 18)).toBe(0.5);
      expect(fromWei(0n, 18)).toBe(0);
    });

    it('应该处理不同的精度', () => {
      expect(fromWei(100n, 2)).toBe(1);
      expect(fromWei(10000n, 4)).toBe(1);
    });
  });

  describe('toWei', () => {
    it('应该正确将代币单位转换为 wei', () => {
      expect(toWei(1, 18)).toBe(1000000000000000000n);
      expect(toWei(0.5, 18)).toBe(500000000000000000n);
      expect(toWei(0, 18)).toBe(0n);
    });

    it('应该处理不同的精度', () => {
      expect(toWei(1, 2)).toBe(100n);
      expect(toWei(1, 4)).toBe(10000n);
    });
  });

  describe('formatToken', () => {
    it('应该正确格式化代币显示', () => {
      expect(formatToken(1000000000000000000n, 18, 'AFC')).toBe('1 AFC');
      expect(formatToken(1500000000000000000n, 18, 'AFC')).toBe('1.5 AFC');
    });

    it('应该使用默认符号', () => {
      expect(formatToken(1000000000000000000n)).toBe('1 AFC');
    });
  });

  describe('parseTokenAmount', () => {
    it('应该解析字符串数字', () => {
      expect(parseTokenAmount('1', 18)).toBe(1000000000000000000n);
      expect(parseTokenAmount('0.5', 18)).toBe(500000000000000000n);
    });

    it('应该解析数字', () => {
      expect(parseTokenAmount(1, 18)).toBe(1000000000000000000n);
      expect(parseTokenAmount(0.5, 18)).toBe(500000000000000000n);
    });

    it('应该处理科学计数法', () => {
      expect(parseTokenAmount('1e18', 18)).toBe(1000000000000000000n);
      expect(parseTokenAmount('1e-1', 18)).toBe(100000000000000000n);
    });
  });
});