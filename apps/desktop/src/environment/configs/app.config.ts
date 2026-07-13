export const appConfig = {
	help: {
		discord: 'https://discord.com/invite/w4xE3bSjhQ',
		email: 'support@focuscat.app',
		githubIssues: 'https://github.com/builder-group/focuscat/issues',
		mailto: (subject: string) =>
			`mailto:${appConfig.help.email}?subject=${encodeURIComponent(`[FocusCat] ${subject}`)}`,
		legal: {
			privacy: 'https://focuscat.app/legal/privacy',
			terms: 'https://focuscat.app/legal/terms'
		}
	},
	distribution: {
		website: 'https://focuscat.app',
		github: 'https://github.com/builder-group/focuscat',
		docsAppStore: 'https://focuscat.app/help/app-store'
	}
} as const;
