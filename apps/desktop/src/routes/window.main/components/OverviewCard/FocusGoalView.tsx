import { formatDuration } from '@repo/ui';
import { useCompute } from 'feature-react/state';
import React from 'react';
import { specta } from '@/environment';
import { useSettingsCx } from '@/features/settings';
import { useOnSessionComplete } from '@/hooks';
import { toTuple } from '@/lib';

export const FocusGoalView: React.FC = () => {
	const [focusSeconds, setFocusSeconds] = React.useState(0);

	const settingsCx = useSettingsCx();
	const goalSeconds = useCompute(
		settingsCx.$appSettings,
		(settings) => settings.goals.dailyGoalMinutes * 60
	);

	const progress = Math.min(focusSeconds / goalSeconds, 1);

	// MARK: - Actions

	const fetchData = React.useCallback(async () => {
		const [isFocusOk, , secs] = toTuple(await specta.commands.getTodayFocusSeconds());
		if (isFocusOk) {
			setFocusSeconds(secs);
		}
	}, []);

	// MARK: - Effects

	React.useEffect(() => {
		fetchData();
	}, [fetchData]);

	useOnSessionComplete(React.useCallback(() => fetchData(), [fetchData]));

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
