import * as vscode from 'vscode';
import { AIService } from './services/aiService';
import { SuggestionManager } from './services/suggestionManager';
import { ChatProvider } from './providers/chatProvider';

let aiService: AIService;
let suggestionManager: SuggestionManager;
let chatProvider: ChatProvider;

export function activate(context: vscode.ExtensionContext) {
    console.log('AI Code Assistant is now active!');

    // Initialize services
    aiService = new AIService();
    suggestionManager = new SuggestionManager(context);
    chatProvider = new ChatProvider(context.extensionUri, aiService);

    // Register chat view
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            'aiAssistant.chatView',
            chatProvider
        )
    );

    // Register commands
    registerCommands(context);

    // Show welcome message
    vscode.window.showInformationMessage(
        '🚀 DEVCOR AI Assistant is ready! Right-click on code or press Ctrl+Shift+F to get started.',
        'Open Chat',
        'View Commands'
    ).then(selection => {
        if (selection === 'Open Chat') {
            vscode.commands.executeCommand('aiAssistant.chatView.focus');
        } else if (selection === 'View Commands') {
            vscode.commands.executeCommand('workbench.action.showCommands');
        }
    });
}

function registerCommands(context: vscode.ExtensionContext) {
    // Explain Code
    context.subscriptions.push(
        vscode.commands.registerCommand('aiCodeAssistant.explainCode', async () => {
            await handleAICommand('explain', 'Explaining code...');
        })
    );

    // Fix Code
    context.subscriptions.push(
        vscode.commands.registerCommand('aiCodeAssistant.fixCode', async () => {
            await handleAICommand('fix', 'Analyzing and fixing code...');
        })
    );

    // Add Documentation
    context.subscriptions.push(
        vscode.commands.registerCommand('aiCodeAssistant.addDocumentation', async () => {
            await handleAICommand('document', 'Generating documentation...');
        })
    );

    // Refactor Code
    context.subscriptions.push(
        vscode.commands.registerCommand('aiCodeAssistant.refactorCode', async () => {
            await handleAICommand('refactor', 'Refactoring code...');
        })
    );

    // Review Code
    context.subscriptions.push(
        vscode.commands.registerCommand('aiCodeAssistant.reviewCode', async () => {
            await handleAICommand('review', 'Reviewing code quality...');
        })
    );

    // Generate Tests
    context.subscriptions.push(
        vscode.commands.registerCommand('aiCodeAssistant.generateTests', async () => {
            await handleAICommand('test', 'Generating unit tests...');
        })
    );

    // Open Chat
    context.subscriptions.push(
        vscode.commands.registerCommand('aiCodeAssistant.openChat', () => {
            vscode.commands.executeCommand('aiAssistant.chatView.focus');
        })
    );

    // Accept Suggestion
    context.subscriptions.push(
        vscode.commands.registerCommand('aiCodeAssistant.acceptSuggestion', async () => {
            await suggestionManager.acceptSuggestion();
        })
    );

    // Reject Suggestion
    context.subscriptions.push(
        vscode.commands.registerCommand('aiCodeAssistant.rejectSuggestion', async () => {
            await suggestionManager.rejectSuggestion();
        })
    );
}

async function handleAICommand(type: string, progressMessage: string) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active editor found');
        return;
    }

    const selection = editor.selection;
    if (selection.isEmpty) {
        vscode.window.showWarningMessage('Please select code first');
        return;
    }

    const selectedText = editor.document.getText(selection);
    const language = editor.document.languageId;

    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: progressMessage,
        cancellable: true
    }, async (progress, token) => {
        try {
            progress.report({ increment: 0, message: 'Sending to AI...' });

            const result = await aiService.processCode(selectedText, language, type);

            if (token.isCancellationRequested) {
                return;
            }

            progress.report({ increment: 50, message: 'Processing response...' });

            // Show result based on type
            if (type === 'explain' || type === 'review') {
                // Show in output panel
                const message = result.explanation || result.review || 'No response from AI';
                await showInOutputPanel(message, type);
            } else {
                // Show as inline suggestion
                await suggestionManager.showSuggestion(
                    editor,
                    selection,
                    result.code || result.fixed_code || selectedText,
                    result.explanation || 'AI-generated code'
                );
            }

            progress.report({ increment: 100 });
            vscode.window.showInformationMessage(`✓ ${progressMessage.replace('...', '')} complete!`);

        } catch (error: any) {
            vscode.window.showErrorMessage(`AI Error: ${error.message}`);
        }
    });
}

async function showInOutputPanel(content: string, type: string) {
    const outputChannel = vscode.window.createOutputChannel(`AI: ${type.toUpperCase()}`);
    outputChannel.clear();
    outputChannel.appendLine('='.repeat(80));
    outputChannel.appendLine(`AI ${type.toUpperCase()}`);
    outputChannel.appendLine('='.repeat(80));
    outputChannel.appendLine('');
    outputChannel.appendLine(content);
    outputChannel.appendLine('');
    outputChannel.appendLine('='.repeat(80));
    outputChannel.show();
}

export function deactivate() {
    if (suggestionManager) {
        suggestionManager.dispose();
    }
}
