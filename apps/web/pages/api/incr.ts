import { NextApiRequest, NextApiResponse } from 'next'
import { redis } from '~/server/globals/redis'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const count = await redis.incr('counter')
  res.status(200).json({ count })
}
