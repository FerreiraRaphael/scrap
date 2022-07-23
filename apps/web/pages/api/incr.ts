import Redis from 'ioredis'
import { NextApiRequest, NextApiResponse } from 'next'

let redis = new Redis(process.env.REDIS_URL || '6379')

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const count = await redis.incr('counter')
  res.status(200).json({ count })
}
