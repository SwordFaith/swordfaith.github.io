// Tag pages live at /tags/<slug>/index.html, so a slug must be a single safe
// path segment. Rule: NFC-normalize, drop characters that would break a file
// path or URL segment (/ \ ? # % and control characters), trim leading and
// trailing dots/whitespace (no hidden files, no `.` or `..`), and turn inner
// whitespace runs into `-`. Everything else, including case and CJK text, is
// kept, so `RLHF` -> `RLHF` and `代码高亮` -> `代码高亮`.
const UNSAFE_SLUG_CHARACTERS = /[/\\?#%\p{Cc}]/gu;
const EDGE_DOTS_AND_WHITESPACE = /^[.\s]+|[.\s]+$/gu;
const WHITESPACE_RUN = /\s+/gu;

// NFC so that composed and decomposed forms of the same visible tag are one tag.
export const getUniqueTags = (tags: readonly string[]): string[] => [
  ...new Set(tags.map((tag) => tag.normalize('NFC'))),
];

export const getTagSlug = (tag: string): string => {
  const slug = tag
    .normalize('NFC')
    .replace(UNSAFE_SLUG_CHARACTERS, '')
    .replace(EDGE_DOTS_AND_WHITESPACE, '')
    .replace(WHITESPACE_RUN, '-');

  if (!slug) throw new Error(`Tag ${JSON.stringify(tag)} produces an empty URL slug.`);
  return slug;
};

export const getTagPath = (tag: string): string => `/tags/${encodeURIComponent(getTagSlug(tag))}`;

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
