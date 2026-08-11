import { isWorkSession } from '@repo/ui';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useCompute } from 'feature-react/state';
import { ProgressivePomodoroTimerCx, SessionSetupScreen, useTimerCx } from '@/features/timer';
import {
	buildFlowReturnSearch,
	parseFlowReturnSearch,
	parseSearchBoolean,
	parseSearchNumber,
	toFlowReturnTarget,
	type TFlowReturnSearch
} from '@/lib';

export const Route = createFileRoute('/window/main/progressive/setup/')({
	validateSearch: (
		search: Record<string, unknown>
	): {
		advance: boolean;
		createdProfileId?: number;
		refreshProfiles?: boolean;
	} & TFlowReturnSearch => ({
		advance: parseSearchBoolean(search['advance']),
		createdProfileId: parseSearchNumber(search['createdProfileId']),
		refreshProfiles: parseSearchBoolean(search['refreshProfiles']),
		...parseFlowReturnSearch(search)
	}),
	component: RouteComponent
});

function RouteComponent() {
	const navigate = useNavigate();
	const timerCx = useTimerCx<ProgressivePomodoroTimerCx>();
	const search = Route.useSearch();
	const { advance, createdProfileId, refreshProfiles } = search;
	const returnTarget = toFlowReturnTarget(search);
	const upcomingFocusSessionType = useCompute(
		timerCx.$sessionType,
		(value) => (advance && isWorkSession(value) ? 'Break' : 'Focus'),
		[advance]
	);

	return (
		<SessionSetupScreen
			onStart={(input) => (advance ? timerCx.advance(input) : timerCx.start(input))}
			upcomingFocusSessionType={upcomingFocusSessionType}
			createdProfileId={createdProfileId}
			refreshProfiles={refreshProfiles}
			returnTarget={returnTarget}
			onRefreshHandled={() =>
				navigate({
					to: '/window/main/progressive/setup',
					search: { advance, ...buildFlowReturnSearch(returnTarget) }
				})
			}
		/>
	);
}
