import { formatDuration, Tooltip } from '@repo/ui';
import { useListener } from 'feature-react/state';
import React from 'react';
import type { SessionTimelineCx, TEventMarker, TEventPeriod } from './SessionTimelineCx';

export const SessionEventPeriodOverlays: React.FC<TSessionEventPeriodOverlaysProps> = (props) => {
	const { cx } = props;
	const periodRefs = React.useRef<Map<number, HTMLDivElement>>(new Map());

	// MARK: - Actions

	const updatePosition = React.useCallback(
		(el: HTMLDivElement, period: TEventPeriod) => {
			const left = cx.timelineCx.msToPx(period.startMs);
			const width = cx.timelineCx.msToPx(period.endMs) - left;
			el.style.left = `${left}px`;
			el.style.width = `${Math.max(width, 2)}px`;
		},
		[cx.timelineCx]
	);

	const updatePositions = React.useCallback(() => {
		for (const [index, el] of periodRefs.current) {
			const period = cx.eventPeriods[index];
			if (period != null) {
				updatePosition(el, period);
			}
		}
	}, [cx.eventPeriods, updatePosition]);

	const setRef = React.useCallback(
		(index: number, el: HTMLDivElement | null) => {
			if (el != null) {
				periodRefs.current.set(index, el);
				const period = cx.eventPeriods[index];
				if (period != null) {
					updatePosition(el, period);
				}
			} else {
				periodRefs.current.delete(index);
			}
		},
		[cx.eventPeriods, updatePosition]
	);

	const getColor = React.useCallback((type: string): string => {
		switch (type) {
			case 'pause':
				return '#f59e0b33';
			case 'overtime':
				return '#ef444433';
			case 'cancelled':
				return '#9ca3af4d';
			default:
				return 'transparent';
		}
	}, []);

	// MARK: - Effects

	// Reposition on zoom/resize (ref callback handles initial positioning)
	useListener(cx.timelineCx.$zoom, updatePositions);
	useListener(cx.timelineCx.$containerRect, updatePositions);

	// MARK: - UI

	return (
		<>
			{cx.eventPeriods.map((period, index) => {
				if (!period.isVisible) {
					return null;
				}

				return (
					<div
						key={`${period.type}-${index}`}
						ref={(el) => setRef(index, el)}
						className="pointer-events-none absolute top-0 h-full"
						style={{ backgroundColor: getColor(period.type) }}
					/>
				);
			})}
		</>
	);
};

export interface TSessionEventPeriodOverlaysProps {
	cx: SessionTimelineCx;
}

// MARK: - Event Markers

export const SessionEventMarkers: React.FC<TSessionMarkersProps> = (props) => {
	const { cx } = props;
	const markerRefs = React.useRef<Map<number, HTMLDivElement>>(new Map());

	// MARK: - Actions

	const updatePosition = React.useCallback(
		(el: HTMLDivElement, marker: TEventMarker) => {
			el.style.left = `${cx.timelineCx.msToPx(marker.timestamp)}px`;
		},
		[cx.timelineCx]
	);

	const updatePositions = React.useCallback(() => {
		for (const [index, el] of markerRefs.current) {
			const marker = cx.eventMarkers[index];
			if (marker != null) {
				updatePosition(el, marker);
			}
		}
	}, [cx.eventMarkers, updatePosition]);

	const setRef = React.useCallback(
		(index: number, el: HTMLDivElement | null) => {
			if (el != null) {
				markerRefs.current.set(index, el);
				const marker = cx.eventMarkers[index];
				if (marker != null) {
					updatePosition(el, marker);
				}
			} else {
				markerRefs.current.delete(index);
			}
		},
		[cx.eventMarkers, updatePosition]
	);

	// MARK: - Effects

	// Reposition on zoom/resize (ref callback handles initial positioning)
	useListener(cx.timelineCx.$zoom, updatePositions);
	useListener(cx.timelineCx.$containerRect, updatePositions);

	// MARK: - UI

	return (
		<>
			{cx.eventMarkers.map((marker, index) => {
				const time = new Date(marker.timestamp).toLocaleTimeString('en-US', {
					hour: 'numeric',
					minute: '2-digit'
				});

				switch (marker.type) {
					case 'paused':
						return (
							<EventMarker
								key={`paused-${index}`}
								setRef={(el) => setRef(index, el)}
								color="#f59e0b"
								label="Paused"
								time={time}
								subtitle={formatDuration(marker.seconds)}
							/>
						);
					case 'resumed':
						return (
							<EventMarker
								key={`resumed-${index}`}
								setRef={(el) => setRef(index, el)}
								color="#22c55e"
								label="Resumed"
								time={time}
							/>
						);
					case 'extended':
						return (
							<EventMarker
								key={`extended-${index}`}
								setRef={(el) => setRef(index, el)}
								color="#3b82f6"
								label="Extended"
								time={time}
								subtitle={`+${formatDuration(marker.seconds)}`}
							/>
						);
					case 'cancelled':
						return (
							<EventMarker
								key={`cancelled-${index}`}
								setRef={(el) => setRef(index, el)}
								color="#9ca3af"
								label="Cancelled"
								time={time}
							/>
						);
					case 'overtime':
						return (
							<EventMarker
								key={`overtime-${index}`}
								setRef={(el) => setRef(index, el)}
								color="#ef4444"
								label="Overtime"
								time={time}
								subtitle={formatDuration(marker.seconds)}
							/>
						);
				}
			})}
		</>
	);
};

export interface TSessionMarkersProps {
	cx: SessionTimelineCx;
}

const EventMarker: React.FC<TEventMarkerProps> = (props) => {
	const { setRef, color, label, time, subtitle } = props;

	return (
		<Tooltip
			content={
				<div className="flex flex-col gap-0.5">
					<span className="text-sm font-medium">{label}</span>
					<span className="text-base-500 text-xs">{time}</span>
					{subtitle != null && <span className="text-base-400 text-xs">{subtitle}</span>}
				</div>
			}
			side="top"
			positionerClassName="z-50"
		>
			<div
				ref={setRef}
				className="pointer-events-auto absolute top-0 bottom-0 flex -translate-x-1/2 flex-col items-center"
			>
				<div className="h-1.5 w-2" style={{ backgroundColor: color }} />
				<div
					className="size-0 border-x-4 border-t-[3px] border-x-transparent"
					style={{ borderTopColor: color }}
				/>
				<div className="flex-1 border-l border-dashed" style={{ borderColor: color }} />
			</div>
		</Tooltip>
	);
};

interface TEventMarkerProps {
	setRef: (el: HTMLDivElement | null) => void;
	color: string;
	label: string;
	time: string;
	subtitle?: string;
}
