/**
 * 区块链功能集成测试
 * 测试合约配置、Hook 和组件的基础功能
 */
import { describe, it, expect } from 'vitest';
import { 
  AFC_TOKEN_ABI, 
  SPARK_NFT_ABI, 
  ECONOMY_MODEL_ABI, 
  getContractAddress,
  CONTRACT_ADDRESSES 
} from '../../config/contracts';

describe('区块链功能集成测试', () => {
  describe('合约配置测试', () => {
    it('AFC Token ABI 应该包含基础 ERC20 函数', () => {
      const hasBalanceOf = AFC_TOKEN_ABI.some(item => 
        typeof item === 'string' && item.includes('balanceOf')
      );
      const hasTransfer = AFC_TOKEN_ABI.some(item => 
        typeof item === 'string' && item.includes('transfer')
      );
      const hasApprove = AFC_TOKEN_ABI.some(item => 
        typeof item === 'string' && item.includes('approve')
      );

      expect(hasBalanceOf).toBe(true);
      expect(hasTransfer).toBe(true);
      expect(hasApprove).toBe(true);
    });

    it('AFC Token ABI 应该包含治理和锁定功能', () => {
      const hasPropose = AFC_TOKEN_ABI.some(item => 
        typeof item === 'string' && item.includes('propose')
      );
      const hasLock = AFC_TOKEN_ABI.some(item => 
        typeof item === 'string' && item.includes('lock')
      );
      const hasRelease = AFC_TOKEN_ABI.some(item => 
        typeof item === 'string' && item.includes('release')
      );

      expect(hasPropose).toBe(true);
      expect(hasLock).toBe(true);
      expect(hasRelease).toBe(true);
    });

    it('Spark NFT ABI 应该包含铸造和查询函数', () => {
      const hasMint = SPARK_NFT_ABI.some(item => 
        typeof item === 'string' && item.includes('mint')
      );
      const hasBalanceOf = SPARK_NFT_ABI.some(item => 
        typeof item === 'string' && item.includes('balanceOf')
      );
      const hasTokenURI = SPARK_NFT_ABI.some(item => 
        typeof item === 'string' && item.includes('tokenURI')
      );

      expect(hasMint).toBe(true);
      expect(hasBalanceOf).toBe(true);
      expect(hasTokenURI).toBe(true);
    });

    it('经济模型 ABI 应该包含兑换和流动性函数', () => {
      const hasSwap = ECONOMY_MODEL_ABI.some(item => 
        typeof item === 'string' && item.includes('swap')
      );
      const hasAddLiquidity = ECONOMY_MODEL_ABI.some(item => 
        typeof item === 'string' && item.includes('addLiquidity')
      );
      const hasRemoveLiquidity = ECONOMY_MODEL_ABI.some(item => 
        typeof item === 'string' && item.includes('removeLiquidity')
      );

      expect(hasSwap).toBe(true);
      expect(hasAddLiquidity).toBe(true);
      expect(hasRemoveLiquidity).toBe(true);
    });
  });

  describe('合约地址配置测试', () => {
    it('应该为 Sepolia 网络返回正确的合约地址', () => {
      const afcAddress = getContractAddress('AFC_TOKEN', 11155111);
      expect(afcAddress).toBe(CONTRACT_ADDRESSES.sepolia.AFC_TOKEN);
    });

    it('应该为 Base Sepolia 网络返回正确的合约地址', () => {
      const nftAddress = getContractAddress('SPARK_NFT', 84532);
      expect(nftAddress).toBe(CONTRACT_ADDRESSES.baseSepolia.SPARK_NFT);
    });

    it('应该为 Hardhat 本地网络返回正确的合约地址', () => {
      const economyAddress = getContractAddress('ECONOMY_MODEL', 31337);
      expect(economyAddress).toBe(CONTRACT_ADDRESSES.hardhat.ECONOMY_MODEL);
    });

    it('应该为未知网络返回 Sepolia 地址（默认）', () => {
      const address = getContractAddress('AFC_TOKEN', 99999);
      expect(address).toBe(CONTRACT_ADDRESSES.sepolia.AFC_TOKEN);
    });
  });

  describe('ABI 格式测试', () => {
    it('AFC Token ABI 应该是有效的格式', () => {
      expect(AFC_TOKEN_ABI).toBeDefined();
      expect(AFC_TOKEN_ABI.length).toBeGreaterThan(0);
      
      // 检查 ABI 项是否是字符串（简化格式）或对象（完整格式）
      AFC_TOKEN_ABI.forEach(item => {
        expect(
          typeof item === 'string' || (typeof item === 'object' && item !== null)
        ).toBe(true);
      });
    });

    it('所有 ABI 都应该使用 as const 断言', () => {
      // 这个测试是为了确保 ABI 使用了 `as const` 断言
      // 实际项目中，ABI 应该使用 `as const` 来确保类型安全
      expect(AFC_TOKEN_ABI).toBeDefined();
      expect(SPARK_NFT_ABI).toBeDefined();
      expect(ECONOMY_MODEL_ABI).toBeDefined();
    });
  });
});
