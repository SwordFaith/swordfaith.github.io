import { APP_BLOG, METADATA, SITE } from '@/config/site';

export interface SiteConfig {
  title: string;
  description: string;
  url: string;
  author: string;
  logo: string;
}

export const siteConfig: SiteConfig = {
  title: METADATA.title.default,
  description: METADATA.description,
  url: SITE.origin,
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
  author: SITE_AUTHOR,
  logo: SITE_LOGO,
} = siteConfig;
