'use client'

import { useState, useRef, useCallback } from 'react'

export interface AudioFeatures {
  volume: number // Average volume (0-1)
  pace: number // Words per minute (calculated after transcription)
  pauseCount: number // Number of pauses detected
}

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const volumeCheckIntervalRef = useRef<number | null>(null)
  const durationIntervalRef = useRef<number | null>(null)
  const recordingStartTimeRef = useRef<number | null>(null)

  const startRecording = useCallback(async () => {
    try {
      setError(null)
      audioChunksRef.current = []

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // Set up audio analysis for volume detection
      const audioContext = new AudioContext()
      const analyser = audioContext.createAnalyser()
      const source = audioContext.createMediaStreamSource(stream)
      source.connect(analyser)
      analyser.fftSize = 256

      audioContextRef.current = audioContext
      analyserRef.current = analyser

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus', // Browser-compatible format
      })

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start()

      // Track recording duration
      recordingStartTimeRef.current = Date.now()
      setRecordingDuration(0)
      durationIntervalRef.current = window.setInterval(() => {
        if (recordingStartTimeRef.current) {
          const elapsed = (Date.now() - recordingStartTimeRef.current) / 1000
          setRecordingDuration(elapsed)
        }
      }, 100)

      // Monitor volume levels
      const volumeCheck = () => {
        if (!analyserRef.current) return

        const bufferLength = analyserRef.current.frequencyBinCount
        const dataArray = new Uint8Array(bufferLength)
        analyserRef.current.getByteFrequencyData(dataArray)

        // Calculate average volume (simple implementation)
        const average = dataArray.reduce((a, b) => a + b) / bufferLength
        // Volume is normalized to 0-1 range
        // This is a simple implementation - could be improved with RMS calculation
      }

      volumeCheckIntervalRef.current = window.setInterval(volumeCheck, 100)

      setIsRecording(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start recording')
      setIsRecording(false)
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)

      // Clean up intervals
      if (volumeCheckIntervalRef.current) {
        clearInterval(volumeCheckIntervalRef.current)
        volumeCheckIntervalRef.current = null
      }

      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current)
        durationIntervalRef.current = null
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }

      if (audioContextRef.current) {
        audioContextRef.current.close()
        audioContextRef.current = null
      }

      recordingStartTimeRef.current = null
    }
  }, [isRecording])

  const reset = useCallback(() => {
    setAudioBlob(null)
    setError(null)
    setRecordingDuration(0)
    audioChunksRef.current = []
    recordingStartTimeRef.current = null
  }, [])

  return {
    isRecording,
    audioBlob,
    error,
    recordingDuration,
    startRecording,
    stopRecording,
    reset,
  }
}

