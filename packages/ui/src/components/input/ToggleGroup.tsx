import { Toggle } from '@base-ui/react/toggle';
import { ToggleGroup as BaseToggleGroup } from '@base-ui/react/toggle-group';
import { cva, type VariantProps } from 'class-variance-authority';
import React from 'react';
import { cn } from '@/lib';

const ToggleGroupContext = React.createContext<{ size: TToggleGroupProps['size'] }>({ size: 'md' });

const ToggleGroupRoot: React.FC<TToggleGroupProps> = (props) => {
	const { value, onValueChange, size = 'md', className, children } = props;

	return (
		<ToggleGroupContext.Provider value={{ size }}>
			<BaseToggleGroup
				value={value != null ? [value] : []}
				onValueChange={(newValue) => {
					const selected = newValue[newValue.length - 1];
					if (selected != null) {
						onValueChange(selected);
					}
				}}
				className={cn(toggleGroupRootVariants({ size }), className)}
			>
				{children}
			</BaseToggleGroup>
		</ToggleGroupContext.Provider>
	);
};

const toggleGroupRootVariants = cva(['bg-base-100 ring-base-200 flex gap-0.5 rounded-md ring-1'], {
	variants: {
		size: {
			sm: 'p-0.5',
			md: 'p-0.5',
			lg: 'p-1'
		}
	},
	defaultVariants: {
		size: 'md'
	}
});

export interface TToggleGroupProps extends VariantProps<typeof toggleGroupRootVariants> {
	value: string | undefined;
	onValueChange: (value: string) => void;
	className?: string;
	children: React.ReactNode;
}

const ToggleGroupItem: React.FC<TToggleGroupItemProps> = (props) => {
	const { value, className, children, ...rest } = props;
	const { size } = React.useContext(ToggleGroupContext);

	return (
		<Toggle value={value} className={cn(toggleGroupItemVariants({ size }), className)} {...rest}>
			{children}
		</Toggle>
	);
};

const toggleGroupItemVariants = cva(
	[
		'flex items-center justify-center rounded select-none',
		'text-base-500 hover:text-base-700',
		'focus-visible:ring-primary outline-none focus-visible:ring-2',
		'data-pressed:bg-base-0 data-pressed:text-base-900 data-pressed:shadow-sm',
		'disabled:cursor-not-allowed disabled:opacity-50',
		'transition-colors duration-100'
	],
	{
		variants: {
			size: {
				sm: 'size-7',
				md: 'size-9',
				lg: 'size-10'
			}
		},
		defaultVariants: {
			size: 'md'
		}
	}
);

export interface TToggleGroupItemProps extends Omit<
	React.ComponentProps<typeof Toggle>,
	'className'
> {
	value: string;
	className?: string;
	children: React.ReactNode;
}

export const ToggleGroup = Object.assign(ToggleGroupRoot, {
	Item: ToggleGroupItem
});
