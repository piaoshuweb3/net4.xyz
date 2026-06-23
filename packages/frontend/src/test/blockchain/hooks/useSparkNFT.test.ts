/**
 * Spark NFT Hooks 单元测试
 * 测试 NFT 铸造、查询、转移等功能
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

// Import hooks after mocking
import {
  useSparkNFTInfo,
  useSparkNFTBalance,
  useSparkNFTTokenURI,
  useSparkNFTMint,
  useSparkNFTOwner,
} from '../../../hooks/useSparkNFT';

describe('useSparkNFTInfo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该返回 NFT 信息', () => {
    mockUseReadContract
      .mockReturnValueOnce({ data: 'Spark NFT', isLoading: false, error: null })
      .mockReturnValueOnce({ data: 'SPARK', isLoading: false, error: null });

    const { result } = renderHook(() => useSparkNFTInfo(84532));

    expect(result.current).toEqual({
      name: 'Spark NFT',
      symbol: 'SPARK',
    });
  });

  it('应该调用正确的合约函数', () => {
    mockUseReadContract
      .mockReturnValueOnce({ data: 'Test NFT', isLoading: false, error: null })
      .mockReturnValueOnce({ data: 'TEST', isLoading: false, error: null });

    renderHook(() => useSparkNFTInfo(84532));

    expect(mockUseReadContract).toHaveBeenCalledTimes(2);
    expect(mockUseReadContract).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ functionName: 'name' })
    );
    expect(mockUseReadContract).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ functionName: 'symbol' })
    );
  });
});

describe('useSparkNFTBalance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该正确配置查询 NFT 余额', () => {
    mockUseReadContract.mockReturnValue({
      data: 5,
      isLoading: false,
      error: null,
    });

    const address = '0x1234567890123456789012345678901234567890' as `0x${string}`;
    const { result: _result } = renderHook(() =>
      useSparkNFTBalance(address, 84532)
    );

    expect(mockUseReadContract).toHaveBeenCalledWith(
      expect.objectContaining({
        functionName: 'balanceOf',
        args: [address],
      })
    );
  });

  it('当地址未提供时应该禁用查询', () => {
    mockUseReadContract.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    });

    const { result: _result } = renderHook(() => useSparkNFTBalance(undefined, 84532));

    expect(mockUseReadContract).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.objectContaining({
          enabled: false,
        }),
      })
    );
  });
});

describe('useSparkNFTTokenURI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该正确配置查询 Token URI', () => {
    mockUseReadContract.mockReturnValue({
      data: 'ipfs://Qm...',
      isLoading: false,
      error: null,
    });

    const tokenId = BigInt(1);
    const { result: _result } = renderHook(() =>
      useSparkNFTTokenURI(tokenId, 84532)
    );

    expect(mockUseReadContract).toHaveBeenCalledWith(
      expect.objectContaining({
        functionName: 'tokenURI',
        args: [tokenId],
      })
    );
  });

  it('当 tokenId 未提供时应该禁用查询', () => {
    mockUseReadContract.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    });

    const { result: _result } = renderHook(() =>
      useSparkNFTTokenURI(undefined, 84532)
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

describe('useSparkNFTMint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该配置铸造功能', () => {
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

    const { result } = renderHook(() => useSparkNFTMint());

    expect(result.current).toHaveProperty('mint');
    expect(result.current).toHaveProperty('hash');
    expect(result.current).toHaveProperty('isPending');
    expect(result.current).toHaveProperty('isConfirming');
    expect(result.current).toHaveProperty('isConfirmed');
    expect(result.current).toHaveProperty('error');
    expect(typeof result.current.mint).toBe('function');
  });
});

describe('useSparkNFTOwner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该正确配置查询 NFT 所有者', () => {
    mockUseReadContract.mockReturnValue({
      data: '0x1234567890123456789012345678901234567890',
      isLoading: false,
      error: null,
    });

    const tokenId = BigInt(1);
    const { result: _result } = renderHook(() => useSparkNFTOwner(tokenId, 84532));

    expect(mockUseReadContract).toHaveBeenCalledWith(
      expect.objectContaining({
        functionName: 'ownerOf',
        args: [tokenId],
      })
    );
  });

  it('当 tokenId 未提供时应该禁用查询', () => {
    mockUseReadContract.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    });

    const { result: _result } = renderHook(() => useSparkNFTOwner(undefined, 84532));

    expect(mockUseReadContract).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.objectContaining({
          enabled: false,
        }),
      })
    );
  });
});
