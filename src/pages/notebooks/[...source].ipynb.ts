import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import { getNotebookDownloadSlug, readNotebookSource } from '@/utils/notebook-source';

export const getStaticPaths = (async () => {
  const notebooks = await getCollection('notebooks', ({ data }) => !data.draft);
  const notebookPaths = new Set(notebooks.map(({ data }) => data.notebookPath));
  return Array.from(notebookPaths, (notebookPath) => ({
    params: { source: getNotebookDownloadSlug(notebookPath) },
    props: { notebookPath },
  }));
}) satisfies GetStaticPaths;

export const GET: APIRoute<{ notebookPath: string }> = async ({ props }) => {
  return new Response(await readNotebookSource(props.notebookPath), {
    headers: { 'Content-Type': 'application/x-ipynb+json; charset=utf-8' },
  });
};
