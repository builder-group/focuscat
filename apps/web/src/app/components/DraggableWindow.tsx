import { ChevronsLeftRightIcon, ChevronsRightLeftIcon, cn, MinusIcon, XIcon } from '@repo/ui';
import { useCompute, useListener } from 'feature-react/state';
import { AnimatePresence, motion } from 'motion/react';
import React from 'react';
import {
	isAbsolutePosition,
	isWindowVisible,
	type TAbsolutePosition,
	type TBounds,
	type TPosition,
	type TWindow,
	type TWindowId,
	type WindowCx
} from '@/features/window';

export const DraggableWindow: React.FC<TDraggableWindowProps> = (props) => {
	const {
		windowId,
		windowCx,
		transparent = false,
		dragThreshold,
		excludeFromDrag = 'button, a, input, select, textarea',
		onClose,
		onMinimize,
		onMaximize,
		children,
		className
	} = props;
	const $window = windowCx.windows[windowId];

	const isVisible = useCompute($window, (value) => isWindowVisible(value));
	const trafficLights = useCompute($window, (value) => value.trafficLights);
	const isMaximized = useCompute($window, (value) => value.boundsBeforeMaximize != null);
	const canToggleMaximize = useCompute(
		[$window, windowCx.$containerRect],
		([window, container]) => {
			const bounds = window.boundsBeforeMaximize;
			if (bounds == null) {
				return true;
			}
			return bounds.size.width <= container.width && bounds.size.height <= container.height;
		}
	);
	const isFocused = useCompute(windowCx.$focusedId, (focusedId) => focusedId === windowId, [
		windowId
	]);

	const windowRef = React.useRef<HTMLDivElement>(null);
	const layoutRef = React.useRef<Pick<TWindow, 'bounds' | 'zIndex'> | null>(null);
	const isDragging = React.useRef(false);
	const pendingDragCleanup = React.useRef<(() => void) | null>(null);
	const dragStart = React.useRef({ pointerX: 0, pointerY: 0, windowX: 0, windowY: 0 });

	// MARK: - Actions

	const applyPosition = React.useCallback((el: HTMLElement, position: TPosition): void => {
		el.style.right = '';
		el.style.bottom = '';
		el.style.transform = '';
		if (isAbsolutePosition(position)) {
			el.style.left = `${position.x}px`;
			el.style.top = `${position.y}px`;
			return;
		}
		// Anchor: use CSS so the browser handles layout and resize
		const ox = position.offset?.x ?? 0;
		const oy = position.offset?.y ?? 0;
		el.style.left = '';
		if (position.x === 'start') {
			el.style.left = `${ox}px`;
		} else if (position.x === 'end') {
			el.style.right = `${ox}px`;
		} else {
			el.style.left = '50%';
		}
		el.style.top = '';
		if (position.y === 'start') {
			el.style.top = `${oy}px`;
		} else if (position.y === 'end') {
			el.style.bottom = `${oy}px`;
		} else {
			el.style.top = '50%';
		}
		const tx = position.x === 'center' ? '-50%' : '0';
		const ty = position.y === 'center' ? '-50%' : '0';
		el.style.transform = tx !== '0' || ty !== '0' ? `translate(${tx}, ${ty})` : '';
	}, []);

	const getAbsolutePosition = React.useCallback(
		(
			position: TPosition | null,
			el: HTMLElement | null,
			containerEl: HTMLElement | null
		): TAbsolutePosition => {
			if (isAbsolutePosition(position)) {
				return { x: position.x, y: position.y };
			}
			if (el != null && containerEl != null) {
				const rect = el.getBoundingClientRect();
				const containerRect = containerEl.getBoundingClientRect();
				return {
					x: rect.left - containerRect.left,
					y: rect.top - containerRect.top
				};
			}
			return { x: 0, y: 0 };
		},
		[]
	);

	const applyLayout = React.useCallback(
		(el: HTMLElement, bounds: TBounds, zIndex: number) => {
			el.style.position = 'absolute';
			el.style.width = `${bounds.size.width}px`;
			el.style.height = `${bounds.size.height}px`;
			el.style.zIndex = String(zIndex);
			applyPosition(el, bounds.position);
		},
		[applyPosition]
	);

	const handleWindowPointerDown = React.useCallback(
		(e: React.PointerEvent<HTMLDivElement>) => {
			const target = e.target as HTMLElement;

			windowCx.bringToFront(windowId);

			// Ignore pointer events on non-draggable regions or form elements
			if (
				target.closest('[data-drag-region]') == null ||
				(excludeFromDrag !== '' && target.closest(excludeFromDrag) != null)
			) {
				return;
			}

			// Ignore pointer events on maximized windows
			if (isMaximized) {
				return;
			}

			const layout = layoutRef.current;
			const position = layout?.bounds?.position ?? null;
			const { x: windowX, y: windowY } = getAbsolutePosition(
				position,
				windowRef.current,
				windowCx.containerRef.current
			);

			dragStart.current = { pointerX: e.clientX, pointerY: e.clientY, windowX, windowY };

			if (dragThreshold != null) {
				const captureTarget = e.currentTarget;
				const pointerId = e.pointerId;

				let cleanup: () => void;

				const onMove = (ev: PointerEvent): void => {
					if (ev.pointerId !== pointerId) {
						return;
					}
					const dx = ev.clientX - dragStart.current.pointerX;
					const dy = ev.clientY - dragStart.current.pointerY;
					if (Math.sqrt(dx * dx + dy * dy) >= dragThreshold) {
						isDragging.current = true;
						captureTarget.setPointerCapture(pointerId);
						windowCx.startDrag(windowId);
						cleanup();
					}
				};

				const onUp = (ev: PointerEvent): void => {
					if (ev.pointerId !== pointerId) {
						return;
					}
					cleanup();
				};

				cleanup = (): void => {
					document.removeEventListener('pointermove', onMove);
					document.removeEventListener('pointerup', onUp);
					pendingDragCleanup.current = null;
				};

				// Use document listeners so threshold detection works even when cursor leaves the element
				document.addEventListener('pointermove', onMove);
				document.addEventListener('pointerup', onUp);
				pendingDragCleanup.current = cleanup;
			} else {
				isDragging.current = true;
				windowCx.startDrag(windowId);
				e.currentTarget.setPointerCapture(e.pointerId);
			}
		},
		[dragThreshold, excludeFromDrag, getAbsolutePosition, isMaximized, windowCx, windowId]
	);

	const handleWindowPointerMove = React.useCallback(
		(e: React.PointerEvent<HTMLDivElement>) => {
			if (!isDragging.current) {
				return;
			}

			const dx = e.clientX - dragStart.current.pointerX;
			const dy = e.clientY - dragStart.current.pointerY;
			windowCx.setPosition(
				windowId,
				dragStart.current.windowX + dx,
				dragStart.current.windowY + dy
			);
		},
		[windowCx, windowId]
	);

	const handleWindowPointerUp = React.useCallback(() => {
		if (isDragging.current) {
			windowCx.endDrag();
		}

		isDragging.current = false;
	}, [windowCx]);

	const handleClose = React.useCallback(
		(e: React.MouseEvent<HTMLButtonElement>) => {
			e.stopPropagation();
			windowCx.close(windowId);
			onClose?.();
		},
		[windowCx, windowId, onClose]
	);

	const handleMinimize = React.useCallback(
		(e: React.MouseEvent<HTMLButtonElement>) => {
			e.stopPropagation();
			windowCx.minimize(windowId);
			onMinimize?.();
		},
		[windowCx, windowId, onMinimize]
	);

	const handleMaximize = React.useCallback(
		(e: React.MouseEvent<HTMLButtonElement>) => {
			e.stopPropagation();
			windowCx.maximize(windowId);
			onMaximize?.();
		},
		[windowCx, windowId, onMaximize]
	);

	const setWindowRef = React.useCallback(
		(el: HTMLDivElement | null) => {
			windowRef.current = el;

			// Update layout as soon as the ref is set
			if (el != null) {
				const w = $window.get();
				applyLayout(el, w.bounds, w.zIndex);
				layoutRef.current = { bounds: w.bounds, zIndex: w.zIndex };
			}
		},
		[$window, applyLayout]
	);

	// MARK: - Effects

	React.useEffect(() => {
		return () => {
			pendingDragCleanup.current?.();
		};
	}, []);

	useListener($window, ({ value }) => {
		const el = windowRef.current;
		if (el != null) {
			applyLayout(el, value.bounds, value.zIndex);
		}
		layoutRef.current = { bounds: value.bounds, zIndex: value.zIndex };
	});

	// MARK: - UI

	return (
		<AnimatePresence>
			{isVisible && (
				<div ref={setWindowRef}>
					<motion.div
						className={cn(
							'h-full w-full overflow-hidden',
							transparent ? 'bg-transparent shadow-none' : 'shadow-2xl',
							!transparent && !isMaximized && 'rounded-2xl',
							className
						)}
						initial={{ opacity: 0, scale: 0.95 }}
						animate={{ opacity: 1, scale: 1 }}
						exit={{ opacity: 0, scale: 0.95 }}
						transition={{ duration: 0.15, ease: 'easeOut' }}
						onPointerDown={handleWindowPointerDown}
						onPointerMove={handleWindowPointerMove}
						onPointerUp={handleWindowPointerUp}
					>
						{/* Traffic lights */}
						{!transparent && (
							<div className="group absolute top-0 left-0 z-10 flex h-11 items-center gap-4 pl-3 sm:h-8 sm:gap-[10px] sm:pl-2">
								{/* Close */}
								{trafficLights.close ? (
									<button
										className={cn(
											'relative flex size-4.5 cursor-default items-center justify-center rounded-full ring-1 ring-black/20 group-hover:bg-[#FF5F57] sm:size-3.5',
											isFocused ? 'bg-[#FF5F57]' : 'bg-base-200'
										)}
										onClick={handleClose}
									>
										<XIcon
											strokeWidth={6}
											className={cn(
												'size-3 text-[#4c0000]/60 sm:hidden sm:size-2.5 sm:group-hover:block',
												isFocused ? 'max-sm:block' : 'max-sm:hidden'
											)}
										/>
									</button>
								) : (
									<div className="bg-base-200 size-4.5 rounded-full ring-1 ring-black/20 sm:size-3.5" />
								)}

								{/* Minimize */}
								{trafficLights.minimize && !isMaximized ? (
									<button
										className={cn(
											'relative flex size-4.5 cursor-default items-center justify-center rounded-full ring-1 ring-black/20 group-hover:bg-[#FFBD2E] sm:size-3.5',
											isFocused ? 'bg-[#FFBD2E]' : 'bg-base-200'
										)}
										onClick={handleMinimize}
									>
										<MinusIcon
											strokeWidth={6}
											className={cn(
												'size-3 text-[#5a3500]/60 sm:hidden sm:size-2.5 sm:group-hover:block',
												isFocused ? 'max-sm:block' : 'max-sm:hidden'
											)}
										/>
									</button>
								) : (
									<div className="bg-base-200 size-4.5 rounded-full ring-1 ring-black/20 sm:size-3.5" />
								)}

								{/* Maximize */}
								{trafficLights.maximize && canToggleMaximize ? (
									<button
										className={cn(
											'relative flex size-4.5 cursor-default items-center justify-center rounded-full ring-1 ring-black/20 group-hover:bg-[#28C840] sm:size-3.5',
											isFocused ? 'bg-[#28C840]' : 'bg-base-200'
										)}
										onClick={handleMaximize}
									>
										{isMaximized ? (
											<ChevronsRightLeftIcon
												strokeWidth={5}
												className={cn(
													'size-3 rotate-45 text-[#5a3500]/60 sm:hidden sm:size-2.5 sm:group-hover:block',
													isFocused ? 'max-sm:block' : 'max-sm:hidden'
												)}
											/>
										) : (
											<ChevronsLeftRightIcon
												strokeWidth={5}
												className={cn(
													'size-3 rotate-45 text-[#5a3500]/60 sm:hidden sm:size-2.5 sm:group-hover:block',
													isFocused ? 'max-sm:block' : 'max-sm:hidden'
												)}
											/>
										)}
									</button>
								) : (
									<div className="bg-base-200 size-4.5 rounded-full ring-1 ring-black/20 sm:size-3.5" />
								)}
							</div>
						)}

						{children}
					</motion.div>
				</div>
			)}
		</AnimatePresence>
	);
};

export interface TDraggableWindowProps {
	windowId: TWindowId;
	windowCx: WindowCx;
	transparent?: boolean;
	dragThreshold?: number;
	excludeFromDrag?: string;
	onClose?: () => void;
	onMinimize?: () => void;
	onMaximize?: () => void;
	children: React.ReactNode;
	className?: string;
}
