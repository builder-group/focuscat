import {
	Cat,
	catConfig,
	HistoryIcon,
	IconButton,
	MinimizeIcon,
	SettingsIcon,
	ShuffleIcon,
	TCatFace,
	TCatHat,
	TimerView,
	type TCatRef
} from '@repo/ui';
import { createFileRoute } from '@tanstack/react-router';
import { useFeatureState, useListener } from 'feature-react/state';
import React from 'react';
import { WindowHeader } from '@/components';
import { specta } from '@/environment';
import { useSettingsCx } from '@/features/settings';
import { useTimerViewCx } from '@/features/timer';
import { OverviewCard } from './components';

export const Route = createFileRoute('/window/main/')({
	component: RouteComponent
});

function RouteComponent() {
	const catRef = React.useRef<TCatRef>(null);

	const settingsCx = useSettingsCx();
	const settings = useFeatureState(settingsCx.$appSettings);

	const timerViewCx = useTimerViewCx();
	const timerStatus = useFeatureState(timerViewCx.timer.$status);

	// Top section (Stats + Cat): width is half of 300px window, height lets cat overflow into timer wheel
	const topSection = React.useMemo(() => {
		const width = 150;
		const scaledBodyOffset = catConfig.baseBodyBottomOffset * (width / catConfig.baseSize);
		const height = Math.round(width - scaledBodyOffset);
		return { width, height };
	}, []);

	// MARK: - Actions

	const handleMinimize = React.useCallback(async () => {
		await specta.commands.showCatWindow();
		await specta.commands.hideMainWindow();
	}, []);

	const handleSettings = React.useCallback(async () => {
		await specta.commands.showSettingsWindow();
	}, []);

	const handleActivity = React.useCallback(async () => {
		await specta.commands.showActivityWindow();
	}, []);

	const handleRandomize = React.useCallback(() => {
		const faces = catConfig.parts.face.available;
		const hats: (TCatHat | null)[] = [...catConfig.parts.hat.available, null]; // Add null to allow for no hat
		const currentFace = settings.cat.equippedFace;
		const currentHat = settings.cat.equippedHat;

		// Randomize face and hat until they are different from the current one
		let nextFace: TCatFace = currentFace;
		let nextHat: TCatHat | null = currentHat;
		while (nextFace === currentFace && nextHat === currentHat) {
			nextFace = faces[Math.floor(Math.random() * faces.length)] as TCatFace;
			nextHat = hats[Math.floor(Math.random() * hats.length)] ?? null;
		}

		settingsCx.update({
			cat: {
				equippedFur: settings.cat.equippedFur,
				equippedFace: nextFace,
				equippedHat: nextHat
			}
		});
	}, [settingsCx, settings.cat]);

	const handleCatTap = React.useCallback(() => {
		specta.commands.playSound('meow');
		return timerStatus === 'running' ? { mode: 'both' as const } : undefined;
	}, [timerStatus]);

	// MARK: - Effects

	useListener(timerViewCx.$previewMinutes, ({ value: minutes, prevValue: prevMinutes }) => {
		if (minutes != null && Math.round(minutes) !== Math.round(prevMinutes ?? minutes + 1)) {
			catRef.current?.tap();
		}
	});

	useListener(timerViewCx.timer.$remainingSeconds, () => {
		if (
			timerViewCx.timer.$status.get() === 'running' &&
			timerViewCx.$previewMinutes.get() == null
		) {
			catRef.current?.tap();
		}
	});

	// MARK: - UI

	return (
		<div className="bg-base-0 flex h-screen w-[300px] flex-col">
			<WindowHeader>
				{settings.features.catWindow && (
					<IconButton
						variant="bare"
						size="sm"
						onClick={handleMinimize}
						aria-label="Minimize to cat widget"
					>
						<MinimizeIcon className="size-4" />
					</IconButton>
				)}
				<div className="flex-1" />
				{settings.features.activity && (
					<IconButton variant="bare" size="sm" onClick={handleActivity} aria-label="View activity">
						<HistoryIcon className="size-4" />
					</IconButton>
				)}
				<IconButton variant="bare" size="sm" onClick={handleSettings} aria-label="Open settings">
					<SettingsIcon className="size-4" />
				</IconButton>
			</WindowHeader>

			{/* Top section: Overview + Cat */}
			<div className="flex shrink-0" style={{ height: topSection.height }}>
				<div className="border-base-200 w-1/2 border-r">
					<OverviewCard className="size-full" />
				</div>
				<div className="relative z-30 w-1/2 overflow-visible">
					<Cat
						ref={catRef}
						face={settings.cat.equippedFace}
						hat={settings.cat.equippedHat}
						size={topSection.width}
						className="absolute right-0 bottom-0"
						onTap={handleCatTap}
					/>
					<IconButton
						variant="bare"
						size="sm"
						className="absolute top-1 right-1 z-40"
						onClick={handleRandomize}
					>
						<ShuffleIcon className="size-3" />
					</IconButton>
				</div>
			</div>

			{/* Timer */}
			<TimerView cx={timerViewCx} className="flex-1" />
		</div>
	);
}
