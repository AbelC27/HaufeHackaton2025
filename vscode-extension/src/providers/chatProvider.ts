import * as vscode from 'vscode';
import { AIService } from '../services/aiService';

export class ChatProvider implements vscode.WebviewViewProvider {
    private _view?: vscode.WebviewView;
    private conversationHistory: Array<{ role: 'user' | 'ai'; message: string }> = [];

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly aiService: AIService
    ) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Handle messages from webview
        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case 'ask':
                    await this.handleQuestion(data.question);
                    break;
                case 'clear':
                    this.conversationHistory = [];
                    break;
                case 'insertCode':
                    await this.insertCode(data.code);
                    break;
            }
        });
    }

    private async handleQuestion(question: string) {
        if (!this._view) {return;}

        // Add user message to history
        this.conversationHistory.push({ role: 'user', message: question });
        this.updateChat();

        // Show loading
        this._view.webview.postMessage({ type: 'loading', value: true });

        try {
            // Get current editor context
            const editor = vscode.window.activeTextEditor;
            let code = '';
            let language = 'python';

            if (editor) {
                const selection = editor.selection;
                if (!selection.isEmpty) {
                    code = editor.document.getText(selection);
                } else {
                    // Use entire file if no selection
                    code = editor.document.getText();
                }
                language = editor.document.languageId;
            }

            // Get previous context from history
            const previousContext = this.conversationHistory
                .filter(msg => msg.role === 'ai')
                .map(msg => msg.message)
                .join('\n\n');

            // Ask AI
            const response = await this.aiService.askQuestion(
                code,
                language,
                question,
                previousContext
            );

            // Add AI response to history
            this.conversationHistory.push({ role: 'ai', message: response });
            this.updateChat();

        } catch (error: any) {
            this._view.webview.postMessage({
                type: 'error',
                message: error.message || 'Failed to get response'
            });
        } finally {
            this._view.webview.postMessage({ type: 'loading', value: false });
        }
    }

    private updateChat() {
        if (!this._view) {return;}
        
        this._view.webview.postMessage({
            type: 'updateHistory',
            history: this.conversationHistory
        });
    }

    private async insertCode(code: string) {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor');
            return;
        }

        await editor.edit(editBuilder => {
            editBuilder.insert(editor.selection.active, code);
        });

        vscode.window.showInformationMessage('Code inserted!');
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>AI Chat</title>
            <style>
                * {
                    box-sizing: border-box;
                    margin: 0;
                    padding: 0;
                }
                body {
                    font-family: var(--vscode-font-family);
                    padding: 10px;
                    color: var(--vscode-foreground);
                    background-color: var(--vscode-editor-background);
                }
                #chat-container {
                    display: flex;
                    flex-direction: column;
                    height: calc(100vh - 100px);
                }
                #messages {
                    flex: 1;
                    overflow-y: auto;
                    padding: 10px;
                    margin-bottom: 10px;
                }
                .message {
                    margin-bottom: 15px;
                    padding: 10px;
                    border-radius: 5px;
                }
                .user-message {
                    background-color: var(--vscode-input-background);
                    border-left: 3px solid var(--vscode-button-background);
                }
                .ai-message {
                    background-color: var(--vscode-editor-background);
                    border-left: 3px solid var(--vscode-charts-green);
                }
                .message-role {
                    font-weight: bold;
                    margin-bottom: 5px;
                    font-size: 0.9em;
                }
                .message-content {
                    white-space: pre-wrap;
                    line-height: 1.5;
                }
                .message-content code {
                    background-color: var(--vscode-textCodeBlock-background);
                    padding: 2px 4px;
                    border-radius: 3px;
                    font-family: var(--vscode-editor-font-family);
                }
                .code-block {
                    background-color: var(--vscode-textCodeBlock-background);
                    padding: 10px;
                    border-radius: 5px;
                    margin: 10px 0;
                    overflow-x: auto;
                    position: relative;
                }
                .code-block code {
                    display: block;
                    font-family: var(--vscode-editor-font-family);
                }
                .insert-button {
                    position: absolute;
                    top: 5px;
                    right: 5px;
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 4px 8px;
                    border-radius: 3px;
                    cursor: pointer;
                    font-size: 0.8em;
                }
                .insert-button:hover {
                    background-color: var(--vscode-button-hoverBackground);
                }
                #input-container {
                    display: flex;
                    gap: 5px;
                    padding-top: 10px;
                    border-top: 1px solid var(--vscode-panel-border);
                }
                #question-input {
                    flex: 1;
                    padding: 10px;
                    background-color: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                    border: 1px solid var(--vscode-input-border);
                    border-radius: 3px;
                    font-family: var(--vscode-font-family);
                    resize: vertical;
                    min-height: 60px;
                }
                #question-input:focus {
                    outline: 1px solid var(--vscode-focusBorder);
                }
                .button {
                    padding: 10px 15px;
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    border-radius: 3px;
                    cursor: pointer;
                    font-weight: 500;
                }
                .button:hover {
                    background-color: var(--vscode-button-hoverBackground);
                }
                .button:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                #loading {
                    text-align: center;
                    padding: 10px;
                    font-style: italic;
                    color: var(--vscode-descriptionForeground);
                    display: none;
                }
                #loading.active {
                    display: block;
                }
                .quick-actions {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 5px;
                    margin-bottom: 10px;
                }
                .quick-action {
                    padding: 5px 10px;
                    background-color: var(--vscode-button-secondaryBackground);
                    color: var(--vscode-button-secondaryForeground);
                    border: none;
                    border-radius: 3px;
                    cursor: pointer;
                    font-size: 0.85em;
                }
                .quick-action:hover {
                    background-color: var(--vscode-button-secondaryHoverBackground);
                }
            </style>
        </head>
        <body>
            <div id="chat-container">
                <div class="quick-actions">
                    <button class="quick-action" onclick="askQuick('Explain this code')">Explain</button>
                    <button class="quick-action" onclick="askQuick('Find bugs in this code')">Find Bugs</button>
                    <button class="quick-action" onclick="askQuick('How can I improve this?')">Improve</button>
                    <button class="quick-action" onclick="askQuick('Add comments to this code')">Add Comments</button>
                    <button class="quick-action" onclick="clearChat()">Clear Chat</button>
                </div>
                
                <div id="messages"></div>
                <div id="loading">🤖 AI is thinking...</div>
                
                <div id="input-container">
                    <textarea id="question-input" placeholder="Ask AI about your code... (Select code in editor first)"></textarea>
                    <button class="button" onclick="askQuestion()" id="send-button">Send</button>
                </div>
            </div>

            <script>
                const vscode = acquireVsCodeApi();
                
                function askQuestion() {
                    const input = document.getElementById('question-input');
                    const question = input.value.trim();
                    if (!question) return;
                    
                    vscode.postMessage({ type: 'ask', question });
                    input.value = '';
                }
                
                function askQuick(question) {
                    vscode.postMessage({ type: 'ask', question });
                }
                
                function clearChat() {
                    if (confirm('Clear conversation history?')) {
                        document.getElementById('messages').innerHTML = '';
                        vscode.postMessage({ type: 'clear' });
                    }
                }
                
                function insertCode(code) {
                    vscode.postMessage({ type: 'insertCode', code });
                }
                
                function formatMessage(content) {
                    // Simple markdown-like formatting
                    content = content.replace(/\`\`\`([\\s\\S]*?)\`\`\`/g, (match, code) => {
                        return \`<div class="code-block"><button class="insert-button" onclick="insertCode(\\\`\${code.trim()}\\\`)">Insert</button><code>\${code}</code></div>\`;
                    });
                    content = content.replace(/\`([^\`]+)\`/g, '<code>$1</code>');
                    return content;
                }
                
                // Handle messages from extension
                window.addEventListener('message', event => {
                    const message = event.data;
                    
                    switch (message.type) {
                        case 'updateHistory':
                            const messagesDiv = document.getElementById('messages');
                            messagesDiv.innerHTML = '';
                            
                            message.history.forEach(msg => {
                                const div = document.createElement('div');
                                div.className = \`message \${msg.role === 'user' ? 'user-message' : 'ai-message'}\`;
                                div.innerHTML = \`
                                    <div class="message-role">\${msg.role === 'user' ? '👤 You' : '🤖 AI'}</div>
                                    <div class="message-content">\${formatMessage(msg.message)}</div>
                                \`;
                                messagesDiv.appendChild(div);
                            });
                            
                            messagesDiv.scrollTop = messagesDiv.scrollHeight;
                            break;
                            
                        case 'loading':
                            const loading = document.getElementById('loading');
                            const sendBtn = document.getElementById('send-button');
                            if (message.value) {
                                loading.classList.add('active');
                                sendBtn.disabled = true;
                            } else {
                                loading.classList.remove('active');
                                sendBtn.disabled = false;
                            }
                            break;
                            
                        case 'error':
                            alert('Error: ' + message.message);
                            break;
                    }
                });
                
                // Enter to send (Shift+Enter for new line)
                document.getElementById('question-input').addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        askQuestion();
                    }
                });
            </script>
        </body>
        </html>`;
    }
}
