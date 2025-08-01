/**
 * WandB API Client
 * 用于获取和缓存 WandB 实验数据
 */

export interface WandBRun {
  id: string;
  name: string;
  display_name: string;
  state: 'running' | 'finished' | 'crashed' | 'failed';
  created_at: string;
  updated_at: string;
  summary: Record<string, any>;
  config: Record<string, any>;
  tags: string[];
  url: string;
  project: {
    name: string;
    entity: string;
  };
}

export interface WandBProject {
  name: string;
  entity: string;
  description?: string;
  created_at: string;
  updated_at: string;
  run_count: number;
  url: string;
}

export interface WandBConfig {
  apiKey?: string;
  entity?: string;
  cacheExpiration?: number; // 缓存过期时间（毫秒）
}

export class WandBClient {
  private config: WandBConfig;
  private cache: Map<string, { data: any; timestamp: number }>;
  private baseUrl = 'https://api.wandb.ai';

  constructor(config: WandBConfig = {}) {
    this.config = {
      cacheExpiration: 5 * 60 * 1000, // 默认5分钟缓存
      ...config
    };
    this.cache = new Map();
  }

  /**
   * 获取项目列表
   */
  async getProjects(entity?: string): Promise<WandBProject[]> {
    const targetEntity = entity || this.config.entity;
    if (!targetEntity) {
      throw new Error('Entity is required');
    }

    const cacheKey = `projects_${targetEntity}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const url = `${this.baseUrl}/api/v1/projects?entity=${targetEntity}`;
      const response = await this.fetchWithAuth(url);
      const data = await response.json();
      
      const projects: WandBProject[] = data.projects || [];
      this.setCache(cacheKey, projects);
      return projects;
    } catch (error) {
      console.error('Failed to fetch WandB projects:', error);
      return [];
    }
  }

  /**
   * 获取项目的实验运行列表
   */
  async getRuns(project: string, entity?: string, limit = 50): Promise<WandBRun[]> {
    const targetEntity = entity || this.config.entity;
    if (!targetEntity) {
      throw new Error('Entity is required');
    }

    const cacheKey = `runs_${targetEntity}_${project}_${limit}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const url = `${this.baseUrl}/api/v1/runs?entity=${targetEntity}&project=${project}&limit=${limit}`;
      const response = await this.fetchWithAuth(url);
      const data = await response.json();
      
      const runs: WandBRun[] = data.runs || [];
      this.setCache(cacheKey, runs);
      return runs;
    } catch (error) {
      console.error('Failed to fetch WandB runs:', error);
      return [];
    }
  }

  /**
   * 获取特定实验的详细信息
   */
  async getRun(entity: string, project: string, runId: string): Promise<WandBRun | null> {
    const cacheKey = `run_${entity}_${project}_${runId}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const url = `${this.baseUrl}/api/v1/runs/${entity}/${project}/${runId}`;
      const response = await this.fetchWithAuth(url);
      const data = await response.json();
      
      const run: WandBRun = data.run;
      this.setCache(cacheKey, run);
      return run;
    } catch (error) {
      console.error('Failed to fetch WandB run:', error);
      return null;
    }
  }

  /**
   * 获取实验的指标历史数据
   */
  async getRunHistory(entity: string, project: string, runId: string, keys?: string[]): Promise<any[]> {
    const cacheKey = `history_${entity}_${project}_${runId}_${keys?.join(',') || 'all'}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      let url = `${this.baseUrl}/api/v1/runs/${entity}/${project}/${runId}/history`;
      if (keys && keys.length > 0) {
        url += `?keys=${keys.join(',')}`;
      }
      
      const response = await this.fetchWithAuth(url);
      const data = await response.json();
      
      const history: any[] = data.history || [];
      this.setCache(cacheKey, history);
      return history;
    } catch (error) {
      console.error('Failed to fetch WandB run history:', error);
      return [];
    }
  }

  /**
   * 生成 WandB 嵌入 URL
   */
  generateEmbedUrl(entity: string, project: string, runId?: string, type: 'project' | 'run' | 'report' = 'project'): string {
    const baseEmbedUrl = 'https://wandb.ai';
    
    switch (type) {
      case 'run':
        if (!runId) throw new Error('Run ID is required for run embed');
        return `${baseEmbedUrl}/${entity}/${project}/runs/${runId}`;
      case 'project':
        return `${baseEmbedUrl}/${entity}/${project}`;
      case 'report':
        return `${baseEmbedUrl}/${entity}/${project}/reports`;
      default:
        return `${baseEmbedUrl}/${entity}/${project}`;
    }
  }

  /**
   * 带认证的请求
   */
  private async fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
    // 检查配置是否完整
    if (!this.config.apiKey || !this.config.entity) {
      throw new Error('WandB API key and entity are required. Please check your environment configuration.');
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>
    };

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    try {
      // 使用代理感知的安全 fetch
      const response = await safeFetch(url, {
        ...options,
        headers,
      });

      if (response.status === 401) {
        throw new Error('WandB API authentication failed. Please check your API key.');
      }
      if (response.status === 403) {
        throw new Error('WandB API access forbidden. Please check your permissions.');
      }
      if (response.status === 429) {
        throw new Error('WandB API rate limit exceeded. Please try again later.');
      }

      return response;
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        const proxyStatus = getProxyStatus();
        const proxyInfo = proxyStatus.enabled 
          ? `Proxy enabled: ${JSON.stringify(proxyStatus.urls)}` 
          : 'No proxy configured';
        throw new Error(`Network error: Unable to connect to WandB API. ${proxyInfo}. Please check your internet connection and proxy settings.`);
      }
      throw error;
    }
  }

  /**
   * 从缓存获取数据
   */
  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > (this.config.cacheExpiration || 5 * 60 * 1000)) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * 设置缓存
   */
  private setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 清除特定缓存
   */
  clearCacheByKey(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}

import { getServerEnv } from '../config/env';
import { safeFetch, getProxyStatus } from './proxy';

// 默认实例 - 延迟初始化以避免构建时 API 调用
let _wandbClient: WandBClient | null = null;

export function getWandBClient(): WandBClient {
  if (!_wandbClient) {
    try {
      const env = getServerEnv();
      _wandbClient = new WandBClient({
        entity: env.WANDB_ENTITY,
        apiKey: env.WANDB_API_KEY
      });
    } catch (error) {
      // 如果不在服务端，创建无配置的客户端（API 调用会失败但不会崩溃）
      console.warn('WandB client initialized without credentials (client-side)');
      _wandbClient = new WandBClient({});
    }
  }
  return _wandbClient;
}

// 服务端专用客户端创建函数
export function createServerWandBClient(): WandBClient {
  const env = getServerEnv();
  return new WandBClient({
    entity: env.WANDB_ENTITY,
    apiKey: env.WANDB_API_KEY
  });
}

// 保留向后兼容性 - 延迟初始化
export const wandbClient = getWandBClient();