import { useListener } from 'feature-react/state';
import React from 'react';
import type { ActivityTrackCx } from '../ActivityTrackCx';

/**
 * Updates tooltip trigger to cover only the visible portion of a block.
 * Ensures tooltip anchors correctly during scroll.
 */
export function useVisibleRangeStyle(
	ref: React.RefObject<HTMLDivElement | null>,
	block: TTimeRange,
	cx: ActivityTrackCx,
	options: TVisibleRangeStyleOptions = {}
): void {
	const { offsetPx = 0 } = options;

	const update = React.useCallback(() => {
		const el = ref.current;
		if (el == null) {
			return;
		}

		const left = cx.msToPx(block.startMs);
		const right = cx.msToPx(block.endMs);
		const scrollLeft = cx.timelineCx.$scrollLeft.get();
		const visibleEnd = scrollLeft + cx.timelineCx.containerWidth;

		const clampedLeft = Math.max(left, scrollLeft);
		const clampedRight = Math.min(right, visibleEnd);
		const visibleWidth = Math.max(0, clampedRight - clampedLeft);

		el.style.left = `${Math.max(clampedLeft - left - offsetPx, 0)}px`;
		el.style.width = `${Math.max(visibleWidth, 2)}px`;
	}, [ref, cx, block.startMs, block.endMs, offsetPx]);

	// MARK: - Effects

	// Position before paint to prevent flash
	React.useLayoutEffect(update, [update]);

	// Reposition on zoom/scroll/resize (useLayoutEffect handles initial positioning)
	useListener(cx.timelineCx.$zoom, update);
	useListener(cx.timelineCx.$scrollLeft, update);
	useListener(cx.timelineCx.$containerRect, update);
}

interface TVisibleRangeStyleOptions {
	offsetPx?: number;
}

interface TTimeRange {
	startMs: number;
	endMs: number;
}
