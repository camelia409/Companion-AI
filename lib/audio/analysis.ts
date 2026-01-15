// Audio analysis utilities

export interface AudioFeatures {
  volume: number // Average volume (0-1)
  pace: number // Words per minute
  pauseCount: number // Number of pauses > 0.5 seconds
}

/**
 * Calculate words per minute from transcript and duration
 */
export function calculatePace(transcript: string, durationSeconds: number): number {
  if (durationSeconds === 0) return 0
  
  const words = transcript.trim().split(/\s+/).filter(word => word.length > 0)
  const wordsPerMinute = (words.length / durationSeconds) * 60
  return Math.round(wordsPerMinute)
}

/**
 * Count pauses in audio transcript
 */
export function countPauses(transcript: string, durationSeconds: number): number {
  const pausePattern = /[.!?]\s+/g
  const matches = transcript.match(pausePattern)
  return matches ? matches.length : 0
}

/**
 * Extract audio features from recording
 */
export function extractAudioFeatures(
  transcript: string,
  durationSeconds: number,
  averageVolume: number
): AudioFeatures {
  return {
    volume: Math.max(0, Math.min(1, averageVolume)), // Clamp to 0-1
    pace: calculatePace(transcript, durationSeconds),
    pauseCount: countPauses(transcript, durationSeconds),
  }
}

