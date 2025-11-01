// frontend/app/page.tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import AuthModal from '@/components/AuthModal';
import DiffViewer from '@/components/DiffViewer';
import GistLoader from '@/components/GistLoader';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';
import Navigation from '@/components/Navigation';
import fileDownload from 'js-file-download';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useToast } from '@/contexts/ToastContext';

type ReviewHistoryItem = {
  id: string | number;
  input_code: string;
  review: string;
  created_at: string | null;
  language?: string;
  focus?: string;
  tags?: string[];
};

type Language = 'python' | 'javascript' | 'typescript' | 'java' | 'csharp' | 'go' | 'rust' | 'cpp' | 'php' | 'ruby';
type Focus = 'general' | 'security' | 'performance' | 'style' | 'bugs';

const CODE_EXAMPLES: Record<Language, string> = {
  python: `def calculate_average(numbers):
    total = 0
    for num in numbers:
        total += num
    return total / len(numbers)

result = calculate_average([1, 2, 3, 4, 5])
print(f"Average: {result}")`,
  javascript: `function fetchUserData(userId) {
    return fetch('/api/users/' + userId)
        .then(response => response.json())
        .then(data => {
            console.log(data);
            return data;
        });
}

fetchUserData(123);`,
  typescript: `interface User {
    id: number;
    name: string;
    email: string;
}

async function getUser(id: number): Promise<User> {
    const response = await fetch(\`/api/users/\${id}\`);
    return response.json();
}`,
  java: `public class Calculator {
    public static double divide(int a, int b) {
        return a / b;
    }
    
    public static void main(String[] args) {
        System.out.println(divide(10, 0));
    }
}`,
  csharp: `public class UserService {
    public string GetUserEmail(int userId) {
        var user = Database.Users.Find(userId);
        return user.Email;
    }
}`,
  go: `func processData(data []int) int {
    sum := 0
    for i := 0; i < len(data); i++ {
        sum = sum + data[i]
    }
    return sum
}`,
  rust: `fn main() {
    let mut vec = Vec::new();
    vec.push(1);
    vec.push(2);
    let first = vec[0];
    vec.clear();
    println!("{}", first);
}`,
  cpp: `#include <iostream>
using namespace std;

int* createArray() {
    int arr[5] = {1, 2, 3, 4, 5};
    return arr;
}`,
  php: `<?php
function getUserData($id) {
    $query = "SELECT * FROM users WHERE id = " . $id;
    return mysqli_query($conn, $query);
}
?>`,
  ruby: `def process_users(users)
  users.each do |user|
    puts user[:name]
  end
end

users = [{name: "Alice"}, {name: "Bob"}]
process_users(users)`
};

export default function Home() {
  const [code, setCode] = useState<string>(CODE_EXAMPLES.python);
  const [language, setLanguage] = useState<Language>('python');
  const [focus, setFocus] = useState<Focus>('general');
  const [review, setReview] = useState<string>('');
  const [fixedCode, setFixedCode] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isFixing, setIsFixing] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [customRules, setCustomRules] = useState<string>('');
  const [effortEstimation, setEffortEstimation] = useState<number>(0);
  
  // User auth
  const [user, setUser] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  // Modals
  const [showDiffViewer, setShowDiffViewer] = useState(false);
  const [showGistLoader, setShowGistLoader] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  
  // Share
  const [shareUrl, setShareUrl] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);

  // Tags and search
  const [tags, setTags] = useState<string[]>([]);
  const [currentTag, setCurrentTag] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Supabase-backed review history
  const [history, setHistory] = useState<ReviewHistoryItem[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const supabaseClient = supabase;

  // Toast notifications
  const { showToast } = useToast();

  // Auto-save draft
  const { loadSaved, clearSaved } = useAutoSave({ code, language, focus }, 'code-review-draft');

  // Load draft on mount
  useEffect(() => {
    const saved = loadSaved();
    if (saved && saved.code && saved.code !== CODE_EXAMPLES.python) {
      setCode(saved.code);
      setLanguage(saved.language);
      setFocus(saved.focus);
      showToast('Draft restored from last session', 'info');
    }
  }, []);

  // Check auth state and load custom rules
  useEffect(() => {
    if (!supabaseClient) return;

    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user?.email) {
        fetchCustomRules(session.user.email);
      }
    });

    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user?.email) {
        fetchCustomRules(session.user.email);
      } else {
        setCustomRules('');
      }
    });

    return () => subscription.unsubscribe();
  }, [supabaseClient]);

  // Fetch user's custom coding rules
  const fetchCustomRules = async (email: string) => {
    try {
      const response = await fetch(`/api/profiles?user_email=${encodeURIComponent(email)}`);
      const result = await response.json();

      if (response.ok && result.data) {
        setCustomRules(result.data.custom_rules || '');
      }
    } catch (err) {
      console.error('Failed to fetch custom rules:', err);
    }
  };

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: 'Enter',
      ctrl: true,
      callback: () => {
        if (!isLoading && code.trim()) {
          handleReview();
        }
      }
    },
    {
      key: 's',
      ctrl: true,
      callback: () => {
        showToast('Draft auto-saved!', 'success', 1500);
      }
    },
    {
      key: 'd',
      ctrl: true,
      callback: () => {
        if (review) {
          handleDownloadMarkdown();
        }
      }
    },
    {
      key: 'k',
      ctrl: true,
      callback: () => {
        setShowAnalytics(!showAnalytics);
      }
    },
    {
      key: '?',
      shift: true,
      callback: () => {
        setShowShortcuts(!showShortcuts);
      }
    }
  ]);

  const fetchHistory = useCallback(async () => {
    if (!user?.email) {
      setHistory([]);
      return;
    }

    try {
      const response = await fetch(`/api/reviews?user_email=${encodeURIComponent(user.email)}`);
      const result = await response.json();

      if (!response.ok) {
        setHistoryError(result.error || 'Failed to fetch history');
        return;
      }

      setHistoryError(null);
      setHistory(result.data || []);
    } catch (error) {
      console.error('Failed to fetch history:', error);
      setHistoryError('Failed to fetch review history');
    }
  }, [user?.email]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleLanguageChange = (newLanguage: Language) => {
    setLanguage(newLanguage);
    setCode(CODE_EXAMPLES[newLanguage]);
    setReview('');
    setError('');
  };

  const handleReview = async () => {
    if (!code.trim()) {
      setError('Please enter some code to review');
      showToast('Please enter code to review', 'warning');
      return;
    }

    setIsLoading(true);
    setReview('');
    setError('');
    showToast('Analyzing your code...', 'info', 2000);

    const startTime = Date.now();

    try {
      // Step 1: Get AI review from Django with custom rules and effort estimation
      const reviewResponse = await fetch('http://127.0.0.1:8000/api/review/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          code: code,
          language: language,
          focus: focus,
          custom_rules: customRules,
          estimate_effort: true
        }),
      });

      const reviewData = await reviewResponse.json();

      if (!reviewResponse.ok) {
        setError(reviewData.error || reviewResponse.statusText);
        showToast(reviewData.error || 'Review failed', 'error');
        setIsLoading(false);
        return;
      }

      const reviewText = reviewData.review;
      const effortMinutes = reviewData.effort_estimation_minutes || 0;
      const reviewTime = ((Date.now() - startTime) / 1000).toFixed(1);
      
      setReview(reviewText);
      setEffortEstimation(effortMinutes);
      
      showToast(`Review completed in ${reviewTime}s! Estimated effort: ${effortMinutes}m`, 'success', 4000);

      // Clear draft after successful review
      clearSaved();

      // Step 2: Save to Supabase via Next.js API (if user is logged in)
      if (user?.email && supabaseClient) {
        try {
          await fetch('/api/reviews', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              input_code: code,
              review: reviewText,
              language: language,
              focus: focus,
              user_email: user.email,
              tags: tags,
              effort_estimation_minutes: effortMinutes,
            }),
          });

          // Refresh history after saving
          await fetchHistory();
        } catch (saveError) {
          console.error('Failed to save review:', saveError);
          // Don't show error to user - review still worked
        }
      }
    } catch (err) {
      setError('Could not connect to the review server. Make sure Django is running on port 8000.');
      showToast('Connection error. Check if backend is running.', 'error');
      console.error(err);
    }

    setIsLoading(false);
  };

  const handleAutoFix = async () => {
    if (!code.trim()) {
      showToast('Please enter code to fix', 'warning');
      return;
    }

    setIsFixing(true);
    setFixedCode('');
    setError('');
    showToast('Generating automatic fix...', 'info', 3000);

    try {
      // Call AI service with auto_fix flag, custom rules, and effort estimation
      const response = await fetch('http://127.0.0.1:8000/api/review/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          code: code,
          language: language,
          focus: focus,
          auto_fix: true,
          custom_rules: customRules,
          estimate_effort: true
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to generate fix');
        showToast(data.error || 'Failed to generate fix', 'error');
        setIsFixing(false);
        return;
      }

      const reviewText = data.review || '';
      const fixedCodeText = data.fixed_code || '';
      const hasFix = data.has_fix || false;
      const effortMinutes = data.effort_estimation_minutes || 0;

      setReview(reviewText);
      setFixedCode(fixedCodeText);
      setEffortEstimation(effortMinutes);

      if (fixedCodeText && fixedCodeText.length > 20) {
        showToast('✨ Auto-fix generated! Click "Apply Fix" to use it.', 'success', 4000);
      } else {
        // AI provided review but couldn't generate code
        showToast('💡 Review generated. AI suggests improvements but couldn\'t auto-generate code.', 'info', 5000);
        // Add helpful message to review
        const helpMessage = "\n\n---\n**Note:** The AI has identified issues but couldn't generate a complete fix automatically. Please review the suggestions above and apply them manually. For better auto-fix results, try:\n- Using a more specific focus area\n- Providing smaller code snippets\n- Ensuring the code has clear, fixable issues";
        setReview(reviewText + helpMessage);
      }

      // Save to Supabase if user is logged in
      if (user?.email && supabaseClient && reviewText) {
        try {
          await fetch('/api/reviews', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              input_code: code,
              review: reviewText + (fixedCodeText ? '\n\n[Auto-fix available]' : ''),
              language: language,
              focus: focus,
              user_email: user.email,
              tags: [...tags, 'auto-fix'],
              effort_estimation_minutes: effortMinutes,
            }),
          });
          await fetchHistory();
        } catch (saveError) {
          console.error('Failed to save review:', saveError);
        }
      }
    } catch (err) {
      setError('Could not connect to the review server. Make sure Django is running on port 8000.');
      showToast('Connection error. Check if backend is running.', 'error');
      console.error(err);
    }

    setIsFixing(false);
  };

  const handleApplyFix = () => {
    if (!fixedCode) {
      showToast('No fix available to apply', 'warning');
      return;
    }

    setCode(fixedCode);
    showToast('✨ Fix applied! Your code has been updated.', 'success');
    setFixedCode(''); // Clear after applying
  };

  const handleDownloadMarkdown = () => {
    if (!review) {
      showToast('No review to download', 'warning');
      return;
    }

    try {
      const markdown = `# Code Review Report

## Code Information
- **Language**: ${language.toUpperCase()}
- **Focus**: ${focus.charAt(0).toUpperCase() + focus.slice(1)}
- **Date**: ${new Date().toLocaleString()}

## Submitted Code
\`\`\`${language}
${code}
\`\`\`

## AI Review
${review}

---
Generated by AI Code Review Platform
`;

      fileDownload(markdown, `code-review-${Date.now()}.md`);
      showToast('Review downloaded as Markdown!', 'success');
    } catch (err) {
      console.error('Download failed:', err);
      showToast('Failed to download review', 'error');
    }
  };

  const handleCompareCode = (oldCode: string, newCode: string) => {
    // Create a diff view
    const diffCode = `=== ORIGINAL CODE ===\n${oldCode}\n\n=== UPDATED CODE ===\n${newCode}`;
    setCode(diffCode);
    setReview('');
  };

  const handleLoadGist = (gistCode: string, gistLanguage: string) => {
    setCode(gistCode);
    setLanguage(gistLanguage as Language);
    setReview('');
  };

  const handleShare = async () => {
    if (!review) {
      showToast('No review to share', 'warning');
      return;
    }
    if (!user?.email) {
      showToast('Please sign in to share reviews', 'warning');
      return;
    }

    try {
      showToast('Creating share link...', 'info', 2000);
      
      // Save review with shareable ID via Next.js API
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input_code: code,
          review: review,
          language: language,
          focus: focus,
          user_email: user.email,
          tags: tags,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.data?.id) {
        throw new Error('Failed to create share link');
      }

      const url = `${window.location.origin}?share=${result.data.id}`;
      setShareUrl(url);
      setShowShareModal(true);
      showToast('Share link created!', 'success');
    } catch (err) {
      console.error('Failed to create share link:', err);
      setError('Failed to create share link');
      showToast('Failed to create share link', 'error');
    }
  };

  const handleSignOut = async () => {
    if (!supabaseClient) return;
    await supabaseClient.auth.signOut();
    setUser(null);
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const bgClass = theme === 'dark' 
    ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' 
    : 'bg-gradient-to-br from-gray-50 via-white to-gray-100';
  const textClass = theme === 'dark' ? 'text-white' : 'text-gray-900';
  const cardBgClass = theme === 'dark' ? 'bg-gray-800' : 'bg-white';
  const borderClass = theme === 'dark' ? 'border-gray-700' : 'border-gray-300';

  return (
    <main className={`flex min-h-screen flex-col items-center p-6 ${bgClass} transition-colors duration-300`}>
      {/* Modals */}
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
        onSuccess={() => fetchHistory()} 
      />
      <DiffViewer 
        isOpen={showDiffViewer} 
        onClose={() => setShowDiffViewer(false)} 
        onCompare={handleCompareCode} 
      />
      <GistLoader 
        isOpen={showGistLoader} 
        onClose={() => setShowGistLoader(false)} 
        onLoad={handleLoadGist} 
      />

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className={`${cardBgClass} rounded-lg max-w-lg w-full p-6 border ${borderClass}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-xl font-bold ${textClass}`}>Share Review</h3>
              <button onClick={() => setShowShareModal(false)} className="text-gray-400 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-gray-400 mb-4">Share this link to let others view your code review:</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className={`flex-1 ${theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'} border ${borderClass} rounded-lg px-4 py-2 text-sm`}
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(shareUrl);
                  showToast('Link copied to clipboard!', 'success');
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Copy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Modal */}
      {showShortcuts && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className={`${cardBgClass} rounded-lg max-w-2xl w-full p-6 border ${borderClass}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-xl font-bold ${textClass}`}>⌨️ Keyboard Shortcuts</h3>
              <button onClick={() => setShowShortcuts(false)} className="text-gray-400 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-gray-700">
                <span className={`${textClass}`}>Review Code</span>
                <kbd className={`px-3 py-1 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} ${textClass} rounded text-sm font-mono`}>
                  Ctrl + Enter
                </kbd>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-700">
                <span className={`${textClass}`}>Auto-save Draft</span>
                <kbd className={`px-3 py-1 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} ${textClass} rounded text-sm font-mono`}>
                  Ctrl + S
                </kbd>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-700">
                <span className={`${textClass}`}>Download as Markdown</span>
                <kbd className={`px-3 py-1 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} ${textClass} rounded text-sm font-mono`}>
                  Ctrl + D
                </kbd>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-700">
                <span className={`${textClass}`}>Toggle Analytics</span>
                <kbd className={`px-3 py-1 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} ${textClass} rounded text-sm font-mono`}>
                  Ctrl + K
                </kbd>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className={`${textClass}`}>Show This Help</span>
                <kbd className={`px-3 py-1 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} ${textClass} rounded text-sm font-mono`}>
                  Shift + ?
                </kbd>
              </div>
            </div>

            <div className="mt-6 p-4 bg-blue-900/30 border border-blue-700 rounded-lg">
              <p className="text-sm text-blue-300">
                💡 <strong>Pro tip:</strong> All shortcuts work while focused on the application. Tags can be added by pressing Enter in the tag input field.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="w-full max-w-7xl mb-8">
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-gray-800 text-yellow-400' : 'bg-gray-200 text-gray-700'} hover:opacity-80`}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            {user && (
              <button
                onClick={() => setShowAnalytics(!showAnalytics)}
                className={`p-2 rounded-lg ${showAnalytics ? 'bg-blue-600 text-white' : theme === 'dark' ? 'bg-gray-800 text-blue-400' : 'bg-gray-200 text-blue-600'} hover:opacity-80`}
                title="Toggle Analytics Dashboard (Ctrl+K)"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </button>
            )}

            <button
              onClick={() => setShowShortcuts(true)}
              className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-gray-800 text-gray-400' : 'bg-gray-200 text-gray-600'} hover:opacity-80`}
              title="Keyboard Shortcuts (Shift+?)"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>

          <div className="flex items-center gap-4">
            {user && <Navigation theme={theme} />}
            <div className="flex items-center gap-3">
              {user ? (
                <>
                  <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {user.email}
                  </span>
                  <button
                    onClick={handleSignOut}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 text-sm"
                >
                  Sign In / Sign Up
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="text-center mb-6">
          <h1 className="text-5xl font-bold mb-3 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            AI Code Review Platform
          </h1>
          <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} text-lg`}>
            Get instant, intelligent feedback on your code from our local AI reviewer
          </p>
        </div>
      </div>

      {/* Analytics Dashboard */}
      {showAnalytics && user && (
        <div className="w-full max-w-7xl mb-8">
          <AnalyticsDashboard 
            reviews={history} 
            theme={theme} 
          />
        </div>
      )}

      <div className="w-full max-w-7xl">
        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 mb-4 justify-center">
          <button
            onClick={() => setShowDiffViewer(true)}
            className={`px-4 py-2 ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} ${textClass} rounded-lg transition-colors flex items-center gap-2`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            Compare Versions
          </button>
          <button
            onClick={() => setShowGistLoader(true)}
            className={`px-4 py-2 ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} ${textClass} rounded-lg transition-colors flex items-center gap-2`}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            Load from GitHub
          </button>
          {review && (
            <>
              <button
                onClick={handleDownloadMarkdown}
                className={`px-4 py-2 ${theme === 'dark' ? 'bg-green-700 hover:bg-green-600' : 'bg-green-600 hover:bg-green-700'} text-white rounded-lg transition-colors flex items-center gap-2`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download MD
              </button>
              {user && (
                <button
                  onClick={handleShare}
                  className={`px-4 py-2 ${theme === 'dark' ? 'bg-purple-700 hover:bg-purple-600' : 'bg-purple-600 hover:bg-purple-700'} text-white rounded-lg transition-colors flex items-center gap-2`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Share
                </button>
              )}
            </>
          )}
        </div>

        {/* Controls Bar */}
        <div className={`${cardBgClass} rounded-lg p-4 border ${borderClass} shadow-xl`}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Language Selector */}
            <div>
              <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                Programming Language
              </label>
              <select
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value as Language)}
                className={`w-full ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              >
                <option value="python">Python</option>
                <option value="javascript">JavaScript</option>
                <option value="typescript">TypeScript</option>
                <option value="java">Java</option>
                <option value="csharp">C#</option>
                <option value="go">Go</option>
                <option value="rust">Rust</option>
                <option value="cpp">C++</option>
                <option value="php">PHP</option>
                <option value="ruby">Ruby</option>
              </select>
            </div>

            {/* Focus Area Selector */}
            <div>
              <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                Review Focus
              </label>
              <select
                value={focus}
                onChange={(e) => setFocus(e.target.value as Focus)}
                className={`w-full px-4 py-2.5 ${theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-white text-gray-900'} border ${borderClass} rounded-lg`}
              >
                <option value="general">General Review</option>
                <option value="security">Security Analysis</option>
                <option value="performance">Performance Optimization</option>
                <option value="style">Code Style & Readability</option>
                <option value="bugs">Bug Detection</option>
              </select>
            </div>

            {/* Tags */}
            <div>
              <label className={`block mb-2 text-sm font-medium ${textClass}`}>
                Tags (optional)
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={currentTag}
                  onChange={(e) => setCurrentTag(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && currentTag.trim()) {
                      e.preventDefault();
                      if (!tags.includes(currentTag.trim())) {
                        setTags([...tags, currentTag.trim()]);
                      }
                      setCurrentTag('');
                    }
                  }}
                  placeholder="Add a tag (press Enter)"
                  className={`flex-1 px-4 py-2.5 ${theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-white text-gray-900'} border ${borderClass} rounded-lg text-sm`}
                />
                <button
                  onClick={() => {
                    if (currentTag.trim() && !tags.includes(currentTag.trim())) {
                      setTags([...tags, currentTag.trim()]);
                      setCurrentTag('');
                    }
                  }}
                  className={`px-4 py-2.5 ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} ${textClass} rounded-lg text-sm`}
                >
                  Add
                </button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className={`inline-flex items-center gap-1 px-3 py-1 ${theme === 'dark' ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-700'} rounded-full text-sm`}
                    >
                      {tag}
                      <button
                        onClick={() => setTags(tags.filter((_, i) => i !== idx))}
                        className="hover:text-red-500"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-end gap-2">
              <button
                onClick={handleReview}
                disabled={isLoading || isFixing}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-2.5 px-6 rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Reviewing...
                  </span>
                ) : (
                  '🤖 Review Code'
                )}
              </button>
              <button
                onClick={handleAutoFix}
                disabled={isLoading || isFixing}
                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold py-2.5 px-6 rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
                title="Get AI-powered automatic fixes"
              >
                {isFixing ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Fixing...
                  </span>
                ) : (
                  '✨ Auto-Fix'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="w-full max-w-7xl mb-4">
          <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg">
            <strong className="font-bold">Error: </strong>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Code Input Panel */}
        <div className="flex flex-col">
          <div className={`${cardBgClass} rounded-lg border ${borderClass} shadow-xl overflow-hidden flex flex-col h-[600px]`}>
            <div className={`${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'} px-4 py-3 border-b ${borderClass} flex items-center justify-between`}>
              <h2 className={`text-lg font-semibold ${textClass}`}>Your Code</h2>
              <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">
                {language.toUpperCase()}
              </span>
            </div>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className={`flex-1 font-mono text-sm p-4 ${theme === 'dark' ? 'bg-gray-900 text-gray-100' : 'bg-white text-gray-900'} border-none focus:outline-none resize-none`}
              placeholder="Paste your code here..."
              spellCheck="false"
            />
            <div className={`${theme === 'dark' ? 'bg-gray-900 text-gray-500' : 'bg-gray-100 text-gray-600'} px-4 py-2 border-t ${borderClass} text-xs`}>
              {code.split('\n').length} lines • {code.length} characters
            </div>
          </div>
        </div>

        {/* Review Output Panel */}
        <div className="flex flex-col">
          <div className={`${cardBgClass} rounded-lg border ${borderClass} shadow-xl overflow-hidden flex flex-col h-[600px]`}>
            <div className={`${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'} px-4 py-3 border-b ${borderClass}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className={`text-lg font-semibold ${textClass}`}>AI Review</h2>
                  {effortEstimation > 0 && (
                    <span className={`text-xs ${theme === 'dark' ? 'bg-orange-900/50 text-orange-300' : 'bg-orange-100 text-orange-700'} px-2 py-1 rounded flex items-center gap-1`}>
                      ⏱️ {effortEstimation}m to fix
                    </span>
                  )}
                  {customRules && (
                    <span className={`text-xs ${theme === 'dark' ? 'bg-purple-900/50 text-purple-300' : 'bg-purple-100 text-purple-700'} px-2 py-1 rounded flex items-center gap-1`}>
                      ⚙️ Custom rules active
                    </span>
                  )}
                </div>
                {fixedCode && (
                  <button
                    onClick={handleApplyFix}
                    className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-2 rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-lg flex items-center gap-2 animate-pulse"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    ✨ Apply Fix
                  </button>
                )}
              </div>
            </div>
            <div className={`flex-1 overflow-y-auto p-4 ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
              {isLoading && (
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mb-4"></div>
                  <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Analyzing your code...</p>
                </div>
              )}
              
              {!isLoading && !review && !error && (
                <div className={`flex flex-col items-center justify-center h-full ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                  <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p>Your AI review will appear here</p>
                  <p className="text-sm mt-2">Select a language and click "Review Code"</p>
                </div>
              )}
              
              {review && (
                <div className={`prose ${theme === 'dark' ? 'prose-invert' : 'prose-gray'} max-w-none`}>
                  <div className={`whitespace-pre-wrap ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'} leading-relaxed`}>
                    {review}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Review History Section */}
      {user && (
        <section className="mt-8 w-full max-w-7xl">
          <div className={`${cardBgClass} rounded-lg border ${borderClass} shadow-xl overflow-hidden`}>
            <div className={`${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'} px-4 py-3 border-b ${borderClass}`}>
              <h2 className={`text-xl font-semibold ${textClass} mb-3`}>📚 Your Review History</h2>
              
              {/* Search Bar */}
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search reviews by language, focus, or tags..."
                  className={`w-full px-4 py-2 pl-10 ${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} border ${borderClass} rounded-lg text-sm`}
                />
                <svg className={`absolute left-3 top-2.5 w-5 h-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          
          <div className="p-4">
            {historyError && (
              <div className="bg-yellow-900/50 border border-yellow-700 text-yellow-200 px-4 py-3 rounded-lg">
                <p className="text-sm">{historyError}</p>
              </div>
            )}

            {!historyError && history.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm">
                  {isSupabaseConfigured
                    ? 'No reviews saved yet. Start reviewing code to build your history!'
                    : 'History is disabled. Configure Supabase to track reviews.'}
                </p>
              </div>
            )}

            <div className="space-y-4 max-h-96 overflow-y-auto">
              {history
                .filter(item => {
                  if (!searchQuery) return true;
                  const query = searchQuery.toLowerCase();
                  return (
                    item.language?.toLowerCase().includes(query) ||
                    item.focus?.toLowerCase().includes(query) ||
                    item.tags?.some(tag => tag.toLowerCase().includes(query)) ||
                    item.input_code?.toLowerCase().includes(query) ||
                    item.review?.toLowerCase().includes(query)
                  );
                })
                .map((item, index) => {
                const timestamp = item.created_at
                  ? new Date(item.created_at).toLocaleString()
                  : 'Timestamp unavailable';

                return (
                  <article
                    key={item.id}
                    className="border border-gray-700 rounded-lg p-4 bg-gray-900 hover:bg-gray-850 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">Review #{history.length - index}</span>
                        {item.language && (
                          <span className="text-xs bg-blue-600/30 text-blue-300 px-2 py-0.5 rounded">
                            {item.language}
                          </span>
                        )}
                        {item.focus && (
                          <span className="text-xs bg-purple-600/30 text-purple-300 px-2 py-0.5 rounded">
                            {item.focus}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">{timestamp}</span>
                    </div>

                    {/* Display tags if available */}
                    {item.tags && item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {item.tags.map((tag, tagIdx) => (
                          <span
                            key={tagIdx}
                            className="text-xs bg-green-900/50 text-green-300 px-2 py-0.5 rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    <details className="group">
                      <summary className="cursor-pointer text-sm text-blue-400 hover:text-blue-300 mb-2 list-none flex items-center">
                        <svg className="w-4 h-4 mr-2 transform group-open:rotate-90 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        View code snippet
                      </summary>
                      <div className="mb-3 mt-2">
                        <SyntaxHighlighter
                          language="python"
                          style={vscDarkPlus}
                          customStyle={{
                            margin: 0,
                            borderRadius: '0.375rem',
                            fontSize: '0.75rem',
                            maxHeight: '200px'
                          }}
                        >
                          {item.input_code.substring(0, 500) + (item.input_code.length > 500 ? '...' : '')}
                        </SyntaxHighlighter>
                      </div>
                    </details>
                    
                    <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                      <p className="text-xs text-gray-400 mb-2 font-semibold">AI Review:</p>
                      <div className="text-sm text-gray-300 whitespace-pre-wrap max-h-32 overflow-y-auto">
                        {item.review.substring(0, 300) + (item.review.length > 300 ? '...' : '')}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
        </section>
      )}
    </main>
  );
}