import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase is not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { input_code, review, language, focus, user_email, effort_estimation_minutes, tags } = body;

    if (!input_code || !review) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const data: any = {
      input_code,
      review,
      language: language || 'python',
      focus: focus || 'general',
      effort_estimation_minutes: effort_estimation_minutes || 0,
    };

    if (user_email) {
      data.user_email = user_email;
    }

    if (tags && Array.isArray(tags)) {
      data.tags = tags;
    }

    const { data: insertedData, error } = await supabase
      .from('code_reviews')
      .insert(data)
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: insertedData });
  } catch (error: any) {
    console.error('Failed to save review:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save review' },
      { status: 500 }
    );
  }
}

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

    let query = supabase
      .from('code_reviews')
      .select('id, input_code, review, language, focus, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (userEmail) {
      query = query.eq('user_email', userEmail);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase fetch error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: data || [] });
  } catch (error: any) {
    console.error('Failed to fetch reviews:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}
