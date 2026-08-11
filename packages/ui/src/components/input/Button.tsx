import { Button as BaseButton } from '@base-ui/react/button';
import { cva, type VariantProps } from 'class-variance-authority';
import React from 'react';
import { cn } from '@/lib';

export const Button: React.FC<TButtonProps> = (props) => {
	const { variant, size, className, children, ...rest } = props;

	return (
		<BaseButton className={cn(buttonVariants({ variant, size }), className)} {...rest}>
			{children}
		</BaseButton>
	);
};

const buttonVariants = cva(
	[
		'inline-flex items-center justify-center rounded-md font-medium select-none',
		'focus-visible:ring-primary outline-none focus-visible:ring-2',
		'disabled:cursor-not-allowed disabled:opacity-50',
		'transition-colors duration-100'
	],
	{
		variants: {
			variant: {
				default: [
					'border-base-200 bg-base-50 text-base-900 border',
					'hover:bg-base-100',
					'active:bg-base-200'
				],
				primary: [
					'border-primary bg-primary text-primary-content border',
					'hover:brightness-110',
					'active:brightness-90'
				],
				danger: [
					'border-error/20 bg-error/10 text-error border',
					'hover:bg-error/20',
					'active:bg-error/30'
				],
				ghost: ['text-base-600', 'hover:bg-base-100 hover:text-base-900', 'active:bg-base-200']
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

export interface TButtonProps
	extends React.ComponentProps<typeof BaseButton>, VariantProps<typeof buttonVariants> {}
