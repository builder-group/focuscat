import { useMemoCleanup } from '@repo/ui';
import { createForm, dirtyFeature, type TDirtyFeature, type TForm } from 'feature-form';
import { createState } from 'feature-state';
import React from 'react';
import * as v from 'valibot';
import { specta } from '@/environment';
import { toTuple } from '@/lib';

export type TCategoryMode = 'none' | 'specific' | 'all';

export class FocusProfileCx {
	public readonly $profiles = createState<specta.FocusProfileDto[]>([]);
	public readonly $activeProfileIds = createState<Set<number>>(new Set());
	public readonly $editingId = createState<number | null>(null);
	public readonly form: TForm<TFocusProfileFormData, [TDirtyFeature<TFocusProfileFormData>]>;

	constructor() {
		this.form = createForm<TFocusProfileFormData>({
			fields: {
				name: {
					defaultValue: '',
					validator: v.pipe(
						v.string(),
						v.check((value) => value.trim().length >= 3, 'Name must be at least 3 characters'),
						v.check((value) => {
							const editingId = this.$editingId.get();
							return !this.$profiles
								.get()
								.some(
									(profile) =>
										profile.name.toLowerCase() === value.trim().toLowerCase() &&
										profile.id !== editingId
								);
						}, 'A profile with this name already exists')
					)
				},
				color: {
					defaultValue: null,
					validator: v.custom<string | null>((value) => value != null, 'Please select a color')
				},
				enabled: {
					defaultValue: true
				},
				categories: {
					defaultValue: []
				},
				categoryModes: {
					defaultValue: {}
				},
				// Activation: master toggle + mode
				activationEnabled: {
					defaultValue: false
				},
				activationMode: {
					defaultValue: 'always_on' as specta.ActivationMode
				},
				// Session type restriction (optional, independent of schedule)
				sessionTypeEnabled: {
					defaultValue: false
				},
				sessionTypes: {
					defaultValue: [] as specta.FocusSessionType[]
				},
				// Time/day schedule restriction (optional, independent of session type)
				scheduleEnabled: {
					defaultValue: false
				},
				scheduleDays: {
					defaultValue: [0, 1, 2, 3, 4]
				},
				scheduleStartTime: {
					defaultValue: '09:00'
				},
				scheduleEndTime: {
					defaultValue: '17:00'
				}
			},
			validateOn: ['submit'],
			revalidateOn: ['blur', 'change'],
			collectErrorMode: 'firstError'
		}).with(dirtyFeature<TFocusProfileFormData>());
		void this.load();
	}

	public async load(): Promise<void> {
		const [areFocusProfilesOk, err, profiles] = toTuple(await specta.commands.getFocusProfiles());
		if (areFocusProfilesOk) {
			this.$profiles.set(profiles);
		} else {
			console.error('Failed to load focus profiles:', err);
		}

		const [areActiveProfilesOk, , activeProfiles] = toTuple(
			await specta.commands.getActiveFocusProfiles()
		);
		if (areActiveProfilesOk) {
			this.$activeProfileIds.set(new Set(activeProfiles.map((p) => p.id)));
		} else {
			console.error('Failed to load active focus profiles:');
		}
	}

	public prepareCreateForm(): void {
		this.$editingId.set(null);
		this.setInitialValues({
			name: '',
			color: null,
			enabled: true,
			categories: [],
			categoryModes: {},
			activationEnabled: false,
			activationMode: 'always_on',
			sessionTypeEnabled: false,
			sessionTypes: [],
			scheduleEnabled: false,
			scheduleDays: [0, 1, 2, 3, 4],
			scheduleStartTime: '09:00',
			scheduleEndTime: '17:00'
		});
		this.form.reset();
	}

	public async prepareEditForm(id: number): Promise<void> {
		const [isProfileOk, , profile] = toTuple(await specta.commands.getFocusProfile(id));
		if (!isProfileOk || profile == null) {
			return;
		}

		this.$editingId.set(id);
		this.setInitialValues(this.profileToFormData(profile));
		this.form.reset();
	}

	public async save(): Promise<specta.FocusProfileDto | null> {
		const data = this.form.getValidData();
		if (data == null) {
			return null;
		}

		const categories: specta.FocusProfileCategoryParams[] = data.categories.map((entry) => ({
			category: entry.category,
			target: entry.target
		}));
		const activations: specta.FocusProfileActivationParams[] = data.activationEnabled
			? [
					{
						mode: data.activationMode,
						sessionTypes:
							data.sessionTypeEnabled && data.sessionTypes.length > 0 ? data.sessionTypes : null,
						scheduleDays:
							data.scheduleEnabled && data.scheduleDays.length > 0 ? data.scheduleDays : null,
						scheduleStartTime: data.scheduleEnabled ? data.scheduleStartTime || null : null,
						scheduleEndTime: data.scheduleEnabled ? data.scheduleEndTime || null : null
					}
				]
			: [];

		const editingId = this.$editingId.get();
		if (editingId == null) {
			const [ok, err, profile] = toTuple(
				await specta.commands.createFocusProfile(
					data.name,
					data.color,
					data.enabled,
					categories,
					activations
				)
			);
			if (!ok) {
				console.error('Failed to create focus profile:', err);
				return null;
			}
			this.$profiles.set((prev) => [...prev, profile]);
			return profile;
		} else {
			const [ok, err, profile] = toTuple(
				await specta.commands.updateFocusProfile(
					editingId,
					data.name,
					data.color,
					data.enabled,
					categories,
					activations
				)
			);
			if (!ok) {
				console.error('Failed to update focus profile:', err);
				return null;
			}
			this.$profiles.set((prev) => prev.map((p) => (p.id === editingId ? profile : p)));
			return profile;
		}
	}

	public async delete(id: number): Promise<boolean> {
		const [ok, err] = toTuple(await specta.commands.deleteFocusProfile(id));
		if (ok) {
			this.$profiles.set((prev) => prev.filter((p) => p.id !== id));
			return true;
		}
		console.error('Failed to delete focus profile:', err);
		return false;
	}

	private setInitialValues(values: TFocusProfileFormData): void {
		for (const key of Object.keys(values) as (keyof TFocusProfileFormData)[]) {
			this.form.fields[key].defaultValue = values[key];
		}
	}

	private profileToFormData(profile: specta.FocusProfileDto): TFocusProfileFormData {
		const activation = profile.activations[0];
		const categoryModes: Partial<Record<specta.FocusCategory, TCategoryMode>> = {};
		for (const cat of ['focused', 'neutral', 'distracting'] as specta.FocusCategory[]) {
			const targets = profile.categories.filter((c) => c.category === cat).map((c) => c.target);
			if (targets.some((t) => t.type === 'all')) {
				categoryModes[cat] = 'all';
			} else if (targets.length > 0) {
				categoryModes[cat] = 'specific';
			} else {
				categoryModes[cat] = 'none';
			}
		}
		return {
			name: profile.name,
			color: profile.color ?? null,
			enabled: profile.enabled,
			categories: profile.categories.map((assignment) => ({
				category: assignment.category,
				target: assignment.target
			})),
			categoryModes,
			activationEnabled: profile.activations.length > 0,
			activationMode: activation?.mode ?? 'always_on',
			sessionTypeEnabled: (activation?.sessionTypes?.length ?? 0) > 0,
			sessionTypes: activation?.sessionTypes ?? [],
			scheduleEnabled: activation?.scheduleDays != null || activation?.scheduleStartTime != null,
			scheduleDays: activation?.scheduleDays ?? [0, 1, 2, 3, 4],
			scheduleStartTime: activation?.scheduleStartTime ?? '09:00',
			scheduleEndTime: activation?.scheduleEndTime ?? '17:00'
		};
	}
}

export interface TFocusProfileFormData {
	name: string;
	color: string | null;
	enabled: boolean;
	categories: TCategoryFormEntry[];
	categoryModes: Partial<Record<specta.FocusCategory, TCategoryMode>>;
	activationEnabled: boolean;
	activationMode: specta.ActivationMode;
	sessionTypeEnabled: boolean;
	sessionTypes: specta.FocusSessionType[];
	scheduleEnabled: boolean;
	scheduleDays: number[];
	scheduleStartTime: string;
	scheduleEndTime: string;
}

/// A single category assignment in the form: which category + which target.
export interface TCategoryFormEntry {
	category: specta.FocusCategory;
	target: specta.FocusTargetDto;
}

// MARK: - React Context

const ReactFocusProfileCx = React.createContext<FocusProfileCx | null>(null);

export const FocusProfileCxProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const cx = useMemoCleanup(() => {
		const focusProfileCx = new FocusProfileCx();
		return [focusProfileCx, () => {}];
	}, []);

	return <ReactFocusProfileCx.Provider value={cx}>{children}</ReactFocusProfileCx.Provider>;
};

export function useFocusProfileCx(): FocusProfileCx {
	const cx = React.useContext(ReactFocusProfileCx);
	if (cx == null) {
		throw new Error('useFocusProfileCx must be used within a FocusProfileCxProvider');
	}
	return cx;
}
