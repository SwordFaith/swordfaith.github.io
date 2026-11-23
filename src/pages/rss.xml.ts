import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';
import { SITE } from '@/config/site';
import { getPermalink } from '@/utils/site-config';

export async function GET(context: APIContext) {
  const allPosts = await getCollection('blog', ({ data }) => !data.draft);
  const sortedPosts = allPosts.sort((a, b) => b.data.publishDate.valueOf() - a.data.publishDate.valueOf());

  return rss({
    title: SITE.title,
    description: SITE.description,
    site: context.site ?? SITE.origin,
    items: sortedPosts.map((post) => ({
      title: post.data.title,
      description: post.data.description ?? '',
      pubDate: post.data.publishDate,
      link: getPermalink(post.id, 'post'),
    })),
  });
}
