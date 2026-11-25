import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jPuoAAAAASUVORK5CYII=';
const markdownCell = {
  cell_type: 'markdown',
  metadata: {},
  source: [
    'Inline $x^2$, literal `$leave_me$`, and raw <code>$keep_me$</code>.\n\n',
    '$$\n',
    '\\sum_{i=1}^{n} i\n',
    '$$\n\n',
    '![Local plot](attachment:my%20plot.png)\n\n',
    '![Unsupported](attachment:vector.svg)\n\n',
    '![Mislabeled](attachment:fake.png)\n\n',
    '<div style="color: red" onclick="fixtureHandler()">Formatted text</div>\n\n',
    '$\\href{https://example.test/math-command}{x}$\n\n',
    '```python\n',
    'def run():\n',
    '    return "$unrendered$"\n',
    '```\n',
  ],
  attachments: {
    'my plot.png': { 'image/png': [png.slice(0, 32), png.slice(32)] },
    'vector.svg': { 'image/svg+xml': '<svg></svg>' },
    'fake.png': { 'image/png': 'PHN2Zz48L3N2Zz4=' },
  },
};
const fixtureSource = JSON.stringify({
  nbformat: 4,
  nbformat_minor: 5,
  metadata: {},
  cells: [
    { ...markdownCell, id: 'with-attachments' },
    {
      cell_type: 'markdown', id: 'without-attachments', metadata: {},
      source: '![Out of scope](attachment:my%20plot.png)',
    },
  ],
}, null, 2);

function notebookEntry(title: string, notebookPath: string, draft: boolean): string {
  return ['---', 'title: ' + title, 'publishDate: 2024-01-01', 'notebookPath: ' + notebookPath,
    'draft: ' + draft, '---', ''].join('\n');
}

describe('built notebooks', () => {
  let root: string;

  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), 'notebook-build-'));
    for (const file of ['astro.config.mjs', 'package.json', 'postcss.config.mjs', 'tailwind.config.js', 'tsconfig.json', 'public', 'src']) {
      cpSync(join(projectRoot, file), join(root, file), { recursive: true });
    }
    symlinkSync(join(projectRoot, 'node_modules'), join(root, 'node_modules'), 'dir');

    const sourceDir = join(root, 'src/content/notebooks');
    mkdirSync(join(sourceDir, 'examples'));
    writeFileSync(join(sourceDir, 'examples/fixture.ipynb'), fixtureSource);
    writeFileSync(join(sourceDir, 'test-published.md'), notebookEntry('Published fixture', '/notebooks/examples/fixture.ipynb', false));
    writeFileSync(join(sourceDir, 'draft-fixture.ipynb'), fixtureSource);
    writeFileSync(join(sourceDir, 'test-draft.md'), notebookEntry('Draft fixture', '/notebooks/draft-fixture.ipynb', true));
    writeFileSync(join(sourceDir, 'unlisted.ipynb'), fixtureSource);

    execFileSync(process.execPath, [join(root, 'node_modules/astro/bin/astro.mjs'), 'build'], {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1' },
    });
  }, 30_000);

  afterAll(() => {
    if (root) rmSync(root, { recursive: true, force: true });
  });

  it('publishes only the raw sources referenced by published entries', () => {
    const output = join(root, 'dist/notebooks');
    expect(readFileSync(join(output, 'examples/fixture.ipynb'), 'utf8')).toBe(fixtureSource);
    const legacyFile = 'rlhf_experiment.ipynb';
    expect(readFileSync(join(output, legacyFile))).toEqual(readFileSync(join(root, 'src/content/notebooks', legacyFile)));
    expect(existsSync(join(output, 'test-draft/index.html'))).toBe(false);
    expect(existsSync(join(output, 'draft-fixture.ipynb'))).toBe(false);
    expect(existsSync(join(output, 'unlisted.ipynb'))).toBe(false);
    expect(readFileSync(join(output, 'index.html'), 'utf8')).not.toContain('Draft fixture');
  });

  it('renders formulae and safe cell-local attachments while preserving code highlighting', () => {
    const html = readFileSync(join(root, 'dist/notebooks/test-published/index.html'), 'utf8');
    expect(html).toContain('href="/notebooks/examples/fixture.ipynb" download');
    expect(html).toContain('<annotation encoding="application/x-tex">x^2</annotation>');
    expect(html).toContain('<span class="katex-display">');
    expect(html).toContain('<code>$leave_me$</code>');
    expect(html).toContain('<code>$keep_me$</code>');
    expect(html).toMatch(/class="(?:hljs language-python|astro-code [^"]+)"/);
    expect(html).toMatch(/(?:class="hljs-keyword"|style="[^"]*--shiki-dark:[^"]*")>def</);
    expect(html).toContain('$unrendered$');
    expect(html).toContain('src="data:image/png;base64,' + png + '"');
    expect(html).toContain('alt="Local plot"');
    expect(html).not.toMatch(/alt="(?:Unsupported|Mislabeled|Out of scope)"/);
    expect(html).not.toMatch(/fixtureHandler|style="color: red"/);
    expect(html).not.toContain('href="https://example.test/math-command"');
  });
});
