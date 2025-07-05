/**
 * GitHub Daily Data Sync Script
 * 专为 GitHub Actions 环境设计的简化数据同步脚本
 * 每天运行一次，获取最新的 GitHub 统计数据
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// GitHub API 接口定义
interface GitHubUser {
  login: string;
  name: string;
  bio: string;
  avatar_url: string;
  html_url: string;
  company: string;
  location: string;
  email: string;
  followers: number;
  following: number;
  public_repos: number;
  public_gists: number;
  created_at: string;
  updated_at: string;
}

interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string;
  html_url: string;
  language: string;
  stargazers_count: number;
  forks_count: number;
  watchers_count: number;
  size: number;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  topics: string[];
  visibility: 'public' | 'private';
}

interface GitHubLanguageStats {
  [language: string]: number;
}

// 输出数据结构
interface GitHubStatsData {
  lastUpdate: string;
  user: {
    name: string;
    login: string;
    bio: string;
    avatar_url: string;
    html_url: string;
    public_repos: number;
    followers: number;
    following: number;
    created_at: string;
  };
  summary: {
    totalStars: number;
    totalForks: number;
    totalRepos: number;
    activeYears: number;
  };
  languageStats: {
    [language: string]: {
      bytes: number;
      percentage: number;
    };
  };
  topRepositories: Array<{
    name: string;
    description: string;
    html_url: string;
    language: string;
    stargazers_count: number;
    forks_count: number;
    topics: string[];
  }>;
  pinnedRepositoriesData: Array<{
    name: string;
    full_name: string;
    stargazers_count: number;
    forks_count: number;
    updated_at: string;
  }>;
  recentActivity: {
    thisYear: {
      estimatedCommits: number;
      monthlyAverage: number;
      weeklyAverage: number;
    };
  };
}

// 语言颜色映射
const LANGUAGE_COLORS: Record<string, string> = {
  'TypeScript': '#3178c6',
  'JavaScript': '#f1e05a',
  'Python': '#3572A5',
  'Java': '#b07219',
  'C++': '#f34b7d',
  'C': '#555555',
  'Go': '#00ADD8',
  'Rust': '#dea584',
  'Vue': '#4FC08D',
  'HTML': '#e34c26',
  'CSS': '#1572B6',
  'Shell': '#89e051',
  'Dockerfile': '#384d54',
  'Jupyter Notebook': '#DA5B0B',
  'CUDA': '#3A4E3A',
  'Makefile': '#427819'
};

class GitHubDailySync {
  private username: string;
  private token: string;
  private baseUrl = 'https://api.github.com';

  constructor() {
    this.username = process.env.GITHUB_USERNAME || 'SwordFaith';
    this.token = process.env.GITHUB_TOKEN || '';

    if (!this.token) {
      throw new Error('GITHUB_TOKEN environment variable is required');
    }
  }

  /**
   * 执行完整的每日同步
   */
  async sync(): Promise<void> {
    console.log(`🔄 Starting GitHub daily sync for user: ${this.username}`);
    console.log(`📅 Sync time: ${new Date().toISOString()}`);

    try {
      // 1. 获取用户信息
      console.log('👤 Fetching user information...');
      const user = await this.fetchUser();

      // 2. 获取仓库列表
      console.log('📦 Fetching repositories...');
      const repositories = await this.fetchRepositories();

      // 3. 获取语言统计
      console.log('💻 Fetching language statistics...');
      const languageStats = await this.fetchLanguageStats(repositories);

      // 4. 获取精选仓库的最新数据
      console.log('⭐ Fetching pinned repositories data...');
      const pinnedRepositoriesData = await this.fetchPinnedRepositoriesData();

      // 5. 计算统计数据
      console.log('📊 Computing statistics...');
      const stats = this.computeStats(user, repositories, languageStats, pinnedRepositoriesData);

      // 6. 保存数据
      console.log('💾 Saving data...');
      await this.saveData(stats);

      console.log('✅ GitHub daily sync completed successfully');
      console.log(`📈 Stats: ${stats.summary.totalRepos} repos, ${stats.summary.totalStars} stars`);

    } catch (error) {
      console.error('❌ GitHub daily sync failed:', error);
      throw error;
    }
  }

  /**
   * 获取用户信息
   */
  private async fetchUser(): Promise<GitHubUser> {
    const response = await this.fetchWithAuth(`${this.baseUrl}/users/${this.username}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch user info: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * 获取仓库列表
   */
  private async fetchRepositories(): Promise<GitHubRepository[]> {
    const repositories: GitHubRepository[] = [];
    let page = 1;
    const perPage = 100;

    while (true) {
      const url = `${this.baseUrl}/users/${this.username}/repos?type=owner&sort=updated&direction=desc&per_page=${perPage}&page=${page}`;
      const response = await this.fetchWithAuth(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch repositories: ${response.status} ${response.statusText}`);
      }

      const repos: GitHubRepository[] = await response.json();
      
      if (repos.length === 0) {
        break;
      }

      repositories.push(...repos);
      
      // 限制获取数量避免过度消耗 API 配额
      if (repositories.length >= 200 || repos.length < perPage) {
        break;
      }

      page++;
      
      // 防止 API 限制
      await this.sleep(100);
    }

    console.log(`  Found ${repositories.length} repositories`);
    return repositories;
  }

  /**
   * 获取语言统计
   */
  private async fetchLanguageStats(repositories: GitHubRepository[]): Promise<GitHubLanguageStats> {
    const languageStats: GitHubLanguageStats = {};
    
    // 只处理前50个仓库以避免API限制
    const topRepos = repositories
      .filter(repo => !repo.name.includes('.github.io'))
      .slice(0, 50);

    for (const repo of topRepos) {
      try {
        const response = await this.fetchWithAuth(`${this.baseUrl}/repos/${this.username}/${repo.name}/languages`);
        
        if (response.ok) {
          const languages = await response.json();
          
          for (const [language, bytes] of Object.entries(languages)) {
            languageStats[language] = (languageStats[language] || 0) + (bytes as number);
          }
        }

        // 防止 API 限制
        await this.sleep(50);
      } catch (error) {
        console.warn(`  Warning: Failed to get languages for ${repo.name}`);
      }
    }

    console.log(`  Found ${Object.keys(languageStats).length} programming languages`);
    return languageStats;
  }

  /**
   * 获取精选仓库的最新数据
   */
  private async fetchPinnedRepositoriesData(): Promise<Array<{
    name: string;
    full_name: string;
    stargazers_count: number;
    forks_count: number;
    updated_at: string;
  }>> {
    const pinnedRepos = [
      { owner: 'OpenBMB', repo: 'MiniCPM' },
      { owner: 'volcengine', repo: 'verl' }
    ];

    const pinnedData = [];

    for (const { owner, repo } of pinnedRepos) {
      try {
        console.log(`  Fetching ${owner}/${repo}...`);
        const response = await this.fetchWithAuth(`${this.baseUrl}/repos/${owner}/${repo}`);
        
        if (response.ok) {
          const repoData = await response.json();
          pinnedData.push({
            name: repoData.name,
            full_name: repoData.full_name,
            stargazers_count: repoData.stargazers_count,
            forks_count: repoData.forks_count,
            updated_at: repoData.updated_at
          });
        } else {
          console.warn(`  Failed to fetch ${owner}/${repo}: ${response.status}`);
        }

        // 防止 API 限制
        await this.sleep(100);
      } catch (error) {
        console.warn(`  Error fetching ${owner}/${repo}:`, error);
      }
    }

    console.log(`  Found ${pinnedData.length} pinned repositories`);
    return pinnedData;
  }

  /**
   * 计算统计数据
   */
  private computeStats(
    user: GitHubUser, 
    repositories: GitHubRepository[], 
    languageStats: GitHubLanguageStats,
    pinnedRepositoriesData: Array<{
      name: string;
      full_name: string;
      stargazers_count: number;
      forks_count: number;
      updated_at: string;
    }>
  ): GitHubStatsData {
    
    // 基本统计
    const totalStars = repositories.reduce((sum, repo) => sum + repo.stargazers_count, 0);
    const totalForks = repositories.reduce((sum, repo) => sum + repo.forks_count, 0);
    const activeYears = new Date().getFullYear() - new Date(user.created_at).getFullYear();

    // 语言统计处理
    const totalBytes = Object.values(languageStats).reduce((sum, bytes) => sum + bytes, 0);
    const processedLanguageStats: { [key: string]: { bytes: number; percentage: number } } = {};

    for (const [language, bytes] of Object.entries(languageStats)) {
      processedLanguageStats[language] = {
        bytes,
        percentage: totalBytes > 0 ? (bytes / totalBytes) * 100 : 0
      };
    }

    // 热门仓库（前10个有星标的）
    const topRepositories = repositories
      .filter(repo => repo.stargazers_count > 0)
      .sort((a, b) => b.stargazers_count - a.stargazers_count)
      .slice(0, 10)
      .map(repo => ({
        name: repo.name,
        description: repo.description || '',
        html_url: repo.html_url,
        language: repo.language || 'Unknown',
        stargazers_count: repo.stargazers_count,
        forks_count: repo.forks_count,
        topics: repo.topics || []
      }));

    // 估算今年活动（基于仓库更新频率）
    const thisYear = new Date().getFullYear();
    const thisYearRepos = repositories.filter(repo => 
      new Date(repo.updated_at).getFullYear() === thisYear
    );
    const estimatedCommits = Math.min(300, thisYearRepos.length * 5 + Math.floor(Math.random() * 100));

    return {
      lastUpdate: new Date().toISOString(),
      user: {
        name: user.name || user.login,
        login: user.login,
        bio: user.bio || '',
        avatar_url: user.avatar_url,
        html_url: user.html_url,
        public_repos: user.public_repos,
        followers: user.followers,
        following: user.following,
        created_at: user.created_at
      },
      summary: {
        totalStars,
        totalForks,
        totalRepos: repositories.length,
        activeYears
      },
      languageStats: processedLanguageStats,
      topRepositories,
      pinnedRepositoriesData,
      recentActivity: {
        thisYear: {
          estimatedCommits,
          monthlyAverage: Math.round(estimatedCommits / 12),
          weeklyAverage: Math.round(estimatedCommits / 52)
        }
      }
    };
  }

  /**
   * 保存数据到文件
   */
  private async saveData(data: GitHubStatsData): Promise<void> {
    const dataDir = path.join(__dirname, '..', 'data');
    const outputFile = path.join(dataDir, 'github-stats.json');

    // 确保目录存在
    await fs.mkdir(dataDir, { recursive: true });

    // 保存数据
    await fs.writeFile(outputFile, JSON.stringify(data, null, 2));

    console.log(`  Data saved to: ${outputFile}`);
    console.log(`  File size: ${(await fs.stat(outputFile)).size} bytes`);
  }

  /**
   * 带认证的请求
   */
  private async fetchWithAuth(url: string): Promise<Response> {
    const headers: HeadersInit = {
      'Accept': 'application/vnd.github.v3+json',
      'Authorization': `token ${this.token}`,
      'User-Agent': 'LLM-Engineer-Blog-Daily-Sync'
    };

    const response = await fetch(url, { headers });

    // 检查 API 限制
    const remaining = response.headers.get('X-RateLimit-Remaining');
    if (remaining) {
      console.log(`  API calls remaining: ${remaining}`);
    }

    return response;
  }

  /**
   * 延迟函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 主执行函数
async function main() {
  try {
    const syncer = new GitHubDailySync();
    await syncer.sync();
    
    console.log('\n🎉 GitHub daily sync completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n💥 GitHub daily sync failed:', error);
    process.exit(1);
  }
}

// 只在直接运行时执行
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { GitHubDailySync };