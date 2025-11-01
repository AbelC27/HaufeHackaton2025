'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import ReviewThread from '@/components/ReviewThread';

interface DashboardData {
  totalReviews: number;
  totalEffortMinutes: number;
  totalEffortHours: string;
  avgEffortMinutes: number;
  languageStats: Record<string, number>;
  focusStats: Record<string, number>;
  recentReviews: any[];
  highPriorityItems: any[];
  trend: number;
  recentActivity: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  
  // Review thread modal
  const [selectedReview, setSelectedReview] = useState<any>(null);
  const [showReviewThread, setShowReviewThread] = useState(false);

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
      fetchDashboardData(session.user.email!);
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

  const fetchDashboardData = async (email: string) => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/dashboard?user_email=${encodeURIComponent(email)}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch dashboard data');
      }

      setDashboardData(result.data);
    } catch (err: any) {
      console.error('Failed to fetch dashboard:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenReviewThread = (review: any) => {
    setSelectedReview(review);
    setShowReviewThread(true);
  };

  if (isLoading) {
    return (
      <div className={`min-h-screen ${bgClass} flex items-center justify-center`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
            Loading your dashboard...
          </p>
        </div>
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <div className={`min-h-screen ${bgClass} flex items-center justify-center p-6`}>
        <div className={`${cardBgClass} rounded-lg p-8 border ${borderClass} max-w-md w-full text-center`}>
          <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className={`text-xl font-bold ${textClass} mb-2`}>Error Loading Dashboard</h2>
          <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
            {error || 'Something went wrong'}
          </p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Back Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bgClass} p-6`}>
      {/* Review Thread Modal */}
      {showReviewThread && selectedReview && (
        <ReviewThread
          reviewId={selectedReview.id}
          originalCode={selectedReview.input_code}
          originalReview={selectedReview.review}
          language={selectedReview.language || 'python'}
          userEmail={user?.email}
          theme={theme}
          onClose={() => {
            setShowReviewThread(false);
            setSelectedReview(null);
          }}
        />
      )}

      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
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
          📊 Technical Debt Dashboard
        </h1>
        <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} text-lg`}>
          Track your code quality and estimate the effort needed to fix issues
        </p>
      </div>

      {/* Key Metrics */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Reviews */}
        <div className={`${cardBgClass} rounded-lg p-6 border ${borderClass} shadow-xl`}>
          <div className="flex items-center justify-between mb-2">
            <h3 className={`text-sm font-semibold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Total Reviews
            </h3>
            <span className="text-2xl">📝</span>
          </div>
          <p className={`text-3xl font-bold ${textClass}`}>{dashboardData.totalReviews}</p>
          {dashboardData.trend !== 0 && (
            <p className={`text-sm mt-2 ${dashboardData.trend > 0 ? 'text-green-500' : 'text-red-500'}`}>
              {dashboardData.trend > 0 ? '↑' : '↓'} {Math.abs(dashboardData.trend)}% this week
            </p>
          )}
        </div>

        {/* Total Technical Debt */}
        <div className={`${cardBgClass} rounded-lg p-6 border ${borderClass} shadow-xl`}>
          <div className="flex items-center justify-between mb-2">
            <h3 className={`text-sm font-semibold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Technical Debt
            </h3>
            <span className="text-2xl">⏱️</span>
          </div>
          <p className={`text-3xl font-bold ${textClass}`}>{dashboardData.totalEffortHours}h</p>
          <p className={`text-sm mt-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
            {dashboardData.totalEffortMinutes} minutes total
          </p>
        </div>

        {/* Average Effort */}
        <div className={`${cardBgClass} rounded-lg p-6 border ${borderClass} shadow-xl`}>
          <div className="flex items-center justify-between mb-2">
            <h3 className={`text-sm font-semibold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Avg Effort per Review
            </h3>
            <span className="text-2xl">⚡</span>
          </div>
          <p className={`text-3xl font-bold ${textClass}`}>{dashboardData.avgEffortMinutes}m</p>
          <p className={`text-sm mt-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
            per code review
          </p>
        </div>

        {/* Recent Activity */}
        <div className={`${cardBgClass} rounded-lg p-6 border ${borderClass} shadow-xl`}>
          <div className="flex items-center justify-between mb-2">
            <h3 className={`text-sm font-semibold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Recent Activity
            </h3>
            <span className="text-2xl">🔥</span>
          </div>
          <p className={`text-3xl font-bold ${textClass}`}>{dashboardData.recentActivity}</p>
          <p className={`text-sm mt-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
            reviews this week
          </p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Language Distribution */}
        <div className={`${cardBgClass} rounded-lg p-6 border ${borderClass} shadow-xl`}>
          <h3 className={`text-lg font-bold ${textClass} mb-4`}>📚 Language Distribution</h3>
          <div className="space-y-3">
            {Object.entries(dashboardData.languageStats).map(([lang, count]) => {
              const percentage = ((count / dashboardData.totalReviews) * 100).toFixed(1);
              return (
                <div key={lang}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm ${textClass} capitalize`}>{lang}</span>
                    <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {count} ({percentage}%)
                    </span>
                  </div>
                  <div className={`w-full ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} rounded-full h-2`}>
                    <div
                      className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Focus Area Distribution */}
        <div className={`${cardBgClass} rounded-lg p-6 border ${borderClass} shadow-xl`}>
          <h3 className={`text-lg font-bold ${textClass} mb-4`}>🎯 Focus Area Distribution</h3>
          <div className="space-y-3">
            {Object.entries(dashboardData.focusStats).map(([focus, count]) => {
              const percentage = ((count / dashboardData.totalReviews) * 100).toFixed(1);
              return (
                <div key={focus}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm ${textClass} capitalize`}>{focus}</span>
                    <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {count} ({percentage}%)
                    </span>
                  </div>
                  <div className={`w-full ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} rounded-full h-2`}>
                    <div
                      className="bg-gradient-to-r from-green-600 to-emerald-600 h-2 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* High Priority Tasks */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className={`${cardBgClass} rounded-lg p-6 border ${borderClass} shadow-xl`}>
          <h3 className={`text-lg font-bold ${textClass} mb-4 flex items-center gap-2`}>
            <span>🚨</span>
            High Priority Tasks (30+ minutes)
          </h3>
          {dashboardData.highPriorityItems.length === 0 ? (
            <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} text-center py-8`}>
              🎉 Great! No high-effort tasks pending.
            </p>
          ) : (
            <div className="space-y-3">
              {dashboardData.highPriorityItems.map((item, idx) => (
                <div
                  key={item.id}
                  className={`${theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'} border rounded-lg p-4 hover:border-blue-500 transition-colors cursor-pointer`}
                  onClick={() => handleOpenReviewThread(item)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs ${theme === 'dark' ? 'bg-blue-600/30 text-blue-300' : 'bg-blue-100 text-blue-700'} px-2 py-0.5 rounded`}>
                          {item.language}
                        </span>
                        <span className={`text-xs ${theme === 'dark' ? 'bg-purple-600/30 text-purple-300' : 'bg-purple-100 text-purple-700'} px-2 py-0.5 rounded`}>
                          {item.focus}
                        </span>
                        <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                          {new Date(item.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        {item.review.substring(0, 150)}...
                      </p>
                    </div>
                    <div className="ml-4 text-right">
                      <p className="text-2xl font-bold text-orange-500">
                        {item.effort_estimation_minutes}m
                      </p>
                      <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                        estimated
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Reviews */}
      <div className="max-w-7xl mx-auto">
        <div className={`${cardBgClass} rounded-lg p-6 border ${borderClass} shadow-xl`}>
          <h3 className={`text-lg font-bold ${textClass} mb-4`}>📋 Recent Reviews</h3>
          {dashboardData.recentReviews.length === 0 ? (
            <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} text-center py-8`}>
              No reviews yet. Start reviewing code to see your history!
            </p>
          ) : (
            <div className="space-y-3">
              {dashboardData.recentReviews.map((review) => (
                <div
                  key={review.id}
                  className={`${theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'} border rounded-lg p-4 hover:border-blue-500 transition-colors cursor-pointer`}
                  onClick={() => handleOpenReviewThread(review)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs ${theme === 'dark' ? 'bg-blue-600/30 text-blue-300' : 'bg-blue-100 text-blue-700'} px-2 py-0.5 rounded`}>
                          {review.language}
                        </span>
                        <span className={`text-xs ${theme === 'dark' ? 'bg-purple-600/30 text-purple-300' : 'bg-purple-100 text-purple-700'} px-2 py-0.5 rounded`}>
                          {review.focus}
                        </span>
                        <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                          {new Date(review.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        {review.review.substring(0, 100)}...
                      </p>
                    </div>
                    <div className="ml-4 text-right">
                      <p className={`text-lg font-bold ${textClass}`}>
                        {review.effort_estimation_minutes}m
                      </p>
                      <button className={`text-xs ${theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}>
                        💬 Discuss
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
