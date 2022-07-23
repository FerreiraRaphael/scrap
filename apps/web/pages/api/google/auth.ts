// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { redis } from '~/server/globals/redis';
import { authorize, getAuthUrl } from '~/server/lib/auth/google';

type Data = {
  name: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  const token = await redis.get('token');
  if (!token) {
    const url = getAuthUrl();
    return res.redirect(url);
  }
}
