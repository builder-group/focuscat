import { cn, Input, Switch, ToggleGroup } from '@repo/ui';
import { type TDirtyFeature, type TForm } from 'feature-form';
import { useCompute, useFeatureState } from 'feature-react/state';
import React from 'react';
import { type specta } from '@/environment';
import { SettingGroup, SettingItem } from '@/features/settings';
import { type TFocusProfileFormData } from '../FocusProfileCx';

export const ActivationSettingGroup: React.FC<TActivationSettingGroupProps> = (props) => {
	const { form, dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] } = props;

	const activationEnabled = useCompute(form.fields.activationEnabled, (value) => value ?? false);
	const activationMode = useFeatureState(form.fields.activationMode);
	const sessionTypeEnabled = useCompute(form.fields.sessionTypeEnabled, (value) => value ?? false);
	const sessionTypes = useFeatureState(form.fields.sessionTypes);
	const scheduleEnabled = useCompute(form.fields.scheduleEnabled, (value) => value ?? false);
	const scheduleDays = useFeatureState(form.fields.scheduleDays);
	const scheduleStartTime = useFeatureState(form.fields.scheduleStartTime);
	const scheduleEndTime = useFeatureState(form.fields.scheduleEndTime);

	// MARK: - Actions

	const handleSessionTypeToggle = React.useCallback(
		(type: specta.FocusSessionType) => {
			const current = form.fields.sessionTypes.get() ?? [];
			const next = current.includes(type) ? current.filter((t) => t !== type) : [...current, type];
			form.fields.sessionTypes.set(next);
		},
		[form.fields.sessionTypes]
	);

	const handleDayToggle = React.useCallback(
		(day: number) => {
			const current = form.fields.scheduleDays.get() ?? [];
			const next = current.includes(day)
				? current.filter((d) => d !== day)
				: [...current, day].sort((a, b) => a - b);
			form.fields.scheduleDays.set(next);
		},
		[form.fields.scheduleDays]
	);

	// MARK: - UI

	return (
		<SettingGroup title="Auto Activation">
			<SettingItem label="Enable" description="Automatically activate this profile">
				<Switch
					checked={activationEnabled}
					onCheckedChange={(checked) => form.fields.activationEnabled.set(checked)}
					size="sm"
				/>
			</SettingItem>

			{activationEnabled && (
				<>
					<SettingItem
						label="Mode"
						description={
							activationMode === 'always_on'
								? 'Active automatically, no session needed'
								: 'Suggested when starting a session'
						}
					>
						<ToggleGroup
							value={activationMode}
							onValueChange={(value) =>
								form.fields.activationMode.set(value as specta.ActivationMode)
							}
							size="sm"
						>
							<ToggleGroup.Item value="always_on" className="w-auto px-3 text-xs font-medium">
								Always On
							</ToggleGroup.Item>
							<ToggleGroup.Item value="pre_selected" className="w-auto px-3 text-xs font-medium">
								Pre-selected
							</ToggleGroup.Item>
						</ToggleGroup>
					</SettingItem>

					<SettingItem label="Session Type" description="Limit to focus, breaks, or both">
						<Switch
							checked={sessionTypeEnabled}
							onCheckedChange={(checked) => form.fields.sessionTypeEnabled.set(checked)}
							size="sm"
						/>
					</SettingItem>
					{sessionTypeEnabled && (
						<SettingItem label="Type">
							<div className="flex gap-1">
								{(['Focus', 'Break'] as specta.FocusSessionType[]).map((type) => (
									<button
										key={type}
										type="button"
										onClick={() => handleSessionTypeToggle(type)}
										className={cn(
											'flex h-7 items-center justify-center rounded-full px-3 text-xs font-medium transition-colors',
											(sessionTypes ?? []).includes(type)
												? 'bg-primary text-white'
												: 'bg-base-100 text-base-500 hover:bg-base-200'
										)}
									>
										{type}
									</button>
								))}
							</div>
						</SettingItem>
					)}

					<SettingItem label="Schedule" description="Limit to certain days and times">
						<Switch
							checked={scheduleEnabled}
							onCheckedChange={(checked) => form.fields.scheduleEnabled.set(checked)}
							size="sm"
						/>
					</SettingItem>
					{scheduleEnabled && (
						<>
							<SettingItem label="Days">
								<div className="flex gap-1">
									{dayLabels.map((label, index) => (
										<button
											key={index}
											type="button"
											onClick={() => handleDayToggle(index)}
											className={cn(
												'flex size-7 items-center justify-center rounded-full text-xs font-medium transition-colors',
												(scheduleDays ?? []).includes(index)
													? 'bg-primary text-white'
													: 'bg-base-100 text-base-500 hover:bg-base-200'
											)}
										>
											{label}
										</button>
									))}
								</div>
							</SettingItem>
							<SettingItem label="Time">
								<div className="flex items-center gap-2">
									<Input
										type="time"
										value={scheduleStartTime}
										onChange={(e) => form.fields.scheduleStartTime.set(e.target.value)}
										size="sm"
										className="w-28"
									/>
									<span className="text-base-400 text-xs">-</span>
									<Input
										type="time"
										value={scheduleEndTime}
										onChange={(e) => form.fields.scheduleEndTime.set(e.target.value)}
										size="sm"
										className="w-28"
									/>
								</div>
							</SettingItem>
						</>
					)}
				</>
			)}
		</SettingGroup>
	);
};

interface TActivationSettingGroupProps {
	form: TForm<TFocusProfileFormData, [TDirtyFeature<TFocusProfileFormData>]>;
	dayLabels?: string[];
}
