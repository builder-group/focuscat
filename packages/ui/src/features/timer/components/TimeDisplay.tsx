import { useCompute, useFeatureState } from 'feature-react/state';
import React from 'react';
import { cn, formatTime, formatTimeOfDay } from '@/lib';
import { type TTimerViewCx } from '../TimerViewCx';

export const TimeDisplay: React.FC<TTimeDisplayProps> = (props) => {
	const { cx, className } = props;
	const previewMinutes = useFeatureState(cx.$previewMinutes);

	const { isOvertime, displaySeconds, displayStartTime, displayEndTime } = useCompute(
		[
			cx.timer.$status,
			cx.timer.$remainingSeconds,
			cx.timer.$overtimeSeconds,
			cx.timer.$startedAt
		] as const,
		([status = 'idle', remainingSeconds = 0, overtimeSeconds = 0, startedAt = null]) => {
			const isRunning = status === 'running';
			const isOvertime = remainingSeconds === 0 && overtimeSeconds > 0;
			const displaySeconds = previewMinutes != null ? previewMinutes * 60 : remainingSeconds;
			const endTime =
				isRunning && remainingSeconds > 0 ? new Date(Date.now() + remainingSeconds * 1000) : null;

			const now = new Date();
			const displayStartTime = isRunning && startedAt != null ? startedAt : now;
			const displayEndTime =
				isRunning && endTime != null ? endTime : new Date(now.getTime() + displaySeconds * 1000);

			return { isOvertime, displaySeconds, displayStartTime, displayEndTime };
		},
		[previewMinutes],
		(a, b) =>
			a.isOvertime === b.isOvertime &&
			a.displaySeconds === b.displaySeconds &&
			a.displayStartTime.getTime() === b.displayStartTime.getTime() &&
			Math.floor(a.displayEndTime.getTime() / 1000) ===
				Math.floor(b.displayEndTime.getTime() / 1000)
	);

	const { totalWorked, overtimeSeconds, autoAdvanceCountdownSeconds } = useCompute(
		[cx.timer.$totalSeconds, cx.timer.$overtimeSeconds, cx.$config] as const,
		([totalSeconds = 0, overtimeSeconds = 0, config]) => {
			let autoAdvanceCountdownSeconds: number | null = null;
			if (overtimeSeconds > 0) {
				if (cx.timer.mode === 'pomodoro' && config.pomodoro.autoAdvance) {
					autoAdvanceCountdownSeconds =
						Math.max(0, config.pomodoro.autoAdvanceCountdownSeconds - overtimeSeconds) || null;
				} else if (cx.timer.mode === 'progressive' && config.progressive.autoAdvance) {
					autoAdvanceCountdownSeconds =
						Math.max(0, config.progressive.autoAdvanceCountdownSeconds - overtimeSeconds) || null;
				}
			}

			return {
				totalWorked: totalSeconds + overtimeSeconds,
				overtimeSeconds,
				autoAdvanceCountdownSeconds
			};
		},
		[],
		(a, b) =>
			a.totalWorked === b.totalWorked &&
			a.overtimeSeconds === b.overtimeSeconds &&
			a.autoAdvanceCountdownSeconds === b.autoAdvanceCountdownSeconds
	);

	// MARK: - UI

	return (
		<div className={cn('flex flex-col items-center gap-1', className)}>
			{isOvertime ? (
				<>
					{/* Total time worked */}
					<p className="text-base-900 font-mono text-3xl font-light tracking-wider">
						{formatTime(totalWorked)}
					</p>
					{/* Auto-advance countdown or overtime */}
					{autoAdvanceCountdownSeconds != null ? (
						<p className="text-secondary text-sm">
							Auto advance in {formatTime(autoAdvanceCountdownSeconds)}
						</p>
					) : (
						<p className="text-warning text-sm">+{formatTime(overtimeSeconds)} overtime</p>
					)}
				</>
			) : (
				<>
					{/* Remaining time */}
					<p className="text-base-900 font-mono text-3xl font-light tracking-wider">
						{formatTime(displaySeconds)}
					</p>
					{/* Time range */}
					<p className="text-base-400 text-sm">
						{formatTimeOfDay(displayStartTime)} → {formatTimeOfDay(displayEndTime)}
					</p>
				</>
			)}
		</div>
	);
};

interface TTimeDisplayProps {
	cx: TTimerViewCx;
	className?: string;
}
