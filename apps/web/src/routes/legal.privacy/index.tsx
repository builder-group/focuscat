import { createFileRoute } from '@tanstack/react-router';
import { mdxComponents } from '@/components';
import Content from './content.mdx';

export const Route = createFileRoute('/legal/privacy/')({
	head: () => ({
		meta: [
			{ title: 'Privacy Policy: FocusCat' },
			{
				name: 'description',
				content: 'How FocusCat handles app, website, and support data.'
			}
		],
		links: [{ rel: 'canonical', href: 'https://focuscat.app/legal/privacy' }]
	}),
	component: RouteComponent
});

function RouteComponent() {
	return (
		<article className="prose prose-base dark:prose-invert mx-auto max-w-3xl p-8">
			<Content components={mdxComponents} />
		</article>
	);
}
