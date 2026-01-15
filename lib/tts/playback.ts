'use client'

/**
 * Speak text using browser's built-in TTS
 */
export function speakText(text: string): SpeechSynthesisUtterance | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    console.warn('Speech synthesis not available')
    return null
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel()

  const utterance = new SpeechSynthesisUtterance(text)
  utterance.rate = 1.0 // Normal speed
  utterance.pitch = 1.0 // Normal pitch
  utterance.volume = 1.0 // Full volume

  // Try to use a pleasant voice if available
  const voices = window.speechSynthesis.getVoices()
  const preferredVoice = voices.find(
    (voice) => voice.name.includes('Google') || voice.name.includes('Microsoft')
  )
  if (preferredVoice) {
    utterance.voice = preferredVoice
  }

  window.speechSynthesis.speak(utterance)
  return utterance
}

/**
 * Stop any ongoing speech
 */
export function stopSpeaking() {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel()
  }
}

/**
 * Check if speech is currently playing
 */
export function isSpeaking(): boolean {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    return false
  }
  return window.speechSynthesis.speaking
}

