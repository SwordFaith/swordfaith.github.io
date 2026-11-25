import { readFileSync } from 'node:fs';
import { validateGitHubStats } from '../utils/github-stats.ts';

const file = process.argv[2];
const data = validateGitHubStats(JSON.parse(readFileSync(file, 'utf8')), file);
console.log(`GitHub stats lastUpdate: ${data.lastUpdate}`);
