# Companion AI

A healthcare companion app for people dealing with chronic illness. It's basically a chat app where you can talk (or type) and get emotional support. Nothing fancy, just someone to talk to.

**Live Demo:** [https://companion-ai-vercel.vercel.app/](https://companion-ai-vercel.vercel.app/)

**Important:** This is NOT medical advice or therapy. It's just a companion. If you're in crisis, please reach out to professionals (988, 911, etc).

## What it does

- Voice or text chat with an AI companion
- Detects crisis situations and shows resources
- Stores your daily conversations
- Text-to-speech so you can hear responses

## Tech stuff

Built with Next.js 14, Supabase for auth/database, Groq for AI responses, and Deepgram for voice transcription. Everything runs on Vercel.

## Getting started

### Prerequisites

- Node.js 18+
- Supabase account (free tier works)
- Groq API key (free tier)
- Deepgram API key (free tier)

### Setup

1. Clone and install:
```bash
npm install
```

2. Create `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GROQ_API_KEY=your_groq_key
DEEPGRAM_API_KEY=your_deepgram_key
```

3. Run the database migration:
   - Go to Supabase dashboard → SQL Editor
   - Copy/paste `supabase/migrations/schema.sql`
   - Run it

4. Start dev server:
```bash
npm run dev
```

That's it. Open http://localhost:3000 and sign up.

## Project structure

```
app/
  api/          # API routes (chat, transcribe, conversations)
  auth/         # Login/signup pages
  chat/         # Main chat interface
components/     # React components
hooks/          # Custom hooks
lib/            # Utilities (supabase, audio, crisis detection)
supabase/       # Database migrations
```

## Features

- Email/password auth via Supabase
- Voice recording in browser
- AI chat using Groq (fast and free)
- Voice transcription via Deepgram
- Crisis keyword detection
- Conversation history sidebar
- Delete conversations
- Bold highlights in AI responses

## Testing

Just use it normally:
- Sign up and log in
- Try voice recording (click mic button)
- Type some messages
- Test crisis detection (try "I want to die" - it'll show resources)
- Check conversation history (hamburger menu)

## Deployment

Push to Vercel:
1. Connect GitHub repo
2. Add env variables
3. Deploy

That's it. Vercel handles everything.

## Troubleshooting

**Can't log in?**
- Check Supabase auth settings (disable email confirmation for testing)
- Make sure RLS policies are set up

**Transcription not working?**
- Check Deepgram API key
- Make sure mic permissions are granted

**Crisis modal not showing?**
- Check browser console
- Keywords might need to be added to detection list

## Notes

- Audio is recorded client-side for privacy
- Conversations are stored per day (one per user per day)
- Crisis detection logs to database for audit
- All user data is isolated via RLS

## License

Private project.
