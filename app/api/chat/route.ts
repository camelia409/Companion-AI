import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { detectCrisis } from '@/lib/crisis/detection'
import Groq from 'groq-sdk'

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

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
    
    // Check if specific conversation ID is requested
    const { searchParams } = new URL(request.url)
    const conversationIdParam = searchParams.get('conversationId')
    
    let conversationId: string

    if (conversationIdParam) {
      // Load specific conversation
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select('id, date, created_at')
        .eq('id', conversationIdParam)
        .eq('user_id', user.id)
        .single()

      if (convError || !conversation) {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
      }

      conversationId = conversation.id
    } else {
      // Get or create today's conversation
      const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select('id, date, created_at')
        .eq('user_id', user.id)
        .eq('date', today)
        .single()

      if (convError && convError.code !== 'PGRST116') {
        // PGRST116 = no rows returned, which is fine
        // Check if it's a table doesn't exist error
        if (convError.message?.includes('relation') || convError.message?.includes('does not exist')) {
          return NextResponse.json({ 
            error: 'Database tables not found. Please run the migration in Supabase.' 
          }, { status: 500 })
        }
        return NextResponse.json({ error: convError.message }, { status: 500 })
      }

      if (conversation) {
        conversationId = conversation.id
      } else {
        // Create new conversation for today
        const { data: newConv, error: createError } = await supabase
          .from('conversations')
          .insert({
            user_id: user.id,
            date: today,
          })
          .select('id')
          .single()

        if (createError || !newConv) {
          // Check if it's a table doesn't exist error
          if (createError?.message?.includes('relation') || createError?.message?.includes('does not exist')) {
            return NextResponse.json({ 
              error: 'Database tables not found. Please run the migration in Supabase.' 
            }, { status: 500 })
          }
          return NextResponse.json({ 
            error: createError?.message || 'Failed to create conversation' 
          }, { status: 500 })
        }

        conversationId = newConv.id
      }
    }

    // Get all messages for this conversation
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('id, role, content, created_at, audio_volume, audio_pace, audio_pause_count')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (messagesError) {
      return NextResponse.json({ error: messagesError.message }, { status: 500 })
    }

    // Create response with cookies
    const response = NextResponse.json({
      conversationId,
      messages: messages || [],
    })
    
    // Get updated cookies from supabase (they're already set via createClient)
    return response
  } catch (error) {
    console.error('Error in GET /api/chat:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await verifyAuth()
    
    if (authError || !user) {
      return NextResponse.json({ 
        error: authError || 'Unauthorized - Please log out and log back in to refresh your session.',
      }, { status: 401 })
    }

    const supabase = createClient()

    const body = await request.json()
    const { message, conversationId, audioFeatures } = body

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Ensure we have a conversationId - create one if missing
    let currentConversationId = conversationId
    if (!currentConversationId) {
      // Get or create today's conversation
      const today = new Date().toISOString().split('T')[0]
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select('id')
        .eq('user_id', user.id)
        .eq('date', today)
        .single()

      if (conversation) {
        // Conversation exists
        currentConversationId = conversation.id
      } else if (convError && convError.code === 'PGRST116') {
        // PGRST116 = no rows returned, create new conversation
        const { data: newConv, error: createError } = await supabase
          .from('conversations')
          .insert({
            user_id: user.id,
            date: today,
          })
          .select('id')
          .single()

        if (createError || !newConv) {
          console.error('Failed to create conversation:', createError)
          return NextResponse.json({ 
            error: 'Failed to create conversation. Please try again.' 
          }, { status: 500 })
        }
        currentConversationId = newConv.id
      } else {
        // Other error
        console.error('Error getting conversation:', convError)
        return NextResponse.json({ 
          error: 'Failed to get conversation. Please try again.' 
        }, { status: 500 })
      }
    }

    // Crisis detection - IMMEDIATE BLOCK
    const crisisCheck = detectCrisis(message)
    if (crisisCheck.detected) {
      // Log crisis flag using service role (bypasses RLS for logging)
      const serviceClient = createServiceRoleClient()
      await serviceClient.from('crisis_flags').insert({
        user_id: user.id,
        keywords_detected: crisisCheck.keywords,
      })

      return NextResponse.json({
        crisis: true,
        keywords: crisisCheck.keywords,
        message: 'Crisis detected. Please seek immediate help.',
      })
    }

    // Store user message
    const { data: userMessage, error: userMsgError } = await supabase
      .from('messages')
      .insert({
        conversation_id: currentConversationId,
        role: 'user',
        content: message,
        audio_volume: audioFeatures?.volume,
        audio_pace: audioFeatures?.pace,
        audio_pause_count: audioFeatures?.pauseCount,
      })
      .select('id')
      .single()

    if (userMsgError) {
      return NextResponse.json({ error: userMsgError.message }, { status: 500 })
    }

    // Get conversation history for context
    const { data: historyMessages, error: historyError } = await supabase
      .from('messages')
      .select('role, content')
      .eq('conversation_id', currentConversationId)
      .order('created_at', { ascending: true })
      .limit(20) // Last 20 messages for context

    if (historyError) {
      return NextResponse.json({ error: historyError.message }, { status: 500 })
    }

    // Build GPT messages with system prompt
    const systemPrompt = `You are an empathetic AI healthcare companion. Your role is to provide emotional support and companionship to people dealing with chronic illness. 

IMPORTANT CONSTRAINTS:
- You are NOT a medical professional
- You do NOT provide medical advice, diagnosis, or treatment recommendations
- You do NOT replace therapy or professional mental health care
- You are a companion who listens with empathy
- Keep responses concise (2-4 sentences maximum)
- Be warm, empathetic, and conversational
- Focus on emotional support and companionship
- If someone mentions crisis or self-harm, acknowledge it but redirect to professional help

FORMATTING:
- Use **bold text** (markdown format) to highlight important points, key phrases, or emotional support statements
- Example: "I understand this is **really difficult** for you right now."
- Use bold sparingly - only for 1-2 key phrases per response

Your responses should be:
- Brief and focused (2-4 sentences)
- Warm and empathetic
- Supportive without being medical
- Conversational and natural
- Include **bold highlights** for important emotional support phrases`

    // Build messages for Groq (same format as OpenAI)
    const groqMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
      ...(historyMessages || []).map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
    ]

    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant', // Fast and free, good for MVP
      messages: groqMessages,
      temperature: 0.7,
      max_tokens: 500,
    })

    const assistantMessage = completion.choices[0]?.message?.content || 'I apologize, I had trouble processing that.'

    // Store assistant response
    const { data: assistantMsg, error: assistantMsgError } = await supabase
      .from('messages')
      .insert({
        conversation_id: currentConversationId,
        role: 'assistant',
        content: assistantMessage,
      })
      .select('id, role, content, created_at')
      .single()

    if (assistantMsgError) {
      return NextResponse.json({ error: assistantMsgError.message }, { status: 500 })
    }

    return NextResponse.json({
      message: assistantMsg,
      crisis: false,
    })
  } catch (error) {
    console.error('Error in POST /api/chat:', error)
    // Provide more detailed error message in development
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`
      : 'Internal server error'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

