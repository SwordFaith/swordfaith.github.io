/**
 * 构建搜索索引脚本
 * 为 Pagefind 生成必要的搜索索引文件
 */

import fs from 'fs/promises';
import path from 'path';
import { getCollection } from 'astro:content';

interface SearchItem {
  url: string;
  title: string;
  description: string;
  content: string;
  tags: string[];
  date: string;
  type: 'blog' | 'notebook' | 'page';
}

export async function buildSearchIndex() {
  console.log('Building search index...');
  
  try {
    const searchItems: SearchItem[] = [];
    
    // 获取博客文章
    const blogPosts = await getCollection('blog');
    for (const post of blogPosts) {
      searchItems.push({
        url: `/blog/${post.slug}`,
        title: post.data.title,
        description: post.data.description || '',
        content: post.body,
        tags: post.data.tags || [],
        date: post.data.publishDate.toISOString(),
        type: 'blog'
      });
    }
    
    // 获取 Notebook
    const notebooks = await getCollection('notebooks');
    for (const notebook of notebooks) {
      searchItems.push({
        url: `/notebooks/${notebook.slug}`,
        title: notebook.data.title,
        description: notebook.data.description || '',
        content: notebook.body,
        tags: notebook.data.tags || [],
        date: notebook.data.publishDate.toISOString(),
        type: 'notebook'
      });
    }
    
    // 添加静态页面
    const staticPages = [
      {
        url: '/',
        title: '首页 - LLM算法工程师技术博客',
        description: 'LLM算法工程师的技术博客，专注于后训练、强化学习算法、框架和数据研发',
        content: '首页 LLM算法工程师 技术博客 RLHF DPO 强化学习 后训练',
        tags: ['首页'],
        date: new Date().toISOString(),
        type: 'page' as const
      },
      {
        url: '/about',
        title: '关于我 - LLM算法工程师技术博客',
        description: '了解LLM算法工程师的研究背景、发表工作和技术观察',
        content: '关于我 个人简介 研究方向 技能矩阵 后训练技术 强化学习算法',
        tags: ['关于'],
        date: new Date().toISOString(),
        type: 'page' as const
      }
    ];
    
    searchItems.push(...staticPages);
    
    // 确保输出目录存在
    const outputDir = 'public/search';
    await fs.mkdir(outputDir, { recursive: true });
    
    // 写入搜索索引
    const indexPath = path.join(outputDir, 'index.json');
    await fs.writeFile(indexPath, JSON.stringify(searchItems, null, 2));
    
    console.log(`Search index built successfully: ${searchItems.length} items`);
    console.log(`Index saved to: ${indexPath}`);
    
    return searchItems;
  } catch (error) {
    console.error('Failed to build search index:', error);
    throw error;
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  buildSearchIndex().catch(console.error);
}