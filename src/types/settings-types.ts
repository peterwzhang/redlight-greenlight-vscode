/**
 * Random timing configuration
 */
export interface RandomTimingConfig {
    readonly maxTime: number;
    readonly minTime: number;
}

/**
 * Sound configuration
 */
export interface SoundConfig {
    readonly volume: number;
    readonly redLightSound: boolean;
    readonly greenLightSound: boolean;
    readonly violationSound: boolean;
    readonly gameStartSound: boolean;
}

/**
 * Extension settings interface matching package.json configuration
 */
export interface ExtensionSettings {
    readonly redLightDuration: number;
    readonly greenLightDuration: number;
    readonly gracePeriod: number;
    readonly showTimer: boolean;
    readonly useRandomTiming: boolean;
    readonly randomTiming: RandomTimingConfig;
    readonly redLightAction: 'close' | 'warn';
    readonly enableSounds: boolean;
    readonly soundSettings: SoundConfig;
}

/**
 * Timing configuration with validation
 */
export interface TimingSettings {
    readonly redLightDuration: number;
    readonly greenLightDuration: number;
    readonly isRandomMode: boolean;
    readonly randomRange: {
        readonly min: number;
        readonly max: number;
    };
}

/**
 * Visual feedback settings
 */
export interface VisualSettings {
    readonly showStatusBar: boolean;
    readonly showNotifications: boolean;
    readonly useColorTheme: boolean;
    readonly flashOnStateChange: boolean;
}

/**
 * Audio settings (future feature)
 */
export interface AudioSettings {
    readonly enabled: boolean;
    readonly volume: number;
    readonly redLightSound: string;
    readonly greenLightSound: string;
    readonly violationSound: string;
}

/**
 * Settings validation result
 */
export interface SettingsValidationResult {
    readonly isValid: boolean;
    readonly errors: readonly string[];
    readonly warnings: readonly string[];
}

/**
 * Default settings values
 */
export const DEFAULT_SETTINGS: ExtensionSettings = {
    redLightDuration: 5,
    greenLightDuration: 10,
    gracePeriod: 0.5,
    showTimer: true,
    useRandomTiming: false,
    randomTiming: {
        maxTime: 15,
        minTime: 3
    },
    redLightAction: 'warn',
    enableSounds: false,
    soundSettings: {
        volume: 0.5,
        redLightSound: true,
        greenLightSound: true,
        violationSound: true,
        gameStartSound: true
    }
} as const;
