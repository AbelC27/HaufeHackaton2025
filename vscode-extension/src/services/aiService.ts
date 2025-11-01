import * as vscode from 'vscode';
import axios from 'axios';

export interface AIResponse {
    review?: string;
    explanation?: string;
    code?: string;
    fixed_code?: string;
    effort_estimation_minutes?: number;
}

export class AIService {
    private getBackendUrl(): string {
        const config = vscode.workspace.getConfiguration('aiCodeAssistant');
        return config.get<string>('backendUrl') || 'http://127.0.0.1:8000';
    }

    private getCustomRules(): string {
        const config = vscode.workspace.getConfiguration('aiCodeAssistant');
        return config.get<string>('customRules') || '';
    }

    private getDefaultFocus(): string {
        const config = vscode.workspace.getConfiguration('aiCodeAssistant');
        return config.get<string>('defaultFocus') || 'general';
    }

    async processCode(code: string, language: string, action: string): Promise<AIResponse> {
        const backendUrl = this.getBackendUrl();
        const customRules = this.getCustomRules();
        const focus = this.getDefaultFocus();

        try {
            // Build prompt based on action type
            const prompt = this.buildPrompt(code, language, action);

            // For 'fix', 'refactor', 'document', 'test' - use auto_fix mode
            const needsCodeGeneration = ['fix', 'refactor', 'document', 'test'].includes(action);

            const response = await axios.post(
                `${backendUrl}/api/review/`,
                {
                    code: needsCodeGeneration ? code : prompt,
                    language: this.mapLanguage(language),
                    focus: action === 'review' ? focus : 'general',
                    auto_fix: needsCodeGeneration,
                    custom_rules: customRules,
                    estimate_effort: action === 'review'
                },
                {
                    timeout: 60000 // 60 second timeout
                }
            );

            return this.parseResponse(response.data, action);

        } catch (error: any) {
            if (error.code === 'ECONNREFUSED') {
                throw new Error('Cannot connect to backend. Make sure Django is running on ' + backendUrl);
            } else if (error.response) {
                throw new Error(error.response.data.error || 'Backend error');
            } else if (error.request) {
                throw new Error('No response from backend. Check your connection.');
            } else {
                throw new Error(error.message || 'Unknown error');
            }
        }
    }

    async askQuestion(code: string, language: string, question: string, previousReview?: string): Promise<string> {
        const backendUrl = this.getBackendUrl();

        try {
            const response = await axios.post(
                `${backendUrl}/api/follow-up/`,
                {
                    original_code: code,
                    original_review: previousReview || 'No previous review',
                    user_question: question,
                    language: this.mapLanguage(language)
                },
                {
                    timeout: 60000
                }
            );

            return response.data.ai_response || 'No response from AI';

        } catch (error: any) {
            throw new Error(error.response?.data?.error || error.message || 'Failed to get AI response');
        }
    }

    private buildPrompt(code: string, language: string, action: string): string {
        switch (action) {
            case 'explain':
                return `Explain what this ${language} code does:\n\n${code}`;
            
            case 'fix':
                return code; // Let the backend handle it
            
            case 'document':
                return code; // Backend will add documentation
            
            case 'refactor':
                return code; // Backend will refactor
            
            case 'test':
                return code; // Backend will generate tests
            
            case 'review':
                return code; // Standard review
            
            default:
                return code;
        }
    }

    private parseResponse(data: any, action: string): AIResponse {
        const result: AIResponse = {};

        // Extract review/explanation
        if (data.review) {
            if (action === 'explain') {
                result.explanation = data.review;
            } else {
                result.review = data.review;
            }
        }

        // Extract code
        if (data.fixed_code) {
            result.fixed_code = data.fixed_code;
            result.code = data.fixed_code;
        }

        // Extract effort estimation
        if (data.effort_estimation_minutes) {
            result.effort_estimation_minutes = data.effort_estimation_minutes;
        }

        // For special actions, customize the response
        switch (action) {
            case 'document':
                result.explanation = 'Documentation added';
                break;
            case 'test':
                result.explanation = 'Unit tests generated';
                break;
            case 'refactor':
                result.explanation = 'Code refactored';
                break;
        }

        return result;
    }

    private mapLanguage(vscodeLanguage: string): string {
        const languageMap: { [key: string]: string } = {
            'javascript': 'javascript',
            'typescript': 'typescript',
            'python': 'python',
            'java': 'java',
            'csharp': 'csharp',
            'go': 'go',
            'rust': 'rust',
            'cpp': 'cpp',
            'c': 'cpp',
            'php': 'php',
            'ruby': 'ruby',
            'swift': 'swift',
            'kotlin': 'kotlin',
            'scala': 'scala'
        };

        return languageMap[vscodeLanguage] || 'python';
    }
}
