import * as vscode from 'vscode';
import { GameEngine } from './game/game-engine';
import { SettingsManager } from './config/settings-manager';
import { InputMonitor } from './services/input-monitor';
import { ActionHandler } from './services/action-handler';
import { GamePanelProvider } from './views/game-panel-provider';
import { GameCommands } from './commands/game-commands';
import { SoundManager, SoundType } from './audio/sound-manager';
import { GameState } from './types/game-types';

/**
 * Main extension class that coordinates all components
 */
class RedLightGreenLightExtension {
    private gameEngine: GameEngine | undefined;
    private settingsManager: SettingsManager | undefined;
    private inputMonitor: InputMonitor | undefined;
    private actionHandler: ActionHandler | undefined;
    private gamePanelProvider: GamePanelProvider | undefined;
    private gameCommands: GameCommands | undefined;
    private soundManager: SoundManager | undefined;

    /**
     * Activates the extension
     * @param context Extension context
     */
    public async activate(context: vscode.ExtensionContext): Promise<void> {
        console.log('Red Light Green Light extension is activating...');

        try {
            // Initialize core components
            this.settingsManager = new SettingsManager();
            this.actionHandler = new ActionHandler();
            
            // Create game engine with initial configuration
            const gameConfig = this.settingsManager.toGameConfig();
            this.gameEngine = new GameEngine(gameConfig);

            // Initialize sound manager
            const soundConfig = this.settingsManager.getSettings().soundSettings;
            this.soundManager = new SoundManager(soundConfig);
            this.soundManager.setEnabled(this.settingsManager.getSettings().enableSounds);
            
            // Initialize audio system with extension context
            await this.soundManager.initialize(context);

            // Initialize input monitoring
            this.inputMonitor = new InputMonitor(this.gameEngine);
            this.inputMonitor.updateGracePeriod(this.settingsManager.getSettings().gracePeriod);

            // Set up violation handling
            this.inputMonitor.onViolation(async (event) => {
                if (this.actionHandler) {
                    await this.actionHandler.handleViolation(event);
                }
                // Play violation sound
                if (this.soundManager) {
                    await this.soundManager.playSound(SoundType.Violation);
                }
            });

            // Initialize UI components
            this.gamePanelProvider = new GamePanelProvider(this.gameEngine, this.settingsManager);
            
            // Register the tree data provider for the explorer view
            vscode.window.createTreeView('redLightGreenLightView', {
                treeDataProvider: this.gamePanelProvider,
                showCollapseAll: false
            });

            // Initialize and register commands
            this.gameCommands = new GameCommands(
                this.gameEngine,
                this.settingsManager,
                this.actionHandler
            );
            this.gameCommands.registerCommands(context);

            // Set up settings change handling
            this.settingsManager.onSettingsChange((event) => {
                if (this.gameEngine) {
                    const newGameConfig = this.settingsManager!.toGameConfig();
                    this.gameEngine.updateConfig(newGameConfig);
                }
                
                // Update sound manager configuration
                if (this.soundManager) {
                    const newSettings = this.settingsManager!.getSettings();
                    this.soundManager.updateConfig(newSettings.soundSettings);
                    this.soundManager.setEnabled(newSettings.enableSounds);
                }
                
                // Update input monitor grace period
                if (this.inputMonitor) {
                    const newSettings = this.settingsManager!.getSettings();
                    this.inputMonitor.updateGracePeriod(newSettings.gracePeriod);
                }
            });

            // Set up game state change handling
            this.gameEngine.onStateChange(async (event) => {
                // Start/stop input monitoring based on game state
                if (this.inputMonitor) {
                    if (this.gameEngine!.isActive()) {
                        this.inputMonitor.startMonitoring();
                    } else {
                        this.inputMonitor.stopMonitoring();
                    }
                }
                
                // Play sound for state changes
                if (this.soundManager) {
                    if (event.currentState === GameState.RedLight && event.previousState === GameState.GreenLight) {
                        await this.soundManager.playSound(SoundType.RedLight);
                    } else if (event.currentState === GameState.GreenLight && event.previousState === GameState.RedLight) {
                        await this.soundManager.playSound(SoundType.GreenLight);
                    } else if (event.currentState === GameState.GreenLight && event.previousState === GameState.Stopped) {
                        await this.soundManager.playSound(SoundType.GameStart);
                    } else if (event.currentState === GameState.Stopped && event.previousState !== GameState.Stopped) {
                        await this.soundManager.playSound(SoundType.GameStop);
                    }
                }
            });

            // Register all disposables with the extension context
            context.subscriptions.push(
                this.gameEngine,
                this.settingsManager,
                this.inputMonitor,
                this.actionHandler,
                this.gamePanelProvider,
                this.gameCommands,
                this.soundManager
            );

            console.log('Red Light Green Light extension activated successfully!');

        } catch (error) {
            console.error('Failed to activate Red Light Green Light extension:', error);
            vscode.window.showErrorMessage(
                `Failed to activate Red Light Green Light extension: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    /**
     * Deactivates the extension
     */
    public deactivate(): void {
        console.log('Red Light Green Light extension is deactivating...');
        
        // Stop the game if it's running
        if (this.gameEngine?.isActive()) {
            this.gameEngine.stop();
        }

        // Components will be disposed by VSCode through the context subscriptions
        console.log('Red Light Green Light extension deactivated.');
    }
}

// Extension instance
let extensionInstance: RedLightGreenLightExtension;

/**
 * Called when the extension is activated
 * @param context Extension context
 */
export function activate(context: vscode.ExtensionContext) {
    extensionInstance = new RedLightGreenLightExtension();
    return extensionInstance.activate(context);
}

/**
 * Called when the extension is deactivated
 */
export function deactivate() {
    if (extensionInstance) {
        extensionInstance.deactivate();
    }
}
