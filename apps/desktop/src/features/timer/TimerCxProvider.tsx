import { TimerCxProvider as BaseTimerCxProvider, useMemoCleanup } from '@repo/ui';
import { useCompute } from 'feature-react/state';
import React from 'react';
import { useSettingsCx } from '@/features/settings';
import { CountdownTimerCx, PomodoroTimerCx, ProgressivePomodoroTimerCx } from './modes';

export const TimerCxProvider: React.FC<TTimerCxProviderProps> = (props) => {
	const { children, enableSideEffects = false, windowKind = 'main' } = props;
	const settingsCx = useSettingsCx();
	const timerMode = useCompute(settingsCx.$appSettings, (value) => value.timer.timerMode);

	const cx = useMemoCleanup(() => {
		let timerCx;
		if (timerMode === 'countdown') {
			timerCx = new CountdownTimerCx(settingsCx, enableSideEffects, windowKind);
		} else if (timerMode === 'progressive') {
			timerCx = new ProgressivePomodoroTimerCx(settingsCx, enableSideEffects, windowKind);
		} else {
			timerCx = new PomodoroTimerCx(settingsCx, enableSideEffects, windowKind);
		}
		return [timerCx, () => timerCx.unmount()];
	}, [timerMode, settingsCx, enableSideEffects, windowKind]);

	return <BaseTimerCxProvider value={cx}>{children}</BaseTimerCxProvider>;
};

interface TTimerCxProviderProps {
	children: React.ReactNode;
	enableSideEffects?: boolean;
	windowKind?: 'main' | 'cat' | 'settings';
}
