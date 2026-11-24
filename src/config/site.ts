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
  keywords: ['SwordFaith', 'LLM', '后训练', '强化学习', '技术博客'],
  robots: {
    index: true,
    follow: true,
  },
  image: {
    src: '/og-image.png',
    alt: 'SwordFaith 分享图：LLM × RL，Post-training & reinforcement learning，Algorithms, frameworks and data；右侧为 Prompt → Policy π → Reward 的对齐循环示意图',
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
