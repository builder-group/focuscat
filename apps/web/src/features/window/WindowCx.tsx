import { mq, useMediaQuery, useMemoCleanup } from '@repo/ui';
import { createState, TState } from 'feature-state';
import React from 'react';

export class WindowCx {
	private static readonly _windowConfig: Record<TWindowId, TWindowConfig> = {
		main: {
			id: 'main',
			trafficLights: { close: false, minimize: false, maximize: false },
			bounds: {
				size: { width: 300, height: 500 },
				position: { x: 'center', y: 'center' }
			},
			visibility: 'visible',
			zIndex: 11,
			boundsBeforeMaximize: null,
			canMaximize: true
		},
		settings: {
			id: 'settings',
			trafficLights: { close: true, minimize: false, maximize: true },
			bounds: {
				size: { width: 600, height: 450 },
				position: { x: 'center', y: 'center' }
			},
			visibility: 'closed',
			zIndex: 11,
			boundsBeforeMaximize: null,
			canMaximize: true
		},
		activity: {
			id: 'activity',
			trafficLights: { close: true, minimize: false, maximize: true },
			bounds: {
				size: { width: 600, height: 450 },
				position: { x: 'center', y: 'center' }
			},
			visibility: 'closed',
			zIndex: 11,
			boundsBeforeMaximize: null,
			canMaximize: true
		},
		cat: {
			id: 'cat',
			trafficLights: { close: false, minimize: false, maximize: false },
			bounds: {
				size: { width: 170, height: 170 },
				position: { x: 'center', y: 'center' }
			},
			visibility: 'closed',
			zIndex: 12,
			boundsBeforeMaximize: null,
			canMaximize: false
		},
		discord: {
			id: 'discord',
			trafficLights: { close: false, minimize: false, maximize: false },
			bounds: {
				size: { width: 172, height: 48 },
				position: { x: 'start', y: 'end', offset: { x: 8, y: 8 + 152 + 8 } }
			},
			visibility: 'visible',
			zIndex: 10,
			boundsBeforeMaximize: null,
			canMaximize: false
		},
		macos: {
			id: 'macos',
			trafficLights: { close: false, minimize: false, maximize: false },
			bounds: {
				size: { width: 48, height: 48 },
				position: { x: 'start', y: 'end', offset: { x: 8 + 172 + 8, y: 8 + 152 + 8 } }
			},
			visibility: 'visible',
			zIndex: 10,
			boundsBeforeMaximize: null,
			canMaximize: false
		},
		github: {
			id: 'github',
			trafficLights: { close: false, minimize: false, maximize: false },
			bounds: {
				size: { width: 48, height: 48 },
				position: { x: 'start', y: 'end', offset: { x: 8 + 172 + 8 + 48 + 8, y: 8 + 152 + 8 } }
			},
			visibility: 'visible',
			zIndex: 10,
			boundsBeforeMaximize: null,
			canMaximize: false
		},
		spotify: {
			id: 'spotify',
			trafficLights: { close: false, minimize: false, maximize: false },
			bounds: {
				size: { width: 352, height: 152 },
				position: { x: 'start', y: 'end', offset: { x: 8, y: 8 } }
			},
			visibility: 'visible',
			zIndex: 10,
			boundsBeforeMaximize: null,
			canMaximize: false
		}
	};

	public readonly $focusedId = createState<TWindowId | null>(null);
	public readonly $breakpoint = createState<TBreakpoint>('lg');
	public readonly $draggingWindowId = createState<TWindowId | null>(null);

	public readonly containerRef = React.createRef<HTMLDivElement>();
	public readonly $containerRect = createState<TContainerRect>({ width: 0, height: 0 });

	public readonly windows: Record<TWindowId, TState<TWindow, []>> = {} as Record<
		TWindowId,
		TState<TWindow, []>
	>;

	constructor() {
		for (const windowConfig of Object.values(WindowCx._windowConfig)) {
			const window = this._toWindowState(windowConfig);
			this.windows[windowConfig.id] = window;
			window.listen(({ value: w, prevValue: prev }) => {
				if (w.visibility === 'visible' && prev?.visibility !== 'visible') {
					this.$focusedId.set(w.id);
				}
			});
		}
	}

	public mount(): void {}

	public unmount(): void {}

	public open(id: TWindowId): void {
		this.windows[id].set((prev) => ({ ...prev, visibility: 'visible', zIndex: this._maxZ() + 1 }));
		this._autoMaximizeIfNeeded(id);
	}

	public close(id: TWindowId): void {
		this.windows[id].set((prev) => ({ ...prev, visibility: 'closed' }));
	}

	public minimize(id: TWindowId): void {
		this.close(id);
	}

	public maximize(id: TWindowId): void {
		const prev = this.windows[id].get();

		const bounds = prev.boundsBeforeMaximize;
		if (bounds != null) {
			const container = this.$containerRect.get();

			let position = bounds.position;
			if (isAbsolutePosition(position)) {
				const outOfBounds =
					position.x < 0 ||
					position.y < 0 ||
					position.x + bounds.size.width > container.width ||
					position.y + bounds.size.height > container.height;

				// If the saved position is out of bounds, center instead of using it
				if (outOfBounds) {
					position = {
						x: Math.max(0, (container.width - bounds.size.width) / 2),
						y: Math.max(0, (container.height - bounds.size.height) / 2)
					};
				}
			}

			this.windows[id].set((p) => ({
				...p,
				boundsBeforeMaximize: null,
				bounds: { ...bounds, position }
			}));

			return;
		}

		const el = this.containerRef.current;
		const rect = el != null ? el.getBoundingClientRect() : this.$containerRect.get();
		if (rect.width <= 0 || rect.height <= 0) {
			return;
		}

		this.windows[id].set((p) => ({
			...p,
			boundsBeforeMaximize: p.bounds,
			bounds: {
				size: { width: rect.width, height: rect.height },
				position: { x: 0, y: 0 }
			}
		}));
	}

	public bringToFront(id: TWindowId): void {
		const maxZ = this._maxZ();
		if (this.windows[id].get().zIndex < maxZ) {
			this.windows[id].set((prev) => ({ ...prev, zIndex: maxZ + 1 }));
		}
		this.$focusedId.set(id);
	}

	public clearFocus(): void {
		this.$focusedId.set(null);
	}

	public startDrag(id: TWindowId): void {
		this.$draggingWindowId.set(id);
	}

	public endDrag(): void {
		this.$draggingWindowId.set(null);
	}

	public setPosition(id: TWindowId, x: number, y: number): void {
		const position = this._clampPosition(
			{ x, y },
			this.windows[id].get().bounds.size,
			this.$containerRect.get()
		);
		this.windows[id].set((prev) => ({
			...prev,
			bounds: { ...prev.bounds, position }
		}));
	}

	public setContainerRect(width: number, height: number): void {
		this.$containerRect.set({ width, height });
		this._clampWindowPositions({ width, height });
		for (const id of Object.keys(this.windows) as TWindowId[]) {
			if (this.windows[id].get().visibility === 'visible') {
				this._autoMaximizeIfNeeded(id);
			}
		}
	}

	public setBreakpoint(breakpoint: TBreakpoint): void {
		const prev = this.$breakpoint.get();
		this.$breakpoint.set(breakpoint);

		if (prev !== 'sm' && breakpoint === 'sm') {
			// Entering narrow (sm): show maximize button for maximizable windows (no auto-fullscreen)
			for (const id of Object.keys(this.windows) as TWindowId[]) {
				if (!WindowCx._windowConfig[id].canMaximize) {
					continue;
				}
				this.windows[id].set((p) => ({
					...p,
					trafficLights: { ...p.trafficLights, maximize: true }
				}));
			}
		} else if (prev === 'sm' && breakpoint !== 'sm') {
			// Leaving narrow (sm): restore traffic lights and un-maximize any maximized windows
			for (const id of Object.keys(this.windows) as TWindowId[]) {
				const w = this.windows[id].get();
				this.windows[id].set((p) => ({
					...p,
					trafficLights: WindowCx._windowConfig[id].trafficLights
				}));
				if (w.boundsBeforeMaximize != null) {
					this.maximize(id); // toggles back since boundsBeforeMaximize is set
				}
			}
		}
	}

	private _autoMaximizeIfNeeded(id: TWindowId): void {
		if (!WindowCx._windowConfig[id].canMaximize) {
			return;
		}

		const w = this.windows[id].get();
		if (w.boundsBeforeMaximize != null) {
			return;
		}

		const container = this.$containerRect.get();
		if (container.width <= 0 || container.height <= 0) {
			return;
		}

		if (w.bounds.size.width > container.width || w.bounds.size.height > container.height) {
			this.maximize(id);
		}
	}

	private _clampPosition(
		position: TAbsolutePosition,
		size: TSize,
		container: TSize,
		padding = 8
	): TAbsolutePosition {
		const maxX = Math.max(padding, container.width - size.width - padding);
		const maxY = Math.max(padding, container.height - size.height - padding);
		return {
			x: Math.max(padding, Math.min(position.x, maxX)),
			y: Math.max(padding, Math.min(position.y, maxY))
		};
	}

	private _clampWindowPositions(container: TSize, padding = 8): void {
		for (const win of Object.values(this.windows)) {
			const w = win.get();
			if (!isAbsolutePosition(w.bounds.position)) {
				continue;
			}
			if (w.boundsBeforeMaximize != null) {
				continue;
			}
			const position = this._clampPosition(w.bounds.position, w.bounds.size, container, padding);
			if (position.x !== w.bounds.position.x || position.y !== w.bounds.position.y) {
				win.set((prev) => ({
					...prev,
					bounds: { ...prev.bounds, position }
				}));
			}
		}
	}

	private _maxZ(): number {
		return Math.max(...Object.values(this.windows).map((window) => window.get().zIndex));
	}

	private _toWindowState(config: TWindowConfig): TState<TWindow, []> {
		const { canMaximize, ...rest } = config;
		return createState<TWindow>(rest);
	}
}

export interface TContainerRect {
	width: number;
	height: number;
}

export type TBreakpoint = 'sm' | 'md' | 'lg';

export interface TWindow {
	id: TWindowId;
	trafficLights: {
		close: boolean;
		minimize: boolean;
		maximize: boolean;
	};
	bounds: TBounds;
	visibility: TWindowVisibility;
	zIndex: number;
	boundsBeforeMaximize: TBounds | null;
}

export interface TWindowConfig extends TWindow {
	canMaximize: boolean;
}

export type TWindowId =
	'main' | 'settings' | 'activity' | 'cat' | 'discord' | 'macos' | 'spotify' | 'github';
export type TWindowVisibility = 'visible' | 'minimized' | 'closed';

export interface TBounds {
	size: TSize;
	position: TPosition;
}

export interface TSize {
	width: number;
	height: number;
}

export type TPosition = TAbsolutePosition | TAnchorPosition;

export interface TAbsolutePosition {
	x: number;
	y: number;
}

export interface TAnchorPosition {
	x: TAnchor;
	y: TAnchor;
	offset?: { x: number; y: number };
}

export type TAnchor = 'start' | 'center' | 'end';

// MARK: - Helpers

export function isAbsolutePosition(p: TPosition | null | undefined): p is TAbsolutePosition {
	return p != null && typeof p.x === 'number';
}

export function isWindowVisible(w: TWindow): boolean {
	return w.visibility === 'visible';
}

// MARK: - React Context

const ReactWindowCx = React.createContext<WindowCx | null>(null);

export const WindowCxProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const cx = useMemoCleanup(() => {
		const windowCx = new WindowCx();
		return [windowCx, () => windowCx.unmount()];
	}, []);

	React.useEffect(() => {
		cx.mount();
	}, [cx]);

	const isMobileDown = useMediaQuery(mq.max(mq.sm)); // < 640px
	const isDesktopUp = useMediaQuery(mq.min(mq.lg)); // >= 1024px
	const breakpoint: TBreakpoint = isMobileDown ? 'sm' : isDesktopUp ? 'lg' : 'md';
	React.useEffect(() => {
		cx.setBreakpoint(breakpoint);
	}, [cx, breakpoint]);

	return <ReactWindowCx.Provider value={cx}>{children}</ReactWindowCx.Provider>;
};

export function useWindowCx(): WindowCx {
	const cx = React.useContext(ReactWindowCx);
	if (cx == null) {
		throw new Error('useWindowCx must be used within a WindowCxProvider');
	}
	return cx;
}
