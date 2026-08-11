import {
	missingStorageValue,
	storageFeature,
	type TState,
	type TStorageFeature,
	type TStorageInterface
} from 'feature-state';

export function withVersionedLocalStorage<GValue extends { version: string }>(
	baseState: TState<GValue>,
	key: string,
	migrationConfig: TVersionedMigrationConfig<GValue>
): TState<GValue, [TStorageFeature]> {
	return baseState.with(storageFeature(new VersionedLocalStorageInterface(migrationConfig), key));
}

// MARK: - VersionedLocalStorageInterface

export class VersionedLocalStorageInterface<
	GValue extends { version: string }
> implements TStorageInterface<GValue> {
	private readonly _config: TVersionedMigrationConfig<GValue>;

	constructor(config: TVersionedMigrationConfig<GValue>) {
		this._config = config;
	}

	public save(key: string, value: GValue): boolean {
		localStorage.setItem(key, JSON.stringify(value));
		return true;
	}

	public load(key: string): GValue | typeof missingStorageValue {
		const raw = localStorage.getItem(key);
		if (raw == null) {
			return missingStorageValue;
		}

		// Parse loaded storage item
		let value: unknown;
		try {
			value = JSON.parse(raw) as unknown;
		} catch {
			return missingStorageValue;
		}
		if (value == null || typeof value !== 'object') {
			return missingStorageValue;
		}

		// Try to extract version from parsed value
		const version = (value as { version?: string }).version ?? this._config.fallbackVersion;
		if (version == null) {
			return missingStorageValue;
		}
		let current = value as GValue;
		let currentVersion: string = version;

		// Run migration chain until we reach the latest version
		while (currentVersion !== this._config.latestVersion) {
			const migration = this._config.migrations[currentVersion];
			if (migration == null) {
				return missingStorageValue;
			}

			// Apply migration
			current = migration.migrate(current) as GValue;
			current.version = migration.to;

			// Save updated value
			this.save(key, current);

			currentVersion = migration.to;
		}

		return current as GValue;
	}

	public delete(key: string): boolean {
		localStorage.removeItem(key);
		return true;
	}
}

export interface TVersionedMigrationConfig<GValue extends { version: string }> {
	latestVersion: GValue['version'];
	fallbackVersion?: string;
	migrations: Record<string, TVersionedMigration<unknown, unknown>>;
}

export interface TVersionedMigration<GFrom, GTo> {
	to: string;
	migrate: (value: GFrom) => GTo;
}
