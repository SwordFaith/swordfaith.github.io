import { parseFragment, type DefaultTreeAdapterTypes } from 'parse5';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  highlightNotebookCode,
  NotebookParser,
  renderNotebookMarkdown,
  sanitizeNotebookHtml,
  type NotebookData,
} from '../src/utils/notebook-parser';

// Markdown cells come from .ipynb files we do not control and are injected with set:html.
// Highlighting needs inline style attributes, which the sanitizer must keep rejecting for
// notebook-authored HTML, so styles may only appear on markup Shiki generated itself.
// Highlighting must also never change what the reader sees, nor let notebook content fail the build.

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

function first(html: string, tag: string): Element {
  const element = elementsOf(html).find((candidate) => candidate.tagName === tag);
  if (!element) throw new Error(`No <${tag}> in ${html}`);
  return element;
}

// Shiki's <pre> carries a style with --shiki-dark-bg; notebook HTML cannot forge one because the
// sanitizer drops every style attribute. Every styled element must sit inside such a <pre>.
function stylesOutsideShiki(html: string): string[] {
  const offenders: string[] = [];
  const walk = (nodes: DefaultTreeAdapterTypes.ChildNode[], insideShiki: boolean) => {
    for (const node of nodes) {
      if (!('tagName' in node)) continue;
      const style = attr(node, 'style');
      const isShikiPre = node.tagName === 'pre' && (style ?? '').includes('--shiki-dark-bg');
      if (style !== undefined && !insideShiki && !isShikiPre) offenders.push(`${node.tagName}: ${style}`);
      walk(node.childNodes, insideShiki || isShikiPre);
    }
  };
  walk(parseFragment(html).childNodes, false);
  return offenders;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('renderNotebookMarkdown: highlighting', () => {
  it('renders fenced code with the same dual-theme Shiki markup as blog posts', async () => {
    // The global `html.dark .astro-code` rule only switches themes for this exact markup shape.
    const html = await renderNotebookMarkdown('```python\n# note\ndef f():\n    return "s"\n```');
    const pre = first(html, 'pre');
    expect(attr(pre, 'class')).toMatch(/\bastro-code\b/);
    expect(attr(pre, 'data-language')).toBe('python');
    expect(attr(pre, 'style')).toContain('--shiki-dark-bg');

    const keyword = elementsOf(html).find((element) => element.tagName === 'span' && textOf(element) === 'def');
    expect(keyword && attr(keyword, 'style')).toMatch(/^color:#[0-9A-F]{6};--shiki-dark:#[0-9A-F]{6}$/i);
  });

  it('shows exactly the text the unhighlighted Markdown renderer showed', async () => {
    // marked ends a code block's text with one newline of its own; it must survive highlighting too.
    const source = 'if a < b and c > d:\n    print("x & y")  # tail';
    const html = await renderNotebookMarkdown(`\`\`\`python\n${source}\n\`\`\``);
    expect(textOf(first(html, 'code'))).toBe(`${source}\n`);
  });

  it('highlights a raw HTML block that has the shape of a Markdown code block', async () => {
    const html = await renderNotebookMarkdown('<pre><code class="language-python">x &lt; 1</code></pre>');
    expect(attr(first(html, 'pre'), 'data-language')).toBe('python');
    expect(textOf(first(html, 'code'))).toBe('x < 1');
  });

  it('keeps diff +/- markers selectable, so a copied selection is still a valid patch', async () => {
    // Markdown cells have no Copy button: selecting the block is the only way to copy it.
    const patch = '--- a/x.py\n+++ b/x.py\n-old = 1\n+new = 2\n context';
    const markdownHtml = await renderNotebookMarkdown(`\`\`\`diff\n${patch}\n\`\`\``);
    const cellHtml = await highlightNotebookCode(patch, 'diff');
    for (const html of [markdownHtml, cellHtml]) {
      expect(attr(first(html, 'pre'), 'data-language')).toBe('diff');
      expect(html).not.toMatch(/user-select/i);
    }
    expect(textOf(first(markdownHtml, 'code'))).toBe(`${patch}\n`);
    expect(textOf(first(cellHtml, 'code'))).toBe(patch);
  });

  it('leaves raw code blocks with allowed annotations untouched instead of dropping them', async () => {
    for (const block of [
      '<pre><code class="language-python" aria-label="example" title="t">x = 1</code></pre>',
      '<pre title="t"><code>x = 1</code></pre>',
    ]) {
      expect(await renderNotebookMarkdown(block)).toBe(sanitizeNotebookHtml(block));
      expect(sanitizeNotebookHtml(block)).toBe(block);
    }
  });

  it('keeps leading newlines of raw <pre> blocks exactly as the sanitizer emits them', async () => {
    // Each extra HTML parse drops one newline right after <pre>; sanitizing and highlighting share one parse.
    const block = '<pre>\n\n\nx</pre>';
    expect(await renderNotebookMarkdown(block)).toBe(sanitizeNotebookHtml(block));
    expect(sanitizeNotebookHtml(block)).toBe('<pre>\n\nx</pre>');
  });

  it('keeps <br> line breaks inside a raw <pre><code> block', async () => {
    const html = await renderNotebookMarkdown('<pre><code>a = 1<br>b = 2</code></pre>');
    expect(html).toBe('<pre><code>a = 1<br>b = 2</code></pre>');
  });

  it('keeps text and elements beside <code> inside a raw <pre>', async () => {
    const html = await renderNotebookMarkdown('<pre>before <b>bold</b><code>x</code> after</pre>');
    expect(html).toBe('<pre>before <b>bold</b><code>x</code> after</pre>');
  });

  it('leaves inline code and surrounding Markdown alone', async () => {
    expect(await renderNotebookMarkdown('Call `loss.backward()` **now**.'))
      .toBe('<p>Call <code>loss.backward()</code> <strong>now</strong>.</p>\n');
  });

  it.each(['no-such-lang', 'constructor', '__proto__', ''])(
    'falls back to plain text for the unknown fence language %j instead of failing the build',
    async (language) => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      const html = await renderNotebookMarkdown(`\`\`\`${language}\nx = 1\n\`\`\``);
      expect(attr(first(html, 'pre'), 'data-language')).toBe('plaintext');
      expect(textOf(first(html, 'code'))).toBe('x = 1\n');
    },
  );
});

describe('renderNotebookMarkdown: security', () => {
  it('rebuilds a fence-shaped raw block from its text, dropping its style payload', async () => {
    // Once the sanitizer strips style this block is exactly fence-shaped, so it must come out as Shiki output.
    const raw = await renderNotebookMarkdown(
      '<pre style="position:fixed;inset:0;z-index:99"><code class="language-python">x = 1\n</code></pre>',
    );
    const genuine = await renderNotebookMarkdown('```python\nx = 1\n```');
    expect(raw.trim()).toBe(genuine.trim());
    expect(raw).not.toMatch(/position:fixed|z-index/);
  });

  it.each([
    ['carrying fake Shiki classes',
      '<pre class="astro-code" style="position:fixed;inset:0"><code class="language-python fixed evil-class">x = 1\n</code></pre>'],
    ['with styled highlight spans inside',
      '<pre style="position:fixed"><code class="language-python"><span style="background:url(https://evil.example/x)">x = 1</span></code></pre>'],
  ])('leaves a fake pre-highlighted block %s as sanitized HTML, with no style attributes', async (_label, block) => {
    // Not fence-shaped, so it is not rebuilt: it gets no Shiki styles and keeps none of its own.
    // Its classes survive like any notebook HTML class: a known, separately tracked sanitizer gap.
    const html = await renderNotebookMarkdown(block);
    expect(html).toBe(sanitizeNotebookHtml(block));
    expect(elementsOf(html).filter((element) => attr(element, 'style') !== undefined)).toEqual([]);
    expect(html).not.toMatch(/position:fixed|evil\.example/);
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
    expect(textOf(first(html, 'code'))).toBe('<script>alert(1)</script><img src=x onerror=alert(2)>\n');
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

describe('highlightNotebookCode: source fidelity', () => {
  // The Copy button copies cell.source verbatim, so the rendered text must match it exactly.
  it.each([
    ['ends with a newline', 'x = 1\n'],
    ['ends with two newlines', 'x = 1\n\n'],
    ['is empty', ''],
    ['is only a newline', '\n'],
    ['uses tabs and mixed indentation', 'def f():\n\tif x:\n\t    return "\\t"'],
    ['has a lone surrogate', 'label = "\ud800"'],
    ['has a very long line', `total = ${Array.from({ length: 5000 }, (_, i) => `v${i}`).join(' + ')}`],
    ['mixes comments, strings and markup characters', 'metrics = {\n    "kl": [0.08],  # <b>c</b> & d\n}'],
  ])('renders exactly the source when it %s', async (_label, source) => {
    expect(textOf(first(await highlightNotebookCode(source, 'python'), 'code'))).toBe(source);
  });

  it('renders CRLF line endings as LF lines (cell sources are already normalized to LF)', async () => {
    expect(textOf(first(await highlightNotebookCode('a\r\nb\r\n', 'python'), 'code'))).toBe('a\nb\n');
  });
});

describe('highlightNotebookCode: languages and failures', () => {
  it('does not let prototype-named fence languages break highlighting for the rest of the build', async () => {
    // The Shiki highlighter is cached and shared, so one bad name from a notebook must not poison it.
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    await renderNotebookMarkdown('```constructor\nx\n```\n\n```__proto__\ny\n```\n\n```toString\nz\n```');
    expect(attr(first(await highlightNotebookCode('library(dplyr)', 'r'), 'pre'), 'data-language')).toBe('r');
  });

  it.each([
    ['R', 'r'], ['  Python  ', 'python'], ['python extra', 'plaintext'], ['<script>', 'plaintext'], ['ANSI', 'plaintext'],
  ])(
    'normalizes the language name %j to %j',
    async (language, expected) => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      expect(attr(first(await highlightNotebookCode('x', language), 'pre'), 'data-language')).toBe(expected);
    },
  );

  it.each([
    ['valid', '\u001b[31mred\u001b[0m <b>x</b> & y'],
    // Shiki's ansi mode would throw on a dimmed out-of-range 256-colour index and fail the build.
    ['malformed', '\u001b[2;38;5;999m<b>x</b> & y'],
  ])('shows %s ANSI escape sequences verbatim as escaped plain text', async (_label, source) => {
    const html = await highlightNotebookCode(source, 'ansi');
    expect(attr(first(html, 'pre'), 'data-language')).toBe('plaintext');
    expect(textOf(first(html, 'code'))).toBe(source);
    expect(elementsOf(html).map((element) => element.tagName)).not.toContain('b');

    const markdownHtml = await renderNotebookMarkdown(`\`\`\`ansi\n${source}\n\`\`\``);
    expect(textOf(first(markdownHtml, 'code'))).toBe(`${source}\n`);
  });

  it('falls back to plain text instead of failing the build when the highlighter throws', async () => {
    vi.resetModules();
    vi.doMock('@astrojs/markdown-remark/shiki', async (importOriginal) => {
      const actual = await importOriginal<typeof import('@astrojs/markdown-remark/shiki')>();
      return {
        ...actual,
        createShikiHighlighter: async (...args: Parameters<typeof actual.createShikiHighlighter>) => {
          const real = await actual.createShikiHighlighter(...args);
          return {
            ...real,
            codeToHtml: (...call: Parameters<typeof real.codeToHtml>) => (call[1] === 'plaintext'
              ? real.codeToHtml(...call)
              : Promise.reject(new Error('simulated tokenizer failure'))),
          };
        },
      };
    });
    try {
      const isolated = await import('../src/utils/notebook-parser');
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const html = await isolated.highlightNotebookCode('if a < b:\n    pass\n', 'python');
      expect(attr(first(html, 'pre'), 'data-language')).toBe('plaintext');
      expect(textOf(first(html, 'code'))).toBe('if a < b:\n    pass\n');
      expect(warn.mock.calls[0]?.[0]).toContain('simulated tokenizer failure');
    } finally {
      vi.doUnmock('@astrojs/markdown-remark/shiki');
      vi.resetModules();
    }
  });
});

describe('highlightNotebookCode: size cap', () => {
  // Highlighting costs ~0.2 <span> per character; data-heavy cells would put tens of thousands of nodes
  // in the page. Above the cap the full source renders as one escaped text node instead.
  const pythonLines = ['def f(x):', '    return {"k": x * 2}  # c', 'values = [1, 2, 3]'];
  const python = (chars: number) => Array.from({ length: chars }, (_, i) => pythonLines[i % 3]).join('\n').slice(0, chars);
  const plainOverhead = async () => (await highlightNotebookCode('x'.repeat(40_000), 'python')).length - 40_000;

  it('still highlights code at exactly 32,000 characters', async () => {
    const source = python(32_000);
    expect(source).toHaveLength(32_000);
    const html = await highlightNotebookCode(source, 'python');
    expect(html).toMatch(/<span style="color:/);
    expect(textOf(first(html, 'code'))).toBe(source);
  });

  it('renders 32,001 characters as plain text: no token spans, exact text, size proportional to input', async () => {
    const source = python(32_001);
    const html = await highlightNotebookCode(source, 'python');
    expect(html).not.toContain('<span');
    expect(attr(first(html, 'pre'), 'data-language')).toBe('plaintext');
    expect(textOf(first(html, 'code'))).toBe(source);
    // Only escaping adds bytes: here just the quotes, 5 extra bytes each for &quot;.
    const quotes = source.split('"').length - 1;
    expect(html.length).toBe(source.length + 5 * quotes + await plainOverhead());
  });

  it('caps the line count too: 2,000 lines are highlighted, 2,001 are not', async () => {
    const lines = (count: number) => Array.from({ length: count }, (_, i) => String(i % 10)).join('\n');
    expect(await highlightNotebookCode(lines(2_000), 'python')).toMatch(/<span style="color:/);
    const over = await highlightNotebookCode(lines(2_001), 'python');
    expect(over).not.toContain('<span');
    expect(textOf(first(over, 'code'))).toBe(lines(2_001));
  });

  it('applies the cap to Markdown code blocks', async () => {
    const source = python(40_000);
    const html = await renderNotebookMarkdown(`\`\`\`python\n${source}\n\`\`\``);
    expect(html).not.toContain('<span');
    expect(textOf(first(html, 'code'))).toBe(`${source}\n`);
  });

  it('builds the plain-text block only from escaped text, never from notebook markup', async () => {
    const source = `</code></pre><script>alert(1)</script><img src=x onerror=alert(2)> & "q" 'a'${' '.repeat(40_000)}`;
    const html = await highlightNotebookCode(source, 'python');
    expect(elementsOf(html).map((element) => element.tagName)).toEqual(['pre', 'code']);
    expect(textOf(first(html, 'code'))).toBe(source);
    expect(html).toContain('&lt;/code&gt;&lt;/pre&gt;&lt;script&gt;');
    expect(html).toContain('&amp; &quot;q&quot; &#39;a&#39;');
  });
});

describe('fallback when the highlighter cannot be created', () => {
  it('still renders every cell, with escaped plain text for code cells and Markdown code blocks', async () => {
    vi.resetModules();
    vi.doMock('@astrojs/markdown-remark/shiki', async (importOriginal) => ({
      ...await importOriginal<typeof import('@astrojs/markdown-remark/shiki')>(),
      createShikiHighlighter: () => Promise.reject(new Error('simulated engine load failure')),
    }));
    try {
      const isolated = await import('../src/utils/notebook-parser');
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const code = 'if a < b:\n    print("x & \'y\'")\n';
      const notebook = isolated.NotebookParser.parse({
        cells: [
          { cell_type: 'code', source: code, outputs: [], execution_count: 1 },
          { cell_type: 'markdown', source: 'Intro\n\n```python\nz = a < b\n```' },
          { cell_type: 'raw', source: 'raw' },
        ],
        metadata: { language_info: { name: 'python' } },
        nbformat: 4,
        nbformat_minor: 5,
      } as NotebookData);

      const [codeHtml, markdownHtml, rawHtml] = await isolated.renderNotebookCells(notebook);
      expect(codeHtml).not.toContain('<span');
      expect(attr(first(codeHtml, 'pre'), 'data-language')).toBe('plaintext');
      expect(textOf(first(codeHtml, 'code'))).toBe(code);
      expect(codeHtml).toContain('&lt; b:\n    print(&quot;x &amp; &#39;y&#39;&quot;)');

      expect(markdownHtml).toContain('<p>Intro</p>');
      expect(markdownHtml).not.toContain('<span');
      expect(textOf(first(markdownHtml, 'code'))).toBe('z = a < b\n');
      expect(rawHtml).toBe('');
      expect(warn.mock.calls.map((call) => String(call[0])).join('\n')).toContain('simulated engine load failure');
    } finally {
      vi.doUnmock('@astrojs/markdown-remark/shiki');
      vi.resetModules();
    }
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
