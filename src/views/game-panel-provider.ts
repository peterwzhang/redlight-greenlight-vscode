import * as vscode from 'vscode';
import { GameEngine } from '../game/game-engine';
import { GameState, GameStateChangeEvent } from '../types/game-types';
import { SettingsManager } from '../config/settings-manager';

/**
 * Tree item for the game panel
 */
export class GamePanelItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly command?: vscode.Command,
        public readonly iconPath?: vscode.ThemeIcon | string,
        public readonly tooltip?: string,
        public readonly contextValue?: string
    ) {
        super(label, collapsibleState);
        this.command = command;
        this.iconPath = iconPath;
        this.tooltip = tooltip;
        this.contextValue = contextValue;
    }
}

/**
 * Provides data for the Red Light Green Light explorer panel
 */
export class GamePanelProvider implements vscode.TreeDataProvider<GamePanelItem>, vscode.Disposable {
    private _onDidChangeTreeData: vscode.EventEmitter<GamePanelItem | undefined | null | void> = new vscode.EventEmitter<GamePanelItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<GamePanelItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private gameEngine: GameEngine;
    private settingsManager: SettingsManager;
    private disposables: vscode.Disposable[] = [];

    /**
     * Creates a new GamePanelProvider instance
     * @param gameEngine Game engine instance
     * @param settingsManager Settings manager instance
     */
    constructor(gameEngine: GameEngine, settingsManager: SettingsManager) {
        this.gameEngine = gameEngine;
        this.settingsManager = settingsManager;
        this.setupGameEngineListeners();
    }

    /**
     * Gets tree item representation
     * @param element Tree item element
     * @returns Tree item
     */
    getTreeItem(element: GamePanelItem): vscode.TreeItem {
        return element;
    }

    /**
     * Gets children of a tree item
     * @param element Parent element (undefined for root)
     * @returns Array of child items
     */
    getChildren(element?: GamePanelItem): Thenable<GamePanelItem[]> {
        if (!element) {
            // Root level items
            return Promise.resolve(this.getRootItems());
        }
        
        // No nested items for now
        return Promise.resolve([]);
    }

    /**
     * Refreshes the tree view
     */
    public refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    /**
     * Gets the root level items for the tree
     * @returns Array of root items
     */
    private getRootItems(): GamePanelItem[] {
        const items: GamePanelItem[] = [];
        
        // Game status item
        items.push(this.createGameStatusItem());
        
        // Control buttons
        if (this.gameEngine.getCurrentState() === GameState.Stopped) {
            items.push(this.createStartButton());
        } else {
            items.push(this.createStopButton());
        }
        
        // Current phase and timer (if game is active)
        if (this.gameEngine.isActive()) {
            items.push(this.createCurrentPhaseItem());
            
            // Only show timer if setting is enabled
            if (this.settingsManager.getSettings().showTimer) {
                items.push(this.createTimerItem());
            }
        }
        
        // Settings shortcut
        items.push(this.createSettingsItem());
        
        return items;
    }

    /**
     * Creates the game status item
     * @returns Game status tree item
     */
    private createGameStatusItem(): GamePanelItem {
        const currentState = this.gameEngine.getCurrentState();
        let label: string;
        let icon: vscode.ThemeIcon;
        let tooltip: string;
        
        switch (currentState) {
            case GameState.Stopped:
                label = 'Game Stopped';
                icon = new vscode.ThemeIcon('circle-outline');
                tooltip = 'The Red Light Green Light game is not running';
                break;
            case GameState.RedLight:
                label = '🔴 RED LIGHT - Stop Typing!';
                icon = new vscode.ThemeIcon('error');
                tooltip = 'RED LIGHT: Do not type or make changes!';
                break;
            case GameState.GreenLight:
                label = '🟢 GREEN LIGHT - Type Away!';
                icon = new vscode.ThemeIcon('check');
                tooltip = 'GREEN LIGHT: You can type and make changes';
                break;
            default:
                label = 'Unknown State';
                icon = new vscode.ThemeIcon('question');
                tooltip = 'Game is in an unknown state';
        }
        
        return new GamePanelItem(
            label,
            vscode.TreeItemCollapsibleState.None,
            undefined,
            icon,
            tooltip,
            'gameStatus'
        );
    }

    /**
     * Creates the start game button
     * @returns Start button tree item
     */
    private createStartButton(): GamePanelItem {
        return new GamePanelItem(
            'Start Game',
            vscode.TreeItemCollapsibleState.None,
            {
                command: 'redLightGreenLight.startGame',
                title: 'Start Game'
            },
            new vscode.ThemeIcon('play'),
            'Click to start the Red Light Green Light game',
            'startButton'
        );
    }

    /**
     * Creates the stop game button
     * @returns Stop button tree item
     */
    private createStopButton(): GamePanelItem {
        return new GamePanelItem(
            'Stop Game',
            vscode.TreeItemCollapsibleState.None,
            {
                command: 'redLightGreenLight.stopGame',
                title: 'Stop Game'
            },
            new vscode.ThemeIcon('stop'),
            'Click to stop the Red Light Green Light game',
            'stopButton'
        );
    }

    /**
     * Creates the current phase display item
     * @returns Current phase tree item
     */
    private createCurrentPhaseItem(): GamePanelItem {
        const currentState = this.gameEngine.getCurrentState();
        const phaseText = currentState === GameState.RedLight ? 'Red Light Phase' : 'Green Light Phase';
        const icon = currentState === GameState.RedLight 
            ? new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('errorForeground'))
            : new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('terminal.ansiGreen'));
        
        return new GamePanelItem(
            phaseText,
            vscode.TreeItemCollapsibleState.None,
            undefined,
            icon,
            `Currently in ${phaseText.toLowerCase()}`,
            'currentPhase'
        );
    }

    /**
     * Creates the timer display item
     * @returns Timer tree item
     */
    private createTimerItem(): GamePanelItem {
        const remainingTime = this.gameEngine.getRemainingTime();
        const minutes = Math.floor(remainingTime / 60);
        const seconds = remainingTime % 60;
        const timeText = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        return new GamePanelItem(
            `Time Remaining: ${timeText}`,
            vscode.TreeItemCollapsibleState.None,
            undefined,
            new vscode.ThemeIcon('clock'),
            `${remainingTime} seconds remaining in current phase`,
            'timer'
        );
    }

    /**
     * Creates the settings shortcut item
     * @returns Settings tree item
     */
    private createSettingsItem(): GamePanelItem {
        return new GamePanelItem(
            'Game Settings',
            vscode.TreeItemCollapsibleState.None,
            {
                command: 'workbench.action.openSettings',
                title: 'Open Settings',
                arguments: ['redLightGreenLight']
            },
            new vscode.ThemeIcon('settings-gear'),
            'Open Red Light Green Light settings',
            'settings'
        );
    }

    /**
     * Sets up listeners for game engine events
     */
    private setupGameEngineListeners(): void {
        const stateChangeDisposable = this.gameEngine.onStateChange(
            (event: GameStateChangeEvent) => {
                this.refresh();
            }
        );
        this.disposables.push(stateChangeDisposable);

        // Listen for settings changes to refresh panel when timer visibility changes
        const settingsChangeDisposable = this.settingsManager.onSettingsChange(() => {
            this.refresh();
        });
        this.disposables.push(settingsChangeDisposable);
    }

    /**
     * Creates a welcome view when no game is running (alternative approach)
     */
    public createWelcomeView(): GamePanelItem[] {
        return [
            new GamePanelItem(
                'Welcome to Red Light Green Light!',
                vscode.TreeItemCollapsibleState.None,
                undefined,
                new vscode.ThemeIcon('info'),
                'Welcome to the Red Light Green Light typing game',
                'welcome'
            ),
            new GamePanelItem(
                'Click Start Game to begin',
                vscode.TreeItemCollapsibleState.None,
                {
                    command: 'redLightGreenLight.startGame',
                    title: 'Start Game'
                },
                new vscode.ThemeIcon('play'),
                'Start your first game session',
                'welcomeStart'
            ),
            new GamePanelItem(
                'Configure Settings',
                vscode.TreeItemCollapsibleState.None,
                {
                    command: 'workbench.action.openSettings',
                    title: 'Open Settings',
                    arguments: ['redLightGreenLight']
                },
                new vscode.ThemeIcon('settings-gear'),
                'Configure game timing and behavior',
                'welcomeSettings'
            )
        ];
    }

    /**
     * Handles tree item selection
     * @param item Selected tree item
     */
    public onTreeItemSelected(item: GamePanelItem): void {
        // Handle custom logic for tree item selection if needed
        console.log(`Tree item selected: ${item.label}`);
    }

    /**
     * Disposes of the game panel provider and cleans up resources
     */
    public dispose(): void {
        this.disposables.forEach(disposable => disposable.dispose());
        this.disposables.length = 0;
        this._onDidChangeTreeData.dispose();
    }
}
