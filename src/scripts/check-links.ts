/**
 * Build-output link check.
 *
 * Scans every HTML file in dist/ (except Pagefind's) for internal `href` and form
 * `action` values and fails when a link points at nothing in dist/, or, with
 * --require-trailing-slash, when a link to a page lacks the trailing slash
 * (GitHub Pages answers those with a 301 and they disagree with the canonical URL).
 *
 * Usage: node src/scripts/check-links.ts [--require-trailing-slash] [distDir]
 */

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parse } from 'parse5';
import type { DefaultTreeAdapterMap } from 'parse5';

type HtmlNode = DefaultTreeAdapterMap['node'];

export type LinkProblem = 'missing' | 'no-trailing-slash';

// Placeholder origin used only to resolve relative links against the page URL
const BASE = 'http://site.invalid';

/**
 * Returns the decoded pathname a link points at, or null when the link is not
 * an internal page/file link (external, mailto:, protocol-relative, fragment-only, empty).
 * Query strings and fragments are dropped.
 */
export function internalPath(value: string, pagePath: string): string | null {
  const link = value.trim();
  if (link === '' || link.startsWith('#') || link.startsWith('//')) return null;
  if (/^[a-z][a-z\d+.-]*:/i.test(link)) return null;
  const { pathname } = new URL(link, BASE + pagePath);
  try {
    return decodeURIComponent(pathname);
  } catch {
    // Malformed percent-encoding: keep it raw so it is reported as missing
    return pathname;
  }
}

/**
 * Checks one decoded internal path against the set of dist-relative files
 * (posix separators, e.g. "blog/x/index.html"). Returns null when the link is fine.
 */
export function checkPath(
  target: string,
  files: ReadonlySet<string>,
  requireTrailingSlash: boolean,
): LinkProblem | null {
  const rel = target.replace(/^\/+/, '');
  if (rel === '' || rel.endsWith('/')) {
    return files.has(`${rel}index.html`) ? null : 'missing';
  }
  if (files.has(rel)) return null;
  if (files.has(`${rel}/index.html`)) return requireTrailingSlash ? 'no-trailing-slash' : null;
  return 'missing';
}

/** URL path a dist-relative HTML file is served at ("blog/x/index.html" -> "/blog/x/"). */
export function pagePathOf(htmlFile: string): string {
  return `/${htmlFile.replace(/(^|\/)index\.html$/, '$1')}`;
}

/** Collects internal href/action values; script and template contents are never parsed as elements. */
export function extractLinks(html: string): string[] {
  const links: string[] = [];
  const walk = (node: HtmlNode): void => {
    if ('attrs' in node) {
      for (const { name, value } of node.attrs) {
        if (name === 'href' || (name === 'action' && node.nodeName === 'form')) links.push(value);
      }
    }
    if ('childNodes' in node) node.childNodes.forEach(walk);
  };
  walk(parse(html));
  return links;
}

function listFiles(dir: string): string[] {
  return fs
    .readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.relative(dir, path.join(entry.parentPath, entry.name)).split(path.sep).join('/'));
}

function main(): void {
  const args = process.argv.slice(2);
  const requireTrailingSlash = args.includes('--require-trailing-slash');
  const distDir = path.resolve(args.find((arg) => !arg.startsWith('--')) ?? 'dist');
  if (!fs.existsSync(distDir)) {
    console.error(`Link check: ${distDir} does not exist; run the build first`);
    process.exit(1);
  }

  const files = new Set(listFiles(distDir));
  const pages = [...files].filter((file) => file.endsWith('.html') && !file.startsWith('pagefind/')).sort();
  const problems: string[] = [];
  let checked = 0;

  for (const page of pages) {
    const pagePath = pagePathOf(page);
    const seen = new Set<string>();
    for (const value of extractLinks(fs.readFileSync(path.join(distDir, page), 'utf8'))) {
      const target = internalPath(value, pagePath);
      if (target === null || seen.has(value)) continue;
      seen.add(value);
      checked++;
      const problem = checkPath(target, files, requireTrailingSlash);
      if (problem === 'missing') {
        problems.push(`  ${page}: ${value} -> target not found in dist (${target})`);
      } else if (problem === 'no-trailing-slash') {
        problems.push(`  ${page}: ${value} -> page link without trailing slash (use ${target}/)`);
      }
    }
  }

  const rules = requireTrailingSlash ? 'missing targets, trailing slashes' : 'missing targets';
  if (problems.length > 0) {
    console.error(`Link check failed (${rules}): ${problems.length} problem(s) in ${pages.length} HTML files\n`);
    console.error(problems.join('\n'));
    process.exit(1);
  }
  console.log(`Link check passed (${rules}): ${checked} internal links in ${pages.length} HTML files`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
