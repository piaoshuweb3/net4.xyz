/**
 * IPFS 存储服务 — 基于 Pinata API（免费套餐：1GB 存储 + 100 次 pin/天）
 * 环境变量：PINATA_API_KEY, PINATA_API_SECRET, PINATA_GATEWAY
 */
const PINATA_API = 'https://api.pinata.cloud';
const DEFAULT_GATEWAY = 'https://gateway.pinata.cloud';

function getCredentials() {
  return {
    key: process.env.PINATA_API_KEY || '',
    secret: process.env.PINATA_API_SECRET || '',
    gateway: process.env.NEXT_PUBLIC_IPFS_GATEWAY || DEFAULT_GATEWAY,
  };
}

export async function uploadToIPFS(data: string | object, fileName: string): Promise<{ cid: string; url: string } | null> {
  const { key, secret, gateway } = getCredentials();
  if (!key || !secret) {
    console.warn('[IPFS] Pinata credentials not configured — using localStorage fallback');
    return null;
  }

  try {
    const content = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const formData = new FormData();
    formData.append('file', blob, fileName);

    const res = await fetch(`${PINATA_API}/pinning/pinFileToIPFS`, {
      method: 'POST',
      headers: {
        pinata_api_key: key,
        pinata_secret_api_key: secret,
      },
      body: formData,
    });

    if (!res.ok) throw new Error(`Pinata upload failed: ${res.status}`);

    const result = await res.json() as { IpfsHash: string };
    return {
      cid: result.IpfsHash,
      url: `${gateway}/ipfs/${result.IpfsHash}`,
    };
  } catch (err) {
    console.error('[IPFS] Upload error:', err);
    return null;
  }
}

export async function fetchFromIPFS(cid: string): Promise<string | null> {
  const { gateway } = getCredentials();
  try {
    const res = await fetch(`${gateway}/ipfs/${cid}`);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

/** 检查 IPFS 是否已配置 */
export function isIPFSConfigured(): boolean {
  const { key, secret } = getCredentials();
  return !!(key && secret);
}
