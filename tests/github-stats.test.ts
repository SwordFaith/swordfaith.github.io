import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import committedStats from '../src/data/github-stats.json';
import { GitHubDailySync } from '../src/scripts/sync-github-daily';
import { validateGitHubStats } from '../src/utils/github-stats';

const origin = 'https://api.github.com';
const profile = { ...committedStats.user, login: 'example-user', public_repos: 203 };
const userPath = `/users/${profile.login}`;
const reposPath = `${userPath}/repos`;
const previousSnapshot = JSON.stringify(committedStats);

function repository(name: string, overrides = {}) {
  return {
    name,
    html_url: `https://github.com/${profile.login}/${name}`,
    stargazers_count: 1,
    forks_count: 2,
    updated_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

function mockGitHub(pages: ReturnType<typeof repository>[][], failedRequest?: string) {
  const fetch = vi.fn(async (input: string) => {
    const { pathname, search, searchParams } = new URL(input);
    if (`${pathname}${search}` === failedRequest || pathname === failedRequest) {
      return new Response(null, { status: 503 });
    }

    if (pathname === userPath) return Response.json(profile);
    if (pathname === reposPath) {
      const page = Number(searchParams.get('page') ?? 1);
      if (!pages[page - 1]) throw new Error(`Unexpected repo page: ${page}`);
      const headers = page < pages.length
        ? { Link: `<${origin}${reposPath}?page=${page + 1}>; rel="next"` }
        : undefined;
      return Response.json(pages[page - 1], { headers });
    }
    if (pathname.endsWith('/languages')) return Response.json({ TypeScript: 100 });
    const pinnedRepo = committedStats.pinnedRepositoriesData.find(repo => pathname === `/repos/${repo.full_name}`);
    if (pinnedRepo) return Response.json(pinnedRepo);
    throw new Error(`Unexpected GitHub request: ${input}`);
  });
  vi.stubGlobal('fetch', fetch);
  return fetch;
}

describe('GitHub stats refresh', () => {
  let tempDir: string;
  let outputFile: string;

  beforeEach(async () => {
    vi.stubEnv('GITHUB_TOKEN', 'test-token');
    vi.stubEnv('GITHUB_USERNAME', profile.login);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-25T00:00:00Z'));
    tempDir = await mkdtemp(join(tmpdir(), 'github stats '));
    outputFile = join(tempDir, 'github-stats.json');
    await writeFile(outputFile, previousSnapshot);
  });

  afterEach(async () => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    await rm(tempDir, { recursive: true, force: true });
  });

  it('aggregates all repo pages, uses the profile count, and samples at most 50 repos for languages', async () => {
    const repos = Array.from({ length: 199 }, (_, index) => repository(`repo-${index}`));
    const site = repository(`${profile.login}.github.io`);
    const lastRepo = repository('popular', { stargazers_count: 15, forks_count: 20, updated_at: '2026-08-01T00:00:00Z' });
    const fetch = mockGitHub([[site, ...repos.slice(0, 99)], repos.slice(99), [lastRepo]]);

    const refresh = new GitHubDailySync().sync(outputFile);
    await vi.runAllTimersAsync();
    await refresh;

    const stats = validateGitHubStats(JSON.parse(await readFile(outputFile, 'utf8')), outputFile);
    expect(stats.summary).toMatchObject({ totalRepos: 203, totalStars: 215, totalForks: 420 });
    expect(stats.topRepositories[0]?.name).toBe('popular');
    expect(stats.recentActivity.thisYear.estimatedCommits).toBe(5);
    expect(stats.languageStats).toEqual({ TypeScript: { bytes: 5000, percentage: 100 } });
    const languageRequests = fetch.mock.calls.map(([url]) => url).filter(url => url.endsWith('/languages'));
    expect(languageRequests).toEqual(repos.slice(0, 50).map(repo => `${origin}/repos/${profile.login}/${repo.name}/languages`));
  });

  it.each([
    [ `${reposPath}?page=2`, 'Failed to fetch repositories' ],
    [ `/repos/${profile.login}/repo-2/languages`, 'Failed to fetch languages for 1 of 2 repositories' ],
    [ '/repos/verl-project/verl', 'Failed to fetch 1 of 2 pinned repositories' ],
  ])('keeps the committed snapshot after a partial failure at %s', async (failedRequest, message) => {
    const fetch = mockGitHub([[repository('repo-1')], [repository('repo-2')]], failedRequest);
    const rejection = expect(new GitHubDailySync().sync(outputFile)).rejects.toThrow(message);
    await vi.runAllTimersAsync();
    await rejection;

    expect(fetch.mock.calls.map(([url]) => url)).toContain(`${origin}${failedRequest}`);
    expect(await readFile(outputFile, 'utf8')).toBe(previousSnapshot);
  });

  it('rejects malformed snapshots with the invalid field in the error', () => {
    expect(() => validateGitHubStats({ ...committedStats, languageStats: { Python: { bytes: 500, percentage: 105 } } }, outputFile))
      .toThrow('languageStats.Python.percentage');
  });
});
