import React from 'react'

/**
 * Parse markdown bold text (**text**) to React elements
 */
export function parseMarkdown(text: string): (string | React.ReactElement)[] {
  const parts: (string | React.ReactElement)[] = []
  const boldRegex = /\*\*(.+?)\*\*/g
  let lastIndex = 0
  let match
  let key = 0

  while ((match = boldRegex.exec(text)) !== null) {
    // Add text before the bold
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index))
    }

    // Add bold text
    parts.push(
      React.createElement(
        'strong',
        { key: key++, style: { fontWeight: 'bold', color: '#0070f3' } },
        match[1]
      )
    )

    lastIndex = match.index + match[0].length
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex))
  }

  // If no bold text found, return original text
  if (parts.length === 0) {
    return [text]
  }

  return parts
}

