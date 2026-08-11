import { useTimerCx as useBaseTimerCx } from '@repo/ui';
import { CountdownTimerCx, PomodoroTimerCx, ProgressivePomodoroTimerCx } from './modes';

export function useTimerCx<
	GTimerCx extends CountdownTimerCx | PomodoroTimerCx | ProgressivePomodoroTimerCx =
		CountdownTimerCx | PomodoroTimerCx | ProgressivePomodoroTimerCx
>(): GTimerCx {
	return useBaseTimerCx();
}
