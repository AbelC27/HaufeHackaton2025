import * as vscode from 'vscode';

export class SuggestionManager {
    private decorationType: vscode.TextEditorDecorationType;
    private currentSuggestion: {
        editor: vscode.TextEditor;
        range: vscode.Range;
        newCode: string;
        explanation: string;
    } | null = null;

    constructor(private context: vscode.ExtensionContext) {
        // Create decoration type for suggestion highlighting
        this.decorationType = vscode.window.createTextEditorDecorationType({
            backgroundColor: new vscode.ThemeColor('editor.findMatchHighlightBackground'),
            borderColor: new vscode.ThemeColor('editorInfo.foreground'),
            borderWidth: '1px',
            borderStyle: 'solid',
            isWholeLine: false
        });
    }

    async showSuggestion(
        editor: vscode.TextEditor,
        range: vscode.Range,
        newCode: string,
        explanation: string
    ) {
        // Clear previous suggestion
        this.clearDecorations();

        // Store current suggestion with document URI for safety
        this.currentSuggestion = { 
            editor, 
            range, 
            newCode, 
            explanation 
        };

        // Set context for keybindings
        vscode.commands.executeCommand('setContext', 'aiCodeAssistant.hasSuggestion', true);

        // Show diff first, then ask for action
        await this.showDiff(editor.document, range, newCode);

        // Show action prompt - DON'T wait for it, let keyboard shortcuts handle it
        vscode.window.showInformationMessage(
            `💡 ${explanation}\n\nReview the diff and press Ctrl+Enter to accept or Esc to reject`,
            'Show Full Explanation'
        ).then(action => {
            if (action === 'Show Full Explanation') {
                this.showFullExplanation(explanation);
            }
        });

        // Highlight the range in the original editor
        const config = vscode.workspace.getConfiguration('aiCodeAssistant');
        if (config.get<boolean>('showInlineDecorations')) {
            try {
                // Wait a bit to ensure diff is open, then highlight original
                setTimeout(() => {
                    // Find the original document editor
                    const originalEditor = vscode.window.visibleTextEditors.find(
                        e => e.document.uri.toString() === editor.document.uri.toString()
                    );
                    if (originalEditor) {
                        originalEditor.setDecorations(this.decorationType, [range]);
                    }
                }, 500);
            } catch (error) {
                console.log('Could not set decorations:', error);
            }
        }
    }

    async acceptSuggestion() {
        if (!this.currentSuggestion) {
            vscode.window.showWarningMessage('No suggestion to accept');
            return;
        }

        const { editor, range, newCode } = this.currentSuggestion;

        try {
            // Check if editor is still valid and not closed
            const activeEditor = vscode.window.activeTextEditor;
            const targetEditor = activeEditor && activeEditor.document.uri.toString() === editor.document.uri.toString() 
                ? activeEditor 
                : editor;

            // Verify the editor's document is still open
            const isDocumentOpen = vscode.workspace.textDocuments.some(
                doc => doc.uri.toString() === editor.document.uri.toString()
            );

            if (!isDocumentOpen) {
                // Reopen the document
                const document = await vscode.workspace.openTextDocument(editor.document.uri);
                const newEditor = await vscode.window.showTextDocument(document);
                
                await newEditor.edit(editBuilder => {
                    editBuilder.replace(range, newCode);
                });

                // Save if configured
                const config = vscode.workspace.getConfiguration('aiCodeAssistant');
                if (config.get<boolean>('autoSave')) {
                    await document.save();
                }
            } else {
                // Use the target editor to apply changes
                await targetEditor.edit(editBuilder => {
                    editBuilder.replace(range, newCode);
                });

                // Save if configured
                const config = vscode.workspace.getConfiguration('aiCodeAssistant');
                if (config.get<boolean>('autoSave')) {
                    await targetEditor.document.save();
                }
            }

            vscode.window.showInformationMessage('✓ AI suggestion accepted!');
            this.cleanup();

        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to apply suggestion: ${error.message}`);
            console.error('Error applying suggestion:', error);
        }
    }

    rejectSuggestion() {
        if (!this.currentSuggestion) {
            return;
        }

        vscode.window.showInformationMessage('AI suggestion rejected');
        this.cleanup();
    }

    private async showDiff(
        originalDoc: vscode.TextDocument,
        range: vscode.Range,
        newCode: string
    ) {
        try {
            // Create temporary document with suggested code
            const originalCode = originalDoc.getText(range);
            
            // Create a virtual document for comparison
            const leftUri = vscode.Uri.parse(`ai-original:${originalDoc.fileName}`);
            const rightUri = vscode.Uri.parse(`ai-suggestion:${originalDoc.fileName}`);

            // Register temporary content providers
            const leftProvider = new class implements vscode.TextDocumentContentProvider {
                provideTextDocumentContent(): string {
                    return originalCode;
                }
            };

            const rightProvider = new class implements vscode.TextDocumentContentProvider {
                provideTextDocumentContent(): string {
                    return newCode;
                }
            };

            const leftRegistration = vscode.workspace.registerTextDocumentContentProvider('ai-original', leftProvider);
            const rightRegistration = vscode.workspace.registerTextDocumentContentProvider('ai-suggestion', rightProvider);

            this.context.subscriptions.push(leftRegistration, rightRegistration);

            // Show diff
            await vscode.commands.executeCommand(
                'vscode.diff',
                leftUri,
                rightUri,
                'AI Suggestion: Original ↔ Proposed',
                { preview: true }
            );

        } catch (error: any) {
            console.error('Failed to show diff:', error);
            // Fallback: show in output panel
            const channel = vscode.window.createOutputChannel('AI Suggestion');
            channel.clear();
            channel.appendLine('=== SUGGESTED CODE ===');
            channel.appendLine(newCode);
            channel.show();
        }
    }

    private async showFullExplanation(explanation: string) {
        const document = await vscode.workspace.openTextDocument({
            content: explanation,
            language: 'markdown'
        });
        await vscode.window.showTextDocument(document, {
            preview: true,
            viewColumn: vscode.ViewColumn.Beside
        });
    }

    private clearDecorations() {
        if (this.currentSuggestion) {
            this.currentSuggestion.editor.setDecorations(this.decorationType, []);
        }
    }

    private cleanup() {
        this.clearDecorations();
        this.currentSuggestion = null;
        vscode.commands.executeCommand('setContext', 'aiCodeAssistant.hasSuggestion', false);
    }

    dispose() {
        this.clearDecorations();
        this.decorationType.dispose();
    }
}
