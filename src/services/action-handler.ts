import * as vscode from 'vscode';
import { RedLightAction, RedLightViolationEvent } from '../types/game-types';

/**
 * Action result interface
 */
export interface ActionResult {
    readonly success: boolean;
    readonly message: string;
    readonly actionTaken: RedLightAction;
}

/**
 * Handles actions taken when red light violations occur
 */
export class ActionHandler implements vscode.Disposable {
    private disposables: vscode.Disposable[] = [];
    private violationCount: number = 0;

    /**
     * Creates a new ActionHandler instance
     */
    constructor() {
        // Initialize action handler
    }

    /**
     * Handles a red light violation based on the configured action
     * @param event Red light violation event
     * @returns Promise that resolves to action result
     */
    public async handleViolation(event: RedLightViolationEvent): Promise<ActionResult> {
        this.violationCount++;
        
        try {
            switch (event.actionTaken) {
                case RedLightAction.Close:
                    return await this.handleCloseAction(event);
                
                case RedLightAction.Warn:
                    return await this.handleWarnAction(event);
                
                default:
                    return {
                        success: false,
                        message: `Unknown action: ${event.actionTaken}`,
                        actionTaken: event.actionTaken
                    };
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return {
                success: false,
                message: `Failed to handle violation: ${errorMessage}`,
                actionTaken: event.actionTaken
            };
        }
    }

    /**
     * Gets the current violation count for this session
     */
    public getViolationCount(): number {
        return this.violationCount;
    }

    /**
     * Resets the violation count
     */
    public resetViolationCount(): void {
        this.violationCount = 0;
    }

    /**
     * Handles the close IDE action
     * @param event Violation event
     * @returns Action result
     */
    private async handleCloseAction(event: RedLightViolationEvent): Promise<ActionResult> {
        // Immediately close the IDE without any popup or confirmation
        try {
            // Use setImmediate to avoid blocking the current execution
            setImmediate(async () => {
                try {
                    await vscode.commands.executeCommand('workbench.action.quit');
                } catch (error) {
                    console.error('Failed to quit VSCode, trying to close window:', error);
                    // Fallback: try to close window
                    await vscode.commands.executeCommand('workbench.action.closeWindow');
                }
            });

            return {
                success: true,
                message: 'IDE closing immediately due to red light violation',
                actionTaken: RedLightAction.Close
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return {
                success: false,
                message: `Failed to close IDE: ${errorMessage}`,
                actionTaken: RedLightAction.Close
            };
        }
    }

    /**
     * Handles the warning action
     * @param event Violation event
     * @returns Action result
     */
    private async handleWarnAction(event: RedLightViolationEvent): Promise<ActionResult> {
        const violationMessage = this.createViolationMessage(event);
        
        // Show warning message with options
        const choice = await vscode.window.showWarningMessage(
            violationMessage,
            'Got it!',
            'Stop Game',
            'View Stats'
        );

        let additionalAction = '';
        if (choice === 'Stop Game') {
            await vscode.commands.executeCommand('redLightGreenLight.stopGame');
            additionalAction = ' Game stopped.';
        } else if (choice === 'View Stats') {
            await this.showViolationStats();
            additionalAction = ' Stats displayed.';
        }

        return {
            success: true,
            message: `Warning shown for red light violation.${additionalAction}`,
            actionTaken: RedLightAction.Warn
        };
    }

    /**
     * Creates a formatted violation message
     * @param event Violation event
     * @returns Formatted message string
     */
    private createViolationMessage(event: RedLightViolationEvent): string {
        const timeStr = new Date(event.timestamp).toLocaleTimeString();
        const violationText = event.changeText.length > 50 
            ? event.changeText.substring(0, 47) + '...'
            : event.changeText;

        return `🔴 RED LIGHT VIOLATION at ${timeStr}\n` +
               `Change: ${violationText}\n` +
               `Total violations this session: ${this.violationCount}`;
    }

    /**
     * Shows violation statistics
     */
    private async showViolationStats(): Promise<void> {
        const statsMessage = `Red Light Green Light - Session Stats\n\n` +
                           `Total Violations: ${this.violationCount}\n` +
                           `Session Start: ${new Date().toLocaleString()}\n\n` +
                           `Remember: Only type during GREEN light phases!`;

        await vscode.window.showInformationMessage(statsMessage, 'Close');
    }

    /**
     * Handles emergency stop situations
     */
    public async handleEmergencyStop(): Promise<void> {
        await vscode.window.showWarningMessage(
            'Red Light Green Light game stopped due to emergency.',
            'Understood'
        );
    }

    /**
     * Shows a custom notification for game events
     * @param message Message to display
     * @param type Notification type
     */
    public async showNotification(
        message: string, 
        type: 'info' | 'warn' | 'error' = 'info'
    ): Promise<void> {
        switch (type) {
            case 'info':
                await vscode.window.showInformationMessage(message);
                break;
            case 'warn':
                await vscode.window.showWarningMessage(message);
                break;
            case 'error':
                await vscode.window.showErrorMessage(message);
                break;
        }
    }

    /**
     * Tests different action types (for development/debugging)
     * @param action Action to test
     */
    public async testAction(action: RedLightAction): Promise<ActionResult> {
        const testEvent: RedLightViolationEvent = {
            timestamp: Date.now(),
            documentUri: 'test://test-document',
            changeText: 'Test violation',
            actionTaken: action
        };

        return await this.handleViolation(testEvent);
    }

    /**
     * Disposes of the action handler and cleans up resources
     */
    public dispose(): void {
        this.disposables.forEach(disposable => disposable.dispose());
        this.disposables.length = 0;
        this.violationCount = 0;
    }
}
