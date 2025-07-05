// Site configuration utility
// Reads from environment variables with fallback defaults

export interface SiteConfig {
  title: string;
  description: string;
  url: string;
  author: string;
  logo: string;
}

// Get site configuration from environment variables
function getSiteConfig(): SiteConfig {
  // Remove quotes from environment variables if present
  const cleanEnvValue = (value: string | undefined): string | undefined => {
    if (!value || value === 'undefined') return undefined;
    return value.replace(/^["']|["']$/g, '');
  };
  
  // Get environment variables (these are defined in astro.config.mjs)
  const envTitle = cleanEnvValue(process.env.SITE_TITLE);
  const envDescription = cleanEnvValue(process.env.SITE_DESCRIPTION);
  const envUrl = cleanEnvValue(process.env.SITE_URL);
  
  const title = envTitle || 'LLM算法工程师技术博客';
  const description = envDescription || '专注于后训练、强化学习算法、框架和数据研发的技术分享';
  
  return {
    title,
    description,
    url: envUrl || 'https://swordfaith.github.io',
    author: 'SwordFaith',
    logo: title // Use the title as logo for consistency
  };
}

export const siteConfig = getSiteConfig();

// Export individual config values for convenience
export const {
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  url: SITE_URL,
  author: SITE_AUTHOR,
  logo: SITE_LOGO
} = siteConfig;