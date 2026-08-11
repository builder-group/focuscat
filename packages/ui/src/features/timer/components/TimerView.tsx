import { useCompute } from 'feature-react/state';
import React from 'react';
import { Badge } from '@/components';
import { cn } from '@/lib';
import { type TTimerViewCx } from '../TimerViewCx';
import { CountdownTimerActions, CountdownTimerDial } from './countdown';
import { PomodoroTimerActions, PomodoroTimerDial } from './pomodoro';
import { ProgressiveTimerActions, ProgressiveTimerDial } from './progressive';
import { TimeDisplay } from './TimeDisplay';

export const TimerView: React.FC<TTimerViewProps> = (props) => {
	const { cx, className, style } = props;
	const speed = useCompute(cx.$config, (value) => value.dev.speed);

	const renderDial = React.useCallback((): React.ReactNode => {
		switch (cx.timer.mode) {
			case 'countdown':
				return <CountdownTimerDial cx={cx} />;
			case 'pomodoro':
				return <PomodoroTimerDial cx={cx} />;
			case 'progressive':
				return <ProgressiveTimerDial cx={cx} />;
		}
	}, [cx]);

	const renderActions = React.useCallback((): React.ReactNode => {
		switch (cx.timer.mode) {
			case 'countdown':
				return <CountdownTimerActions cx={cx.timer} className="mt-auto" />;
			case 'pomodoro':
				return <PomodoroTimerActions cx={cx.timer} className="mt-auto" />;
			case 'progressive':
				return <ProgressiveTimerActions cx={cx.timer} className="mt-auto" />;
		}
	}, [cx]);

	return (
		<div className={cn('flex flex-col items-center pb-8', className)} style={style}>
			{renderDial()}

			<TimeDisplay cx={cx} className="mt-4" />

			{speed > 1 && (
				<Badge variant="warning" className="mt-1 font-mono">
					{speed}x
				</Badge>
			)}

			{renderActions()}
		</div>
	);
};

interface TTimerViewProps {
	cx: TTimerViewCx;
	className?: string;
	style?: React.CSSProperties;
}
