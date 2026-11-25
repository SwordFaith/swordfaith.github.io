import katex from 'katex';
import type { MarkedExtension, Tokens } from 'marked';
import { parseFragment, type DefaultTreeAdapterTypes } from 'parse5';

const DISPLAY = /^\$\$(?!\$)((?:\\[\s\S]|\$(?!\$)|[^\\$])+?)\$\$(?!\$)/;
const INLINE = /^\$(?![\s$])((?:\\[^\n]|[^\\$\n])+?)\$(?![\d$])/;
const MARKER = 'notebook-math-source';
const HTML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };

interface MathToken extends Tokens.Generic {
  expression: string;
  display: boolean;
}

function renderToken({ expression, display }: MathToken): string {
  const tag = display ? 'div' : 'span';
  const text = expression.replace(/[&<>]/g, (character) => HTML_ESCAPES[character]);
  return '<' + tag + ' class="' + MARKER + '">' + text + '</' + tag + '>';
}

// Marked handles fenced and inline code before looking for math within their contents.
export const notebookMath: MarkedExtension = {
  extensions: [
    {
      name: 'notebookDisplayMath',
      level: 'block',
      start(source) {
        const index = source.search(/(?<=\n)\$\$(?!\$)/);
        return index < 0 ? undefined : index;
      },
      tokenizer(source): MathToken | undefined {
        const match = DISPLAY.exec(source);
        if (!match || !match[1].trim() || !/^[ \t]*(?:\n|$)/.test(source.slice(match[0].length))) return undefined;
        return { type: 'notebookDisplayMath', raw: match[0], expression: match[1].trim(), display: true };
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
        const index = source.search(/(?<!\\)\$/);
        return index < 0 ? undefined : index;
      },
      tokenizer(source): MathToken | undefined {
        if (this.lexer.state.inRawBlock) return undefined;
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

    if ((node.tagName === 'span' || node.tagName === 'div')
      && node.attrs.some(({ name, value }) => name === 'class' && value === MARKER)
      && node.childNodes.every((child) => child.nodeName === '#text')) {
      const expression = node.childNodes.map((child) => (child as DefaultTreeAdapterTypes.TextNode).value).join('');
      // Add only KaTeX-generated markup after sanitizing the input HTML.
      const math = parseFragment(katex.renderToString(expression, {
        displayMode: node.tagName === 'div',
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
