// middleware.ts
import { NextResponse } from 'next/server'
import { redis } from '~/server/globals/redis';
import { googleOAuth } from '~/server/globals/googleOAuth';
import { NextApiRequest } from 'next';
import { gmail_v1, google } from 'googleapis';

export type WithCtx<T extends NextApiRequest> = T & {
  ctx?: {
    gmail?: gmail_v1.Gmail,
  }
}

export async function middleware(req: WithCtx<NextApiRequest>) {
  const token = await redis.get('token');
  googleOAuth.setCredentials(JSON.parse((token || '').toString()));
  try {
    const x = await googleOAuth.getAccessToken();
    console.log(x);
  } catch (e) {
    console.log(e);
  }
  const gmail = google.gmail({ version: 'v1', auth: googleOAuth });
  if (req.ctx) {
    req.ctx.gmail = gmail;
  } else {
    req.ctx = { gmail };
  }
  return NextResponse.next()
}
