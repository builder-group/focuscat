import { cn } from '@repo/ui';
import { useCompute } from 'feature-react/state';
import React from 'react';
import { useWindowCx } from '@/features/window';
import { WindowHeader } from '../../components';
import { Sidebar } from './components';
import { AboutPanel, AppPanel, DeveloperPanel, GoalsPanel, TimerPanel } from './panels';
import type { TSettingsPanel } from './types';

export const SettingsWindow: React.FC = () => {
	const [activePanel, setActivePanel] = React.useState<TSettingsPanel>('app');
	const windowCx = useWindowCx();
	const isMobile = useCompute(windowCx.$breakpoint, (value) => value === 'sm');

	return (
		<div className="bg-base-0 flex h-full w-full flex-col">
			<WindowHeader title="Settings" />

			<div className={cn('flex flex-1 overflow-hidden', isMobile ? 'flex-col' : 'flex-row')}>
				<Sidebar activePanel={activePanel} onSelectPanel={setActivePanel} isMobile={isMobile} />

				<main className="bg-base-0 flex-1 overflow-y-auto p-6">
					{activePanel === 'app' && <AppPanel />}
					{activePanel === 'timer' && <TimerPanel />}
					{activePanel === 'goals' && <GoalsPanel />}
					{activePanel === 'about' && <AboutPanel />}
					{activePanel === 'developer' && <DeveloperPanel />}
				</main>
			</div>
		</div>
	);
};
