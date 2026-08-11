import { useListener } from 'feature-react/state';
import React from 'react';
import type { ActivityTrackCx } from '../ActivityTrackCx';

/**
 * Updates block position/size of a block.
 * Pass `parentBlock` for relative positioning (segments within groups).
 */
export function useBlockStyle(
	ref: React.RefObject<HTMLDivElement | null>,
	block: TTimeRange,
	cx: ActivityTrackCx,
	options: TBlockStyleOptions = {}
): void {
	const { gapPx = 1, parentBlock } = options;

	const update = React.useCallback(() => {
		const el = ref.current;
		if (el == null) {
			return;
		}

		const left = cx.msToPx(block.startMs);
		const width = cx.msToPx(block.endMs) - left;

		if (parentBlock != null) {
			// Relative positioning within parent
			const parentLeft = cx.msToPx(parentBlock.startMs);
			el.style.transform = `translateX(${left - parentLeft - gapPx}px)`;
			el.style.width = `${Math.max(width, 2)}px`;
		} else {
			// Absolute positioning
			el.style.transform = `translateX(${left + gapPx}px)`;
			el.style.width = `${Math.max(width - gapPx * 2, 2)}px`;
		}
	}, [ref, cx, block, parentBlock, gapPx]);

	// MARK: - Effects

	// Position before paint to prevent flash
	React.useLayoutEffect(update, [update]);

	// Reposition on zoom/resize (useLayoutEffect handles initial positioning)
	useListener(cx.timelineCx.$zoom, update);
	useListener(cx.timelineCx.$containerRect, update);
}

interface TBlockStyleOptions {
	gapPx?: number;
	parentBlock?: TTimeRange;
}

interface TTimeRange {
	startMs: number;
	endMs: number;
}
