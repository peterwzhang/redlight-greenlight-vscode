/**
 * Game state enumeration for Red Light Green Light game
 */
export enum GameState {
    Stopped = 'stopped',
    RedLight = 'red',
    GreenLight = 'green'
}

/**
 * Action types for red light violations
 */
export enum RedLightAction {
    Close = 'close',
    Warn = 'warn'
}

/**
 * Timer configuration interface
 */
export interface TimerConfig {
    readonly redLightDuration: number;
    readonly greenLightDuration: number;
    readonly useRandomTiming: boolean;
    readonly maxRandomTime: number;
    readonly minRandomTime: number;
}

/**
 * Game configuration interface
 */
export interface GameConfig {
    readonly timerConfig: TimerConfig;
    readonly redLightAction: RedLightAction;
    readonly gracePeriod: number;
    readonly showTimer: boolean;
    readonly enableSounds: boolean;
}

/**
 * Game statistics interface
 */
export interface GameStats {
    readonly sessionsPlayed: number;
    readonly totalViolations: number;
    readonly totalGameTime: number;
    readonly bestStreak: number;
    readonly currentStreak: number;
}

/**
 * Game state change event data
 */
export interface GameStateChangeEvent {
    readonly previousState: GameState;
    readonly currentState: GameState;
    readonly timestamp: number;
    readonly remainingTime?: number;
}

/**
 * Red light violation event data
 */
export interface RedLightViolationEvent {
    readonly timestamp: number;
    readonly documentUri: string;
    readonly changeText: string;
    readonly actionTaken: RedLightAction;
}
