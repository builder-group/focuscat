import { MDXContent } from '@content-collections/mdx/react';
import { createFileRoute, notFound } from '@tanstack/react-router';
import { allPomodorocatBlogs } from 'content-collections';
import { PomodoroCatBlogHeader, PomodoroCatTimerCta } from '@/components';
import { appConfig } from '@/environment';

export const Route = createFileRoute('/sites/pomodorocat/blog/$slug/')({
	loader: ({ params }) => {
		const post = allPomodorocatBlogs.find((p) => p._meta.path === params.slug);
		if (!post) {
			throw notFound();
		}
		return { post };
	},
	head: ({ loaderData }) => {
		const post = loaderData?.post;
		const title = `${post?.title ?? 'Blog'}: Pomodoro Cat`;
		const url = `https://pomodorocat.com/blog/${post?._meta.path ?? ''}`;
		const image = `${appConfig.distribution.webApp}/og-pomodorocat.png`;

		return {
			meta: [
				{ title },
				{ name: 'description', content: post?.summary ?? '' },
				{ property: 'og:title', content: title },
				{ property: 'og:description', content: post?.summary ?? '' },
				{ property: 'og:type', content: 'article' },
				{ property: 'og:url', content: url },
				{ property: 'og:image', content: image },
				{ property: 'article:published_time', content: post?.published ?? '' },
				{ property: 'article:modified_time', content: post?.updated ?? post?.published ?? '' },
				{ name: 'twitter:card', content: 'summary_large_image' },
				{ name: 'twitter:title', content: title },
				{ name: 'twitter:description', content: post?.summary ?? '' },
				{ name: 'twitter:image', content: image }
			],
			links: [{ rel: 'canonical', href: url }],
			scripts: [
				{
					type: 'application/ld+json',
					children: JSON.stringify({
						'@context': 'https://schema.org',
						'@type': 'BlogPosting',
						'headline': post?.title ?? 'Pomodoro Cat',
						'description': post?.summary ?? '',
						'datePublished': post?.published ?? '',
						'dateModified': post?.updated ?? post?.published ?? '',
						'mainEntityOfPage': url,
						image,
						'author': {
							'@type': 'Organization',
							'name': 'Pomodoro Cat',
							'url': 'https://pomodorocat.com/'
						},
						'publisher': {
							'@type': 'Organization',
							'name': 'Pomodoro Cat',
							'url': 'https://pomodorocat.com/'
						}
					})
				}
			]
		};
	},
	component: RouteComponent
});

function RouteComponent() {
	const { post } = Route.useLoaderData();

	return (
		<>
			<PomodoroCatBlogHeader />

			<article className="prose dark:prose-invert prose-base mx-auto max-w-2xl px-6 py-12">
				<header className="not-prose mb-10">
					<a
						href="/blog"
						className="text-primary hover:text-primary/80 text-sm font-medium transition-colors"
					>
						Pomodoro guides
					</a>
					<h1 className="text-base-950 mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
						{post.title}
					</h1>
					<p className="text-base-500 mt-4 text-sm">
						<time dateTime={post.updated ?? post.published}>
							{post.updated != null ? 'Updated ' : 'Published '}
							{formatDate(post.updated ?? post.published)}
						</time>
					</p>
				</header>
				<MDXContent code={post.mdx} />
			</article>

			<footer className="px-6 pb-16">
				<PomodoroCatTimerCta />
			</footer>
		</>
	);
}

function formatDate(date: string): string {
	return new Intl.DateTimeFormat('en', {
		dateStyle: 'long',
		timeZone: 'UTC'
	}).format(new Date(date));
}
