// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { redis } from '~/server/globals/redis';
import { authorize, getAuthUrl } from '~/server/lib/auth/google';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<string>
) {
  const token = await redis.get('token');
  if (!token) {
    const url = getAuthUrl();
    return res.redirect(url);
  }
  try {
    await authorize(token);
    res.status(200).send('ok');
  } catch(e) {
    res.status(403).send('auth error');
  }
}
