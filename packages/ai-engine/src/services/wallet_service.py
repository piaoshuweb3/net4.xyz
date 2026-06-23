"""
Agentic Wallet Service
基于 Coinbase awal CLI 的钱包操作服务
支持 Base 链上的 AFC Token 和其他 ERC-20 代币操作
"""
import asyncio
import json
import re
import logging
from typing import Optional, Dict, Any, List
from enum import Enum
from pydantic import BaseModel, Field, validator

logger = logging.getLogger(__name__)


class Chain(str, Enum):
    """支持的区块链"""
    BASE = "base"
    POLYGON = "polygon"
    SOLANA = "solana"


class Asset(str, Enum):
    """支持的资产"""
    USDC = "usdc"
    ETH = "eth"
    POL = "pol"
    SOL = "sol"


class WalletStatus(BaseModel):
    """钱包状态"""
    authenticated: bool
    address: Optional[str] = None
    network: Optional[str] = None


class Balance(BaseModel):
    """余额信息"""
    asset: str
    amount: str
    chain: str
    address: str


class TransactionResult(BaseModel):
    """交易结果"""
    success: bool
    tx_hash: Optional[str] = None
    from_address: Optional[str] = None
    to_address: Optional[str] = None
    amount: Optional[str] = None
    asset: Optional[str] = None
    chain: Optional[str] = None
    error: Optional[str] = None


class TradeResult(BaseModel):
    """交易结果"""
    success: bool
    tx_hash: Optional[str] = None
    from_asset: Optional[str] = None
    to_asset: Optional[str] = None
    from_amount: Optional[str] = None
    to_amount: Optional[str] = None
    chain: Optional[str] = None
    error: Optional[str] = None


class QueryResult(BaseModel):
    """链上查询结果"""
    success: bool
    data: Optional[List[Dict[str, Any]]] = None
    error: Optional[str] = None


class WalletService:
    """
    钱包服务
    封装 Coinbase awal CLI 命令，提供安全的钱包操作接口
    """
    
    # awal CLI 版本
    AWAL_VERSION = "2.10.0"
    
    # 输入验证正则表达式
    AMOUNT_PATTERN = re.compile(r'^\$?[\d.]+$')
    ETH_ADDRESS_PATTERN = re.compile(r'^0x[0-9a-fA-F]{40}$')
    ENS_NAME_PATTERN = re.compile(r'^[a-zA-Z0-9.-]+\.eth$')
    SOLANA_ADDRESS_PATTERN = re.compile(r'^[1-9A-HJ-NP-Za-km-z]{32,44}$')
    
    def __init__(self):
        """初始化钱包服务"""
        self.awal_cmd = f"npx awal@{self.AWAL_VERSION}"
    
    async def _run_command(self, cmd: str, timeout: int = 30) -> Dict[str, Any]:
        """
        执行 shell 命令
        
        Args:
            cmd: 命令字符串
            timeout: 超时时间（秒）
        
        Returns:
            命令执行结果
        """
        try:
            logger.info(f"Executing command: {cmd}")
            
            process = await asyncio.create_subprocess_shell(
                cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await asyncio.wait_for(
                process.communicate(),
                timeout=timeout
            )
            
            stdout_str = stdout.decode('utf-8').strip()
            stderr_str = stderr.decode('utf-8').strip()
            
            logger.info(f"Command output: {stdout_str}")
            if stderr_str:
                logger.warning(f"Command stderr: {stderr_str}")
            
            return {
                "success": process.returncode == 0,
                "stdout": stdout_str,
                "stderr": stderr_str,
                "returncode": process.returncode
            }
        
        except asyncio.TimeoutError:
            logger.error(f"Command timeout: {cmd}")
            return {
                "success": False,
                "error": "Command execution timeout"
            }
        except Exception as e:
            logger.error(f"Command execution error: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def _validate_amount(self, amount: str) -> bool:
        """验证金额格式"""
        return bool(self.AMOUNT_PATTERN.match(amount))
    
    def _validate_address(self, address: str, chain: Chain = Chain.BASE) -> bool:
        """验证地址格式"""
        if chain == Chain.SOLANA:
            return bool(self.SOLANA_ADDRESS_PATTERN.match(address))
        else:
            # EVM 链：支持 0x 地址和 ENS 名称
            return bool(
                self.ETH_ADDRESS_PATTERN.match(address) or
                self.ENS_NAME_PATTERN.match(address)
            )
    
    def _validate_chain(self, chain: str) -> bool:
        """验证链名称"""
        try:
            Chain(chain)
            return True
        except ValueError:
            return False
    
    def _validate_asset(self, asset: str) -> bool:
        """验证资产名称"""
        try:
            Asset(asset)
            return True
        except ValueError:
            return False
    
    async def get_status(self) -> WalletStatus:
        """
        获取钱包状态
        
        Returns:
            钱包状态信息
        """
        result = await self._run_command(f"{self.awal_cmd} status --json")
        
        if result["success"]:
            try:
                data = json.loads(result["stdout"])
                return WalletStatus(
                    authenticated=data.get("authenticated", False),
                    address=data.get("address"),
                    network=data.get("network")
                )
            except json.JSONDecodeError:
                # 非 JSON 输出，尝试解析文本
                stdout = result["stdout"]
                authenticated = "authenticated" in stdout.lower()
                return WalletStatus(authenticated=authenticated)
        
        return WalletStatus(authenticated=False)
    
    async def get_balance(
        self,
        asset: str = "usdc",
        chain: str = "base"
    ) -> Optional[Balance]:
        """
        获取余额
        
        Args:
            asset: 资产类型（usdc, eth, pol, sol）
            chain: 区块链（base, polygon, solana）
        
        Returns:
            余额信息
        """
        # 验证输入
        if not self._validate_asset(asset):
            logger.error(f"Invalid asset: {asset}")
            return None
        
        if not self._validate_chain(chain):
            logger.error(f"Invalid chain: {chain}")
            return None
        
        cmd = f"{self.awal_cmd} balance --asset {asset} --chain {chain} --json"
        result = await self._run_command(cmd)
        
        if result["success"]:
            try:
                data = json.loads(result["stdout"])
                return Balance(
                    asset=asset,
                    amount=data.get("balance", "0"),
                    chain=chain,
                    address=data.get("address", "")
                )
            except json.JSONDecodeError:
                logger.error("Failed to parse balance JSON")
                return None
        
        return None
    
    async def send(
        self,
        amount: str,
        recipient: str,
        asset: str = "usdc",
        chain: str = "base"
    ) -> TransactionResult:
        """
        发送代币
        
        Args:
            amount: 金额（支持 $1.00, 1.0, 或原子单位）
            recipient: 接收地址（0x 地址、ENS 名称或 Solana 地址）
            asset: 资产类型
            chain: 区块链
        
        Returns:
            交易结果
        """
        # 输入验证
        if not self._validate_amount(amount):
            return TransactionResult(
                success=False,
                error=f"Invalid amount format: {amount}"
            )
        
        chain_enum = Chain(chain) if self._validate_chain(chain) else None
        if not chain_enum:
            return TransactionResult(
                success=False,
                error=f"Invalid chain: {chain}"
            )
        
        if not self._validate_address(recipient, chain_enum):
            return TransactionResult(
                success=False,
                error=f"Invalid recipient address: {recipient}"
            )
        
        if not self._validate_asset(asset):
            return TransactionResult(
                success=False,
                error=f"Invalid asset: {asset}"
            )
        
        # 构建命令（金额如果包含 $ 需要单引号）
        if amount.startswith('$'):
            amount_arg = f"'{amount}'"
        else:
            amount_arg = amount
        
        cmd = f"{self.awal_cmd} send {amount_arg} {recipient} --asset {asset} --chain {chain} --json"
        result = await self._run_command(cmd, timeout=60)
        
        if result["success"]:
            try:
                data = json.loads(result["stdout"])
                return TransactionResult(
                    success=True,
                    tx_hash=data.get("tx_hash"),
                    from_address=data.get("from"),
                    to_address=recipient,
                    amount=amount,
                    asset=asset,
                    chain=chain
                )
            except json.JSONDecodeError:
                return TransactionResult(
                    success=True,
                    to_address=recipient,
                    amount=amount,
                    asset=asset,
                    chain=chain
                )
        
        return TransactionResult(
            success=False,
            error=result.get("stderr") or result.get("error", "Unknown error")
        )
    
    async def trade(
        self,
        amount: str,
        from_asset: str,
        to_asset: str,
        chain: str = "base",
        slippage: Optional[int] = None
    ) -> TradeResult:
        """
        交易/兑换代币
        
        Args:
            amount: 金额
            from_asset: 源资产
            to_asset: 目标资产
            chain: 区块链
            slippage: 滑点（基点，100 = 1%）
        
        Returns:
            交易结果
        """
        # 输入验证
        if not self._validate_amount(amount):
            return TradeResult(
                success=False,
                error=f"Invalid amount format: {amount}"
            )
        
        if not self._validate_asset(from_asset):
            return TradeResult(
                success=False,
                error=f"Invalid from_asset: {from_asset}"
            )
        
        if not self._validate_asset(to_asset):
            return TradeResult(
                success=False,
                error=f"Invalid to_asset: {to_asset}"
            )
        
        if not self._validate_chain(chain):
            return TradeResult(
                success=False,
                error=f"Invalid chain: {chain}"
            )
        
        if from_asset == to_asset:
            return TradeResult(
                success=False,
                error="Cannot trade a token to itself"
            )
        
        # 构建命令
        if amount.startswith('$'):
            amount_arg = f"'{amount}'"
        else:
            amount_arg = amount
        
        cmd = f"{self.awal_cmd} trade {amount_arg} {from_asset} {to_asset} --chain {chain}"
        
        if slippage is not None:
            cmd += f" --slippage {slippage}"
        
        cmd += " --json"
        
        result = await self._run_command(cmd, timeout=60)
        
        if result["success"]:
            try:
                data = json.loads(result["stdout"])
                return TradeResult(
                    success=True,
                    tx_hash=data.get("tx_hash"),
                    from_asset=from_asset,
                    to_asset=to_asset,
                    from_amount=amount,
                    to_amount=data.get("to_amount"),
                    chain=chain
                )
            except json.JSONDecodeError:
                return TradeResult(
                    success=True,
                    from_asset=from_asset,
                    to_asset=to_asset,
                    from_amount=amount,
                    chain=chain
                )
        
        return TradeResult(
            success=False,
            error=result.get("stderr") or result.get("error", "Unknown error")
        )
    
    async def query_onchain_data(
        self,
        sql: str,
        timeout: int = 30
    ) -> QueryResult:
        """
        查询链上数据（使用 CDP SQL API via x402）
        
        Args:
            sql: SQL 查询语句
            timeout: 超时时间
        
        Returns:
            查询结果
        """
        # 基本 SQL 注入防护：检查危险关键字
        dangerous_keywords = [';', '--', '/*', '*/', 'DROP', 'DELETE', 'INSERT', 'UPDATE', 'ALTER', 'CREATE']
        sql_upper = sql.upper()
        
        for keyword in dangerous_keywords:
            if keyword in sql_upper:
                return QueryResult(
                    success=False,
                    error=f"SQL contains dangerous keyword: {keyword}"
                )
        
        # 构建命令（使用单引号包裹 JSON 字符串）
        json_data = json.dumps({"sql": sql})
        # 转义单引号
        json_data_escaped = json_data.replace("'", "'\\''")
        
        cmd = f"{self.awal_cmd} x402 pay https://x402.cdp.coinbase.com/platform/v2/data/query/run -X POST -d '{json_data_escaped}' --json"
        
        result = await self._run_command(cmd, timeout=timeout)
        
        if result["success"]:
            try:
                data = json.loads(result["stdout"])
                return QueryResult(
                    success=True,
                    data=data.get("rows", [])
                )
            except json.JSONDecodeError:
                return QueryResult(
                    success=False,
                    error="Failed to parse query result"
                )
        
        return QueryResult(
            success=False,
            error=result.get("stderr") or result.get("error", "Unknown error")
        )
    
    async def authenticate(self, email: str) -> Dict[str, Any]:
        """
        认证钱包（通过邮箱 OTP）
        
        Args:
            email: 邮箱地址
        
        Returns:
            认证结果
        """
        # 验证邮箱格式
        email_pattern = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
        if not email_pattern.match(email):
            return {
                "success": False,
                "error": "Invalid email format"
            }
        
        cmd = f"{self.awal_cmd} auth login {email}"
        result = await self._run_command(cmd, timeout=120)
        
        return {
            "success": result["success"],
            "message": result.get("stdout", ""),
            "error": result.get("stderr") or result.get("error")
        }


# 全局钱包服务实例
_wallet_service: Optional[WalletService] = None


def get_wallet_service() -> WalletService:
    """获取钱包服务单例"""
    global _wallet_service
    if _wallet_service is None:
        _wallet_service = WalletService()
    return _wallet_service
