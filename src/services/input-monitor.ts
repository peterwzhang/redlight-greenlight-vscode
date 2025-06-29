import * as vscode from 'vscode';
import { GameEngine } from '../game/game-engine';
import { GameState, RedLightViolationEvent } from '../types/game-types';

/**
 * Violation event listener type
 */
export type ViolationListener = (event: RedLightViolationEvent) => void;

/**
 * Monitors text input and enforces red light rules
 */
export class InputMonitor implements vscode.Disposable {
    private gameEngine: GameEngine;
    private violationListeners: ViolationListener[] = [];
    private disposables: vscode.Disposable[] = [];
    private isMonitoring: boolean = false;
    private redLightStartTime: number = 0;
    private gracePeriod: number = 0.5; // Default grace period in seconds

    /**
     * Creates a new InputMonitor instance
     * @param gameEngine Game engine instance to check game state
     */
    constructor(gameEngine: GameEngine) {
        this.gameEngine = gameEngine;
        this.setupTextDocumentListeners();
        this.setupGameStateListener();
    }

    /**
     * Starts monitoring text input
     */
    public startMonitoring(): void {
        this.isMonitoring = true;
    }

    /**
     * Stops monitoring text input
     */
    public stopMonitoring(): void {
        this.isMonitoring = false;
    }

    /**
     * Checks if monitoring is currently active
     */
    public isActive(): boolean {
        return this.isMonitoring;
    }

    /**
     * Updates the grace period setting
     * @param gracePeriod Grace period in seconds
     */
    public updateGracePeriod(gracePeriod: number): void {
        this.gracePeriod = gracePeriod;
    }

    /**
     * Adds a listener for red light violations
     * @param listener Violation event listener
     */
    public onViolation(listener: ViolationListener): vscode.Disposable {
        this.violationListeners.push(listener);
        
        return new vscode.Disposable(() => {
            const index = this.violationListeners.indexOf(listener);
            if (index >= 0) {
                this.violationListeners.splice(index, 1);
            }
        });
    }

    /**
     * Sets up text document change listeners
     */
    private setupTextDocumentListeners(): void {
        // Listen for text document changes
        const changeDisposable = vscode.workspace.onDidChangeTextDocument(
            this.onTextDocumentChange.bind(this)
        );
        this.disposables.push(changeDisposable);

        // Listen for text document will save events (for additional blocking)
        const willSaveDisposable = vscode.workspace.onWillSaveTextDocument(
            this.onWillSaveTextDocument.bind(this)
        );
        this.disposables.push(willSaveDisposable);

        // Listen for keyboard input (if available through VSCode API)
        this.setupKeyboardListeners();
    }

    /**
     * Sets up game state change listener to track red light start time
     */
    private setupGameStateListener(): void {
        this.gameEngine.onStateChange((event) => {
            if (event.currentState === GameState.RedLight) {
                this.redLightStartTime = Date.now();
            }
        });
    }

    /**
     * Checks if current time is within grace period after red light start
     * @returns True if within grace period, false otherwise
     */
    private isWithinGracePeriod(): boolean {
        if (this.redLightStartTime === 0) {
            return false; // No red light start time recorded
        }
        
        const currentTime = Date.now();
        const timeSinceRedLight = (currentTime - this.redLightStartTime) / 1000; // Convert to seconds
        
        return timeSinceRedLight <= this.gracePeriod;
    }

    /**
     * Handles text document change events
     * @param event Text document change event
     */
    private onTextDocumentChange(event: vscode.TextDocumentChangeEvent): void {
        if (!this.shouldMonitorDocument(event.document)) {
            return;
        }

        if (!this.isMonitoring || !this.gameEngine.isActive()) {
            return;
        }

        // Check if we're in red light state
        if (this.gameEngine.getCurrentState() === GameState.RedLight) {
            // Check if we're still in grace period
            if (this.isWithinGracePeriod()) {
                return; // Allow typing during grace period
            }
            
            this.handleRedLightViolation(event);
        }
    }

    /**
     * Handles will save text document events
     * @param event Will save text document event
     */
    private onWillSaveTextDocument(event: vscode.TextDocumentWillSaveEvent): void {
        if (!this.shouldMonitorDocument(event.document)) {
            return;
        }

        if (!this.isMonitoring || !this.gameEngine.isActive()) {
            return;
        }

        // Check if we're in red light state and prevent saving
        if (this.gameEngine.getCurrentState() === GameState.RedLight) {
            // Check if we're still in grace period
            if (this.isWithinGracePeriod()) {
                return; // Allow saving during grace period
            }
            
            // We can't easily prevent saving, but we can log the violation
            const violationEvent: RedLightViolationEvent = {
                timestamp: Date.now(),
                documentUri: event.document.uri.toString(),
                changeText: 'Document save attempt',
                actionTaken: this.gameEngine.getConfig().redLightAction
            };
            
            this.notifyViolation(violationEvent);
        }
    }

    /**
     * Sets up keyboard listeners (VSCode has limited keyboard access)
     */
    private setupKeyboardListeners(): void {
        // VSCode doesn't provide direct keyboard event access
        // We rely on text document changes for now
        // Future enhancement could use extension host APIs if available
    }

    /**
     * Handles red light violations
     * @param event Text document change event
     */
    private handleRedLightViolation(event: vscode.TextDocumentChangeEvent): void {
        // Extract change information
        const changeText = this.extractChangeText(event);
        
        // Create violation event
        const violationEvent: RedLightViolationEvent = {
            timestamp: Date.now(),
            documentUri: event.document.uri.toString(),
            changeText,
            actionTaken: this.gameEngine.getConfig().redLightAction
        };

        // Notify violation listeners
        this.notifyViolation(violationEvent);

        // Attempt to undo the change (limited success due to VSCode API constraints)
        this.attemptUndoChange(event);
    }

    /**
     * Extracts change text from document change event
     * @param event Text document change event
     * @returns Formatted change description
     */
    private extractChangeText(event: vscode.TextDocumentChangeEvent): string {
        if (event.contentChanges.length === 0) {
            return 'Unknown change';
        }

        const changes = event.contentChanges.map(change => {
            if (change.text.length > 0) {
                return `Added: "${change.text}"`;
            } else {
                return `Deleted text at range ${change.range.start.line}:${change.range.start.character}`;
            }
        });

        return changes.join(', ');
    }

    /**
     * Attempts to undo a change (limited by VSCode API)
     * @param event Text document change event
     */
    private async attemptUndoChange(event: vscode.TextDocumentChangeEvent): Promise<void> {
        // Note: Block action has been removed. This method is kept for potential future use
        // or if user manually wants to undo after a warning
        try {
            // Could be used as an optional feature in the future
            console.log('Change detected during red light, but no automatic undo configured');
        } catch (error) {
            console.warn('Failed to handle change during red light:', error);
        }
    }

    /**
     * Determines if a document should be monitored
     * @param document Text document
     * @returns True if document should be monitored
     */
    private shouldMonitorDocument(document: vscode.TextDocument): boolean {
        // Skip certain document types
        if (document.uri.scheme !== 'file' && document.uri.scheme !== 'untitled') {
            return false;
        }

        // Skip output/debug console documents
        if (document.uri.path.includes('extension-output') || 
            document.uri.path.includes('debug-console')) {
            return false;
        }

        // Skip large files (performance consideration)
        if (document.getText().length > 1000000) { // 1MB limit
            return false;
        }

        return true;
    }

    /**
     * Notifies all violation listeners
     * @param event Violation event
     */
    private notifyViolation(event: RedLightViolationEvent): void {
        this.violationListeners.forEach(listener => {
            try {
                listener(event);
            } catch (error) {
                console.error('Error in violation listener:', error);
            }
        });
    }

    /**
     * Disposes of the input monitor and cleans up resources
     */
    public dispose(): void {
        this.stopMonitoring();
        this.violationListeners.length = 0;
        
        this.disposables.forEach(disposable => disposable.dispose());
        this.disposables.length = 0;
    }
}
