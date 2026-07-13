import { createFileRoute } from '@tanstack/react-router';
import { mdxComponents } from '@/components';
import Content from './content.mdx';

export const Route = createFileRoute('/legal/terms/')({
	head: () => ({
		meta: [
			{ title: 'Terms of Service: FocusCat' },
			{
				name: 'description',
				content: 'Terms for using the FocusCat app and website.'
			}
		],
		links: [{ rel: 'canonical', href: 'https://focuscat.app/legal/terms' }]
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
