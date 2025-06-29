import * as vscode from 'vscode';
import { SoundConfig } from '../types/settings-types';

/**
 * Sound types for different game events
 */
export enum SoundType {
    RedLight = 'redLight',
    GreenLight = 'greenLight',
    Violation = 'violation',
    GameStart = 'gameStart',
    GameStop = 'gameStop'
}

/**
 * Sound notification mappings for VSCode
 */
const SOUND_MESSAGES = {
    [SoundType.RedLight]: '🔴 RED LIGHT',
    [SoundType.GreenLight]: '🟢 GREEN LIGHT',
    [SoundType.Violation]: '⚠️ RED LIGHT VIOLATION',
    [SoundType.GameStart]: '🎮 GAME STARTED',
    [SoundType.GameStop]: '🛑 GAME STOPPED'
} as const;

/**
 * Manages audio feedback for game events using VSCode notifications and system sounds
 */
export class SoundManager implements vscode.Disposable {
    private isEnabled: boolean = false;
    private config: SoundConfig;
    private disposables: vscode.Disposable[] = [];
    private lastSoundTime: Map<SoundType, number> = new Map();
    private readonly soundCooldown: number = 100; // Minimum ms between same sound types

    /**
     * Creates a new SoundManager instance
     * @param config Sound configuration
     */
    constructor(config: SoundConfig) {
        this.config = config;
    }

    /**
     * Enables or disables sound playback
     * @param enabled Whether sounds should be enabled
     */
    public setEnabled(enabled: boolean): void {
        this.isEnabled = enabled;
    }

    /**
     * Updates the sound configuration
     * @param newConfig New sound configuration
     */
    public updateConfig(newConfig: SoundConfig): void {
        this.config = { ...newConfig };
    }

    /**
     * Plays a sound for the specified game event
     * @param soundType Type of sound to play
     */
    public async playSound(soundType: SoundType): Promise<void> {
        if (!this.isEnabled || !this.shouldPlaySound(soundType)) {
            return;
        }

        // Prevent sound spam with cooldown
        const now = Date.now();
        const lastTime = this.lastSoundTime.get(soundType) || 0;
        if (now - lastTime < this.soundCooldown) {
            return;
        }
        this.lastSoundTime.set(soundType, now);

        try {
            await this.playSystemSound(soundType);
        } catch (error) {
            console.warn(`Failed to play sound for ${soundType}:`, error);
        }
    }

    /**
     * Tests audio playback
     */
    public async testAudio(): Promise<boolean> {
        try {
            await vscode.window.showInformationMessage('🔊 Audio test - you should hear system notification sounds when enabled');
            return true;
        } catch (error) {
            console.warn('Audio test failed:', error);
            return false;
        }
    }

    /**
     * Gets the current volume level (simulated - actual volume depends on system)
     */
    public getVolume(): number {
        return this.config.volume;
    }

    /**
     * Sets the volume level (stored for UI purposes, actual volume is system-controlled)
     * @param volume Volume level (0.0 to 1.0)
     */
    public setVolume(volume: number): void {
        this.config = {
            ...this.config,
            volume: Math.max(0, Math.min(1, volume))
        };
    }

    /**
     * Checks if audio is supported (always true for notification-based sounds)
     */
    public isAudioSupported(): boolean {
        return true;
    }

    /**
     * Plays sound notification with brief visual feedback
     * @param soundType Type of sound to play
     */
    public async playSoundWithVisualFeedback(soundType: SoundType): Promise<void> {
        if (!this.isEnabled || !this.shouldPlaySound(soundType)) {
            return;
        }

        const message = SOUND_MESSAGES[soundType];
        const duration = this.getSoundDuration(soundType);

        // Show brief status bar message as visual feedback
        const statusDisposable = vscode.window.setStatusBarMessage(message, duration);
        this.disposables.push(statusDisposable);

        // Play the system sound
        await this.playSystemSound(soundType);
    }

    /**
     * Determines if a sound should be played based on configuration
     * @param soundType Type of sound
     * @returns True if sound should be played
     */
    private shouldPlaySound(soundType: SoundType): boolean {
        switch (soundType) {
            case SoundType.RedLight:
                return this.config.redLightSound;
            case SoundType.GreenLight:
                return this.config.greenLightSound;
            case SoundType.Violation:
                return this.config.violationSound;
            case SoundType.GameStart:
            case SoundType.GameStop:
                return this.config.gameStartSound;
            default:
                return false;
        }
    }

    /**
     * Plays system sound using VSCode notifications
     * @param soundType Type of sound to play
     */
    private async playSystemSound(soundType: SoundType): Promise<void> {
        const message = SOUND_MESSAGES[soundType];
        
        // Use different notification types to potentially trigger different system sounds
        switch (soundType) {
            case SoundType.RedLight:
            case SoundType.Violation:
                // Use warning for red/error sounds (may trigger system warning sound)
                await vscode.window.showWarningMessage(message, { modal: false });
                break;
            case SoundType.GreenLight:
            case SoundType.GameStart:
                // Use info for positive sounds (may trigger system info sound)
                await vscode.window.showInformationMessage(message, { modal: false });
                break;
            case SoundType.GameStop:
                // Use info for neutral sounds
                await vscode.window.showInformationMessage(message, { modal: false });
                break;
        }

        // Automatically dismiss the notification after a short time
        setTimeout(() => {
            vscode.commands.executeCommand('notifications.clearAll');
        }, this.getSoundDuration(soundType));
    }

    /**
     * Gets the duration for sound feedback
     * @param soundType Type of sound
     * @returns Duration in milliseconds
     */
    private getSoundDuration(soundType: SoundType): number {
        switch (soundType) {
            case SoundType.RedLight:
                return 800;
            case SoundType.GreenLight:
                return 500;
            case SoundType.Violation:
                return 1200;
            case SoundType.GameStart:
                return 800;
            case SoundType.GameStop:
                return 600;
            default:
                return 500;
        }
    }

    /**
     * Creates a subtle sound effect using status bar messages
     * @param soundType Type of sound
     */
    public async playSubtleSound(soundType: SoundType): Promise<void> {
        if (!this.isEnabled || !this.shouldPlaySound(soundType)) {
            return;
        }

        const message = SOUND_MESSAGES[soundType];
        const duration = this.getSoundDuration(soundType) / 2; // Shorter for subtle effect

        // Just show status bar message without notification popup
        vscode.window.setStatusBarMessage(message, duration);
    }

    /**
     * Shows configuration help for sound settings
     */
    public async showSoundHelp(): Promise<void> {
        const helpMessage = 
            'Sound notifications in VSCode extensions use system notification sounds.\n\n' +
            'To enhance audio feedback:\n' +
            '• Enable system notification sounds in your OS settings\n' +
            '• Adjust system volume for notifications\n' +
            '• Different notification types may use different system sounds\n\n' +
            'The extension will show brief visual feedback for all sound events.';

        await vscode.window.showInformationMessage(helpMessage, 'Got it');
    }

    /**
     * Disposes of the sound manager and cleans up resources
     */
    public dispose(): void {
        this.isEnabled = false;
        this.lastSoundTime.clear();
        
        this.disposables.forEach(disposable => disposable.dispose());
        this.disposables.length = 0;
    }
}
