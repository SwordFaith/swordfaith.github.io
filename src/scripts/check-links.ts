/**
 * Build-output link check.
 *
 * Scans every HTML file in dist/ (except Pagefind's) for internal links, image
 * sources and HTML fragment targets. With --require-trailing-slash, the check
 * also fails when a link to a page lacks the trailing slash
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
import parseSrcset from 'parse-srcset';
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

/** Resolve against the built page URL, skipping empty and off-site references. */
export function internalUrl(value: string, pagePath: string, origin: string = SITE.origin): URL | null {
  if (!value.trim()) return null;
  try {
    const url = new URL(value, origin + pagePath);
    return url.origin === origin ? url : null;
  } catch {
    return null;
  }
}

function decode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
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

/** Collect URL references and fragment targets in one pass over the rendered document. */
export function inspectHtml(html: string) {
  const anchors = new Set<string>();
  const links: string[] = [];
  const walk = (node: HtmlNode): void => {
    if ('attrs' in node) {
      for (const { name, value } of node.attrs) {
        if (name === 'srcset' && (node.nodeName === 'img' || node.nodeName === 'source')) {
          for (const candidate of parseSrcset(value)) links.push(candidate.url);
        }
        if (name === 'id' || (name === 'name' && node.nodeName === 'a')) anchors.add(value);
        if (name === 'href' || (name === 'action' && node.nodeName === 'form') ||
            (name === 'src' && node.nodeName === 'img')) links.push(value);
      }
    }
    if ('childNodes' in node) node.childNodes.forEach(walk);
  };
  walk(parse(html));
  return { links, anchors };
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
  if (!files.has('index.html')) {
    console.error(`Link check: missing ${path.join(distDir, 'index.html')}; check the build output directory`);
    process.exit(1);
  }
  const pages = [...files].filter((file) => file.endsWith('.html') && !file.startsWith('pagefind/')).sort();
  const problems: string[] = [];
  const unseenKnownIssues = new Set(KNOWN_ISSUES);
  let checked = 0;

  const documents = new Map(pages.map((page) => [
    page, inspectHtml(fs.readFileSync(path.join(distDir, page), 'utf8')),
  ] as const));

  for (const [page, document] of documents) {
    const pagePath = pagePathOf(page);
    const seen = new Set<string>();
    for (const value of document.links) {
      const url = internalUrl(value, pagePath);
      if (!url || seen.has(value)) continue;
      const target = decode(url.pathname);
      seen.add(value);
      checked++;
      const problem = checkPath(target, files, requireTrailingSlash);
      if (problem === null) {
        // Browsers resolve any element fragment before the optional text directive.
        const rawFragment = url.hash.slice(1).split(':~:')[0];
        const fragment = decode(rawFragment);
        if (fragment && fragment.toLowerCase() !== 'top') {
          const rel = target.slice(1);
          const file = files.has(rel) ? rel : path.posix.join(rel, 'index.html');
          const destination = documents.get(file);
          if (destination && !destination.anchors.has(rawFragment) && !destination.anchors.has(fragment)) {
            problems.push(`  ${page}: ${value} -> missing HTML anchor in ${file}`);
          }
        }
        continue;
      }
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
