import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parse } from 'parse5';
import { formatNumber } from '../utils/number-formatter.ts';

const html = readFileSync('dist/about/index.html', 'utf8');
const { summary, recentActivity, lastUpdate } = JSON.parse(readFileSync('src/data/github-stats.json', 'utf8'));

function* elements(node) {
  if (node.tagName) yield node;
  for (const child of node.childNodes ?? []) yield* elements(child);
}

function text(node) {
  if (node.nodeName === '#text') return node.value;
  if (['script', 'style', 'template'].includes(node.tagName)) return '';
  return (node.childNodes ?? []).map(text).join(' ').replace(/\s+/g, ' ').trim();
}

const sections = [...elements(parse(html))].filter(node =>
  node.attrs.some(attr => attr.name === 'id' && attr.value === 'github-stats')
);
assert.equal(sections.length, 1, 'Expected one #github-stats section on the built About page');
const nodes = [...elements(sections[0])];
const activity = recentActivity.thisYear;
for (const [label, value] of [
  ['总 Stars', formatNumber(summary.totalStars)],
  ['公开仓库', summary.totalRepos],
  ['总 Forks', summary.totalForks],
  ['注册至今年数', summary.activeYears],
  ['今年估算提交数', activity.estimatedCommits],
  ['估算月均提交', activity.monthlyAverage],
  ['估算周均提交', activity.weeklyAverage],
]) {
  assert.ok(nodes.some(node => text(node) === `${value} ${label}`), `Missing or incorrect About statistic: ${label} (expected ${value})`);
}

const timestamp = nodes.find(node => node.tagName === 'time' &&
  node.attrs.some(attr => attr.name === 'datetime' && attr.value === lastUpdate));
assert.ok(timestamp, 'Expected a <time> with the snapshot lastUpdate');
assert.ok(text(timestamp.parentNode).includes('UTC'), 'Expected a UTC label for the snapshot time');
assert.equal(text(timestamp), new Date(lastUpdate).toISOString().slice(0, 16).replace('T', ' '));
console.log('About statistics match the build snapshot and estimated-commit labels.');
