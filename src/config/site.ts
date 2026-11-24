export interface MetaData {
  title?: string;
  ignoreTitleTemplate?: boolean;
  description?: string;
  keywords?: string[];
  canonical?: string;
  robots?: {
    index?: boolean;
    follow?: boolean;
  };
  image?: string;
  imageAlt?: string;
  openGraph?: {
    url?: string;
    siteName?: string;
    locale?: string;
    type?: string;
  };
  twitter?: {
    handle?: string;
    site?: string;
    cardType?: string;
  };
}

export const SITE = {
  name: 'SwordFaith',
  title: "SwordFaith's Blog",
  description: 'Pursuing simple and universal ideas 追求简单普适的想法',
  origin: 'https://swordfaith.github.io',
  basePathname: '/',
} as const;

export const METADATA = {
  title: {
    default: SITE.title,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
  keywords: ['LLM', '算法工程师', '强化学习', '后训练', '技术博客'],
  robots: {
    index: true,
    follow: true,
  },
  image: {
    src: '/og-image.png',
    alt: 'SwordFaith：LLM 后训练与强化学习技术博客',
  },
  openGraph: {
    siteName: SITE.name,
    locale: 'zh_CN',
    type: 'website',
  },
  twitter: {
    cardType: 'summary_large_image',
  },
} as const;

export const I18N = {
  language: 'zh-CN',
  textDirection: 'ltr',
} as const;

export const UI = {
  theme: 'system',
} as const;

export const APP_BLOG = {
  isEnabled: true,
  postsPerPage: 6,
  post: {
    permalink: '/blog/%slug%',
    robots: { index: true, follow: true },
  },
  list: {
    pathname: '/blog',
    robots: { index: true, follow: true },
  },
} as const;
