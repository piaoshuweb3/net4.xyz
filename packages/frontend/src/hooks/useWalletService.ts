/**
 * 钱包服务 Hooks
 * 封装与 AI Engine 钱包服务的交互
 */
import { useState, useCallback } from 'react';

const AI_ENGINE_URL = process.env.NEXT_PUBLIC_AI_ENGINE_URL || 'http://localhost:8000';

// ==================== 类型定义 ====================

export interface WalletStatus {
  authenticated: boolean;
  address?: string;
  network?: string;
}

export interface Balance {
  asset: string;
  amount: string;
  chain: string;
  address: string;
}

export interface TransactionResult {
  success: boolean;
  tx_hash?: string;
  from_address?: string;
  to_address?: string;
  amount?: string;
  asset?: string;
  chain?: string;
  error?: string;
}

export interface TradeResult {
  success: boolean;
  tx_hash?: string;
  from_asset?: string;
  to_asset?: string;
  from_amount?: string;
  to_amount?: string;
  chain?: string;
  error?: string;
}

export interface QueryResult {
  success: boolean;
  data?: any[];
  error?: string;
}

// ==================== 钱包状态 Hook ====================

export function useWalletStatus() {
  const [status, setStatus] = useState<WalletStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${AI_ENGINE_URL}/api/v1/wallet/status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setStatus(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch wallet status';
      setError(errorMessage);
      console.error('Wallet status error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { status, isLoading, error, fetchStatus };
}

// ==================== 余额查询 Hook ====================

export function useWalletBalance() {
  const [balance, setBalance] = useState<Balance | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async (asset: string = 'usdc', chain: string = 'base') => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${AI_ENGINE_URL}/api/v1/wallet/balance?asset=${asset}&chain=${chain}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setBalance(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch balance';
      setError(errorMessage);
      console.error('Balance fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { balance, isLoading, error, fetchBalance };
}

// ==================== 发送代币 Hook ====================

export function useWalletSend() {
  const [result, setResult] = useState<TransactionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(
    async (
      amount: string,
      recipient: string,
      asset: string = 'usdc',
      chain: string = 'base'
    ) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`${AI_ENGINE_URL}/api/v1/wallet/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount,
            recipient,
            asset,
            chain,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setResult(data);

        if (!data.success) {
          setError(data.error || 'Transaction failed');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to send transaction';
        setError(errorMessage);
        console.error('Send transaction error:', err);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return { result, isLoading, error, send };
}

// ==================== 交易代币 Hook ====================

export function useWalletTrade() {
  const [result, setResult] = useState<TradeResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trade = useCallback(
    async (
      amount: string,
      fromAsset: string,
      toAsset: string,
      chain: string = 'base',
      slippage?: number
    ) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`${AI_ENGINE_URL}/api/v1/wallet/trade`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount,
            from_asset: fromAsset,
            to_asset: toAsset,
            chain,
            slippage,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setResult(data);

        if (!data.success) {
          setError(data.error || 'Trade failed');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to execute trade';
        setError(errorMessage);
        console.error('Trade error:', err);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return { result, isLoading, error, trade };
}

// ==================== 链上查询 Hook ====================

export function useWalletQuery() {
  const [result, setResult] = useState<QueryResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const query = useCallback(async (sql: string, timeout: number = 30) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${AI_ENGINE_URL}/api/v1/wallet/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sql,
          timeout,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setResult(data);

      if (!data.success) {
        setError(data.error || 'Query failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to execute query';
      setError(errorMessage);
      console.error('Query error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { result, isLoading, error, query };
}

// ==================== 钱包认证 Hook ====================

export function useWalletAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const authenticate = useCallback(async (email: string) => {
    setIsLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`${AI_ENGINE_URL}/api/v1/wallet/auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setMessage(data.message);

      if (!data.success) {
        setError(data.error || 'Authentication failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to authenticate';
      setError(errorMessage);
      console.error('Authentication error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { isLoading, error, message, authenticate };
}

// ==================== AFC Token 专用 Hooks ====================

/**
 * 获取 AFC Token 余额（Base 链上的 1:1 USDC 映射）
 */
export function useAFCBalanceOnBase() {
  const { balance, isLoading, error, fetchBalance } = useWalletBalance();

  const fetchAFCBalance = useCallback(() => {
    return fetchBalance('usdc', 'base');
  }, [fetchBalance]);

  return {
    balance: balance
      ? {
          ...balance,
          asset: 'AFC', // 显示为 AFC
        }
      : null,
    isLoading,
    error,
    fetchAFCBalance,
  };
}

/**
 * 发送 AFC Token（Base 链上的 1:1 USDC 映射）
 */
export function useAFCSend() {
  const { result, isLoading, error, send } = useWalletSend();

  const sendAFC = useCallback(
    (amount: string, recipient: string) => {
      return send(amount, recipient, 'usdc', 'base');
    },
    [send]
  );

  return {
    result: result
      ? {
          ...result,
          asset: 'AFC', // 显示为 AFC
        }
      : null,
    isLoading,
    error,
    sendAFC,
  };
}

/**
 * AFC Token 与 ETH 交易
 */
export function useAFCTrade() {
  const { result, isLoading, error, trade } = useWalletTrade();

  const tradeAFCToETH = useCallback(
    (amount: string, slippage?: number) => {
      return trade(amount, 'usdc', 'eth', 'base', slippage);
    },
    [trade]
  );

  const tradeETHToAFC = useCallback(
    (amount: string, slippage?: number) => {
      return trade(amount, 'eth', 'usdc', 'base', slippage);
    },
    [trade]
  );

  return {
    result: result
      ? {
          ...result,
          from_asset: result.from_asset === 'usdc' ? 'AFC' : result.from_asset,
          to_asset: result.to_asset === 'usdc' ? 'AFC' : result.to_asset,
        }
      : null,
    isLoading,
    error,
    tradeAFCToETH,
    tradeETHToAFC,
  };
}
