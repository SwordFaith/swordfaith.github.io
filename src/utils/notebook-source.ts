import { readFile, realpath } from 'node:fs/promises';
import path from 'node:path';

const NOTEBOOK_URL_PREFIX = '/notebooks/';
const NOTEBOOK_EXTENSION = '.ipynb';
const NOTEBOOK_SOURCE_ROOT = path.resolve('src/content/notebooks');

export function getNotebookDownloadSlug(notebookPath: string): string {
  const invalidPath = () => new Error(
    `Invalid notebookPath "${notebookPath}": use a root-relative .ipynb URL such as "/notebooks/example.ipynb".`,
  );
  if (!notebookPath.startsWith(NOTEBOOK_URL_PREFIX) || !notebookPath.endsWith(NOTEBOOK_EXTENSION)) {
    throw invalidPath();
  }

  const relativePath = notebookPath.slice(NOTEBOOK_URL_PREFIX.length);
  if (relativePath.split('/').some((part) => !part || part === '.' || part === '..' || /[\\?#%\x00-\x1f\x7f]/.test(part))) {
    throw invalidPath();
  }
  const slug = relativePath.slice(0, -NOTEBOOK_EXTENSION.length);
  if (!slug || slug.endsWith('/')) throw invalidPath();
  return slug;
}

export async function readNotebookSource(notebookPath: string): Promise<string> {
  const slug = getNotebookDownloadSlug(notebookPath);
  const filePath = path.join(NOTEBOOK_SOURCE_ROOT, slug + NOTEBOOK_EXTENSION);

  try {
    const [sourceRoot, sourcePath] = await Promise.all([realpath(NOTEBOOK_SOURCE_ROOT), realpath(filePath)]);
    const relativePath = path.relative(sourceRoot, sourcePath);
    if (!relativePath || relativePath === '..' || relativePath.startsWith(`..${path.sep}`)
      || path.isAbsolute(relativePath) || path.extname(sourcePath) !== NOTEBOOK_EXTENSION) {
      throw new Error('The real file must be an .ipynb inside the notebook source directory.');
    }
    return await readFile(sourcePath, 'utf8');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Unable to read notebook "${notebookPath}" at ${filePath}: ${message}`,
      { cause: error },
    );
  }
}
