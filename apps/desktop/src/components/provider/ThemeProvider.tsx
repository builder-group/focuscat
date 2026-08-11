import { getCurrentWindow, type Theme as TauriTheme } from '@tauri-apps/api/window';
import { useSubscriber } from 'feature-react/state';
import React from 'react';
import { specta } from '@/environment';
import { useSettingsCx } from '@/features/settings';

export const ThemeProvider: React.FC<TThemeProviderProps> = (props) => {
	const { children } = props;
	const settingsCx = useSettingsCx();

	// MARK: - Actions

	const applyThemeClass = React.useCallback((theme: TauriTheme) => {
		document.documentElement.classList.toggle('dark', theme === 'dark');
		// Clear index.html inline background (interferes with transparency)
		document.documentElement.style.backgroundColor = '';
	}, []);

	const applyTheme = React.useCallback(
		async (theme: specta.Theme) => {
			// For index.html to apply theme before CSS loads (prevents flash)
			localStorage.setItem('theme', theme);

			if (theme === 'auto') {
				await getCurrentWindow().setTheme(null);
				const effectiveTheme = await getCurrentWindow().theme();
				applyThemeClass(effectiveTheme ?? 'light');
			} else {
				await getCurrentWindow().setTheme(theme);
				applyThemeClass(theme);
			}
		},
		[applyThemeClass]
	);

	// MARK: - Effects

	// Subscribe to theme setting (fires immediately + on changes)
	useSubscriber(settingsCx.$appSettings, ({ value }) => {
		applyTheme(value.appearance.theme);
	});

	// Listen for system theme changes (only matters when set to 'auto')
	React.useEffect(() => {
		const unlistenPromise = getCurrentWindow().onThemeChanged(({ payload }) => {
			const currentTheme = settingsCx.$appSettings.get().appearance.theme;
			if (currentTheme === 'auto') {
				applyThemeClass(payload);
			}
		});

		return () => {
			unlistenPromise.then((unlisten) => unlisten());
		};
	}, [settingsCx, applyThemeClass]);

	// MARK: - UI

	return <>{children}</>;
};

interface TThemeProviderProps {
	children: React.ReactNode;
}
