import * as vscode from 'vscode';
import { GameState, GameConfig, GameStateChangeEvent, TimerConfig } from '../types/game-types';
import { TimerManager, TimerMode } from './timer-manager';

/**
 * Event emitter for game state changes
 */
export type GameStateChangeListener = (event: GameStateChangeEvent) => void;

/**
 * Core game engine that manages the Red Light Green Light game state
 */
export class GameEngine implements vscode.Disposable {
    private currentState: GameState = GameState.Stopped;
    private timerManager: TimerManager;
    private stateChangeListeners: GameStateChangeListener[] = [];
    private config: GameConfig;
    private sessionStartTime: number = 0;
    private disposables: vscode.Disposable[] = [];

    /**
     * Creates a new GameEngine instance
     * @param config Game configuration
     */
    constructor(config: GameConfig) {
        this.config = config;
        this.timerManager = new TimerManager(
            config.timerConfig,
            this.onTimerTick.bind(this),
            this.onTimerComplete.bind(this)
        );
    }

    /**
     * Starts the game
     */
    public start(): void {
        if (this.currentState !== GameState.Stopped) {
            return;
        }

        this.sessionStartTime = Date.now();
        this.changeState(GameState.GreenLight);
        this.timerManager.startTimer(TimerMode.GreenLight);
    }

    /**
     * Stops the game
     */
    public stop(): void {
        if (this.currentState === GameState.Stopped) {
            return;
        }

        this.timerManager.stop();
        this.changeState(GameState.Stopped);
        this.sessionStartTime = 0;
    }

    /**
     * Toggles the game state (start if stopped, stop if running)
     */
    public toggle(): void {
        if (this.currentState === GameState.Stopped) {
            this.start();
        } else {
            this.stop();
        }
    }

    /**
     * Gets the current game state
     */
    public getCurrentState(): GameState {
        return this.currentState;
    }

    /**
     * Gets the remaining time for the current phase
     */
    public getRemainingTime(): number {
        return this.timerManager.getRemainingTime();
    }

    /**
     * Checks if the game is currently active
     */
    public isActive(): boolean {
        return this.currentState !== GameState.Stopped;
    }

    /**
     * Checks if typing is currently allowed
     */
    public isTypingAllowed(): boolean {
        return this.currentState === GameState.GreenLight || this.currentState === GameState.Stopped;
    }

    /**
     * Gets the current session duration in milliseconds
     */
    public getSessionDuration(): number {
        if (this.sessionStartTime === 0) {
            return 0;
        }
        return Date.now() - this.sessionStartTime;
    }

    /**
     * Updates the game configuration
     * @param newConfig New game configuration
     */
    public updateConfig(newConfig: GameConfig): void {
        this.config = { ...newConfig };
        this.timerManager.updateConfig(newConfig.timerConfig);
    }

    /**
     * Gets the current game configuration
     */
    public getConfig(): GameConfig {
        return { ...this.config };
    }

    /**
     * Adds a listener for game state changes
     * @param listener State change listener function
     */
    public onStateChange(listener: GameStateChangeListener): vscode.Disposable {
        this.stateChangeListeners.push(listener);
        
        return new vscode.Disposable(() => {
            const index = this.stateChangeListeners.indexOf(listener);
            if (index >= 0) {
                this.stateChangeListeners.splice(index, 1);
            }
        });
    }

    /**
     * Forces a state transition for testing purposes
     * @param newState New game state
     */
    public forceStateChange(newState: GameState): void {
        if (newState === GameState.Stopped) {
            this.stop();
        } else {
            this.changeState(newState);
        }
    }

    /**
     * Handles timer tick events
     * @param mode Current timer mode
     * @param remainingTime Remaining time in seconds
     */
    private onTimerTick(mode: TimerMode, remainingTime: number): void {
        // Timer tick can be used for UI updates, but doesn't change game state
        // The state change listeners will be notified with remaining time
        this.notifyStateChange(this.currentState, remainingTime);
    }

    /**
     * Handles timer completion events
     * @param completedMode The timer mode that just completed
     */
    private onTimerComplete(completedMode: TimerMode): void {
        if (this.currentState === GameState.Stopped) {
            return;
        }

        // Switch between red and green light
        if (completedMode === TimerMode.GreenLight) {
            this.changeState(GameState.RedLight);
            this.timerManager.startTimer(TimerMode.RedLight);
        } else if (completedMode === TimerMode.RedLight) {
            this.changeState(GameState.GreenLight);
            this.timerManager.startTimer(TimerMode.GreenLight);
        }
    }

    /**
     * Changes the game state and notifies listeners
     * @param newState New game state
     */
    private changeState(newState: GameState): void {
        const previousState = this.currentState;
        this.currentState = newState;
        this.notifyStateChange(previousState);
    }

    /**
     * Notifies all listeners of a state change
     * @param previousState Previous game state
     * @param remainingTime Optional remaining time for timer updates
     */
    private notifyStateChange(previousState: GameState, remainingTime?: number): void {
        const event: GameStateChangeEvent = {
            previousState,
            currentState: this.currentState,
            timestamp: Date.now(),
            remainingTime: remainingTime ?? this.timerManager.getRemainingTime()
        };

        this.stateChangeListeners.forEach(listener => {
            try {
                listener(event);
            } catch (error) {
                console.error('Error in game state change listener:', error);
            }
        });
    }

    /**
     * Disposes of the game engine and cleans up resources
     */
    public dispose(): void {
        this.stop();
        this.timerManager.dispose();
        this.stateChangeListeners.length = 0;
        
        this.disposables.forEach(disposable => disposable.dispose());
        this.disposables.length = 0;
    }
}
