import { isBreakSession, type TProgressivePomodoroCx, type TSessionStartInput } from '@repo/ui';
import { createState } from 'feature-state';
import { specta } from '@/environment';
import { toTuple } from '@/lib';
import { BaseTimerCx } from './BaseTimerCx';

export class ProgressivePomodoroTimerCx extends BaseTimerCx implements TProgressivePomodoroCx {
	public readonly mode = 'progressive' as const;

	// Tracks the duration for the next work session (used when break ends → advance to work).
	private readonly $currentWorkDuration = createState<number>(0);

	protected override applyTimerUpdate(timer: specta.TimerDto): void {
		const prevOvertime = this.$overtimeSeconds.get();
		super.applyTimerUpdate(timer);
		this._checkAutoAdvance(prevOvertime, timer.overtimeSeconds);
	}

	public async start(input?: TSessionStartInput): Promise<void> {
		const s = this._settingsCx.$appSettings.get();
		if (s.timer.progressive.showSessionSetup && input == null) {
			await this._showMainFlow('/window/main/progressive/setup?advance=false');
			return;
		}
		const [ok, , err] = toTuple(await specta.commands.startTimer(this._toSessionStartInput(input)));
		if (ok) {
			this.$startedAt.set(new Date());
		} else {
			console.error('Failed to start progressive timer:', err);
		}
	}

	public async advance(input?: TSessionStartInput): Promise<void> {
		const sessionType = this.$sessionType.get();
		if (sessionType === 'progressive:work') {
			await this._showMainFlow('/window/main/progressive/rating');
			return;
		}

		const s = this._settingsCx.$appSettings.get();
		const isBreak = isBreakSession(this.$sessionType.get());
		if (s.timer.progressive.showSessionSetup && isBreak && input == null) {
			await this._showMainFlow('/window/main/progressive/setup?advance=true');
			return;
		}

		await this._advanceSession('Work', this.$currentWorkDuration.get(), input);
	}

	public async advanceWithSuggestion(
		workSeconds: number,
		breakSeconds: number | null
	): Promise<void> {
		this.$currentWorkDuration.set(workSeconds);
		if (breakSeconds != null) {
			await this._advanceSession('Break', breakSeconds);
		} else {
			await this._advanceSession('Work', workSeconds);
		}
	}

	private async _advanceSession(
		sessionType: specta.ProgressiveSessionType,
		durationSeconds: number,
		input?: TSessionStartInput
	): Promise<void> {
		const [ok, , err] = toTuple(
			await specta.commands.advanceProgressiveTimer(
				sessionType,
				durationSeconds,
				this._toSessionStartInput(input)
			)
		);
		if (ok) {
			this.$startedAt.set(sessionType === 'Work' ? new Date() : null);
		} else {
			console.error('Failed to start next progressive session:', err);
		}
	}

	private _checkAutoAdvance(prevOvertime: number, currentOvertime: number): void {
		if (!this._enableSideEffects || currentOvertime === 0) return;
		const { autoAdvance, autoAdvanceCountdownSeconds } =
			this._settingsCx.$appSettings.get().timer.progressive;
		if (!autoAdvance) return;
		if (
			prevOvertime < autoAdvanceCountdownSeconds &&
			currentOvertime >= autoAdvanceCountdownSeconds
		) {
			void this.advance();
		}
	}
}
