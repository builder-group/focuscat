import { defineCollection, defineConfig } from '@content-collections/core';
import { compileMDX } from '@content-collections/mdx';
import * as v from 'valibot';

const pomodorocatBlog = defineCollection({
	name: 'pomodorocatBlog',
	directory: './content/pomodorocat/blog',
	include: '*.md',
	schema: v.object({
		title: v.string(),
		summary: v.string(),
		published: v.string(),
		updated: v.optional(v.string()),
		content: v.string()
	}),
	transform: async (document, context) => {
		const mdx = await compileMDX(context, document);
		return { ...document, mdx };
	}
});

export default defineConfig({
	content: [pomodorocatBlog]
});
