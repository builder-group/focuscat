import { Slider as BaseSlider } from '@base-ui/react/slider';
import { cva, type VariantProps } from 'class-variance-authority';
import React from 'react';
import { cn } from '@/lib';

const sliderControlVariants = cva(['flex w-full touch-none items-center select-none'], {
	variants: {
		size: {
			sm: 'py-1.5',
			md: 'py-2',
			lg: 'py-3'
		}
	},
	defaultVariants: {
		size: 'md'
	}
});

const sliderTrackVariants = cva(
	['bg-base-200 shadow-base-300 w-full rounded shadow-[inset_0_0_0_1px] select-none'],
	{
		variants: {
			size: {
				sm: 'h-1',
				md: 'h-1.5',
				lg: 'h-2'
			}
		},
		defaultVariants: {
			size: 'md'
		}
	}
);

const sliderThumbVariants = cva(
	[
		'rounded-full bg-white shadow select-none',
		'outline-base-300 outline',
		'has-focus-visible:outline-primary has-focus-visible:outline-2'
	],
	{
		variants: {
			size: {
				sm: 'size-2.5',
				md: 'size-3.5',
				lg: 'size-4'
			}
		},
		defaultVariants: {
			size: 'md'
		}
	}
);

export const Slider: React.FC<TSliderProps> = (props) => {
	const {
		value,
		defaultValue,
		onValueChange,
		min = 0,
		max = 100,
		step = 1,
		size = 'md',
		disabled = false,
		className,
		'aria-label': ariaLabel
	} = props;

	return (
		<BaseSlider.Root
			value={value}
			defaultValue={defaultValue}
			onValueChange={onValueChange}
			min={min}
			max={max}
			step={step}
			disabled={disabled}
		>
			<BaseSlider.Control className={cn(sliderControlVariants({ size }), className)}>
				<BaseSlider.Track className={sliderTrackVariants({ size })}>
					<BaseSlider.Indicator className="bg-primary rounded select-none" />
					<BaseSlider.Thumb aria-label={ariaLabel} className={sliderThumbVariants({ size })} />
				</BaseSlider.Track>
			</BaseSlider.Control>
		</BaseSlider.Root>
	);
};

export interface TSliderProps extends VariantProps<typeof sliderControlVariants> {
	'value'?: number;
	'defaultValue'?: number;
	'onValueChange'?: (value: number) => void;
	'min'?: number;
	'max'?: number;
	'step'?: number;
	'disabled'?: boolean;
	'className'?: string;
	'aria-label'?: string;
}
