'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useAudioRecorder } from '@/hooks/useAudioRecorder'
import { extractAudioFeatures } from '@/lib/audio/analysis'
import { speakText, stopSpeaking } from '@/lib/tts/playback'
import CrisisModal from '@/components/CrisisModal'
import { CRISIS_RESOURCES } from '@/lib/crisis/detection'
import { createClient } from '@/lib/supabase/client'
import ConversationSidebar from '@/components/ConversationSidebar'
import { parseMarkdown } from '@/lib/utils/markdown'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export default function ChatPage() {
  const { user, loading: authLoading, signOut } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  const [messages, setMessages] = useState<Message[]>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingConversation, setLoadingConversation] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [crisisModal, setCrisisModal] = useState<{ keywords: string[] } | null>(null)
  const [textInput, setTextInput] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [currentDate, setCurrentDate] = useState<string>('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const {
    isRecording,
    audioBlob,
    error: recorderError,
    recordingDuration,
    startRecording,
    stopRecording,
    reset: resetRecorder,
  } = useAudioRecorder()

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login')
    }
  }, [user, authLoading, router])

  // Load conversation on mount
  useEffect(() => {
    if (user) {
      loadConversation()
    }
  }, [user])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadConversation = async (conversationIdParam?: string, dateParam?: string) => {
    setLoadingConversation(true)
    setError(null)
    try {
      // Ensure we have a session before making the request
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('No active session. Please log in again.')
        setLoadingConversation(false)
        return
      }

      // If loading a specific conversation, use different endpoint
      if (conversationIdParam) {
        const response = await fetch(`/api/chat?conversationId=${conversationIdParam}`, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        })
        
        if (!response.ok) {
          throw new Error('Failed to load conversation')
        }
        
        const data = await response.json()
        setConversationId(data.conversationId)
        setMessages(data.messages || [])
        setCurrentDate(dateParam || new Date().toISOString().split('T')[0])
        return
      }

      // Otherwise load today's conversation
      const response = await fetch('/api/chat', {
        credentials: 'include', // Ensure cookies are sent
        headers: {
          'Content-Type': 'application/json',
        },
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || 'Failed to load conversation')
      }
      
      const data = await response.json()
      if (data.conversationId) {
        setConversationId(data.conversationId)
        setMessages(data.messages || [])
        setCurrentDate(new Date().toISOString().split('T')[0])
      } else {
        throw new Error('No conversation ID returned')
      }
    } catch (error) {
      console.error('Error loading conversation:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setError(errorMessage)
      // Don't show alert, show error in UI instead
    } finally {
      setLoadingConversation(false)
    }
  }

  const handleSelectConversation = (conversationId: string, date: string) => {
    loadConversation(conversationId, date)
  }

  const handleDeleteConversation = async (conversationIdToDelete: string) => {
    // If deleting current conversation, reload today's conversation
    if (conversationIdToDelete === conversationId) {
      await loadConversation()
    }
  }

  const handleDeleteCurrentConversation = async () => {
    if (!conversationId) return

    if (!confirm('Are you sure you want to delete this conversation? This cannot be undone.')) {
      return
    }

    try {
      const response = await fetch('/api/conversations', {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId }),
      })

      if (!response.ok) {
        throw new Error('Failed to delete conversation')
      }

      // Reload today's conversation
      await loadConversation()
    } catch (error) {
      console.error('Error deleting conversation:', error)
      alert('Failed to delete conversation. Please try again.')
    }
  }

  const sendMessage = async (content: string, audioFeatures?: any) => {
    if (!content.trim()) return

    setLoading(true)
    stopSpeaking() // Stop any ongoing TTS

    try {
      // Ensure we have a conversationId - load it if missing
      let currentConversationId = conversationId
      if (!currentConversationId) {
        const loadResponse = await fetch('/api/chat', {
          credentials: 'include', // Ensure cookies are sent
        })
        if (!loadResponse.ok) {
          throw new Error('Failed to load conversation')
        }
        const loadData = await loadResponse.json()
        currentConversationId = loadData.conversationId
        if (!currentConversationId) {
          throw new Error('Failed to create conversation')
        }
        setConversationId(currentConversationId)
        setMessages(loadData.messages || [])
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Ensure cookies are sent
        body: JSON.stringify({
          message: content,
          conversationId: currentConversationId,
          audioFeatures,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || 'Failed to send message')
      }

      const data = await response.json()

      if (data.crisis) {
        // Crisis detected - show modal
        setCrisisModal({ keywords: data.keywords })
        setLoading(false)
        return
      }

      if (data.message) {
        // Add assistant response to messages
        setMessages((prev) => [...prev, data.message])
        
        // Speak the assistant response
        speakText(data.message.content)
      }

      // Reload conversation to get updated messages
      await loadConversation()
    } catch (error) {
      console.error('Error sending message:', error)
      alert(`Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleVoiceMessage = async () => {
    if (isRecording) {
      // Stop recording
      stopRecording()
      return
    }

    // Start recording
    startRecording()
  }

  // Process audio when recording stops
  useEffect(() => {
    if (audioBlob && !isRecording) {
      processAudioRecording(audioBlob)
      resetRecorder()
    }
  }, [audioBlob, isRecording])

  const processAudioRecording = async (blob: Blob) => {
    setLoading(true)
    stopSpeaking()

    try {
      // Transcribe audio via server-side API
      const formData = new FormData()
      formData.append('audio', blob, 'audio.webm')

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        credentials: 'include', // Ensure cookies are sent
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Transcription failed')
      }

      const data = await response.json()
      const transcript = data.text
      
      // Calculate audio features using actual duration
      // Note: recordingDuration is in seconds, we estimate volume from transcript length
      const estimatedVolume = Math.min(1, transcript.length / 100) // Simple heuristic
      const audioFeatures = extractAudioFeatures(transcript, recordingDuration, estimatedVolume)

      // Send transcribed message
      await sendMessage(transcript, audioFeatures)
    } catch (error) {
      console.error('Error processing audio:', error)
      alert('Failed to process audio. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (textInput.trim()) {
      sendMessage(textInput)
      setTextInput('')
    }
  }

  if (authLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <p>Loading...</p>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect
  }

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh',
      maxWidth: '800px',
      margin: '0 auto',
      padding: '1rem'
    }}>
      {/* Header */}
      <header style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        padding: '1rem',
        borderBottom: '1px solid #ccc',
        marginBottom: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={() => setSidebarOpen(true)}
            style={{
              padding: '0.5rem',
              backgroundColor: '#f0f0f0',
              border: '1px solid #ccc',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '1.2rem'
            }}
            title="Conversation History"
          >
            ☰
          </button>
          <h1 style={{ margin: 0 }}>Companion AI</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {conversationId && (
            <button
              onClick={handleDeleteCurrentConversation}
              style={{
                padding: '0.5rem',
                backgroundColor: '#fee',
                border: '1px solid #fcc',
                borderRadius: '4px',
                cursor: 'pointer',
                color: '#d32f2f',
                fontSize: '1rem'
              }}
              title="Delete this conversation"
            >
              🗑️
            </button>
          )}
          <button
            onClick={signOut}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#f0f0f0',
              border: '1px solid #ccc',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Messages */}
      <div style={{ 
        flex: 1, 
        overflowY: 'auto', 
        marginBottom: '1rem',
        padding: '1rem'
      }}>
        {loadingConversation && (
          <p style={{ textAlign: 'center', color: '#666', marginTop: '2rem' }}>
            Loading conversation...
          </p>
        )}
        
        {error && !loadingConversation && (
          <div style={{ 
            padding: '1rem', 
            backgroundColor: '#fee', 
            color: '#d32f2f',
            borderRadius: '4px',
            marginBottom: '1rem'
          }}>
            <strong>Error:</strong> {error}
            <br />
            <small>Make sure you've run the database migration in Supabase.</small>
          </div>
        )}
        
        {!loadingConversation && !error && messages.length === 0 && (
          <p style={{ textAlign: 'center', color: '#666', marginTop: '2rem' }}>
            Start a conversation by speaking or typing a message.
          </p>
        )}
        
        {messages.map((message) => {
          const messageDate = new Date(message.created_at)
          const timeString = messageDate.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
          })
          
          return (
            <div
              key={message.id}
              style={{
                marginBottom: '1rem',
                padding: '0.75rem 1rem',
                borderRadius: '12px',
                backgroundColor: message.role === 'user' ? '#e3f2fd' : '#f5f5f5',
                alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '75%',
                marginLeft: message.role === 'user' ? 'auto' : '0',
                marginRight: message.role === 'user' ? '0' : 'auto',
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
              }}
            >
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '0.5rem' 
              }}>
                <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>
                  {message.role === 'user' ? 'You' : 'Companion'}
                </div>
                <div style={{ 
                  fontSize: '0.75rem', 
                  color: '#666',
                  opacity: 0.7 
                }}>
                  {timeString}
                </div>
              </div>
              <div style={{ 
                lineHeight: '1.5',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}>
                {message.role === 'assistant' 
                  ? parseMarkdown(message.content)
                  : message.content
                }
              </div>
            </div>
          )
        })}
        
        {loading && (
          <div style={{ 
            textAlign: 'center', 
            color: '#666', 
            padding: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem'
          }}>
            <span style={{
              display: 'inline-block',
              width: '12px',
              height: '12px',
              border: '2px solid #666',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></span>
            {isRecording ? `Recording... ${Math.floor(recordingDuration)}s` : 'Thinking...'}
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Conversation Sidebar */}
      <ConversationSidebar
        currentConversationId={conversationId}
        onSelectConversation={handleSelectConversation}
        onDeleteConversation={handleDeleteConversation}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Input area */}
      <div style={{ 
        borderTop: '1px solid #ccc', 
        padding: '1rem',
        display: 'flex',
        gap: '0.5rem'
      }}>
        <button
          onClick={handleVoiceMessage}
          disabled={loading}
          style={{
            padding: '0.75rem',
            backgroundColor: isRecording ? '#d32f2f' : '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            width: '50px',
            height: '50px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.2rem'
          }}
          title={isRecording ? `Stop recording (${Math.floor(recordingDuration)}s)` : 'Start voice recording'}
        >
          {isRecording ? '⏹' : '🎤'}
          {isRecording && (
            <span style={{
              position: 'absolute',
              top: '-8px',
              right: '-8px',
              backgroundColor: '#d32f2f',
              borderRadius: '50%',
              width: '20px',
              height: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.7rem',
              fontWeight: 'bold',
              border: '2px solid white'
            }}>
              ●
            </span>
          )}
        </button>

        <form onSubmit={handleTextSubmit} style={{ flex: 1, display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Type a message..."
            disabled={loading || isRecording}
            style={{
              flex: 1,
              padding: '0.75rem',
              border: '1px solid #ccc',
              borderRadius: '4px'
            }}
          />
          <button
            type="submit"
            disabled={loading || isRecording || !textInput.trim() || loadingConversation || !!error}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#0070f3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading || isRecording || loadingConversation || !!error ? 'not-allowed' : 'pointer',
              opacity: loading || isRecording || loadingConversation || !!error ? 0.6 : 1
            }}
          >
            Send
          </button>
        </form>
      </div>

      {recorderError && (
        <div style={{ 
          padding: '0.5rem', 
          backgroundColor: '#fee', 
          color: '#d32f2f',
          marginTop: '0.5rem',
          borderRadius: '4px'
        }}>
          Recording error: {recorderError}
        </div>
      )}

      {/* Crisis Modal */}
      {crisisModal && (
        <CrisisModal
          keywords={crisisModal.keywords}
          onClose={() => setCrisisModal(null)}
        />
      )}
    </div>
  )
}

