import * as vscode from 'vscode';
import { ExtensionSettings, DEFAULT_SETTINGS, SettingsValidationResult } from '../types/settings-types';
import { GameConfig, TimerConfig, RedLightAction } from '../types/game-types';

/**
 * Settings change event data
 */
export interface SettingsChangeEvent {
    readonly previousSettings: ExtensionSettings;
    readonly currentSettings: ExtensionSettings;
    readonly changedKeys: readonly string[];
}

/**
 * Settings change listener type
 */
export type SettingsChangeListener = (event: SettingsChangeEvent) => void;

/**
 * Manages extension settings and configuration
 */
export class SettingsManager implements vscode.Disposable {
    private static readonly CONFIGURATION_SECTION = 'redLightGreenLight';
    private settingsChangeListeners: SettingsChangeListener[] = [];
    private disposables: vscode.Disposable[] = [];
    private currentSettings: ExtensionSettings;

    /**
     * Creates a new SettingsManager instance
     */
    constructor() {
        this.currentSettings = this.loadSettings();
        this.setupConfigurationChangeListener();
    }

    /**
     * Gets the current extension settings
     * @returns Current settings
     */
    public getSettings(): ExtensionSettings {
        return { ...this.currentSettings };
    }

    /**
     * Gets a specific setting value
     * @param key Setting key
     * @returns Setting value or undefined if not found
     */
    public getSetting<K extends keyof ExtensionSettings>(key: K): ExtensionSettings[K] {
        return this.currentSettings[key];
    }

    /**
     * Updates a specific setting
     * @param key Setting key
     * @param value New setting value
     * @param target Configuration target (user, workspace, etc.)
     */
    public async updateSetting<K extends keyof ExtensionSettings>(
        key: K,
        value: ExtensionSettings[K],
        target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global
    ): Promise<void> {
        const config = vscode.workspace.getConfiguration(SettingsManager.CONFIGURATION_SECTION);
        await config.update(key, value, target);
    }

    /**
     * Updates multiple settings at once
     * @param updates Object containing setting updates
     * @param target Configuration target
     */
    public async updateSettings(
        updates: Partial<ExtensionSettings>,
        target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global
    ): Promise<void> {
        const config = vscode.workspace.getConfiguration(SettingsManager.CONFIGURATION_SECTION);
        
        // Update each setting
        for (const [key, value] of Object.entries(updates)) {
            await config.update(key, value, target);
        }
    }

    /**
     * Resets settings to default values
     * @param target Configuration target
     */
    public async resetToDefaults(
        target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global
    ): Promise<void> {
        await this.updateSettings(DEFAULT_SETTINGS, target);
    }

    /**
     * Validates current settings
     * @returns Validation result
     */
    public validateSettings(): SettingsValidationResult {
        return this.validateSettingsObject(this.currentSettings);
    }

    /**
     * Validates a settings object
     * @param settings Settings to validate
     * @returns Validation result
     */
    public validateSettingsObject(settings: ExtensionSettings): SettingsValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Validate timing settings
        if (settings.redLightDuration < 1 || settings.redLightDuration > 60) {
            errors.push('Red light duration must be between 1 and 60 seconds');
        }

        if (settings.greenLightDuration < 1 || settings.greenLightDuration > 60) {
            errors.push('Green light duration must be between 1 and 60 seconds');
        }

        if (settings.useRandomTiming) {
            if (settings.randomTiming.minTime < 1 || settings.randomTiming.minTime > 60) {
                errors.push('Minimum random time must be between 1 and 60 seconds');
            }

            if (settings.randomTiming.maxTime < 2 || settings.randomTiming.maxTime > 120) {
                errors.push('Maximum random time must be between 2 and 120 seconds');
            }

            if (settings.randomTiming.minTime >= settings.randomTiming.maxTime) {
                errors.push('Minimum random time must be less than maximum random time');
            }
        }

        // Validate action setting
        const validActions: RedLightAction[] = [RedLightAction.Close, RedLightAction.Warn];
        if (!validActions.includes(settings.redLightAction as RedLightAction)) {
            errors.push(`Invalid red light action: ${settings.redLightAction}`);
        }

        // Validate sound settings
        if (settings.enableSounds) {
            if (settings.soundSettings.volume < 0 || settings.soundSettings.volume > 1) {
                errors.push('Sound volume must be between 0.0 and 1.0');
            }
        }

        // Add warnings for potentially problematic settings
        if (settings.redLightAction === 'close') {
            warnings.push('Close action will terminate VSCode when typing during red light');
        }

        if (settings.redLightDuration < 3) {
            warnings.push('Very short red light duration may be difficult to react to');
        }

        if (settings.greenLightDuration < 5) {
            warnings.push('Very short green light duration may not provide enough typing time');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Converts extension settings to game config
     * @param settings Extension settings (optional, uses current if not provided)
     * @returns Game configuration
     */
    public toGameConfig(settings?: ExtensionSettings): GameConfig {
        const currentSettings = settings || this.currentSettings;
        
        const timerConfig: TimerConfig = {
            redLightDuration: currentSettings.redLightDuration,
            greenLightDuration: currentSettings.greenLightDuration,
            useRandomTiming: currentSettings.useRandomTiming,
            maxRandomTime: currentSettings.randomTiming.maxTime,
            minRandomTime: currentSettings.randomTiming.minTime
        };

        return {
            timerConfig,
            redLightAction: this.parseRedLightAction(currentSettings.redLightAction),
            gracePeriod: currentSettings.gracePeriod,
            showTimer: currentSettings.showTimer,
            enableSounds: currentSettings.enableSounds
        };
    }

    /**
     * Adds a listener for settings changes
     * @param listener Settings change listener
     * @returns Disposable to remove the listener
     */
    public onSettingsChange(listener: SettingsChangeListener): vscode.Disposable {
        this.settingsChangeListeners.push(listener);
        
        return new vscode.Disposable(() => {
            const index = this.settingsChangeListeners.indexOf(listener);
            if (index >= 0) {
                this.settingsChangeListeners.splice(index, 1);
            }
        });
    }

    /**
     * Gets settings for display in UI
     * @returns Formatted settings for display
     */
    public getDisplaySettings(): { [key: string]: string } {
        const settings = this.currentSettings;
        
        return {
            'Red Light Duration': `${settings.redLightDuration} seconds`,
            'Green Light Duration': `${settings.greenLightDuration} seconds`,
            'Grace Period': `${settings.gracePeriod} seconds`,
            'Show Timer': settings.showTimer ? 'Enabled' : 'Disabled',
            'Random Timing': settings.useRandomTiming ? 'Enabled' : 'Disabled',
            'Random Range': settings.useRandomTiming 
                ? `${settings.randomTiming.minTime}-${settings.randomTiming.maxTime} seconds`
                : 'N/A',
            'Red Light Action': this.formatActionForDisplay(settings.redLightAction),
            'Sound Effects': settings.enableSounds ? 'Enabled' : 'Disabled',
            'Sound Volume': settings.enableSounds ? `${Math.round(settings.soundSettings.volume * 100)}%` : 'N/A'
        };
    }

    /**
     * Loads settings from VSCode configuration
     * @returns Loaded settings with defaults applied
     */
    private loadSettings(): ExtensionSettings {
        const config = vscode.workspace.getConfiguration(SettingsManager.CONFIGURATION_SECTION);
        
        return {
            redLightDuration: config.get('redLightDuration', DEFAULT_SETTINGS.redLightDuration),
            greenLightDuration: config.get('greenLightDuration', DEFAULT_SETTINGS.greenLightDuration),
            gracePeriod: config.get('gracePeriod', DEFAULT_SETTINGS.gracePeriod),
            showTimer: config.get('showTimer', DEFAULT_SETTINGS.showTimer),
            useRandomTiming: config.get('useRandomTiming', DEFAULT_SETTINGS.useRandomTiming),
            randomTiming: config.get('randomTiming', DEFAULT_SETTINGS.randomTiming),
            redLightAction: config.get('redLightAction', DEFAULT_SETTINGS.redLightAction),
            enableSounds: config.get('enableSounds', DEFAULT_SETTINGS.enableSounds),
            soundSettings: config.get('soundSettings', DEFAULT_SETTINGS.soundSettings)
        };
    }

    /**
     * Sets up configuration change listener
     */
    private setupConfigurationChangeListener(): void {
        const changeDisposable = vscode.workspace.onDidChangeConfiguration(event => {
            if (event.affectsConfiguration(SettingsManager.CONFIGURATION_SECTION)) {
                this.handleConfigurationChange();
            }
        });
        
        this.disposables.push(changeDisposable);
    }

    /**
     * Handles configuration changes
     */
    private handleConfigurationChange(): void {
        const previousSettings = { ...this.currentSettings };
        const newSettings = this.loadSettings();
        
        // Find changed keys
        const changedKeys: string[] = [];
        for (const key of Object.keys(newSettings) as Array<keyof ExtensionSettings>) {
            if (previousSettings[key] !== newSettings[key]) {
                changedKeys.push(key);
            }
        }
        
        if (changedKeys.length > 0) {
            this.currentSettings = newSettings;
            
            const changeEvent: SettingsChangeEvent = {
                previousSettings,
                currentSettings: newSettings,
                changedKeys
            };
            
            this.notifySettingsChange(changeEvent);
        }
    }

    /**
     * Notifies listeners of settings changes
     * @param event Settings change event
     */
    private notifySettingsChange(event: SettingsChangeEvent): void {
        this.settingsChangeListeners.forEach(listener => {
            try {
                listener(event);
            } catch (error) {
                console.error('Error in settings change listener:', error);
            }
        });
    }

    /**
     * Parses red light action string to enum
     * @param action Action string
     * @returns RedLightAction enum value
     */
    private parseRedLightAction(action: string): RedLightAction {
        switch (action) {
            case 'close':
                return RedLightAction.Close;
            case 'warn':
                return RedLightAction.Warn;
            default:
                return RedLightAction.Warn;
        }
    }

    /**
     * Formats action for display
     * @param action Action string
     * @returns Formatted action string
     */
    private formatActionForDisplay(action: string): string {
        switch (action) {
            case 'close':
                return 'Immediately Close IDE';
            case 'warn':
                return 'Show Warning';
            default:
                return 'Unknown';
        }
    }

    /**
     * Disposes of the settings manager and cleans up resources
     */
    public dispose(): void {
        this.disposables.forEach(disposable => disposable.dispose());
        this.disposables.length = 0;
        this.settingsChangeListeners.length = 0;
    }
}
