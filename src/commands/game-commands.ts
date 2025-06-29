import * as vscode from 'vscode';
import { GameEngine } from '../game/game-engine';
import { SettingsManager } from '../config/settings-manager';
import { ActionHandler } from '../services/action-handler';
import { GameState } from '../types/game-types';

/**
 * Implements game commands for the Red Light Green Light extension
 */
export class GameCommands implements vscode.Disposable {
    private gameEngine: GameEngine;
    private settingsManager: SettingsManager;
    private actionHandler: ActionHandler;
    private disposables: vscode.Disposable[] = [];

    /**
     * Creates a new GameCommands instance
     * @param gameEngine Game engine instance
     * @param settingsManager Settings manager instance
     * @param actionHandler Action handler instance
     */
    constructor(
        gameEngine: GameEngine,
        settingsManager: SettingsManager,
        actionHandler: ActionHandler
    ) {
        this.gameEngine = gameEngine;
        this.settingsManager = settingsManager;
        this.actionHandler = actionHandler;
    }

    /**
     * Registers all game commands
     * @param context Extension context
     */
    public registerCommands(context: vscode.ExtensionContext): void {
        // Register start game command
        const startCommand = vscode.commands.registerCommand(
            'redLightGreenLight.startGame',
            this.startGame.bind(this)
        );
        context.subscriptions.push(startCommand);
        this.disposables.push(startCommand);

        // Register stop game command
        const stopCommand = vscode.commands.registerCommand(
            'redLightGreenLight.stopGame',
            this.stopGame.bind(this)
        );
        context.subscriptions.push(stopCommand);
        this.disposables.push(stopCommand);

        // Register toggle game command
        const toggleCommand = vscode.commands.registerCommand(
            'redLightGreenLight.toggleGame',
            this.toggleGame.bind(this)
        );
        context.subscriptions.push(toggleCommand);
        this.disposables.push(toggleCommand);

        // Register reset settings command
        const resetSettingsCommand = vscode.commands.registerCommand(
            'redLightGreenLight.resetSettings',
            this.resetSettings.bind(this)
        );
        context.subscriptions.push(resetSettingsCommand);
        this.disposables.push(resetSettingsCommand);

        // Register show stats command
        const showStatsCommand = vscode.commands.registerCommand(
            'redLightGreenLight.showStats',
            this.showGameStats.bind(this)
        );
        context.subscriptions.push(showStatsCommand);
        this.disposables.push(showStatsCommand);

        // Register test actions command (for development)
        const testActionsCommand = vscode.commands.registerCommand(
            'redLightGreenLight.testActions',
            this.testActions.bind(this)
        );
        context.subscriptions.push(testActionsCommand);
        this.disposables.push(testActionsCommand);
    }

    /**
     * Starts the Red Light Green Light game
     */
    public async startGame(): Promise<void> {
        try {
            // Validate settings before starting
            const validation = this.settingsManager.validateSettings();
            if (!validation.isValid) {
                await vscode.window.showErrorMessage(
                    `Cannot start game due to invalid settings:\n${validation.errors.join('\n')}`,
                    'Open Settings'
                ).then(choice => {
                    if (choice === 'Open Settings') {
                        vscode.commands.executeCommand('workbench.action.openSettings', 'redLightGreenLight');
                    }
                });
                return;
            }

            // Show warnings if any
            if (validation.warnings.length > 0) {
                const choice = await vscode.window.showWarningMessage(
                    `Game settings warnings:\n${validation.warnings.join('\n')}\n\nContinue anyway?`,
                    'Yes, Start Game',
                    'Cancel'
                );
                
                if (choice !== 'Yes, Start Game') {
                    return;
                }
            }

            // Check if game is already running
            if (this.gameEngine.isActive()) {
                await vscode.window.showWarningMessage('Game is already running!');
                return;
            }

            // Update game config from current settings
            const gameConfig = this.settingsManager.toGameConfig();
            this.gameEngine.updateConfig(gameConfig);

            // Start the game
            this.gameEngine.start();

            // Show start notification
            await vscode.window.showInformationMessage(
                '🟢 Red Light Green Light game started! Watch for the lights and type only during GREEN phases.',
                'Got it!'
            );

        } catch (error) {
            console.error('Error starting game:', error);
            await vscode.window.showErrorMessage(
                `Failed to start game: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    /**
     * Stops the Red Light Green Light game
     */
    public async stopGame(): Promise<void> {
        try {
            if (!this.gameEngine.isActive()) {
                await vscode.window.showInformationMessage('Game is not currently running.');
                return;
            }

            // Stop the game
            this.gameEngine.stop();

            // Show session summary
            const sessionDuration = Math.round(this.gameEngine.getSessionDuration() / 1000);
            const violationCount = this.actionHandler.getViolationCount();
            
            const summaryMessage = `Game stopped!\n\n` +
                                 `Session Duration: ${Math.floor(sessionDuration / 60)}:${(sessionDuration % 60).toString().padStart(2, '0')}\n` +
                                 `Red Light Violations: ${violationCount}`;

            await vscode.window.showInformationMessage(summaryMessage, 'Close');

            // Reset violation count for next session
            this.actionHandler.resetViolationCount();

        } catch (error) {
            console.error('Error stopping game:', error);
            await vscode.window.showErrorMessage(
                `Failed to stop game: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    /**
     * Toggles the game state (start if stopped, stop if running)
     */
    public async toggleGame(): Promise<void> {
        if (this.gameEngine.isActive()) {
            await this.stopGame();
        } else {
            await this.startGame();
        }
    }

    /**
     * Resets all settings to default values
     */
    public async resetSettings(): Promise<void> {
        try {
            const choice = await vscode.window.showWarningMessage(
                'Are you sure you want to reset all Red Light Green Light settings to default values?',
                'Yes, Reset',
                'Cancel'
            );

            if (choice === 'Yes, Reset') {
                await this.settingsManager.resetToDefaults();
                await vscode.window.showInformationMessage('Settings have been reset to default values.');
            }

        } catch (error) {
            console.error('Error resetting settings:', error);
            await vscode.window.showErrorMessage(
                `Failed to reset settings: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    /**
     * Shows game statistics and information
     */
    public async showGameStats(): Promise<void> {
        try {
            const currentState = this.gameEngine.getCurrentState();
            const isActive = this.gameEngine.isActive();
            const remainingTime = this.gameEngine.getRemainingTime();
            const sessionDuration = Math.round(this.gameEngine.getSessionDuration() / 1000);
            const violationCount = this.actionHandler.getViolationCount();
            const settings = this.settingsManager.getDisplaySettings();

            let statsMessage = '📊 Red Light Green Light - Game Statistics\n\n';
            
            // Current game state
            statsMessage += `Current State: ${this.formatGameState(currentState)}\n`;
            statsMessage += `Game Active: ${isActive ? 'Yes' : 'No'}\n`;
            
            if (isActive) {
                statsMessage += `Remaining Time: ${remainingTime} seconds\n`;
                statsMessage += `Session Duration: ${Math.floor(sessionDuration / 60)}:${(sessionDuration % 60).toString().padStart(2, '0')}\n`;
            }
            
            statsMessage += `Violations This Session: ${violationCount}\n\n`;
            
            // Current settings
            statsMessage += '⚙️ Current Settings:\n';
            for (const [key, value] of Object.entries(settings)) {
                statsMessage += `• ${key}: ${value}\n`;
            }

            await vscode.window.showInformationMessage(statsMessage, 'Close');

        } catch (error) {
            console.error('Error showing game stats:', error);
            await vscode.window.showErrorMessage(
                `Failed to show game stats: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    /**
     * Tests different action types (for development and debugging)
     */
    public async testActions(): Promise<void> {
        try {
            const actionChoice = await vscode.window.showQuickPick([
                { label: 'Test Warning Action', description: 'Shows a warning message', value: 'warn' },
                { label: 'Test Block Action', description: 'Shows blocking dialog', value: 'block' },
                { label: 'Test Close Action', description: 'WARNING: Will attempt to close IDE', value: 'close' }
            ], {
                placeHolder: 'Select an action to test'
            });

            if (!actionChoice) {
                return;
            }

            if (actionChoice.value === 'close') {
                const confirmChoice = await vscode.window.showWarningMessage(
                    'Are you sure you want to test the close action? This will attempt to close VSCode!',
                    'Yes, Test Close',
                    'Cancel'
                );
                
                if (confirmChoice !== 'Yes, Test Close') {
                    return;
                }
            }

            await this.actionHandler.testAction(actionChoice.value as any);

        } catch (error) {
            console.error('Error testing actions:', error);
            await vscode.window.showErrorMessage(
                `Failed to test action: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    /**
     * Gets the current game status for external use
     * @returns Game status information
     */
    public getGameStatus(): {
        isActive: boolean;
        currentState: GameState;
        remainingTime: number;
        sessionDuration: number;
    } {
        return {
            isActive: this.gameEngine.isActive(),
            currentState: this.gameEngine.getCurrentState(),
            remainingTime: this.gameEngine.getRemainingTime(),
            sessionDuration: this.gameEngine.getSessionDuration()
        };
    }

    /**
     * Formats game state for display
     * @param state Game state
     * @returns Formatted state string
     */
    private formatGameState(state: GameState): string {
        switch (state) {
            case GameState.Stopped:
                return 'Stopped';
            case GameState.RedLight:
                return '🔴 Red Light';
            case GameState.GreenLight:
                return '🟢 Green Light';
            default:
                return 'Unknown';
        }
    }

    /**
     * Disposes of the game commands and cleans up resources
     */
    public dispose(): void {
        this.disposables.forEach(disposable => disposable.dispose());
        this.disposables.length = 0;
    }
}
