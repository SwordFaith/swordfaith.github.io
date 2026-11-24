/**
 * Build-output link check.
 *
 * Scans every HTML file in dist/ (except Pagefind's) for internal `href` and form
 * `action` values and fails when a link points at nothing in dist/, or, with
 * --require-trailing-slash, when a link to a page lacks the trailing slash
 * (GitHub Pages answers those with a 301 and they disagree with the canonical URL).
 * Absolute links on the site's own origin (SITE.origin) count as internal. <link>
 * elements (canonical, RSS, sitemap, stylesheets) get the same rules as <a>: a
 * canonical that 404s or redirects is a real defect even though it is metadata.
 *
 * Usage: node src/scripts/check-links.ts [--require-trailing-slash] [distDir]
 */

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parse } from 'parse5';
import type { DefaultTreeAdapterMap } from 'parse5';
import { SITE } from '../config/site.ts';

type HtmlNode = DefaultTreeAdapterMap['node'];

export type LinkProblem = 'missing' | 'no-trailing-slash';

/**
 * Known defects that are reported as warnings instead of failing the check.
 * Keep each entry exact (page + raw link value) and remove it once fixed.
 */
const KNOWN_ISSUES = [
  // The 404 page is emitted as 404.html, but its canonical points at /404/ (no such page).
  { page: '404.html', link: `${SITE.origin}/404/` },
];

/**
 * Returns the decoded pathname a link points at, or null when the link is not
 * internal. Internal means relative, root-relative, or absolute/protocol-relative
 * on the site's own origin; other origins, mailto: and other schemes, fragment-only
 * and empty values are ignored. Query strings and fragments are dropped.
 */
export function internalPath(value: string, pagePath: string, origin: string = SITE.origin): string | null {
  const link = value.trim();
  if (link === '' || link.startsWith('#')) return null;
  let url: URL;
  try {
    url = new URL(link, origin + pagePath);
  } catch {
    // Only absolute URLs with an invalid host can fail to parse; none are on this site
    return null;
  }
  if (url.origin !== origin) return null;
  const { pathname } = url;
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
  const unseenKnownIssues = new Set(KNOWN_ISSUES);
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
      if (problem === null) continue;
      const message = problem === 'missing'
        ? `${page}: ${value} -> target not found in dist (${target}); link to an existing page or file`
        : `${page}: ${value} -> page link without trailing slash; use ${target}/`;
      const known = KNOWN_ISSUES.find((issue) => issue.page === page && issue.link === value);
      if (known) {
        unseenKnownIssues.delete(known);
        console.warn(`Known issue (not failing): ${message}`);
      } else {
        problems.push(`  ${message}`);
      }
    }
  }
  for (const issue of unseenKnownIssues) {
    console.warn(`Known issue no longer found, remove it from KNOWN_ISSUES: ${issue.page}: ${issue.link}`);
  }

  const rules = requireTrailingSlash ? 'missing targets, trailing slashes' : 'missing targets';
  if (problems.length > 0) {
    console.error(
      `Link check failed (${rules}): ${problems.length} problem(s) in ${pages.length} HTML files.`
      + ' Fix the links in the source pages; reproduce locally with: npm run build && npm run check:links\n',
    );
    console.error(problems.join('\n'));
    process.exit(1);
  }
  console.log(`Link check passed (${rules}): ${checked} internal links in ${pages.length} HTML files`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
