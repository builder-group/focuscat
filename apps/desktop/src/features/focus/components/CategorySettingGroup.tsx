import { Badge, ToggleGroup, type TBadgeProps } from '@repo/ui';
import { type TDirtyFeature, type TForm } from 'feature-form';
import { useFeatureState } from 'feature-react/state';
import React from 'react';
import { AppWebsiteSelect, type TSelectedItem } from '@/components';
import { specta } from '@/environment';
import { SettingGroup } from '@/features/settings';
import {
	type TCategoryFormEntry,
	type TCategoryMode,
	type TFocusProfileFormData
} from '../FocusProfileCx';

export const CategorySettingGroup: React.FC<TCategorySettingGroupProps> = (props) => {
	const {
		form,
		categories: displayCategories = [
			{
				value: 'focused',
				label: 'Focused',
				variant: 'success',
				description: 'Supports your focus'
			},
			{
				value: 'neutral',
				label: 'Neutral',
				variant: 'neutral',
				description: 'Neither helpful nor distracting'
			},
			{
				value: 'distracting',
				label: 'Distracting',
				variant: 'error',
				description: 'Breaks your focus'
			}
		]
	} = props;
	const categories = useFeatureState(form.fields.categories);
	const categoryModes = useFeatureState(form.fields.categoryModes);

	// MARK: - Actions

	const handleModeChange = React.useCallback(
		(cat: specta.FocusCategory, newMode: TCategoryMode) => {
			form.fields.categoryModes.set({ ...(categoryModes ?? {}), [cat]: newMode });

			let newEntries: TCategoryFormEntry[];
			switch (newMode) {
				case 'all':
					newEntries = [{ category: cat, target: { type: 'all' } }];
					break;
				case 'specific':
					newEntries = (categories ?? []).filter(
						(e) => e.category === cat && e.target.type !== 'all'
					);
					break;
				case 'none':
					newEntries = [];
					break;
			}
			form.fields.categories.set([
				...(categories ?? []).filter((e) => e.category !== cat),
				...newEntries
			]);
		},
		[categories, categoryModes, form.fields.categories, form.fields.categoryModes]
	);

	const handleItemsChange = React.useCallback(
		(cat: specta.FocusCategory, items: TSelectedItem[]) => {
			const newEntries: TCategoryFormEntry[] = items.map((item) => ({
				category: cat,
				target: selectedItemToTarget(item)
			}));
			// If an item already exists in another category, move it to this one.
			const newIds = new Set(items.map((item) => item.id));
			form.fields.categories.set([
				...(categories ?? []).filter(
					(e) => e.category !== cat && !newIds.has(getTargetId(e.target))
				),
				...newEntries
			]);
		},
		[categories, form.fields.categories]
	);

	// MARK: - UI

	return (
		<SettingGroup title="Apps & Websites">
			{displayCategories.map(({ value: cat, label, variant, description }) => {
				const mode: TCategoryMode = (categoryModes ?? {})[cat] ?? 'none';
				const nonAllTargets = (categories ?? [])
					.filter((e) => e.category === cat)
					.map((e) => e.target)
					.filter((t): t is Exclude<specta.FocusTargetDto, { type: 'all' }> => t.type !== 'all');
				const selectedItems = nonAllTargets.map(targetToSelectedItem);

				return (
					<div key={cat} className="flex flex-col gap-2 px-4 py-3">
						<div className="flex items-center justify-between gap-3">
							<div className="min-w-0">
								<Badge variant={variant}>{label}</Badge>
								<p className="text-base-500 mt-0.5 text-xs">{description}</p>
							</div>
							<ToggleGroup
								value={mode}
								onValueChange={(value) => handleModeChange(cat, value as TCategoryMode)}
								size="sm"
							>
								<ToggleGroup.Item value="none" className="w-auto px-3 text-xs font-medium">
									None
								</ToggleGroup.Item>
								<ToggleGroup.Item value="specific" className="w-auto px-3 text-xs font-medium">
									Specific
								</ToggleGroup.Item>
								<ToggleGroup.Item value="all" className="w-auto px-3 text-xs font-medium">
									All
								</ToggleGroup.Item>
							</ToggleGroup>
						</div>
						{mode === 'specific' && (
							<AppWebsiteSelect
								value={selectedItems}
								onChange={(items) => handleItemsChange(cat, items)}
								placeholder="Add apps or websites..."
								popupSide="top"
							/>
						)}
					</div>
				);
			})}
		</SettingGroup>
	);
};

interface TCategorySettingGroupProps {
	form: TForm<TFocusProfileFormData, [TDirtyFeature<TFocusProfileFormData>]>;
	categories?: {
		value: specta.FocusCategory;
		label: string;
		variant: TBadgeProps['variant'];
		description: string;
	}[];
}

function getTargetId(target: specta.FocusTargetDto): string {
	if (target.type === 'app') return target.bundle_id;
	if (target.type === 'website') return target.domain;
	return 'all';
}

function targetToSelectedItem(
	target: Exclude<specta.FocusTargetDto, { type: 'all' }>
): TSelectedItem {
	switch (target.type) {
		case 'app':
			return {
				id: target.bundle_id,
				type: 'app',
				bundleId: target.bundle_id,
				name: target.name ?? null,
				icon: target.icon ?? null,
				color: target.color ?? null
			};
		case 'website':
			return {
				id: target.domain,
				type: 'website',
				domain: target.domain,
				name: target.name ?? null,
				icon: target.icon ?? null,
				color: target.color ?? null
			};
	}
}

function selectedItemToTarget(item: TSelectedItem): specta.FocusTargetDto {
	switch (item.type) {
		case 'app':
			return {
				type: 'app',
				bundle_id: item.bundleId,
				name: item.name ?? null,
				icon: item.icon ?? null,
				color: item.color ?? null
			};
		case 'website':
			return {
				type: 'website',
				domain: item.domain,
				name: item.name ?? null,
				icon: item.icon ?? null,
				color: item.color ?? null
			};
	}
}
