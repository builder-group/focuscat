import { localStorageFeature } from 'feature-react/state';
import { createState } from 'feature-state';
import { TimelineCx } from '@/components';
import type { specta } from '@/environment';
import type { TViewMode } from '@/features/focus';
import { ActivityTrackCx, TActivityTrackCxThresholds } from './ActivityTrack';

export class SessionTimelineCx {
	public readonly timelineCx: TimelineCx;
	public readonly activityTrackCx: ActivityTrackCx;
	public readonly $granularity;
	public readonly $viewMode;
	public readonly config: TSessionTimelineCxConfig;

	public readonly eventPeriods: TEventPeriod[];
	public readonly eventMarkers: TEventMarker[];

	private _unlisteners: Array<() => void> = [];

	constructor(
		session: specta.SessionDetailDto,
		activities: specta.WindowActivityDto[],
		options: TSessionTimelineCxOptions = {}
	) {
		const {
			storageKey = 'focuscat:timeline-granularity',
			granularityMin = 1,
			granularityMax = 5,
			granularityDefault = 3
		} = options;

		this.config = { storageKey, granularityMin, granularityMax, granularityDefault };
		this.$granularity = createState(granularityDefault).with(localStorageFeature(storageKey));
		this.$granularity.persist();
		this.$viewMode = createState<TViewMode>('apps').with(
			localStorageFeature('focuscat:timeline-view-mode')
		);
		this.$viewMode.persist();

		// Compute periods and timeline
		const { eventPeriods, timelineEndMs } = this.computeEventPeriods(session);
		this.eventPeriods = eventPeriods;
		this.timelineCx = new TimelineCx(session.startedAt, timelineEndMs);

		// Compute event markers
		this.eventMarkers = this.computeEventMarkers(session.events, eventPeriods);

		// Setup activity row
		const thresholds = this.granularityToThresholds(this.$granularity.get());
		this.activityTrackCx = new ActivityTrackCx(this.timelineCx, activities, thresholds);
		this.activityTrackCx.setViewMode(this.$viewMode.get());

		this._unlisteners.push(
			this.$granularity.listen(({ value }) => {
				const config = this.granularityToThresholds(value);
				this.activityTrackCx.setConfig(config);
			}),
			this.$viewMode.listen(({ value }) => {
				this.activityTrackCx.setViewMode(value);
			})
		);
	}

	public unmount(): void {
		for (const unlisten of this._unlisteners) {
			unlisten();
		}
		this._unlisteners = [];
		this.timelineCx.unmount();
		this.activityTrackCx.unmount();
	}

	public setGranularity(granularity: number): void {
		this.$granularity.set(granularity);
	}

	public setViewMode(mode: TViewMode): void {
		this.$viewMode.set(mode);
	}

	public setActivities(activities: specta.WindowActivityDto[]): void {
		this.activityTrackCx.setActivities(activities);
	}

	private granularityToThresholds(granularity: number): TActivityTrackCxThresholds {
		return {
			minSegmentPx: (this.config.granularityMax - granularity) * 4,
			minGroupPx: (this.config.granularityMax - granularity) * 6
		};
	}

	private computeEventPeriods(session: specta.SessionDetailDto): {
		eventPeriods: TEventPeriod[];
		timelineEndMs: number;
	} {
		const { events, startedAt, plannedSeconds, status } = session;
		const actualEndMs = session.endedAt ?? Date.now();
		const plannedRunningMs = plannedSeconds * 1000;

		// Find pauses that are part of extend UX flow (paused → extended)
		const extendPauseTimestamps = new Set<number>();
		const keyEvents = events.filter((e) => ['paused', 'resumed', 'extended'].includes(e.eventType));
		for (let i = 0; i < keyEvents.length; i++) {
			const keyEvent = keyEvents[i];
			if (keyEvent?.eventType === 'paused' && keyEvents[i + 1]?.eventType === 'extended') {
				extendPauseTimestamps.add(keyEvent.timestamp);
			}
		}

		// Build pause periods
		const pausePeriods: TPauseEventPeriod[] = [];
		let pauseStartMs: number | null = null;
		for (const event of events) {
			if (event.eventType === 'paused') {
				pauseStartMs = event.timestamp;
			} else if (event.eventType === 'resumed' && pauseStartMs != null) {
				pausePeriods.push({
					type: 'pause',
					startMs: pauseStartMs,
					endMs: event.timestamp,
					isVisible: !extendPauseTimestamps.has(pauseStartMs)
				});
				pauseStartMs = null;
			}
		}
		if (pauseStartMs != null) {
			pausePeriods.push({
				type: 'pause',
				startMs: pauseStartMs,
				endMs: actualEndMs,
				isVisible: !extendPauseTimestamps.has(pauseStartMs)
			});
		}

		// Helper: convert running time to wall clock (accounting for pauses)
		const toWallClock = (targetRunningMs: number): number => {
			let runningTime = 0;
			let wallClock = startedAt;
			for (const pause of pausePeriods) {
				const segmentMs = pause.startMs - wallClock;
				if (runningTime + segmentMs >= targetRunningMs) {
					return wallClock + (targetRunningMs - runningTime);
				}
				runningTime += segmentMs;
				wallClock = pause.endMs;
			}
			return wallClock + (targetRunningMs - runningTime);
		};

		// Get extensions sorted by time
		const extensions = events
			.filter((e) => e.eventType === 'extended' && e.data?.seconds != null)
			.sort((a, b) => a.timestamp - b.timestamp);

		const totalExtendedMs = extensions.reduce((sum, e) => sum + (e.data?.seconds ?? 0) * 1000, 0);

		// Build overtime periods (gaps between timer hitting 0 and extending)
		const overtimePeriods: TOvertimeEventPeriod[] = [];
		let currentPlannedMs = plannedRunningMs;
		for (const ext of extensions) {
			const timerEndWallClock = toWallClock(currentPlannedMs);
			if (ext.timestamp > timerEndWallClock) {
				overtimePeriods.push({
					type: 'overtime',
					startMs: timerEndWallClock,
					endMs: ext.timestamp,
					isVisible: true
				});
			}
			currentPlannedMs += (ext.data?.seconds ?? 0) * 1000;
		}

		// Check for final overtime (after all extensions)
		const finalTimerEnd = toWallClock(currentPlannedMs);
		if (actualEndMs > finalTimerEnd) {
			overtimePeriods.push({
				type: 'overtime',
				startMs: finalTimerEnd,
				endMs: actualEndMs,
				isVisible: true
			});
		}

		// Compute timeline end and cancelled period
		const effectivePlannedEndMs = toWallClock(plannedRunningMs + totalExtendedMs);
		const timelineEndMs = Math.max(effectivePlannedEndMs, actualEndMs);

		const cancelledPeriod: TCancelledEventPeriod | null =
			status === 'cancelled' && actualEndMs < effectivePlannedEndMs
				? {
						type: 'cancelled',
						startMs: actualEndMs,
						endMs: effectivePlannedEndMs,
						isVisible: true
					}
				: null;

		return {
			eventPeriods: [
				...pausePeriods,
				...overtimePeriods,
				...(cancelledPeriod != null ? [cancelledPeriod] : [])
			],
			timelineEndMs
		};
	}

	private computeEventMarkers(
		events: specta.SessionEventDto[],
		eventPeriods: TEventPeriod[]
	): TEventMarker[] {
		const markers: TEventMarker[] = [];

		// Filter to key events
		const keyEvents = events.filter((e) => ['paused', 'resumed', 'extended'].includes(e.eventType));

		for (let i = 0; i < keyEvents.length; i++) {
			const event = keyEvents[i];
			if (!event) continue;
			const prevEvent = keyEvents[i - 1];
			const nextEvent = keyEvents[i + 1];

			// Skip pause/resume that are part of extend UX flow
			if (event.eventType === 'paused' && nextEvent?.eventType === 'extended') {
				continue;
			}
			if (event.eventType === 'resumed' && prevEvent?.eventType === 'extended') {
				continue;
			}

			switch (event.eventType) {
				case 'paused': {
					// Find matching pause period to get duration
					const pausePeriod = eventPeriods.find(
						(p) => p.type === 'pause' && p.startMs === event.timestamp
					);
					const seconds = pausePeriod
						? Math.round((pausePeriod.endMs - pausePeriod.startMs) / 1000)
						: 0;
					markers.push({ type: 'paused', timestamp: event.timestamp, seconds });
					break;
				}
				case 'resumed':
					markers.push({ type: 'resumed', timestamp: event.timestamp });
					break;
				case 'extended':
					markers.push({
						type: 'extended',
						timestamp: event.timestamp,
						seconds: event.data?.seconds ?? 0
					});
					break;
			}
		}

		// Add markers for overtime and cancelled periods
		for (const period of eventPeriods) {
			if (period.type === 'overtime') {
				markers.push({
					type: 'overtime',
					timestamp: period.startMs,
					seconds: Math.round((period.endMs - period.startMs) / 1000)
				});
			} else if (period.type === 'cancelled') {
				markers.push({ type: 'cancelled', timestamp: period.startMs });
			}
		}

		return markers.sort((a, b) => a.timestamp - b.timestamp);
	}
}

export interface TSessionTimelineCxOptions {
	storageKey?: string;
	granularityMin?: number;
	granularityMax?: number;
	granularityDefault?: number;
}

export type TSessionTimelineCxConfig = Required<TSessionTimelineCxOptions>;

export type TEventPeriod = TPauseEventPeriod | TOvertimeEventPeriod | TCancelledEventPeriod;

interface TBaseEventPeriod {
	startMs: number;
	endMs: number;
	isVisible: boolean;
}

export interface TPauseEventPeriod extends TBaseEventPeriod {
	type: 'pause';
}

export interface TOvertimeEventPeriod extends TBaseEventPeriod {
	type: 'overtime';
}

export interface TCancelledEventPeriod extends TBaseEventPeriod {
	type: 'cancelled';
}

export type TEventMarker =
	| TPausedEventMarker
	| TResumedEventMarker
	| TExtendedEventMarker
	| TCancelledEventMarker
	| TOvertimeEventMarker;

export interface TPausedEventMarker {
	type: 'paused';
	timestamp: number;
	seconds: number;
}

export interface TResumedEventMarker {
	type: 'resumed';
	timestamp: number;
}

export interface TExtendedEventMarker {
	type: 'extended';
	timestamp: number;
	seconds: number;
}

export interface TCancelledEventMarker {
	type: 'cancelled';
	timestamp: number;
}

export interface TOvertimeEventMarker {
	type: 'overtime';
	timestamp: number;
	seconds: number;
}
