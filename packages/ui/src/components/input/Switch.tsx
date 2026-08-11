import { Switch as BaseSwitch } from '@base-ui/react/switch';
import { cva, type VariantProps } from 'class-variance-authority';
import React from 'react';
import { cn } from '@/lib';

export const Switch: React.FC<TSwitchProps> = (props) => {
	const { checked, onCheckedChange, size = 'md', disabled = false, className } = props;

	return (
		<BaseSwitch.Root
			checked={checked}
			onCheckedChange={onCheckedChange}
			disabled={disabled}
			className={cn(switchRootVariants({ size }), className)}
		>
			<BaseSwitch.Thumb className={switchThumbVariants({ size })} />
		</BaseSwitch.Root>
	);
};

const switchRootVariants = cva(
	[
		'group relative flex cursor-pointer items-center rounded-full p-px',
		'bg-base-200 data-checked:bg-primary',
		'focus-visible:ring-primary outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
		'disabled:cursor-not-allowed disabled:opacity-50',
		'transition-colors duration-100'
	],
	{
		variants: {
			size: {
				sm: 'h-5 w-9',
				md: 'h-6 w-11',
				lg: 'h-7 w-12'
			}
		},
		defaultVariants: {
			size: 'md'
		}
	}
);

const switchThumbVariants = cva(
	[
		'aspect-square h-full rounded-full bg-white shadow transition-transform',
		'group-data-unchecked:translate-x-0'
	],
	{
		variants: {
			size: {
				sm: 'data-checked:translate-x-4',
				md: 'data-checked:translate-x-5',
				lg: 'data-checked:translate-x-5'
			}
		},
		defaultVariants: {
			size: 'md'
		}
	}
);

export interface TSwitchProps extends VariantProps<typeof switchRootVariants> {
	checked: boolean;
	onCheckedChange: (checked: boolean) => void;
	disabled?: boolean;
	className?: string;
}
