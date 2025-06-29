import { TimerConfig } from '../types/game-types';

/**
 * Timer mode enumeration
 */
export enum TimerMode {
    RedLight = 'red',
    GreenLight = 'green'
}

/**
 * Timer event callback type
 */
export type TimerCallback = (mode: TimerMode, remainingTime: number) => void;

/**
 * Timer completion callback type
 */
export type TimerCompleteCallback = (mode: TimerMode) => void;

/**
 * Manages timing intervals for red and green light phases
 */
export class TimerManager {
    private currentTimer: NodeJS.Timeout | null = null;
    private currentMode: TimerMode | null = null;
    private remainingTime: number = 0;
    private tickInterval: NodeJS.Timeout | null = null;
    private readonly config: TimerConfig;
    private readonly onTick: TimerCallback;
    private readonly onComplete: TimerCompleteCallback;

    /**
     * Creates a new TimerManager instance
     * @param config Timer configuration
     * @param onTick Callback for timer ticks (every second)
     * @param onComplete Callback for timer completion
     */
    constructor(
        config: TimerConfig,
        onTick: TimerCallback,
        onComplete: TimerCompleteCallback
    ) {
        this.config = config;
        this.onTick = onTick;
        this.onComplete = onComplete;
    }

    /**
     * Starts a timer for the specified mode
     * @param mode Timer mode (red or green light)
     */
    public startTimer(mode: TimerMode): void {
        this.cleanup();
        
        this.currentMode = mode;
        this.remainingTime = this.getDurationForMode(mode);
        
        // Start the tick interval (updates every second)
        this.tickInterval = setInterval(() => {
            this.remainingTime--;
            this.onTick(mode, this.remainingTime);
            
            if (this.remainingTime <= 0) {
                this.completeTimer();
            }
        }, 1000);
        
        // Initial tick
        this.onTick(mode, this.remainingTime);
    }

    /**
     * Stops the current timer
     */
    public stop(): void {
        this.cleanup();
        this.currentMode = null;
        this.remainingTime = 0;
    }

    /**
     * Gets the current timer mode
     */
    public getCurrentMode(): TimerMode | null {
        return this.currentMode;
    }

    /**
     * Gets the remaining time in seconds
     */
    public getRemainingTime(): number {
        return this.remainingTime;
    }

    /**
     * Checks if a timer is currently active
     */
    public isActive(): boolean {
        return this.currentMode !== null && this.tickInterval !== null;
    }

    /**
     * Updates the timer configuration
     * @param newConfig New timer configuration
     */
    public updateConfig(newConfig: TimerConfig): void {
        Object.assign(this.config as any, newConfig);
    }

    /**
     * Gets the duration for the specified mode based on configuration
     * @param mode Timer mode
     * @returns Duration in seconds
     */
    private getDurationForMode(mode: TimerMode): number {
        if (this.config.useRandomTiming) {
            return this.getRandomDuration();
        }
        
        return mode === TimerMode.RedLight 
            ? this.config.redLightDuration 
            : this.config.greenLightDuration;
    }

    /**
     * Generates a random duration within configured bounds
     * @returns Random duration in seconds
     */
    private getRandomDuration(): number {
        const min = this.config.minRandomTime;
        const max = this.config.maxRandomTime;
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /**
     * Completes the current timer and notifies completion
     */
    private completeTimer(): void {
        const completedMode = this.currentMode;
        this.cleanup();
        
        if (completedMode) {
            this.onComplete(completedMode);
        }
    }

    /**
     * Cleans up timer resources
     */
    private cleanup(): void {
        if (this.tickInterval) {
            clearInterval(this.tickInterval);
            this.tickInterval = null;
        }
        
        if (this.currentTimer) {
            clearTimeout(this.currentTimer);
            this.currentTimer = null;
        }
    }

    /**
     * Disposes of the timer manager and cleans up resources
     */
    public dispose(): void {
        this.cleanup();
        this.currentMode = null;
        this.remainingTime = 0;
    }
}
