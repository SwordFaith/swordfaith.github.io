/**
 * Proxy Configuration Utilities
 * 代理配置工具
 */

import { getServerEnv } from '../config/env';

export interface ProxyConfig {
  http?: string;
  https?: string;
  all?: string;
  noProxy?: string[];
}

/**
 * 获取代理配置
 */
export function getProxyConfig(): ProxyConfig {
  try {
    const env = getServerEnv();
    return {
      http: env.HTTP_PROXY,
      https: env.HTTPS_PROXY,
      all: env.ALL_PROXY,
      noProxy: env.NO_PROXY?.split(',').map(s => s.trim()) || []
    };
  } catch {
    return {};
  }
}

/**
 * 检查 URL 是否应该使用代理
 */
export function shouldUseProxy(url: string, noProxy: string[] = []): boolean {
  if (noProxy.length === 0) return true;
  
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    
    return !noProxy.some(pattern => {
      if (pattern === '*') return true;
      if (pattern.startsWith('.')) {
        return hostname.endsWith(pattern) || hostname === pattern.slice(1);
      }
      return hostname === pattern;
    });
  } catch {
    return true;
  }
}

/**
 * 为 fetch 创建代理配置（仅在 Node.js 环境中使用）
 */
export function createFetchConfig(url: string): RequestInit {
  // 只在服务端环境使用代理
  if (typeof process === 'undefined' || !process.env) {
    return {};
  }
  
  const proxyConfig = getProxyConfig();
  
  if (!shouldUseProxy(url, proxyConfig.noProxy)) {
    return {};
  }
  
  // Node.js 的 fetch 会自动读取 HTTP_PROXY/HTTPS_PROXY 环境变量
  // 但我们可以在这里添加额外的配置，比如超时和错误处理
  return {
    // 添加更长的超时时间，因为代理可能增加延迟
    signal: AbortSignal.timeout(30000), // 30秒超时
  };
}

/**
 * 设置全局代理环境变量（用于开发和测试）
 */
export function setGlobalProxy(config: {
  http?: string;
  https?: string;
  all?: string;
  noProxy?: string;
}): void {
  if (typeof process === 'undefined') return;
  
  if (config.http) {
    process.env.HTTP_PROXY = config.http;
    process.env.http_proxy = config.http;
  }
  
  if (config.https) {
    process.env.HTTPS_PROXY = config.https;
    process.env.https_proxy = config.https;
  }
  
  if (config.all) {
    process.env.ALL_PROXY = config.all;
    process.env.all_proxy = config.all;
  }
  
  if (config.noProxy) {
    process.env.NO_PROXY = config.noProxy;
    process.env.no_proxy = config.noProxy;
  }
}

/**
 * 获取代理状态信息
 */
export function getProxyStatus(): {
  enabled: boolean;
  config: ProxyConfig;
  urls: {
    http?: string;
    https?: string;
    all?: string;
  };
} {
  const config = getProxyConfig();
  const enabled = !!(config.http || config.https || config.all);
  
  return {
    enabled,
    config,
    urls: {
      http: config.http,
      https: config.https,
      all: config.all
    }
  };
}

/**
 * 安全的 fetch 包装器，支持代理和错误处理
 */
export async function safeFetch(url: string, options: RequestInit = {}): Promise<Response> {
  try {
    const proxyConfig = createFetchConfig(url);
    const mergedOptions = { ...proxyConfig, ...options };
    
    // 合并 headers
    if (proxyConfig.headers || options.headers) {
      mergedOptions.headers = {
        ...proxyConfig.headers,
        ...options.headers,
      };
    }
    
    const response = await fetch(url, mergedOptions);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response;
  } catch (error) {
    // 记录代理状态以便调试
    const proxyStatus = getProxyStatus();
    console.error('Fetch failed:', {
      url,
      error: error instanceof Error ? error.message : String(error),
      proxyEnabled: proxyStatus.enabled,
      proxyConfig: proxyStatus.enabled ? proxyStatus.urls : 'disabled'
    });
    throw error;
  }
}