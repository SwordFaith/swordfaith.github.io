import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getPublishedPosts } from '@/utils/posts';
import { SITE } from '@/config/site';
import { getPermalink } from '@/utils/site-config';

export async function GET(context: APIContext) {
  const sortedPosts = await getPublishedPosts();

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
