# Empathetic AI Healthcare Companion

A web-based companion application that provides emotional support and companionship to chronic illness patients through voice and text interactions.

## Core Value Proposition

> "Most health apps track symptoms. This one tracks how you're feeling — and responds like someone who cares."

## ⚠️ Important Disclaimers

- **NOT medical advice, therapy, diagnosis, or emergency system**
- Provides companionship and emotional support only
- Includes crisis detection with resources, but is not a replacement for professional help

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **Backend**: Vercel Serverless Functions
- **Database**: Supabase (PostgreSQL + Auth + RLS)
- **AI**: OpenAI GPT-3.5-turbo (conversation), Whisper (transcription)
- **Voice**: Browser-based recording, Web Speech API (TTS)

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── chat/route.ts          # Chat endpoint (GET/POST)
│   │   └── transcribe/route.ts    # Whisper transcription proxy
│   ├── auth/
│   │   ├── login/page.tsx         # Login page
│   │   └── signup/page.tsx        # Sign up page
│   ├── chat/page.tsx              # Main chat interface
│   ├── layout.tsx                 # Root layout
│   └── page.tsx                   # Root redirect
├── components/
│   └── CrisisModal.tsx            # Crisis detection modal
├── hooks/
│   ├── useAuth.ts                 # Authentication hook
│   └── useAudioRecorder.ts        # Audio recording hook
├── lib/
│   ├── audio/
│   │   ├── analysis.ts            # Audio feature extraction
│   │   └── whisper.ts             # Transcription client
│   ├── crisis/
│   │   └── detection.ts           # Crisis keyword detection
│   ├── supabase/
│   │   ├── client.ts              # Browser Supabase client
│   │   ├── server.ts              # Server Supabase client
│   │   └── middleware.ts          # Auth middleware
│   └── tts/
│       └── playback.ts            # Text-to-speech
├── supabase/
│   └── migrations/
│       └── schema.sql
└── middleware.ts                  # Next.js middleware
```

## Setup Instructions

### 1. Prerequisites

- Node.js 18+ installed
- Supabase account and project
- OpenAI API key

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Variables

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key

# Server-side only (for API routes)
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 4. Database Setup

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `supabase/migrations/schema.sql`
4. Paste and run the SQL
5. Verify tables appear in **Table Editor**

See `supabase/migrations/README.md` for detailed testing instructions.

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Features

### ✅ Implemented

1. **Authentication** - Email/password via Supabase Auth
2. **Daily Conversations** - One conversation per user per day
3. **Voice Recording** - Browser-based audio recording
4. **Transcription** - OpenAI Whisper integration
5. **Chat Interface** - Voice-first with text fallback
6. **AI Responses** - GPT-3.5-turbo with empathetic system prompt
7. **Crisis Detection** - Keyword-based detection with immediate resources
8. **Text-to-Speech** - Browser TTS for assistant responses
9. **Audio Features** - Simple volume, pace, pause detection
10. **Row Level Security** - User data isolation

## Manual Testing

### Test Authentication
1. Sign up with a new email
2. Log out and log back in
3. Verify session persists

### Test Voice Recording
1. Click microphone button
2. Speak for a few seconds
3. Click stop
4. Verify transcription appears
5. Verify assistant responds

### Test Crisis Detection
1. Type or say a message containing crisis keywords (e.g., "I want to kill myself")
2. Verify crisis modal appears immediately
3. Verify conversation is blocked
4. Check crisis_flags table in Supabase

### Test Text Input
1. Type a message in the text input
2. Press Send
3. Verify message appears and assistant responds

### Test TTS
1. Send a message
2. Verify assistant response is spoken aloud
3. Verify speech stops when new message is sent

## Architecture Decisions

### Why Client-Heavy?
- Privacy: Audio never leaves browser until user sends
- Simplicity: Less server infrastructure
- Interview-defensible: Clear trade-offs explained

### Why Simple Audio Features?
- MVP scope: Complex ML analysis is over-engineering
- Interview-defensible: "We use simple heuristics for MVP"

### Why Keyword-Based Crisis Detection?
- Over-triggering acceptable: Safety prioritized
- Simple implementation: No ML model needed
- Immediate response: No latency from model inference

### Why Daily Conversations?
- Privacy: Easy to understand data boundaries
- Simplicity: No complex threading logic
- Interview-defensible: Clear user mental model

## Known Limitations (MVP Scope)

1. **Audio Features**: Simplified heuristics, not true audio analysis
2. **Crisis Detection**: Keyword-based only, may have false positives
3. **TTS Quality**: Browser-dependent, varies by browser
4. **No Audio Storage**: Raw audio not stored (by design)
5. **Single Language**: English only
6. **No Multi-Day Threads**: Each day is a new conversation

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Environment Variables in Vercel

Add all variables from `.env.local` to Vercel project settings.

## Troubleshooting

### "Unauthorized" errors
- Check Supabase RLS policies are created
- Verify user is authenticated
- Check middleware is running

### Transcription fails
- Verify OpenAI API key is set
- Check audio format (should be webm)
- Verify microphone permissions granted

### Crisis modal not appearing
- Check browser console for errors
- Verify keywords are in detection list
- Check crisis_flags table for logged events

## Next Steps (Post-MVP)

- [ ] Email confirmation flow
- [ ] Conversation history view
- [ ] Better audio feature extraction
- [ ] Multi-language support
- [ ] Improved TTS with better voices
- [ ] Conversation export

## License

Private project - not for public distribution.

