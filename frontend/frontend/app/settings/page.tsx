'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/contexts/ToastContext';

export default function SettingsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [customRules, setCustomRules] = useState('');
  const [originalRules, setOriginalRules] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  const cardBgClass = theme === 'dark' ? 'bg-gray-800' : 'bg-white';
  const textClass = theme === 'dark' ? 'text-white' : 'text-gray-900';
  const borderClass = theme === 'dark' ? 'border-gray-700' : 'border-gray-300';
  const bgClass = theme === 'dark' 
    ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' 
    : 'bg-gradient-to-br from-gray-50 via-white to-gray-100';

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        router.push('/');
        return;
      }
      setUser(session.user);
      fetchProfile(session.user.email!);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        router.push('/');
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const fetchProfile = async (email: string) => {
    setIsLoading(true);

    try {
      const response = await fetch(`/api/profiles?user_email=${encodeURIComponent(email)}`);
      const result = await response.json();

      if (response.ok && result.data) {
        const rules = result.data.custom_rules || '';
        setCustomRules(rules);
        setOriginalRules(rules);
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
      showToast('Failed to load settings', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user?.email) return;

    setIsSaving(true);

    try {
      const response = await fetch('/api/profiles', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_email: user.email,
          custom_rules: customRules,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save settings');
      }

      setOriginalRules(customRules);
      showToast('Settings saved successfully!', 'success');
    } catch (err: any) {
      console.error('Failed to save settings:', err);
      showToast(err.message || 'Failed to save settings', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = customRules !== originalRules;

  const exampleRules = [
    "All functions must have Python docstrings with parameter descriptions.",
    "Never use print() statements; use logging instead.",
    "Variable names must be camelCase.",
    "Always include error handling with try-except blocks.",
    "Maximum function length is 50 lines.",
    "No global variables allowed.",
    "All database queries must use parameterized statements.",
    "Include type hints for all function parameters and return values."
  ];

  if (isLoading) {
    return (
      <div className={`min-h-screen ${bgClass} flex items-center justify-center`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
            Loading settings...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bgClass} p-6`}>
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-8">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => router.push('/')}
            className={`flex items-center gap-2 ${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Review
          </button>
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-gray-800 text-yellow-400' : 'bg-gray-200 text-gray-700'} hover:opacity-80`}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>

        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          ⚙️ Personal AI Reviewer Settings
        </h1>
        <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} text-lg`}>
          Customize your AI code reviewer with your own coding guidelines
        </p>
      </div>

      {/* Info Card */}
      <div className="max-w-4xl mx-auto mb-6">
        <div className={`${theme === 'dark' ? 'bg-blue-900/30 border-blue-700' : 'bg-blue-50 border-blue-200'} border rounded-lg p-4`}>
          <div className="flex items-start gap-3">
            <svg className={`w-6 h-6 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'} flex-shrink-0 mt-0.5`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className={`font-semibold ${theme === 'dark' ? 'text-blue-300' : 'text-blue-900'} mb-1`}>
                How Custom Rules Work
              </h3>
              <p className={`text-sm ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>
                Write your coding rules in plain English. The AI will automatically enforce these guidelines 
                when reviewing your code, making it feel like a truly personalized mentor that understands 
                your team's specific standards.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto">
        <div className={`${cardBgClass} rounded-lg border ${borderClass} shadow-xl overflow-hidden`}>
          {/* Header */}
          <div className={`${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'} px-6 py-4 border-b ${borderClass}`}>
            <h2 className={`text-xl font-semibold ${textClass}`}>Custom Coding Guidelines</h2>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
              Define your personal or team coding standards
            </p>
          </div>

          {/* Form */}
          <div className="p-6">
            <textarea
              value={customRules}
              onChange={(e) => setCustomRules(e.target.value)}
              placeholder="Enter your custom coding rules here... (one rule per line works best)"
              className={`w-full h-64 px-4 py-3 ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'} border ${borderClass} rounded-lg text-sm font-mono resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            />

            <div className="mt-4 flex items-center justify-between">
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                {customRules.length} characters • {customRules.split('\n').filter(l => l.trim()).length} rules
              </p>
              <div className="flex gap-3">
                {hasChanges && (
                  <button
                    onClick={() => setCustomRules(originalRules)}
                    className={`px-4 py-2 ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} ${textClass} rounded-lg transition-colors`}
                  >
                    Reset
                  </button>
                )}
                <button
                  onClick={handleSave}
                  disabled={isSaving || !hasChanges}
                  className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Save Settings
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Examples Section */}
        <div className={`${cardBgClass} rounded-lg border ${borderClass} shadow-xl mt-6 overflow-hidden`}>
          <div className={`${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'} px-6 py-4 border-b ${borderClass}`}>
            <h3 className={`text-lg font-semibold ${textClass}`}>💡 Example Rules</h3>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
              Click to add any example to your custom rules
            </p>
          </div>

          <div className="p-6">
            <div className="space-y-2">
              {exampleRules.map((rule, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    const newRules = customRules ? `${customRules}\n${rule}` : rule;
                    setCustomRules(newRules);
                    showToast('Rule added!', 'success', 1500);
                  }}
                  className={`w-full text-left px-4 py-3 ${theme === 'dark' ? 'bg-gray-900 hover:bg-gray-850 border-gray-700' : 'bg-gray-50 hover:bg-gray-100 border-gray-200'} border rounded-lg transition-colors flex items-center gap-3`}
                >
                  <svg className={`w-5 h-5 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    {rule}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tips Section */}
        <div className={`${cardBgClass} rounded-lg border ${borderClass} shadow-xl mt-6 overflow-hidden`}>
          <div className={`${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'} px-6 py-4 border-b ${borderClass}`}>
            <h3 className={`text-lg font-semibold ${textClass}`}>📝 Tips for Writing Good Rules</h3>
          </div>

          <div className="p-6 space-y-3">
            <div className="flex items-start gap-3">
              <span className="text-2xl">✅</span>
              <div>
                <h4 className={`font-semibold ${textClass} mb-1`}>Be Specific</h4>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  "Use async/await instead of .then() for promises" is better than "Write good async code"
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="text-2xl">✅</span>
              <div>
                <h4 className={`font-semibold ${textClass} mb-1`}>One Rule Per Line</h4>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Make each rule a separate line so the AI can clearly identify and check each one
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="text-2xl">✅</span>
              <div>
                <h4 className={`font-semibold ${textClass} mb-1`}>Include Context</h4>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Mention why a rule matters: "Always sanitize SQL inputs to prevent injection attacks"
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="text-2xl">✅</span>
              <div>
                <h4 className={`font-semibold ${textClass} mb-1`}>Language-Specific is OK</h4>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  The AI will only apply Python rules to Python code, JavaScript rules to JavaScript, etc.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
