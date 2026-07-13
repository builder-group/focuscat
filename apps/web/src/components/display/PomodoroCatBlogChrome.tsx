import { Button, Cat } from '@repo/ui';
import React from 'react';
import { SimpleLogoIcon } from './icons';

export const PomodoroCatBlogHeader: React.FC<TPomodoroCatBlogHeaderProps> = (props) => {
	const { showGuidesLink = true } = props;

	return (
		<header className="border-base-100 border-b px-6 py-4">
			<div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
				<a
					href="/"
					className="text-base-950 hover:text-base-600 inline-flex items-center gap-2 font-semibold transition-colors"
				>
					<SimpleLogoIcon className="size-6" aria-hidden />
					<span>Pomodoro Cat</span>
				</a>

				<nav className="flex items-center gap-4" aria-label="Main navigation">
					{showGuidesLink && (
						<Button
							className="hidden sm:inline-flex"
							variant="default"
							size="sm"
							nativeButton={false}
							render={<a href="/blog" role="link" />}
						>
							Pomodoro guides
						</Button>
					)}
					<Button
						variant="primary"
						size="sm"
						nativeButton={false}
						render={<a href="/" role="link" />}
					>
						Start timer
					</Button>
				</nav>
			</div>
		</header>
	);
};

interface TPomodoroCatBlogHeaderProps {
	showGuidesLink?: boolean;
}

export const PomodoroCatTimerCta: React.FC = () => {
	return (
		<aside className="border-base-200 bg-base-50 relative mx-auto mt-16 max-w-2xl rounded-2xl border px-6 pt-14 pb-8 text-center sm:px-10 sm:pt-12">
			<div aria-hidden="true" className="absolute right-4 bottom-full z-10 sm:right-8">
				<Cat size={120} face="cute" hat="timer" onTap={() => ({ mode: 'both' })} />
			</div>

			<h2 className="text-base-950 text-xl font-semibold">Ready for one focused session?</h2>
			<p className="text-base-600 mx-auto mt-2 max-w-lg text-sm leading-relaxed">
				Choose one task and start a free Pomodoro session in your browser. No account or
				installation required.
			</p>
			<Button
				className="mt-5"
				variant="primary"
				size="lg"
				nativeButton={false}
				render={<a href="/" role="link" />}
			>
				Start the Pomodoro timer
			</Button>
		</aside>
	);
};
