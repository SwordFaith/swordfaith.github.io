import { Buffer } from 'node:buffer';
import { createShikiHighlighter } from '@astrojs/markdown-remark/shiki';
import { Marked } from 'marked';
import {
  parseFragment,
  serialize,
  type DefaultTreeAdapterTypes,
} from 'parse5';
import { readNotebookSource } from './notebook-source';

export interface NotebookCell {
  cell_type: 'code' | 'markdown' | 'raw';
  source: string | string[];
  attachments?: Record<string, unknown>;
  outputs?: NotebookOutput[];
  execution_count?: number | null;
  metadata?: Record<string, unknown>;
}

export interface NotebookOutput {
  output_type: 'execute_result' | 'display_data' | 'stream' | 'error';
  data?: Record<string, unknown>;
  text?: string | string[];
  name?: string;
  ename?: string;
  evalue?: string;
  traceback?: string[];
  execution_count?: number;
}

export interface NotebookData {
  cells: NotebookCell[];
  metadata: {
    kernelspec?: {
      display_name: string;
      language: string;
      name: string;
    };
    language_info?: {
      name: string;
      version?: string;
    };
  };
  nbformat: number;
  nbformat_minor: number;
}

export interface ParsedNotebook {
  title: string;
  cells: ParsedCell[];
  metadata: NotebookData['metadata'];
  executionCount: number;
  /** Code cell language for highlighting, from notebook metadata; 'plaintext' when unknown. */
  language: string;
}

export interface ParsedCell {
  id: string;
  type: 'code' | 'markdown' | 'raw';
  source: string;
  attachments?: ReadonlyMap<string, string>;
  outputs: ParsedOutput[];
  executionCount?: number | null;
}

export interface ParsedOutput {
  type: 'text' | 'html' | 'image' | 'json' | 'error' | 'unsupported';
  content: string;
  mimeType?: string;
  streamName?: string;
}

const ALLOWED_HTML_TAGS = new Set([
  'a', 'abbr', 'b', 'blockquote', 'br', 'caption', 'code', 'col',
  'colgroup', 'dd', 'details', 'div', 'dl', 'dt', 'em', 'figcaption',
  'figure', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'i', 'img',
  'kbd', 'li', 'mark', 'ol', 'p', 'pre', 's', 'small', 'span', 'strong',
  'sub', 'summary', 'sup', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead',
  'tr', 'u', 'ul', 'var',
]);

const IMAGE_MIME_TYPES = ['image/png', 'image/jpeg'] as const;
type ImageMimeType = (typeof IMAGE_MIME_TYPES)[number];

const GLOBAL_HTML_ATTRIBUTES = new Set(['aria-label', 'class', 'title']);
const TAG_HTML_ATTRIBUTES: Record<string, Set<string>> = {
  a: new Set(['href']),
  details: new Set(['open']),
  img: new Set(['alt', 'height', 'loading', 'src', 'width']),
  ol: new Set(['start']),
  td: new Set(['colspan', 'rowspan']),
  th: new Set(['colspan', 'rowspan', 'scope']),
};

function textValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.filter((part): part is string => typeof part === 'string').join('');
  }
  return typeof value === 'string' ? value : '';
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isSafeUrl(value: string, image = false): boolean {
  const url = value.trim();
  if (!url || /[\u0000-\u0020]/.test(url)) return false;
  if (/^https?:\/\//i.test(url)) return true;
  if (!image && /^mailto:/i.test(url)) return true;
  // Browsers treat `\` like `/`, so `/\host` and `\\host` are protocol-relative too.
  if (/^#/.test(url) || /^\/(?![/\\])/.test(url)) return true;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(url) && !/^[/\\]{2}/.test(url)) return true;
  return false;
}

function validImageBase64(value: unknown, mimeType: ImageMimeType): string | null {
  const base64 = textValue(value).replace(/\s/g, '');
  if (!base64 || base64.length % 4 === 1 || !/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) {
    return null;
  }

  const bytes = Buffer.from(base64, 'base64');
  const isPng = bytes.length >= 8
    && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isJpeg = bytes.length >= 3
    && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;

  return (mimeType === 'image/png' && isPng) || (mimeType === 'image/jpeg' && isJpeg)
    ? base64
    : null;
}

function parseAttachments(attachments: unknown): ReadonlyMap<string, string> | undefined {
  if (!attachments || typeof attachments !== 'object' || Array.isArray(attachments)) return undefined;

  const images = new Map<string, string>();
  for (const [name, bundle] of Object.entries(attachments)) {
    if (!bundle || typeof bundle !== 'object' || Array.isArray(bundle)) continue;
    for (const mimeType of IMAGE_MIME_TYPES) {
      const base64 = validImageBase64((bundle as Record<string, unknown>)[mimeType], mimeType);
      if (!base64) continue;
      images.set(name, `data:${mimeType};base64,${base64}`);
      break;
    }
  }
  return images;
}

function resolveAttachment(url: string, attachments: ReadonlyMap<string, string>): string | undefined {
  const name = url.slice('attachment:'.length);
  const image = attachments.get(name);
  if (image) return image;

  try {
    return attachments.get(decodeURIComponent(name));
  } catch {
    return undefined;
  }
}

function sanitizeAttribute(
  tagName: string,
  attribute: DefaultTreeAdapterTypes.Element['attrs'][number],
): boolean {
  if (attribute.namespace) return false;
  const name = attribute.name.toLowerCase();
  const allowed = GLOBAL_HTML_ATTRIBUTES.has(name)
    || TAG_HTML_ATTRIBUTES[tagName]?.has(name);
  if (!allowed) return false;
  if (name === 'href') return isSafeUrl(attribute.value);
  if (name === 'src') {
    if (isSafeUrl(attribute.value, true)) return true;
    const match = /^data:(image\/(?:png|jpeg));base64,(.+)$/i.exec(attribute.value);
    return Boolean(match && validImageBase64(match[2], match[1].toLowerCase() as ImageMimeType));
  }
  return true;
}

function sanitizeNode(
  node: DefaultTreeAdapterTypes.ChildNode,
  attachments?: ReadonlyMap<string, string>,
): DefaultTreeAdapterTypes.ChildNode | null {
  if (node.nodeName === '#text') return node;
  if (!('tagName' in node)) return null;
  if (node.namespaceURI !== 'http://www.w3.org/1999/xhtml' || !ALLOWED_HTML_TAGS.has(node.tagName)) {
    return null;
  }

  if (node.tagName === 'img' && attachments) {
    const src = node.attrs.find((attribute) => attribute.name === 'src');
    if (src && /^attachment:/i.test(src.value)) {
      src.value = resolveAttachment(src.value, attachments) ?? '';
    }
  }

  node.attrs = node.attrs.filter((attribute) => sanitizeAttribute(node.tagName, attribute));
  if (node.tagName === 'a') {
    node.attrs.push({ name: 'rel', value: 'noopener noreferrer' });
  }
  if (node.tagName === 'img' && !node.attrs.some((attribute) => attribute.name === 'src')) {
    return null;
  }
  node.childNodes = node.childNodes
    .map((child) => sanitizeNode(child, attachments))
    .filter((child): child is DefaultTreeAdapterTypes.ChildNode => child !== null);
  return node;
}

export function sanitizeNotebookFragment(
  html: string,
  attachments?: ReadonlyMap<string, string>,
): DefaultTreeAdapterTypes.DocumentFragment {
  const fragment = parseFragment(html);
  fragment.childNodes = fragment.childNodes
    .map((node) => sanitizeNode(node, attachments))
    .filter((node): node is DefaultTreeAdapterTypes.ChildNode => node !== null);
  return fragment;
}

export function sanitizeNotebookHtml(html: string): string {
  return serialize(sanitizeNotebookFragment(html));
}

// Same themes as markdown.shikiConfig in astro.config.mjs, so notebook code matches blog posts.
// Shiki inlines the light colours; the global `html.dark .astro-code` rule in astrowind.css swaps in the dark ones.
const SHIKI_THEMES = { light: 'github-light', dark: 'github-dark' } as const;

const markdown = new Marked();

function notebookLanguage(metadata: NotebookData['metadata']): string {
  const name = [metadata.language_info?.name, metadata.kernelspec?.language]
    .find((value): value is string => typeof value === 'string' && value.trim() !== '');
  return name?.trim().toLowerCase() ?? 'plaintext';
}

/**
 * Highlights code at build time. The rendered text equals `code` (apart from CRLF becoming LF), unknown
 * languages render as plain text, and a highlighter failure falls back to plain text instead of failing
 * the build. Output is trusted HTML.
 */
export async function highlightNotebookCode(code: string, language: string): Promise<string> {
  const name = language.trim().toLowerCase();
  // Shiki resolves names through plain-object lookups, and the highlighter is cached for the whole build:
  // names like "constructor" or "__proto__" hit Object.prototype and break later language loads.
  const lang = name && !(name in Object.prototype) ? name : 'plaintext';
  const highlighter = await createShikiHighlighter({ themes: SHIKI_THEMES });
  // Astro's helper strips one trailing newline; add one so the rendered text keeps every newline of the source.
  const source = `${code}\n`;
  try {
    return await highlighter.codeToHtml(source, lang, { defaultColor: 'light' });
  } catch (error) {
    // e.g. Shiki's `ansi` mode throws on some malformed escape sequences.
    console.warn(`[notebook] Highlighting as "${lang}" failed, rendering plain text: ${errorMessage(error)}`);
    return highlighter.codeToHtml(source, 'plaintext', { defaultColor: 'light' });
  }
}

// Only blocks shaped like Markdown code tokens can be rebuilt without changing what the reader sees.
function plainCodeChild(pre: DefaultTreeAdapterTypes.Element): DefaultTreeAdapterTypes.Element | null {
  const [code, ...rest] = pre.childNodes;
  if (rest.length > 0 || !code || !('tagName' in code) || code.tagName !== 'code') return null;
  return code.childNodes.every((child) => child.nodeName === '#text') ? code : null;
}

function collectPreElements(
  node: DefaultTreeAdapterTypes.ParentNode,
  found: DefaultTreeAdapterTypes.Element[],
): DefaultTreeAdapterTypes.Element[] {
  for (const child of node.childNodes) {
    if (!('tagName' in child)) continue;
    if (child.tagName === 'pre') found.push(child);
    else collectPreElements(child, found);
  }
  return found;
}

/**
 * Renders an untrusted Markdown cell. The HTML is sanitized first; afterwards each <pre> holding only a
 * text-only <code> (the shape of Markdown code blocks) is rebuilt by Shiki from that text, so Shiki's inline
 * styles never pass through the sanitizer, which keeps dropping style attributes. Any other <pre> stays as
 * sanitized, unhighlighted HTML.
 */
export async function renderNotebookMarkdown(source: string): Promise<string> {
  const fragment = parseFragment(sanitizeNotebookHtml(markdown.parse(source, { async: false })));
  await Promise.all(collectPreElements(fragment, []).map(async (pre) => {
    const code = plainCodeChild(pre);
    if (!code) return;
    const text = code.childNodes.map((child) => (child as DefaultTreeAdapterTypes.TextNode).value).join('');
    const className = code.attrs.find((attribute) => attribute.name === 'class')?.value ?? '';
    const language = className.match(/(?:^|\s)language-(\S+)/)?.[1] ?? 'plaintext';
    const highlighted = parseFragment(await highlightNotebookCode(text, language));
    const shikiPre = highlighted.childNodes.find(
      (child): child is DefaultTreeAdapterTypes.Element => 'tagName' in child && child.tagName === 'pre',
    );
    if (!shikiPre) throw new Error('Shiki did not return a <pre> element.');
    pre.attrs = shikiPre.attrs;
    pre.childNodes = shikiPre.childNodes;
    pre.childNodes.forEach((child) => { child.parentNode = pre; });
  }));
  return serialize(fragment);
}

export class NotebookParser {
  static parse(notebookJson: NotebookData): ParsedNotebook {
    const cells = notebookJson.cells.map((cell, index) => this.parseCell(cell, index));
    return {
      title: this.extractTitle(cells),
      cells,
      metadata: notebookJson.metadata,
      executionCount: cells.filter((cell) => typeof cell.executionCount === 'number').length,
      language: notebookLanguage(notebookJson.metadata),
    };
  }

  private static parseCell(cell: NotebookCell, index: number): ParsedCell {
    return {
      id: `cell-${index}`,
      type: cell.cell_type,
      source: textValue(cell.source).replace(/\r\n?/g, '\n'),
      attachments: cell.cell_type === 'markdown' ? parseAttachments(cell.attachments) : undefined,
      outputs: Array.isArray(cell.outputs)
        ? cell.outputs.map((output) => this.parseOutput(output))
        : [],
      executionCount: cell.execution_count,
    };
  }

  private static parseOutput(output: NotebookOutput): ParsedOutput {
    if (!output || typeof output !== 'object') {
      return { type: 'unsupported', content: 'Invalid notebook output.' };
    }

    switch (output.output_type) {
      case 'stream':
        return {
          type: 'text',
          content: textValue(output.text),
          mimeType: 'text/plain',
          streamName: output.name,
        };
      case 'execute_result':
      case 'display_data':
        return this.parseRichOutput(output.data);
      case 'error': {
        const summary = [output.ename, output.evalue].filter(Boolean).join(': ');
        const traceback = Array.isArray(output.traceback)
          ? output.traceback.filter((line): line is string => typeof line === 'string').join('\n')
          : '';
        return {
          type: 'error',
          content: this.stripAnsi(traceback || summary || 'Notebook execution error.'),
        };
      }
      default:
        return {
          type: 'unsupported',
          content: `Unsupported output type: ${String((output as { output_type?: unknown }).output_type)}.`,
        };
    }
  }

  private static parseRichOutput(data?: Record<string, unknown>): ParsedOutput {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return { type: 'unsupported', content: 'Output has no readable MIME data.' };
    }

    for (const mimeType of IMAGE_MIME_TYPES) {
      if (!(mimeType in data)) continue;
      const content = validImageBase64(data[mimeType], mimeType);
      if (content) return { type: 'image', content, mimeType };
    }

    if ('text/html' in data) {
      const content = sanitizeNotebookHtml(textValue(data['text/html']));
      if (content) return { type: 'html', content, mimeType: 'text/html' };
    }

    if ('application/json' in data) {
      const json = JSON.stringify(data['application/json'], null, 2);
      if (json !== undefined) {
        return { type: 'json', content: json, mimeType: 'application/json' };
      }
    }

    if ('text/plain' in data) {
      const content = textValue(data['text/plain']);
      if (content) return { type: 'text', content, mimeType: 'text/plain' };
    }

    const mimeTypes = Object.keys(data);
    return {
      type: 'unsupported',
      content: mimeTypes.length > 0
        ? `Unsupported or invalid output MIME: ${mimeTypes.join(', ')}.`
        : 'Output has no readable MIME data.',
    };
  }

  private static stripAnsi(value: string): string {
    return value
      .replace(/\u001b\][^\u0007]*(?:\u0007|\u001b\\)/g, '')
      .replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, '');
  }

  private static extractTitle(cells: ParsedCell[]): string {
    const firstMarkdownCell = cells.find((cell) => cell.type === 'markdown');
    const titleLine = firstMarkdownCell?.source
      .split('\n')
      .find((line) => line.startsWith('# '));
    return titleLine?.slice(2).trim() || 'Untitled Notebook';
  }

  static async loadNotebook(notebookPath: string): Promise<ParsedNotebook> {
    const source = await readNotebookSource(notebookPath);
    let notebookJson: unknown;
    try {
      notebookJson = JSON.parse(source);
    } catch (error) {
      throw new Error(`Invalid notebook JSON in "${notebookPath}": ${errorMessage(error)}.`);
    }

    return this.parse(this.validateNotebook(notebookJson, notebookPath));
  }

  private static validateNotebook(value: unknown, notebookPath: string): NotebookData {
    const fail = (detail: string): never => {
      throw new Error(`Invalid notebook "${notebookPath}": ${detail}`);
    };
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      fail('expected a JSON object.');
    }

    const notebook = value as Partial<NotebookData>;
    if (notebook.nbformat !== 4) fail('expected nbformat 4.');
    if (!Array.isArray(notebook.cells)) fail('expected a cells array.');
    if (!notebook.metadata || typeof notebook.metadata !== 'object' || Array.isArray(notebook.metadata)) {
      fail('expected a metadata object.');
    }

    notebook.cells.forEach((cell, index) => {
      if (!cell || typeof cell !== 'object' || Array.isArray(cell)) {
        fail(`cell ${index} must be an object.`);
      }
      if (!['code', 'markdown', 'raw'].includes(cell.cell_type)) {
        fail(`cell ${index} has unsupported cell_type ${String(cell.cell_type)}.`);
      }
      const validSource = typeof cell.source === 'string'
        || (Array.isArray(cell.source) && cell.source.every((part) => typeof part === 'string'));
      if (!validSource) fail(`cell ${index} source must be a string or string array.`);
      if (cell.outputs !== undefined && !Array.isArray(cell.outputs)) {
        fail(`cell ${index} outputs must be an array.`);
      }
    });

    return notebook as NotebookData;
  }
}
