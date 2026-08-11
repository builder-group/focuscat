import { Input as BaseInput } from '@base-ui/react/input';
import { cva, type VariantProps } from 'class-variance-authority';
import React from 'react';
import { cn } from '@/lib';

export const Input = React.forwardRef<HTMLInputElement, TInputProps>((props, ref) => {
	const { variant, size, className, ...rest } = props;

	return (
		<BaseInput ref={ref} className={cn(inputVariants({ variant, size }), className)} {...rest} />
	);
});
Input.displayName = 'Input';

const inputVariants = cva(
	[
		'bg-base-50 text-base-900 w-full rounded-md border',
		'placeholder:text-base-400',
		'focus:ring-primary focus:-ring-offset-1 outline-none focus:ring-2',
		'disabled:cursor-not-allowed disabled:opacity-50',
		'transition-colors duration-100'
	],
	{
		variants: {
			variant: {
				default: 'border-base-200',
				error: 'border-error'
			},
			size: {
				sm: 'h-8 px-2.5 text-sm',
				md: 'h-10 px-3.5 text-base',
				lg: 'h-12 px-4 text-lg'
			}
		},
		defaultVariants: {
			variant: 'default',
			size: 'md'
		}
	}
);

export interface TInputProps
	extends
		Omit<React.ComponentProps<typeof BaseInput>, 'size'>,
		VariantProps<typeof inputVariants> {}
