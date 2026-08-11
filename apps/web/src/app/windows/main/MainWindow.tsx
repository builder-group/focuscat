import {
	Cat,
	catConfig,
	cn,
	HistoryIcon,
	IconButton,
	MinimizeIcon,
	SettingsIcon,
	ShuffleIcon,
	TimerView,
	type TCatFace,
	type TCatHat,
	type TCatRef
} from '@repo/ui';
import { useFeatureState, useListener } from 'feature-react/state';
import React from 'react';
import { OverviewCard, WindowHeader } from '@/app';
import { useAudioCx } from '@/features/audio';
import { useSettingsCx } from '@/features/settings';
import { CountdownTimerCx, PomodoroTimerCx, useTimerViewCx } from '@/features/timer';
import { SessionSetupView } from './SessionSetupView';

export const MainWindow: React.FC<TMainWindowProps> = (props) => {
	const { decorative = false, onOpenSettings, onOpenActivity, onOpenCat, className } = props;
	const catRef = React.useRef<TCatRef>(null);

	const settingsCx = useSettingsCx();
	const settings = useFeatureState(settingsCx.$appSettings);

	const timerViewCx = useTimerViewCx();
	const timerCx = timerViewCx.timer as CountdownTimerCx | PomodoroTimerCx;
	const timerStatus = useFeatureState(timerCx.$status);
	const sessionSetupRequested = useFeatureState(timerCx.$sessionSetupRequested);

	const audioCx = useAudioCx();

	// Top section (Stats + Cat): width is half of 300px window, height lets cat overflow into timer wheel
	const topSection = React.useMemo(() => {
		const width = 150;
		const scaledBodyOffset = catConfig.baseBodyBottomOffset * (width / catConfig.baseSize);
		const height = Math.round(width - scaledBodyOffset);
		return { width, height };
	}, []);

	// MARK: - Actions

	const handleRandomize = React.useCallback(() => {
		const faces = catConfig.parts.face.available;
		const hats: (TCatHat | null)[] = [...catConfig.parts.hat.available, null];
		const currentFace = settings.cat.equippedFace;
		const currentHat = settings.cat.equippedHat;

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
		audioCx.playSound('meow');
		return timerStatus === 'running' ? { mode: 'both' as const } : undefined;
	}, [audioCx, timerStatus]);

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

	if (sessionSetupRequested != null) {
		return <SessionSetupView timerCx={timerCx} />;
	}

	return (
		<div className={cn('bg-base-0 flex h-full flex-col', className)}>
			<WindowHeader decorative={decorative}>
				{settings.features.catWindow && onOpenCat != null ? (
					<IconButton
						variant="bare"
						size="sm"
						aria-label="Minimize to cat widget"
						onClick={onOpenCat}
					>
						<MinimizeIcon className={cn(decorative ? 'size-4' : 'size-5 sm:size-4')} />
					</IconButton>
				) : null}
				{onOpenActivity != null ? (
					<IconButton variant="bare" size="sm" aria-label="Open activity" onClick={onOpenActivity}>
						<HistoryIcon className={cn(decorative ? 'size-4' : 'size-5 sm:size-4')} />
					</IconButton>
				) : null}
				{onOpenSettings != null ? (
					<IconButton variant="bare" size="sm" aria-label="Open settings" onClick={onOpenSettings}>
						<SettingsIcon className={cn(decorative ? 'size-4' : 'size-5 sm:size-4')} />
					</IconButton>
				) : null}
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
						className="absolute top-2 right-2 z-40 sm:top-1 sm:right-1"
						onClick={handleRandomize}
					>
						<ShuffleIcon className={cn(decorative ? 'size-3' : 'size-4 sm:size-3')} />
					</IconButton>
				</div>
			</div>

			{/* Timer */}
			<TimerView cx={timerViewCx} className="flex-1" />
		</div>
	);
};

interface TMainWindowProps {
	decorative?: boolean;
	onOpenSettings?: () => void;
	onOpenActivity?: () => void;
	onOpenCat?: () => void;
	className?: string;
}
