/**
 * 智能合约配置测试
 * 验证合约地址和 ABI 配置是否正确
 */
import { describe, it, expect } from 'vitest';
import { 
  AFC_TOKEN_ABI, 
  SPARK_NFT_ABI, 
  ECONOMY_MODEL_ABI, 
  getContractAddress, 
  CONTRACT_ADDRESSES 
} from '../../config/contracts';

describe('智能合约配置', () => {
  it('AFC Token ABI 应该包含必要的函数', () => {
    const abi = AFC_TOKEN_ABI;
    
    // ABI 是字符串数组格式，检查是否包含特定函数名
    const abiStr = abi.join(' ');
    
    // 检查 ERC20 基础功能
    expect(abiStr).toContain('balanceOf');
    expect(abiStr).toContain('transfer');
    expect(abiStr).toContain('approve');
    
    // 检查治理功能
    expect(abiStr).toContain('propose');
    
    // 检查代币锁定功能
    expect(abiStr).toContain('lock');
    expect(abiStr).toContain('release');
  });

  it('Spark NFT ABI 应该包含必要的函数', () => {
    const abi = SPARK_NFT_ABI;
    const abiStr = abi.join(' ');
    
    expect(abiStr).toContain('mint');
    expect(abiStr).toContain('balanceOf');
    expect(abiStr).toContain('tokenURI');
  });

  it('经济模型 ABI 应该包含必要的函数', () => {
    const abi = ECONOMY_MODEL_ABI;
    const abiStr = abi.join(' ');
    
    expect(abiStr).toContain('swap');
    expect(abiStr).toContain('addLiquidity');
    expect(abiStr).toContain('removeLiquidity');
  });

  it('应该根据链 ID 返回正确的合约地址', () => {
    // Sepolia (11155111)
    const sepoliaAddress = getContractAddress('AFC_TOKEN', 11155111);
    expect(sepoliaAddress).toBe(CONTRACT_ADDRESSES.sepolia.AFC_TOKEN);
    
    // Base Sepolia (84532)
    const baseSepoliaAddress = getContractAddress('SPARK_NFT', 84532);
    expect(baseSepoliaAddress).toBe(CONTRACT_ADDRESSES.baseSepolia.SPARK_NFT);
    
    // Hardhat (31337)
    const hardhatAddress = getContractAddress('ECONOMY_MODEL', 31337);
    expect(hardhatAddress).toBe(CONTRACT_ADDRESSES.hardhat.ECONOMY_MODEL);
  });

  it('应该为未知链 ID 返回默认地址（Sepolia）', () => {
    const unknownChainAddress = getContractAddress('AFC_TOKEN', 99999);
    expect(unknownChainAddress).toBe(CONTRACT_ADDRESSES.sepolia.AFC_TOKEN);
  });
});
