import { Popover } from '@base-ui/react/popover';
import { cn } from '@repo/ui';
import { cva, type VariantProps } from 'class-variance-authority';
import React from 'react';

/** Root wrapper that manages popup open state via base-ui Popover */
const Root: React.FC<TMultiSelectRootProps> = (props) => {
	const { open, onOpenChange, children } = props;
	return (
		<Popover.Root open={open} onOpenChange={onOpenChange}>
			{children}
		</Popover.Root>
	);
};

export interface TMultiSelectRootProps {
	/** Whether the popup is open */
	open: boolean;
	/** Called when popup open state changes */
	onOpenChange?: (open: boolean) => void;
	children: React.ReactNode;
}

/**
 * Container that holds chips and input.
 * Renders as a div but acts as the Popover trigger.
 */
const Container = React.forwardRef<HTMLDivElement, TMultiSelectContainerProps>((props, ref) => {
	const { open, side, size, className, style, children, onClick } = props;

	return (
		<Popover.Trigger
			// Cast needed: Popover.Trigger types expect HTMLButtonElement, but we render div
			ref={ref as unknown as React.RefObject<HTMLButtonElement>}
			nativeButton={false}
			className={cn(
				containerVariants({ size }),
				open
					? cn(
							'ring-primary ring-2',
							// Popup below: round top, clip bottom ring, show bottom border
							'border-b-base-200 rounded-t-md [clip-path:inset(-2px_-2px_0_-2px)]',
							// Popup above: round bottom, clip top ring, show top border
							'data-[side=top]:rounded-t-none data-[side=top]:rounded-b-md',
							'data-[side=top]:border-t-base-200 data-[side=top]:border-b-transparent',
							'data-[side=top]:[clip-path:inset(0_-2px_-2px_-2px)]'
						)
					: 'ring-base-200 focus-within:ring-primary rounded-md ring-1 focus-within:ring-2',
				className
			)}
			style={style}
			render={<div />}
			onClick={onClick}
			data-side={side}
		>
			{children}
		</Popover.Trigger>
	);
});
Container.displayName = 'MultiSelect.Container';

const containerVariants = cva(
	[
		'flex flex-wrap content-start items-center gap-1.5',
		'bg-base-50 cursor-text overflow-hidden outline-none',
		// Placeholder border for consistent height
		'border-y border-transparent',
		'transition-colors duration-100'
	],
	{
		variants: {
			size: {
				sm: 'min-h-8 px-2 py-1',
				md: 'min-h-10 px-2.5 py-1.5',
				lg: 'min-h-12 px-3 py-2'
			}
		},
		defaultVariants: {
			size: 'md'
		}
	}
);

export interface TMultiSelectContainerProps extends VariantProps<typeof containerVariants> {
	/** Whether the popup is open (affects styling) */
	open?: boolean;
	/** Popup position relative to container (affects connected visual) */
	side?: 'top' | 'bottom';
	className?: string;
	style?: React.CSSProperties;
	children: React.ReactNode;
	onClick?: () => void;
}

/** Search input for filtering results */
const Input = React.forwardRef<HTMLInputElement, TMultiSelectInputProps>((props, ref) => {
	const { size, className, ...rest } = props;
	return (
		<input
			ref={ref}
			type="text"
			spellCheck={false}
			autoComplete="off"
			autoCorrect="off"
			autoCapitalize="off"
			className={cn(inputVariants({ size }), className)}
			{...rest}
		/>
	);
});
Input.displayName = 'MultiSelect.Input';

const inputVariants = cva(
	[
		'text-base-900 min-w-20 flex-1 border-none bg-transparent py-0.5',
		// Collapse when unfocused with selections: invisible but still focusable via JS
		'placeholder:text-base-400 shadow-none ring-0 outline-none',
		'data-collapsed:w-0 data-collapsed:min-w-0 data-collapsed:p-0',
		'data-collapsed:pointer-events-none data-collapsed:opacity-0'
	],
	{
		variants: {
			size: {
				sm: 'text-sm',
				md: 'text-sm',
				lg: 'text-base'
			}
		},
		defaultVariants: {
			size: 'md'
		}
	}
);

export interface TMultiSelectInputProps
	extends
		Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'>,
		VariantProps<typeof inputVariants> {}

/** Positions the popup relative to the container */
const Positioner: React.FC<TMultiSelectPositionerProps> = (props) => {
	const { children, side = 'bottom', sideOffset = 0, collisionPadding = 32 } = props;

	return (
		<Popover.Positioner
			side={side}
			sideOffset={sideOffset}
			collisionPadding={collisionPadding}
			// Fixed positioning is preferred for floating overlays. Unlike absolute, fixed
			// elements don't participate in document layout, preventing feedback loops where
			// popup resize (from --available-height) affects scroll/layout calculations.
			positionMethod="fixed"
		>
			{children}
		</Popover.Positioner>
	);
};

export interface TMultiSelectPositionerProps {
	children: React.ReactNode;
	side?: 'top' | 'bottom';
	/** Gap between container and popup (default: 0 for connected visual) */
	sideOffset?: number;
	/** Padding from viewport edges (default: 8) */
	collisionPadding?: number;
}

/** Popup container for search results */
const Popup = React.forwardRef<HTMLDivElement, TMultiSelectPopupProps>((props, ref) => {
	const { className, children } = props;

	return (
		<Popover.Popup
			ref={ref}
			className={cn(
				// --anchor-width and --available-height are CSS vars set by base-ui
				'max-h-[min(300px,var(--available-height,300px))] w-(--anchor-width)',
				'bg-base-50 ring-primary overflow-y-auto ring-2 outline-none',
				// group: enables group-data-[side=top] selectors for children (e.g., HelperText)
				'group flex flex-col rounded-b-md [clip-path:inset(0_-2px_-2px_-2px)]',
				// Popup above: reverse flex order so first item is visually at bottom (near input)
				'data-[side=top]:flex-col-reverse data-[side=top]:rounded-t-md data-[side=top]:rounded-b-none',
				'data-[side=top]:[clip-path:inset(-2px_-2px_0_-2px)]',
				className
			)}
			// data-popup: marker for blur handling (check if focus moved to popup)
			data-popup
			// initialFocus={false}: keep focus on input for continuous typing
			initialFocus={false}
		>
			{children}
		</Popover.Popup>
	);
});
Popup.displayName = 'MultiSelect.Popup';

export interface TMultiSelectPopupProps {
	className?: string;
	children: React.ReactNode;
}

/** Helper text shown at top/bottom of popup (e.g., "Searching..." or instructions) */
const HelperText: React.FC<TMultiSelectHelperTextProps> = (props) => {
	const { children, className } = props;

	return (
		<div
			className={cn(
				'border-base-200 text-base-500 border-b px-3 py-2 text-xs',
				'group-data-[side=top]:border-t group-data-[side=top]:border-b-0',
				className
			)}
		>
			{children}
		</div>
	);
};

export interface TMultiSelectHelperTextProps {
	children: React.ReactNode;
	className?: string;
}

/** Empty state shown when search returns no results */
const Empty: React.FC<TMultiSelectEmptyProps> = (props) => {
	const { children, className } = props;
	return <div className={cn('text-base-500 px-3 py-3 text-sm', className)}>{children}</div>;
};

export interface TMultiSelectEmptyProps {
	children: React.ReactNode;
	className?: string;
}

/**
 * Compound component for multi-select with async search.
 * Use with `useMultiSelect` hook for state management.
 *
 * @example
 * ```tsx
 * const cx = useMultiSelect({ value, onChange, onSearch });
 * const rootProps = cx.useRootProps();
 * const containerProps = cx.useContainerProps();
 * const inputProps = cx.useInputProps();
 *
 * <MultiSelect.Root {...rootProps}>
 *   <MultiSelect.Container {...containerProps}>
 *     <MultiSelect.Input {...inputProps} />
 *   </MultiSelect.Container>
 *   <MultiSelect.Portal>
 *     <MultiSelect.Positioner>
 *       <MultiSelect.Popup {...cx.getPopupProps()}>
 *         <MultiSelect.HelperText>Select an item</MultiSelect.HelperText>
 *         {results.map(item => <ResultItem />)}
 *       </MultiSelect.Popup>
 *     </MultiSelect.Positioner>
 *   </MultiSelect.Portal>
 * </MultiSelect.Root>
 * ```
 */
export const MultiSelect = {
	Root,
	Container,
	Input,
	Portal: Popover.Portal,
	Positioner,
	Popup,
	HelperText,
	Empty
};
