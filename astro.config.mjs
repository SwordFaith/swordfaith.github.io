import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

// Load environment variables
const env = loadEnv(process.env.NODE_ENV || "development", process.cwd(), '');

// https://astro.build/config
export default defineConfig({
  site: 'https://swordfaith.github.io',
  base: '/', // 根站点不需要子路径
  integrations: [
    tailwind(),
    mdx(),
    sitemap()
  ],
  vite: {
    define: {
      'process.env.NODE_ENV': JSON.stringify(env.NODE_ENV || 'development'),
      'process.env.GITHUB_USERNAME': JSON.stringify(env.GITHUB_USERNAME),
      'process.env.GITHUB_TOKEN': JSON.stringify(env.GITHUB_TOKEN),
      'process.env.SITE_URL': JSON.stringify(env.SITE_URL),
      'process.env.SITE_TITLE': JSON.stringify(env.SITE_TITLE),
      'process.env.SITE_DESCRIPTION': JSON.stringify(env.SITE_DESCRIPTION),
      // Proxy configuration (for client-side debugging only)
      'process.env.HTTPS_PROXY': JSON.stringify(env.HTTPS_PROXY),
      'process.env.HTTP_PROXY': JSON.stringify(env.HTTP_PROXY),
      'process.env.ALL_PROXY': JSON.stringify(env.ALL_PROXY),
      'process.env.NO_PROXY': JSON.stringify(env.NO_PROXY)
    },
    // Server-side configuration for better proxy support
    ssr: {
      // Ensure Node.js modules work correctly with proxy
      noExternal: ['node-fetch']
    }
  },
  markdown: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex],
    shikiConfig: {
      themes: {
        light: 'github-light',
        dark: 'github-dark'
      },
      wrap: true,
      transformers: []
    }
  },
  build: {
    assets: 'assets'
  }
});