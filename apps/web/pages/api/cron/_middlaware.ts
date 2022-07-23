// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { redis } from '~/server/globals/redis';
import { googleOAuth } from '~/server/globals/googleOAuth';

// This function can be marked `async` if using `await` inside
export async function middleware() {
  const token = await redis.get('token');
  googleOAuth.setCredentials(token as any);
  return NextResponse.next()
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: '/cron/:path*',
}
