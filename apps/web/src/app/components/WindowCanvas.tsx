import { useCompute } from 'feature-react/state';
import React from 'react';
import { TrashDropZone, type WindowCx } from '@/features/window';
import { ActivityWindow } from '../windows/activity';
import { CatWindow } from '../windows/cat';
import { DiscordWindow } from '../windows/discord';
import { GithubWindow } from '../windows/github';
import { MacosWindow } from '../windows/macos';
import { MainWindow } from '../windows/main';
import { SettingsWindow } from '../windows/settings';
import { SpotifyWindow } from '../windows/spotify';
import { DraggableWindow } from './DraggableWindow';

export const WindowCanvas: React.FC<TWindowCanvasProps> = (props) => {
	const { windowCx } = props;
	const showWidgets = useCompute(windowCx.$breakpoint, (value) => value !== 'sm');

	return (
		<>
			<DraggableWindow windowId="main" windowCx={windowCx}>
				<MainWindow
					onOpenSettings={() => {
						windowCx.open('settings');
						windowCx.close('main');
					}}
					onOpenActivity={() => {
						windowCx.open('activity');
						windowCx.close('main');
					}}
					onOpenCat={() => {
						windowCx.open('cat');
						windowCx.close('main');
					}}
				/>
			</DraggableWindow>

			<DraggableWindow
				windowId="settings"
				windowCx={windowCx}
				onClose={() => windowCx.open('main')}
			>
				<SettingsWindow />
			</DraggableWindow>

			<DraggableWindow
				windowId="activity"
				windowCx={windowCx}
				onClose={() => windowCx.open('main')}
			>
				<ActivityWindow />
			</DraggableWindow>

			<DraggableWindow windowId="cat" windowCx={windowCx} transparent>
				<CatWindow
					onExpand={() => {
						windowCx.open('main');
						windowCx.close('cat');
					}}
				/>
			</DraggableWindow>

			{showWidgets && (
				<>
					<DraggableWindow
						windowId="spotify"
						windowCx={windowCx}
						transparent
						className="active:cursor-grabbing"
					>
						<SpotifyWindow />
					</DraggableWindow>
					<DraggableWindow
						windowId="discord"
						windowCx={windowCx}
						transparent
						dragThreshold={8}
						excludeFromDrag=""
						className="active:cursor-grabbing"
					>
						<DiscordWindow />
					</DraggableWindow>
					<DraggableWindow
						windowId="macos"
						windowCx={windowCx}
						transparent
						dragThreshold={8}
						excludeFromDrag=""
						className="active:cursor-grabbing"
					>
						<MacosWindow />
					</DraggableWindow>
					<DraggableWindow
						windowId="github"
						windowCx={windowCx}
						transparent
						dragThreshold={8}
						excludeFromDrag=""
						className="active:cursor-grabbing"
					>
						<GithubWindow />
					</DraggableWindow>
				</>
			)}

			<TrashDropZone windowCx={windowCx} trashableIds={['spotify', 'discord', 'macos', 'github']} />
		</>
	);
};

export interface TWindowCanvasProps {
	windowCx: WindowCx;
}
