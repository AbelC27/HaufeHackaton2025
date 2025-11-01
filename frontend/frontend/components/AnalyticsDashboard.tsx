'use client';

import { useMemo } from 'react';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

type ReviewHistoryItem = {
  id: string | number;
  input_code: string;
  review: string;
  language?: string;
  focus?: string;
  created_at: string | null;
};

type AnalyticsDashboardProps = {
  reviews: ReviewHistoryItem[];
  theme: 'dark' | 'light';
};

const COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#6366F1'];

export default function AnalyticsDashboard({ reviews, theme }: AnalyticsDashboardProps) {
  const analytics = useMemo(() => {
    if (!reviews.length) return null;

    // Language distribution
    const languageCounts: Record<string, number> = {};
    reviews.forEach(r => {
      const lang = r.language || 'unknown';
      languageCounts[lang] = (languageCounts[lang] || 0) + 1;
    });
    const languageData = Object.entries(languageCounts).map(([name, value]) => ({
      name: name.toUpperCase(),
      value
    }));

    // Focus distribution
    const focusCounts: Record<string, number> = {};
    reviews.forEach(r => {
      const focus = r.focus || 'general';
      focusCounts[focus] = (focusCounts[focus] || 0) + 1;
    });
    const focusData = Object.entries(focusCounts).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value
    }));

    // Reviews over time (last 7 days)
    const now = new Date();
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(now);
      date.setDate(date.getDate() - (6 - i));
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });

    const reviewsByDay: Record<string, number> = {};
    reviews.forEach(r => {
      if (r.created_at) {
        const date = new Date(r.created_at);
        const key = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        reviewsByDay[key] = (reviewsByDay[key] || 0) + 1;
      }
    });

    const timelineData = last7Days.map(day => ({
      date: day,
      reviews: reviewsByDay[day] || 0
    }));

    // Calculate avg code length
    const totalCodeLength = reviews.reduce((sum, r) => sum + (r.input_code?.length || 0), 0);
    const avgCodeLength = Math.round(totalCodeLength / reviews.length);

    return {
      languageData,
      focusData,
      timelineData,
      totalReviews: reviews.length,
      avgCodeLength,
      mostUsedLanguage: languageData.sort((a, b) => b.value - a.value)[0]?.name || 'N/A',
      mostUsedFocus: focusData.sort((a, b) => b.value - a.value)[0]?.name || 'N/A'
    };
  }, [reviews]);

  if (!analytics) {
    return (
      <div className={`text-center py-12 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
        <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <p>No data yet. Start reviewing code to see your analytics!</p>
      </div>
    );
  }

  const cardBg = theme === 'dark' ? 'bg-gray-800' : 'bg-white';
  const borderColor = theme === 'dark' ? 'border-gray-700' : 'border-gray-300';
  const textColor = theme === 'dark' ? 'text-gray-200' : 'text-gray-900';
  const mutedText = theme === 'dark' ? 'text-gray-400' : 'text-gray-600';

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className={`${cardBg} border ${borderColor} rounded-lg p-4`}>
          <div className={`text-sm ${mutedText} mb-1`}>Total Reviews</div>
          <div className={`text-3xl font-bold ${textColor}`}>{analytics.totalReviews}</div>
        </div>
        <div className={`${cardBg} border ${borderColor} rounded-lg p-4`}>
          <div className={`text-sm ${mutedText} mb-1`}>Most Used Language</div>
          <div className={`text-2xl font-bold ${textColor}`}>{analytics.mostUsedLanguage}</div>
        </div>
        <div className={`${cardBg} border ${borderColor} rounded-lg p-4`}>
          <div className={`text-sm ${mutedText} mb-1`}>Avg Code Length</div>
          <div className={`text-2xl font-bold ${textColor}`}>{analytics.avgCodeLength} chars</div>
        </div>
        <div className={`${cardBg} border ${borderColor} rounded-lg p-4`}>
          <div className={`text-sm ${mutedText} mb-1`}>Top Focus</div>
          <div className={`text-2xl font-bold ${textColor}`}>{analytics.mostUsedFocus}</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Language Distribution */}
        <div className={`${cardBg} border ${borderColor} rounded-lg p-6`}>
          <h3 className={`text-lg font-semibold ${textColor} mb-4`}>Language Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={analytics.languageData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {analytics.languageData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: theme === 'dark' ? '#1f2937' : '#fff', border: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}` }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Focus Area Distribution */}
        <div className={`${cardBg} border ${borderColor} rounded-lg p-6`}>
          <h3 className={`text-lg font-semibold ${textColor} mb-4`}>Review Focus Areas</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={analytics.focusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {analytics.focusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: theme === 'dark' ? '#1f2937' : '#fff', border: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}` }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Timeline */}
      <div className={`${cardBg} border ${borderColor} rounded-lg p-6`}>
        <h3 className={`text-lg font-semibold ${textColor} mb-4`}>Reviews Over Time (Last 7 Days)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={analytics.timelineData}>
            <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#e5e7eb'} />
            <XAxis dataKey="date" stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'} />
            <YAxis stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'} />
            <Tooltip contentStyle={{ backgroundColor: theme === 'dark' ? '#1f2937' : '#fff', border: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}` }} />
            <Legend />
            <Line type="monotone" dataKey="reviews" stroke="#3B82F6" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
