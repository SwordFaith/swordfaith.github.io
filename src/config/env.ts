/**
 * Environment Configuration
 * 环境变量配置和验证
 */

// Server-side environment variables (不会暴露到客户端)
export interface ServerEnv {
  WANDB_ENTITY?: string;
  WANDB_API_KEY?: string;
  GITHUB_USERNAME?: string;
  GITHUB_TOKEN?: string;
  SITE_URL?: string;
  SITE_TITLE?: string;
  SITE_DESCRIPTION?: string;
  NODE_ENV?: string;
  // 代理配置
  HTTPS_PROXY?: string;
  HTTP_PROXY?: string;
  ALL_PROXY?: string;
  NO_PROXY?: string;
}

// Client-side safe environment variables (可以安全暴露到客户端)
export interface ClientEnv {
  SITE_URL?: string;
  SITE_TITLE?: string;
  SITE_DESCRIPTION?: string;
  NODE_ENV?: string;
}

/**
 * 获取服务端环境变量
 * 只在服务端运行，不会暴露敏感信息到客户端
 */
export function getServerEnv(): ServerEnv {
  if (typeof process === 'undefined') {
    throw new Error('getServerEnv() can only be called on the server side');
  }
  
  return {
    WANDB_ENTITY: process.env.WANDB_ENTITY,
    WANDB_API_KEY: process.env.WANDB_API_KEY,
    GITHUB_USERNAME: process.env.GITHUB_USERNAME,
    GITHUB_TOKEN: process.env.GITHUB_TOKEN,
    SITE_URL: process.env.SITE_URL,
    SITE_TITLE: process.env.SITE_TITLE,
    SITE_DESCRIPTION: process.env.SITE_DESCRIPTION,
    NODE_ENV: process.env.NODE_ENV,
    HTTPS_PROXY: process.env.HTTPS_PROXY || process.env.https_proxy,
    HTTP_PROXY: process.env.HTTP_PROXY || process.env.http_proxy,
    ALL_PROXY: process.env.ALL_PROXY || process.env.all_proxy,
    NO_PROXY: process.env.NO_PROXY || process.env.no_proxy
  };
}

/**
 * 获取客户端安全环境变量
 * 可以在客户端和服务端使用
 */
export function getClientEnv(): ClientEnv {
  // 在服务端从 process.env 读取
  if (typeof process !== 'undefined' && process.env) {
    return {
      SITE_URL: process.env.SITE_URL,
      SITE_TITLE: process.env.SITE_TITLE,
      SITE_DESCRIPTION: process.env.SITE_DESCRIPTION,
      NODE_ENV: process.env.NODE_ENV
    };
  }
  
  // 在客户端从 import.meta.env 读取
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return {
      SITE_URL: import.meta.env.SITE_URL,
      SITE_TITLE: import.meta.env.SITE_TITLE,
      SITE_DESCRIPTION: import.meta.env.SITE_DESCRIPTION,
      NODE_ENV: import.meta.env.NODE_ENV
    };
  }
  
  return {};
}

/**
 * 验证必要的环境变量是否已设置
 */
export function validateEnv(): { valid: boolean; missing: string[]; warnings: string[] } {
  const missing: string[] = [];
  const warnings: string[] = [];
  
  try {
    const env = getServerEnv();
    
    // 检查关键环境变量
    if (!env.SITE_URL) missing.push('SITE_URL');
    if (!env.SITE_TITLE) warnings.push('SITE_TITLE (建议设置)');
    if (!env.SITE_DESCRIPTION) warnings.push('SITE_DESCRIPTION (建议设置)');
    
    // 检查可选的 API 配置
    if (!env.WANDB_ENTITY) warnings.push('WANDB_ENTITY (WandB 功能将被禁用)');
    if (!env.WANDB_API_KEY) warnings.push('WANDB_API_KEY (WandB 功能将被禁用)');
    if (!env.GITHUB_USERNAME) warnings.push('GITHUB_USERNAME (GitHub 统计功能将被禁用)');
    if (!env.GITHUB_TOKEN) warnings.push('GITHUB_TOKEN (GitHub API 限制较严格)');
    
  } catch (error) {
    // 如果不在服务端，只检查客户端环境变量
    const clientEnv = getClientEnv();
    if (!clientEnv.SITE_URL) missing.push('SITE_URL');
  }
  
  return {
    valid: missing.length === 0,
    missing,
    warnings
  };
}

/**
 * 开发环境下打印环境变量状态
 */
export function printEnvStatus(): void {
  if (typeof process === 'undefined') return;
  
  const validation = validateEnv();
  
  if (!validation.valid) {
    console.error('❌ 缺少必要的环境变量:', validation.missing);
  }
  
  if (validation.warnings.length > 0) {
    console.warn('⚠️  建议配置的环境变量:', validation.warnings);
  }
  
  if (validation.valid && validation.warnings.length === 0) {
    console.log('✅ 环境变量配置完整');
  }
}