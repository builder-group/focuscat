import { useCompute } from 'feature-react/state';
import React from 'react';
import { cn } from '@/lib';
import { type TPomodoroCx } from '../../modes';
import { isBreakSession } from '../../session-category';
import { getPomodoroTimerActionSlots } from '../timer-action-slots';
import { TimerActionSlotsView } from '../TimerActionSlotsView';

export const PomodoroTimerActions: React.FC<TProps> = (props) => {
	const { cx, className } = props;

	const { status, isBreak, isOvertime } = useCompute(
		[cx.$status, cx.$sessionType, cx.$overtimeSeconds] as const,
		([status = 'idle', sessionType = 'pomodoro:work', overtimeSeconds = 0]) => ({
			status,
			isBreak: isBreakSession(sessionType),
			isOvertime: overtimeSeconds > 0
		})
	);

	const actionSlots = React.useMemo(
		() => getPomodoroTimerActionSlots(cx, status, isBreak, isOvertime),
		[status, isBreak, isOvertime, cx]
	);

	return <TimerActionSlotsView slots={actionSlots} className={cn(className)} />;
};

interface TProps {
	cx: TPomodoroCx;
	className?: string;
}
