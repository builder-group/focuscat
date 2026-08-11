import { cn, TrashIcon } from '@repo/ui';
import { useCompute, useListener } from 'feature-react/state';
import { AnimatePresence, motion } from 'motion/react';
import React from 'react';
import { isAbsolutePosition, type TWindowId, type WindowCx } from '@/features/window';

export const TrashDropZone: React.FC<TTrashDropZoneProps> = (props) => {
	const { windowCx, trashableIds } = props;

	const trashRef = React.useRef<HTMLDivElement>(null);
	const [isOver, setIsOver] = React.useState(false);

	const { windowId, trashEnabled } = useCompute(
		windowCx.$draggingWindowId,
		(windowId) => ({
			windowId,
			trashEnabled: windowId != null && trashableIds.includes(windowId)
		}),
		[trashableIds],
		(a, b) => a.windowId === b.windowId && a.trashEnabled === b.trashEnabled
	);

	// MARK: - Actions

	const checkOverlap = React.useCallback(
		(id: TWindowId): boolean => {
			const trashEl = trashRef.current;
			const containerEl = windowCx.containerRef.current;
			if (trashEl == null || containerEl == null) {
				return false;
			}

			const w = windowCx.windows[id].get();
			if (!isAbsolutePosition(w.bounds.position)) {
				return false;
			}

			const containerRect = containerEl.getBoundingClientRect();
			const trashRect = trashEl.getBoundingClientRect();
			const wLeft = containerRect.left + w.bounds.position.x;
			const wTop = containerRect.top + w.bounds.position.y;

			return (
				wLeft < trashRect.right &&
				wLeft + w.bounds.size.width > trashRect.left &&
				wTop < trashRect.bottom &&
				wTop + w.bounds.size.height > trashRect.top
			);
		},
		[windowCx]
	);

	// MARK: - Effects

	// On drag end: close window if its final bounds overlap the trash zone
	useListener(windowCx.$draggingWindowId, ({ value: id, prevValue }) => {
		if (id == null && prevValue != null && trashableIds.includes(prevValue)) {
			if (checkOverlap(prevValue)) {
				windowCx.close(prevValue);
			}
			setIsOver(false);
		}
	});

	// While dragging a trashable window: recompute overlap on every position change
	useListener(trashEnabled && windowId != null ? windowCx.windows[windowId] : null, () => {
		setIsOver(checkOverlap(windowId!));
	});

	// MARK: - UI

	return (
		<AnimatePresence>
			{trashEnabled && (
				<motion.div
					className="absolute top-4 left-4 z-50"
					initial={{ scale: 0.7, opacity: 0 }}
					animate={{ scale: 1, opacity: 1 }}
					exit={{ scale: 0.7, opacity: 0 }}
					transition={{ duration: 0.2, ease: [0.34, 1.56, 0.64, 1] }}
				>
					<div
						ref={trashRef}
						className={cn(
							'flex h-14 w-14 items-center justify-center rounded-2xl border-2 backdrop-blur-sm transition-all duration-150',
							isOver
								? 'scale-110 border-red-500 bg-red-500/20 text-red-400'
								: 'border-white/25 bg-white/10 text-white/50'
						)}
					>
						<TrashIcon className="size-5" />
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	);
};

export interface TTrashDropZoneProps {
	windowCx: WindowCx;
	trashableIds: TWindowId[];
}
