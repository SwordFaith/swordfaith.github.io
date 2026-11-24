import { readFileSync } from 'node:fs';

const file = process.argv[2];
const data = JSON.parse(readFileSync(file, 'utf8'));
const string = value => typeof value === 'string';
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);

function requireField(valid, field) {
  if (!valid) throw new Error(`Invalid GitHub stats in ${file}: ${field}`);
}

requireField(string(data?.lastUpdate) && Number.isFinite(Date.parse(data.lastUpdate)), 'lastUpdate');
requireField(string(data.user?.html_url), 'user.html_url');
for (const key of ['totalStars', 'totalRepos', 'totalForks', 'activeYears']) {
  requireField(Number.isFinite(data.summary?.[key]), `summary.${key}`);
}
for (const key of ['estimatedCommits', 'monthlyAverage', 'weeklyAverage']) {
  requireField(Number.isFinite(data.recentActivity?.thisYear?.[key]), `recentActivity.thisYear.${key}`);
}
requireField(record(data.languageStats), 'languageStats');
for (const [language, stats] of Object.entries(data.languageStats)) {
  requireField(Number.isFinite(stats?.percentage), `languageStats.${language}.percentage`);
}
for (const key of ['topRepositories', 'pinnedRepositoriesData']) {
  requireField(Array.isArray(data[key]), key);
  for (const [index, repo] of data[key].entries()) {
    requireField(Number.isFinite(repo?.stargazers_count) && Number.isFinite(repo?.forks_count), `${key}[${index}] counts`);
    if (key === 'pinnedRepositoriesData') {
      requireField(string(repo.full_name), `${key}[${index}].full_name`);
    } else {
      requireField(string(repo.html_url) && string(repo.full_name || repo.name), `${key}[${index}] link`);
      requireField(repo.topics == null || (Array.isArray(repo.topics) && repo.topics.every(string)), `${key}[${index}].topics`);
    }
  }
}
console.log(`GitHub stats lastUpdate: ${data.lastUpdate}`);
