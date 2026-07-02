import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const publicNoteSchema = z.object({
  title: z.string(),
  description: z.string().default(''),
  date: z.coerce.date().optional(),
  tags: z.array(z.string()).default([]),
  draft: z.boolean().default(false),
  visibility: z.enum(['public', 'unlisted', 'private', 'internal']).default('public'),
  status: z.enum(['inbox', 'draft', 'active', 'evergreen', 'archived']).default('evergreen'),
  source_type: z.enum(['raw', 'compiled', 'moc', 'handoff', 'public']).default('compiled'),
  source_url: z.union([z.string().url(), z.literal('')]).default(''),
  captured_at: z.coerce.date().optional(),
  owner: z.string().default(''),
  decision_summary: z.string().default(''),
  next_actions: z.array(z.string()).default([]),
  aliases: z.array(z.string()).default([]),
  related: z.array(z.string()).default([]),
  slug: z.string().optional(),
});

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/publish/blog' }),
  schema: publicNoteSchema,
});

const wiki = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/publish/wiki' }),
  schema: publicNoteSchema,
});

const pages = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/publish/pages' }),
  schema: publicNoteSchema.extend({
    eyebrow: z.string().default(''),
    heading: z.string().optional(),
    summary: z.string().default(''),
    imageAlt: z.string().default(''),
  }),
});

export const collections = { blog, wiki, pages };
