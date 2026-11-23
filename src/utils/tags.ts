import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';

const SAFE_TAG_CHARACTER = /[\p{L}\p{N}]/u;
const MAX_TAG_SLUG_BYTES = 100;
const TAG_HASH_HEX_LENGTH = 24;

const getTagHash = (tag: string): string => {
  const hashInput = JSON.stringify([tag.normalize('NFC'), tag]);
  return createHash('sha256').update(hashInput, 'utf8').digest('hex').slice(0, TAG_HASH_HEX_LENGTH);
};

export const getUniqueTags = (tags: readonly string[]): string[] => [...new Set(tags)];

export const getTagSlug = (tag: string): string => {
  let readableSlug = '';
  let readableSlugBytes = 0;
  const readableByteBudget = MAX_TAG_SLUG_BYTES - TAG_HASH_HEX_LENGTH - 1;

  for (const character of tag) {
    const token = SAFE_TAG_CHARACTER.test(character)
      ? character
      : `~${character.codePointAt(0)!.toString(16)}~`;
    const tokenBytes = Buffer.byteLength(token, 'utf8');

    if (readableSlugBytes + tokenBytes > readableByteBudget) break;

    readableSlug += token;
    readableSlugBytes += tokenBytes;
  }

  return `${readableSlug}~${getTagHash(tag)}`;
};

export const getTagPath = (tag: string): string => `/tags/${encodeURIComponent(getTagSlug(tag))}`;
