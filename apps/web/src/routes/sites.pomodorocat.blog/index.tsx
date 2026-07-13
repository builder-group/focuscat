import { createFileRoute } from '@tanstack/react-router';
import { allPomodorocatBlogs } from 'content-collections';
import { PomodoroCatBlogHeader, PomodoroCatTimerCta } from '@/components';

export const Route = createFileRoute('/sites/pomodorocat/blog/')({
	loader: () =>
		[...allPomodorocatBlogs].sort(
			(a, b) => new Date(b.published).getTime() - new Date(a.published).getTime()
		),
	head: () => ({
		meta: [
			{ title: 'Pomodoro Guides and Focus Tips: Pomodoro Cat' },
			{
				name: 'description',
				content:
					'Practical guides to Pomodoro sessions, focus intervals, and getting more from the free Pomodoro Cat timer.'
			},
			{ property: 'og:title', content: 'Pomodoro Guides and Focus Tips: Pomodoro Cat' },
			{
				property: 'og:description',
				content:
					'Practical guides to Pomodoro sessions, focus intervals, and getting more from the free Pomodoro Cat timer.'
			},
			{ property: 'og:type', content: 'website' },
			{ property: 'og:url', content: 'https://pomodorocat.com/blog' }
		],
		links: [{ rel: 'canonical', href: 'https://pomodorocat.com/blog' }]
	}),
	component: RouteComponent
});

function RouteComponent() {
	const posts = Route.useLoaderData();

	return (
		<>
			<PomodoroCatBlogHeader showGuidesLink={false} />

			<main className="mx-auto max-w-2xl px-6 py-12">
				<h1 className="text-3xl font-semibold tracking-tight">Pomodoro guides</h1>
				<p className="text-base-600 mt-3 max-w-xl leading-relaxed">
					Practical guides for planning focus sessions, choosing useful intervals, and making timed
					work easier to repeat.
				</p>

				<div className="mt-12 space-y-2">
					{posts.map((post) => (
						<article key={post._meta.path}>
							<a
								href={`/blog/${post._meta.path}`}
								className="group border-base-200/0 hover:border-base-200 hover:bg-base-50 focus-visible:ring-primary -mx-4 block rounded-xl border px-4 py-4 transition-colors outline-none focus-visible:ring-2"
							>
								<p className="text-base-400 mb-1 text-xs">
									<time dateTime={post.updated ?? post.published}>
										{post.updated != null ? 'Updated ' : 'Published '}
										{formatDate(post.updated ?? post.published)}
									</time>
								</p>
								<h2 className="group-hover:text-primary text-lg font-semibold transition-colors">
									{post.title}
								</h2>
								<p className="text-base-500 mt-1 text-sm leading-relaxed">{post.summary}</p>
							</a>
						</article>
					))}
				</div>
			</main>

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
