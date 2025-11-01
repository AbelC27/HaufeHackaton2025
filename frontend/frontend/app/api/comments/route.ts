import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// GET - Fetch all comments for a specific review
export async function GET(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase is not configured' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const reviewId = searchParams.get('review_id');

    if (!reviewId) {
      return NextResponse.json(
        { error: 'Review ID is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('review_comments')
      .select('*')
      .eq('review_id', reviewId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Supabase fetch error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: data || [] });
  } catch (error: any) {
    console.error('Failed to fetch comments:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}

// POST - Create a new comment and get AI follow-up response
export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase is not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { 
      review_id, 
      user_email, 
      comment_text, 
      original_code,
      original_review,
      language 
    } = body;

    if (!review_id || !comment_text) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Step 1: Save user comment
    const { data: userComment, error: userCommentError } = await supabase
      .from('review_comments')
      .insert({
        review_id,
        user_email,
        comment_text,
        comment_type: 'user'
      })
      .select()
      .single();

    if (userCommentError) {
      console.error('Failed to save user comment:', userCommentError);
      return NextResponse.json(
        { error: userCommentError.message },
        { status: 500 }
      );
    }

    // Step 2: Get AI response from Django
    let aiResponse = '';
    try {
      const djangoResponse = await fetch('http://127.0.0.1:8000/api/follow-up/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          original_code,
          original_review,
          user_question: comment_text,
          language: language || 'python'
        }),
      });

      if (djangoResponse.ok) {
        const aiData = await djangoResponse.json();
        aiResponse = aiData.ai_response || 'Could not generate AI response.';
      } else {
        aiResponse = 'AI service temporarily unavailable. Please try again.';
      }
    } catch (aiError) {
      console.error('AI follow-up error:', aiError);
      aiResponse = 'Could not connect to AI service.';
    }

    // Step 3: Save AI response
    const { data: aiComment, error: aiCommentError } = await supabase
      .from('review_comments')
      .insert({
        review_id,
        comment_text: aiResponse,
        comment_type: 'ai',
        parent_comment_id: userComment.id
      })
      .select()
      .single();

    if (aiCommentError) {
      console.error('Failed to save AI comment:', aiCommentError);
      // Still return success since user comment was saved
    }

    return NextResponse.json({ 
      success: true, 
      userComment,
      aiComment: aiComment || { comment_text: aiResponse }
    });
  } catch (error: any) {
    console.error('Failed to process comment:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process comment' },
      { status: 500 }
    );
  }
}
