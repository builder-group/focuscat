import { useCompute } from 'feature-react/state';
import React from 'react';
import { useSessionCx, type TSessionRow } from '@/features/session';
import { useWindowCx } from '@/features/window';
import { WindowHeader } from '../../components';
import { SessionDetail, SessionList } from './components';
import { activitySessionConfig } from './config';

export const ActivityWindow: React.FC = () => {
	const windowCx = useWindowCx();
	const sessionCx = useSessionCx();
	const isMobile = useCompute(windowCx.$breakpoint, (value) => value === 'sm');

	const [sessions, setSessions] = React.useState<TSessionRow[]>([]);
	const [loading, setLoading] = React.useState(true);
	const [selectedId, setSelectedId] = React.useState<number | null>(null);
	const [mobileView, setMobileView] = React.useState<'list' | 'detail'>('list');

	const selectedSession = React.useMemo(
		() => sessions.find((s) => s.id === selectedId) ?? null,
		[sessions, selectedId]
	);

	// MARK: - Actions

	const fetchSessions = React.useCallback(async () => {
		const { startedAfter, startedBefore } = activitySessionConfig.activitySessionTimeRange();
		const rows = await sessionCx.getSessions(
			startedAfter,
			startedBefore,
			activitySessionConfig.limit,
			activitySessionConfig.minDurationSecs
		);
		setSessions(rows);

		// Auto-select most recent session on desktop only (mobile shows list first)
		if (windowCx.$breakpoint.get() !== 'sm') {
			setSelectedId((prev) => prev ?? rows[0]?.id ?? null);
		}

		setLoading(false);
	}, [sessionCx, windowCx]);

	// MARK: - Effects

	React.useEffect(() => {
		fetchSessions();
	}, [fetchSessions]);

	React.useEffect(() => {
		const unregister = sessionCx.registerSessionComplete(fetchSessions);
		return () => unregister();
	}, [sessionCx, fetchSessions]);

	// MARK: - Actions

	const handleSelect = React.useCallback(
		(session: TSessionRow) => {
			setSelectedId(session.id);
			if (isMobile) {
				setMobileView('detail');
			}
		},
		[isMobile]
	);

	const handleBack = React.useCallback(() => {
		setMobileView('list');
		setSelectedId(null);
	}, []);

	// MARK: - UI

	if (loading) {
		return (
			<div className="bg-base-0 flex h-full items-center justify-center">
				<span className="text-base-400 text-sm">Loading…</span>
			</div>
		);
	}

	// Mobile: detail view
	if (isMobile && mobileView === 'detail' && selectedSession != null) {
		return (
			<div className="bg-base-0 flex h-full flex-col">
				<WindowHeader title="Activity" />
				<div className="flex-1 overflow-y-auto p-4">
					<SessionDetail session={selectedSession} onBack={handleBack} />
				</div>
			</div>
		);
	}

	// Mobile: list view (or empty)
	if (isMobile) {
		return (
			<div className="bg-base-0 flex h-full flex-col">
				<WindowHeader title="Activity" />
				{!sessions.length ? (
					<EmptyState />
				) : (
					<SessionList sessions={sessions} selectedId={selectedId} onSelect={handleSelect} />
				)}
			</div>
		);
	}

	// Desktop: sidebar + detail split
	return (
		<div className="bg-base-0 flex h-full flex-col">
			<WindowHeader title="Activity" />
			<div className="flex flex-1 overflow-hidden">
				{!sessions.length ? (
					<EmptyState />
				) : (
					<>
						<SessionList
							sessions={sessions}
							selectedId={selectedId}
							onSelect={handleSelect}
							className="border-base-200 w-56 shrink-0 border-r"
						/>
						<main className="bg-base-0 flex-1 overflow-y-auto p-4">
							{selectedSession != null ? (
								<SessionDetail session={selectedSession} />
							) : (
								<div className="text-base-400 flex h-full items-center justify-center text-sm">
									Select a session
								</div>
							)}
						</main>
					</>
				)}
			</div>
		</div>
	);
};

// MARK: - Empty State

const EmptyState: React.FC = () => (
	<div className="flex flex-1 items-center justify-center">
		<div className="text-center">
			<p className="text-base-600 text-sm font-medium">No sessions yet</p>
			<p className="text-base-400 mt-1 text-xs">Complete a focus session to see it here</p>
		</div>
	</div>
);
