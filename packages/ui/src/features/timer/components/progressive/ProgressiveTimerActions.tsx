import { useCompute } from 'feature-react/state';
import React from 'react';
import { cn } from '@/lib';
import { type TProgressivePomodoroCx } from '../../modes';
import { isBreakSession } from '../../session-category';
import { getProgressiveTimerActionSlots } from '../timer-action-slots';
import { TimerActionSlotsView } from '../TimerActionSlotsView';

export const ProgressiveTimerActions: React.FC<TProps> = (props) => {
	const { cx, className } = props;

	const { status, isBreak, isOvertime } = useCompute(
		[cx.$status, cx.$sessionType, cx.$overtimeSeconds] as const,
		([status = 'idle', sessionType = 'progressive:work', overtimeSeconds = 0]) => ({
			status,
			isBreak: isBreakSession(sessionType),
			isOvertime: overtimeSeconds > 0
		})
	);

	const actionSlots = React.useMemo(
		() => getProgressiveTimerActionSlots(cx, status, isBreak, isOvertime),
		[status, isBreak, isOvertime, cx]
	);

	return <TimerActionSlotsView slots={actionSlots} className={cn(className)} />;
};

interface TProps {
	cx: TProgressivePomodoroCx;
	className?: string;
}
