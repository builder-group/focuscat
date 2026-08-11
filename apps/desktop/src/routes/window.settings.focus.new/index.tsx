import { Button } from '@repo/ui';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useForm } from 'feature-react/form';
import { useCompute, useFeatureState } from 'feature-react/state';
import React from 'react';
import { FocusProfileForm, useFocusProfileCx } from '@/features/focus';
import {
	appendFlowReturnTargetParams,
	completeFocusSettingsReturn,
	parseFlowReturnSearch,
	toFlowReturnTarget,
	type TFlowReturnSearch
} from '@/lib';

export const Route = createFileRoute('/window/settings/focus/new/')({
	validateSearch: (search: Record<string, unknown>): TFlowReturnSearch => ({
		...parseFlowReturnSearch(search)
	}),
	component: RouteComponent
});

function RouteComponent() {
	const navigate = useNavigate();
	const returnTarget = toFlowReturnTarget(Route.useSearch());
	const profileCx = useFocusProfileCx();
	const { form, handleSubmit } = useForm(profileCx.form);
	const isSubmitting = useFeatureState(profileCx.form.isSubmitting);
	const showInvalidState = useCompute(
		[profileCx.form.isSubmitted, profileCx.form.status] as const,
		([isSubmitted, status]) => isSubmitted && status.type === 'invalid',
		[]
	);
	const isDirty = useFeatureState(form.isDirty);

	// MARK: - Actions

	const handleCancel = React.useCallback(() => {
		profileCx.prepareCreateForm();
		if (returnTarget != null) {
			void completeFocusSettingsReturn(returnTarget);
			return;
		}
		navigate({ to: '/window/settings/focus' });
	}, [navigate, profileCx, returnTarget]);

	const onSubmit = handleSubmit({
		onValidSubmit: async () => {
			const profile = await profileCx.save();
			if (profile == null) {
				return;
			}
			profileCx.prepareCreateForm();
			if (returnTarget != null) {
				void completeFocusSettingsReturn(
					appendFlowReturnTargetParams(returnTarget, {
						refreshProfiles: 'true',
						createdProfileId: String(profile.id)
					})
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
		profileCx.prepareCreateForm();
	}, [profileCx]);

	// MARK: - UI

	return (
		<form onSubmit={onSubmit} className="-m-6 flex h-[calc(100%+48px)] flex-col">
			<div className="flex-1 overflow-y-auto p-6">
				<div className="space-y-6">
					<h1 className="text-base-900 text-xl font-semibold">New Profile</h1>
					<FocusProfileForm />
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
					Create
				</Button>
			</footer>
		</form>
	);
}
