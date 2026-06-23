/**
 * AFCTokenPanel 组件测试
 * 测试代币面板的 UI 渲染和交互
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// ===========================================
// 1. Mock viem first (before wagmi)
// ===========================================
vi.mock('viem', () => ({
  formatEther: vi.fn((value: bigint) => {
    // 模拟 formatEther 转换
    const num = Number(value) / 1e18;
    return num.toFixed(2);
  }),
  parseEther: vi.fn((value: string) => BigInt(Math.floor(Number(value) * 1e18))),
}));

// ===========================================
// 2. Mock wagmi core hooks
// ===========================================
const mockUseAccount = vi.fn();
const mockUseReadContract = vi.fn();
const mockUseWriteContract = vi.fn();
const mockUseWaitForTransactionReceipt = vi.fn();

vi.mock('wagmi', () => ({
  useAccount: () => mockUseAccount(),
  useReadContract: () => mockUseReadContract(),
  useWriteContract: () => mockUseWriteContract(),
  useWaitForTransactionReceipt: () => mockUseWaitForTransactionReceipt(),
}));

// ===========================================
// 3. Mock config/contracts
// ===========================================
vi.mock('@/config/contracts', () => ({
  AFC_TOKEN_ABI: [
    {
      "type": "function",
      "name": "balanceOf",
      "inputs": [{ "name": "account", "type": "address" }],
      "outputs": [{ "type": "uint256" }],
    },
    {
      "type": "function",
      "name": "transfer",
      "inputs": [
        { "name": "to", "type": "address" },
        { "name": "amount", "type": "uint256" },
      ],
      "outputs": [{ "type": "bool" }],
    },
  ],
  getContractAddress: vi.fn((name: string, _chainId?: number) => {
    const addresses: Record<string, string> = {
      'AFC_TOKEN': '0x1234567890123456789012345678901234567890',
    };
    return addresses[name] || '0x0000000000000000000000000000000000000000';
  }),
}));

// ===========================================
// 4. Mock useAFCToken hooks
// ===========================================
vi.mock('../../../hooks/useAFCToken', () => {
  return {
    useAFCBalance: vi.fn(),
    useAFCTokenInfo: vi.fn(),
    useAFCTransfer: vi.fn(),
    useAFCApprove: vi.fn(),
    useAFCLock: vi.fn(),
    useAFCRelease: vi.fn(),
    useAFCLockedBalance: vi.fn(),
  };
});

// Import component and hooks after mocks
import AFCTokenPanel from '../../../components/Blockchain/AFCTokenPanel';
import {
  useAFCBalance,
  useAFCTokenInfo,
  useAFCTransfer,
  useAFCApprove,
  useAFCLock,
  useAFCRelease,
  useAFCLockedBalance,
} from '../../../hooks/useAFCToken';

describe('AFCTokenPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();

    // Setup default mocks
    mockUseAccount.mockReturnValue({
      address: '0x1234567890123456789012345678901234567890',
      chainId: 84532,
      isConnected: true,
    });

    // Mock useAFCBalance - 返回 { data: '1000.00' }
    vi.mocked(useAFCBalance).mockReturnValue({
      data: '1000.00',
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      status: 'success',
    } as any);

    // Mock useAFCLockedBalance - 返回 { data: '100.00' }
    vi.mocked(useAFCLockedBalance).mockReturnValue({
      data: '100.00',
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      status: 'success',
    } as any);

    // Mock useAFCTokenInfo - 返回代币信息
    vi.mocked(useAFCTokenInfo).mockReturnValue({
      name: 'AFC Token',
      symbol: 'AFC',
      decimals: 18,
      totalSupply: '1000000000.00',
    });

    // Mock useAFCTransfer
    vi.mocked(useAFCTransfer).mockReturnValue({
      transfer: vi.fn(),
      hash: undefined,
      isPending: false,
      isConfirming: false,
      isConfirmed: false,
      error: null,
    } as any);

    // Mock useAFCApprove
    vi.mocked(useAFCApprove).mockReturnValue({
      approve: vi.fn(),
      hash: undefined,
      isPending: false,
      isConfirming: false,
      isConfirmed: false,
      error: null,
    } as any);

    // Mock useAFCLock
    vi.mocked(useAFCLock).mockReturnValue({
      lock: vi.fn(),
      hash: undefined,
      isPending: false,
      isConfirming: false,
      isConfirmed: false,
      error: null,
    } as any);

    // Mock useAFCRelease
    vi.mocked(useAFCRelease).mockReturnValue({
      release: vi.fn(),
      hash: undefined,
      isPending: false,
      isConfirming: false,
      isConfirmed: false,
      error: null,
    } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('基础渲染测试', () => {
    it('应该渲染代币名称和符号', () => {
      render(<AFCTokenPanel />);
      expect(screen.getByText(/AFC Token/)).toBeInTheDocument();
      expect(screen.getByText(/\(AFC\)/)).toBeInTheDocument();
    });

    it('应该显示余额信息', () => {
      render(<AFCTokenPanel />);
      // 使用正则精确匹配
      expect(screen.getByText(/^余额$/)).toBeInTheDocument();
      expect(screen.getByText(/^锁定余额$/)).toBeInTheDocument();
      expect(screen.getByText(/^总供应量$/)).toBeInTheDocument();
    });

    it('应该显示余额数值', () => {
      render(<AFCTokenPanel />);
      expect(screen.getByText(/1000\.00 AFC/)).toBeInTheDocument();
      expect(screen.getByText(/100\.00 AFC/)).toBeInTheDocument();
    });

    it('应该渲染转账表单', () => {
      render(<AFCTokenPanel />);
      // 使用精确匹配 h3 标题
      expect(screen.getByRole('heading', { name: /^转账$/ })).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/接收地址 \(0x...\)/)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/转账金额/)).toBeInTheDocument();
    });

    it('应该渲染授权表单', () => {
      render(<AFCTokenPanel />);
      // 使用精确匹配 h3 标题
      expect(screen.getByRole('heading', { name: /^授权$/ })).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/授权地址 \(0x...\)/)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/授权金额/)).toBeInTheDocument();
    });

    it('应该渲染代币锁定表单', () => {
      render(<AFCTokenPanel />);
      expect(screen.getByText(/代币锁定/)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/锁定金额/)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/锁定天数/)).toBeInTheDocument();
    });

    it('当有锁定余额时应该显示释放按钮', () => {
      render(<AFCTokenPanel />);
      expect(screen.getByText(/释放锁定代币/)).toBeInTheDocument();
    });

    it('当没有锁定余额时不应该显示释放按钮', () => {
      vi.mocked(useAFCLockedBalance).mockReturnValue({
        data: '0',
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        status: 'success',
      } as any);

      render(<AFCTokenPanel />);
      expect(screen.queryByText(/释放锁定代币/)).not.toBeInTheDocument();
    });
  });

  describe('交互测试', () => {
    it('转账按钮点击应该调用 transfer', async () => {
      const mockTransfer = vi.fn();
      vi.mocked(useAFCTransfer).mockReturnValue({
        transfer: mockTransfer,
        hash: undefined,
        isPending: false,
        isConfirming: false,
        isConfirmed: false,
        error: null,
      } as any);

      render(<AFCTokenPanel />);

      const addressInput = screen.getByPlaceholderText(/接收地址 \(0x...\)/);
      const amountInput = screen.getByPlaceholderText(/转账金额/);
      const transferButton = screen.getByRole('button', { name: /发送转账/ });

      fireEvent.change(addressInput, { target: { value: '0x0987654321098765432109876543210987654321' } });
      fireEvent.change(amountInput, { target: { value: '100' } });
      fireEvent.click(transferButton);

      expect(mockTransfer).toHaveBeenCalledWith(
        '0x0987654321098765432109876543210987654321',
        '100'
      );
    });

    it('授权按钮点击应该调用 approve', () => {
      const mockApprove = vi.fn();
      vi.mocked(useAFCApprove).mockReturnValue({
        approve: mockApprove,
        hash: undefined,
        isPending: false,
        isConfirming: false,
        isConfirmed: false,
        error: null,
      } as any);

      render(<AFCTokenPanel />);

      const spenderInput = screen.getByPlaceholderText(/授权地址 \(0x...\)/);
      const amountInput = screen.getByPlaceholderText(/授权金额/);
      const approveButton = screen.getByRole('button', { name: /授权/ });

      fireEvent.change(spenderInput, { target: { value: '0x0987654321098765432109876543210987654321' } });
      fireEvent.change(amountInput, { target: { value: '500' } });
      fireEvent.click(approveButton);

      expect(mockApprove).toHaveBeenCalledWith(
        '0x0987654321098765432109876543210987654321',
        '500'
      );
    });

    it('锁定按钮点击应该调用 lock', () => {
      const mockLock = vi.fn();
      vi.mocked(useAFCLock).mockReturnValue({
        lock: mockLock,
        hash: undefined,
        isPending: false,
        isConfirming: false,
        isConfirmed: false,
        error: null,
      } as any);

      render(<AFCTokenPanel />);

      const amountInput = screen.getByPlaceholderText(/锁定金额/);
      const lockButton = screen.getByRole('button', { name: /锁定代币/ });

      fireEvent.change(amountInput, { target: { value: '50' } });
      fireEvent.click(lockButton);

      expect(mockLock).toHaveBeenCalled();
    });

    it('释放按钮点击应该调用 release', () => {
      const mockRelease = vi.fn();
      vi.mocked(useAFCRelease).mockReturnValue({
        release: mockRelease,
        hash: undefined,
        isPending: false,
        isConfirming: false,
        isConfirmed: false,
        error: null,
      } as any);

      render(<AFCTokenPanel />);

      const releaseButton = screen.getByRole('button', { name: /释放代币/ });
      fireEvent.click(releaseButton);

      expect(mockRelease).toHaveBeenCalled();
    });
  });

  describe('状态显示测试', () => {
    it('当转账进行中时按钮应该显示处理中', () => {
      vi.mocked(useAFCTransfer).mockReturnValue({
        transfer: vi.fn(),
        hash: undefined,
        isPending: true,
        isConfirming: false,
        isConfirmed: false,
        error: null,
      } as any);

      render(<AFCTokenPanel />);
      expect(screen.getByText(/处理中\.\.\./)).toBeInTheDocument();
    });

    it('当授权进行中时按钮应该显示处理中', () => {
      vi.mocked(useAFCApprove).mockReturnValue({
        approve: vi.fn(),
        hash: undefined,
        isPending: true,
        isConfirming: false,
        isConfirmed: false,
        error: null,
      } as any);

      render(<AFCTokenPanel />);
      // 查找两个"处理中..." - 转账和授权
      const processingTexts = screen.getAllByText(/处理中\.\.\./);
      expect(processingTexts.length).toBeGreaterThanOrEqual(1);
    });

    it('转账成功时应该显示成功消息', () => {
      vi.mocked(useAFCTransfer).mockReturnValue({
        transfer: vi.fn(),
        hash: '0xabcdef',
        isPending: false,
        isConfirming: false,
        isConfirmed: true,
        error: null,
      } as any);

      render(<AFCTokenPanel />);
      expect(screen.getByText(/✓ 转账成功！/)).toBeInTheDocument();
    });

    it('授权成功时应该显示成功消息', () => {
      vi.mocked(useAFCApprove).mockReturnValue({
        approve: vi.fn(),
        hash: '0xabcdef',
        isPending: false,
        isConfirming: false,
        isConfirmed: true,
        error: null,
      } as any);

      render(<AFCTokenPanel />);
      expect(screen.getByText(/✓ 授权成功！/)).toBeInTheDocument();
    });

    it('锁定成功时应该显示成功消息', () => {
      vi.mocked(useAFCLock).mockReturnValue({
        lock: vi.fn(),
        hash: '0xabcdef',
        isPending: false,
        isConfirming: false,
        isConfirmed: true,
        error: null,
      } as any);

      render(<AFCTokenPanel />);
      expect(screen.getByText(/✓ 代币锁定成功！/)).toBeInTheDocument();
    });

    it('释放成功时应该显示成功消息', () => {
      vi.mocked(useAFCRelease).mockReturnValue({
        release: vi.fn(),
        hash: '0xabcdef',
        isPending: false,
        isConfirming: false,
        isConfirmed: true,
        error: null,
      } as any);

      render(<AFCTokenPanel />);
      expect(screen.getByText(/✓ 代币释放成功！/)).toBeInTheDocument();
    });
  });
});
