import { formatDuration, isWorkSession } from '@repo/ui';
import { useCompute, useFeatureState } from 'feature-react/state';
import React from 'react';
import { useSessionCx } from '@/features/session';
import { useSettingsCx } from '@/features/settings';
import { useTimerCx } from '@/features/timer';

export const FocusGoalView: React.FC = () => {
	const settingsCx = useSettingsCx();
	const sessionCx = useSessionCx();
	const timerCx = useTimerCx();

	const baseFocusSeconds = useFeatureState(sessionCx.$todayFocusSeconds);
	const goalSeconds = useCompute(
		settingsCx.$appSettings,
		(settings) => settings.goals.dailyGoalMinutes * 60
	);
	const currentElapsed = useCompute(
		[
			timerCx.$sessionType,
			timerCx.$status,
			timerCx.$totalSeconds,
			timerCx.$remainingSeconds,
			timerCx.$overtimeSeconds
		],
		([sessionType, status, totalSeconds, remainingSeconds, overtimeSeconds]) => {
			return isWorkSession(sessionType) && status !== 'idle'
				? totalSeconds - remainingSeconds + overtimeSeconds
				: 0;
		}
	);

	const focusSeconds = baseFocusSeconds + currentElapsed;
	const progress = Math.min(focusSeconds / goalSeconds, 1);

	// MARK: - UI

	return (
		<div className="mt-2 flex flex-col gap-1">
			<span className="text-base-900 text-sm tabular-nums">
				<span className="font-semibold">{formatDuration(focusSeconds)}</span> /{' '}
				{formatDuration(goalSeconds)}
			</span>
			<div className="bg-base-200 h-1 overflow-hidden rounded-full">
				<div
					className="bg-base-900 h-full transition-[width] duration-500"
					style={{ width: `${progress * 100}%` }}
				/>
			</div>
		</div>
	);
};
