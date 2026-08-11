import { Select as BaseSelect } from '@base-ui/react/select';
import { cva, type VariantProps } from 'class-variance-authority';
import React from 'react';
import { cn } from '@/lib';

export const Select: React.FC<TSelectProps> = (props) => {
	const { items, placeholder, label, className, size, variant, ...rest } = props;

	const hasPreviewItems = React.useMemo(() => items.some((item) => item.preview != null), [items]);

	const renderSelectedValue = React.useCallback(
		(value: unknown) => {
			const item =
				typeof value === 'string'
					? items.find((candidate) => candidate.value === value)
					: undefined;

			if (item == null) {
				return placeholder != null ? <span className="text-base-400">{placeholder}</span> : null;
			}

			return (
				<>
					{item.preview}
					<span className="truncate">{item.label}</span>
				</>
			);
		},
		[items, placeholder]
	);

	return (
		<BaseSelect.Root items={items} {...rest}>
			{label && (
				<BaseSelect.Label className="text-base-700 mb-1 block cursor-default text-sm font-medium">
					{label}
				</BaseSelect.Label>
			)}
			<BaseSelect.Trigger className={cn(selectVariants({ variant, size }), className)}>
				{hasPreviewItems ? (
					<BaseSelect.Value className="flex min-w-0 items-center gap-2">
						{renderSelectedValue}
					</BaseSelect.Value>
				) : (
					<BaseSelect.Value className="data-placeholder:text-base-400" placeholder={placeholder} />
				)}
				<BaseSelect.Icon className="text-base-500 flex shrink-0">
					<ChevronUpDownIcon />
				</BaseSelect.Icon>
			</BaseSelect.Trigger>
			<BaseSelect.Portal>
				<BaseSelect.Positioner className="z-50 outline-none select-none" sideOffset={4}>
					<BaseSelect.Popup
						className={cn(
							'border-base-200 bg-base-50 min-w-(--anchor-width) rounded-md border py-1 shadow-md',
							'origin-(--transform-origin) transition-[transform,opacity] duration-100',
							'data-starting-style:scale-95 data-starting-style:opacity-0',
							'data-ending-style:scale-95 data-ending-style:opacity-0',
							'data-[side=none]:min-w-[calc(var(--anchor-width)+1rem)] data-[side=none]:transition-none',
							'data-[side=none]:data-starting-style:scale-100 data-[side=none]:data-starting-style:opacity-100'
						)}
					>
						<BaseSelect.ScrollUpArrow className="bg-base-50 text-base-500 flex h-4 w-full cursor-default items-center justify-center" />
						<BaseSelect.List className="relative max-h-(--available-height) scroll-py-1 overflow-y-auto">
							{items.map((item) => (
								<BaseSelect.Item
									key={item.value}
									value={item.value}
									className={cn(
										'text-base-900 grid cursor-default grid-cols-[0.75rem_1fr] items-center gap-2 px-2.5 py-2 text-sm outline-none select-none',
										'data-highlighted:bg-primary data-highlighted:text-primary-content',
										'data-disabled:cursor-not-allowed data-disabled:opacity-50'
									)}
								>
									<BaseSelect.ItemIndicator className="col-start-1 flex items-center justify-center">
										<CheckIcon />
									</BaseSelect.ItemIndicator>
									{item.preview != null ? (
										<div className="col-start-2 flex min-w-0 items-center gap-2">
											{item.preview}
											<BaseSelect.ItemText className="truncate">{item.label}</BaseSelect.ItemText>
										</div>
									) : (
										<BaseSelect.ItemText className="col-start-2">{item.label}</BaseSelect.ItemText>
									)}
								</BaseSelect.Item>
							))}
						</BaseSelect.List>
						<BaseSelect.ScrollDownArrow className="bg-base-50 text-base-500 flex h-4 w-full cursor-default items-center justify-center" />
					</BaseSelect.Popup>
				</BaseSelect.Positioner>
			</BaseSelect.Portal>
		</BaseSelect.Root>
	);
};

const selectVariants = cva(
	[
		'bg-base-50 text-base-900 inline-flex w-full items-center justify-between rounded-md border',
		'focus-visible:ring-primary focus-visible:-ring-offset-1 outline-none select-none focus-visible:ring-2',
		'disabled:cursor-not-allowed disabled:opacity-50',
		'data-popup-open:bg-base-100',
		'transition-colors duration-100'
	],
	{
		variants: {
			variant: {
				default: ['border-base-200', 'hover:bg-base-100', 'active:bg-base-200']
			},
			size: {
				sm: 'h-8 gap-1.5 px-2.5 text-sm',
				md: 'h-10 gap-2 px-3.5 text-sm',
				lg: 'h-12 gap-2 px-5 text-base'
			}
		},
		defaultVariants: {
			variant: 'default',
			size: 'md'
		}
	}
);

export interface TSelectProps
	extends
		Omit<React.ComponentProps<typeof BaseSelect.Root>, 'children' | 'items'>,
		VariantProps<typeof selectVariants> {
	items: SelectItem[];
	placeholder?: string;
	label?: string;
	className?: string;
}

export interface SelectItem {
	label: string;
	value: string;
	preview?: React.ReactNode;
}

const ChevronUpDownIcon = () => (
	<svg width="8" height="12" viewBox="0 0 8 12" fill="none" stroke="currentColor" strokeWidth="1.5">
		<path d="M0.5 4.5L4 1.5L7.5 4.5" />
		<path d="M0.5 7.5L4 10.5L7.5 7.5" />
	</svg>
);

const CheckIcon = () => (
	<svg fill="currentColor" width="10" height="10" viewBox="0 0 10 10">
		<path d="M9.1603 1.12218C9.50684 1.34873 9.60427 1.81354 9.37792 2.16038L5.13603 8.66012C5.01614 8.8438 4.82192 8.96576 4.60451 8.99384C4.3871 9.02194 4.1683 8.95335 4.00574 8.80615L1.24664 6.30769C0.939709 6.02975 0.916013 5.55541 1.19372 5.24822C1.47142 4.94102 1.94536 4.91731 2.2523 5.19524L4.36085 7.10461L8.12299 1.33999C8.34934 0.993152 8.81376 0.895638 9.1603 1.12218Z" />
	</svg>
);
