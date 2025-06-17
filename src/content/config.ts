import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    publishDate: z.date(),
    updateDate: z.date().optional(),
    tags: z.array(z.string()).default([]),
    author: z.string().default('Anonymous'),
    draft: z.boolean().default(false),
    cover: z.string().optional(),
    katex: z.boolean().default(false),
    wandb: z.object({
      projectId: z.string().optional(),
      runId: z.string().optional()
    }).optional()
  })
});

const notebooks = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    publishDate: z.date(),
    updateDate: z.date().optional(),
    tags: z.array(z.string()).default([]),
    author: z.string().default('Anonymous'),
    draft: z.boolean().default(false),
    notebookPath: z.string()
  })
});

export const collections = {
  blog,
  notebooks
};