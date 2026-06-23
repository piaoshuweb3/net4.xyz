// net4.xyz 前端 API 服务
// 连接到真实后端和 AI 引擎

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const AI_ENGINE_URL = process.env.NEXT_PUBLIC_AI_ENGINE_URL || 'http://localhost:8001';

// ==================== 类型定义 ====================

export interface WhitepaperSection {
  title: string;
  content: string;
  section: string;
}

export interface PoUENode {
  nodeType: 'core' | 'sub' | 'normal';
  count: number;
  status: string;
}

export interface DNSDomain {
  name: string;
  owner: string;
  registrationDate: string;
  expiryDate: string;
}

export interface AIQueryRequest {
  prompt: string;
  system_message?: string;
  model_type?: string;
}

export interface AIQueryResponse {
  success: boolean;
  result?: string;
  error?: string;
  model?: string;
  provider?: string;
}

// ==================== API 服务 ====================

class APIService {
  private baseURL: string;
  private aiURL: string;

  constructor() {
    this.baseURL = API_BASE_URL;
    this.aiURL = AI_ENGINE_URL;
  }

  // ==================== 健康检查 ====================
  
  async healthCheck(): Promise<{ status: string }> {
    const response = await fetch(`${this.baseURL}/health`);
    return response.json();
  }

  async aiHealthCheck(): Promise<{ status: string; providers: any }> {
    const response = await fetch(`${this.aiURL}/health`);
    return response.json();
  }

  // ==================== Whitepaper（真实 API）====================

  async getWhitepaper(): Promise<WhitepaperSection[]> {
    const response = await fetch(`${this.baseURL}/api/whitepaper`);
    if (!response.ok) {
      throw new Error('Failed to fetch whitepaper');
    }
    return response.json();
  }

  // ==================== PoUE Engine（真实 API）====================

  async getPoUENodes(): Promise<PoUENode[]> {
    const response = await fetch(`${this.baseURL}/api/nodes/stats`);
    if (!response.ok) {
      throw new Error('Failed to fetch PoUE stats');
    }
    return response.json();
  }

  async getPoUERewards(walletAddress: string): Promise<{ total: number; pending: number }> {
    const response = await fetch(`${this.baseURL}/api/poue/rewards/${walletAddress}`);
    if (!response.ok) {
      throw new Error('Failed to fetch rewards');
    }
    return response.json();
  }

  // ==================== Web4 DNS（真实 API）====================

  async searchDomain(name: string): Promise<{ available: boolean; name: string; price?: number }> {
    const response = await fetch(`${this.baseURL}/api/dns/search?name=${name}`);
    if (!response.ok) {
      throw new Error('Failed to search domain');
    }
    return response.json();
  }

  async registerDomain(name: string, walletAddress: string): Promise<{ success: boolean; transactionHash?: string }> {
    const response = await fetch(`${this.baseURL}/api/dns/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, walletAddress }),
    });
    if (!response.ok) {
      throw new Error('Failed to register domain');
    }
    return response.json();
  }

  // ==================== AI 问答（真实 API - DeepSeek）====================

  async queryAI(request: AIQueryRequest): Promise<AIQueryResponse> {
    const response = await fetch(`${this.aiURL}/api/v1/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: request.prompt,
        system_message: request.system_message || 'You are a helpful AI assistant for net4.xyz Web4.0 platform.',
        model_type: request.model_type || 'deepseek-chat',
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to query AI');
    }
    
    return response.json();
  }

  async chatWithAI(messages: { role: string; content: string }[]): Promise<AIQueryResponse> {
    const response = await fetch(`${this.aiURL}/api/v1/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to chat with AI');
    }
    
    return response.json();
  }
}

// 导出单例
const apiService = new APIService();
export default apiService;
