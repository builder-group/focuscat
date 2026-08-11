import { useCompute } from 'feature-react/state';
import React from 'react';
import { cn } from '@/lib';
import { type TCountdownCx } from '../../modes';
import { getCountdownTimerActionSlots } from '../timer-action-slots';
import { TimerActionSlotsView } from '../TimerActionSlotsView';

export const CountdownTimerActions: React.FC<TProps> = (props) => {
	const { cx, className } = props;

	const { status, isOvertime } = useCompute(
		[cx.$status, cx.$overtimeSeconds] as const,
		([status = 'idle', overtimeSeconds = 0]) => ({
			status,
			isOvertime: overtimeSeconds > 0
		})
	);

	const actionSlots = React.useMemo(
		() => getCountdownTimerActionSlots(cx, status, isOvertime),
		[status, isOvertime, cx]
	);

	return <TimerActionSlotsView slots={actionSlots} className={cn(className)} />;
};

interface TProps {
	cx: TCountdownCx;
	className?: string;
}
