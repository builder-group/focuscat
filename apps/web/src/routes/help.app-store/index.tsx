import { createFileRoute } from '@tanstack/react-router';
import { mdxComponents } from '@/components';
import Content from './content.mdx';

export const Route = createFileRoute('/help/app-store/')({
	head: () => ({
		meta: [
			{ title: 'Direct download vs Mac App Store: FocusCat' },
			{
				name: 'description',
				content: 'Features available in the direct-download and Mac App Store versions of FocusCat.'
			}
		],
		links: [{ rel: 'canonical', href: 'https://focuscat.app/help/app-store' }]
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
