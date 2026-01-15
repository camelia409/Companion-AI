// Crisis detection - keyword-based

const CRISIS_KEYWORDS = [
  'suicide',
  'kill myself',
  'end my life',
  'want to die',
  'going to die',
  'am going to die',
  'gonna die',
  'will die',
  'not worth living',
  'better off dead',
  'harm myself',
  'self harm',
  'hurt myself',
  'overdose',
  'cut myself',
  'jump off',
  'hang myself',
  'end it all',
  'give up',
  'no point living',
  'nothing to live for',
  // Add more as needed - this is a basic list for MVP
]

/**
 * Check if text contains crisis keywords
 */
export function detectCrisis(text: string): { detected: boolean; keywords: string[] } {
  const lowerText = text.toLowerCase()
  const detectedKeywords: string[] = []

  for (const keyword of CRISIS_KEYWORDS) {
    if (lowerText.includes(keyword.toLowerCase())) {
      detectedKeywords.push(keyword)
    }
  }

  return {
    detected: detectedKeywords.length > 0,
    keywords: detectedKeywords,
  }
}

/**
 * Crisis resources - displayed in modal
 */
export const CRISIS_RESOURCES = {
  nationalSuicidePreventionLifeline: {
    name: 'National Suicide Prevention Lifeline',
    phone: '988',
    text: 'Text 988',
    website: 'https://988lifeline.org',
  },
  crisisTextLine: {
    name: 'Crisis Text Line',
    phone: 'Text HOME to 741741',
    website: 'https://www.crisistextline.org',
  },
  emergency: {
    name: 'Emergency Services',
    phone: '911',
    text: 'Call 911',
  },
}

