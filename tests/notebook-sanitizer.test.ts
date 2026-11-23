import { parseFragment, type DefaultTreeAdapterTypes } from 'parse5';
import { describe, expect, it } from 'vitest';
import { sanitizeNotebookHtml } from '../src/utils/notebook-parser';

// sanitizeNotebookHtml output is injected with set:html into notebook pages,
// and its input is text/html output from .ipynb files we do not control.
// Anything that survives here runs in the site's origin.

type Node = DefaultTreeAdapterTypes.ChildNode;

interface ElementInfo {
  tag: string;
  namespace: string;
  attrs: Record<string, string>;
}

// Re-parse the output the way a browser would and list every element, so
// assertions do not depend on serializer formatting details.
function elementsOf(html: string): ElementInfo[] {
  const result: ElementInfo[] = [];
  const walk = (nodes: Node[]) => {
    for (const node of nodes) {
      if (!('tagName' in node)) continue;
      result.push({
        tag: node.tagName,
        namespace: node.namespaceURI,
        attrs: Object.fromEntries(node.attrs.map(({ name, value }) => [name, value])),
      });
      walk(node.childNodes);
    }
  };
  walk(parseFragment(html).childNodes);
  return result;
}

function attributeValues(html: string, name: string): string[] {
  return elementsOf(html).flatMap(({ attrs }) => (name in attrs ? [attrs[name]] : []));
}

const PNG_1X1 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

describe('sanitizeNotebookHtml: dangerous elements', () => {
  it.each([
    '<script>alert(1)</script>',
    '<SCRIPT SRC="https://evil.example/x.js"></SCRIPT>',
    '<style>body{display:none}</style>',
    '<iframe src="https://evil.example"></iframe>',
    '<object data="x.swf"></object><embed src="x.swf">',
    '<form action="https://evil.example"><input name="q"><button>go</button></form>',
    '<base href="https://evil.example/">',
    '<meta http-equiv="refresh" content="0;url=https://evil.example">',
    '<link rel="stylesheet" href="https://evil.example/x.css">',
    '<template><img src=x onerror=alert(1)></template>',
  ])('drops %j entirely', (html) => {
    expect(sanitizeNotebookHtml(`<p>before</p>${html}<p>after</p>`)).toBe('<p>before</p><p>after</p>');
  });

  it('drops a disallowed element together with its content', () => {
    // Content of script/style must never leak back as text or markup.
    expect(sanitizeNotebookHtml('<p>ok<script>alert("x")</script></p>')).toBe('<p>ok</p>');
  });

  it('drops HTML comments, which could hide conditional-comment payloads', () => {
    expect(sanitizeNotebookHtml('<p>a<!--[if IE]><script>x</script><![endif]-->b</p>')).toBe('<p>ab</p>');
  });
});

describe('sanitizeNotebookHtml: attributes', () => {
  it('removes every on* event handler attribute', () => {
    const output = sanitizeNotebookHtml(
      '<img src="/x.png" onerror="alert(1)" ONLOAD="alert(2)">'
      + '<details open ontoggle="alert(3)"><summary onclick="alert(4)">s</summary></details>'
      + '<td onmouseover="alert(5)">',
    );
    const names = elementsOf(output).flatMap(({ attrs }) => Object.keys(attrs));
    expect(names.filter((name) => name.startsWith('on'))).toEqual([]);
    expect(output).not.toMatch(/alert/);
  });

  it('removes style, id, name, srcset and other non-allowlisted attributes', () => {
    // style enables UI redressing; id/name enable DOM clobbering; srcset is an
    // unchecked URL sink.
    const output = sanitizeNotebookHtml(
      '<div style="position:fixed" id="x" name="y" data-x="1"><img src="/a.png" srcset="javascript:alert(1)"></div>',
    );
    expect(elementsOf(output)).toEqual([
      { tag: 'div', namespace: 'http://www.w3.org/1999/xhtml', attrs: {} },
      { tag: 'img', namespace: 'http://www.w3.org/1999/xhtml', attrs: { src: '/a.png' } },
    ]);
  });

  it('forces rel="noopener noreferrer" on links and drops a supplied rel/target', () => {
    const output = sanitizeNotebookHtml('<a href="https://example.com" rel="opener" target="_blank">x</a>');
    expect(elementsOf(output)[0].attrs).toEqual({ href: 'https://example.com', rel: 'noopener noreferrer' });
  });
});

describe('sanitizeNotebookHtml: URLs in href and src', () => {
  // Each payload, after the HTML parser decodes entities, would execute script
  // or leave the site if it reached the browser.
  const dangerousUrls = [
    'javascript:alert(1)',
    'JaVaScRiPt:alert(1)',
    '  javascript:alert(1)',
    'JaVa&#x09;script:alert(1)',
    'java&#x0A;script:alert(1)',
    'java&#0000013;script:alert(1)',
    'jav&#x61;script&colon;alert(1)',
    '&#106;&#97;&#118;&#97;&#115;&#99;&#114;&#105;&#112;&#116;&#58;alert(1)',
    '\u0001javascript:alert(1)',
    'vbscript:msgbox(1)',
    'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
    'DATA:text/html,<script>alert(1)</script>',
    'file:///etc/passwd',
    '//evil.example/x',
    '/\\evil.example/x',
    '\\\\evil.example/x',
    '\\/evil.example/x',
  ];

  it.each(dangerousUrls)('strips href=%j', (url) => {
    const output = sanitizeNotebookHtml(`<a href="${url}">link</a>`);
    expect(attributeValues(output, 'href')).toEqual([]);
    expect(output).toContain('link');
  });

  it.each(dangerousUrls)('drops img with src=%j', (url) => {
    // An img without an allowed src is removed rather than left broken.
    expect(sanitizeNotebookHtml(`<img src="${url}">`)).toBe('');
  });

  it('rejects data: images that are not real PNG/JPEG bytes', () => {
    expect(sanitizeNotebookHtml('<img src="data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=">')).toBe('');
    // Declared PNG, but the payload is an SVG document.
    expect(sanitizeNotebookHtml('<img src="data:image/png;base64,PHN2Zz48L3N2Zz4=">')).toBe('');
  });

  it('allows data: PNG images, which is how notebooks embed plots', () => {
    const src = `data:image/png;base64,${PNG_1X1}`;
    expect(attributeValues(sanitizeNotebookHtml(`<img src="${src}" alt="plot">`), 'src')).toEqual([src]);
  });

  it('does not allow mailto: as an image source', () => {
    expect(sanitizeNotebookHtml('<img src="mailto:a@example.com">')).toBe('');
  });

  it.each([
    'https://example.com/a?b=1&c=2#d',
    'http://example.com',
    'mailto:me@example.com',
    '#section-2',
    '/notebooks/x.ipynb',
    'relative/page.html',
    '../up.html',
  ])('keeps the safe href %j', (url) => {
    expect(attributeValues(sanitizeNotebookHtml(`<a href="${url.replace(/&/g, '&amp;')}">x</a>`), 'href')).toEqual([url]);
  });
});

describe('sanitizeNotebookHtml: foreign content and malformed markup', () => {
  it('drops SVG and MathML subtrees, including HTML-named children', () => {
    const output = sanitizeNotebookHtml(
      '<svg><a href="javascript:alert(1)"><text>t</text></a><foreignObject><p>p</p></foreignObject></svg>'
      + '<math><mi xlink:href="javascript:alert(1)">x</mi><mtext><img src=x onerror=alert(1)></mtext></math>'
      + '<p>kept</p>',
    );
    expect(output).toBe('<p>kept</p>');
  });

  it('only emits HTML-namespace allowlisted elements for namespace-confusion payloads', () => {
    // Classic mutation-XSS shapes that rely on parser differences between
    // foreign content and raw-text elements.
    const payloads = [
      '<svg></p><style><a title="</style><img src=x onerror=alert(1)>">',
      '<math><mtext><table><mglyph><style><img src=x onerror=alert(1)>',
      '<noscript><p title="</noscript><img src=x onerror=alert(1)>"></noscript>',
      '<form><math><mtext></form><form><mglyph><style></math><img src onerror=alert(1)>',
      '<svg><style><img src=x onerror=alert(1)></style></svg>',
    ];
    for (const payload of payloads) {
      const output = sanitizeNotebookHtml(payload);
      for (const element of elementsOf(output)) {
        expect(element.namespace).toBe('http://www.w3.org/1999/xhtml');
        expect(['p', 'img', 'table', 'tbody', 'tr', 'td']).toContain(element.tag);
        expect(Object.keys(element.attrs).filter((name) => name !== 'src')).toEqual([]);
      }
      expect(output).not.toMatch(/<(?:script|style|svg|math|noscript)/i);
      expect(output).not.toMatch(/onerror=/i);
    }
  });

  it('is idempotent, so re-sanitizing the browser-parsed output changes nothing', () => {
    const inputs = [
      '<div><b>bold<i>both</b>it</i><p>unclosed',
      '<table><div>foster</div><tr><td>1</td></tr></table>',
      '<a href="x"><a href="y">nested</a></a>',
      '<p title="&quot;><script>alert(1)</script>">t</p>',
    ];
    for (const input of inputs) {
      const once = sanitizeNotebookHtml(input);
      expect(sanitizeNotebookHtml(once)).toBe(once);
    }
  });

  it('keeps attribute values escaped so they cannot break out of the attribute', () => {
    // `<` inside a quoted attribute is inert; what matters is that the browser
    // re-parses exactly one <p> whose title still holds the payload as text.
    const output = sanitizeNotebookHtml('<p title="&quot;><script>alert(1)</script>">t</p>');
    expect(elementsOf(output)).toEqual([
      { tag: 'p', namespace: 'http://www.w3.org/1999/xhtml', attrs: { title: '"><script>alert(1)</script>' } },
    ]);
  });

  it('escapes text that looks like markup', () => {
    expect(sanitizeNotebookHtml('<pre>&lt;script&gt;alert(1)&lt;/script&gt;</pre>'))
      .toBe('<pre>&lt;script&gt;alert(1)&lt;/script&gt;</pre>');
  });
});

describe('sanitizeNotebookHtml: legitimate notebook output survives', () => {
  it('keeps a pandas-style DataFrame table', () => {
    const table = '<table class="dataframe"><thead><tr><th scope="col">step</th><th>reward</th></tr></thead>'
      + '<tbody><tr><td>1</td><td>0.5</td></tr><tr><td colspan="2" rowspan="1">total</td></tr></tbody></table>';
    expect(sanitizeNotebookHtml(table)).toBe(table);
  });

  it('keeps links, images and inline formatting', () => {
    const html = '<p>See <a href="https://wandb.ai/run" title="run">the run</a>, <code>loss.backward()</code>, '
      + '<strong>bold</strong> and <em>em</em>.</p><img src="/images/plot.png" alt="plot" width="300" height="200" loading="lazy">';
    expect(sanitizeNotebookHtml(html)).toBe(
      '<p>See <a href="https://wandb.ai/run" title="run" rel="noopener noreferrer">the run</a>, <code>loss.backward()</code>, '
      + '<strong>bold</strong> and <em>em</em>.</p><img src="/images/plot.png" alt="plot" width="300" height="200" loading="lazy">',
    );
  });

  it('keeps code blocks with their whitespace and escaped characters', () => {
    const html = '<pre><code class="language-python">if a &lt; b:\n    print("x &amp; y")</code></pre>';
    expect(sanitizeNotebookHtml(html)).toBe(html);
  });

  it('keeps lists, headings, details and CJK text', () => {
    const html = '<h2>结果</h2><ol start="3"><li>第一</li></ol><details open=""><summary>展开</summary><p>内容</p></details>';
    expect(sanitizeNotebookHtml(html)).toBe(html);
  });
});
