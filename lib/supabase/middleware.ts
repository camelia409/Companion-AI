import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          // Update request cookies
          request.cookies.set({
            name,
            value,
            ...options,
          })
          // Create new response with updated cookies
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          // Set cookies on response
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          // Remove from request cookies
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          // Create new response
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          // Remove cookies from response
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Refresh session if expired - this will update cookies if needed
  await supabase.auth.getUser()

  return response
}

