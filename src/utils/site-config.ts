import { APP_BLOG, METADATA, SITE } from '@/config/site';

export interface SiteConfig {
  name: string;
  title: string;
  description: string;
  url: string;
  author: string;
  logo: string;
}

const cleanEnvValue = (value: string | undefined): string | undefined => {
  if (!value || value === 'undefined') return undefined;
  return value.replace(/^["']|["']$/g, '');
};

export const siteConfig: SiteConfig = {
  name: SITE.name,
  title: cleanEnvValue(process.env.SITE_TITLE) || METADATA.title.default,
  description: cleanEnvValue(process.env.SITE_DESCRIPTION) || METADATA.description,
  url: cleanEnvValue(process.env.SITE_URL) || SITE.origin,
  author: SITE.name,
  logo: SITE.name,
};

export const trimSlash = (value: string) => value.trim().replace(/^\/+|\/+$/g, '');

export const getPermalink = (slug = '', type = 'page'): string => {
  const cleanSlug = trimSlash(slug);

  if (type === 'home') return '/';
  if (type === 'blog') return APP_BLOG.list.pathname;
  if (type === 'post') return APP_BLOG.post.permalink.replace('%slug%', cleanSlug);

  return `/${cleanSlug}`;
};

export const getHomePermalink = () => getPermalink('', 'home');
export const getBlogPermalink = () => getPermalink('', 'blog');

export const {
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  url: SITE_URL,
  author: SITE_AUTHOR,
  logo: SITE_LOGO,
} = siteConfig;
