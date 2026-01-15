import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createDeepgramClient } from '@deepgram/sdk'

async function verifyAuth() {
  const supabase = createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    console.error('Auth verification failed:', error)
    return { user: null, error: 'Unauthorized - session expired or invalid' }
  }
  
  return { user, error: null }
}

export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await verifyAuth()
    
    if (authError || !user) {
      return NextResponse.json({ 
        error: authError || 'Unauthorized - Please log out and log back in to refresh your session.',
      }, { status: 401 })
    }

    const formData = await request.formData()
    const audioFile = formData.get('audio') as File

    if (!audioFile) {
      return NextResponse.json({ error: 'Audio file is required' }, { status: 400 })
    }

    // Initialize Deepgram client
    const deepgram = createDeepgramClient(process.env.DEEPGRAM_API_KEY!)

    // Convert File to Buffer
    const audioBuffer = Buffer.from(await audioFile.arrayBuffer())

    const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
      audioBuffer,
      {
        model: 'nova-2', // Best accuracy, or use 'base' for faster/cheaper
        language: 'en',
        smart_format: true,
        punctuate: true,
      }
    )

    if (error) {
      console.error('Deepgram error:', error)
      return NextResponse.json({ 
        error: `Transcription failed: ${error.message || 'Unknown error'}` 
      }, { status: 500 })
    }

    const transcript = result?.results?.channels?.[0]?.alternatives?.[0]?.transcript || ''

    if (!transcript) {
      return NextResponse.json({ error: 'No speech detected in audio' }, { status: 400 })
    }

    return NextResponse.json({ text: transcript })
  } catch (error) {
    console.error('Error in transcription:', error)
    return NextResponse.json(
      { error: `Transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    )
  }
}

