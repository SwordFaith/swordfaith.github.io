import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkPath, extractLinks, internalPath, pagePathOf } from '../src/scripts/check-links';

// A miniature dist/: directory-style pages plus a few plain files
const files = new Set([
  'index.html',
  '404.html',
  'blog/index.html',
  'blog/dpo-vs-rlhf/index.html',
  'tags/强化学习/index.html',
  'tags/C++/index.html',
  'favicon.svg',
  'rss.xml',
  'notebooks/rlhf_experiment.ipynb',
]);

// Runs a raw href from a page through the same steps the CLI uses
const check = (href: string, page = '/', requireTrailingSlash = true) => {
  const target = internalPath(href, page);
  return target === null ? 'ignored' : checkPath(target, files, requireTrailingSlash) ?? 'ok';
};

describe('link classification', () => {
  // A link to a page that was never built is a 404 for readers
  it('reports links whose target is not in dist', () => {
    expect(check('/blog/no-such-post/')).toBe('missing');
    expect(check('/blog/no-such-post')).toBe('missing');
    expect(check('/missing.png')).toBe('missing');
  });

  // GitHub Pages answers /blog with a 301 to /blog/, and canonical URLs use the slash form
  it('reports page links without a trailing slash', () => {
    expect(check('/blog')).toBe('no-trailing-slash');
    expect(check('/blog/dpo-vs-rlhf')).toBe('no-trailing-slash');
  });

  it('accepts page links with a trailing slash and the root', () => {
    expect(check('/blog/')).toBe('ok');
    expect(check('/blog/dpo-vs-rlhf/')).toBe('ok');
    expect(check('/')).toBe('ok');
  });

  // Files are served as-is; adding a slash to them would be the bug
  it('accepts file links without a trailing slash', () => {
    expect(check('/favicon.svg')).toBe('ok');
    expect(check('/rss.xml')).toBe('ok');
    expect(check('/notebooks/rlhf_experiment.ipynb')).toBe('ok');
    expect(check('/favicon.svg/')).toBe('missing');
  });

  // Tag pages are written to disk with decoded names, links carry the encoded form
  it('decodes percent-encoded and CJK paths before looking them up', () => {
    expect(check('/tags/%E5%BC%BA%E5%8C%96%E5%AD%A6%E4%B9%A0/')).toBe('ok');
    expect(check('/tags/强化学习/')).toBe('ok');
    expect(check('/tags/%E5%BC%BA%E5%8C%96%E5%AD%A6%E4%B9%A0')).toBe('no-trailing-slash');
    expect(check('/tags/C%2B%2B/')).toBe('ok');
    expect(check('/tags/%E5%BC%BA%E5%8C%96/')).toBe('missing');
  });

  it('ignores other origins, other schemes and fragment-only links', () => {
    for (const href of [
      'https://github.com/SwordFaith',
      'http://swordfaith.github.io/blog/',
      'https://swordfaith.github.io.evil.example/blog/',
      'mailto:someone@example.com',
      'javascript:void(0)',
      '//cdn.example.com/x.js',
      '#main-content',
      '',
    ]) {
      expect(check(href), href).toBe('ignored');
    }
  });

  // Canonical/RSS links and pasted post URLs use the absolute site URL; they can
  // break exactly like root-relative ones
  describe('absolute links on the site origin', () => {
    it('reports a missing page', () => {
      expect(check('https://swordfaith.github.io/blog/deleted-post/')).toBe('missing');
      expect(check('https://swordfaith.github.io/404/')).toBe('missing');
    });

    it('accepts an existing page or file', () => {
      expect(check('https://swordfaith.github.io/blog/dpo-vs-rlhf/')).toBe('ok');
      expect(check('https://swordfaith.github.io/')).toBe('ok');
      expect(check('https://swordfaith.github.io/rss.xml')).toBe('ok');
    });

    it('applies the trailing-slash rule', () => {
      expect(check('https://swordfaith.github.io/blog')).toBe('no-trailing-slash');
    });

    it('treats protocol-relative links to the same host as internal', () => {
      expect(check('//swordfaith.github.io/blog/')).toBe('ok');
      expect(check('//swordfaith.github.io/blog/deleted-post/')).toBe('missing');
    });

    it('uses the origin it is given', () => {
      expect(internalPath('https://example.org/blog/', '/', 'https://example.org')).toBe('/blog/');
      expect(internalPath('https://swordfaith.github.io/blog/', '/', 'https://example.org')).toBeNull();
    });
  });

  it('strips query strings and fragments from internal links', () => {
    expect(internalPath('/blog/?page=2#top', '/')).toBe('/blog/');
    expect(check('/blog/?page=2#top')).toBe('ok');
    expect(check('/blog?page=2')).toBe('no-trailing-slash');
    expect(check('/nope/?page=2')).toBe('missing');
  });

  it('resolves relative links against the page URL', () => {
    expect(internalPath('dpo-vs-rlhf/', '/blog/')).toBe('/blog/dpo-vs-rlhf/');
    expect(internalPath('../', '/blog/dpo-vs-rlhf/')).toBe('/blog/');
  });

  it('can switch the trailing-slash rule off without hiding missing targets', () => {
    expect(check('/blog', '/', false)).toBe('ok');
    expect(check('/no-such-page', '/', false)).toBe('missing');
  });
});

describe('pagePathOf', () => {
  it('maps directory-style files to slash URLs', () => {
    expect(pagePathOf('index.html')).toBe('/');
    expect(pagePathOf('blog/dpo-vs-rlhf/index.html')).toBe('/blog/dpo-vs-rlhf/');
    expect(pagePathOf('404.html')).toBe('/404.html');
  });
});

describe('extractLinks', () => {
  // JSON-LD and inline scripts contain URLs that are not links; they must not be checked
  it('reads href and form action attributes but not script or JSON-LD contents', () => {
    const html = `<!doctype html><html><head>
      <link rel="stylesheet" href="/assets/a.css">
      <script type="application/ld+json">{"url":"/blog/x","href":"/not-a-link"}</script>
      <script>const a = '<a href="/also-not-a-link">';</script>
      </head><body>
      <a href="/blog/">Blog</a>
      <form action="/search/"><input name="q"></form>
      <button formaction="/ignored">x</button>
      </body></html>`;
    expect(extractLinks(html)).toEqual(['/assets/a.css', '/blog/', '/search/']);
  });
});

describe('link checker CLI', () => {
  it('requires a built homepage and scans it', () => {
    const dir = mkdtempSync(join(tmpdir(), 'check-links-'));
    const run = () => spawnSync(process.execPath, ['src/scripts/check-links.ts', dir], { encoding: 'utf8' });
    try {
      const empty = run();
      expect(empty.status).toBe(1);
      expect(empty.stderr).toContain(join(dir, 'index.html'));

      writeFileSync(join(dir, 'index.html'), '<a href="/">Home</a>');
      const built = run();
      expect(built.status).toBe(0);
      expect(built.stdout).toContain('1 internal links in 1 HTML files');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
