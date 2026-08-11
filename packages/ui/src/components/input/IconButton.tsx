import { Button as BaseButton } from '@base-ui/react/button';
import { cva, type VariantProps } from 'class-variance-authority';
import React from 'react';
import { cn } from '@/lib';

const iconButtonVariants = cva(
	[
		'inline-flex items-center justify-center rounded-md select-none',
		'focus-visible:ring-primary outline-none focus-visible:ring-2',
		'disabled:cursor-not-allowed disabled:opacity-50',
		'transition-colors duration-100'
	],
	{
		variants: {
			variant: {
				default: [
					'border-base-200 bg-base-50 text-base-600 border',
					'hover:bg-base-100 hover:text-base-900',
					'active:bg-base-200'
				],
				ghost: ['text-base-600', 'hover:bg-base-100 hover:text-base-900', 'active:bg-base-200'],
				bare: ['text-base-400', 'hover:text-base-600', 'active:text-base-900'],
				primary: [
					'border-primary bg-primary text-primary-content border',
					'hover:brightness-110',
					'active:brightness-90'
				]
			},
			size: {
				sm: 'size-8',
				md: 'size-10',
				lg: 'size-12'
			}
		},
		defaultVariants: {
			variant: 'default',
			size: 'md'
		}
	}
);

export const IconButton: React.FC<TIconButtonProps> = (props) => {
	const { variant, size, className, children, ...rest } = props;

	return (
		<BaseButton className={cn(iconButtonVariants({ variant, size }), className)} {...rest}>
			{children}
		</BaseButton>
	);
};

export interface TIconButtonProps
	extends React.ComponentProps<typeof BaseButton>, VariantProps<typeof iconButtonVariants> {}
