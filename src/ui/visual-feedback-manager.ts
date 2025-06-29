import * as vscode from 'vscode';
import { GameState, GameStateChangeEvent } from '../types/game-types';

/**
 * Visual feedback types for different game events
 */
export enum VisualFeedbackType {
    RedLightStart = 'redLightStart',
    GreenLightStart = 'greenLightStart',
    Violation = 'violation',
    GameStart = 'gameStart',
    GameStop = 'gameStop'
}

/**
 * Manages visual feedback for game state changes
 */
export class VisualFeedbackManager implements vscode.Disposable {
    private isEnabled: boolean = true;
    private statusBarItem: vscode.StatusBarItem | undefined;
    private decorationType: vscode.TextEditorDecorationType | undefined;
    private disposables: vscode.Disposable[] = [];
    private currentState: GameState = GameState.Stopped;
    private activeDecorations: vscode.TextEditorDecorationType[] = [];
    private feedbackInProgress: boolean = false;

    /**
     * Creates a new VisualFeedbackManager instance
     */
    constructor() {
        this.initializeStatusBar();
        this.initializeDecorations();
    }

    /**
     * Enables or disables visual feedback
     * @param enabled Whether visual feedback should be enabled
     */
    public setEnabled(enabled: boolean): void {
        this.isEnabled = enabled;
        if (!enabled) {
            this.clearAllFeedback();
        }
    }

    /**
     * Handles game state changes with visual feedback
     * @param event Game state change event
     */
    public handleStateChange(event: GameStateChangeEvent): void {
        if (!this.isEnabled) {
            return;
        }

        // Prevent overlapping feedback
        if (this.feedbackInProgress) {
            this.updateStatusBar(event);
            return;
        }

        this.currentState = event.currentState;
        
        // Update status bar immediately (non-blocking)
        this.updateStatusBar(event);
        
        // Clear any existing highlights first
        this.clearAllHighlights();
        
        // Show immediate feedback for state transitions (non-blocking)
        this.showImmediateFeedback(event);
    }

    /**
     * Shows immediate visual feedback without waiting
     * @param event Game state change event
     */
    private showImmediateFeedback(event: GameStateChangeEvent): void {
        if (event.currentState === GameState.RedLight && event.previousState === GameState.GreenLight) {
            this.showRedLightFeedback();
        } else if (event.currentState === GameState.GreenLight && event.previousState === GameState.RedLight) {
            this.showGreenLightFeedback();
        } else if (event.currentState === GameState.GreenLight && event.previousState === GameState.Stopped) {
            this.showGameStartFeedback();
        } else if (event.currentState === GameState.Stopped && event.previousState !== GameState.Stopped) {
            this.showGameStopFeedback();
        }
    }

    /**
     * Shows visual feedback for violations
     */
    public showViolationFeedback(): void {
        if (!this.isEnabled || this.feedbackInProgress) {
            return;
        }
        
        this.showViolationFeedbackImmediate();
    }

    /**
     * Shows immediate red light feedback
     */
    private showRedLightFeedback(): void {
        // Show status message immediately
        vscode.window.setStatusBarMessage('🔴 RED LIGHT - STOP TYPING!', 1000);
        
        // Highlight editors immediately
        this.highlightEditorsImmediate('red');
        
        // Show brief notification (don't wait for it)
        vscode.window.showErrorMessage('🔴 RED LIGHT - STOP TYPING!').then(() => {
            setTimeout(() => vscode.commands.executeCommand('notifications.clearAll'), 800);
        });
    }

    /**
     * Shows immediate green light feedback
     */
    private showGreenLightFeedback(): void {
        // Clear any red highlighting first
        this.clearAllHighlights();
        
        // Show status message immediately
        vscode.window.setStatusBarMessage('🟢 GREEN LIGHT - Type Away!', 600);
        
        // Show brief notification (don't wait for it)
        vscode.window.showInformationMessage('🟢 GREEN LIGHT - Type Away!').then(() => {
            setTimeout(() => vscode.commands.executeCommand('notifications.clearAll'), 500);
        });
    }

    /**
     * Shows immediate game start feedback
     */
    private showGameStartFeedback(): void {
        vscode.window.setStatusBarMessage('🎮 Game Started!', 800);
        vscode.window.showInformationMessage('🎮 Game Started!').then(() => {
            setTimeout(() => vscode.commands.executeCommand('notifications.clearAll'), 600);
        });
    }

    /**
     * Shows immediate game stop feedback
     */
    private showGameStopFeedback(): void {
        this.clearAllHighlights();
        vscode.window.setStatusBarMessage('🛑 Game Stopped', 600);
        vscode.window.showInformationMessage('🛑 Game Stopped').then(() => {
            setTimeout(() => vscode.commands.executeCommand('notifications.clearAll'), 500);
        });
    }

    /**
     * Shows immediate violation feedback
     */
    private showViolationFeedbackImmediate(): void {
        // Flash status bar immediately
        vscode.window.setStatusBarMessage('🔴 VIOLATION!', 2000);
        
        // Highlight all editors with violation style
        this.highlightEditorsImmediate('violation');
        
        // Show error notification (don't wait)
        vscode.window.showErrorMessage('⚠️ RED LIGHT VIOLATION!').then(() => {
            setTimeout(() => vscode.commands.executeCommand('notifications.clearAll'), 1200);
        });
        
        // Create flashing status bar item
        const flashItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 1000);
        flashItem.text = '🔴 VIOLATION!';
        flashItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
        flashItem.show();
        
        setTimeout(() => flashItem.dispose(), 2000);
    }

    /**
     * Highlights editors immediately without async operations
     * @param type Highlight type
     */
    private highlightEditorsImmediate(type: 'red' | 'green' | 'violation'): void {
        const editors = vscode.window.visibleTextEditors;
        
        // Clear any existing highlights first
        this.clearActiveDecorations();
        
        // Create new decoration type
        const decorationType = this.createDecorationForType(type);
        this.activeDecorations.push(decorationType);
        
        editors.forEach((editor, index) => {
            try {
                const document = editor.document;
                
                // Skip non-text documents
                if (document.uri.scheme !== 'file' && document.uri.scheme !== 'untitled') {
                    return;
                }
                
                // Get visible range instead of full document for better performance
                const visibleRange = editor.visibleRanges[0];
                if (!visibleRange) {
                    return;
                }
                
                // Apply decoration to visible area
                editor.setDecorations(decorationType, [visibleRange]);
                
            } catch (error) {
                console.warn(`Failed to highlight editor ${index}:`, error);
            }
        });
        
        // Set timeout to clear highlights
        const timeout = type === 'violation' ? 2000 : 1000;
        setTimeout(() => {
            this.clearDecorationFromAllEditors(decorationType);
            this.removeFromActiveDecorations(decorationType);
        }, timeout);
    }

    /**
     * Updates the remaining time display
     * @param remainingTime Remaining time in seconds
     */
    public updateTimer(remainingTime: number): void {
        if (!this.isEnabled || !this.statusBarItem) {
            return;
        }

        const minutes = Math.floor(remainingTime / 60);
        const seconds = remainingTime % 60;
        const timeText = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        const stateIcon = this.getStateIcon(this.currentState);
        this.statusBarItem.text = `${stateIcon} ${timeText}`;
    }

    /**
     * Initializes the status bar item
     */
    private initializeStatusBar(): void {
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right, 
            100
        );
        this.statusBarItem.command = 'redLightGreenLight.toggleGame';
        this.statusBarItem.tooltip = 'Click to toggle Red Light Green Light game';
        this.disposables.push(this.statusBarItem);
    }

    /**
     * Initializes text editor decorations
     */
    private initializeDecorations(): void {
        // Create decoration type for highlighting during red light
        this.decorationType = vscode.window.createTextEditorDecorationType({
            backgroundColor: 'rgba(255, 0, 0, 0.1)',
            border: '2px solid rgba(255, 0, 0, 0.3)',
            borderRadius: '3px'
        });
        this.disposables.push(this.decorationType);
    }

    /**
     * Updates the status bar based on game state
     * @param event Game state change event
     */
    private updateStatusBar(event: GameStateChangeEvent): void {
        if (!this.statusBarItem) {
            return;
        }

        const stateIcon = this.getStateIcon(event.currentState);
        const stateText = this.getStateText(event.currentState);
        
        this.statusBarItem.text = `${stateIcon} ${stateText}`;
        this.statusBarItem.backgroundColor = this.getStatusBarColor(event.currentState);
        
        if (event.currentState !== GameState.Stopped) {
            this.statusBarItem.show();
        } else {
            this.statusBarItem.hide();
        }
    }

    /**
     * Shows visual feedback for specific events
     * @param feedbackType Type of visual feedback to show
     */
    private async showVisualFeedback(feedbackType: VisualFeedbackType): Promise<void> {
        console.log(`Showing visual feedback for: ${feedbackType}`);
        
        switch (feedbackType) {
            case VisualFeedbackType.RedLightStart:
                console.log('Executing red light visual feedback');
                await this.showNotificationFlash('🔴 RED LIGHT - STOP TYPING!', 'error', 1000);
                await this.highlightAllOpenEditors('red');
                break;
            case VisualFeedbackType.GreenLightStart:
                console.log('Executing green light visual feedback');
                await this.showNotificationFlash('🟢 GREEN LIGHT - Type Away!', 'info', 600);
                await this.clearAllHighlights();
                break;
            case VisualFeedbackType.Violation:
                console.log('Executing violation visual feedback');
                await this.showNotificationFlash('⚠️ RED LIGHT VIOLATION!', 'error', 1500);
                await this.highlightAllOpenEditors('violation');
                await this.flashStatusBar('🔴 VIOLATION!', 2000);
                break;
            case VisualFeedbackType.GameStart:
                console.log('Executing game start visual feedback');
                await this.showNotificationFlash('🎮 Game Started!', 'info', 800);
                break;
            case VisualFeedbackType.GameStop:
                console.log('Executing game stop visual feedback');
                await this.showNotificationFlash('🛑 Game Stopped', 'info', 600);
                await this.clearAllHighlights();
                break;
        }
    }

    /**
     * Shows notification-based flash effect
     * @param message Message to display
     * @param type Notification type
     * @param duration Duration in milliseconds
     */
    private async showNotificationFlash(message: string, type: 'info' | 'warn' | 'error', duration: number): Promise<void> {
        // Show notification briefly
        let notificationPromise: Thenable<string | undefined>;
        
        switch (type) {
            case 'error':
                notificationPromise = vscode.window.showErrorMessage(message);
                break;
            case 'warn':
                notificationPromise = vscode.window.showWarningMessage(message);
                break;
            default:
                notificationPromise = vscode.window.showInformationMessage(message);
                break;
        }

        // Auto-dismiss notification after duration
        setTimeout(() => {
            vscode.commands.executeCommand('notifications.clearAll');
        }, duration);

        return notificationPromise.then(() => {});
    }

    /**
     * Highlights all open editors with a colored border
     * @param type Highlight type
     */
    private async highlightAllOpenEditors(type: 'red' | 'green' | 'violation'): Promise<void> {
        const editors = vscode.window.visibleTextEditors;
        console.log(`Highlighting ${editors.length} visible editors with type: ${type}`);
        
        // Create decoration type based on highlight type
        const decorationType = this.createDecorationForType(type);
        
        editors.forEach((editor, index) => {
            try {
                const document = editor.document;
                console.log(`Processing editor ${index}: ${document.uri.scheme}:${document.fileName || 'untitled'}`);
                
                // Skip certain document types
                if (document.uri.scheme !== 'file' && document.uri.scheme !== 'untitled') {
                    console.log(`Skipping editor with scheme: ${document.uri.scheme}`);
                    return;
                }
                
                // Get the full document range
                const fullRange = new vscode.Range(
                    document.positionAt(0),
                    document.positionAt(document.getText().length)
                );
                
                console.log(`Applying ${type} decoration to editor ${index}, range: ${fullRange.start.line}-${fullRange.end.line}`);
                
                // Apply decoration to entire document
                editor.setDecorations(decorationType, [fullRange]);
                
                // Clear decoration after timeout
                const timeout = type === 'violation' ? 2000 : 1000;
                setTimeout(() => {
                    try {
                        console.log(`Clearing ${type} decoration from editor ${index}`);
                        editor.setDecorations(decorationType, []);
                    } catch (error) {
                        console.warn('Editor might be closed, ignoring clear error:', error);
                    }
                }, timeout);
                
            } catch (error) {
                console.warn(`Failed to highlight editor ${index}:`, error);
            }
        });
        
        // Dispose decoration type after use
        setTimeout(() => {
            decorationType.dispose();
        }, type === 'violation' ? 2500 : 1500);
    }

    /**
     * Creates decoration type for highlight effects
     * @param type Highlight type
     * @returns Decoration type
     */
    private createDecorationForType(type: 'red' | 'green' | 'violation'): vscode.TextEditorDecorationType {
        switch (type) {
            case 'red':
                return vscode.window.createTextEditorDecorationType({
                    backgroundColor: 'rgba(255, 0, 0, 0.05)',
                    border: '2px solid rgba(255, 0, 0, 0.3)',
                    borderRadius: '2px',
                    isWholeLine: false
                });
            case 'green':
                return vscode.window.createTextEditorDecorationType({
                    backgroundColor: 'rgba(0, 255, 0, 0.05)',
                    border: '2px solid rgba(0, 255, 0, 0.3)',
                    borderRadius: '2px',
                    isWholeLine: false
                });
            case 'violation':
                return vscode.window.createTextEditorDecorationType({
                    backgroundColor: 'rgba(255, 0, 0, 0.15)',
                    border: '3px solid rgba(255, 0, 0, 0.6)',
                    borderRadius: '3px',
                    isWholeLine: false,
                    after: {
                        contentText: ' 🔴 RED LIGHT VIOLATION!',
                        color: 'rgba(255, 0, 0, 0.8)',
                        fontWeight: 'bold'
                    }
                });
            default:
                return vscode.window.createTextEditorDecorationType({});
        }
    }

    /**
     * Clears all highlighting from editors
     */
    private clearAllHighlights(): void {
        this.clearActiveDecorations();
    }

    /**
     * Clears all active decorations
     */
    private clearActiveDecorations(): void {
        this.activeDecorations.forEach(decoration => {
            this.clearDecorationFromAllEditors(decoration);
            decoration.dispose();
        });
        this.activeDecorations = [];
    }

    /**
     * Clears a specific decoration type from all editors
     * @param decorationType Decoration type to clear
     */
    private clearDecorationFromAllEditors(decorationType: vscode.TextEditorDecorationType): void {
        vscode.window.visibleTextEditors.forEach(editor => {
            try {
                editor.setDecorations(decorationType, []);
            } catch (error) {
                // Editor might be closed, ignore error
            }
        });
    }

    /**
     * Removes a decoration from the active decorations list
     * @param decorationType Decoration type to remove
     */
    private removeFromActiveDecorations(decorationType: vscode.TextEditorDecorationType): void {
        const index = this.activeDecorations.indexOf(decorationType);
        if (index > -1) {
            this.activeDecorations.splice(index, 1);
            decorationType.dispose();
        }
    }

    /**
     * Flashes the status bar with a message
     * @param message Message to display
     * @param duration Duration in milliseconds
     */
    private async flashStatusBar(message: string, duration: number): Promise<void> {
        // Create temporary status bar item for flashing
        const flashItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 1000);
        flashItem.text = message;
        flashItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
        flashItem.show();
        
        // Remove after duration
        setTimeout(() => {
            flashItem.dispose();
        }, duration);
    }

    /**
     * Gets the appropriate icon for a game state
     * @param state Game state
     * @returns State icon
     */
    private getStateIcon(state: GameState): string {
        switch (state) {
            case GameState.RedLight:
                return '🔴';
            case GameState.GreenLight:
                return '🟢';
            case GameState.Stopped:
                return '⏹️';
            default:
                return '❓';
        }
    }

    /**
     * Gets the text description for a game state
     * @param state Game state
     * @returns State text
     */
    private getStateText(state: GameState): string {
        switch (state) {
            case GameState.RedLight:
                return 'RED LIGHT';
            case GameState.GreenLight:
                return 'GREEN LIGHT';
            case GameState.Stopped:
                return 'Game Stopped';
            default:
                return 'Unknown';
        }
    }

    /**
     * Gets the status bar background color for a state
     * @param state Game state
     * @returns Status bar color
     */
    private getStatusBarColor(state: GameState): vscode.ThemeColor | undefined {
        switch (state) {
            case GameState.RedLight:
                return new vscode.ThemeColor('statusBarItem.errorBackground');
            case GameState.GreenLight:
                return new vscode.ThemeColor('statusBarItem.prominentBackground');
            default:
                return undefined;
        }
    }

    /**
     * Clears all visual feedback
     */
    private clearAllFeedback(): void {
        if (this.statusBarItem) {
            this.statusBarItem.hide();
        }
        
        // Clear editor decorations
        this.clearAllHighlights();
    }

    /**
     * Shows help information about visual feedback
     */
    public async showVisualFeedbackHelp(): Promise<void> {
        const helpMessage = 
            'Visual Feedback Features:\n\n' +
            '🔴 Red Light: Status bar highlight, brief editor flash on violations\n' +
            '🟢 Green Light: Status bar indicator, brief positive flash\n' +
            '⏱️ Timer: Real-time countdown in status bar\n' +
            '🎮 Game Events: Visual indicators for start/stop\n\n' +
            'Visual feedback can be disabled in extension settings if you prefer a quieter experience.';

        await vscode.window.showInformationMessage(helpMessage, 'Got it');
    }

    /**
     * Disposes of the visual feedback manager and cleans up resources
     */
    public dispose(): void {
        this.clearAllFeedback();
        
        this.disposables.forEach(disposable => disposable.dispose());
        this.disposables.length = 0;
    }
}
