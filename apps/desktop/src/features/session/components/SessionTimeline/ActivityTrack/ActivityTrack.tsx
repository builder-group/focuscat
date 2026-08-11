import { useCompute } from 'feature-react/state';
import React from 'react';
import { ActivityTrackCx } from './ActivityTrackCx';
import { AppBlock, CategoryBlock, WindowGroupBlock } from './components';
import type { TActivityBlock } from './types';

export const ActivityTrack: React.FC<TActivityTrackProps> = (props) => {
	const { cx } = props;

	const blocks = useCompute(
		[cx.$blocks, cx.timelineCx.$visibleRange] as const,
		([allBlocks = [], range = { startMs: 0, endMs: Infinity }]) =>
			allBlocks.filter((b) => b.endMs > range.startMs && b.startMs < range.endMs),
		[cx, cx.timelineCx],
		blocksEqual
	);

	return (
		<div className="bg-base-100 relative h-10">
			{blocks.map((block, index) => {
				const key = `${block.startMs}-${index}`;
				switch (block.type) {
					case 'window-group':
						return <WindowGroupBlock key={key} block={block} cx={cx} />;
					case 'app':
						return <AppBlock key={key} block={block} cx={cx} />;
					case 'category':
						return <CategoryBlock key={key} block={block} cx={cx} />;
					case 'window':
						// Currently grouped into window-group by aggregation algorithm
						// TODO: Render directly at high zoom levels?
						return null;
				}
			})}
		</div>
	);
};

export interface TActivityTrackProps {
	cx: ActivityTrackCx;
}

function blocksEqual(a: TActivityBlock[], b: TActivityBlock[]): boolean {
	if (a.length !== b.length) return false;
	for (let i = 0; i < a.length; i++) {
		const left = a[i];
		const right = b[i];

		if (left == null || right == null) {
			return false;
		}

		if (left.type !== right.type || left.startMs !== right.startMs || left.endMs !== right.endMs) {
			return false;
		}

		switch (left.type) {
			case 'window':
				if (
					right.type !== 'window' ||
					left.app.bundleId !== right.app.bundleId ||
					left.windows.length !== right.windows.length
				) {
					return false;
				}
				break;
			case 'window-group':
				if (
					right.type !== 'window-group' ||
					left.app.bundleId !== right.app.bundleId ||
					left.segments.length !== right.segments.length
				) {
					return false;
				}
				break;
			case 'app':
				if (
					right.type !== 'app' ||
					left.apps.length !== right.apps.length ||
					left.apps[0]?.bundleId !== right.apps[0]?.bundleId ||
					left.activities.length !== right.activities.length
				) {
					return false;
				}
				break;
			case 'category':
				if (
					right.type !== 'category' ||
					left.category !== right.category ||
					left.categories.length !== right.categories.length ||
					left.activities.length !== right.activities.length
				) {
					return false;
				}
				break;
		}
	}
	return true;
}
