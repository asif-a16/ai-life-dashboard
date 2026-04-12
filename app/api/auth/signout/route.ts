import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST() {
  try {
    // Supabase auth cookies are prefixed with "sb-". Clear them explicitly
    // so protected server routes redirect to /login immediately.
    const cookieStore = await cookies()
    for (const cookie of cookieStore.getAll()) {
      if (cookie.name.startsWith('sb-')) {
        cookieStore.delete(cookie.name)
      }
    }

    return NextResponse.json({ data: null })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
