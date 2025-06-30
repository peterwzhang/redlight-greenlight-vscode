import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { SoundConfig } from '../types/settings-types';

// Import sound-play library
const play = require('sound-play');

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
 * Sound file mappings for different game events
 */
const SOUND_FILES = {
    [SoundType.RedLight]: 'red-light.mp3',
    [SoundType.GreenLight]: 'green-light.mp3',
    [SoundType.Violation]: 'violation.mp3',
    [SoundType.GameStart]: 'game-start.mp3',
    [SoundType.GameStop]: 'game-stop.mp3'
} as const;

/**
 * Fallback status messages for when audio fails
 */
const SOUND_MESSAGES = {
    [SoundType.RedLight]: '🔴 RED LIGHT',
    [SoundType.GreenLight]: '🟢 GREEN LIGHT',
    [SoundType.Violation]: '⚠️ RED LIGHT VIOLATION',
    [SoundType.GameStart]: '🎮 GAME STARTED',
    [SoundType.GameStop]: '🛑 GAME STOPPED'
} as const;

/**
 * Manages audio feedback for game events using sound-play library
 */
export class SoundManager implements vscode.Disposable {
    private isEnabled: boolean = false;
    private config: SoundConfig;
    private disposables: vscode.Disposable[] = [];
    private lastSoundTime: Map<SoundType, number> = new Map();
    private readonly soundCooldown: number = 100; // Minimum ms between same sound types
    private extensionContext: vscode.ExtensionContext | null = null;
    private isAudioInitialized: boolean = false;
    private availableSoundFiles: Set<SoundType> = new Set();

    /**
     * Creates a new SoundManager instance
     * @param config Sound configuration
     */
    constructor(config: SoundConfig) {
        this.config = config;
    }

    /**
     * Initializes the audio system with extension context
     * @param context VSCode extension context
     */
    public async initialize(context: vscode.ExtensionContext): Promise<void> {
        this.extensionContext = context;
        
        if (this.isAudioInitialized) {
            return;
        }

        try {
            // Check for available sound files
            await this.checkSoundFiles();
            
            this.isAudioInitialized = true;
            console.log(`Audio system initialized with sound-play library`);
            console.log(`Found ${this.availableSoundFiles.size} sound files`);
        } catch (error) {
            console.warn('Failed to initialize audio system:', error);
            this.isAudioInitialized = false;
        }
    }

    /**
     * Checks which sound files are available
     */
    private async checkSoundFiles(): Promise<void> {
        if (!this.extensionContext) {
            return;
        }

        const soundsPath = path.join(this.extensionContext.extensionPath, 'assets', 'sounds');

        for (const [soundType, fileName] of Object.entries(SOUND_FILES)) {
            const filePath = path.join(soundsPath, fileName);
            
            if (fs.existsSync(filePath)) {
                this.availableSoundFiles.add(soundType as SoundType);
                console.log(`Found sound file: ${fileName}`);
            } else {
                console.warn(`Sound file not found: ${filePath}`);
            }
        }
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
            if (this.isAudioInitialized && this.availableSoundFiles.has(soundType)) {
                await this.playAudioFile(soundType);
            } else {
                // Fallback to visual feedback
                await this.showVisualFeedback(soundType);
            }
        } catch (error) {
            console.warn(`Failed to play sound for ${soundType}:`, error);
            // Fallback to visual feedback
            await this.showVisualFeedback(soundType);
        }
    }

    /**
     * Plays an audio file using sound-play library
     * @param soundType Type of sound to play
     */
    private async playAudioFile(soundType: SoundType): Promise<void> {
        if (!this.extensionContext || !this.availableSoundFiles.has(soundType)) {
            return;
        }

        const fileName = SOUND_FILES[soundType];
        const filePath = path.join(this.extensionContext.extensionPath, 'assets', 'sounds', fileName);

        try {
            // Play sound using sound-play library
            // Note: sound-play automatically handles volume based on system settings
            await play.play(filePath);
            console.log(`Playing audio file: ${fileName}`);
        } catch (error) {
            console.warn(`Failed to play ${fileName} with sound-play:`, error);
            throw error;
        }
    }

    /**
     * Shows visual feedback when audio is not available
     * @param soundType Type of sound
     */
    private async showVisualFeedback(soundType: SoundType): Promise<void> {
        const message = SOUND_MESSAGES[soundType];
        const duration = this.getSoundDuration(soundType);

        // Show brief status bar message as fallback
        vscode.window.setStatusBarMessage(message, duration);
    }

    /**
     * Tests audio playback
     */
    public async testAudio(): Promise<boolean> {
        try {
            if (this.isAudioInitialized) {
                await this.playSound(SoundType.GameStart);
                vscode.window.showInformationMessage('🔊 Audio test - you should hear the game start sound');
                return true;
            } else {
                vscode.window.showWarningMessage('🔇 Audio system not initialized. Check that MP3 files are present in assets/sounds/');
                return false;
            }
        } catch (error) {
            console.warn('Audio test failed:', error);
            vscode.window.showErrorMessage('Audio test failed - see console for details');
            return false;
        }
    }

    /**
     * Checks if audio is supported and initialized
     */
    public isAudioSupported(): boolean {
        return this.isAudioInitialized;
    }

    /**
     * Gets the list of loaded audio files
     */
    public getLoadedSounds(): SoundType[] {
        return Array.from(this.availableSoundFiles);
    }

    /**
     * Gets the total number of expected sound files
     */
    public getExpectedSoundCount(): number {
        return Object.keys(SOUND_FILES).length;
    }

    /**
     * Gets the current volume level
     */
    public getVolume(): number {
        return this.config.volume;
    }

    /**
     * Sets the volume level
     * @param volume Volume level (0.0 to 1.0)
     */
    public setVolume(volume: number): void {
        this.config = {
            ...this.config,
            volume: Math.max(0, Math.min(1, volume))
        };
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
     * Creates a subtle sound effect (plays at lower volume)
     * @param soundType Type of sound
     */
    public async playSubtleSound(soundType: SoundType): Promise<void> {
        if (!this.isEnabled || !this.shouldPlaySound(soundType)) {
            return;
        }

        // For subtle sounds, just show visual feedback for now
        // sound-play doesn't have easy volume control
        await this.showVisualFeedback(soundType);
    }

    /**
     * Shows configuration help for sound settings
     */
    public async showSoundHelp(): Promise<void> {
        const loadedCount = this.availableSoundFiles.size;
        const expectedCount = this.getExpectedSoundCount();
        
        const helpMessage = 
            `Red Light Green Light Audio System\n\n` +
            `Status: ${this.isAudioInitialized ? '✅ Initialized' : '❌ Not Initialized'}\n` +
            `Audio Library: sound-play (Node.js)\n` +
            `Loaded Sounds: ${loadedCount}/${expectedCount}\n\n` +
            `Sound files should be placed in:\n` +
            `📁 assets/sounds/\n` +
            `├── red-light.mp3\n` +
            `├── green-light.mp3\n` +
            `├── violation.mp3\n` +
            `├── game-start.mp3\n` +
            `└── game-stop.mp3\n\n` +
            `If sounds aren't playing:\n` +
            `• Check that all MP3 files are present\n` +
            `• Ensure system audio is working\n` +
            `• Try the audio test in settings\n` +
            `• Check system audio volume`;

        await vscode.window.showInformationMessage(helpMessage, 'Got it', 'Test Audio').then(async (choice) => {
            if (choice === 'Test Audio') {
                await this.testAudio();
            }
        });
    }

    /**
     * Disposes of the sound manager and cleans up resources
     */
    public dispose(): void {
        this.isEnabled = false;
        this.lastSoundTime.clear();
        this.availableSoundFiles.clear();
        this.isAudioInitialized = false;
        
        this.disposables.forEach(disposable => disposable.dispose());
        this.disposables.length = 0;
    }
}
