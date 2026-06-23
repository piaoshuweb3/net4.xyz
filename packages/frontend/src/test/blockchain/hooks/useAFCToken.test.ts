/**
 * AFC Token Hooks 单元测试
 * 测试代币余额查询、转账、授权、锁定等功能
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

// Mock wagmi hooks
const mockUseReadContract = vi.fn();
const mockUseWriteContract = vi.fn();
const mockUseWaitForTransactionReceipt = vi.fn();

vi.mock('wagmi', () => ({
  useReadContract: (...args: any[]) => mockUseReadContract(...args),
  useWriteContract: (...args: any[]) => mockUseWriteContract(...args),
  useWaitForTransactionReceipt: (...args: any[]) => mockUseWaitForTransactionReceipt(...args),
}));

// Mock viem
vi.mock('viem', () => ({
  parseEther: (value: string) => BigInt(value) * BigInt(10 ** 18),
  formatEther: (value: bigint) => (value / BigInt(10 ** 18)).toString(),
}));

// Import hooks after mocking
import {
  useAFCBalance,
  useAFCTokenInfo,
  useAFCTransfer,
  useAFCApprove,
  useAFCAllowance,
  useAFCLock,
  useAFCLockedBalance,
  useAFCRelease,
} from '../../../hooks/useAFCToken';

describe('useAFCBalance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该正确配置读取代币余额', () => {
    mockUseReadContract.mockReturnValue({
      data: '1000',
      isLoading: false,
      error: null,
    });

    const { result: _result } = renderHook(() =>
      useAFCBalance('0x1234567890123456789012345678901234567890' as `0x${string}`, 11155111)
    );

    expect(mockUseReadContract).toHaveBeenCalledWith(
      expect.objectContaining({
        functionName: 'balanceOf',
        args: ['0x1234567890123456789012345678901234567890'],
      })
    );
  });

  it('当地址未提供时应该禁用查询', () => {
    mockUseReadContract.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    });

    const { result: _result } = renderHook(() => useAFCBalance(undefined, 11155111));

    expect(mockUseReadContract).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.objectContaining({
          enabled: false,
        }),
      })
    );
  });
});

describe('useAFCTokenInfo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该返回代币信息', () => {
    mockUseReadContract
      .mockReturnValueOnce({ data: 'AFC Token', isLoading: false, error: null })
      .mockReturnValueOnce({ data: 'AFC', isLoading: false, error: null })
      .mockReturnValueOnce({ data: 18, isLoading: false, error: null })
      .mockReturnValueOnce({ data: '1000000000', isLoading: false, error: null });

    const { result } = renderHook(() => useAFCTokenInfo(11155111));

    expect(result.current.name).toBe('AFC Token');
    expect(result.current.symbol).toBe('AFC');
    expect(result.current.decimals).toBe(18);
    expect(result.current.totalSupply).toBe('1000000000');
  });
});

describe('useAFCTransfer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该配置转账功能', () => {
    const mockWriteContract = vi.fn();
    mockUseWriteContract.mockReturnValue({
      data: undefined,
      writeContract: mockWriteContract,
      isPending: false,
      error: null,
    });
    mockUseWaitForTransactionReceipt.mockReturnValue({
      isLoading: false,
      isSuccess: false,
    });

    const { result } = renderHook(() => useAFCTransfer());

    expect(result.current).toHaveProperty('transfer');
    expect(result.current).toHaveProperty('hash');
    expect(result.current).toHaveProperty('isPending');
    expect(result.current).toHaveProperty('isConfirming');
    expect(result.current).toHaveProperty('isConfirmed');
    expect(result.current).toHaveProperty('error');
  });
});

describe('useAFCApprove', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该配置授权功能', () => {
    const mockWriteContract = vi.fn();
    mockUseWriteContract.mockReturnValue({
      data: undefined,
      writeContract: mockWriteContract,
      isPending: false,
      error: null,
    });
    mockUseWaitForTransactionReceipt.mockReturnValue({
      isLoading: false,
      isSuccess: false,
    });

    const { result } = renderHook(() => useAFCApprove());

    expect(result.current).toHaveProperty('approve');
    expect(result.current).toHaveProperty('hash');
    expect(result.current).toHaveProperty('isPending');
    expect(typeof result.current.approve).toBe('function');
  });
});

describe('useAFCAllowance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该正确配置查询授权额度', () => {
    mockUseReadContract.mockReturnValue({
      data: '500',
      isLoading: false,
      error: null,
    });

    const owner = '0x1234567890123456789012345678901234567890' as `0x${string}`;
    const spender = '0x0987654321098765432109876543210987654321' as `0x${string}`;

    const { result: _result } = renderHook(() =>
      useAFCAllowance(owner, spender, 11155111)
    );

    expect(mockUseReadContract).toHaveBeenCalledWith(
      expect.objectContaining({
        functionName: 'allowance',
        args: [owner, spender],
      })
    );
  });

  it('当 owner 或 spender 未提供时应该禁用查询', () => {
    mockUseReadContract.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    });

    const { result: _result } = renderHook(() =>
      useAFCAllowance(undefined, undefined, 11155111)
    );

    expect(mockUseReadContract).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.objectContaining({
          enabled: false,
        }),
      })
    );
  });
});

describe('useAFCLock', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该配置锁定功能', () => {
    const mockWriteContract = vi.fn();
    mockUseWriteContract.mockReturnValue({
      data: undefined,
      writeContract: mockWriteContract,
      isPending: false,
      error: null,
    });
    mockUseWaitForTransactionReceipt.mockReturnValue({
      isLoading: false,
      isSuccess: false,
    });

    const { result } = renderHook(() => useAFCLock());

    expect(result.current).toHaveProperty('lock');
    expect(result.current).toHaveProperty('hash');
    expect(typeof result.current.lock).toBe('function');
  });
});

describe('useAFCLockedBalance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该正确配置查询锁定余额', () => {
    mockUseReadContract.mockReturnValue({
      data: '100',
      isLoading: false,
      error: null,
    });

    const address = '0x1234567890123456789012345678901234567890' as `0x${string}`;

    const { result: _result } = renderHook(() =>
      useAFCLockedBalance(address, 11155111)
    );

    expect(mockUseReadContract).toHaveBeenCalledWith(
      expect.objectContaining({
        functionName: 'lockedBalanceOf',
        args: [address],
      })
    );
  });
});

describe('useAFCRelease', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该配置释放功能', () => {
    const mockWriteContract = vi.fn();
    mockUseWriteContract.mockReturnValue({
      data: undefined,
      writeContract: mockWriteContract,
      isPending: false,
      error: null,
    });
    mockUseWaitForTransactionReceipt.mockReturnValue({
      isLoading: false,
      isSuccess: false,
    });

    const { result } = renderHook(() => useAFCRelease());

    expect(result.current).toHaveProperty('release');
    expect(result.current).toHaveProperty('hash');
    expect(typeof result.current.release).toBe('function');
  });
});
