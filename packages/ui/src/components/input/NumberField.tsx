import { NumberField as BaseNumberField } from '@base-ui/react/number-field';
import { cva, type VariantProps } from 'class-variance-authority';
import React from 'react';
import { cn } from '@/lib';
import { MinusIcon, PlusIcon } from '../display';

export const NumberField: React.FC<TNumberFieldProps> = (props) => {
	const { value, onChange, min, max, step = 1, disabled = false, size, className } = props;

	const iconSize = React.useMemo(() => {
		switch (size) {
			case 'sm':
				return 14;
			case 'lg':
				return 18;
			default:
				return 16;
		}
	}, [size]);

	return (
		<BaseNumberField.Root
			value={value}
			onValueChange={(val) => {
				if (val != null) {
					onChange(val);
				}
			}}
			min={min}
			max={max}
			step={step}
			disabled={disabled}
			className={className}
		>
			<BaseNumberField.Group className="flex">
				<BaseNumberField.Decrement
					className={cn(numberFieldButtonVariants({ size }), 'rounded-l-md')}
				>
					<MinusIcon size={iconSize} />
				</BaseNumberField.Decrement>
				<BaseNumberField.Input className={numberFieldInputVariants({ size })} />
				<BaseNumberField.Increment
					className={cn(numberFieldButtonVariants({ size }), 'rounded-r-md')}
				>
					<PlusIcon size={iconSize} />
				</BaseNumberField.Increment>
			</BaseNumberField.Group>
		</BaseNumberField.Root>
	);
};

const numberFieldButtonVariants = cva(
	[
		'border-base-200 flex items-center justify-center border select-none',
		'bg-base-50 text-base-600 transition-colors duration-100',
		'hover:bg-base-100 hover:text-base-900',
		'active:bg-base-200',
		'focus-visible:ring-primary outline-none focus-visible:z-10 focus-visible:ring-2',
		'disabled:cursor-not-allowed disabled:opacity-50'
	],
	{
		variants: {
			size: {
				sm: 'size-8',
				md: 'size-10',
				lg: 'size-12'
			}
		},
		defaultVariants: {
			size: 'md'
		}
	}
);

const numberFieldInputVariants = cva(
	[
		'border-base-200 border-y bg-transparent',
		'text-base-900 text-center font-mono tabular-nums',
		'focus:ring-primary focus:-ring-offset-1 outline-none focus:z-10 focus:ring-2'
	],
	{
		variants: {
			size: {
				sm: 'h-8 w-12 text-sm',
				md: 'h-10 w-14 text-sm',
				lg: 'h-12 w-16 text-base'
			}
		},
		defaultVariants: {
			size: 'md'
		}
	}
);

export interface TNumberFieldProps extends VariantProps<typeof numberFieldButtonVariants> {
	value: number;
	onChange: (value: number) => void;
	min?: number;
	max?: number;
	step?: number;
	disabled?: boolean;
	className?: string;
}
