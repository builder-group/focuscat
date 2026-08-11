import { cn, useBoundingRectObserver } from '@repo/ui';
import { useSubscriber } from 'feature-react/state';
import React from 'react';
import type { TimelineCx } from './TimelineCx';

export const Timeline: React.FC<TTimelineProps> = (props) => {
	const { cx, className, children } = props;
	const innerRef = React.useRef<HTMLDivElement>(null);

	// MARK: - Actions

	const handleScroll = React.useCallback(
		(e: React.UIEvent<HTMLDivElement>) => {
			if (cx.isProgrammaticScroll) {
				return;
			}
			cx.setScrollLeft(e.currentTarget.scrollLeft);
		},
		[cx]
	);

	// MARK: - Effects

	useBoundingRectObserver(
		cx.containerRef,
		cx.$containerRect.get(),
		(rect) => {
			cx.$containerRect.set(rect);
		},
		[cx]
	);

	// Apply zoom to inner container width and toggle scrollbar visibility
	useSubscriber(cx.$zoom, ({ value: zoom }) => {
		const container = cx.containerRef.current;
		const inner = innerRef.current;
		if (container == null || inner == null) {
			return;
		}

		inner.style.width = `${zoom * 100}%`;

		if (zoom > 1) {
			container.classList.add('overflow-x-auto');
			container.classList.remove('overflow-hidden');
		} else {
			container.classList.remove('overflow-x-auto');
			container.classList.add('overflow-hidden');
		}
	});

	// Sync scroll position to DOM (e.g. after zoomAtPoint)
	useSubscriber(cx.$scrollLeft, ({ value: scrollLeft }) => {
		const el = cx.containerRef.current;
		if (el == null) {
			return;
		}

		if (Math.abs(el.scrollLeft - scrollLeft) > 1) {
			cx.isProgrammaticScroll = true;
			el.scrollLeft = scrollLeft;
		}

		requestAnimationFrame(() => {
			cx.isProgrammaticScroll = false;
		});
	});

	// Wheel handler for zoom and horizontal scroll
	React.useEffect(() => {
		const el = cx.containerRef.current;
		if (el == null) {
			return;
		}

		const handleWheel = (e: WheelEvent) => {
			// Ctrl/Cmd + scroll = zoom
			if (e.ctrlKey || e.metaKey) {
				e.preventDefault();
				e.stopPropagation();
				const factor = e.deltaY > 0 ? 0.9 : 1.1;
				cx.zoomAtPoint(factor, e.clientX);
				return;
			}

			// Regular scroll when zoomed in
			if (cx.$zoom.get() > 1) {
				e.preventDefault();
				cx.isProgrammaticScroll = true;
				const newScrollLeft = el.scrollLeft + e.deltaY;
				el.scrollLeft = newScrollLeft;
				cx.setScrollLeft(newScrollLeft);
			}
		};

		el.addEventListener('wheel', handleWheel, { passive: false });
		return () => {
			el.removeEventListener('wheel', handleWheel);
		};
	}, [cx]);

	// MARK: - UI

	return (
		<div
			ref={cx.containerRef}
			className={cn('border-base-200 overflow-hidden rounded-lg border', className)}
			onScroll={handleScroll}
		>
			<div ref={innerRef} className="min-w-full">
				{children}
			</div>
		</div>
	);
};

export interface TTimelineProps {
	cx: TimelineCx;
	className?: string;
	children: React.ReactNode;
}
