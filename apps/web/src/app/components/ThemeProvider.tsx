import { useSubscriber } from 'feature-react/state';
import React from 'react';
import { useSettingsCx } from '@/features/settings';
import type { TTheme } from '@/features/settings/types';

export const ThemeProvider: React.FC<TThemeProviderProps> = (props) => {
	const { children } = props;
	const settingsCx = useSettingsCx();

	// MARK: - Actions

	const applyThemeClass = React.useCallback((theme: 'light' | 'dark') => {
		document.documentElement.classList.toggle('dark', theme === 'dark');
	}, []);

	const applyTheme = React.useCallback(
		(theme: TTheme) => {
			if (theme === 'auto') {
				const effective = window.matchMedia('(prefers-color-scheme: dark)').matches
					? 'dark'
					: 'light';
				applyThemeClass(effective);
			} else {
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
		const mql = window.matchMedia('(prefers-color-scheme: dark)');
		const handleChange = () => {
			const currentTheme = settingsCx.$appSettings.get().appearance.theme;
			if (currentTheme === 'auto') {
				const effective = mql.matches ? 'dark' : 'light';
				applyThemeClass(effective);
			}
		};
		mql.addEventListener('change', handleChange);
		return () => mql.removeEventListener('change', handleChange);
	}, [settingsCx, applyThemeClass]);

	// MARK: - UI

	return <>{children}</>;
};

interface TThemeProviderProps {
	children: React.ReactNode;
}
