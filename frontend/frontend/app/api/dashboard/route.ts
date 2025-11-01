import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// GET - Fetch dashboard data with effort estimation analytics
export async function GET(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase is not configured' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('user_email');

    if (!userEmail) {
      return NextResponse.json(
        { error: 'User email is required' },
        { status: 400 }
      );
    }

    // Fetch all reviews for the user
    const { data: reviews, error } = await supabase
      .from('code_reviews')
      .select('id, language, focus, effort_estimation_minutes, tags, created_at, review, input_code')
      .eq('user_email', userEmail)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase fetch error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Calculate statistics
    const totalReviews = reviews?.length || 0;
    const totalEffortMinutes = reviews?.reduce((sum, r) => sum + (r.effort_estimation_minutes || 0), 0) || 0;
    const avgEffortMinutes = totalReviews > 0 ? Math.round(totalEffortMinutes / totalReviews) : 0;

    // Group by language
    const languageStats: Record<string, number> = {};
    const focusStats: Record<string, number> = {};
    const recentReviews = reviews?.slice(0, 10) || [];

    reviews?.forEach(review => {
      if (review.language) {
        languageStats[review.language] = (languageStats[review.language] || 0) + 1;
      }
      if (review.focus) {
        focusStats[review.focus] = (focusStats[review.focus] || 0) + 1;
      }
    });

    // Calculate trend (compare last 7 days vs previous 7 days)
    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const previous7Days = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const recentReviewsCount = reviews?.filter(r => new Date(r.created_at) >= last7Days).length || 0;
    const previousReviewsCount = reviews?.filter(r => {
      const date = new Date(r.created_at);
      return date >= previous7Days && date < last7Days;
    }).length || 0;

    const trend = previousReviewsCount > 0 
      ? Math.round(((recentReviewsCount - previousReviewsCount) / previousReviewsCount) * 100)
      : 0;

    // Identify high-priority items (high effort)
    const highPriorityItems = reviews
      ?.filter(r => (r.effort_estimation_minutes || 0) >= 30)
      .slice(0, 5) || [];

    return NextResponse.json({
      data: {
        totalReviews,
        totalEffortMinutes,
        totalEffortHours: (totalEffortMinutes / 60).toFixed(1),
        avgEffortMinutes,
        languageStats,
        focusStats,
        recentReviews,
        highPriorityItems,
        trend,
        recentActivity: recentReviewsCount
      }
    });
  } catch (error: any) {
    console.error('Failed to fetch dashboard data:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
