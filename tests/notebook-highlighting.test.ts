import { parseFragment, type DefaultTreeAdapterTypes } from 'parse5';
import { describe, expect, it } from 'vitest';
import {
  highlightNotebookCode,
  NotebookParser,
  renderNotebookMarkdown,
  type NotebookData,
} from '../src/utils/notebook-parser';

// Markdown cells come from .ipynb files we do not control and are injected with set:html.
// Highlighting needs inline style attributes, which the sanitizer must keep rejecting for
// notebook-authored HTML, so styles may only appear on markup Shiki generated itself.

type Element = DefaultTreeAdapterTypes.Element;

function elementsOf(html: string): Element[] {
  const result: Element[] = [];
  const walk = (nodes: DefaultTreeAdapterTypes.ChildNode[]) => {
    for (const node of nodes) {
      if (!('tagName' in node)) continue;
      result.push(node);
      walk(node.childNodes);
    }
  };
  walk(parseFragment(html).childNodes);
  return result;
}

function attr(element: Element, name: string): string | undefined {
  return element.attrs.find((attribute) => attribute.name === name)?.value;
}

function textOf(node: DefaultTreeAdapterTypes.ChildNode): string {
  if (node.nodeName === '#text') return (node as DefaultTreeAdapterTypes.TextNode).value;
  return 'childNodes' in node ? node.childNodes.map(textOf).join('') : '';
}

// Every element carrying a style attribute must sit inside a Shiki-generated <pre class="astro-code">.
function stylesOutsideShiki(html: string): string[] {
  const offenders: string[] = [];
  const walk = (nodes: DefaultTreeAdapterTypes.ChildNode[], insideShiki: boolean) => {
    for (const node of nodes) {
      if (!('tagName' in node)) continue;
      const isShikiPre = node.tagName === 'pre' && /\bastro-code\b/.test(attr(node, 'class') ?? '');
      const style = attr(node, 'style');
      if (style !== undefined && !insideShiki && !isShikiPre) offenders.push(`${node.tagName}: ${style}`);
      walk(node.childNodes, insideShiki || isShikiPre);
    }
  };
  walk(parseFragment(html).childNodes, false);
  return offenders;
}

describe('renderNotebookMarkdown: highlighting', () => {
  it('renders fenced code with the same dual-theme Shiki markup as blog posts', async () => {
    // The global `html.dark .astro-code` rule only switches themes for this exact markup shape.
    const html = await renderNotebookMarkdown('```python\n# note\ndef f():\n    return "s"\n```');
    const pre = elementsOf(html).find((element) => element.tagName === 'pre');
    expect(pre && attr(pre, 'class')).toMatch(/\bastro-code\b/);
    expect(pre && attr(pre, 'data-language')).toBe('python');
    expect(pre && attr(pre, 'style')).toContain('--shiki-dark-bg');

    const keyword = elementsOf(html).find((element) => element.tagName === 'span' && textOf(element) === 'def');
    expect(keyword && attr(keyword, 'style')).toMatch(/^color:#[0-9A-F]{6};--shiki-dark:#[0-9A-F]{6}$/i);
  });

  it('shows exactly the fenced text, so highlighting never alters the code', async () => {
    const source = 'if a < b and c > d:\n    print("x & y")  # tail';
    const html = await renderNotebookMarkdown(`\`\`\`python\n${source}\n\`\`\``);
    const code = elementsOf(html).find((element) => element.tagName === 'code');
    expect(code && textOf(code)).toBe(source);
  });

  it('leaves inline code and surrounding Markdown alone', async () => {
    expect(await renderNotebookMarkdown('Call `loss.backward()` **now**.'))
      .toBe('<p>Call <code>loss.backward()</code> <strong>now</strong>.</p>\n');
  });

  it.each(['no-such-lang', 'constructor', '__proto__', ''])(
    'falls back to plain text for the unknown fence language %j instead of failing the build',
    async (language) => {
      const html = await renderNotebookMarkdown(`\`\`\`${language}\nx = 1\n\`\`\``);
      const pre = elementsOf(html).find((element) => element.tagName === 'pre');
      expect(pre && attr(pre, 'data-language')).toBe('plaintext');
      expect(html).toContain('x = 1');
    },
  );
});

describe('renderNotebookMarkdown: security', () => {
  it('cannot smuggle style or class payloads through a fake pre-highlighted block', async () => {
    // Raw HTML in a Markdown cell posing as Shiki output must be rebuilt from its text,
    // identical to a genuine fenced block holding the same code.
    const fake = await renderNotebookMarkdown(
      '<pre class="astro-code" style="position:fixed;inset:0;z-index:99">'
      + '<code class="language-python fixed inset-0 evil-class">'
      + '<span style="color:red;background:url(https://evil.example/x)" class="evil-span">x = 1</span>'
      + '</code></pre>',
    );
    const genuine = await renderNotebookMarkdown('```python\nx = 1\n```');
    expect(fake.trim()).toBe(genuine.trim());
    expect(fake).not.toMatch(/position:fixed|evil|z-index|inset-0/);
  });

  it('still strips style attributes from notebook HTML outside code blocks', async () => {
    const html = await renderNotebookMarkdown(
      '<div style="position:fixed;inset:0" class="note">overlay</div>\n\n'
      + '<p><span style="color:red">red</span></p>\n\n```python\nx = 1\n```',
    );
    expect(stylesOutsideShiki(html)).toEqual([]);
    expect(html).not.toContain('position:fixed');
    expect(html).toContain('overlay');
  });

  it('escapes markup inside fenced code instead of rendering it', async () => {
    const html = await renderNotebookMarkdown('```html\n<script>alert(1)</script><img src=x onerror=alert(2)>\n```');
    const tags = elementsOf(html).map((element) => element.tagName);
    expect(tags).not.toContain('script');
    expect(tags).not.toContain('img');
    const code = elementsOf(html).find((element) => element.tagName === 'code');
    expect(code && textOf(code)).toBe('<script>alert(1)</script><img src=x onerror=alert(2)>');
  });

  it('runs the sanitizer before highlighting, so dangerous elements around code blocks are dropped', async () => {
    const html = await renderNotebookMarkdown(
      '<iframe src="https://evil.example"></iframe>\n\n<pre><code class="language-python" onclick="alert(1)">x</code></pre>',
    );
    const tags = elementsOf(html).map((element) => element.tagName);
    expect(tags).not.toContain('iframe');
    expect(html).not.toContain('onclick');
  });
});

describe('highlightNotebookCode', () => {
  it('keeps the exact source text, matching what the copy button copies', async () => {
    const source = 'metrics = {\n    "kl": [0.08, 0.09],  # comment\n}\n\tprint(f"{metrics!r}")';
    const html = await highlightNotebookCode(source, 'python');
    const code = elementsOf(html).find((element) => element.tagName === 'code');
    expect(code && textOf(code)).toBe(source);
  });

  it('does not let prototype-named fence languages break highlighting for the rest of the build', async () => {
    // The Shiki highlighter is cached and shared, so one bad name from a notebook must not poison it.
    await renderNotebookMarkdown('```constructor\nx\n```\n\n```__proto__\ny\n```\n\n```toString\nz\n```');
    const pre = elementsOf(await highlightNotebookCode('library(dplyr)', 'r')).find((element) => element.tagName === 'pre');
    expect(pre && attr(pre, 'data-language')).toBe('r');
  });

  it('accepts mixed-case kernel languages such as R', async () => {
    const pre = elementsOf(await highlightNotebookCode('x <- 1', 'R')).find((element) => element.tagName === 'pre');
    expect(pre && attr(pre, 'data-language')).toBe('r');
  });
});

describe('NotebookParser: code cell language', () => {
  const parse = (metadata: unknown) => NotebookParser.parse({
    cells: [],
    metadata,
    nbformat: 4,
    nbformat_minor: 5,
  } as unknown as NotebookData);

  it('prefers language_info.name, as Jupyter does', () => {
    expect(parse({ language_info: { name: 'Python' }, kernelspec: { language: 'julia' } }).language).toBe('python');
  });

  it('falls back to kernelspec.language', () => {
    expect(parse({ kernelspec: { display_name: 'R', language: 'R', name: 'ir' } }).language).toBe('r');
  });

  it.each([{}, { language_info: { name: 42 } }, { language_info: null, kernelspec: { language: '  ' } }])(
    'uses plain text when metadata %j has no usable language',
    (metadata) => {
      expect(parse(metadata).language).toBe('plaintext');
    },
  );
});
