import { describe, expect, it } from 'vitest';
import { assertUniqueTagSlugs, getTagPath, getTagSlug, getUniqueTags } from '../src/utils/tags';

describe('getTagSlug', () => {
  // Tag URLs are meant to be shared, so the slug should be the tag itself
  // whenever the tag is already path-safe.
  it.each([
    ['RLHF', 'RLHF'],
    ['代码高亮', '代码高亮'],
    ['KaTeX', 'KaTeX'],
    ['C++', 'C++'],
    ['Node.js', 'Node.js'],
  ])('keeps the readable tag %j as %j', (tag, slug) => {
    expect(getTagSlug(tag)).toBe(slug);
  });

  it('builds plain paths for plain tags', () => {
    expect(getTagPath('RLHF')).toBe('/tags/RLHF/');
  });

  // Tag pages are emitted as /tags/<slug>/index.html and their canonical URL
  // ends in `/`; a slash-less link costs a redirect on GitHub Pages and 404s
  // under `astro dev` with trailingSlash: 'always'.
  it.each(['RLHF', '代码高亮', 'C++', 'Node.js'])('ends the link to %j with exactly one slash', (tag) => {
    expect(getTagPath(tag)).toMatch(/[^/]\/$/);
  });

  // Astro registers the raw slug as the route param and decodes request paths
  // with decodeURI, which keeps %2B, %26, %40, %3D encoded. A link only reaches
  // its page if decodeURI(link) is exactly the registered slug.
  it.each(['C++', 'R&D', 'user@team', 'a=b', 'reward model', '代码高亮', 'C++ & R&D @ 实验=1'])(
    'links to %j with a path that decodeURI maps back to the registered slug',
    (tag) => {
      expect(decodeURI(getTagPath(tag))).toBe(`/tags/${getTagSlug(tag)}/`);
    },
  );

  // Each slug becomes a directory under dist/tags, so a separator or URL
  // delimiter would create a nested page, a query, a fragment or a broken escape.
  it.each([
    ['a/b', 'ab'],
    ['a\\b', 'ab'],
    ['what?', 'what'],
    ['C#', 'C'],
    ['100%', '100'],
    ['ctrl\u0000\u001f\u007fchars', 'ctrlchars'],
  ])('strips path- and URL-breaking characters from %j', (tag, slug) => {
    expect(getTagSlug(tag)).toBe(slug);
  });

  it('turns inner whitespace runs into a single dash', () => {
    expect(getTagSlug('reward  model　design')).toBe('reward-model-design');
  });

  // Edge dots would create hidden or traversal directories (`.`, `..`), and
  // removing separators must not leave a traversal behind.
  it.each([
    ['.hidden', 'hidden'],
    ['  spaced.  ', 'spaced'],
    ['. LLM .', 'LLM'],
    ['../etc/passwd', 'etcpasswd'],
    ['a/../b', 'a..b'],
    ['%2e%2e', '2e2e'],
  ])('trims edge dots and whitespace from %j', (tag, slug) => {
    expect(getTagSlug(tag)).toBe(slug);
  });

  // An empty slug would emit /tags/ and clobber the tag index page.
  it.each(['', '   ', '/', '?#%', '.', '..', '..\\..'])('fails loudly when %j has no usable characters', (tag) => {
    expect(() => getTagSlug(tag)).toThrow(/empty URL slug/);
  });

  // The same visible tag typed with a precomposed or a combining accent must
  // land on one URL; otherwise links from different posts point to different pages.
  // Astro's router strips a trailing .html from request paths, so such a page
  // would build but never be reachable.
  it('fails loudly for a slug ending in .html', () => {
    expect(() => getTagSlug('notes.html')).toThrow(/must not end in "\.html"/);
    expect(getTagSlug('html')).toBe('html');
  });

  // A slug becomes a directory name; file systems cap names at 255 bytes, and
  // exceeding that aborts the build with an obscure ENAMETOOLONG.
  it('fails loudly and names the tag when the slug is too long', () => {
    const longTag = '强'.repeat(86); // 258 UTF-8 bytes
    expect(() => getTagSlug(longTag)).toThrow(new RegExp(`${longTag}.*too long`));
    expect(getTagSlug('强'.repeat(66))).toBe('强'.repeat(66)); // 198 bytes
  });

  // Stripping `?` between `e` and a combining accent leaves a decomposed
  // sequence; without normalizing last it would pass the collision check next
  // to `café` yet resolve to the same route.
  it('normalizes after stripping so removed characters cannot split a composed form', () => {
    expect(getTagSlug('cafe?́')).toBe('café');
    expect(() => assertUniqueTagSlugs(['café', 'cafe?́'])).toThrow(/collision/);
  });

  it('normalizes to NFC so composed and decomposed forms share a slug', () => {
    const composed = 'café';
    const decomposed = 'café';
    expect(composed).not.toBe(decomposed);
    expect(getTagSlug(decomposed)).toBe(getTagSlug(composed));
    expect(getTagSlug(decomposed)).toBe('café');
  });

  // Published links must keep working across builds: the mapping depends only
  // on the tag text (no hashes, randomness, or call order).
  it('is a stable pure function of the tag', () => {
    const tags = ['RLHF', '代码高亮', 'reward model', 'C#'];
    const first = tags.map(getTagSlug);
    const second = [...tags].reverse().map(getTagSlug).reverse();
    expect(second).toEqual(first);
    expect(first).toEqual(['RLHF', '代码高亮', 'reward-model', 'C']);
  });
});

describe('getUniqueTags', () => {
  it('removes duplicates while keeping first-seen order', () => {
    expect(getUniqueTags(['RLHF', 'DPO', 'RLHF'])).toEqual(['RLHF', 'DPO']);
  });

  it('merges composed and decomposed forms of the same tag', () => {
    expect(getUniqueTags(['café', 'café'])).toEqual(['café']);
  });
});

describe('assertUniqueTagSlugs', () => {
  it('accepts distinct tags', () => {
    expect(() => assertUniqueTagSlugs(['RLHF', 'DPO', '代码高亮', '后训练'])).not.toThrow();
  });

  it('accepts the same tag listed twice', () => {
    expect(() => assertUniqueTagSlugs(['RLHF', 'RLHF'])).not.toThrow();
  });

  // Two different tags writing the same dist/tags/<slug>/index.html would
  // silently drop one tag's posts.
  it('rejects different tags that map to the same slug', () => {
    expect(() => assertUniqueTagSlugs(['C#', 'C'])).toThrow(/collision/);
    expect(() => assertUniqueTagSlugs(['reward model', 'reward-model'])).toThrow(/collision/);
  });

  // macOS build filesystems are case-insensitive: LLM/ and llm/ are the same
  // directory there, while GitHub Pages would serve them as two URLs.
  it('rejects tags whose slugs differ only by case', () => {
    expect(() => assertUniqueTagSlugs(['LLM', 'llm'])).toThrow(/"LLM" and "llm"/);
  });

  it('propagates the empty-slug failure', () => {
    expect(() => assertUniqueTagSlugs(['RLHF', '///'])).toThrow(/empty URL slug/);
  });
});
