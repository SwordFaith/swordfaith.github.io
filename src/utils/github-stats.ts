import { z } from 'astro/zod';

export const GITHUB_LANGUAGE_SAMPLE_SIZE = 50;

const count = z.int().nonnegative();
const timestamp = z.iso.datetime({ offset: true });
const repositoryCounts = {
  stargazers_count: count,
  forks_count: count,
};
const repositoryFields = {
  name: z.string(),
  description: z.string().nullish(),
  html_url: z.httpUrl(),
  language: z.string().nullish(),
  topics: z.array(z.string()).nullish(),
  ...repositoryCounts,
};
const activity = z.object({
  estimatedCommits: count,
  monthlyAverage: count,
  weeklyAverage: count,
});

export const githubLanguageBytes = z.record(z.string(), count);
export const githubRepositoryPage = z.array(z.object({
  ...repositoryFields,
  updated_at: timestamp.nullable(),
}));
export type GitHubRepository = z.infer<typeof githubRepositoryPage>[number];

const githubStats = z.object({
  lastUpdate: timestamp,
  user: z.object({
    name: z.string(),
    login: z.string(),
    bio: z.string(),
    avatar_url: z.httpUrl(),
    html_url: z.httpUrl(),
    public_repos: count,
    followers: count,
    following: count,
    created_at: timestamp,
  }),
  summary: z.object({
    totalStars: count,
    totalForks: count,
    totalRepos: count,
    activeYears: count,
  }),
  languageStats: z.record(z.string(), z.object({
    bytes: count,
    percentage: z.number().min(0).max(100),
  })),
  topRepositories: z.array(z.object({
    ...repositoryFields,
    full_name: z.string().optional(),
  })),
  pinnedRepositoriesData: z.array(z.object({
    name: z.string(),
    full_name: z.string(),
    updated_at: timestamp,
    ...repositoryCounts,
  })),
  recentActivity: z.object({ thisYear: activity }),
});

export type GitHubStatsData = z.infer<typeof githubStats>;

export function validateGitHubStats(data: unknown, file: string): GitHubStatsData {
  const result = githubStats.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues.map(issue => `${issue.path.join('.') || 'root'}: ${issue.message}`);
    throw new Error(`Invalid GitHub stats in ${file}\n${issues.join('\n')}`);
  }
  return result.data;
}
