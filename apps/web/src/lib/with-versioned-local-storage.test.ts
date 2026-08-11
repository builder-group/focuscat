import { createState, missingStorageValue } from 'feature-state';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	VersionedLocalStorageInterface,
	withVersionedLocalStorage,
	type TVersionedMigrationConfig
} from './with-versioned-local-storage';

const STORAGE_KEY = 'test-versioned-storage';

describe('VersionedLocalStorageInterface', () => {
	let storage: Record<string, string>;

	beforeEach(() => {
		storage = {};
		vi.stubGlobal('localStorage', {
			getItem: (key: string) => storage[key] ?? null,
			setItem: (key: string, value: string) => {
				storage[key] = value;
			},
			removeItem: (key: string) => {
				delete storage[key];
			}
		});
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	describe('load', () => {
		it('should return FAILED when key is missing', () => {
			const iface = new VersionedLocalStorageInterface<TTestValue>(createThreeVersionConfig());
			const result = iface.load(STORAGE_KEY);
			expect(result).toBe(missingStorageValue);
		});

		it('should return FAILED when stored value is invalid JSON', () => {
			localStorage.setItem(STORAGE_KEY, 'not json');
			const iface = new VersionedLocalStorageInterface<TTestValue>(createThreeVersionConfig());
			const result = iface.load(STORAGE_KEY);
			expect(result).toBe(missingStorageValue);
		});

		it('should return FAILED when stored value has no version', () => {
			localStorage.setItem(STORAGE_KEY, JSON.stringify({ addedInV002: 'x' }));
			const iface = new VersionedLocalStorageInterface<TTestValue>(createThreeVersionConfig());
			const result = iface.load(STORAGE_KEY);
			expect(result).toBe(missingStorageValue);
		});

		it('should return value when version equals latestVersion', () => {
			const value: TTestValue = {
				version: '0.0.3',
				addedInV002: 'a',
				addedInV003: 42
			};
			localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
			const iface = new VersionedLocalStorageInterface<TTestValue>(createThreeVersionConfig());
			const result = iface.load(STORAGE_KEY);
			expect(result).toEqual(value);
		});

		it('should run migrations in order from 0.0.1 to 0.0.3', () => {
			localStorage.setItem(
				STORAGE_KEY,
				JSON.stringify({ version: '0.0.1', removedInV002: 'legacy-value' })
			);
			const iface = new VersionedLocalStorageInterface<TTestValue>(createThreeVersionConfig());
			const result = iface.load(STORAGE_KEY);

			expect(result).toEqual({
				version: '0.0.3',
				addedInV002: 'legacy-value',
				addedInV003: 100
			});
		});

		it('should run only 0.0.2 → 0.0.3 when stored version is 0.0.2', () => {
			localStorage.setItem(
				STORAGE_KEY,
				JSON.stringify({ version: '0.0.2', addedInV002: 'from-v002' })
			);
			const iface = new VersionedLocalStorageInterface<TTestValue>(createThreeVersionConfig());
			const result = iface.load(STORAGE_KEY);

			expect(result).toEqual({
				version: '0.0.3',
				addedInV002: 'from-v002',
				addedInV003: 100
			});
		});

		it('should return FAILED when stored version has no migration', () => {
			localStorage.setItem(
				STORAGE_KEY,
				JSON.stringify({ version: '0.0.9', addedInV002: 'x', addedInV003: 1 })
			);
			const iface = new VersionedLocalStorageInterface<TTestValue>(createThreeVersionConfig());
			const result = iface.load(STORAGE_KEY);
			expect(result).toBe(missingStorageValue);
		});
	});

	describe('save', () => {
		it('should persist value so load returns it', () => {
			const value: TTestValue = {
				version: '0.0.3',
				addedInV002: 'saved',
				addedInV003: 1
			};
			const iface = new VersionedLocalStorageInterface<TTestValue>(createThreeVersionConfig());
			const saved = iface.save(STORAGE_KEY, value);
			expect(saved).toBe(true);
			const loaded = iface.load(STORAGE_KEY);
			expect(loaded).toEqual(value);
		});
	});

	describe('delete', () => {
		it('should remove key so load returns FAILED', () => {
			localStorage.setItem(
				STORAGE_KEY,
				JSON.stringify({
					version: '0.0.3',
					addedInV002: 'x',
					addedInV003: 1
				})
			);
			const iface = new VersionedLocalStorageInterface<TTestValue>(createThreeVersionConfig());
			const deleted = iface.delete(STORAGE_KEY);
			expect(deleted).toBe(true);
			const loaded = iface.load(STORAGE_KEY);
			expect(loaded).toBe(missingStorageValue);
		});
	});
});

describe('withVersionedLocalStorage', () => {
	let storage: Record<string, string>;

	beforeEach(() => {
		storage = {};
		vi.stubGlobal('localStorage', {
			getItem: (key: string) => storage[key] ?? null,
			setItem: (key: string, value: string) => {
				storage[key] = value;
			},
			removeItem: (key: string) => {
				delete storage[key];
			}
		});
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('should persist and load value after persist()', async () => {
		const initial: TTestValue = {
			version: '0.0.3',
			addedInV002: 'initial',
			addedInV003: 0
		};
		const config = createThreeVersionConfig({ latestVersion: '0.0.3', migrations: {} });
		const state = withVersionedLocalStorage(createState(initial), STORAGE_KEY, config);

		await state.persist();

		expect(state.get()).toEqual(initial);
		expect(JSON.parse(storage[STORAGE_KEY] as string)).toEqual(initial);
	});

	it('should load and apply full migration chain 0.0.1 → 0.0.3 from storage', async () => {
		localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify({ version: '0.0.1', removedInV002: 'stored-legacy' })
		);
		const initial: TTestValue = {
			version: '0.0.3',
			addedInV002: 'initial',
			addedInV003: 0
		};
		const state = withVersionedLocalStorage(
			createState(initial),
			STORAGE_KEY,
			createThreeVersionConfig()
		);

		await state.persist();

		expect(state.get()).toEqual({
			version: '0.0.3',
			addedInV002: 'stored-legacy',
			addedInV003: 100
		});
	});

	it('should keep initial state when storage has no version and re-persist', async () => {
		localStorage.setItem(STORAGE_KEY, JSON.stringify({ addedInV002: 'x', addedInV003: 99 }));
		const initial: TTestValue = {
			version: '0.0.3',
			addedInV002: 'initial',
			addedInV003: 0
		};
		const state = withVersionedLocalStorage(
			createState(initial),
			STORAGE_KEY,
			createThreeVersionConfig()
		);

		await state.persist();

		expect(state.get()).toEqual(initial);
		expect(JSON.parse(storage[STORAGE_KEY] as string)).toEqual(initial);
	});
});

function createThreeVersionConfig(
	overrides?: Partial<TVersionedMigrationConfig<TTestValue>>
): TVersionedMigrationConfig<TTestValue> {
	return {
		latestVersion: '0.0.3',
		migrations: {
			'0.0.1': {
				to: '0.0.2',
				migrate: (v: unknown) => {
					const x = v as { version: string; removedInV002?: string };
					return {
						version: '0.0.2' as const,
						addedInV002: x.removedInV002 ?? 'default-from-v001'
					};
				}
			},
			'0.0.2': {
				to: '0.0.3',
				migrate: (v: unknown) => {
					const x = v as { version: string; addedInV002: string };
					return {
						...x,
						version: '0.0.3' as const,
						addedInV003: 100
					};
				}
			}
		},
		...overrides
	};
}

interface TTestValue {
	version: '0.0.3';
	addedInV002: string;
	addedInV003: number;
}
