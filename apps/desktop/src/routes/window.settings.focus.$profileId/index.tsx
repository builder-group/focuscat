import { Button, TrashIcon, useConfirmDialog } from '@repo/ui';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useForm } from 'feature-react/form';
import { useCompute, useFeatureState } from 'feature-react/state';
import React from 'react';
import { FocusProfileForm, useFocusProfileCx } from '@/features/focus';
import { SettingGroup, SettingItem } from '@/features/settings';
import {
	appendFlowReturnTargetParams,
	completeFocusSettingsReturn,
	parseFlowReturnSearch,
	toFlowReturnTarget,
	type TFlowReturnSearch
} from '@/lib';

export const Route = createFileRoute('/window/settings/focus/$profileId/')({
	validateSearch: (search: Record<string, unknown>): TFlowReturnSearch => ({
		...parseFlowReturnSearch(search)
	}),
	component: RouteComponent
});

function RouteComponent() {
	const { profileId } = Route.useParams();
	const returnTarget = toFlowReturnTarget(Route.useSearch());
	const navigate = useNavigate();
	const profileCx = useFocusProfileCx();
	const { form, handleSubmit } = useForm(profileCx.form);
	const isSubmitting = useFeatureState(profileCx.form.isSubmitting);
	const showInvalidState = useCompute(
		[profileCx.form.isSubmitted, profileCx.form.status] as const,
		([isSubmitted, status]) => isSubmitted && status.type === 'invalid',
		[]
	);
	const isDirty = useFeatureState(form.isDirty);

	const { trigger: triggerDelete, Dialog: DeleteDialog } = useConfirmDialog({
		title: 'Delete profile?',
		description:
			'This profile and all its category and schedule settings will be permanently deleted.',
		confirmLabel: 'Delete profile',
		onConfirm: async () => {
			const success = await profileCx.delete(Number(profileId));
			if (!success) {
				return;
			}
			if (returnTarget != null) {
				await completeFocusSettingsReturn(
					appendFlowReturnTargetParams(returnTarget, { refreshProfiles: 'true' })
				);
			} else {
				navigate({ to: '/window/settings/focus' });
			}
		}
	});

	// MARK: - Actions

	const handleCancel = React.useCallback(() => {
		if (returnTarget != null) {
			void completeFocusSettingsReturn(returnTarget);
			return;
		}
		navigate({ to: '/window/settings/focus' });
	}, [navigate, returnTarget]);

	const onSubmit = handleSubmit({
		onValidSubmit: async () => {
			const profile = await profileCx.save();
			if (profile == null) {
				return;
			}
			if (returnTarget != null) {
				await completeFocusSettingsReturn(
					appendFlowReturnTargetParams(returnTarget, { refreshProfiles: 'true' })
				);
			} else {
				navigate({ to: '/window/settings/focus' });
			}
		},
		onInvalidSubmit: () => {
			const errors = form.getErrors();
			const firstInvalidKey = (['name', 'color'] as const).find(
				(key) => errors.fields[key]?.length
			);
			if (firstInvalidKey != null) {
				document
					.querySelector(`[data-field="${firstInvalidKey}"]`)
					?.scrollIntoView({ behavior: 'smooth', block: 'center' });
			}
		}
	});

	// MARK: - Effects

	React.useEffect(() => {
		void profileCx.prepareEditForm(Number(profileId));
	}, [profileCx, profileId]);

	// MARK: - UI

	return (
		<form onSubmit={onSubmit} className="-m-6 flex h-[calc(100%+48px)] flex-col">
			<div className="flex-1 overflow-y-auto p-6">
				<div className="space-y-6">
					<h1 className="text-base-900 text-xl font-semibold">Edit Profile</h1>
					<FocusProfileForm />
					<SettingGroup title="Danger">
						<SettingItem
							variant="action"
							label="Delete Profile"
							description="Permanently delete this profile and all its settings"
							onClick={triggerDelete}
						>
							<TrashIcon className="text-base-400 size-4" />
						</SettingItem>
					</SettingGroup>
				</div>
			</div>

			<footer className="border-base-200 bg-base-50 flex shrink-0 justify-end gap-2 border-t px-6 py-3">
				<Button type="button" variant="ghost" onClick={handleCancel} disabled={isSubmitting}>
					Cancel
				</Button>
				<Button
					type="submit"
					variant={showInvalidState ? 'danger' : 'primary'}
					disabled={!isDirty || isSubmitting}
				>
					Save
				</Button>
			</footer>

			<DeleteDialog />
		</form>
	);
}
