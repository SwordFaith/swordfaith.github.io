// Tag pages live at /tags/<slug>/index.html, so a slug must be a single safe
// path segment. Rule: drop characters that would break a file path or URL
// segment (/ \ ? # % and control characters), trim leading and trailing
// dots/whitespace (no hidden files, no `.` or `..`), turn inner whitespace
// runs into `-`, then NFC-normalize the result. Everything else, including
// case and CJK text, is kept, so `RLHF` -> `RLHF` and `代码高亮` -> `代码高亮`.
const UNSAFE_SLUG_CHARACTERS = /[/\\?#%\p{Cc}]/gu;
const EDGE_DOTS_AND_WHITESPACE = /^[.\s]+|[.\s]+$/gu;
const WHITESPACE_RUN = /\s+/gu;
// File names are capped at 255 bytes; keep a margin rather than build right at the limit.
const MAX_TAG_SLUG_BYTES = 200;

// NFC so that composed and decomposed forms of the same visible tag are one tag.
export const getUniqueTags = (tags: readonly string[]): string[] => [
  ...new Set(tags.map((tag) => tag.normalize('NFC'))),
];

export const getTagSlug = (tag: string): string => {
  // Normalize last: stripping a character can leave a decomposed sequence
  // (`e?́` -> `é`) that must match the composed form.
  const slug = tag
    .replace(UNSAFE_SLUG_CHARACTERS, '')
    .replace(EDGE_DOTS_AND_WHITESPACE, '')
    .replace(WHITESPACE_RUN, '-')
    .normalize('NFC');

  if (!slug) throw new Error(`Tag ${JSON.stringify(tag)} produces an empty URL slug.`);
  // Astro's router strips a trailing `.html` from request paths, so /tags/x.html 404s.
  if (slug.endsWith('.html')) throw new Error(`Tag ${JSON.stringify(tag)} must not end in ".html".`);
  if (new TextEncoder().encode(slug).length > MAX_TAG_SLUG_BYTES) {
    throw new Error(`Tag ${JSON.stringify(tag)} is too long for a URL slug (max ${MAX_TAG_SLUG_BYTES} UTF-8 bytes).`);
  }
  return slug;
};

// Astro decodes route params with decodeURI, which leaves `%2B`, `%26`, etc.
// encoded, so links must use encodeURI to round-trip to the registered slug.
// The characters encodeURI leaves alone (`?`, `#`, `/`) never reach a slug.
export const getTagPath = (tag: string): string => `/tags/${encodeURI(getTagSlug(tag))}`;

// Distinct tags must not share a page. Compared case-insensitively because the
// build may run on a case-insensitive filesystem (macOS), where `LLM` and `llm`
// would silently overwrite each other's index.html.
export const assertUniqueTagSlugs = (tags: Iterable<string>): void => {
  const owners = new Map<string, string>();

  for (const tag of tags) {
    const slug = getTagSlug(tag);
    const key = slug.toLowerCase();
    const owner = owners.get(key);

    if (owner !== undefined && owner !== tag) {
      throw new Error(
        `Tag slug collision: ${JSON.stringify(owner)} and ${JSON.stringify(tag)} both map to "${slug}" (case-insensitive).`,
      );
    }
    owners.set(key, tag);
  }
};
