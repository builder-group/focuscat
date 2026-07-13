import { Button } from '@repo/ui';
import { createFileRoute } from '@tanstack/react-router';
import { appConfig } from '@/environment';

export const Route = createFileRoute('/help/')({
	head: () => ({
		meta: [
			{ title: 'FocusCat Help and Support' },
			{
				name: 'description',
				content: 'Get help with FocusCat by email or from the community on Discord.'
			}
		],
		links: [{ rel: 'canonical', href: 'https://focuscat.app/help' }]
	}),
	component: RouteComponent
});

function RouteComponent() {
	return (
		<div className="text-base-950 mx-auto flex min-h-screen max-w-3xl flex-col justify-center p-8">
			<h1 className="mb-8 font-serif text-3xl font-medium sm:text-4xl">Need Help?</h1>
			<div className="flex flex-wrap gap-3">
				<Button
					variant="primary"
					size="lg"
					render={<a href={appConfig.help.mailto('Support request')} />}
				>
					Email Support
				</Button>
				<Button
					variant="default"
					size="lg"
					render={<a href={appConfig.help.discord} target="_blank" rel="noopener noreferrer" />}
				>
					Join Discord
				</Button>
			</div>
		</div>
	);
}
