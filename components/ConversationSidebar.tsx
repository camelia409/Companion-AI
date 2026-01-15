'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Conversation {
  id: string
  date: string
  created_at: string
  updated_at: string
}

interface ConversationSidebarProps {
  currentConversationId: string | null
  onSelectConversation: (conversationId: string, date: string) => void
  onDeleteConversation: (conversationId: string) => void
  isOpen: boolean
  onClose: () => void
}

export default function ConversationSidebar({
  currentConversationId,
  onSelectConversation,
  onDeleteConversation,
  isOpen,
  onClose,
}: ConversationSidebarProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (isOpen) {
      loadConversations()
    }
  }, [isOpen])

  const loadConversations = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('No active session')
        setLoading(false)
        return
      }

      const response = await fetch('/api/conversations', {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        throw new Error('Failed to load conversations')
      }

      const data = await response.json()
      setConversations(data.conversations || [])
    } catch (error) {
      console.error('Error loading conversations:', error)
      setError('Failed to load conversations')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    
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

      // Remove from list
      setConversations(prev => prev.filter(c => c.id !== conversationId))
      onDeleteConversation(conversationId)
    } catch (error) {
      console.error('Error deleting conversation:', error)
      alert('Failed to delete conversation. Please try again.')
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return 'Today'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      })
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 998,
        }}
      />
      
      {/* Sidebar */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '300px',
          height: '100vh',
          backgroundColor: '#fff',
          boxShadow: '2px 0 8px rgba(0,0,0,0.1)',
          zIndex: 999,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1rem',
            borderBottom: '1px solid #e0e0e0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '600' }}>
            Conversation History
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              padding: '0.25rem 0.5rem',
              color: '#666',
            }}
            title="Close"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
          {loading && (
            <div style={{ padding: '1rem', textAlign: 'center', color: '#666' }}>
              Loading...
            </div>
          )}

          {error && (
            <div style={{ padding: '1rem', color: '#d32f2f', fontSize: '0.9rem' }}>
              {error}
            </div>
          )}

          {!loading && !error && conversations.length === 0 && (
            <div style={{ padding: '1rem', textAlign: 'center', color: '#666' }}>
              No conversations yet
            </div>
          )}

          {!loading && !error && conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => {
                onSelectConversation(conv.id, conv.date)
                onClose()
              }}
              style={{
                padding: '0.75rem',
                marginBottom: '0.5rem',
                borderRadius: '8px',
                cursor: 'pointer',
                backgroundColor: conv.id === currentConversationId ? '#e3f2fd' : '#f5f5f5',
                border: conv.id === currentConversationId ? '2px solid #0070f3' : '1px solid #e0e0e0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                if (conv.id !== currentConversationId) {
                  e.currentTarget.style.backgroundColor = '#f0f0f0'
                }
              }}
              onMouseLeave={(e) => {
                if (conv.id !== currentConversationId) {
                  e.currentTarget.style.backgroundColor = '#f5f5f5'
                }
              }}
            >
              <div>
                <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>
                  {formatDate(conv.date)}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#666' }}>
                  {new Date(conv.created_at).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </div>
              </div>
              <button
                onClick={(e) => handleDelete(conv.id, e)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#d32f2f',
                  cursor: 'pointer',
                  padding: '0.25rem 0.5rem',
                  fontSize: '1rem',
                  opacity: 0.7,
                }}
                title="Delete conversation"
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '1'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '0.7'
                }}
              >
                🗑️
              </button>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

