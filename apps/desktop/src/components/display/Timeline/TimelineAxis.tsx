import { cn, useMemoCleanup } from '@repo/ui';
import { useCompute, useListener } from 'feature-react/state';
import React from 'react';
import { TimelineAxisCx, type TMarkerData } from './TimelineAxisCx';
import type { TimelineCx } from './TimelineCx';

export const TimelineAxis: React.FC<TTimelineAxisProps> = (props) => {
	const { cx: timelineCx, className } = props;
	const cx = useMemoCleanup(() => {
		const instance = new TimelineAxisCx(timelineCx);
		return [instance, () => instance.unmount()];
	}, [timelineCx]);

	const markerRefs = React.useRef<Map<number, HTMLDivElement>>(new Map());
	const markers = useCompute(
		[cx.$markers, timelineCx.$visibleRange] as const,
		([allMarkers = [], range = { startMs: 0, endMs: Infinity }]) =>
			allMarkers.filter((m) => m.ms >= range.startMs && m.ms <= range.endMs),
		[cx, timelineCx],
		markersEqual
	);

	// MARK: - Actions

	const updatePosition = React.useCallback(
		(el: HTMLDivElement, ms: number) => {
			el.style.left = `${timelineCx.msToPx(ms)}px`;
		},
		[timelineCx]
	);

	const updatePositions = React.useCallback(() => {
		for (const [ms, el] of markerRefs.current) {
			updatePosition(el, ms);
		}
	}, [updatePosition]);

	const setMarkerRef = React.useCallback(
		(ms: number, el: HTMLDivElement | null) => {
			if (el != null) {
				markerRefs.current.set(ms, el);
				updatePosition(el, ms);
			} else {
				markerRefs.current.delete(ms);
			}
		},
		[updatePosition]
	);

	// MARK: - Effects

	// Reposition on zoom/resize (ref callback handles initial positioning)
	useListener(timelineCx.$zoom, updatePositions);
	useListener(timelineCx.$containerRect, updatePositions);

	// MARK: - UI

	return (
		<div className={cn('bg-base-50 border-base-100 relative h-6 border-b', className)}>
			{markers.map((marker) => {
				switch (marker.type) {
					case 'major':
						return (
							<div
								key={marker.ms}
								ref={(el) => setMarkerRef(marker.ms, el)}
								className="absolute top-0 flex h-full -translate-x-1/2 flex-col items-center"
							>
								<div className="bg-base-300 h-2.5 w-px" />
								<span className="text-base-400 text-[10px]">{marker.label}</span>
							</div>
						);
					case 'minor':
						return (
							<div
								key={marker.ms}
								ref={(el) => setMarkerRef(marker.ms, el)}
								className="absolute top-0 -translate-x-1/2"
							>
								<div className="bg-base-200 h-1.5 w-px" />
							</div>
						);
				}
			})}
		</div>
	);
};

interface TTimelineAxisProps {
	cx: TimelineCx;
	className?: string;
}

function markersEqual(a: TMarkerData[], b: TMarkerData[]): boolean {
	if (a.length !== b.length) return false;
	for (let i = 0; i < a.length; i++) {
		if (a[i]?.ms !== b[i]?.ms) return false;
	}
	return true;
}
