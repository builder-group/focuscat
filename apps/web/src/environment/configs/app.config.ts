import * as v from 'valibot';
import { validateEnvVar } from 'validatenv';

const env = validateEnvVar({ NODE_ENV: import.meta.env.MODE }, 'NODE_ENV', {
	validator: v.picklist(['development', 'production', 'local', 'test']),
	defaultValue: 'development' as const
});

const packageVersion = validateEnvVar(
	{
		// @ts-expect-error -- https://vite.dev/guide/env-and-mode#env-variables
		PACKAGE_VERSION: import.meta.env.PACKAGE_VERSION
	},
	'PACKAGE_VERSION',
	{
		validator: v.string(),
		defaultValue: '0.0.0'
	}
);

export const appConfig = {
	env,
	packageVersion,
	version: `v${packageVersion}${env.slice(0, 1)}`,
	help: {
		discord: 'https://discord.com/invite/w4xE3bSjhQ',
		email: 'support@focuscat.app',
		githubIssues: 'https://github.com/builder-group/focuscat/issues',
		mailto: (subject: string) =>
			`mailto:${appConfig.help.email}?subject=${encodeURIComponent(`[PomodoroCat] ${subject}`)}`,
		legal: {
			privacy: 'https://focuscat.app/legal/privacy',
			terms: 'https://focuscat.app/legal/terms'
		}
	},
	distribution: {
		website:
			env === 'development' || env === 'local' ? 'http://localhost:3000' : 'https://focuscat.app',
		webApp:
			env === 'development' || env === 'local'
				? 'http://pomodorocat.localhost:3000'
				: 'https://pomodorocat.com',
		github: 'https://github.com/builder-group/focuscat',
		githubReleases: 'https://github.com/builder-group/focuscat/releases'
	},
	githubApi: 'https://api.github.com/repos/builder-group/focuscat'
} as const;
