import katex from 'katex';
import type { MarkedExtension, Tokens } from 'marked';
import { parseFragment, type DefaultTreeAdapterTypes } from 'parse5';

const DISPLAY = /^\n? {0,3}\$\$(?!\$)((?:\\[\s\S]|\$(?!\$)|[^\\$])+?)\$\$(?!\$)(?=[ \t]*(?:\n|$))/;
const INLINE = /^\$(?![\s$])((?:\\[^\n]|[^\\$\n])+?)\$(?![\d$])/;
const DISPLAY_MARKER = 'notebook-display-math-source';
const INLINE_MARKER = 'notebook-inline-math-source';
const HTML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };

interface MathToken extends Tokens.Generic {
  expression: string;
  display: boolean;
}

function renderToken({ type, expression, display }: MathToken): string {
  const tag = type === 'notebookDisplayMath' ? 'div' : 'span';
  const marker = display ? DISPLAY_MARKER : INLINE_MARKER;
  const text = expression.replace(/[&<>]/g, (character) => HTML_ESCAPES[character]);
  return '<' + tag + ' class="' + marker + '">' + text + '</' + tag + '>';
}

function displayToken(source: string, type: 'notebookDisplayMath' | 'notebookInlineMath'): MathToken | undefined {
  const match = DISPLAY.exec(source);
  const expression = match?.[1].trim();
  if (match && expression) return { type, raw: match[0], expression, display: true };
}

export const notebookMath: MarkedExtension = {
  extensions: [
    {
      name: 'notebookDisplayMath',
      level: 'block',
      tokenizer(source): MathToken | undefined {
        return displayToken(source, 'notebookDisplayMath');
      },
      renderer(token) {
        return renderToken(token as MathToken);
      },
    },
    {
      name: 'notebookInlineMath',
      level: 'inline',
      start(source) {
        if (this.lexer.state.inRawBlock) return undefined;
        const index = source.search(/\n(?= {0,3}\$\$)|(?<!\\)\$/);
        return index < 0 ? undefined : index;
      },
      tokenizer(source): MathToken | undefined {
        if (this.lexer.state.inRawBlock) return undefined;
        // Inside a paragraph, Marked can consume multiline code spans before
        // reaching a line of display math.
        if (source.startsWith('\n')) return displayToken(source, 'notebookInlineMath');
        const match = INLINE.exec(source);
        if (!match || /\s$/.test(match[1])) return undefined;
        return { type: 'notebookInlineMath', raw: match[0], expression: match[1], display: false };
      },
      renderer(token) {
        return renderToken(token as MathToken);
      },
    },
  ],
};

export function renderNotebookMath(parent: DefaultTreeAdapterTypes.ParentNode): void {
  parent.childNodes = parent.childNodes.flatMap((node) => {
    if (!('tagName' in node) || node.tagName === 'pre' || node.tagName === 'code') return node;

    const marker = node.attrs.find(({ name }) => name === 'class')?.value;
    if ((node.tagName === 'span' || node.tagName === 'div')
      && (marker === DISPLAY_MARKER || marker === INLINE_MARKER)
      && node.childNodes.every((child) => child.nodeName === '#text')) {
      const expression = node.childNodes.map((child) => (child as DefaultTreeAdapterTypes.TextNode).value).join('');
      // Add only KaTeX-generated markup after sanitizing the input HTML.
      const math = parseFragment(katex.renderToString(expression, {
        displayMode: marker === DISPLAY_MARKER,
        throwOnError: false,
        trust: false,
      }));
      math.childNodes.forEach((child) => { child.parentNode = parent; });
      return math.childNodes;
    }

    renderNotebookMath(node);
    return node;
  });
}
