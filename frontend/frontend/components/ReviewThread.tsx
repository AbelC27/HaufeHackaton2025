'use client';

import { useState, useEffect } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface Comment {
  id: string;
  review_id: string;
  user_email?: string;
  comment_text: string;
  comment_type: 'user' | 'ai';
  parent_comment_id?: string;
  created_at: string;
}

interface ReviewThreadProps {
  reviewId: string;
  originalCode: string;
  originalReview: string;
  language: string;
  userEmail?: string;
  theme?: 'dark' | 'light';
  onClose: () => void;
}

export default function ReviewThread({
  reviewId,
  originalCode,
  originalReview,
  language,
  userEmail,
  theme = 'dark',
  onClose
}: ReviewThreadProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');

  const cardBgClass = theme === 'dark' ? 'bg-gray-800' : 'bg-white';
  const textClass = theme === 'dark' ? 'text-white' : 'text-gray-900';
  const borderClass = theme === 'dark' ? 'border-gray-700' : 'border-gray-300';

  // Fetch comments on mount
  useEffect(() => {
    fetchComments();
  }, [reviewId]);

  const fetchComments = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/comments?review_id=${reviewId}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch comments');
      }

      setComments(result.data || []);
    } catch (err: any) {
      console.error('Failed to fetch comments:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendQuestion = async () => {
    if (!newQuestion.trim()) return;

    if (!userEmail) {
      setError('Please sign in to ask questions');
      return;
    }

    setIsSending(true);
    setError('');

    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          review_id: reviewId,
          user_email: userEmail,
          comment_text: newQuestion,
          original_code: originalCode,
          original_review: originalReview,
          language: language
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send question');
      }

      // Add both user comment and AI response to the list
      if (result.userComment) {
        setComments(prev => [...prev, result.userComment]);
      }
      if (result.aiComment) {
        setComments(prev => [...prev, result.aiComment]);
      }

      setNewQuestion('');
    } catch (err: any) {
      console.error('Failed to send question:', err);
      setError(err.message);
    } finally {
      setIsSending(false);
    }
  };

  // Suggested questions
  const suggestedQuestions = [
    "Why is this a problem?",
    "Show me a different way to fix this",
    "Can you explain this in simpler terms?",
    "What are the performance implications?",
    "Are there any security concerns?"
  ];

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className={`${cardBgClass} rounded-lg max-w-5xl w-full max-h-[90vh] border ${borderClass} flex flex-col`}>
        {/* Header */}
        <div className={`${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'} px-6 py-4 border-b ${borderClass} flex items-center justify-between`}>
          <div>
            <h2 className={`text-2xl font-bold ${textClass} flex items-center gap-2`}>
              💬 Conversational Review
            </h2>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
              Ask questions about your code review and get AI-powered answers
            </p>
          </div>
          <button 
            onClick={onClose} 
            className={`${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Original Review Section */}
        <div className="px-6 py-4 border-b border-gray-700 max-h-64 overflow-y-auto">
          <h3 className={`text-sm font-semibold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-2`}>
            Original AI Review:
          </h3>
          <div className={`${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'} rounded-lg p-4`}>
            <div className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} whitespace-pre-wrap max-h-32 overflow-y-auto`}>
              {originalReview.substring(0, 500)}...
            </div>
          </div>
        </div>

        {/* Comments Thread */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {isLoading && (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          )}

          {!isLoading && comments.length === 0 && (
            <div className={`text-center py-8 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
              <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p>No questions yet. Start a conversation!</p>
            </div>
          )}

          {comments.map((comment) => (
            <div
              key={comment.id}
              className={`flex ${comment.comment_type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-4 ${
                  comment.comment_type === 'user'
                    ? 'bg-blue-600 text-white'
                    : theme === 'dark'
                    ? 'bg-gray-900 text-gray-200'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {comment.comment_type === 'ai' ? (
                    <span className="text-lg">🤖</span>
                  ) : (
                    <span className="text-lg">👤</span>
                  )}
                  <span className={`text-xs font-semibold ${comment.comment_type === 'user' ? 'text-blue-100' : theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {comment.comment_type === 'ai' ? 'AI Assistant' : 'You'}
                  </span>
                  <span className={`text-xs ${comment.comment_type === 'user' ? 'text-blue-200' : theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                    {new Date(comment.created_at).toLocaleTimeString()}
                  </span>
                </div>
                <div className={`text-sm whitespace-pre-wrap ${comment.comment_type === 'user' ? 'text-white' : ''}`}>
                  {comment.comment_text}
                </div>
              </div>
            </div>
          ))}

          {isSending && (
            <div className="flex justify-center items-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500 mr-3"></div>
              <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                AI is thinking...
              </span>
            </div>
          )}

          {error && (
            <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
        </div>

        {/* Suggested Questions */}
        {comments.length === 0 && !isSending && (
          <div className="px-6 py-3 border-t border-gray-700">
            <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-2`}>
              Suggested questions:
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestedQuestions.map((question, idx) => (
                <button
                  key={idx}
                  onClick={() => setNewQuestion(question)}
                  className={`text-xs px-3 py-1 ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'} rounded-full transition-colors`}
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className={`${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'} px-6 py-4 border-t ${borderClass}`}>
          <div className="flex gap-2">
            <textarea
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendQuestion();
                }
              }}
              placeholder="Ask a question about this review... (Press Enter to send)"
              className={`flex-1 px-4 py-3 ${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} border ${borderClass} rounded-lg text-sm resize-none`}
              rows={2}
              disabled={isSending || !userEmail}
            />
            <button
              onClick={handleSendQuestion}
              disabled={isSending || !newQuestion.trim() || !userEmail}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed transition-all flex items-center gap-2"
            >
              {isSending ? (
                <>
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sending
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Send
                </>
              )}
            </button>
          </div>
          {!userEmail && (
            <p className="text-xs text-yellow-500 mt-2">
              Please sign in to ask questions about this review.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
