import { getBlogPermalink, getHomePermalink, getPermalink } from '@/utils/site-config';

export const headerData = {
  links: [
    { text: '首页', href: getHomePermalink() },
    { text: '博客', href: getBlogPermalink() },
    { text: '归档', href: getPermalink('archive') },
    { text: '标签', href: getPermalink('tags') },
    { text: 'Notebooks', href: getPermalink('notebooks') },
    { text: '关于', href: getPermalink('about') },
  ],
};

export const footerData = {
  links: [
    ...headerData.links,
    { text: 'RSS 订阅', href: '/rss.xml' },
  ],
  socialLinks: [
    { ariaLabel: 'GitHub', text: 'GitHub', href: 'https://github.com/SwordFaith' },
    { ariaLabel: 'X', text: 'X', href: 'https://x.com/SDxFaith' },
    { ariaLabel: '知乎', text: '知乎', href: 'https://www.zhihu.com/people/zhi-shou-88' },
  ],
};
