import type { NextApiRequest, NextApiResponse } from 'next'
import { setTokenUsingCode } from '~/server/lib/auth/google';

type Data = {
  name: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  const { code, callbackUrl } = req.query;
  if (code) {
    await setTokenUsingCode(code as string);
  }
  return res.redirect((callbackUrl as string) || '/');
}
