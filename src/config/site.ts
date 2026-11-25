export interface MetaData {
  title?: string;
  ignoreTitleTemplate?: boolean;
  description?: string;
  keywords?: string[];
  robots?: {
    index?: boolean;
    follow?: boolean;
  };
  image?: string;
  openGraph?: {
    type?: string;
  };
  // Article-level data; when set, emits article:* Open Graph tags and BlogPosting JSON-LD.
  article?: {
    publishedTime: Date;
    modifiedTime?: Date;
    author?: string;
    tags?: string[];
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
  post: {
    permalink: '/blog/%slug%',
  },
  list: {
    pathname: '/blog',
  },
} as const;
