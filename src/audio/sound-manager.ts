import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { promisify } from 'util';
import { SoundConfig } from '../types/settings-types';

// Import play-sound library
const playSound = require('play-sound');

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
 * Manages audio feedback for game events using play-sound library
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
    private player: any = null;
    private playAsync: ((filePath: string) => Promise<any>) | null = null;

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
            // Initialize play-sound player with platform-optimized settings
            // play-sound automatically detects the best available audio player
            // but we can provide platform preferences for better compatibility
            const playerOptions = this.getOptimalPlayerOptions();
            console.log(`Initializing audio with options:`, JSON.stringify(playerOptions, null, 2));
            
            this.player = playSound(playerOptions);
            
            // Create promisified version of play function for async/await usage
            this.playAsync = promisify(this.player.play.bind(this.player)) as (filePath: string) => Promise<any>;
            
            // Check for available sound files
            await this.checkSoundFiles();
            
            this.isAudioInitialized = true;
            console.log(`Audio system initialized with play-sound library`);
            console.log(`Detected audio player: ${this.player.player || 'auto-detected'}`);
            console.log(`Player object keys:`, Object.keys(this.player));
            console.log(`Found ${this.availableSoundFiles.size} sound files`);
        } catch (error) {
            console.warn('Failed to initialize audio system:', error);
            this.isAudioInitialized = false;
            this.player = null;
            this.playAsync = null;
        }
    }

    /**
     * Gets optimal player options based on platform for better compatibility
     * @returns Player options object for play-sound
     */
    private getOptimalPlayerOptions(): any {
        const platform = process.platform;
        
        // Return platform-optimized player preferences
        // play-sound will automatically fall back to other players if preferred ones aren't available
        switch (platform) {
            case 'darwin': // macOS
                return { players: ['afplay', 'mplayer', 'mpg123'] };
            case 'win32': // Windows
                return { players: ['powershell', 'mplayer'] };
            case 'linux': // Linux (including WSL)
                return { 
                    players: ['mpg123', 'mpg321', 'play', 'aplay', 'cvlc', 'mplayer', 'ffplay'],
                    // Configure ffplay to run without displaying video window
                    ffplay: ['-nodisp', '-autoexit']
                };
            default:
                // For other platforms, let play-sound auto-detect
                return {};
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
     * Plays an audio file using play-sound library
     * @param soundType Type of sound to play
     */
    private async playAudioFile(soundType: SoundType): Promise<void> {
        if (!this.extensionContext || !this.availableSoundFiles.has(soundType) || !this.player) {
            return;
        }

        const fileName = SOUND_FILES[soundType];
        const filePath = path.join(this.extensionContext.extensionPath, 'assets', 'sounds', fileName);

        try {
            // Get player options with volume control
            const playerOptions = this.getPlayerOptionsForPlayback();
            
            // Debug logging
            console.log(`Playing audio file: ${fileName}`);
            console.log(`Player options:`, JSON.stringify(playerOptions, null, 2));
            console.log(`Detected player: ${this.player.player || 'auto-detected'}`);
            
            // Use callback-based approach with explicit options to ensure flags are passed
            await new Promise<void>((resolve, reject) => {
                this.player.play(filePath, playerOptions, (err: any) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });
        } catch (error) {
            // Enhanced error messages for better debugging
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.warn(`Failed to play ${fileName} with play-sound:`, errorMessage);
            
            // Check if it's a common issue and provide more specific guidance
            if (errorMessage.includes('suitable audio player')) {
                console.warn('Audio player not found. This may occur in WSL2 or headless environments.');
                console.warn('Ensure system audio is properly configured or use visual feedback instead.');
            }
            
            throw error;
        }
    }

    /**
     * Gets player options for individual playback calls with volume control
     * @returns Player options with volume settings for each player type
     */
    private getPlayerOptionsForPlayback(): any {
        const volume = this.config.volume;
        const platform = process.platform;
        
        // Base options with volume control for different players
        const options: any = {};
        
        switch (platform) {
            case 'darwin': // macOS
                break;
            case 'linux': // Linux (including WSL)
                // Configure ffplay with volume and no display
                options.ffplay = ['-nodisp', '-autoexit']; // ffplay volume: 0 to 100
                // For mpg123, volume is 0-32768, but we'll use a more reasonable scale
                break;
            case 'win32': // Windows
                // Windows doesn't have easy volume control for most players
                break;
        }
        
        return options;
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

        // For subtle sounds, play at full volume for now
        // play-sound doesn't have built-in volume control, but it's more reliable than sound-play
        // Volume control would need to be handled at the system level or with additional tools
        try {
            if (this.isAudioInitialized && this.availableSoundFiles.has(soundType)) {
                await this.playAudioFile(soundType);
            } else {
                // Fallback to visual feedback
                await this.showVisualFeedback(soundType);
            }
        } catch (error) {
            console.warn(`Failed to play subtle sound for ${soundType}:`, error);
            // Graceful fallback to visual feedback
            await this.showVisualFeedback(soundType);
        }
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
            `Audio Library: play-sound (Cross-platform)\n` +
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
            `• Check system audio volume\n` +
            `• In WSL2: Ensure PulseAudio is configured\n` +
            `• Linux: Install audio player (mpg123, ffplay, etc.)`;

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
        
        // Clean up play-sound resources
        this.player = null;
        this.playAsync = null;
        
        this.disposables.forEach(disposable => disposable.dispose());
        this.disposables.length = 0;
    }
}
