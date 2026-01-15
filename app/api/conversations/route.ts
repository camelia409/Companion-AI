import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function verifyAuth() {
  const supabase = createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    console.error('Auth verification failed:', error)
    return { user: null, error: 'Unauthorized - session expired or invalid' }
  }
  
  return { user, error: null }
}

export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await verifyAuth()
    
    if (authError || !user) {
      return NextResponse.json({ 
        error: authError || 'Unauthorized - Please log out and log back in to refresh your session.',
      }, { status: 401 })
    }

    const supabase = createClient()
    
    // Get all conversations ordered by date (newest first)
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('id, date, created_at, updated_at')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(30) // Last 30 conversations

    if (convError) {
      console.error('Error fetching conversations:', convError)
      return NextResponse.json({ error: convError.message }, { status: 500 })
    }

    return NextResponse.json({ conversations: conversations || [] })
  } catch (error) {
    console.error('Error in GET /api/conversations:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { user, error: authError } = await verifyAuth()
    
    if (authError || !user) {
      return NextResponse.json({ 
        error: authError || 'Unauthorized - Please log out and log back in to refresh your session.',
      }, { status: 401 })
    }

    const supabase = createClient()
    const body = await request.json()
    const { conversationId } = body

    if (!conversationId) {
      return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 })
    }

    // Verify conversation belongs to user (RLS should handle this, but double-check)
    const { data: conversation, error: checkError } = await supabase
      .from('conversations')
      .select('id, user_id')
      .eq('id', conversationId)
      .single()

    if (checkError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    if (conversation.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Delete conversation (messages will be deleted via CASCADE)
    const { error: deleteError } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId)

    if (deleteError) {
      console.error('Error deleting conversation:', deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/conversations:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

