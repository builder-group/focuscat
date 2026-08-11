import { Button } from '@base-ui/react/button';
import {
	BriefcaseIcon,
	Cat,
	cn,
	CoffeeIcon,
	CompactTimerActions,
	ExpandIcon,
	formatTime,
	GripIcon,
	isBreakSession,
	type TCatRef
} from '@repo/ui';
import { createFileRoute } from '@tanstack/react-router';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useCompute, useFeatureState } from 'feature-react/state';
import React from 'react';
import { specta } from '@/environment';
import { useSettingsCx } from '@/features/settings';
import { useTimerCx } from '@/features/timer';
import { useOnInputDetected } from '@/hooks';

export const Route = createFileRoute('/window/cat/')({
	component: RouteComponent
});

function RouteComponent() {
	const settingsCx = useSettingsCx();
	const settings = useFeatureState(settingsCx.$appSettings);
	const timerCx = useTimerCx();
	const catRef = React.useRef<TCatRef>(null);

	const { isBreak, isOvertime, isRunning, displayTime } = useCompute(
		[
			timerCx.$status,
			timerCx.$sessionType,
			timerCx.$remainingSeconds,
			timerCx.$overtimeSeconds
		] as const,
		([
			status = 'idle',
			sessionType = 'pomodoro:work',
			remainingSeconds = 0,
			overtimeSeconds = 0
		]) => {
			const isOvertime = overtimeSeconds > 0;
			return {
				isBreak: isBreakSession(sessionType),
				isOvertime,
				isRunning: status === 'running',
				displayTime: isOvertime ? `+${formatTime(overtimeSeconds)}` : formatTime(remainingSeconds)
			};
		},
		[],
		(a, b) =>
			a.isBreak === b.isBreak &&
			a.isOvertime === b.isOvertime &&
			a.isRunning === b.isRunning &&
			a.displayTime === b.displayTime
	);

	// MARK: - Actions

	const handleExpand = React.useCallback(async () => {
		await specta.commands.showMainWindow();
		await specta.commands.hideCatWindow();
	}, []);

	const handleCatTap = React.useCallback(() => {
		specta.commands.playSound('meow');
	}, []);

	// MARK: - Effects

	useOnInputDetected(React.useCallback(() => catRef.current?.tap({ cooldown: 0 }), []));

	// MARK: - UI

	return (
		<div
			className={cn(
				'flex h-screen flex-col items-center overflow-hidden',
				settings.developer.cat && 'border border-red-500'
			)}
		>
			<Cat
				ref={catRef}
				face={settings.cat.equippedFace}
				hat={settings.cat.equippedHat}
				size={170}
				className={cn('z-10', settings.developer.cat && 'border border-green-500')}
				onTap={handleCatTap}
			/>

			<div
				className={cn(
					'bg-base-100 flex items-center rounded-lg shadow-lg',
					settings.developer.cat && 'border border-blue-500'
				)}
			>
				{/* Drag Handle */}
				<div
					className="flex cursor-grab items-center px-2 py-2 active:cursor-grabbing"
					onPointerDown={(e) => {
						if (e.button === 0) {
							getCurrentWindow().startDragging();
						}
					}}
				>
					<GripIcon className="text-base-500 size-4 sm:size-3.5" />
				</div>

				<div className="group relative flex items-center px-2">
					<div className="flex items-center gap-2 transition-opacity group-hover:opacity-0">
						{isBreak ? (
							<CoffeeIcon
								className={cn('size-4 sm:size-3.5', isOvertime ? 'text-warning' : 'text-base-400')}
							/>
						) : (
							<BriefcaseIcon
								className={cn('size-4 sm:size-3.5', isOvertime ? 'text-warning' : 'text-base-400')}
							/>
						)}
						<span
							className={cn(
								'text-center font-mono text-sm select-none',
								isOvertime ? 'text-warning' : isRunning ? 'text-base-950' : 'text-base-400'
							)}
						>
							{displayTime}
						</span>
					</div>

					{/* Hover Controls (overlay) */}
					<div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
						<CompactTimerActions cx={timerCx} />
					</div>
				</div>

				{/* Expand Button */}
				<Button
					className="text-base-400 hover:text-base-950 flex items-center px-2 py-2 transition-colors"
					onClick={handleExpand}
				>
					<ExpandIcon className="size-3.5" />
				</Button>
			</div>
		</div>
	);
}
