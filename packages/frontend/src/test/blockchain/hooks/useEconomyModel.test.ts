/**
 * Economy Model Hooks 单元测试
 * 测试代币兑换、流动性管理等功能
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
  useTokenPrice,
  useTokenLiquidity,
  useSwap,
  useAddLiquidity,
  useRemoveLiquidity,
} from '../../../hooks/useEconomyModel';

describe('useTokenPrice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该正确配置查询代币价格', () => {
    mockUseReadContract.mockReturnValue({
      data: BigInt('1000000000000000000'), // 1 ETH
      isLoading: false,
      error: null,
    });

    const tokenAddress = '0x1234567890123456789012345678901234567890' as `0x${string}`;
    const { result: _result } = renderHook(() => useTokenPrice(tokenAddress, 11155111));

    expect(mockUseReadContract).toHaveBeenCalledWith(
      expect.objectContaining({
        functionName: 'getPrice',
        args: [tokenAddress],
      })
    );
  });

  it('当 tokenAddress 未提供时应该禁用查询', () => {
    mockUseReadContract.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    });

    const { result: _result } = renderHook(() => useTokenPrice(undefined, 11155111));

    expect(mockUseReadContract).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.objectContaining({
          enabled: false,
        }),
      })
    );
  });
});

describe('useTokenLiquidity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该正确配置查询代币流动性', () => {
    mockUseReadContract.mockReturnValue({
      data: BigInt('1000000000000000000000'), // 1000 ETH
      isLoading: false,
      error: null,
    });

    const tokenAddress = '0x1234567890123456789012345678901234567890' as `0x${string}`;
    const { result: _result } = renderHook(() =>
      useTokenLiquidity(tokenAddress, 11155111)
    );

    expect(mockUseReadContract).toHaveBeenCalledWith(
      expect.objectContaining({
        functionName: 'getLiquidity',
        args: [tokenAddress],
      })
    );
  });

  it('当 tokenAddress 未提供时应该禁用查询', () => {
    mockUseReadContract.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    });

    const { result: _result } = renderHook(() =>
      useTokenLiquidity(undefined, 11155111)
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

describe('useSwap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该配置兑换功能', () => {
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

    const { result } = renderHook(() => useSwap());

    expect(result.current).toHaveProperty('swap');
    expect(result.current).toHaveProperty('hash');
    expect(result.current).toHaveProperty('isPending');
    expect(result.current).toHaveProperty('isConfirming');
    expect(result.current).toHaveProperty('isConfirmed');
    expect(result.current).toHaveProperty('error');
    expect(typeof result.current.swap).toBe('function');
  });

  it('swap 函数应该调用 writeContract', () => {
    const mockWriteContract = vi.fn();
    mockUseWriteContract.mockReturnValue({
      data: '0xabc...',
      writeContract: mockWriteContract,
      isPending: true,
      error: null,
    });
    mockUseWaitForTransactionReceipt.mockReturnValue({
      isLoading: false,
      isSuccess: false,
    });

    const { result } = renderHook(() => useSwap());

    const tokenIn = '0x1234567890123456789012345678901234567890' as `0x${string}`;
    const tokenOut = '0x0987654321098765432109876543210987654321' as `0x${string}`;

    result.current.swap(tokenIn, tokenOut, '100');

    expect(mockWriteContract).toHaveBeenCalledWith(
      expect.objectContaining({
        functionName: 'swap',
        args: expect.arrayContaining([tokenIn, tokenOut]),
      })
    );
  });
});

describe('useAddLiquidity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该配置添加流动性功能', () => {
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

    const { result } = renderHook(() => useAddLiquidity());

    expect(result.current).toHaveProperty('addLiquidity');
    expect(result.current).toHaveProperty('hash');
    expect(result.current).toHaveProperty('isPending');
    expect(result.current).toHaveProperty('isConfirming');
    expect(result.current).toHaveProperty('isConfirmed');
    expect(result.current).toHaveProperty('error');
    expect(typeof result.current.addLiquidity).toBe('function');
  });

  it('addLiquidity 函数应该调用 writeContract', () => {
    const mockWriteContract = vi.fn();
    mockUseWriteContract.mockReturnValue({
      data: '0xdef...',
      writeContract: mockWriteContract,
      isPending: true,
      error: null,
    });
    mockUseWaitForTransactionReceipt.mockReturnValue({
      isLoading: false,
      isSuccess: false,
    });

    const { result } = renderHook(() => useAddLiquidity());

    const token = '0x1234567890123456789012345678901234567890' as `0x${string}`;

    result.current.addLiquidity(token, '500');

    expect(mockWriteContract).toHaveBeenCalledWith(
      expect.objectContaining({
        functionName: 'addLiquidity',
        args: expect.arrayContaining([token]),
      })
    );
  });
});

describe('useRemoveLiquidity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该配置移除流动性功能', () => {
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

    const { result } = renderHook(() => useRemoveLiquidity());

    expect(result.current).toHaveProperty('removeLiquidity');
    expect(result.current).toHaveProperty('hash');
    expect(result.current).toHaveProperty('isPending');
    expect(result.current).toHaveProperty('isConfirming');
    expect(result.current).toHaveProperty('isConfirmed');
    expect(result.current).toHaveProperty('error');
    expect(typeof result.current.removeLiquidity).toBe('function');
  });

  it('removeLiquidity 函数应该调用 writeContract', () => {
    const mockWriteContract = vi.fn();
    mockUseWriteContract.mockReturnValue({
      data: '0xghi...',
      writeContract: mockWriteContract,
      isPending: true,
      error: null,
    });
    mockUseWaitForTransactionReceipt.mockReturnValue({
      isLoading: false,
      isSuccess: false,
    });

    const { result } = renderHook(() => useRemoveLiquidity());

    const token = '0x1234567890123456789012345678901234567890' as `0x${string}`;

    result.current.removeLiquidity(token, '200');

    expect(mockWriteContract).toHaveBeenCalledWith(
      expect.objectContaining({
        functionName: 'removeLiquidity',
        args: expect.arrayContaining([token]),
      })
    );
  });
});
