import { useCompute } from 'feature-react/state';
import { animate, motion, useMotionValue } from 'motion/react';
import React from 'react';
import { cn } from '@/lib';
import { isWorkSession } from '../session-category';
import { TTimerViewCx } from '../TimerViewCx';

export const SessionWheel: React.FC<TSessionWheelProps> = (props) => {
	const { cx, windowSize = 10, itemHeight = 28, className } = props;
	const sessionsBeforeLongBreak = useCompute(
		cx.$config,
		(value) => value.pomodoro.sessionsBeforeLongBreak
	);

	const y = useMotionValue(0);

	const { value, isRunning } = useCompute(
		[
			cx.timer.$status,
			cx.timer.$sessionType,
			cx.timer.$remainingSeconds,
			cx.timer.$totalSeconds,
			cx.timer.$sessionsCompleted
		] as const,
		([
			status = 'idle',
			sessionType = 'pomodoro:work',
			remainingSeconds = 0,
			totalSeconds = 0,
			sessionsCompleted = 0
		]) => {
			if (status === 'idle') {
				return { value: 0, isRunning: false };
			}
			const phaseProgress = totalSeconds > 0 ? (totalSeconds - remainingSeconds) / totalSeconds : 0;
			const value = isWorkSession(sessionType)
				? sessionsCompleted + phaseProgress * 0.5
				: sessionsCompleted - 0.5 + phaseProgress * 0.5;
			return { value, isRunning: status === 'running' };
		},
		[],
		(a, b) => a.value === b.value && a.isRunning === b.isRunning
	);

	// Only recalculate items when whole session number changes
	const sessionFloor = Math.floor(value);
	const items = React.useMemo(() => {
		const start = Math.max(0, sessionFloor - windowSize);
		const end = sessionFloor + windowSize;
		const result: number[] = [];
		for (let i = start; i <= end; i++) {
			result.push(i);
		}
		return result;
	}, [sessionFloor, windowSize]);

	// MARK: - Effects

	React.useEffect(() => {
		const targetY = value * itemHeight;
		if (isRunning) {
			// 1-second linear tween bridges consecutive 1Hz ticks for smooth continuous scroll
			animate(y, targetY, { duration: 1, ease: 'linear' });
		} else {
			animate(y, targetY, { type: 'spring', stiffness: 300, damping: 30 });
		}
	}, [value, y, itemHeight, isRunning]);

	// MARK: - UI

	return (
		<div className={cn('relative h-20 w-10 overflow-hidden select-none', className)}>
			<motion.div
				className="pointer-events-none absolute inset-x-0 top-1/2"
				style={{ y, marginTop: -itemHeight / 2 }}
			>
				{items.map((index) => (
					<SessionItem
						key={index}
						index={index}
						top={-index * itemHeight}
						height={itemHeight}
						showLongBreak={index > 0 && index % sessionsBeforeLongBreak === 0}
					/>
				))}
			</motion.div>
		</div>
	);
};

interface TSessionWheelProps {
	cx: TTimerViewCx;
	windowSize?: number;
	itemHeight?: number;
	className?: string;
}

const SessionItem: React.FC<TSessionItemProps> = (props) => {
	const { index, top, height, showLongBreak } = props;

	return (
		<div className="absolute inset-x-0 flex flex-col items-center" style={{ top, height }}>
			<span className="text-base-900 flex flex-1 items-center justify-center font-mono text-sm font-medium tabular-nums">
				{index + 1}
			</span>
			{index > 0 && (
				<div
					className={cn(
						'bg-base-300 mt-0.5 rounded-full',
						showLongBreak ? 'h-1 w-3' : 'h-0.5 w-1.5'
					)}
				/>
			)}
		</div>
	);
};

interface TSessionItemProps {
	index: number;
	top: number;
	height: number;
	showLongBreak: boolean;
}
