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

// Pages are built as <route>/index.html and served at <route>/, so page links
// end in `/` to match canonicals and skip the GitHub Pages redirect.
// File URLs (/rss.xml, assets, .ipynb downloads) must not go through this helper.
const withTrailingSlash = (path: string) => (path.endsWith('/') ? path : `${path}/`);

export const getPermalink = (slug = '', type = 'page'): string => {
  const cleanSlug = trimSlash(slug);

  if (type === 'home') return '/';
  if (type === 'blog') return withTrailingSlash(APP_BLOG.list.pathname);
  if (type === 'post') return withTrailingSlash(APP_BLOG.post.permalink.replace('%slug%', cleanSlug));

  return withTrailingSlash(`/${cleanSlug}`);
};

export const getHomePermalink = () => getPermalink('', 'home');
export const getBlogPermalink = () => getPermalink('', 'blog');

export const {
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  author: SITE_AUTHOR,
  logo: SITE_LOGO,
} = siteConfig;
