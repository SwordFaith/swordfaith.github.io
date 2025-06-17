/**
 * GitHub API Client
 * 用于获取 GitHub 个人统计数据和项目信息
 */

export interface GitHubUser {
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

export interface GitHubRepository {
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

export interface GitHubContribution {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

export interface GitHubLanguageStats {
  [language: string]: number;
}

export interface GitHubStats {
  user: GitHubUser;
  repositories: GitHubRepository[];
  contributions: GitHubContribution[];
  languageStats: GitHubLanguageStats;
  totalStars: number;
  totalForks: number;
  totalCommits: number;
}

export interface GitHubConfig {
  token?: string;
  username?: string;
  cacheExpiration?: number;
}

export class GitHubClient {
  private config: GitHubConfig;
  private cache: Map<string, { data: any; timestamp: number }>;
  private baseUrl = 'https://api.github.com';

  constructor(config: GitHubConfig = {}) {
    this.config = {
      cacheExpiration: 10 * 60 * 1000, // 默认10分钟缓存
      ...config
    };
    this.cache = new Map();
  }

  /**
   * 获取用户基本信息
   */
  async getUserInfo(username?: string): Promise<GitHubUser | null> {
    const targetUsername = username || this.config.username;
    if (!targetUsername) {
      throw new Error('Username is required');
    }

    const cacheKey = `user_${targetUsername}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.fetchWithAuth(`${this.baseUrl}/users/${targetUsername}`);
      const user: GitHubUser = await response.json();
      
      this.setCache(cacheKey, user);
      return user;
    } catch (error) {
      console.error('Failed to fetch GitHub user info:', error);
      return null;
    }
  }

  /**
   * 获取用户的公开仓库
   */
  async getUserRepositories(username?: string, options: {
    sort?: 'created' | 'updated' | 'pushed' | 'full_name';
    direction?: 'asc' | 'desc';
    per_page?: number;
    type?: 'all' | 'owner' | 'member';
  } = {}): Promise<GitHubRepository[]> {
    const targetUsername = username || this.config.username;
    if (!targetUsername) {
      throw new Error('Username is required');
    }

    const {
      sort = 'updated',
      direction = 'desc',
      per_page = 100,
      type = 'owner'
    } = options;

    const cacheKey = `repos_${targetUsername}_${sort}_${direction}_${per_page}_${type}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const url = `${this.baseUrl}/users/${targetUsername}/repos?sort=${sort}&direction=${direction}&per_page=${per_page}&type=${type}`;
      const response = await this.fetchWithAuth(url);
      const repositories: GitHubRepository[] = await response.json();
      
      this.setCache(cacheKey, repositories);
      return repositories;
    } catch (error) {
      console.error('Failed to fetch GitHub repositories:', error);
      return [];
    }
  }

  /**
   * 获取仓库的语言统计
   */
  async getRepositoryLanguages(owner: string, repo: string): Promise<GitHubLanguageStats> {
    const cacheKey = `languages_${owner}_${repo}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.fetchWithAuth(`${this.baseUrl}/repos/${owner}/${repo}/languages`);
      const languages: GitHubLanguageStats = await response.json();
      
      this.setCache(cacheKey, languages);
      return languages;
    } catch (error) {
      console.error(`Failed to fetch languages for ${owner}/${repo}:`, error);
      return {};
    }
  }

  /**
   * 获取用户的总体语言统计
   */
  async getUserLanguageStats(username?: string): Promise<GitHubLanguageStats> {
    const targetUsername = username || this.config.username;
    if (!targetUsername) {
      throw new Error('Username is required');
    }

    const cacheKey = `user_languages_${targetUsername}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const repositories = await this.getUserRepositories(targetUsername);
      const languageStats: GitHubLanguageStats = {};

      // 获取所有仓库的语言统计
      for (const repo of repositories.slice(0, 50)) { // 限制查询数量避免API限制
        try {
          const repoLanguages = await this.getRepositoryLanguages(targetUsername, repo.name);
          
          for (const [language, bytes] of Object.entries(repoLanguages)) {
            languageStats[language] = (languageStats[language] || 0) + bytes;
          }
          
          // 防止API限制
          await this.sleep(50);
        } catch (error) {
          console.warn(`Failed to get languages for ${repo.name}:`, error);
        }
      }

      this.setCache(cacheKey, languageStats);
      return languageStats;
    } catch (error) {
      console.error('Failed to fetch user language stats:', error);
      return {};
    }
  }

  /**
   * 获取用户的贡献图数据（需要 GraphQL API）
   */
  async getUserContributions(username?: string, year?: number): Promise<GitHubContribution[]> {
    const targetUsername = username || this.config.username;
    if (!targetUsername) {
      throw new Error('Username is required');
    }

    const targetYear = year || new Date().getFullYear();
    const cacheKey = `contributions_${targetUsername}_${targetYear}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    if (!this.config.token) {
      console.warn('GitHub token is required for contributions data');
      return [];
    }

    try {
      const query = `
        query($username: String!, $from: DateTime!, $to: DateTime!) {
          user(login: $username) {
            contributionsCollection(from: $from, to: $to) {
              contributionCalendar {
                weeks {
                  contributionDays {
                    date
                    contributionCount
                    contributionLevel
                  }
                }
              }
            }
          }
        }
      `;

      const variables = {
        username: targetUsername,
        from: `${targetYear}-01-01T00:00:00Z`,
        to: `${targetYear}-12-31T23:59:59Z`
      };

      const response = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query, variables })
      });

      const data = await response.json();
      
      if (data.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
      }

      const contributions: GitHubContribution[] = [];
      const weeks = data.data.user.contributionsCollection.contributionCalendar.weeks;

      for (const week of weeks) {
        for (const day of week.contributionDays) {
          contributions.push({
            date: day.date,
            count: day.contributionCount,
            level: day.contributionLevel
          });
        }
      }

      this.setCache(cacheKey, contributions);
      return contributions;
    } catch (error) {
      console.error('Failed to fetch GitHub contributions:', error);
      return [];
    }
  }

  /**
   * 获取用户的完整统计信息
   */
  async getUserStats(username?: string): Promise<GitHubStats | null> {
    const targetUsername = username || this.config.username;
    if (!targetUsername) {
      throw new Error('Username is required');
    }

    const cacheKey = `user_stats_${targetUsername}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const [user, repositories, contributions, languageStats] = await Promise.all([
        this.getUserInfo(targetUsername),
        this.getUserRepositories(targetUsername, { per_page: 100 }),
        this.getUserContributions(targetUsername),
        this.getUserLanguageStats(targetUsername)
      ]);

      if (!user) return null;

      const totalStars = repositories.reduce((sum, repo) => sum + repo.stargazers_count, 0);
      const totalForks = repositories.reduce((sum, repo) => sum + repo.forks_count, 0);
      const totalCommits = contributions.reduce((sum, day) => sum + day.count, 0);

      const stats: GitHubStats = {
        user,
        repositories,
        contributions,
        languageStats,
        totalStars,
        totalForks,
        totalCommits
      };

      this.setCache(cacheKey, stats);
      return stats;
    } catch (error) {
      console.error('Failed to fetch GitHub stats:', error);
      return null;
    }
  }

  /**
   * 获取热门仓库
   */
  async getPopularRepositories(username?: string, limit = 10): Promise<GitHubRepository[]> {
    const repositories = await this.getUserRepositories(username);
    
    return repositories
      .filter(repo => repo.stargazers_count > 0)
      .sort((a, b) => b.stargazers_count - a.stargazers_count)
      .slice(0, limit);
  }

  /**
   * 带认证的请求
   */
  private async fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'LLM-Engineer-Blog',
      ...options.headers as Record<string, string>
    };

    if (this.config.token) {
      headers['Authorization'] = `token ${this.config.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      throw new Error(`GitHub API request failed: ${response.status} ${response.statusText}`);
    }

    return response;
  }

  /**
   * 从缓存获取数据
   */
  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > (this.config.cacheExpiration || 10 * 60 * 1000)) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * 设置缓存
   */
  private setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 延迟函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 默认实例
export const githubClient = new GitHubClient({
  username: process.env.GITHUB_USERNAME,
  token: process.env.GITHUB_TOKEN
});