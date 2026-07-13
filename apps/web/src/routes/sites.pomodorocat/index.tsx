import { randomCat } from '@repo/ui';
import { createFileRoute } from '@tanstack/react-router';
import { App } from '@/app';
import { appConfig } from '@/environment';

export const Route = createFileRoute('/sites/pomodorocat/')({
	loader: () => {
		return {
			// Runs on the server so client hydration uses the same values (no SSR flash)
			splashCat: randomCat()
		};
	},
	head: () => ({
		meta: [
			{ title: 'Pomodoro Cat: Free Online Cat Pomodoro Timer' },
			{
				name: 'description',
				content:
					'A free online Pomodoro timer with a cat companion, cozy lofi background, custom focus intervals, and no account required.'
			},
			{ property: 'og:title', content: 'Pomodoro Cat: Free Online Cat Pomodoro Timer' },
			{
				property: 'og:description',
				content:
					'Start a focused work or study session with a free cat-themed Pomodoro timer in your browser.'
			},
			{ property: 'og:type', content: 'website' },
			{ property: 'og:url', content: 'https://pomodorocat.com/' },
			{ property: 'og:image', content: `${appConfig.distribution.webApp}/og-pomodorocat.png` },
			{ name: 'twitter:card', content: 'summary_large_image' },
			{ name: 'twitter:title', content: 'Pomodoro Cat: Free Online Cat Pomodoro Timer' },
			{
				name: 'twitter:description',
				content:
					'Start a focused work or study session with a free cat-themed Pomodoro timer in your browser.'
			},
			{ name: 'twitter:image', content: `${appConfig.distribution.webApp}/og-pomodorocat.png` }
		],
		links: [{ rel: 'canonical', href: 'https://pomodorocat.com/' }],
		scripts: [
			{
				type: 'application/ld+json',
				children: JSON.stringify({
					'@context': 'https://schema.org',
					'@type': 'WebApplication',
					'name': 'Pomodoro Cat',
					'url': 'https://pomodorocat.com/',
					'description':
						'A free online Pomodoro timer with a cat companion, custom intervals, session history, and a cozy lofi background.',
					'applicationCategory': 'ProductivityApplication',
					'operatingSystem': 'Any',
					'browserRequirements': 'Requires a modern web browser',
					'isAccessibleForFree': true,
					'offers': {
						'@type': 'Offer',
						'price': '0',
						'priceCurrency': 'USD'
					},
					'featureList': [
						'Pomodoro and countdown timers',
						'Custom work and break intervals',
						'Focus intentions and session history',
						'Optional timer sounds',
						'Cat companion and lofi background'
					]
				})
			}
		]
	}),
	component: RouteComponent
});

function RouteComponent() {
	const { splashCat } = Route.useLoaderData();

	return (
		<div className="scrollbar-hide h-screen overflow-x-hidden overflow-y-auto">
			<App splashCat={splashCat} />

			<section className="border-base-200/70 text-base-800 mx-auto max-w-3xl space-y-10 border-t px-8 py-16">
				<div>
					<h1 className="text-base-900 text-2xl font-semibold">
						Pomodoro Cat: a free online cat Pomodoro timer
					</h1>
					<p className="mt-4 leading-relaxed">
						Pomodoro Cat is a free focus timer that runs in your browser. Set an intention, start a
						Pomodoro session, and let the cat keep you company while you work or study. You do not
						need an account or an installation.
					</p>
				</div>

				<div>
					<h2 className="text-base-900 text-2xl font-semibold">How the Pomodoro Technique Works</h2>
					<p className="mt-4 leading-relaxed">
						The common rhythm uses 25 minutes of focused work followed by a 5-minute break. After
						four work sessions, you take a longer break. Pomodoro Cat starts with that schedule, but
						you can change every interval in the timer settings. Read the{' '}
						<a
							href="/blog/what-is-pomodoro-technique"
							className="text-base-600 hover:text-base-950 underline underline-offset-2"
						>
							practical guide to the Pomodoro Technique
						</a>{' '}
						for a complete workflow.
					</p>
				</div>

				<div>
					<h2 className="text-base-900 text-2xl font-semibold">Made for focused work and study</h2>
					<p className="mt-4 leading-relaxed">
						Choose a Pomodoro timer or a plain countdown. Adjust the work and break lengths, add a
						focus intention, and review completed sessions in your local history. Optional clock
						ticks, completion sounds, and the lofi scene help you shape a workspace you want to
						return to.
					</p>
				</div>

				<div>
					<h2 className="text-base-900 text-2xl font-semibold">Why a Cat Pomodoro Timer?</h2>
					<p className="mt-4 leading-relaxed">
						A timer only helps when you want to use it. Pomodoro Cat gives a plain countdown some
						personality without turning focus into a game. A{' '}
						<a
							href="https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0046362"
							target="_blank"
							rel="noopener noreferrer"
							className="text-base-600 hover:text-base-950 underline underline-offset-2"
						>
							2012 study on the "kawaii effect"
						</a>{' '}
						found that participants worked more carefully after viewing cute animal images. That
						does not prove a cat timer makes everyone more productive. It does offer a good reason
						to make a focus tool warm, calm, and pleasant to revisit.
					</p>
				</div>

				<div>
					<h2 className="text-base-900 text-lg font-semibold">Pomodoro guides</h2>
					<ul className="mt-3 space-y-2">
						<li>
							<a
								href="/blog/what-is-pomodoro-technique"
								className="text-base-600 hover:text-base-950 underline underline-offset-2"
							>
								How to Use the Pomodoro Technique: A Practical Guide
							</a>
						</li>
						<li>
							<a
								href="/blog/pomodoro-cat-timer"
								className="text-base-600 hover:text-base-950 underline underline-offset-2"
							>
								Why a Cat Pomodoro Timer Can Make Focus Easier
							</a>
						</li>
						<li>
							<a
								href="/blog/pomodoro-timer-for-studying"
								className="text-base-600 hover:text-base-950 underline underline-offset-2"
							>
								How to Use a Pomodoro Timer for Studying
							</a>
						</li>
						<li>
							<a
								href="/blog/how-long-should-a-pomodoro-be"
								className="text-base-600 hover:text-base-950 underline underline-offset-2"
							>
								How Long Should a Pomodoro Be? 25/5 vs 50/10
							</a>
						</li>
						<li>
							<a
								href="/blog/what-to-do-during-pomodoro-break"
								className="text-base-600 hover:text-base-950 underline underline-offset-2"
							>
								What to Do During a 5-Minute Pomodoro Break
							</a>
						</li>
					</ul>
				</div>
			</section>
		</div>
	);
}
