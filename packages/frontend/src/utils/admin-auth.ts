/**
 * 管理员权限验证工具
 * 通过钱包地址匹配判断是否为终极管理员
 */

/** 获取终极管理员地址（从环境变量读取） */
export function getAdminAddress(): string {
  return process.env.NEXT_PUBLIC_ADMIN_ADDRESS || '';
}

/** 检查给定地址是否为终极管理员 */
export function isAdmin(address: string | undefined | null): boolean {
  if (!address) return false;
  const adminAddr = getAdminAddress();
  if (!adminAddr) return false;
  return address.toLowerCase() === adminAddr.toLowerCase();
}

/** 检查当前连接的钱包是否为管理员（通过 wagmi useAccount） */
export function checkAdminAccess(connectedAddress: string | undefined): {
  isAdmin: boolean;
  adminAddress: string;
} {
  const adminAddress = getAdminAddress();
  return {
    isAdmin: connectedAddress?.toLowerCase() === adminAddress.toLowerCase(),
    adminAddress,
  };
}
