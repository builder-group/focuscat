import { formatTime, type TSessionStartInput, type TTimerCx } from '@repo/ui';
import { createState, type TState } from 'feature-state';
import { type AudioCx } from '@/features/audio';
import { type SessionCx } from '@/features/session';
import { type SettingsCx } from '@/features/settings';

export abstract class BaseTimerCx implements TTimerCx {
	protected readonly _unlisteners: (() => void)[] = [];
	protected _interval: ReturnType<typeof setInterval> | null = null;
	protected _remainingAtStart = 0;
	protected _overtimeAtStart = 0;
	protected _loopStartedAt = 0;
	protected _activeSessionId: number | null = null;

	protected readonly _settingsCx: SettingsCx;
	protected readonly _sessionCx: SessionCx;
	protected readonly _audioCx: AudioCx;

	public readonly $status = createState<'idle' | 'running' | 'paused'>('idle');
	public readonly $remainingSeconds: TState<number, []>;
	public readonly $totalSeconds: TState<number, []>;
	public readonly $overtimeSeconds = createState(0);
	public readonly $sessionsCompleted = createState(0);
	public readonly $speed: TState<number, []>;
	public readonly $startedAt = createState<Date | null>(null);
	public abstract readonly $sessionType: TState<string, []>;

	constructor(settingsCx: SettingsCx, sessionCx: SessionCx, audioCx: AudioCx) {
		this._settingsCx = settingsCx;
		this._sessionCx = sessionCx;
		this._audioCx = audioCx;

		const app = settingsCx.$appSettings.get();
		this.$remainingSeconds = createState(0);
		this.$totalSeconds = createState(0);
		this.$speed = createState(Math.max(1, app.developer.timerSpeed));

		this._unlisteners.push(
			settingsCx.$appSettings.listen(({ value: settings }) => {
				const newSpeed = Math.max(1, settings.developer.timerSpeed);
				const oldSpeed = this.$speed.get();
				this.$speed.set(newSpeed);
				if (newSpeed !== oldSpeed && this.$status.get() === 'running') {
					this.stopLoop();
					this.startLoop();
				}
				if (this.$status.get() === 'idle') {
					this._applyIdleState();
				}
			})
		);
	}

	public abstract start(input?: TSessionStartInput): Promise<void>;
	public abstract reset(): Promise<void>;
	public abstract complete(): Promise<void>;
	protected abstract _applyIdleState(): void;

	public async pause(): Promise<void> {
		if (this.$status.get() !== 'running') return;
		this.$status.set('paused');
		this.stopLoop();
		this._updateDocumentTitle();
	}

	public async resume(): Promise<void> {
		if (this.$status.get() !== 'paused') return;
		this.$status.set('running');
		this.$startedAt.set(new Date());
		this.startLoop();
	}

	public async setDuration(minutes: number): Promise<void> {
		if (this.$status.get() === 'running') return;
		const seconds = minutes * 60;
		this.$totalSeconds.set(seconds);
		this.$remainingSeconds.set(seconds);
	}

	public unmount(): void {
		this.stopLoop();
		for (const unlisten of this._unlisteners) unlisten();
		this._unlisteners.length = 0;
		if (typeof document !== 'undefined') {
			document.title = getDocumentTitleBrand();
		}
	}

	protected startLoop(): void {
		this.stopLoop();
		this._remainingAtStart = this.$remainingSeconds.get();
		this._overtimeAtStart = this.$overtimeSeconds.get();
		this._loopStartedAt = Date.now();
		this._interval = setInterval(() => this._tick(), Math.round(1000 / this.$speed.get()));
	}

	protected stopLoop(): void {
		if (this._interval != null) {
			clearInterval(this._interval);
			this._interval = null;
		}
	}

	protected _tick(): void {
		const speed = this.$speed.get();
		const elapsed = Math.floor(((Date.now() - this._loopStartedAt) / 1000) * speed);
		const newRemaining = Math.max(0, this._remainingAtStart - elapsed);
		const newOvertime = this._overtimeAtStart + Math.max(0, elapsed - this._remainingAtStart);

		const prevRemaining = this.$remainingSeconds.get();
		const prevOvertime = this.$overtimeSeconds.get();

		if (speed === 1 && newRemaining > 0 && newRemaining < prevRemaining) {
			this._audioCx.playSound('tick');
		}
		if (prevOvertime === 0 && newOvertime > 0) {
			this._audioCx.playSound('complete');
		}

		this.$remainingSeconds.set(newRemaining);
		this.$overtimeSeconds.set(newOvertime);
		this._updateDocumentTitle();
		this._onTick(prevOvertime, newOvertime);
	}

	// Hook for subclasses (e.g. pomodoro auto-advance)
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	protected _onTick(_prevOvertime: number, _newOvertime: number): void {}

	protected _updateDocumentTitle(): void {
		const status = this.$status.get();
		const remaining = this.$remainingSeconds.get();
		const overtime = this.$overtimeSeconds.get();
		const brand = getDocumentTitleBrand();

		let newTitle: string;
		if (status === 'idle') {
			newTitle = brand;
		} else if (remaining === 0 && overtime > 0) {
			newTitle = `+${formatTime(overtime)} • ${brand}`;
		} else {
			const prefix = status === 'paused' ? '⏸ ' : '';
			newTitle = `${prefix}${formatTime(remaining)} • ${brand}`;
		}

		if (typeof document !== 'undefined' && document.title !== newTitle) {
			document.title = newTitle;
		}
	}

	protected _getElapsedSeconds(): number {
		return this.$totalSeconds.get() - this.$remainingSeconds.get() + this.$overtimeSeconds.get();
	}
}

function getDocumentTitleBrand(): 'FocusCat' | 'Pomodoro Cat' {
	if (typeof window !== 'undefined' && window.location.hostname.includes('pomodorocat')) {
		return 'Pomodoro Cat';
	}
	return 'FocusCat';
}
